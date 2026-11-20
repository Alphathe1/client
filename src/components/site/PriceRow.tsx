import { Link } from "react-router-dom";
import { formatDuration, formatPrice } from "../../lib/format";
import type { Service } from "../../lib/types";

/** One line of the price board, left-aligned: name, dotted leader, price; description and duration below. The whole row books the service. */
export function PriceRow({ service: s }: { service: Service }) {
  return (
    <Link
      to={`/book?service=${s._id}`}
      aria-label={`Réserver ${s.name}, ${formatPrice(s.price)}, ${formatDuration(s.duration)}`}
      className="block rounded-md px-3 py-4 transition-colors duration-100 ease-out hover:bg-surface-2 sm:px-4"
    >
      <span className="flex items-baseline gap-3">
        <span className="min-w-0 text-base font-semibold text-text wrap-anywhere sm:text-lg">{s.name}</span>
        <span aria-hidden className="min-w-6 flex-1 border-b-2 border-dotted border-line-strong" />
        <span className="shrink-0 font-mono text-base font-medium text-text sm:text-lg">{formatPrice(s.price)}</span>
      </span>
      <span className="mt-1 flex items-baseline justify-between gap-6 text-sm text-muted">
        <span className="min-w-0 wrap-anywhere">{s.description}</span>
        <span className="shrink-0 font-mono text-subtle">{formatDuration(s.duration)}</span>
      </span>
    </Link>
  );
}
