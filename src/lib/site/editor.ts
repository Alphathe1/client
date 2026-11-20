/** The site editor's model (spec §6.5): blocks, field paths, what changed, section order, upload and publish messages.
 *  Pure module like the rest of lib/site: the Node test runner imports it directly. */
import { DEFAULT_CONTENT } from "./defaults.ts";
import { HOME_SECTION_IDS, HOME_SECTION_LABELS, type HomeSectionId, type InnerPage, type SiteContent } from "./types.ts";
import { LIMITS, type SiteIssue } from "./validate.ts";

export const GENERAL_BLOCKS = ["identity", "hours", "announcement"] as const;
export type GeneralBlock = (typeof GENERAL_BLOCKS)[number];
export const PAGE_BLOCKS = ["services", "barbers", "gallery"] as const satisfies readonly InnerPage[];

/** One entry of the structure panel. The three families never share an id, so the union stays flat. */
export type BlockId = GeneralBlock | HomeSectionId | InnerPage;
export type BlockGroup = "general" | "home" | "pages";

export const BLOCK_GROUP_LABELS: Record<BlockGroup, string> = { general: "Général", home: "Accueil", pages: "Pages intérieures" };

export const BLOCK_LABELS: Record<BlockId, string> = {
  identity: "Identité et contact",
  hours: "Horaires",
  announcement: "Annonce",
  ...HOME_SECTION_LABELS,
  services: "Tarifs",
  barbers: "Barbers",
  gallery: "Galerie",
};

export const isHomeSection = (value: unknown): value is HomeSectionId => (HOME_SECTION_IDS as readonly unknown[]).includes(value);
export const isInnerPage = (value: unknown): value is InnerPage => (PAGE_BLOCKS as readonly unknown[]).includes(value);
export const isGeneralBlock = (value: unknown): value is GeneralBlock => (GENERAL_BLOCKS as readonly unknown[]).includes(value);
export const isBlockId = (value: unknown): value is BlockId => isGeneralBlock(value) || isHomeSection(value) || isInnerPage(value);

export function blockGroup(block: BlockId): BlockGroup {
  if (isGeneralBlock(block)) return "general";
  return isHomeSection(block) ? "home" : "pages";
}

/** Panel order: general blocks, the home sections in the draft's order, then the inner pages */
export function blockOrder(order: readonly HomeSectionId[]): BlockId[] {
  return [...GENERAL_BLOCKS, ...order, ...PAGE_BLOCKS];
}

/** The block that owns a field path of validateContent or the server ("home.features.items.1.title" → "features");
 *  null for paths about the whole structure (home.order, home.hidden). */
export function blockOfPath(path: string): BlockId | null {
  const [head, second] = path.split(".");
  if (head === "identity" || head === "contact") return "identity";
  if (head === "hours" || head === "announcement") return head;
  if (head === "home" && isHomeSection(second)) return second;
  if (head === "pages" && isInnerPage(second)) return second;
  return null;
}

/** DOM id of the control that edits `path`; Publish focuses it when the field is invalid */
export const fieldId = (path: string) => `site-${path.replaceAll(".", "-")}`;

/** Paths to try, most precise first, when focusing the field of an issue: a list-level or item-level issue
 *  lands on the list or item container ("home.salon.images.1" → itself, then "home.salon.images"). Never shorter than two segments. */
export function focusCandidates(path: string): string[] {
  const parts = path.split(".");
  const out: string[] = [];
  for (let n = parts.length; n >= Math.min(2, parts.length); n--) out.push(parts.slice(0, n).join("."));
  return out;
}

/** Value at a dotted path ("home.features.items.0.title"), undefined when the path leads nowhere */
export function getIn(source: unknown, path: string): unknown {
  let node = source;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Copy of `source` with `value` at `path`. Objects and arrays along the path are copied, everything else is shared,
 *  so frozen input is fine. A path that does not exist throws: a typo must never add a field the server would refuse. */
export function setIn<T>(source: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const step = (node: unknown, i: number): unknown => {
    const key = keys[i]!;
    const last = i === keys.length - 1;
    if (Array.isArray(node)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= node.length) throw new Error(`Unknown content path: ${path}`);
      const copy = node.slice();
      copy[index] = last ? value : step(node[index], i + 1);
      return copy;
    }
    if (node !== null && typeof node === "object" && Object.hasOwn(node, key)) {
      const record = node as Record<string, unknown>;
      return { ...record, [key]: last ? value : step(record[key], i + 1) };
    }
    throw new Error(`Unknown content path: ${path}`);
  };
  return step(source, 0) as T;
}

