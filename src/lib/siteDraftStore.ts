import { useSyncExternalStore } from "react";
import { DRAFT_KEY, parseStoredDraft, type StoredDraft } from "./site/draft";

/**
 * The editor's draft as the browser keeps it (spec §6.4, §6.7): in localStorage when it can,
 * in memory otherwise — then `persistent` turns false and the editor warns before the page is left.
 * Module-level on purpose: the draft outlives the editor page while the owner moves around the dashboard,
 * and the sidebar reads it to show its "unpublished changes" dot.
 */
let loaded = false;
let current: StoredDraft | null = null;
let persistent = true;
const listeners = new Set<() => void>();

/** localStorage, or null where merely reading the property throws (blocked site data) */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  const s = storage();
  if (!s) {
    persistent = false;
    return;
  }
  try {
    current = parseStoredDraft(s.getItem(DRAFT_KEY));
  } catch {
    persistent = false;
  }
}

const warn = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = "";
};

/** a draft kept in memory only is lost when the tab closes: warn, whichever dashboard page is open (spec §6.7) */
function syncLeaveGuard() {
  if (typeof window === "undefined") return;
  if (current !== null && !persistent) window.addEventListener("beforeunload", warn);
  else window.removeEventListener("beforeunload", warn);
}

function emit() {
  for (const listener of listeners) listener();
}

export const draftStore = {
  get(): StoredDraft | null {
    load();
    return current;
  },
  save(draft: StoredDraft): void {
    load();
    current = draft;
    try {
      const s = storage();
      if (!s) throw new Error("no storage");
      s.setItem(DRAFT_KEY, JSON.stringify(draft));
      persistent = true;
    } catch {
      // full or refused: the draft lives on in memory only
      persistent = false;
    }
    syncLeaveGuard();
    emit();
  },
  clear(): void {
    load();
    current = null;
    try {
      storage()?.removeItem(DRAFT_KEY);
    } catch {
      // nothing stored anyway
    }
    syncLeaveGuard();
    emit();
  },
  isPersistent(): boolean {
    load();
    return persistent;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// another tab of the same browser saved, published or cancelled
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== DRAFT_KEY && e.key !== null) return;
    loaded = true;
    current = parseStoredDraft(e.newValue);
    syncLeaveGuard();
    emit();
  });
}

/** True while unpublished changes are kept for the editor (the sidebar's warning dot) */
export function useHasSiteDraft(): boolean {
  return useSyncExternalStore(draftStore.subscribe, () => draftStore.get() !== null);
}

/** False once the browser refused to store the draft */
export function useDraftPersistent(): boolean {
  return useSyncExternalStore(draftStore.subscribe, draftStore.isPersistent);
}
