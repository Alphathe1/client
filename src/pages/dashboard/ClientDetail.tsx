import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, Envelope, FloppyDisk, Images, Notebook, Phone, Plus } from "@phosphor-icons/react";
import CountUp from "../../components/reactbits/CountUp";
import { PrestationCard } from "../../components/PrestationCard";
import { PrestationForm } from "../../components/PrestationForm";
import { Button } from "../../components/ui/Button";
import { Avatar, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "../../components/ui/Display";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Textarea } from "../../components/ui/Field";
import { Segmented } from "../../components/ui/Segmented";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatDateTime, formatPrice } from "../../lib/format";
import type { Appointment, ClientFile, Prestation } from "../../lib/types";

const TABS = [
  { id: "prestations", label: "Prestations" },
  { id: "appointments", label: "Rendez-vous" },
  { id: "cuts", label: "Photos" },
] as const;

function PagedVisits({ items }: { items: Prestation[] }) {
  const table = useTable(items, {
    searchText: (p) => `${p.service.name} ${p.barber.username} ${p.cutType ?? ""} ${p.notes ?? ""}`,
    sorts: [
      { id: "new", label: "Plus récentes", cmp: (a, b) => b.date.localeCompare(a.date) },
      { id: "old", label: "Plus anciennes", cmp: (a, b) => a.date.localeCompare(b.date) },
      { id: "price", label: "Prix : décroissant", cmp: (a, b) => b.price - a.price },
    ],
    defaultSort: "new",
    pageSize: 4,
  });
  return (
    <>
      <TableToolbar table={table} placeholder="Service, barber, note…" />
      {table.total === 0 && <EmptyState icon={<Notebook size={28} />} title="Aucun résultat" />}
      <div className="grid gap-6 md:grid-cols-2">
        {table.rows.map((p) => (
          <PrestationCard key={p._id} p={p} showClient={false} />
        ))}
      </div>
      <Pagination table={table} />
    </>
  );
}

function PagedAppointments({ items }: { items: Appointment[] }) {
  const [status, setStatus] = useState("");
  const table = useTable(items, {
    searchText: (a) => `${a.service.name} ${a.barber.username}`,
    sorts: [
      { id: "new", label: "Plus récents", cmp: (a, b) => b.start.localeCompare(a.start) },
      { id: "old", label: "Plus anciens", cmp: (a, b) => a.start.localeCompare(b.start) },
      { id: "price", label: "Prix : décroissant", cmp: (a, b) => b.price - a.price },
    ],
    defaultSort: "new",
    filter: (a) => !status || a.status === status,
    resetKey: status,
    pageSize: 8,
  });
  return (
    <>
      <TableToolbar table={table} placeholder="Service ou barber…">
        <FilterSelect label="Statut" value={status} onChange={setStatus} options={[{ value: "", label: "Tous" }, { value: "pending", label: "En attente" }, { value: "confirmed", label: "Confirmé" }, { value: "completed", label: "Terminé" }, { value: "cancelled", label: "Annulé" }, { value: "no-show", label: "Absent" }]} />
      </TableToolbar>
      {table.total === 0 && <EmptyState icon={<CalendarCheck size={28} />} title="Aucun résultat" />}
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {table.rows.map((a) => (
          <li key={a._id} className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <span className="w-44 font-mono text-text">{formatDateTime(a.start)}</span>
            <span className="flex-1 text-muted">
              {a.service.name} · {a.barber.username}
            </span>
            <span className="font-mono">{formatPrice(a.price)}</span>
            <StatusBadge status={a.status} />
          </li>
        ))}
      </ul>
      <Pagination table={table} />
    </>
  );
}

