import { Link } from "react-router-dom";
import { Star } from "@phosphor-icons/react";
import { initials } from "../../lib/format";
import type { Barber } from "../../lib/types";

/** Portrait card linking to the barber's page. No stock photo stands in for a barber: without a portrait, the initials do. */
export function BarberCard({ barber, headingLevel = "h3" }: { barber: Barber; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <Link to={`/barbers/${barber._id}`} className="group block h-full rounded-lg border border-line bg-surface transition-colors duration-100 ease-out hover:border-line-strong">
      <div className="aspect-4/5 overflow-hidden rounded-t-lg bg-surface-2">
        {barber.avatarUrl ? (
          <img src={barber.avatarUrl} alt="" loading="lazy" className="size-full object-cover grayscale transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <span aria-hidden className="flex size-full items-center justify-center text-5xl font-semibold text-muted">
            {initials(barber.username)}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <Heading className="text-base font-semibold text-text wrap-anywhere">{barber.username}</Heading>
          {barber.specialties?.length ? <p className="mt-1 text-sm text-muted wrap-anywhere">{barber.specialties.join(", ")}</p> : null}
        </div>
        {barber.rating ? (
          <p className="flex shrink-0 items-center gap-1 text-sm text-text">
            <Star size={14} weight="fill" className="text-brand" aria-hidden />
            <span className="sr-only">Note </span>
            <span className="font-mono">{barber.rating.toFixed(1)}</span>
          </p>
        ) : (
          <p className="shrink-0 text-sm text-muted">Nouveau</p>
        )}
      </div>
    </Link>
  );
}
