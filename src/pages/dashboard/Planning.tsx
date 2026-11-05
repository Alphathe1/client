import { useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { FilterSelect } from "../../components/ui/DataTools";
import { Modal } from "../../components/ui/Modal";
import { AppointmentActions } from "../../components/AppointmentActions";
import { useAuth } from "../../context/AuthContext";
import { qs } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatPrice, formatTime, STATUS_LABEL } from "../../lib/format";
import type { Appointment, Barber } from "../../lib/types";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_PX = 72;
const HOURS = END_HOUR - START_HOUR;

type View = "day" | "week" | "month";
const VIEW_LABEL: Record<View, string> = { day: "Jour", week: "Semaine", month: "Mois" };

const tone: Record<Appointment["status"], string> = {
  pending: "border-warning/50 bg-warning/15",
  confirmed: "border-accent/60 bg-accent/20",
  completed: "border-success/50 bg-success/15",
  cancelled: "border-danger/40 bg-danger/10 opacity-60",
  "no-show": "border-line bg-surface-3 opacity-60",
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Monday-first week start */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function computeRange(view: View, anchor: Date): { from: Date; to: Date } {
  if (view === "day") return { from: anchor, to: addDays(anchor, 1) };
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: gridStart, to: addDays(startOfWeek(last), 7) };
}