function PagedCuts({ photos }: { photos: { src: string; p: Prestation }[] }) {
  const table = useTable(photos, {
    searchText: ({ p }) => `${p.service.name} ${p.cutType ?? ""}`,
    sorts: [
      { id: "new", label: "Plus récentes", cmp: (a, b) => b.p.date.localeCompare(a.p.date) },
      { id: "old", label: "Plus anciennes", cmp: (a, b) => a.p.date.localeCompare(b.p.date) },
    ],
    defaultSort: "new",
    pageSize: 6,
  });
  return (
    <>
      <TableToolbar table={table} placeholder="Type de coupe…" />
      {table.total === 0 && <EmptyState icon={<Images size={28} />} title="Aucun résultat" />}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {table.rows.map(({ src, p }, i) => (
          <figure key={`${p._id}-${i}`} className="overflow-hidden rounded-md border border-line">
            <img src={src} alt={`${p.service.name} du ${formatDate(p.date)}`} className="aspect-square w-full object-cover" loading="lazy" />
            <figcaption className="bg-surface px-3 py-2 text-xs text-muted">
              {formatDate(p.date)} · {p.cutType ?? p.service.name}
            </figcaption>
          </figure>
        ))}
      </div>
      <Pagination table={table} />
    </>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<ClientFile>(`/clients/${id}`);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("prestations");
  const [notes, setNotes] = useState({ staffNotes: "", preferences: "" });
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (data) setNotes({ staffNotes: data.client.staffNotes ?? "", preferences: data.client.preferences ?? "" });
  }, [data]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/clients/${id}/notes`, notes);
      toast("Notes enregistrées");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Skeleton className="h-96" />;
  if (error || !data) return <ErrorState message={error ?? "Client introuvable"} onRetry={reload} />;
  const { client, stats, appointments, prestations } = data;
  const photos = prestations.flatMap((p) => p.afterPhotos.map((src) => ({ src, p })));

  return (
    <>
      <Link to="/dashboard/clients" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={18} aria-hidden /> Tous les clients
      </Link>

      <div className="flex flex-col gap-8 md:flex-row md:items-center">
        <Avatar name={client.username} src={client.avatarUrl} size="xl" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-text">{client.username}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-text hover:underline">
              <Envelope size={16} aria-hidden /> {client.email}
            </a>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-text hover:underline">
                <Phone size={16} aria-hidden /> {client.phone}
              </a>
            )}
            <span>Client depuis le {formatDate(client.createdAt)}</span>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={18} weight="bold" aria-hidden />} onClick={() => setAdding(true)}>
          Ajouter une prestation
        </Button>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Visites", value: stats.visitCount },
          { label: "Total dépensé", value: stats.totalSpent, suffix: " DA" },
          { label: "Annulations", value: stats.cancelled },
          { label: "Absences", value: stats.noShows },
        ].map((s) => (
          <Card key={s.label}>
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-2 font-mono text-xl font-medium text-text sm:text-2xl">
              <CountUp to={s.value} suffix={s.suffix ?? ""} />
            </dd>
          </Card>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-5">
            <Segmented id="client-tab" label="Historique affiché" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.id, label: t.label }))} />
          </div>

          {tab === "prestations" &&
            (prestations.length ? (
              <PagedVisits items={prestations} />
            ) : (
              <EmptyState icon={<Notebook size={28} />} title="Aucune prestation enregistrée" />
            ))}

          {tab === "appointments" &&
            (appointments.length ? (
              <PagedAppointments items={appointments} />
            ) : (
              <EmptyState icon={<CalendarCheck size={28} />} title="Aucun rendez-vous" />
            ))}

          {tab === "cuts" &&
            (photos.length ? (
              <PagedCuts photos={photos} />
            ) : (
              <EmptyState icon={<Images size={28} />} title="Pas encore de photos" text="Ajoutez des photos « après » lors de l'enregistrement d'une prestation." />
            ))}
        </div>

        <Card className="flex h-fit flex-col gap-6">
          <h2 className="font-semibold">Notes & préférences</h2>
          <Textarea label="Préférences du client" rows={3} value={notes.preferences} onChange={(e) => setNotes((n) => ({ ...n, preferences: e.target.value }))} />
          <Textarea label="Notes internes" hint="Visibles uniquement par l'équipe." rows={5} value={notes.staffNotes} onChange={(e) => setNotes((n) => ({ ...n, staffNotes: e.target.value }))} />
          <Button variant="secondary" loading={saving} onClick={saveNotes} icon={<FloppyDisk size={18} aria-hidden />}>
            Enregistrer
          </Button>
        </Card>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Nouvelle prestation" description={client.username} size="lg">
        <PrestationForm
          clientId={client._id}
          onDone={() => {
            setAdding(false);
            reload();
          }}
        />
      </Modal>
    </>
  );
}
