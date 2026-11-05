import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Badge, Card } from "./ui/Display";
import { Button } from "./ui/Button";
import { formatDate, formatPrice } from "../lib/format";
import type { Prestation } from "../lib/types";

/** One recorded service with before/after toggle */
export function PrestationCard({ p, showClient = true, onEdit, onDelete }: { p: Prestation; showClient?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const photos = { before: p.beforePhotos, after: p.afterPhotos };
  const [view, setView] = useState<"before" | "after">(p.afterPhotos.length ? "after" : "before");
  const current = photos[view];
  const hasPhotos = p.beforePhotos.length + p.afterPhotos.length > 0;

  return (
    <Card className="flex flex-col gap-6">
      {hasPhotos && (
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
            {current[0] ? (
              <motion.img key={view + current[0].slice(-20)} src={current[0]} alt={`Photo ${view === "before" ? "avant" : "après"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="size-full object-cover" />
            ) : (
              <p className="flex size-full items-center justify-center text-sm text-muted">Pas de photo {view === "before" ? "avant" : "après"}</p>
            )}
            <div role="tablist" className="absolute bottom-2 left-2 flex rounded-lg bg-black/70 p-0.5">
              {(["before", "after"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-8 cursor-pointer rounded-md px-3 text-xs font-semibold ${view === v ? "bg-gold text-onaccent" : "text-white"}`}>
                  {v === "before" ? "Avant" : "Après"}
                </button>
              ))}
            </div>
          </div>
          {current.length > 1 && (
            <div className="mt-2 flex gap-2">
              {current.slice(1).map((src, i) => (
                <img key={i} src={src} alt="" className="size-12 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">{p.service.name}</p>
          <p className="text-sm text-muted">
            {formatDate(p.date)} · par {p.barber.username}
          </p>
          {showClient && p.client && (
            <Link to={`/dashboard/clients/${p.client._id}`} className="text-sm font-semibold text-accent hover:text-accent">
              {p.client.username}
            </Link>
          )}
        </div>
        <span className="font-display text-2xl text-accent tabular-nums lining-nums font-medium">{formatPrice(p.price)}</span>
      </div>
      {p.cutType && (
        <span>
          <Badge tone="outline">{p.cutType}</Badge>
        </span>
      )}
      {p.notes && <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">{p.notes}</p>}
      {(onEdit || onDelete) && (
        <div className="mt-auto flex gap-2 border-t border-line pt-3">
          {onEdit && (
            <Button size="sm" variant="secondary" icon={<PencilSimple size={16} aria-hidden />} onClick={onEdit}>
              Modifier
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" icon={<Trash size={16} aria-hidden />} onClick={onDelete} aria-label="Supprimer la prestation">
              Supprimer
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
