import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import { mergeContent } from "../../lib/site/merge";
import { blockForClick, IN_PREVIEW, PREVIEW_SOURCE, readEditorMessage, type EditorMessage, type PreviewMessage } from "../../lib/site/preview";

/** Brass outline on the chosen section; the scroll margin clears the 64px sticky header. Literal strings so Tailwind generates them. */
const OUTLINE = ["outline-2", "-outline-offset-2", "outline-brand", "scroll-mt-16"];

const post = (message: PreviewMessage) => window.parent.postMessage(message, window.location.origin);
const scrollBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

/** Resolves with the first element matching `selector`, waiting up to `timeout` ms for it to render (lazy page, new route) */
function waitForElement(selector: string, timeout: number, isCurrent: () => boolean): Promise<Element | null> {
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el || !isCurrent()) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(isCurrent() ? el : null);
      }
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/** The site's side of the live preview (spec §6.6), mounted under SiteProvider. Renders nothing; inert outside the editor's frame. */
export function PreviewBridge() {
  return IN_PREVIEW ? <Bridge /> : null;
}

function Bridge() {
  const { setPreviewContent } = useSite();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const outlined = useRef<Element | null>(null);
  const focusRun = useRef(0);
  // latest values for the listener registered once
  const latest = useRef({ setPreviewContent, navigate });
  latest.current = { setPreviewContent, navigate };

  useEffect(() => {
    const focus = async (msg: Extract<EditorMessage, { type: "focus" }>) => {
      const run = ++focusRun.current;
      outlined.current?.classList.remove(...OUTLINE);
      outlined.current = null;
      if (msg.edge === "top") {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        return;
      }
      // the section id was checked against the closed list by readEditorMessage: no selector injection
      const selector = msg.section ? `[data-section="${msg.section}"]` : msg.edge === "bottom" ? "footer" : null;
      if (!selector) return;
      // let a navigation sent just before render its page first
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = await waitForElement(selector, 3000, () => run === focusRun.current);
      if (!el || run !== focusRun.current) return;
      el.classList.add(...OUTLINE);
      outlined.current = el;
      el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const msg = readEditorMessage(e, window.location.origin);
      if (!msg) return;
      if (msg.type === "draft") latest.current.setPreviewContent(mergeContent(msg.content));
      else if (msg.type === "navigate") {
        // keep ?preview=1: a reload of the frame must come back in preview mode
        latest.current.navigate({ pathname: msg.path, search: "?preview=1" }, { replace: true });
        window.scrollTo({ top: 0 });
      } else void focus(msg);
    };

    // in the preview a click chooses what to edit: sections open their block, links do not navigate (the editor drives the frame)
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const section = target.closest("[data-section]")?.getAttribute("data-section") ?? null;
      const block = blockForClick(window.location.pathname, section, !!target.closest("footer"), !!target.closest("main"));
      if (block) {
        e.preventDefault();
        e.stopPropagation();
        post({ from: PREVIEW_SOURCE, type: "select", block });
      } else if (target.closest("a[href]") || (!target.closest("main, footer") && target.closest("button, summary, [role='button'], input, select, textarea, label"))) {
        // links never navigate, and header controls (theme toggle, menu) have no side effect: the preview is a visitor's view
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    post({ from: PREVIEW_SOURCE, type: "ready", path: window.location.pathname });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    post({ from: PREVIEW_SOURCE, type: "location", path: pathname });
  }, [pathname]);

  return null;
}
