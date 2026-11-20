import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, Info, WarningCircle, X } from "@phosphor-icons/react";
import { Button, IconButton } from "../../../components/ui/Button";
import { ErrorState, Skeleton } from "../../../components/ui/Display";
import { Modal } from "../../../components/ui/Modal";
import { useAuth } from "../../../context/AuthContext";
import { formatDateTime } from "../../../lib/format";
import { BLOCK_LABELS, blockOfPath, editorLayout, fieldId, focusCandidates, isAtDefault, isHomeSection, issueAt, issuesByBlock, type BlockId, type EditorLayout } from "../../../lib/site/editor";
import { previewTarget, type PreviewDevice } from "../../../lib/site/preview";
import { useElementWidth } from "../../../lib/useElementWidth";
import { BlockForm } from "./BlockForm";
import { EditorFormContext, type EditorFormValue } from "./fields";
import { PreviewPane } from "./PreviewPane";
import { PublishBar } from "./PublishBar";
import { StructurePanel } from "./StructurePanel";
import { useSiteEditor } from "./useSiteEditor";

type Confirm = { kind: "cancel" } | { kind: "reload" } | { kind: "reset"; block: BlockId };
type Tab = "form" | "preview";

const GRID: Record<EditorLayout, string> = {
  wide: "grid-cols-[16.5rem_24rem_minmax(0,1fr)]",
  medium: "grid-cols-[16.5rem_minmax(0,1fr)]",
  narrow: "grid-cols-1",
};
const TAB_LABEL: Record<Tab, string> = { form: "Formulaire", preview: "Aperçu" };

function confirmCopy(c: Confirm) {
  if (c.kind === "cancel") {
    return {
      title: "Annuler les modifications ?",
      text: "Le brouillon est effacé et l'éditeur revient au contenu publié. Cette action ne peut pas être annulée.",
      keep: "Continuer l'édition",
      go: "Annuler les modifications",
      danger: true,
    };
  }
  if (c.kind === "reload") {
    return {
      title: "Recharger la version publiée ?",
      text: "Le site a été publié depuis un autre appareil. Vos modifications non publiées seront remplacées par cette version.",
      keep: "Garder mon brouillon",
      go: "Recharger",
      danger: true,
    };
  }
  return {
    title: `Rétablir « ${BLOCK_LABELS[c.block]} » ?`,
    text: "Les textes et images de ce bloc reprennent leur version d'origine. Rien n'est publié avant que vous cliquiez sur « Publier ».",
    keep: "Garder mes textes",
    go: "Rétablir",
    danger: false,
  };
}

