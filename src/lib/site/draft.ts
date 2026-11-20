/** The editor's draft (spec §6.4): every edit as a pure reducer action, and the copy kept in the browser between visits. */
import { getIn, LIST_LIMITS, moveSection, moveSectionTo, resetBlock, setIn, toggleHidden, type BlockId, type ListPath } from "./editor.ts";
import { mergeContent } from "./merge.ts";
import type { HomeSectionId, SiteContent } from "./types.ts";

export const DRAFT_KEY = "lempire_site_draft";

/** What localStorage keeps between visits */
export interface StoredDraft {
  version: 1;
  content: SiteContent;
  /** the publication the draft started from: sent back as baseUpdatedAt, so a newer publication elsewhere gives a 409 */
  baseUpdatedAt: string | null;
  /** ISO date of the last save */
  savedAt: string;
}

/** The editor's starting point: a deep, unfrozen copy. `published` may be DEFAULT_CONTENT itself, which is frozen. */
export const startDraft = (published: SiteContent): SiteContent => structuredClone(published);

export const makeStoredDraft = (content: SiteContent, baseUpdatedAt: string | null, now: Date): StoredDraft => ({
  version: 1,
  content,
  baseUpdatedAt,
  savedAt: now.toISOString(),
});

/** The stored draft, merged on today's default; null when absent, corrupt or written by another version */
export function parseStoredDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { version, content, baseUpdatedAt, savedAt } = value as Record<string, unknown>;
    if (version !== 1 || typeof content !== "object" || content === null || typeof savedAt !== "string") return null;
    if (baseUpdatedAt !== null && typeof baseUpdatedAt !== "string") return null;
    return { version: 1, content: mergeContent(content), baseUpdatedAt, savedAt };
  } catch {
    return null;
  }
}

export type DraftAction =
  /** start over from this content (load, Annuler, after a publication); the caller passes a copy it owns */
  | { type: "replace"; content: SiteContent }
  /** one field, by its dotted path */
  | { type: "set"; path: string; value: unknown }
  | { type: "move"; id: HomeSectionId; delta: -1 | 1 }
  | { type: "moveTo"; id: HomeSectionId; index: number }
  | { type: "toggleHidden"; id: HomeSectionId }
  | { type: "reset"; block: BlockId }
  | { type: "listAdd"; path: ListPath; item: unknown }
  | { type: "listRemove"; path: ListPath; index: number }
  | { type: "listMove"; path: ListPath; index: number; delta: -1 | 1 };

const listAt = (state: SiteContent, path: ListPath) => getIn(state, path) as unknown[];

/** Every edit of the editor. Never mutates `state`; returns `state` itself when nothing changes (no re-render, no save). */
export function draftReducer(state: SiteContent, action: DraftAction): SiteContent {
  switch (action.type) {
    case "replace":
      return action.content;
    case "set": {
      const current = getIn(state, action.path);
      // undefined: the path no longer exists (an upload finishing after its photo slot was removed, or after "Annuler")
      if (current === undefined || Object.is(current, action.value)) return state;
      return setIn(state, action.path, action.value);
    }
    case "move":
    case "moveTo": {
      const order =
        action.type === "move" ? moveSection(state.home.order, action.id, action.delta) : moveSectionTo(state.home.order, action.id, action.index);
      return order.every((id, i) => id === state.home.order[i]) ? state : setIn(state, "home.order", order);
    }
    case "toggleHidden":
      return setIn(state, "home.hidden", toggleHidden(state.home.hidden, action.id));
    case "reset":
      return resetBlock(state, action.block);
    case "listAdd": {
      const list = listAt(state, action.path);
      return list.length >= LIST_LIMITS[action.path].max ? state : setIn(state, action.path, [...list, action.item]);
    }
    case "listRemove": {
      const list = listAt(state, action.path);
      if (list.length <= LIST_LIMITS[action.path].min || action.index < 0 || action.index >= list.length) return state;
      return setIn(state, action.path, list.filter((_, i) => i !== action.index));
    }
    case "listMove": {
      const list = listAt(state, action.path);
      const to = action.index + action.delta;
      if (action.index < 0 || action.index >= list.length || to < 0 || to >= list.length) return state;
      const next = list.slice();
      [next[action.index], next[to]] = [next[to], next[action.index]];
      return setIn(state, action.path, next);
    }
  }
}
