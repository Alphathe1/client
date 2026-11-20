import { useCallback, useEffect, useRef, useState } from "react";
import { Desktop, DeviceMobile, DeviceTablet } from "@phosphor-icons/react";
import { Segmented } from "../../../components/ui/Segmented";
import { Skeleton } from "../../../components/ui/Display";
import type { BlockId } from "../../../lib/site/editor";
import {
  DEVICE_WIDTHS,
  EDITOR_SOURCE,
  fitScale,
  PREVIEW_PATHS,
  readPreviewMessage,
  type EditorMessage,
  type PreviewDevice,
  type PreviewPath,
  type PreviewScale,
  type PreviewTarget,
} from "../../../lib/site/preview";
import type { SiteContent } from "../../../lib/site/types";
import { useElementWidth } from "../../../lib/useElementWidth";

/** Literal class names (Tailwind only generates what it finds written out). The frame keeps its real width;
 *  `scale` shrinks it around its top centre and the height grows by 1/scale so the scaled frame still fills the column. */
const WIDTH: Record<PreviewDevice, string> = { mobile: "w-[390px]", tablet: "w-[768px]", desktop: "w-[1280px]" };
const SCALE: Record<PreviewScale, string> = {
  1: "scale-100 h-full",
  0.75: "scale-75 h-[133.3333%]",
  0.625: "scale-[0.625] h-[160%]",
  0.5: "scale-50 h-[200%]",
  0.4: "scale-40 h-[250%]",
  0.35: "scale-35 h-[285.7143%]",
};
const PAGE_NAMES: Record<PreviewPath, string> = { "/": "Accueil", "/services": "Tarifs", "/barbers": "Barbers", "/gallery": "Galerie" };

interface PreviewPaneProps {
  draft: SiteContent;
  /** where the chosen block lives in the site (previewTarget) */
  target: PreviewTarget;
  /** false while the pane is hidden behind the form tab or the structure list: focusing waits until it shows */
  visible: boolean;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  /** narrow layout: no device switch, the frame takes the pane's width */
  fill: boolean;
  /** a section was clicked in the preview */
  onSelect: (block: BlockId) => void;
}

/** The live preview (spec §6.6): the real site in a frame at /?preview=1, fed the draft by postMessage */
export function PreviewPane({ draft, target, visible, device, onDeviceChange, fill, onSelect }: PreviewPaneProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const available = useElementWidth(box);
  /** bumped by every "ready" from the frame (first load, or a reload that lost the draft); 0 until the frame listens */
  const [session, setSession] = useState(0);
  const ready = session > 0;
  /** the page the frame reports, kept only when it is one of PREVIEW_PATHS (never used for navigation) */
  const [path, setPath] = useState<PreviewPath | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const send = useCallback((message: EditorMessage) => {
    frame.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const msg = readPreviewMessage(e, window.location.origin);
      if (!msg) return;
      if (msg.type === "select") onSelectRef.current(msg.block);
      else {
        // the frame's own location is data: only a known page is kept
        setPath(PREVIEW_PATHS.find((p) => p === msg.path) ?? null);
        // a (re)loaded frame starts from the published content: a new session makes the effects below resend the draft and the target
        if (msg.type === "ready") setSession((n) => n + 1);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // the draft, on every change
  useEffect(() => {
    if (session > 0) send({ from: EDITOR_SOURCE, type: "draft", content: draft });
  }, [session, draft, send]);

  // the chosen block's page, then its section; only while the pane shows (a hidden frame cannot scroll)
  useEffect(() => {
    if (session === 0 || !visible) return;
    if (path !== target.path) send({ from: EDITOR_SOURCE, type: "navigate", path: target.path });
    send({ from: EDITOR_SOURCE, type: "focus", section: target.section, edge: target.edge });
    // `path` is read but not a dependency on purpose: the frame reporting its new location must not trigger a second focus
  }, [session, visible, target.path, target.section, target.edge, send]);

  const scale = fill ? 1 : fitScale(DEVICE_WIDTHS[device], available);
  const frameClass = fill ? "inset-0 size-full" : `top-0 left-1/2 -translate-x-1/2 origin-top ${WIDTH[device]} ${SCALE[scale]}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2">
        <p className="min-w-0 text-sm text-muted">
          <span className="sr-only">Page affichée : </span>
          {path ? PAGE_NAMES[path] : "Accueil"}
          {!fill && scale < 1 && <span className="ml-2 font-mono text-xs text-subtle">réduit à {Math.round(scale * 100)} %</span>}
        </p>
        {!fill && (
          <Segmented
            id="site-preview-device"
            label="Largeur de l'aperçu"
            value={device}
            onChange={onDeviceChange}
            iconOnly
            options={[
              { value: "mobile", label: "Mobile, 390 px", icon: <DeviceMobile size={18} aria-hidden /> },
              { value: "tablet", label: "Tablette, 768 px", icon: <DeviceTablet size={18} aria-hidden /> },
              { value: "desktop", label: "Bureau, 1280 px", icon: <Desktop size={18} aria-hidden /> },
            ]}
          />
        )}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col bg-surface-2 ${fill ? "" : "p-4"}`}>
        <div ref={box} className="relative min-h-0 flex-1 overflow-hidden">
          <iframe ref={frame} src="/?preview=1" title="Aperçu du site" className={`absolute border-0 bg-bg ring-1 ring-line ${frameClass}`} />
          {!ready && (
            <div className="absolute inset-0 flex flex-col gap-3 bg-surface-2 p-4" role="status">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-64 w-full" />
              <span className="text-sm text-muted">Chargement de l'aperçu…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