function LoadingEditor() {
  return (
    <div role="status" aria-label="Chargement de l'éditeur" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 p-5 md:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-2 md:flex">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

/** The owner's site editor (spec §6): structure, form, live preview, publication */
export default function SiteEditor() {
  const editor = useSiteEditor();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { draft, dispatch, issues, dirty } = editor;
  const root = useRef<HTMLDivElement>(null);
  const layout = editorLayout(useElementWidth(root));
  const panel = useRef<HTMLDivElement>(null);
  const formScroll = useRef<HTMLDivElement>(null);
  const tabs = useRef<Record<Tab, HTMLButtonElement | null>>({ form: null, preview: null });

  const [selected, setSelected] = useState<BlockId>("hero");
  const [tab, setTab] = useState<Tab>("form");
  /** narrow layout: a block is open over the structure list */
  const [blockOpen, setBlockOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  // the modal keeps its words while it fades out
  const shownConfirm = useRef<Confirm>({ kind: "cancel" });
  if (confirm) shownConfirm.current = confirm;

  const busy = editor.publishing || editor.reloading;
  const invalid = useMemo(() => new Set(issuesByBlock(issues).keys()), [issues]);
  const invalidFields = useMemo(() => new Set(issues.map((i) => i.path)).size, [issues]);
  const dirtySet = useMemo(() => new Set(dirty), [dirty]);
  const target = useMemo(() => previewTarget(selected), [selected]);

  const form = useMemo<EditorFormValue>(
    () => ({
      draft,
      dispatch,
      busy,
      errorAt: (path) => (editor.showAllErrors || touched.has(path) ? issueAt(issues, path) : undefined),
      touch: (path) => setTouched((t) => (t.has(path) ? t : new Set(t).add(path))),
    }),
    [draft, dispatch, busy, editor.showAllErrors, touched, issues],
  );

  // Publish with invalid fields: open the block, then focus its first invalid field (or the list or item holding it)
  useEffect(() => {
    if (!pendingFocus) return;
    const frame = requestAnimationFrame(() => {
      for (const path of focusCandidates(pendingFocus)) {
        const el = document.getElementById(fieldId(path));
        if (el) {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ block: "center" });
          break;
        }
      }
      setPendingFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocus, selected, tab, blockOpen]);

  const select = (block: BlockId) => {
    setSelected(block);
    if (layout === "narrow") {
      setBlockOpen(true);
      setTab("form");
    }
    formScroll.current?.scrollTo({ top: 0 });
  };
  /** a click in the preview means "edit this": show its form */
  const selectFromPreview = (block: BlockId) => {
    select(block);
    setTab("form");
  };
  const backToStructure = () => {
    setBlockOpen(false);
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[aria-current]")?.focus());
  };

  const onPublish = async () => {
    const result = await editor.publish();
    if (result.kind === "published") setTouched(new Set());
    if (result.kind !== "invalid") return;
    const block = blockOfPath(result.issue.path);
    if (block) {
      setSelected(block);
      setTab("form");
      if (layout === "narrow") setBlockOpen(true);
    }
    setPendingFocus(result.issue.path);
  };

  const runConfirm = () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.kind === "cancel") {
      editor.discard();
      setTouched(new Set());
      // the confirm closes and the form re-renders: park the focus on the block title (the modal would hand it back to "Annuler", now disabled)
      setTimeout(() => document.getElementById("site-block-title")?.focus({ preventScroll: true }), 80);
    } else if (c.kind === "reload") {
      void editor.reloadPublished().then(() => document.getElementById("site-block-title")?.focus({ preventScroll: true }));
      setTouched(new Set());
    } else dispatch({ type: "reset", block: c.block });
  };
  /** the session is gone: sign out first, or Login would bounce straight back while `user` is still set */
  const reconnect = () => {
    logout();
    navigate("/login", { state: { from: "/dashboard/site" } });
  };
  const askReload = () => (dirty.length > 0 ? setConfirm({ kind: "reload" }) : void editor.reloadPublished());

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next: Tab = tab === "form" ? "preview" : "form";
    setTab(next);
    tabs.current[next]?.focus();
  };

  const wide = layout === "wide";
  const narrow = layout === "narrow";
  const showStructure = !narrow || !blockOpen;
  const showWork = !narrow || blockOpen;
  const formVisible = showWork && (wide || tab === "form");
  const previewVisible = showWork && (wide || tab === "preview");
  const sectionHidden = isHomeSection(selected) && draft.home.hidden.includes(selected);
  const conflict = editor.failure?.kind === "conflict" || (editor.stale && !editor.failure);
  const copy = confirmCopy(shownConfirm.current);

  return (
    <div ref={root} data-layout={layout} className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-bg">
      <h1 className="sr-only">Éditeur du site</h1>
      {editor.phase === "loading" ? (
        <LoadingEditor />
      ) : editor.phase === "error" ? (
        <div className="mx-auto w-full max-w-xl p-6">
          <ErrorState message="La version publiée du site n'a pas pu être chargée. Votre brouillon, s'il existe, reste enregistré dans ce navigateur." onRetry={editor.retryLoad} />
        </div>
      ) : (
        <EditorFormContext.Provider value={form}>
          <PublishBar
            publishedAt={editor.publishedAt}
            dirtyCount={dirty.length}
            invalidCount={invalidFields}
            persistent={editor.persistent}
            publishing={editor.publishing}
            reloading={editor.reloading}
            onCancel={() => setConfirm({ kind: "cancel" })}
            onPublish={() => void onPublish()}
          />

          {(editor.failure || editor.stale) && (
            <div role="alert" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-danger/40 bg-danger/12 px-4 py-2.5 text-sm text-text sm:px-5">
              <WarningCircle size={18} className="shrink-0 text-danger" aria-hidden />
              <p className="min-w-0 flex-1">{editor.failure?.message ?? "Le site a été modifié depuis un autre appareil."}</p>
              {conflict ? (
                <Button variant="secondary" size="sm" loading={editor.reloading} onClick={askReload}>
                  Recharger la version publiée
                </Button>
              ) : editor.failure?.kind === "session" ? (
                <Button variant="secondary" size="sm" onClick={reconnect}>
                  Se reconnecter
                </Button>
              ) : (
                <Button variant="secondary" size="sm" loading={busy} onClick={() => (editor.failedOp === "reload" ? void editor.reloadPublished() : void onPublish())}>
                  Réessayer
                </Button>
              )}
            </div>
          )}
          {editor.resumedAt && dirty.length > 0 && !resumeDismissed && (
            <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface-2 px-4 py-1.5 text-sm text-muted sm:px-5">
              <Info size={18} className="shrink-0" aria-hidden />
              <p className="min-w-0 flex-1">Brouillon repris : vos modifications du {formatDateTime(editor.resumedAt)} ne sont pas encore publiées.</p>
              <IconButton label="Masquer ce message" onClick={() => setResumeDismissed(true)}>
                <X size={16} aria-hidden />
              </IconButton>
            </div>
          )}
          {!editor.persistent && dirty.length > 0 && (
            <div className="flex shrink-0 items-center gap-3 border-b border-warning/40 bg-warning/12 px-4 py-2.5 text-sm text-text sm:px-5">
              <WarningCircle size={18} className="shrink-0 text-warning" aria-hidden />
              <p className="min-w-0 flex-1">Ce navigateur n'enregistre pas le brouillon : il sera perdu si vous fermez ou rechargez la page avant de publier.</p>
            </div>
          )}

          <div className={`grid min-h-0 flex-1 ${GRID[layout]}`}>
            <div ref={panel} className={`${showStructure ? "block" : "hidden"} min-h-0 overflow-y-auto bg-surface ${narrow ? "" : "border-r border-line"}`}>
              <StructurePanel draft={draft} selected={selected} onSelect={select} dispatch={dispatch} dirty={dirtySet} invalid={invalid} busy={busy} />
            </div>

            {/* one stable subtree for the form and the preview, so the preview frame is never remounted when the layout changes */}
            <div className={wide ? "contents" : showWork ? "flex min-h-0 flex-col" : "hidden"}>
              {!wide && (
                <div className="flex shrink-0 items-center gap-2 border-b border-line px-2 sm:px-4">
                  {narrow && (
                    <Button variant="ghost" size="sm" icon={<CaretLeft size={16} aria-hidden />} onClick={backToStructure}>
                      Structure
                    </Button>
                  )}
                  <div role="tablist" aria-label="Vue de l'éditeur" onKeyDown={onTabKey} className="flex gap-1">
                    {(["form", "preview"] as const).map((t) => (
                      <button
                        key={t}
                        ref={(el) => {
                          tabs.current[t] = el;
                        }}
                        id={`site-tab-${t}`}
                        type="button"
                        role="tab"
                        aria-selected={tab === t}
                        aria-controls={`site-panel-${t}`}
                        tabIndex={tab === t ? 0 : -1}
                        onClick={() => setTab(t)}
                        className={`relative min-h-11 cursor-pointer px-3 text-sm transition-colors duration-100 ease-out ${tab === t ? "font-medium text-text after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand" : "text-muted hover:text-text"}`}
                      >
                        {TAB_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div
                ref={formScroll}
                id="site-panel-form"
                role={wide ? undefined : "tabpanel"}
                aria-labelledby={wide ? undefined : "site-tab-form"}
                className={`${formVisible ? "block" : "hidden"} min-h-0 flex-1 overflow-y-auto ${wide ? "border-r border-line" : ""}`}
              >
                <BlockForm
                  key={selected}
                  block={selected}
                  hidden={sectionHidden}
                  onShow={() => isHomeSection(selected) && dispatch({ type: "toggleHidden", id: selected })}
                  canReset={!isAtDefault(draft, selected)}
                  onReset={() => setConfirm({ kind: "reset", block: selected })}
                />
              </div>
              <div
                id="site-panel-preview"
                role={wide ? undefined : "tabpanel"}
                aria-labelledby={wide ? undefined : "site-tab-preview"}
                aria-label={wide ? "Aperçu en direct" : undefined}
                className={`${previewVisible ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}
              >
                <PreviewPane draft={draft} target={target} visible={previewVisible} device={device} onDeviceChange={setDevice} fill={narrow} onSelect={selectFromPreview} />
              </div>
            </div>
          </div>

          <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={copy.title} description={copy.text}>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                {copy.keep}
              </Button>
              <Button variant={copy.danger ? "danger" : "primary"} onClick={runConfirm}>
                {copy.go}
              </Button>
            </div>
          </Modal>
        </EditorFormContext.Provider>
      )}
    </div>
  );
}
