import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, Images, Scissors, Star } from "@phosphor-icons/react";
import { LinkButton } from "../../components/ui/Button";
import { Avatar, EmptyState, ErrorState, Skeleton, Stars } from "../../components/ui/Display";
import { useFetch } from "../../lib/useFetch";
import { DAYS, formatDate } from "../../lib/format";
import type { BarberProfile as Profile, PortfolioItem } from "../../lib/types";

export function GalleryGrid({ items, showBarber = false }: { items: PortfolioItem[]; showBarber?: boolean }) {
  const [filter, setFilter] = useState<string>("Tous");
  const [zoom, setZoom] = useState<PortfolioItem | null>(null);
  const types = ["Tous", ...new Set(items.map((i) => i.cutType))];
  const shown = filter === "Tous" ? items : items.filter((i) => i.cutType === filter);

  if (!items.length) return <EmptyState icon={<Images size={28} />} title="Galerie bientôt disponible" text="Les réalisations seront publiées ici." />;

  return (
    <>
      <div role="tablist" aria-label="Filtrer par type de coupe" className="mb-6 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={filter === t}
            onClick={() => setFilter(t)}
            className={`relative min-h-10 cursor-pointer rounded-sm px-4 text-sm font-semibold transition-colors ${filter === t ? "text-onaccent" : "border border-line text-muted hover:text-text"}`}
          >
            {filter === t && <motion.span layoutId={`chip-${showBarber}`} className="absolute inset-0 rounded-sm bg-gold" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>
      <motion.ul layout className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {shown.map((p) => (
            <motion.li key={p._id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
              <button onClick={() => setZoom(p)} className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-line">
                <img src={p.imageUrl} alt={p.title ?? p.cutType} className="size-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 bg-black/85 p-3 text-left text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {p.title ?? p.cutType}
                  {showBarber && typeof p.barber === "object" && <span className="block text-xs font-normal text-accent">par {p.barber.username}</span>}
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
            role="dialog"
            aria-label={zoom.title ?? zoom.cutType}
          >
            <motion.figure initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="max-h-full max-w-3xl">
              <img src={zoom.imageUrl} alt={zoom.title ?? zoom.cutType} className="max-h-[80dvh] rounded-2xl object-contain" />
              <figcaption className="mt-3 text-center text-sm text-muted">
                <span className="font-semibold text-text">{zoom.title ?? zoom.cutType}</span> · {zoom.cutType}
                {zoom.description && <span className="block">{zoom.description}</span>}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function BarberProfile() {
  const { id } = useParams();
  const { data: b, loading, error, reload } = useFetch<Profile>(`/users/barbers/${id}`);

  if (loading)
    return (
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <Skeleton className="h-64" />
      </div>
    );
  if (error || !b)
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-20">
        <ErrorState message={error ?? "Barber introuvable"} onRetry={reload} />
      </div>
    );

  return (
    <>
      <section className="relative overflow-hidden border-b border-line pt-10 pb-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-end">
          <Avatar name={b.username} src={b.avatarUrl} size="xl" />
          <div className="flex-1">
            <h1 className="font-display text-7xl leading-[0.88] font-extrabold uppercase sm:text-8xl">{b.username}</h1>
            {b.bio && <p className="mt-4 max-w-xl text-muted">{b.bio}</p>}
            {b.specialties?.length ? <p className="mt-3 font-semibold">{b.specialties.join(", ")}</p> : null}
          </div>
          <LinkButton to={`/book?barber=${b._id}`} variant="pole" size="lg" icon={<CalendarCheck size={20} weight="bold" aria-hidden />}>
            Réserver avec {b.username}
          </LinkButton>
        </div>
        <dl className="mx-auto mt-12 grid max-w-7xl grid-cols-3 gap-3 px-4 sm:px-6">
          {[
            { icon: Star, label: "Note moyenne", value: b.rating ?? 0, decimals: 1 },
            { icon: Scissors, label: "Prestations", value: b.prestationCount },
            { icon: Images, label: "Réalisations", value: b.portfolio.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <dt className="flex items-center gap-2 text-xs text-muted sm:text-sm">
                <s.icon size={16} className="text-accent" aria-hidden /> {s.label}
              </dt>
              <dd className="mt-1 font-display text-4xl font-medium">
                {s.label === "Note moyenne" && !b.rating ? "—" : s.value.toFixed(s.decimals ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="portfolio-title">
          <h2 id="portfolio-title" className="mb-6 font-display text-4xl font-medium">
            Portfolio
          </h2>
          <GalleryGrid items={b.portfolio} />
        </section>
        <aside className="flex flex-col gap-10">
          <section aria-labelledby="hours-title">
            <h2 id="hours-title" className="mb-4 font-display text-3xl font-medium">
              Horaires
            </h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const h = b.workingHours?.filter((w) => w.day === d) ?? [];
                return (
                  <li key={d} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted">{DAYS[d]}</span>
                    <span className={h.length ? "text-text tabular-nums" : "text-subtle"}>{h.length ? h.map((x) => `${x.start} – ${x.end}`).join(", ") : "Fermé"}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="reviews-title">
            <h2 id="reviews-title" className="mb-4 font-display text-3xl font-medium">
              Avis clients <span className="text-muted">({b.reviewCount})</span>
            </h2>
            {b.reviews.length === 0 && <p className="text-sm text-muted">Aucun avis pour le moment.</p>}
            <ul className="flex flex-col gap-3">
              {b.reviews.map((r) => (
                  <li key={r._id} className="rounded-sm border border-line bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Avatar name={r.client.username} src={r.client.avatarUrl} size="sm" />
                        {r.client.username}
                      </span>
                      <Stars value={r.rating} size={14} />
                    </div>
                    {r.comment && <p className="mt-3 text-sm text-muted">{r.comment}</p>}
                    <p className="mt-2 text-xs text-subtle">{formatDate(r.createdAt)}</p>
                  </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
