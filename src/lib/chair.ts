// "Au fauteuil aujourd'hui" on the overview (spec §5.2): derived from the clock and the appointment status only.
import type { Appointment } from "./types";

export type ChairState = "in-progress" | "confirmed" | "pending";

type Slot = Pick<Appointment, "start" | "end" | "status">;

/** Local day containing `now`, as the [from, to) range the appointments API expects */
export function dayBounds(now: Date): { from: Date; to: Date } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from, to };
}

/**
 * Where an appointment stands on the chair list at `now`:
 * - a confirmed appointment whose slot contains `now` is in progress;
 * - a pending one stays pending even during its slot: nobody has confirmed it yet;
 * - once the slot is over, or when it is finished, cancelled or a no-show, it leaves the list (null).
 */
export function chairState(a: Slot, now: Date): ChairState | null {
  if (a.status !== "pending" && a.status !== "confirmed") return null;
  const t = now.getTime();
  if (Date.parse(a.end) <= t) return null;
  if (a.status === "confirmed" && Date.parse(a.start) <= t) return "in-progress";
  return a.status;
}

/** What is still ahead today, in start order (what is in progress started first, so it leads) */
export function chairList<T extends Slot>(items: T[], now: Date): { a: T; state: ChairState }[] {
  const out: { a: T; state: ChairState }[] = [];
  for (const a of items) {
    const state = chairState(a, now);
    if (state) out.push({ a, state });
  }
  return out.sort((x, y) => Date.parse(x.a.start) - Date.parse(y.a.start));
}
