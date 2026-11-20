import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CaretRight, UserPlus, Users } from "@phosphor-icons/react";
import { Button } from "../../components/ui/Button";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { Input, Textarea } from "../../components/ui/Field";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatPrice } from "../../lib/format";
import type { ClientSummary } from "../../lib/types";

function NewClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ username: "", email: "", phone: "", preferences: "" });
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/clients", { username: form.username, email: form.email, ...(form.phone ? { phone: form.phone } : {}), ...(form.preferences ? { preferences: form.preferences } : {}) });
      toast("Fiche client créée");
      setForm({ username: "", email: "", phone: "", preferences: "" });
      onCreated();
    } catch (err) {
      const a = err as ApiError;
      setError({ ...(a.field ? { field: a.field } : {}), message: a.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle fiche client" description="Pour un client sans compte en ligne (walk-in, téléphone).">
      <form onSubmit={submit} className="flex flex-col gap-6">
        {error && !error.field && <p role="alert" className="text-sm text-danger">{error.message}</p>}
        <Input label="Nom" value={form.username} onChange={set("username")} required minLength={3} error={error?.field === "username" ? error.message : undefined} />
        <Input label="Email" type="email" value={form.email} onChange={set("email")} required error={error?.field === "email" ? error.message : undefined} />
        <Input label="Téléphone" type="tel" value={form.phone} onChange={set("phone")} />
        <Textarea label="Préférences" value={form.preferences} onChange={set("preferences")} placeholder="Ex. dégradé bas, pas de gel" />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={busy}>
            Créer la fiche
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Clients() {
  const [creating, setCreating] = useState(false);
  const [visited, setVisited] = useState("");
  const { data, loading, error, reload } = useFetch<ClientSummary[]>("/clients");
  const table = useTable(data, {
    searchText: (c) => `${c.username} ${c.email} ${c.phone ?? ""}`,
    sorts: [
      { id: "name", label: "Nom : A → Z", cmp: (a, b) => a.username.localeCompare(b.username, "fr") },
      { id: "visits", label: "Visites : plus nombreuses", cmp: (a, b) => b.visitCount - a.visitCount },
      { id: "spent", label: "Dépensé : plus élevé", cmp: (a, b) => b.totalSpent - a.totalSpent },
      { id: "recent", label: "Visite : plus récente", cmp: (a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "") },
      { id: "created", label: "Inscription : récente", cmp: (a, b) => b.createdAt.localeCompare(a.createdAt) },
    ],
    defaultSort: "name",
    filter: (c) => (visited === "yes" ? c.visitCount > 0 : visited === "no" ? c.visitCount === 0 : true),
    resetKey: visited,
    pageSize: 10,
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Fiches clients, historique et fidélité."
        actions={
          <Button variant="primary" icon={<UserPlus size={18} aria-hidden />} onClick={() => setCreating(true)}>
            Nouvelle fiche
          </Button>
        }
      />
      <TableToolbar table={table} placeholder="Nom, email ou téléphone…">
        <FilterSelect
          label="Visites"
          value={visited}
          onChange={setVisited}
          options={[
            { value: "", label: "Tous" },
            { value: "yes", label: "Déjà venus" },
            { value: "no", label: "Jamais venus" },
          ]}
        />
      </TableToolbar>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-96" />}
      {data && table.total === 0 && <EmptyState icon={<Users size={28} />} title="Aucun client trouvé" />}
      {data && table.total > 0 && (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          {/* column headings (desktop) */}
          <div aria-hidden className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem_8rem_8rem_1.5rem] gap-6 border-b border-line px-6 py-4 text-xs text-subtle md:grid">
            <span>Client</span>
            <span>Téléphone</span>
            <span className="text-right">Visites</span>
            <span className="text-right">Dépensé</span>
            <span>Dernière visite</span>
            <span />
          </div>
          <ul>
            {table.rows.map((c, i) => (
              <motion.li key={c._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="border-b border-line last:border-b-0">
                <Link
                  to={`/dashboard/clients/${c._id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 px-6 py-5 transition-colors hover:bg-surface-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem_8rem_8rem_1.5rem]"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <Avatar name={c.username} src={c.avatarUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.username}</span>
                      <span className="block truncate text-sm text-muted">{c.email}</span>
                    </span>
                  </span>
                  <CaretRight size={18} className="text-muted transition-transform group-hover:translate-x-1 md:hidden" aria-hidden />
                  <span className="col-span-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted md:contents">
                    <span className="md:block md:truncate">{c.phone ?? "—"}</span>
                    <span className="md:text-right">
                      <span className="font-mono text-text">{c.visitCount}</span>
                      <span className="md:sr-only"> visites</span>
                    </span>
                    <span className="font-mono text-text md:text-right">{formatPrice(c.totalSpent)}</span>
                    <span>{c.lastVisit ? formatDate(c.lastVisit) : "Jamais venu"}</span>
                  </span>
                  <CaretRight size={18} className="hidden text-muted transition-transform group-hover:translate-x-1 md:block" aria-hidden />
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
      <Pagination table={table} />
      <NewClientModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          reload();
        }}
      />
    </>
  );
}