/** Deep equality for JSON-like values (the content holds nothing else) */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = Object.keys(ra);
  return keys.length === Object.keys(rb).length && keys.every((k) => Object.hasOwn(rb, k) && sameValue(ra[k], rb[k]));
}

type EditableSection = Exclude<HomeSectionId, "testimonial">;

/** The fields a block edits; the testimonial section has none (it shows a real review) */
function blockFields(c: SiteContent, block: BlockId): unknown {
  switch (block) {
    case "identity":
      return [c.identity, c.contact];
    case "hours":
      return c.hours;
    case "announcement":
      return c.announcement;
    case "testimonial":
      return null;
    case "services":
    case "barbers":
    case "gallery":
      return c.pages[block];
    default:
      return c.home[block as EditableSection];
  }
}

/** A block is changed when its fields differ or, for a home section, when it was shown or hidden */
function blockState(c: SiteContent, block: BlockId): unknown {
  return isHomeSection(block) ? [blockFields(c, block), c.home.hidden.includes(block)] : blockFields(c, block);
}

/** What the publish bar counts: changed blocks, plus "order" when the home sections were reordered (it counts as one) */
export type DirtyKey = BlockId | "order";

export function dirtyKeys(draft: SiteContent, published: SiteContent): DirtyKey[] {
  const keys: DirtyKey[] = blockOrder(HOME_SECTION_IDS).filter((b) => !sameValue(blockState(draft, b), blockState(published, b)));
  if (!sameValue(draft.home.order, published.home.order)) keys.push("order");
  return keys;
}

/** "Rétablir le contenu d'origine": the block's fields go back to the built-in default; its visibility and place stay */
export function resetBlock(c: SiteContent, block: BlockId): SiteContent {
  const d = structuredClone(DEFAULT_CONTENT) as SiteContent;
  switch (block) {
    case "identity":
      return { ...c, identity: d.identity, contact: d.contact };
    case "hours":
      return { ...c, hours: d.hours };
    case "announcement":
      return { ...c, announcement: d.announcement };
    case "testimonial":
      return c;
    case "services":
    case "barbers":
    case "gallery":
      return { ...c, pages: { ...c.pages, [block]: d.pages[block] } };
    default:
      return { ...c, home: { ...c.home, [block]: d.home[block as EditableSection] } };
  }
}

/** True when the block already shows its original content (the reset link is then pointless) */
export const isAtDefault = (c: SiteContent, block: BlockId) => sameValue(blockFields(c, block), blockFields(DEFAULT_CONTENT, block));

/** The section one step up (-1) or down (+1); the same order when it is already at that end */
export function moveSection(order: readonly HomeSectionId[], id: HomeSectionId, delta: -1 | 1): HomeSectionId[] {
  const to = order.indexOf(id) + delta;
  if (!order.includes(id) || to < 0 || to >= order.length) return [...order];
  return moveSectionTo(order, id, to);
}

/** The section moved so that it ends at `index` (clamped) */
export function moveSectionTo(order: readonly HomeSectionId[], id: HomeSectionId, index: number): HomeSectionId[] {
  if (!order.includes(id)) return [...order];
  const rest = order.filter((s) => s !== id);
  rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id);
  return rest;
}

/** Final index of a dragged section dropped just before the row at `before` (`before` = order.length: at the end) */
export const dropIndex = (from: number, before: number) => (before > from ? before - 1 : before);

/** Shown ↔ hidden; the list is kept in the default section order so that toggling twice gives the same list */
export function toggleHidden(hidden: readonly HomeSectionId[], id: HomeSectionId): HomeSectionId[] {
  const nowHidden = !hidden.includes(id);
  return HOME_SECTION_IDS.filter((s) => (s === id ? nowHidden : hidden.includes(s)));
}

/** The editable lists and their sizes (spec §6.2) */
export const LIST_LIMITS = {
  "home.features.items": { min: LIMITS.featuresMin, max: LIMITS.featuresMax },
  "home.salon.points": { min: LIMITS.salonPointsMin, max: LIMITS.salonPointsMax },
  "home.salon.images": { min: 0, max: LIMITS.salonImagesMax },
  "home.highlights.items": { min: LIMITS.highlightsMin, max: LIMITS.highlightsMax },
} as const;
export type ListPath = keyof typeof LIST_LIMITS;

