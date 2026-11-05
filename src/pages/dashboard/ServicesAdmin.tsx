import { useState, type FormEvent } from "react";
import { Clock, PencilSimple, Plus, Scissors, Trash } from "@phosphor-icons/react";
import { Button } from "../../components/ui/Button";
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Input, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDuration, formatPrice } from "../../lib/format";
import type { Service } from "../../lib/types";

const EMPTY = { name: "", description: "", price: "", duration: "30", category: "Coupe", isActive: true };

export default function ServicesAdmin() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Service[]>("/services?all=true");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState("");
  const table = useTable(data, {
    searchText: (s) => `${s.name} ${s.category} ${s.description ?? ""}`,
    sorts: [
      { id: "name", label: "Nom : A → Z", cmp: (a, b) => a.name.localeCompare(b.name, "fr") },
      { id: "price-asc", label: "Prix : croissant", cmp: (a, b) => a.price - b.price },
      { id: "price-desc", label: "Prix : décroissant", cmp: (a, b) => b.price - a.price },
      { id: "duration", label: "Durée : courte", cmp: (a, b) => a.duration - b.duration },
    ],
    defaultSort: "name",
    filter: (s) => (!category || s.category === category) && (visibility === "" || (visibility === "active" ? s.isActive : !s.isActive)),
    resetKey: `${category}|${visibility}`,
    pageSize: 6,
  });
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const open = (s: Service | "new") => {
    setEditing(s);
    setForm(s === "new" ? EMPTY : { name: s.name, description: s.description ?? "", price: String(s.price), duration: String(s.duration), category: s.category, isActive: s.isActive });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { name: form.name, description: form.description, price: Number(form.price), duration: Number(form.duration), category: form.category, isActive: form.isActive };
    try {
      if (editing === "new") await api.post("/services", body);
      else if (editing) await api.patch(`/services/${editing._id}`, body);
      toast(editing === "new" ? "Service créé" : "Service mis à jour");
      setEditing(null);
      reload();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const res = await api.delete<{ archived: boolean }>(`/services/${deleting._id}`);
      toast(res.data.archived ? "Service archivé (il a déjà des réservations)" : "Service supprimé");
      setDeleting(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader
        title="Services & tarifs"
        subtitle="Les prix et durées affichés sur le site et utilisés pour les créneaux."
        actions={
          <Button variant="gold" icon={<Plus size={18} weight="bold" aria-hidden />} onClick={() => open("new")}>
            Nouveau service
          </Button>
        }
      />
      <TableToolbar table={table} placeholder="Nom ou catégorie…">
        <FilterSelect label="Catégorie" value={category} onChange={setCategory} options={[{ value: "", label: "Toutes" }, ...[...new Set(data?.map((s) => s.category))].map((c) => ({ value: c, label: c }))]} />
        <FilterSelect label="Statut" value={visibility} onChange={setVisibility} options={[{ value: "", label: "Tous" }, { value: "active", label: "Visibles" }, { value: "archived", label: "Archivés" }]} />
      </TableToolbar>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-80" />}
      {data && data.length > 0 && table.total === 0 && <EmptyState icon={<Scissors size={28} />} title="Aucun résultat" />}
      {data?.length === 0 && <EmptyState icon={<Scissors size={28} />} title="Aucun service" action={<Button onClick={() => open("new")}>Créer le premier</Button>} />}
      <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {table.rows.map((s) => (
          <li key={s._id} className={`flex flex-col rounded-2xl border border-line bg-surface p-5 ${s.isActive ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold">{s.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge>{s.category}</Badge>
                  {!s.isActive && <Badge tone="gold">Archivé</Badge>}
                </div>
              </div>
              <span className="font-display text-3xl text-accent tabular-nums lining-nums font-medium">{formatPrice(s.price)}</span>
            </div>
            {s.description && <p className="mt-3 flex-1 text-sm text-muted">{s.description}</p>}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Clock size={16} aria-hidden /> {formatDuration(s.duration)}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => open(s)} aria-label={`Modifier ${s.name}`}>
                  <PencilSimple size={18} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(s)} aria-label={`Supprimer ${s.name}`}>
                  <Trash size={18} />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination table={table} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouveau service" : "Modifier le service"}>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <Input label="Nom" value={form.name} onChange={set("name")} required minLength={2} />
          <div className="grid grid-cols-2 gap-6">
            <Input label="Prix (DA)" type="number" inputMode="numeric" min={0} step={50} value={form.price} onChange={set("price")} required />
            <Input label="Durée (min)" type="number" inputMode="numeric" min={5} step={5} value={form.duration} onChange={set("duration")} required />
          </div>
          <Input label="Catégorie" value={form.category} onChange={set("category")} list="service-cats" />
          <datalist id="service-cats">
            {[...new Set(data?.map((s) => s.category))].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Textarea label="Description" value={form.description} onChange={set("description")} maxLength={500} />
          <label className="flex min-h-11 cursor-pointer items-center gap-4 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="size-5 accent-gold" />
            Visible et réservable sur le site
          </label>
          <div className="flex justify-end">
            <Button type="submit" variant="gold" loading={busy}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={`Supprimer « ${deleting?.name} » ?`} description="S'il a déjà été réservé, il sera archivé pour conserver l'historique.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={remove}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </>
  );
}
