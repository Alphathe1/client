import { Link } from "react-router-dom";
import { LinkButton } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Display";
import { useFetch } from "../../lib/useFetch";
import { formatDuration, formatPrice } from "../../lib/format";
import type { Service } from "../../lib/types";

/** Page header: plain left-aligned condensed title and one line of context */
export function PageHero({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
        <h1 className="text-7xl leading-[0.88] font-extrabold uppercase sm:text-8xl lg:text-9xl">{title}</h1>
        <p className="mt-6 max-w-lg text-lg text-muted">{text}</p>
      </div>
    </section>
  );
}

/** One line of the price board: name, dotted leader, price. The whole row books that service. */
export function PriceRow({ service: s }: { service: Service }) {
  return (
    <Link to={`/book?service=${s._id}`} className="group block py-6 transition-colors hover:bg-surface-2 sm:px-4" aria-label={`Réserver ${s.name}, ${formatPrice(s.price)}, ${formatDuration(s.duration)}`}>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl leading-none font-bold uppercase sm:text-4xl">{s.name}</span>
        <span aria-hidden className="mb-1 flex-1 self-end border-b-2 border-dotted border-text/30" />
        <span className="font-display text-3xl leading-none font-bold whitespace-nowrap tabular-nums sm:text-4xl">{formatPrice(s.price)}</span>
      </div>
      <p className="mt-3 flex items-baseline justify-between gap-6 text-muted">
        <span className="max-w-xl">{s.description}</span>
        <span className="shrink-0 text-sm whitespace-nowrap">{formatDuration(s.duration)}</span>
      </p>
    </Link>
  );
}

export default function Services() {
  const { data, loading, error, reload } = useFetch<Service[]>("/services");
  const categories = [...new Set(data?.map((s) => s.category) ?? [])];

  return (
    <>
      <PageHero title="Les tarifs" text="Des prix fixes, réglés au salon. La durée indiquée est entièrement réservée pour vous." />
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && (
          <div className="flex flex-col gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-20">
          {categories.map((cat) => (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="text-2xl font-bold text-muted uppercase">
                {cat}
              </h2>
              <ul className="mt-4 border-t border-text">
                {data!
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <li key={s._id} className="border-b border-line">
                      <PriceRow service={s} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
        {data && data.length > 0 && (
          <div className="mt-20">
            <LinkButton to="/book" variant="pole" size="lg">
              Réserver un rendez-vous
            </LinkButton>
          </div>
        )}
      </div>
    </>
  );
}
