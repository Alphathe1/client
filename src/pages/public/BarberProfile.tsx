import { Link, useParams } from "react-router-dom";
import { CalendarCheck, Images, Scissors, Star } from "@phosphor-icons/react";
import { LinkButton } from "../../components/ui/Button";
import { Avatar, Badge, ErrorState, Skeleton, Stars } from "../../components/ui/Display";
import { GalleryGrid } from "../../components/site/GalleryGrid";
import { SECTION, WRAP } from "../../components/site/styles";
import { useFetch } from "../../lib/useFetch";
import { DAYS, formatDate, initials } from "../../lib/format";
import type { BarberProfile as Profile } from "../../lib/types";

export default function BarberProfile() {
  const { id } = useParams();
  const { data: b, loading, error, reload } = useFetch<Profile>(`/users/barbers/${id}`);

  if (loading)
    return (
      <div className={`${WRAP} py-12`}>
        <div className="flex flex-col gap-8 md:flex-row md:items-end">
          <Skeleton className="aspect-4/5 w-40 sm:w-56" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      </div>
    );

  if (error || !b)
    return (
      <div className={`${WRAP} py-16`}>
        <ErrorState message={error ?? "Barber introuvable"} onRetry={reload} />
        <Link to="/barbers" className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-muted transition-colors duration-100 ease-out hover:text-text">
          Voir tous les barbers
        </Link>
      </div>
    );

  const stats = [
    { icon: Star, label: "Note moyenne", value: b.rating ? b.rating.toFixed(1) : "—" },
    { icon: Scissors, label: "Prestations", value: String(b.prestationCount) },
    { icon: Images, label: "Réalisations", value: String(b.portfolio.length) },
  ];

  return (
    <>
      <section className="border-b border-line">
        <div className={`${WRAP} flex flex-col gap-8 py-12 sm:py-16 md:flex-row md:items-end`}>
          <div className="aspect-4/5 w-40 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2 sm:w-56">
            {b.avatarUrl ? (
              <img src={b.avatarUrl} alt={`Portrait de ${b.username}`} className="size-full object-cover" />
            ) : (
              <span aria-hidden className="flex size-full items-center justify-center text-5xl font-semibold text-muted">
                {initials(b.username)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-semibold text-text wrap-anywhere sm:text-5xl">{b.username}</h1>
            {b.specialties?.length ? (
              <ul aria-label="Spécialités" className="mt-4 flex flex-wrap gap-2">
                {b.specialties.map((s) => (
                  <li key={s}>
                    <Badge tone="outline">{s}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            {b.bio && <p className="mt-4 max-w-xl text-muted wrap-anywhere">{b.bio}</p>}
          </div>
          <LinkButton to={`/book?barber=${b._id}`} variant="brand" size="lg" icon={<CalendarCheck size={20} aria-hidden />} className="self-start md:self-end">
            Réserver avec {b.username}
          </LinkButton>
        </div>
        <dl className={`${WRAP} grid grid-cols-3 gap-3 pb-12`}>
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 rounded-lg border border-line bg-surface p-4 sm:p-5">
              <dt className="flex items-center gap-2 text-xs text-muted sm:text-sm">
                <s.icon size={16} className="shrink-0" aria-hidden />
                {s.label}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-medium text-text sm:text-3xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={`${WRAP} ${SECTION} grid grid-cols-1 gap-12 lg:grid-cols-3`}>
        <section className="min-w-0 lg:col-span-2" aria-labelledby="portfolio-title">
          <h2 id="portfolio-title" className="mb-6 text-2xl font-semibold text-text">
            Portfolio
          </h2>
          <GalleryGrid items={b.portfolio} />
        </section>
        <aside className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="hours-title">
            <h2 id="hours-title" className="mb-4 text-2xl font-semibold text-text">
              Horaires
            </h2>
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const slots = b.workingHours?.filter((w) => w.day === d) ?? [];
                return (
                  <li key={d} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <span className="text-muted">{DAYS[d]}</span>
                    <span className={slots.length ? "font-mono text-text" : "text-subtle"}>
                      {slots.length ? slots.map((x) => `${x.start} – ${x.end}`).join(", ") : "Fermé"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="reviews-title">
            <h2 id="reviews-title" className="mb-4 text-2xl font-semibold text-text">
              Avis clients <span className="font-mono text-base font-normal text-muted">({b.reviewCount})</span>
            </h2>
            {b.reviews.length === 0 ? (
              <p className="text-sm text-muted">Aucun avis pour le moment.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {b.reviews.map((r) => (
                  <li key={r._id} className="rounded-md border border-line bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text">
                        <Avatar name={r.client.username} src={r.client.avatarUrl} size="sm" />
                        <span className="truncate">{r.client.username}</span>
                      </span>
                      <Stars value={r.rating} size={14} />
                    </div>
                    {r.comment && <p className="mt-3 text-sm text-muted wrap-anywhere">{r.comment}</p>}
                    <p className="mt-2 font-mono text-xs text-subtle">{formatDate(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
