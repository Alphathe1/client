import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from "react";
import { useSite } from "../../../context/SiteContext";
import { useToast } from "../../../context/ToastContext";
import { api, ApiError } from "../../../lib/api";
import { DEFAULT_CONTENT } from "../../../lib/site/defaults";
import { draftReducer, makeStoredDraft, startDraft, type DraftAction } from "../../../lib/site/draft";
import { dirtyKeys, firstIssue, publishFailure, type DirtyKey, type PublishFailure } from "../../../lib/site/editor";
import { mergeContent } from "../../../lib/site/merge";
import type { SiteContent } from "../../../lib/site/types";
import { validateContent, type SiteIssue } from "../../../lib/site/validate";
import { draftStore, useDraftPersistent } from "../../../lib/siteDraftStore";

export type PublishResult = { kind: "published" } | { kind: "invalid"; issue: SiteIssue } | { kind: "failed" } | { kind: "unchanged" };

/** with the API down, the Vite proxy (or a gateway) answers 500/502/503/504: that is the server not answering, same as a network error */
const UNREACHABLE_STATUS = new Set([500, 502, 503, 504]);

export interface SiteEditor {
  /** loading: first GET /site in flight; error: it failed (the draft, if any, stays stored); ready: editing */
  phase: "loading" | "error" | "ready";
  loadError: string | null;
  retryLoad: () => void;
  draft: SiteContent;
  dispatch: Dispatch<DraftAction>;
  /** changed blocks (+ "order"), compared with the published content */
  dirty: DirtyKey[];
  /** every validation issue of the draft (lot 2's validateContent) */
  issues: SiteIssue[];
  /** true once Publish was pressed with invalid fields: every field then shows its message */
  showAllErrors: boolean;
  /** version of the published content (SiteProvider) */
  publishedAt: string | null;
  /** the draft started from an older publication than the one on the server */
  stale: boolean;
  /** savedAt of a draft resumed from the browser, until it is published or dropped */
  resumedAt: string | null;
  /** false: the browser refused to store the draft (memory only) */
  persistent: boolean;
  publishing: boolean;
  /** GET /site again after a conflict */
  reloading: boolean;
  failure: PublishFailure | null;
  /** what the failure banner's "Réessayer" repeats */
  failedOp: "publish" | "reload";
  publish: () => Promise<PublishResult>;
  /** "Annuler": back to the published content, stored draft dropped */
  discard: () => void;
  /** "Recharger la version publiée": GET /site, then start over from it */
  reloadPublished: () => Promise<void>;
}

/** Draft, autosave, validation and publication of the site editor (spec §6.4, §6.7) */
export function useSiteEditor(): SiteEditor {
  const { published, updatedAt, error, reload, acceptPublished } = useSite();
  const toast = useToast();
  const persistent = useDraftPersistent();
  const [draft, dispatch] = useReducer(draftReducer, DEFAULT_CONTENT);
  const [phase, setPhase] = useState<SiteEditor["phase"]>("loading");
  const [base, setBase] = useState<string | null>(null);
  const [resumedAt, setResumedAt] = useState<string | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [failure, setFailure] = useState<PublishFailure | null>(null);
  const [failedOp, setFailedOp] = useState<"publish" | "reload">("publish");
  /** set once a GET /site settled: the next render reads fresh context values and (re)starts the draft */
  const [settled, setSettled] = useState<null | "initial" | "reload">(null);
  const fetching = useRef(false);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;

  const fetchPublished = useCallback(
    async (mode: "initial" | "reload") => {
      if (fetching.current) return;
      fetching.current = true;
      // always revalidate: the dashboard may have been open for hours, and baseUpdatedAt must be the server's
      await reload();
      fetching.current = false;
      setSettled(mode);
    },
    [reload],
  );

  useEffect(() => {
    void fetchPublished("initial");
  }, [fetchPublished]);

  useEffect(() => {
    if (!settled) return;
    setSettled(null);
    if (error) {
      if (settled === "initial") setPhase("error");
      else {
        setFailure({ kind: "network", message: "La version publiée n'a pas pu être rechargée. Vérifiez votre connexion, puis réessayez." });
        setFailedOp("reload");
      }
      setReloading(false);
      return;
    }
    const stored = settled === "initial" ? draftStore.get() : null;
    if (stored) {
      dispatch({ type: "replace", content: stored.content });
      setBase(stored.baseUpdatedAt);
      setResumedAt(stored.savedAt);
    } else {
      // a reload that succeeded: only now is the stored draft given up
      if (settled === "reload") draftStore.clear();
      dispatch({ type: "replace", content: startDraft(published) });
      setBase(updatedAt);
      setResumedAt(null);
    }
    setShowAllErrors(false);
    setFailure(null);
    setReloading(false);
    setPhase("ready");
  }, [settled, error, published, updatedAt]);

  const dirty = useMemo(() => (phase === "ready" ? dirtyKeys(draft, published) : []), [phase, draft, published]);
  const issues = useMemo(() => validateContent(draft), [draft]);

  // autosave: the browser keeps the draft while it differs from the published content
  useEffect(() => {
    if (phase !== "ready") return;
    // a resumed draft still equal to the stored one keeps its savedAt (the last edit, not the last visit)
    if (dirty.length > 0) {
      if (draftStore.get()?.content !== draft) draftStore.save(makeStoredDraft(draft, base, new Date()));
    } else draftStore.clear();
  }, [phase, draft, base, dirty.length]);

  const publish = useCallback(async (): Promise<PublishResult> => {
    if (dirty.length === 0) return { kind: "unchanged" };
    const issue = firstIssue(issues, draft.home.order);
    if (issue) {
      setShowAllErrors(true);
      return { kind: "invalid", issue };
    }
    const sentDraft = draft;
    setPublishing(true);
    setFailure(null);
    try {
      const res = await api.put<{ content: unknown; updatedAt: string }>("/site", { content: draft, baseUpdatedAt: base });
      acceptPublished(res.data.content, res.data.updatedAt);
      // an upload that finished during the PUT changed the draft: keep it, autosave stores it against the new base
      if (latestDraft.current === sentDraft) {
        draftStore.clear();
        dispatch({ type: "replace", content: mergeContent(res.data.content) });
      }
      setBase(res.data.updatedAt);
      setResumedAt(null);
      setShowAllErrors(false);
      toast("Site publié.");
      return { kind: "published" };
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      setFailure(publishFailure(UNREACHABLE_STATUS.has(status) ? 0 : status, e instanceof Error ? e.message : ""));
      setFailedOp("publish");
      return { kind: "failed" };
    } finally {
      setPublishing(false);
    }
  }, [dirty.length, issues, draft, base, acceptPublished, toast]);

  const discard = useCallback(() => {
    draftStore.clear();
    dispatch({ type: "replace", content: startDraft(published) });
    setBase(updatedAt);
    setResumedAt(null);
    setShowAllErrors(false);
    setFailure(null);
  }, [published, updatedAt]);

  const reloadPublished = useCallback(async () => {
    if (fetching.current) return;
    setReloading(true);
    await fetchPublished("reload");
  }, [fetchPublished]);

  const retryLoad = useCallback(() => {
    setPhase("loading");
    void fetchPublished("initial");
  }, [fetchPublished]);

  return {
    phase,
    loadError: error,
    retryLoad,
    draft,
    dispatch,
    dirty,
    issues,
    showAllErrors,
    publishedAt: updatedAt,
    stale: phase === "ready" && base !== updatedAt,
    resumedAt,
    persistent,
    publishing,
    reloading,
    failure,
    failedOp,
    publish,
    discard,
    reloadPublished,
  };
}
