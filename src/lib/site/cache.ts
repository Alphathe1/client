import { DEFAULT_CONTENT } from "./defaults.ts";
import { mergeContent } from "./merge.ts";
import type { SiteContent, SiteSource } from "./types.ts";

export const CACHE_KEY = "lempire_site";

export interface PublishedSite {
  content: SiteContent;
  /** version of the published content; null while nothing is published */
  updatedAt: string | null;
  source: SiteSource;
}

export const DEFAULT_SITE: PublishedSite = { content: DEFAULT_CONTENT, updatedAt: null, source: "default" };

type Reader = Pick<Storage, "getItem">;
type Writer = Pick<Storage, "setItem" | "removeItem">;

/** The last publication this browser saw, merged on today's default; the default when absent, unreadable or corrupt */
export function readCache(storage: Reader | null): PublishedSite {
  try {
    const raw = storage?.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_SITE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_SITE;
    const { content, updatedAt } = parsed as { content?: unknown; updatedAt?: unknown };
    if (!content || typeof updatedAt !== "string") return DEFAULT_SITE;
    return { content: mergeContent(content), updatedAt, source: "cache" };
  } catch {
    return DEFAULT_SITE;
  }
}

/** Keeps the raw publication, not the merged one, so that tomorrow's defaults still fill fields added later */
export function writeCache(storage: Writer | null, content: unknown, updatedAt: string | null): void {
  try {
    if (content && updatedAt) storage?.setItem(CACHE_KEY, JSON.stringify({ content, updatedAt }));
    else storage?.removeItem(CACHE_KEY);
  } catch {
    // storage full or refused: the site still renders from memory
  }
}

/** State once GET /site has answered: the same version keeps the same content object (no needless re-render); nothing published → default */
export function fromServer(prev: PublishedSite, content: unknown, updatedAt: string | null): PublishedSite {
  if (!content || !updatedAt) return { content: DEFAULT_CONTENT, updatedAt: null, source: "server" };
  if (prev.updatedAt === updatedAt) return { ...prev, source: "server" };
  return { content: mergeContent(content), updatedAt, source: "server" };
}
