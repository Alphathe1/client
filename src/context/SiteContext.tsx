import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { fromServer, readCache, writeCache, type PublishedSite } from "../lib/site/cache";
import type { SiteContent, SiteResponse, SiteSource } from "../lib/site/types";

/** localStorage, or null where merely reading the property throws (blocked site data, some private modes) */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface SiteValue {
  /** what the public pages render: the preview draft when one is set, else the published content */
  content: SiteContent;
  /** the published content merged on the default — the editor's starting point (lot 3). While nothing is published it is the frozen DEFAULT_CONTENT: structuredClone it before editing. */
  published: SiteContent;
  /** version of the published content, null while nothing is published: send it back as `baseUpdatedAt` */
  updatedAt: string | null;
  /** where `published` comes from: the built-in default, this browser's cache, or the server */
  source: SiteSource;
  /** true while a GET /site is in flight (the first one, and every reload()), whatever its outcome; acceptPublished ends it */
  loading: boolean;
  /** message of the last failed GET /site; the site keeps rendering the cache or the default */
  error: string | null;
  reload: () => Promise<void>;
  /** lot 3: after a successful PUT /site, show what the server stored and cache it, without refetching */
  acceptPublished: (content: unknown, updatedAt: string) => void;
  /** lot 3 preview seam: a draft shown instead of the published content (null: back to published). Never cached. */
  setPreviewContent: (draft: SiteContent | null) => void;
  /** true while a preview draft is shown */
  previewing: boolean;
}

const SiteContext = createContext<SiteValue | null>(null);

/** Site content for the whole app (spec §6.4): cache first, then GET /site. The site never waits for the request to render. */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [published, setPublished] = useState<PublishedSite>(() => readCache(browserStorage()));
  const [preview, setPreview] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const accept = useCallback((content: unknown, updatedAt: string | null) => {
    writeCache(browserStorage(), content, updatedAt);
    setPublished((prev) => fromServer(prev, content, updatedAt));
  }, []);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const site = await api.get<SiteResponse>("/site");
      if (id !== requestId.current) return;
      accept(site.content, site.updatedAt);
      setError(null);
    } catch (e) {
      // the cache or the default stays on screen
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [accept]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const acceptPublished = useCallback(
    (content: unknown, updatedAt: string) => {
      // a GET /site still in flight must not overwrite what was just published; it no longer clears `loading` either
      requestId.current++;
      setLoading(false);
      setError(null);
      accept(content, updatedAt);
    },
    [accept],
  );

  const value = useMemo<SiteValue>(
    () => ({
      content: preview ?? published.content,
      published: published.content,
      updatedAt: published.updatedAt,
      source: published.source,
      loading,
      error,
      reload,
      acceptPublished,
      setPreviewContent: setPreview,
      previewing: preview !== null,
    }),
    [preview, published, loading, error, reload, acceptPublished],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside SiteProvider");
  return ctx;
}
