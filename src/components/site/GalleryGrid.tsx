import { useState } from "react";
import { Images } from "@phosphor-icons/react";
import { EmptyState } from "../ui/Display";
import { Modal } from "../ui/Modal";
import type { PortfolioItem } from "../../lib/types";

const chip = (active: boolean) =>
  `min-h-10 cursor-pointer rounded-sm border px-4 text-sm font-medium transition-colors duration-100 ease-out pointer-coarse:min-h-11 ${
    active ? "border-brand bg-brand/8 text-text" : "border-line-strong text-muted hover:border-text hover:text-text"
  }`;

const byBarber = (item: PortfolioItem) => (typeof item.barber === "object" ? item.barber.username : null);

/** Portfolio grid with cut-type filters (toggle buttons) and a zoom dialog */
export function GalleryGrid({ items, showBarber = false }: { items: PortfolioItem[]; showBarber?: boolean }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState<PortfolioItem | null>(null);
  const types = [...new Set(items.map((i) => i.cutType))];
  const shown = filter ? items.filter((i) => i.cutType === filter) : items;

  if (!items.length) return <EmptyState icon={<Images size={24} />} title="Galerie bientôt disponible" text="Les réalisations seront publiées ici." />;

  return (
    <>
      {types.length > 1 && (
        <div role="group" aria-label="Filtrer par type de coupe" className="mb-6 flex flex-wrap gap-2">
          <button type="button" aria-pressed={filter === null} onClick={() => setFilter(null)} className={chip(filter === null)}>
            Tous
          </button>
          {types.map((t) => (
            <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)} className={chip(filter === t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const label = p.title ?? p.cutType;
          const barber = showBarber ? byBarber(p) : null;
          return (
            <li key={p._id} className="min-w-0">
              <button
                type="button"
                onClick={() => setZoom(p)}
                aria-label={`Agrandir : ${label}`}
                className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border border-line bg-surface-2"
              >
                <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none" />
                <span className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-left text-sm font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {label}
                  {barber && <span className="block text-xs font-normal text-white/80">par {barber}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Modal open={zoom !== null} onClose={() => setZoom(null)} title={zoom ? (zoom.title ?? zoom.cutType) : ""} size="lg">
        {zoom && (
          <figure>
            <img src={zoom.imageUrl} alt={zoom.title ?? zoom.cutType} className="max-h-[70dvh] w-full rounded-md object-contain" />
            <figcaption className="mt-3 text-sm text-muted">
              {zoom.cutType}
              {showBarber && byBarber(zoom) ? ` · par ${byBarber(zoom)}` : ""}
              {zoom.description && <span className="mt-1 block text-text">{zoom.description}</span>}
            </figcaption>
          </figure>
        )}
      </Modal>
    </>
  );
}
