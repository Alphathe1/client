import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { timeAgo } from "../../../lib/format";
import { dirtyLabel } from "../../../lib/site/editor";

interface PublishBarProps {
  /** version of the published content; null while nothing has ever been published */
  publishedAt: string | null;
  dirtyCount: number;
  /** invalid fields in the draft */
  invalidCount: number;
  /** false: the browser does not keep the draft */
  persistent: boolean;
  publishing: boolean;
  /** reloading the published version: both buttons blocked */
  reloading: boolean;
  onCancel: () => void;
  onPublish: () => void;
}

/** Top bar of the editor (spec §4, §6.5): state, changed blocks, "Annuler", "Publier" — the screen's one brass action */
export function PublishBar({ publishedAt, dirtyCount, invalidCount, persistent, publishing, reloading, onCancel, onPublish }: PublishBarProps) {
  // "publié il y a 2 h" stays true while the page is open
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const clean = dirtyCount === 0;
  const busy = publishing || reloading;
  let status: { tone: "success" | "warning"; text: string };
  if (publishing) status = { tone: "warning", text: "Publication en cours…" };
  else if (clean) status = { tone: "success", text: publishedAt ? `À jour · publié ${timeAgo(publishedAt)}` : "À jour · contenu d'origine, rien n'a encore été publié" };
  else status = { tone: "warning", text: `${dirtyLabel(dirtyCount)} · ${persistent ? "brouillon enregistré dans ce navigateur" : "brouillon non enregistré, gardez cette page ouverte"}` };

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-5">
      <span role="status" className="sr-only">
        {publishing ? "Publication en cours" : clean ? "À jour" : dirtyLabel(dirtyCount)}
      </span>
      <p className="flex min-w-0 flex-1 basis-56 items-center gap-2 text-sm">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${status.tone === "success" ? "bg-success" : "bg-warning"}`} />
        <span className={`min-w-0 ${status.tone === "success" ? "text-success" : "text-text"}`}>{status.text}</span>
        {!clean && invalidCount > 0 && (
          <span className="shrink-0 text-danger">
            · {invalidCount} champ{invalidCount > 1 ? "s" : ""} à corriger
          </span>
        )}
      </p>
      <div className="flex shrink-0 items-center gap-4">
        <Button variant="ghost" size="sm" disabled={clean || busy} onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="brand" size="sm" loading={publishing} disabled={clean || reloading} onClick={onPublish}>
          {publishing ? "Publication…" : "Publier"}
        </Button>
      </div>
    </div>
  );
}
