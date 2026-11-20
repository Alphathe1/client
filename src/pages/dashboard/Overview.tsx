import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bank, CalendarCheck, Coins, HandCoins, Receipt, Scissors, Star, UserPlus, XCircle } from "@phosphor-icons/react";
import CountUp from "../../components/reactbits/CountUp";
import { LinkButton } from "../../components/ui/Button";
import { Segmented } from "../../components/ui/Segmented";
import { Avatar, Card, ErrorState, PageHeader, Skeleton, StatusBadge } from "../../components/ui/Display";
import { useAuth } from "../../context/AuthContext";
import { useToken } from "../../context/ThemeContext";
import { qs } from "../../lib/api";
import { chairList, dayBounds, type ChairState } from "../../lib/chair";
import { EASE_SWIFT } from "../../lib/motion";
import { useFetch } from "../../lib/useFetch";
import { formatDateTime, formatPrice, formatTime, toDateKey } from "../../lib/format";
import type { Appointment, Stats } from "../../lib/types";

const RANGES = [
  { id: "day", label: "Aujourd'hui" },
  { id: "week", label: "7 jours" },
  { id: "month", label: "30 jours" },
] as const;

/** Axis amounts stay short: « 12 k », « 1,2 M » */
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const money = (n: number) => formatPrice(Math.round(n));

function ChartTooltip({ active, payload, label, money: isMoney }: { active?: boolean; payload?: { value: number }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]!.value;
  return (
    <div className="rounded-md border border-line bg-surface-2 px-3 py-2 text-sm shadow-pop">
      <p className="font-mono text-xs text-muted">{label}</p>
      <p className="font-mono font-medium text-text">{isMoney ? formatPrice(value) : value}</p>
    </div>
  );
}

interface KpiItem {
  key: string;
  icon: ReactNode;
  label: string;
  value: number;
  money?: boolean;
}

/** One figure of the period: the label, then the value in the data voice (Geist Mono) */
function Kpi({ icon, label, value, money: isMoney }: Omit<KpiItem, "key">) {
  return (
    <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
      <dt className="flex items-center gap-2 text-sm text-muted">
        <span className="text-subtle" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="font-mono text-xl font-medium text-text sm:text-2xl">
        <CountUp key={value} to={value} duration={1} {...(isMoney ? { format: money } : {})} />
      </dd>
    </div>
  );
}

/** "En cours" is not an appointment status: it is computed from the clock (lib/chair) */
function ChairBadge({ state }: { state: ChairState }) {
  if (state !== "in-progress") return <StatusBadge status={state} />;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xs border border-info/40 bg-info/12 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-info">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      En cours
    </span>
  );
}

