import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIRST_FIELD = '[data-autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

/**
 * While `active`: moves focus into `ref`, keeps Tab / Shift+Tab inside it, calls `onEscape` on Escape,
 * and hands focus back to whatever had it once the trap closes.
 * The container needs tabIndex={-1} so it can hold focus when it has no field.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape: () => void) {
  // latest callback without re-running the effect: an inline arrow would otherwise steal focus on every render
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      const root = ref.current;
      if (!root) return;
      if (e.key === "Escape") {
        // a nested widget (account menu) already used this Escape
        if (e.defaultPrevented) return;
        escapeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // skip what is not rendered (display: none); visually-hidden inputs still count
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        e.preventDefault();
        root.focus();
        return;
      }
      const current = document.activeElement;
      if (!root.contains(current) || current === root) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    // once the opening animation has mounted the content: the first field if there is one, else the container
    const timer = setTimeout(() => {
      const root = ref.current;
      if (!root || root.contains(document.activeElement)) return;
      (root.querySelector<HTMLElement>(FIRST_FIELD) ?? root).focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [active, ref]);
}
