import { DAYS } from "../lib/format";
import type { WorkingHours } from "../lib/types";

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const timeInput = "min-h-10 rounded-lg border border-line bg-surface-2 px-2 text-sm text-text tabular-nums outline-none focus:border-accent disabled:opacity-40";

/** One range per day; unchecked = closed */
export function HoursEditor({ value, onChange }: { value: WorkingHours[]; onChange: (v: WorkingHours[]) => void }) {
  const get = (day: number) => value.find((h) => h.day === day);
  const update = (day: number, patch: Partial<WorkingHours> | null) => {
    const rest = value.filter((h) => h.day !== day);
    if (patch === null) return onChange(rest);
    const current = get(day) ?? { day, start: "09:00", end: "19:00" };
    onChange([...rest, { ...current, ...patch }].sort((a, b) => a.day - b.day));
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Horaires de travail</legend>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {ORDER.map((d) => {
          const h = get(d);
          return (
            <li key={d} className="flex flex-wrap items-center gap-4 px-3 py-2">
              <label className="flex min-h-10 w-32 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={!!h} onChange={(e) => update(d, e.target.checked ? {} : null)} className="size-5 accent-gold" />
                {DAYS[d]}
              </label>
              <input type="time" aria-label={`${DAYS[d]} début`} className={timeInput} value={h?.start ?? "09:00"} disabled={!h} onChange={(e) => update(d, { start: e.target.value })} />
              <span className="text-muted" aria-hidden>
                →
              </span>
              <input type="time" aria-label={`${DAYS[d]} fin`} className={timeInput} value={h?.end ?? "19:00"} disabled={!h} onChange={(e) => update(d, { end: e.target.value })} />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