function rangeLabel(view: View, anchor: Date): string {
  if (view === "day") return anchor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "month") return anchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const sameMonth = from.getMonth() === to.getMonth();
  return `${from.getDate()}${sameMonth ? "" : ` ${from.toLocaleDateString("fr-FR", { month: "short" })}`} – ${to.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}

/** Side-by-side lanes for overlapping appointments inside one column */
function layoutLanes(items: Appointment[]): { a: Appointment; lane: number; lanes: number }[] {
  const sorted = [...items].sort((x, y) => x.start.localeCompare(y.start));
  const out: { a: Appointment; lane: number; lanes: number }[] = [];
  let cluster: { a: Appointment; lane: number; end: number }[] = [];
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => out.push({ a: c.a, lane: c.lane, lanes }));
    cluster = [];
  };
  let clusterEnd = 0;
  for (const a of sorted) {
    const s = new Date(a.start).getTime();
    const e = new Date(a.end).getTime();
    if (cluster.length && s >= clusterEnd) flush();
    let lane = 0;
    while (cluster.some((c) => c.lane === lane && c.end > s)) lane++;
    cluster.push({ a, lane, end: e });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return out;
}

interface Column {
  key: string;
  title: string;
  sub?: string;
  today?: boolean;
  items: Appointment[];
  /** clicking the header jumps to this day */
  onHeader?: () => void;
}

function TimeGrid({ columns, dayStart, showBarber, onSelect, minColWidth }: { columns: Column[]; dayStart: (c: Column) => Date; showBarber: boolean; onSelect: (a: Appointment) => void; minColWidth: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="flex min-w-[640px]">
        <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-line bg-surface">
          <div className="h-14 border-b border-line" />
          {Array.from({ length: HOURS }).map((_, i) => (
            <div key={i} className="h-18 border-b border-line/50 pt-1 pr-2 text-right text-xs text-subtle tabular-nums">
              {String(START_HOUR + i).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {columns.map((c) => {
          const base = dayStart(c);
          const nowOffset = ((Date.now() - base.getTime()) / 3_600_000 - START_HOUR) * HOUR_PX;
          return (
            <div key={c.key} className={`${minColWidth} flex-1 not-last:border-r not-last:border-line ${c.today ? "bg-accent/3" : ""}`}>
              <div className="flex h-14 flex-col justify-center border-b border-line px-4">
                {c.onHeader ? (
                  <button onClick={c.onHeader} className="cursor-pointer text-left text-sm font-semibold capitalize hover:text-accent">
                    {c.title}
                  </button>
                ) : (
                  <span className="text-sm font-semibold">{c.title}</span>
                )}
                <span className="text-xs text-muted">{c.sub}</span>
              </div>
              <div className="relative">
                {Array.from({ length: HOURS }).map((_, i) => (
                  <div key={i} className="h-18 border-b border-line/50" />
                ))}
                {c.today && nowOffset > 0 && nowOffset < HOURS * HOUR_PX && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-gold" style={{ top: nowOffset }} aria-hidden>
                    <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-gold" />
                  </div>
                )}
                {layoutLanes(c.items).map(({ a, lane, lanes }, i) => {
                  const s = new Date(a.start);
                  const top = (s.getHours() + s.getMinutes() / 60 - START_HOUR) * HOUR_PX + 2;
                  const height = Math.max(28, ((new Date(a.end).getTime() - s.getTime()) / 3_600_000) * HOUR_PX - 4);
                  const width = 100 / lanes;
                  return (
                    <motion.button
                      key={a._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => onSelect(a)}
                      style={{ top, height, left: `calc(${lane * width}% + 4px)`, width: `calc(${width}% - 8px)` }}
                      className={`absolute cursor-pointer overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs transition-[filter] hover:brightness-125 ${tone[a.status]}`}
                      aria-label={`${formatTime(a.start)} ${a.client.username}, ${a.service.name}, ${STATUS_LABEL[a.status]}`}
                    >
                      <span className="block truncate font-semibold text-text">
                        {formatTime(a.start)} · {a.client.username}
                      </span>
                      <span className="block truncate text-muted">{showBarber ? `${a.barber.username} · ` : ""}{a.service.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({ anchor, from, appts, onPickDay, onSelect }: { anchor: Date; from: Date; appts: Appointment[]; onPickDay: (d: Date) => void; onSelect: (a: Appointment) => void }) {
  const weeks = Math.round((computeRange("month", anchor).to.getTime() - from.getTime()) / (7 * 86_400_000));
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(from, i));
  const byDay = new Map<string, Appointment[]>();
  for (const a of appts) {
    const k = startOfDay(new Date(a.start)).toDateString();
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const today = new Date();
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-line text-center text-[11px] tracking-[0.25em] text-muted uppercase">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="py-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const items = (byDay.get(d.toDateString()) ?? []).filter((a) => a.status !== "cancelled").sort((x, y) => x.start.localeCompare(y.start));
            const outside = d.getMonth() !== anchor.getMonth();
            return (
              <div key={d.toISOString()} className={`min-h-32 border-r border-b border-line/60 p-2 nth-[7n]:border-r-0 ${outside ? "bg-bg/50 opacity-50" : ""}`}>
                <button
                  onClick={() => onPickDay(d)}
                  className={`mb-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full text-sm tabular-nums transition-colors ${sameDay(d, today) ? "bg-gold font-semibold text-onaccent" : "hover:bg-surface-2"}`}
                  aria-label={`Voir le ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} (${items.length} rendez-vous)`}
                >
                  {d.getDate()}
                </button>
                <ul className="flex flex-col gap-1">
                  {items.slice(0, 3).map((a) => (
                    <li key={a._id}>
                      <button onClick={() => onSelect(a)} className={`w-full cursor-pointer truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] hover:brightness-125 ${tone[a.status]}`}>
                        {formatTime(a.start)} {a.client.username}
                      </button>
                    </li>
                  ))}
                </ul>
                {items.length > 3 && (
                  <button onClick={() => onPickDay(d)} className="mt-1 cursor-pointer px-1 text-[11px] font-semibold text-accent hover:underline">
                    +{items.length - 3} autres
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Planning() {
  const { user } = useAuth();
  const isBarber = user?.role === "barber";
  const views: View[] = isBarber ? ["day", "week"] : ["day", "week", "month"];
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [barberFilter, setBarberFilter] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);

  const { from, to } = useMemo(() => computeRange(view, anchor), [view, anchor]);
  const appts = useFetch<Appointment[]>(`/appointments${qs({ from: from.toISOString(), to: to.toISOString() })}`);
  const barbers = useFetch<Barber[]>(isBarber ? null : "/users/barbers");

  const shift = (n: number) =>
    setAnchor((d) => {
      if (view === "day") return addDays(d, n);
      if (view === "week") return addDays(d, 7 * n);
      return new Date(d.getFullYear(), d.getMonth() + n, 1);
    });
  const today = startOfDay(new Date());
  const isCurrent = view === "day" ? sameDay(anchor, today) : view === "week" ? sameDay(startOfWeek(anchor), startOfWeek(today)) : anchor.getMonth() === today.getMonth() && anchor.getFullYear() === today.getFullYear();

  const all = appts.data ?? [];
  const scoped = isBarber || !barberFilter ? all : all.filter((a) => a.barber._id === barberFilter);

  const dayColumns: Column[] = isBarber
    ? [{ key: user!._id, title: user!.username, sub: `${all.filter((a) => a.status !== "cancelled").length} rdv`, today: sameDay(anchor, today), items: all }]
    : (barbers.data ?? []).map((b) => {
        const items = all.filter((a) => a.barber._id === b._id);
        return { key: b._id, title: b.username, sub: `${items.filter((a) => a.status !== "cancelled").length} rdv`, today: sameDay(anchor, today), items };
      });

  const weekColumns: Column[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    const items = scoped.filter((a) => sameDay(new Date(a.start), d));
    return {
      key: d.toISOString(),
      title: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      sub: `${items.filter((a) => a.status !== "cancelled").length} rdv`,
      today: sameDay(d, today),
      items,
      onHeader: () => {
        setAnchor(d);
        setView("day");
      },
    };
  });

  const pickDay = (d: Date) => {
    setAnchor(startOfDay(d));
    setView("day");
  };

  return (
    <>
      <PageHeader
        title="Planning"
        subtitle={rangeLabel(view, anchor)}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div role="tablist" aria-label="Affichage" className="flex gap-1 rounded-xl border border-line bg-surface p-1">
              {views.map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`relative min-h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors ${view === v ? "text-onaccent" : "text-muted hover:text-text"}`}
                >
                  {view === v && <motion.span layoutId="planning-view" className="absolute inset-0 rounded-lg bg-gold" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                  <span className="relative">{VIEW_LABEL[v]}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => shift(-1)} aria-label="Période précédente">
                <CaretLeft size={18} />
              </Button>
              <Button variant={isCurrent ? "gold" : "secondary"} size="sm" onClick={() => setAnchor(today)}>
                Aujourd'hui
              </Button>
              <Button variant="secondary" size="sm" onClick={() => shift(1)} aria-label="Période suivante">
                <CaretRight size={18} />
              </Button>
            </div>
          </div>
        }
      />
      {!isBarber && view !== "day" && (
        <div className="mb-8">
          <FilterSelect label="Barber" value={barberFilter} onChange={setBarberFilter} options={[{ value: "", label: "Tous les barbers" }, ...(barbers.data ?? []).map((b) => ({ value: b._id, label: b.username }))]} />
        </div>
      )}
      {appts.error && <ErrorState message={appts.error} onRetry={appts.reload} />}
      {appts.loading && !appts.data ? (
        <Skeleton className="h-[600px]" />
      ) : view === "day" ? (
        dayColumns.length === 0 ? (
          <EmptyState title="Aucun barber actif" />
        ) : (
          <TimeGrid columns={dayColumns} dayStart={() => anchor} showBarber={false} onSelect={setSelected} minColWidth="min-w-44" />
        )
      ) : view === "week" ? (
        <TimeGrid columns={weekColumns} dayStart={(c) => new Date(c.key)} showBarber={!isBarber && !barberFilter} onSelect={setSelected} minColWidth="min-w-36" />
      ) : (
        <MonthGrid anchor={anchor} from={from} appts={scoped} onPickDay={pickDay} onSelect={setSelected} />
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.client.username ?? ""} description={selected ? `${selected.service.name} · ${formatTime(selected.start)} – ${formatTime(selected.end)} · ${formatPrice(selected.price)}` : ""}>
        {selected && (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted">
              {!isBarber && (
                <>
                  Barber : <span className="font-semibold text-text">{selected.barber.username}</span>
                  <br />
                </>
              )}
              Statut : <span className="font-semibold text-text">{STATUS_LABEL[selected.status]}</span>
              {selected.notes && (
                <>
                  <br />
                  Note client : <span className="text-text">{selected.notes}</span>
                </>
              )}
            </p>
            <AppointmentActions
              appt={selected}
              onChange={() => {
                setSelected(null);
                appts.reload();
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
