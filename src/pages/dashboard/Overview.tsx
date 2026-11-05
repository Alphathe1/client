import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bank,
  CalendarCheck,
  Coins,
  HandCoins,
  Receipt,
  Scissors,
  Star,
  UserPlus,
  XCircle,
} from "@phosphor-icons/react";
import CountUp from "../../components/reactbits/CountUp";
import SpotlightCard from "../../components/reactbits/SpotlightCard";
import {
  Avatar,
  Card,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "../../components/ui/Display";
import { useAuth } from "../../context/AuthContext";
import { useToken } from "../../context/ThemeContext";
import { useFetch } from "../../lib/useFetch";
import { formatDateTime, formatPrice } from "../../lib/format";
import type { Stats } from "../../lib/types";

const RANGES = [
  { id: "day", label: "Aujourd'hui" },
  { id: "week", label: "7 jours" },
  { id: "month", label: "30 jours" },
] as const;

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
      <p className="text-muted">{label}</p>
      <p className="font-semibold text-text tabular-nums">
        {money ? formatPrice(payload[0]!.value) : payload[0]!.value}
      </p>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  money,
  decimals = 0,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  money?: boolean;
  decimals?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <SpotlightCard className="h-full border-0">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent"
              aria-hidden
            >
              {icon}
            </span>
            {label}
          </div>
          <p className="mt-3 font-display text-4xl text-text sm:text-5xl font-medium">
            <CountUp
              key={value}
              to={value}
              decimals={decimals}
              suffix={money ? " DA" : ""}
              duration={1}
            />
          </p>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function StaffOverview() {
  const { user } = useAuth();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("week");
  const { data, loading, error, reload } = useFetch<Stats>(
    `/dashboard/stats?range=${range}`,
  );
  const isBarber = user?.role === "barber";
  const BLUE = useToken("--accent");
  const GRID = useToken("--line");
  const AXIS = useToken("--muted");
  const SURFACE = useToken("--surface");

  return (
    <>
      <PageHeader
        title={isBarber ? "Mes statistiques" : "Tableau de bord"}
        subtitle={
          isBarber
            ? "Votre activité et vos performances."
            : "Vue d'ensemble de l'activité du salon."
        }
        actions={
          <div
            role="tablist"
            aria-label="Période"
            className="flex rounded-xl border border-line bg-surface p-1"
          >
            {RANGES.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={range === r.id}
                onClick={() => setRange(r.id)}
                className={`relative min-h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors ${range === r.id ? "text-onaccent" : "text-muted hover:text-text"}`}
              >
                {range === r.id && (
                  <motion.span
                    layoutId="range-pill"
                    className="absolute inset-0 rounded-lg bg-gold"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-3">
            {!isBarber && (
              <Kpi
                icon={<Coins size={18} />}
                label="Chiffre d'affaires"
                value={data.revenue}
                money
              />
            )}
            <Kpi
              icon={<HandCoins size={18} />}
              label={isBarber ? "Mes gains" : "Commissions barbers"}
              value={data.commission}
              money
              delay={0.02}
            />
            {!isBarber && (
              <Kpi
                icon={<Bank size={18} />}
                label="Part salon"
                value={data.shopRevenue}
                money
                delay={0.03}
              />
            )}
            <Kpi
              icon={<CalendarCheck size={18} />}
              label="Rendez-vous"
              value={data.appointmentsCount}
              delay={0.04}
            />
            <Kpi
              icon={<Scissors size={18} />}
              label="Coiffures réalisées"
              value={data.prestationsCount}
              delay={0.08}
            />
            {!isBarber && (
              <Kpi
                icon={<Receipt size={18} />}
                label="Panier moyen"
                value={Math.round(data.averageTicket)}
                money
                delay={0.12}
              />
            )}
            {!isBarber && (
              <Kpi
                icon={<UserPlus size={18} />}
                label="Nouveaux clients"
                value={data.newClients}
                delay={0.16}
              />
            )}
            <Kpi
              icon={<XCircle size={18} />}
              label="Annulés / absents"
              value={data.cancelledCount}
              delay={0.2}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="font-semibold">{isBarber ? "Mes gains" : "Chiffre d'affaires"}</h2>
              <p className="text-sm text-muted">
                {range === "day" ? "Par heure" : "Par jour"} · en DA
              </p>
              <div
                className="mt-4 h-72"
                role="img"
                aria-label={isBarber ? `Gains totaux : ${formatPrice(data.commission)}` : `Chiffre d'affaires total : ${formatPrice(data.revenue)}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.series}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={GRID}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke={AXIS}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={32}
                      tickMargin={12}
                      padding={{ left: 16, right: 8 }}
                    />
                    <YAxis
                      stroke={AXIS}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickMargin={8}
                    />
                    <Tooltip
                      content={<ChartTooltip money />}
                      cursor={{ stroke: AXIS, strokeDasharray: "3 3" }}
                    />
                    <Area
                      type="monotone"
                      dataKey={isBarber ? "commission" : "revenue"}
                      stroke={BLUE}
                      strokeWidth={2}
                      fill="url(#rev)"
                      activeDot={{
                        r: 5,
                        stroke: SURFACE,
                        strokeWidth: 2,
                        fill: BLUE,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">Services les plus demandés</h2>
              <p className="text-sm text-muted">Nombre de coiffures</p>
              {data.topServices.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">
                  Pas encore de données sur cette période.
                </p>
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topServices}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                      barCategoryGap={14}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={AXIS}
                        tick={{ fontSize: 12, width: 150 }}
                        tickLine={false}
                        axisLine={false}
                        width={150}
                        tickMargin={8}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: GRID, fillOpacity: 0.35 }}
                      />
                      <Bar
                        dataKey="count"
                        fill={BLUE}
                        radius={[0, 4, 4, 0]}
                        label={{ position: "right", fill: AXIS, fontSize: 12 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {!isBarber && (
              <Card>
                <h2 className="mb-4 font-semibold">Performance des barbers</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted uppercase">
                        <th className="pb-2 font-semibold">Barber</th>
                        <th className="pb-2 text-right font-semibold">
                          Prestations
                        </th>
                        <th className="pb-2 text-right font-semibold">CA</th>
                        <th className="pb-2 text-right font-semibold">
                          Commission
                        </th>
                        <th className="pb-2 text-right font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.barberPerformance.map((b, i) => {
                        const max = Math.max(
                          1,
                          ...data.barberPerformance.map((x) => x.revenue),
                        );
                        return (
                          <tr
                            key={b._id}
                            className="border-b border-line/60 last:border-0"
                          >
                            <td className="py-3">
                              <span className="flex items-center gap-4">
                                <Avatar
                                  name={b.username}
                                  src={b.avatarUrl}
                                  size="sm"
                                />
                                <span className="min-w-0">
                                  <span className="block font-semibold">
                                    {b.username}
                                  </span>
                                  <span className="mt-1 block h-1 w-28 overflow-hidden rounded-full bg-line">
                                    <motion.span
                                      className="block h-full rounded-full bg-gold"
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${(b.revenue / max) * 100}%`,
                                      }}
                                      transition={{
                                        delay: 0.1 + i * 0.05,
                                        duration: 0.6,
                                        ease: [0.23, 1, 0.32, 1],
                                      }}
                                    />
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {b.prestations}
                            </td>
                            <td className="py-3 text-right font-semibold tabular-nums">
                              {formatPrice(b.revenue)}
                            </td>
                            <td className="py-3 text-right tabular-nums text-accent">
                              {formatPrice(b.commission)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {b.rating ? (
                                <span className="inline-flex items-center gap-1">
                                  <Star
                                    size={14}
                                    weight="fill"
                                    className="text-accent"
                                    aria-hidden
                                  />
                                  {b.rating}
                                </span>
                              ) : (
                                <span className="text-subtle">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card className={isBarber ? "lg:col-span-2" : ""}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Prochains rendez-vous</h2>
                <Link
                  to="/dashboard/planning"
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Planning
                </Link>
              </div>
              {data.upcoming.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  Aucun rendez-vous à venir.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {data.upcoming.map((a) => (
                    <li key={a._id} className="flex items-center gap-4 py-3">
                      <Avatar
                        name={a.client.username}
                        src={a.client.avatarUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {a.client.username} ·{" "}
                          <span className="font-normal text-muted">
                            {a.service.name}
                          </span>
                        </span>
                        <span className="block text-xs text-muted">
                          {formatDateTime(a.start)}{" "}
                          {!isBarber && `· ${a.barber.username}`}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
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