/** Every issue grouped by the block that shows it (structure-wide issues are left out) */
export function issuesByBlock(issues: readonly SiteIssue[]): Map<BlockId, SiteIssue[]> {
  const map = new Map<BlockId, SiteIssue[]>();
  for (const issue of issues) {
    const block = blockOfPath(issue.path);
    if (block) map.set(block, [...(map.get(block) ?? []), issue]);
  }
  return map;
}

/** The message shown under the control of `path` (the first one when a field breaks two rules) */
export const issueAt = (issues: readonly SiteIssue[], path: string) => issues.find((i) => i.path === path)?.message;

/** Where Publish takes the owner: the first issue in panel order, then in the form's order (validateContent's order) */
export function firstIssue(issues: readonly SiteIssue[], order: readonly HomeSectionId[]): SiteIssue | undefined {
  const rank = new Map(blockOrder(order).map((b, i) => [b, i] as const));
  const place = (issue: SiteIssue) => {
    const block = blockOfPath(issue.path);
    return block ? rank.get(block)! : Number.MAX_SAFE_INTEGER;
  };
  return [...issues].sort((a, b) => place(a) - place(b))[0];
}

/** Character counter colour: neutral, warning from 90 % of the limit, danger beyond it */
export type CounterTone = "normal" | "near" | "over";
export function counterTone(length: number, max: number): CounterTone {
  if (length > max) return "over";
  return length >= Math.floor(max * 0.9) ? "near" : "normal";
}

/** Width-driven layout of the editor, measured on the editor itself (the dashboard sidebar takes 64 or 248px from the window).
 *  wide: three columns; medium: structure + form/preview tabs; narrow: the structure list, then one block full width. */
export type EditorLayout = "narrow" | "medium" | "wide";
/** three columns from a 1280px window with the folded 64px rail (1216px left) and from 1440px with the full 248px sidebar (1192px) */
export const WIDE_MIN = 1152;
/** no sidebar below 1024px: the editor width is the window width */
export const MEDIUM_MIN = 768;
export const editorLayout = (width: number): EditorLayout => (width >= WIDE_MIN ? "wide" : width >= MEDIUM_MIN ? "medium" : "narrow");

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** POST /site/media refuses more (spec §6.3) */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MESSAGES = {
  format: "Format refusé : choisissez une image JPEG, PNG ou WebP.",
  size: "Image trop lourde, même compressée : 2 Mo au plus.",
  network: "Envoi impossible : vérifiez votre connexion, puis réessayez.",
  read: "Cette image n'a pas pu être lue. Essayez un autre fichier.",
  failed: "L'image n'a pas pu être envoyée.",
} as const;

export const isAcceptedImageType = (type: string) => (IMAGE_TYPES as readonly string[]).includes(type);

/** Decoded size, in bytes, of a base64 data URL */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/** What to say under the image field when POST /site/media fails (ApiError status 0 = no answer) */
export function uploadErrorMessage(status: number, serverMessage: string): string {
  if (status === 0) return IMAGE_MESSAGES.network;
  if (status === 413) return IMAGE_MESSAGES.size;
  if (status === 415) return IMAGE_MESSAGES.format;
  if (status === 401) return "Votre session a expiré : reconnectez-vous pour envoyer des images.";
  return serverMessage || IMAGE_MESSAGES.failed;
}

/** Why a publication failed, and which way out the banner offers */
export interface PublishFailure {
  /** network → Réessayer; conflict → Recharger la version publiée; session → Se reconnecter; refused, server → Réessayer */
  kind: "network" | "conflict" | "session" | "refused" | "server";
  message: string;
}

/** The server's auth messages are English ("No token provided"): the editor speaks for them */
export function publishFailure(status: number, serverMessage: string): PublishFailure {
  if (status === 0) return { kind: "network", message: "Publication impossible : le serveur ne répond pas. Votre brouillon est intact." };
  if (status === 409) return { kind: "conflict", message: "Le site a été modifié depuis un autre appareil." };
  if (status === 401) return { kind: "session", message: "Votre session a expiré. Reconnectez-vous : le brouillon reste enregistré dans ce navigateur." };
  if (status === 403) return { kind: "refused", message: "Seul le propriétaire du salon peut publier le site." };
  if (status === 400) return { kind: "refused", message: `Le serveur a refusé le contenu : ${serverMessage}` };
  return { kind: "server", message: serverMessage ? `La publication a échoué : ${serverMessage}` : "La publication a échoué." };
}

/** "1 bloc modifié", "3 blocs modifiés" */
export const dirtyLabel = (count: number) => `${count} bloc${count > 1 ? "s" : ""} modifié${count > 1 ? "s" : ""}`;
