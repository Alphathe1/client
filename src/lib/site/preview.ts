/** Live preview protocol (spec §6.6): the editor and the site loaded in its frame (`/?preview=1`) talk by postMessage.
 *  Both sides post with their own origin as targetOrigin and read messages only through these guards; the components
 *  also check `event.source` (the frame's window on one side, window.parent on the other). */
import { isBlockId, isHomeSection, type BlockId } from "./editor.ts";
import type { HomeSectionId } from "./types.ts";

export const EDITOR_SOURCE = "lempire-editor";
export const PREVIEW_SOURCE = "lempire-preview";

/** Pages the editor can show in the frame */
export const PREVIEW_PATHS = ["/", "/services", "/barbers", "/gallery"] as const;
export type PreviewPath = (typeof PREVIEW_PATHS)[number];

/** Where the frame scrolls for a block that is not a home section: the top (announcement, inner pages) or the footer (identity, hours) */
export type PreviewEdge = "top" | "bottom";

export type EditorMessage =
  /** the draft to show instead of the published content; the frame merges it on the default */
  | { from: typeof EDITOR_SOURCE; type: "draft"; content: unknown }
  | { from: typeof EDITOR_SOURCE; type: "navigate"; path: PreviewPath }
  /** scroll to and outline a home section, or scroll to an edge */
  | { from: typeof EDITOR_SOURCE; type: "focus"; section: HomeSectionId | null; edge: PreviewEdge | null };

export type PreviewMessage =
  /** the frame listens (sent on load, and again if the frame reloads) */
  | { from: typeof PREVIEW_SOURCE; type: "ready"; path: string }
  | { from: typeof PREVIEW_SOURCE; type: "location"; path: string }
  /** the owner clicked a section of the preview: open its block */
  | { from: typeof PREVIEW_SOURCE; type: "select"; block: BlockId };

export interface IncomingMessage {
  origin: string;
  data: unknown;
}

const record = (data: unknown): Record<string, unknown> | null =>
  typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
const isPreviewPath = (value: unknown): value is PreviewPath => (PREVIEW_PATHS as readonly unknown[]).includes(value);

/** A message from the editor, or null: other origins, other senders and malformed messages are ignored */
export function readEditorMessage(event: IncomingMessage, ownOrigin: string): EditorMessage | null {
  const d = record(event.data);
  if (event.origin !== ownOrigin || !d || d.from !== EDITOR_SOURCE) return null;
  if (d.type === "draft" && record(d.content)) return { from: EDITOR_SOURCE, type: "draft", content: d.content };
  if (d.type === "navigate" && isPreviewPath(d.path)) return { from: EDITOR_SOURCE, type: "navigate", path: d.path };
  if (d.type === "focus") {
    const section = d.section === null || isHomeSection(d.section) ? d.section : undefined;
    const edge = d.edge === null || d.edge === "top" || d.edge === "bottom" ? d.edge : undefined;
    if (section !== undefined && edge !== undefined) return { from: EDITOR_SOURCE, type: "focus", section, edge };
  }
  return null;
}

/** A message from the preview frame, or null */
export function readPreviewMessage(event: IncomingMessage, ownOrigin: string): PreviewMessage | null {
  const d = record(event.data);
  if (event.origin !== ownOrigin || !d || d.from !== PREVIEW_SOURCE) return null;
  if ((d.type === "ready" || d.type === "location") && typeof d.path === "string" && d.path.startsWith("/")) {
    return { from: PREVIEW_SOURCE, type: d.type, path: d.path };
  }
  if (d.type === "select" && isBlockId(d.block)) return { from: PREVIEW_SOURCE, type: "select", block: d.block };
  return null;
}

/** True for the address of the preview frame (`?preview=1`) */
export const isPreviewSearch = (search: string) => new URLSearchParams(search).get("preview") === "1";

/** Decided once, at load: inside a frame AND opened as /?preview=1. Later in-frame navigations drop the query, not the mode. */
export const IN_PREVIEW = typeof window !== "undefined" && window.parent !== window && isPreviewSearch(window.location.search);

export interface PreviewTarget {
  path: PreviewPath;
  section: HomeSectionId | null;
  edge: PreviewEdge | null;
}

/** What the frame shows when a block is chosen */
export function previewTarget(block: BlockId): PreviewTarget {
  switch (block) {
    case "identity":
    case "hours":
      return { path: "/", section: null, edge: "bottom" };
    case "announcement":
      return { path: "/", section: null, edge: "top" };
    case "services":
    case "barbers":
    case "gallery":
      return { path: `/${block}`, section: null, edge: "top" };
    default:
      return { path: "/", section: block, edge: null };
  }
}

/** The block a click in the preview opens: its home section, the footer (identity and contact), or the inner page itself */
export function blockForClick(path: string, section: string | null, inFooter: boolean, inMain: boolean): BlockId | null {
  if (isHomeSection(section)) return section;
  if (inFooter) return "identity";
  const page = path.replace(/\/+$/, "").slice(1);
  if (inMain && (page === "services" || page === "barbers" || page === "gallery")) return page;
  return null;
}

/** Frame widths of the device switch (Bureau: the 1280px container of the site) */
export const DEVICE_WIDTHS = { mobile: 390, tablet: 768, desktop: 1280 } as const;
export type PreviewDevice = keyof typeof DEVICE_WIDTHS;

/** The frame keeps its real width (its responsive rules stay exact) and is scaled down by steps to fit the column */
export const PREVIEW_SCALES = [1, 0.75, 0.625, 0.5, 0.4, 0.35] as const;
export type PreviewScale = (typeof PREVIEW_SCALES)[number];

export function fitScale(frameWidth: number, available: number): PreviewScale {
  return PREVIEW_SCALES.find((s) => frameWidth * s <= available) ?? 0.35;
}
