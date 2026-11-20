import { DEFAULT_CONTENT } from "./defaults.ts";
import { HOME_SECTION_IDS, type HomeSectionId, type SiteContent } from "./types.ts";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** `value` reshaped like `base`: base's keys only, base's types only. Always returns new objects and arrays. */
function mergeValue(base: unknown, value: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(value) ? mergeArray(base, value) : structuredClone(base);
  if (isObject(base)) {
    const source = isObject(value) ? value : {};
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) out[key] = mergeValue(base[key], source[key]);
    return out;
  }
  return typeof value === typeof base ? value : base;
}

/** A list is taken whole (the owner may have removed items); each object item is completed from the default item at the same place */
function mergeArray(base: unknown[], value: unknown[]): unknown[] {
  const template = base[0];
  if (isObject(template)) return value.filter(isObject).map((item, i) => mergeValue(base[i] ?? template, item));
  const kind = template === undefined ? "string" : typeof template;
  return value.filter((item) => typeof item === kind);
}

const isSection = (id: string): id is HomeSectionId => (HOME_SECTION_IDS as readonly string[]).includes(id);

/** Published order kept; unknown or repeated ids dropped; sections added to the model after publication go last */
function normalizeSections(order: string[], hidden: string[]) {
  const seen = new Set<HomeSectionId>();
  for (const id of order) if (isSection(id)) seen.add(id);
  for (const id of HOME_SECTION_IDS) seen.add(id);
  return { order: [...seen], hidden: [...new Set(hidden.filter(isSection))] };
}

/** Published (or cached, or preview) content laid over the default: whatever arrives, the site gets a complete SiteContent */
export function mergeContent(value: unknown): SiteContent {
  const merged = mergeValue(DEFAULT_CONTENT, value) as SiteContent;
  const { order, hidden } = normalizeSections(merged.home.order, merged.home.hidden);
  merged.home.order = order;
  merged.home.hidden = hidden;
  return merged;
}
