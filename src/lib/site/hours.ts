import type { DayHours, SiteContent, Weekday } from "./types.ts";

export type OpeningKind = "summary" | "open" | "closed";

export interface OpeningStatus {
  /** "summary": no hours published, the owner's sentence is shown as is and claims nothing about right now */
  kind: OpeningKind;
  label: string;
}

const WEEKDAY = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const DAY_LABEL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Open or closed at `now` (the visitor's device clock), from the salon's published hours */
export function openingStatus(hours: SiteContent["hours"], now: Date): OpeningStatus {
  if (!hours.detailed) return { kind: "summary", label: hours.summary };
  const byDay = new Map(hours.days.map((d): [Weekday, DayHours] => [d.day, d]));
  const today = byDay.get(now.getDay() as Weekday);
  const current = now.getHours() * 60 + now.getMinutes();
  if (today?.open && current >= minutes(today.start) && current < minutes(today.end)) {
    return { kind: "open", label: `Ouvert · ferme à ${today.end}` };
  }
  if (today?.open && current < minutes(today.start)) return { kind: "closed", label: `Fermé · ouvre à ${today.start}` };
  for (let i = 1; i <= 7; i++) {
    const day = ((now.getDay() + i) % 7) as Weekday;
    const next = byDay.get(day);
    if (next?.open) {
      const when = i === 1 ? "demain" : i === 7 ? `${WEEKDAY[day]} prochain` : WEEKDAY[day];
      return { kind: "closed", label: `Fermé · ouvre ${when} à ${next.start}` };
    }
  }
  return { kind: "closed", label: "Fermé" };
}

export interface WeekRow {
  day: Weekday;
  label: string;
  open: boolean;
  /** "09:00 – 19:00" or "Fermé" */
  value: string;
}

/** The week from Monday, as the footer lists it */
export function weekRows(hours: SiteContent["hours"]): WeekRow[] {
  return ([1, 2, 3, 4, 5, 6, 0] as const).map((day) => {
    const d = hours.days.find((x) => x.day === day);
    const open = Boolean(d?.open);
    return { day, label: DAY_LABEL[day] ?? "", open, value: open && d ? `${d.start} – ${d.end}` : "Fermé" };
  });
}
