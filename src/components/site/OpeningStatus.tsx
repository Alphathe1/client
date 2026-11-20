import { useEffect, useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { useSite } from "../../context/SiteContext";
import { openingStatus } from "../../lib/site/hours";

/** Live open / closed state from the published hours. Without detailed hours it shows the owner's sentence ("Ouvert 7j/7")
 *  next to a neutral clock: a green dot would claim the salon is open right now, which nobody computed. */
export function OpeningStatus() {
  const { hours } = useSite().content;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!hours.detailed) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [hours.detailed]);
  const status = openingStatus(hours, now);
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm">
      {status.kind === "summary" ? (
        <Clock size={16} className="shrink-0 text-muted" aria-hidden />
      ) : (
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${status.kind === "open" ? "bg-success" : "bg-danger"}`} />
      )}
      <span className="min-w-0 font-medium text-text wrap-anywhere">{status.label}</span>
    </p>
  );
}
