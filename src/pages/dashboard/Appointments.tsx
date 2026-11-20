import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarBlank, CalendarPlus, Clock } from "@phosphor-icons/react";
import { AppointmentActions } from "../../components/AppointmentActions";
import { LinkButton } from "../../components/ui/Button";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from "../../components/ui/Display";
import { Select } from "../../components/ui/Field";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Segmented } from "../../components/ui/Segmented";
import { EASE_SWIFT } from "../../lib/motion";
import { useAuth } from "../../context/AuthContext";
import { qs } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatPrice, formatTime } from "../../lib/format";
import type { Appointment, Barber } from "../../lib/types";

const TABS = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Passés" },
  { id: "cancelled", label: "Annulés" },
] as const;

export function AppointmentCard({ a, onChange, index = 0 }: { a: Appointment; onChange: () => void; index?: number }) {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const d = new Date(a.start);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3, ease: EASE_SWIFT }}
      className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex w-full items-center gap-6 sm:w-auto">
        <div className="flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-line bg-surface-2">
          <span className="text-xs font-medium text-muted">{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
          <span className="font-mono text-2xl leading-none font-medium text-text">{d.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1 sm:w-64">
          <p className="truncate font-semibold">{a.service.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Clock size={14} aria-hidden />
            {d.toLocaleDateString("fr-FR", { weekday: "long" })} · <span className="font-mono">{formatTime(a.start)} – {formatTime(a.end)}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-4">
        <Avatar name={isClient ? a.barber.username : a.client.username} src={isClient ? a.barber.avatarUrl : a.client.avatarUrl} size="sm" />
        <div className="min-w-0 text-sm">
          {isClient ? (
            <p>
              avec <span className="font-semibold">{a.barber.username}</span>
            </p>
          ) : (
            <>
              <Link to={`/dashboard/clients/${a.client._id}`} className="font-semibold underline-offset-4 hover:underline">
                {a.client.username}
              </Link>
              <p className="text-muted">
                {user?.role !== "barber" && `${a.barber.username} · `}
                {a.client.phone ?? a.client.email}
              </p>
            </>
          )}
          {a.notes && <p className="mt-0.5 truncate text-xs text-subtle">“{a.notes}”</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:justify-end">
        <span className="font-mono text-lg font-medium text-text">{formatPrice(a.price)}</span>
        <StatusBadge status={a.status} />
        <AppointmentActions appt={a} onChange={onChange} />
      </div>
    </motion.li>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "manager";
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("upcoming");
  const [barber, setBarber] = useState("");
  const barbers = useFetch<Barber[]>(isAdmin ? "/users/barbers" : null);
  const now = useMemo(() => new Date().toISOString(), []);

  const query =
    tab === "upcoming"
      ? qs({ from: now, status: "pending,confirmed", barber })
      : tab === "past"
        ? qs({ to: now, status: "completed,no-show,confirmed,pending", barber })
        : qs({ status: "cancelled", barber });
  const { data, loading, error, reload } = useFetch<Appointment[]>(`/appointments${query}`);
  const [status, setStatus] = useState("");
  const table = useTable(data, {
    searchText: (a) => `${a.client.username} ${a.client.email} ${a.client.phone ?? ""} ${a.barber.username} ${a.service.name} ${a.notes ?? ""}`,
    sorts: [
      { id: "date-asc", label: "Date : plus proche", cmp: (a, b) => a.start.localeCompare(b.start) },
      { id: "date-desc", label: "Date : plus lointaine", cmp: (a, b) => b.start.localeCompare(a.start) },
      { id: "price-desc", label: "Prix : décroissant", cmp: (a, b) => b.price - a.price },
      { id: "price-asc", label: "Prix : croissant", cmp: (a, b) => a.price - b.price },
    ],
    defaultSort: tab === "upcoming" ? "date-asc" : "date-desc",
    filter: (a) => !status || a.status === status,
    resetKey: `${tab}|${barber}|${status}`,
    pageSize: 6,
  });

  return (
    <>
      <PageHeader
        title="Rendez-vous"
        subtitle={user?.role === "client" ? "Consultez, modifiez ou annulez vos réservations." : "Toutes les réservations, en temps réel."}
        actions={
          <LinkButton to="/book" variant="primary" icon={<CalendarPlus size={18} aria-hidden />}>
            Nouveau
          </LinkButton>
        }
      />
      <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Segmented
          id="appointments-tab"
          label="Rendez-vous affichés"
          value={tab}
          onChange={(id) => {
            setTab(id);
            table.setSort(id === "upcoming" ? "date-asc" : "date-desc");
          }}
          options={TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
        {isAdmin && (
          <div className="sm:w-56">
            <Select label="Barber" value={barber} onChange={(e) => setBarber(e.target.value)}>
              <option value="">Tous les barbers</option>
              {barbers.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.username}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <TableToolbar table={table} placeholder="Client, service, barber…">
        <FilterSelect
          label="Statut"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "Tous" },
            { value: "pending", label: "En attente" },
            { value: "confirmed", label: "Confirmé" },
            { value: "completed", label: "Terminé" },
            { value: "cancelled", label: "Annulé" },
            { value: "no-show", label: "Absent" },
          ]}
        />
      </TableToolbar>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      {data && table.total === 0 && (
        <EmptyState
          icon={<CalendarBlank size={28} />}
          title={tab === "upcoming" ? "Aucun rendez-vous à venir" : "Rien à afficher"}
          action={tab === "upcoming" ? <LinkButton to="/book">Réserver un créneau</LinkButton> : undefined}
        />
      )}
      <ul className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {table.rows.map((a, i) => (
            <AppointmentCard key={a._id} a={a} onChange={reload} index={i} />
          ))}
        </AnimatePresence>
      </ul>
      <Pagination table={table} />
    </>
  );
}