/** Today's chair: who is being served and who comes next. Always today, whatever the period above. */
function TodayChair({ isBarber, next }: { isBarber: boolean; next: Appointment | undefined }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // "en cours" follows the clock without reloading anything
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dayKey = toDateKey(now);
  const { from, to } = useMemo(() => dayBounds(now), [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, loading, error, reload } = useFetch<Appointment[]>(`/appointments${qs({ from: from.toISOString(), to: to.toISOString(), status: "pending,confirmed" })}`);
  const list = data ? chairList(data, now) : [];
  const shown = list.slice(0, 8);
  const later = next && Date.parse(next.start) >= to.getTime() ? next : undefined;

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-text">Au fauteuil aujourd'hui</h2>
        {data && (
          <p className="text-sm text-muted">
            <span className="font-mono text-text">{list.length}</span> rendez-vous
          </p>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {data && list.length === 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-dashed border-line-strong p-5">
          <p className="text-sm font-medium text-text">Plus personne au fauteuil aujourd'hui.</p>
          {later && (
            <p className="text-sm text-muted">
              Prochain rendez-vous : <span className="font-mono text-text">{formatDateTime(later.start)}</span> · {later.client.username}
            </p>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {shown.map(({ a, state }) => (
            <li key={a._id} className="flex items-center gap-3 py-3">
              <span className="w-12 shrink-0 font-mono text-sm text-text">{formatTime(a.start)}</span>
              <Avatar name={a.client.username} src={a.client.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{a.client.username}</span>
                <span className="block truncate text-xs text-muted">
                  {a.service.name}
                  {!isBarber && ` · ${a.barber.username}`}
                </span>
              </span>
              <ChairBadge state={state} />
            </li>
          ))}
        </ul>
      )}
      {list.length > shown.length && (
        <p className="mt-3 text-sm text-muted">
          Et <span className="font-mono">{list.length - shown.length}</span> autres dans le planning.
        </p>
      )}

      {data && (
        <div className="mt-auto pt-4">
          <LinkButton to="/dashboard/planning" variant="secondary" size="sm">
            Ouvrir le planning
          </LinkButton>
        </div>
      )}
    </Card>
  );
}

function StaffOverview() {
  const { user } = useAuth();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("week");
  const { data, loading, error, reload } = useFetch<Stats>(`/dashboard/stats?range=${range}`);
  const isBarber = user?.role === "barber";
  // charts are drawn in the neutral ink: brass stays for the main action, the selection and the focus
  const SERIES = useToken("--primary");
  const GRID = useToken("--line");
  const AXIS = useToken("--subtle");
  const SURFACE = useToken("--surface");

  const candidates: (KpiItem | false)[] = data
    ? [
        !isBarber && { key: "revenue", icon: <Coins size={18} />, label: "Chiffre d'affaires", value: data.revenue, money: true },
        { key: "commission", icon: <HandCoins size={18} />, label: isBarber ? "Mes gains" : "Commissions barbers", value: data.commission, money: true },
        !isBarber && { key: "shop", icon: <Bank size={18} />, label: "Part salon", value: data.shopRevenue, money: true },
        { key: "appointments", icon: <CalendarCheck size={18} />, label: "Rendez-vous", value: data.appointmentsCount },
        { key: "prestations", icon: <Scissors size={18} />, label: "Coiffures réalisées", value: data.prestationsCount },
        !isBarber && { key: "ticket", icon: <Receipt size={18} />, label: "Panier moyen", value: Math.round(data.averageTicket), money: true },
        !isBarber && { key: "clients", icon: <UserPlus size={18} />, label: "Nouveaux clients", value: data.newClients },
        { key: "cancelled", icon: <XCircle size={18} />, label: "Annulés / absents", value: data.cancelledCount },
      ]
    : [];
  const kpis = candidates.filter((k): k is KpiItem => k !== false);
  const maxRevenue = Math.max(1, ...(data?.barberPerformance.map((b) => b.revenue) ?? []));

  return (
    <>
      <PageHeader
        title={isBarber ? "Mes statistiques" : "Vue d'ensemble"}
        subtitle={isBarber ? "Votre activité et vos performances." : "L'activité du salon sur la période choisie."}
        actions={<Segmented id="overview-range" label="Période" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r.id, label: r.label }))} />}
      />

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: isBarber ? 4 : 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <dl aria-label="Indicateurs de la période" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
            {kpis.map(({ key, ...k }) => (
              <Kpi key={key} {...k} />
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h2 className="text-base font-semibold text-text">{isBarber ? "Mes gains" : "Chiffre d'affaires"}</h2>
              <p className="text-sm text-muted">{range === "day" ? "Par heure" : "Par jour"} · en DA</p>
              <div className="mt-4 h-72 font-mono" role="img" aria-label={isBarber ? `Gains totaux : ${formatPrice(data.commission)}` : `Chiffre d'affaires total : ${formatPrice(data.revenue)}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart accessibilityLayer={false} data={data.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overview-revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke={GRID} tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={32} tickMargin={12} padding={{ left: 16, right: 8 }} />
                    <YAxis stroke={GRID} tick={{ fontSize: 12, fill: AXIS }} tickFormatter={(v: number) => compact.format(v)} tickLine={false} axisLine={false} width={48} tickMargin={8} />
                    <Tooltip content={<ChartTooltip money />} cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} />
                    <Area type="monotone" dataKey={isBarber ? "commission" : "revenue"} stroke={SERIES} strokeWidth={2} fill="url(#overview-revenue)" activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2, fill: SERIES }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <TodayChair isBarber={isBarber} next={data.upcoming[0]} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {!isBarber && (
              <Card className="xl:col-span-2">
                <h2 className="mb-4 text-base font-semibold text-text">Performance des barbers</h2>
                {data.barberPerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">Aucun barber actif.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-xs text-muted">
                          <th scope="col" className="pb-2 font-medium">
                            Barber
                          </th>
                          <th scope="col" className="pb-2 text-right font-medium">
                            Prestations
                          </th>
                          <th scope="col" className="pb-2 text-right font-medium">
                            CA
                          </th>
                          <th scope="col" className="pb-2 text-right font-medium">
                            Commission
                          </th>
                          <th scope="col" className="pb-2 text-right font-medium">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.barberPerformance.map((b, i) => (
                          <tr key={b._id} className="border-b border-line last:border-0">
                            <td className="py-3">
                              <span className="flex items-center gap-3">
                                <Avatar name={b.username} src={b.avatarUrl} size="sm" />
                                <span className="min-w-0">
                                  <span className="block font-medium text-text">{b.username}</span>
                                  <span aria-hidden className="mt-1 block h-1 w-28 overflow-hidden rounded-full bg-surface-3">
                                    <motion.span
                                      className="block h-full rounded-full bg-primary"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                                      transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: EASE_SWIFT }}
                                    />
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono">{b.prestations}</td>
                            <td className="py-3 text-right font-mono text-text">{formatPrice(b.revenue)}</td>
                            <td className="py-3 text-right font-mono text-muted">{formatPrice(b.commission)}</td>
                            <td className="py-3 text-right font-mono">
                              {b.rating ? (
                                <span className="inline-flex items-center gap-1">
                                  <Star size={14} weight="fill" className="text-muted" aria-hidden />
                                  {b.rating}
                                  <span className="sr-only"> sur 5</span>
                                </span>
                              ) : (
                                <span className="text-subtle">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            <Card className={isBarber ? "xl:col-span-3" : ""}>
              <h2 className="text-base font-semibold text-text">Services les plus demandés</h2>
              <p className="text-sm text-muted">Nombre de coiffures</p>
              {data.topServices.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">Pas encore de données sur cette période.</p>
              ) : (
                <div className="mt-4 h-72 [&_.recharts-label]:font-mono" role="img" aria-label={`Services les plus demandés : ${data.topServices.map((s) => `${s.name}, ${s.count}`).join(" ; ")}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart accessibilityLayer={false} data={data.topServices} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap={14}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" stroke={GRID} tick={{ fontSize: 12, width: 150, fill: AXIS }} tickLine={false} axisLine={false} width={150} tickMargin={8} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: GRID, fillOpacity: 0.35 }} />
                      <Bar dataKey="count" fill={SERIES} radius={[0, 4, 4, 0]} label={{ position: "right", fill: AXIS, fontSize: 12 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export default function Overview() {
  const { user } = useAuth();
  // clients have no dashboard: their account lives in the avatar menu
  return user?.role === "client" ? <Navigate to="/dashboard/appointments" replace /> : <StaffOverview />;
}
