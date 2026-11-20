import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Images, Plus, Trash } from "@phosphor-icons/react";
import { CUT_TYPES } from "../../components/PrestationForm";
import { Button } from "../../components/ui/Button";
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { PhotoPicker } from "../../components/ui/PhotoPicker";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, qs } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Barber, PortfolioItem } from "../../lib/types";

export default function Portfolio() {
  const { user } = useAuth();
  const toast = useToast();
  const isBarber = user?.role === "barber";
  const barbers = useFetch<Barber[]>(isBarber ? null : "/users/barbers");
  const [barber, setBarber] = useState(isBarber ? user!._id : "");
  const [cutType, setCutType] = useState("");
  const { data, loading, error, reload } = useFetch<{ items: PortfolioItem[]; cutTypes: string[] }>(`/portfolio${qs({ barber, cutType })}`);

  const table = useTable(data?.items, {
    searchText: (p) => `${p.title ?? ""} ${p.cutType} ${p.description ?? ""} ${typeof p.barber === "object" ? p.barber.username : ""}`,
    sorts: [
      { id: "new", label: "Plus récentes", cmp: (a, b) => b.createdAt.localeCompare(a.createdAt) },
      { id: "old", label: "Plus anciennes", cmp: (a, b) => a.createdAt.localeCompare(b.createdAt) },
      { id: "type", label: "Type de coupe", cmp: (a, b) => a.cutType.localeCompare(b.cutType, "fr") },
    ],
    defaultSort: "new",
    resetKey: `${barber}|${cutType}`,
    pageSize: 8,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", cutType: CUT_TYPES[0]!, description: "", barber: "" });
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!images.length) {
      toast("Ajoutez au moins une photo", "error");
      return;
    }
    setBusy(true);
    try {
      // one portfolio entry per photo
      await Promise.all(
        images.map((imageUrl) =>
          api.post("/portfolio", {
            imageUrl,
            cutType: form.cutType,
            ...(form.title ? { title: form.title } : {}),
            ...(form.description ? { description: form.description } : {}),
            ...(!isBarber ? { barber: form.barber } : {}),
          }),
        ),
      );
      toast(images.length > 1 ? `${images.length} photos ajoutées` : "Photo ajoutée");
      setOpen(false);
      setImages([]);
      setForm((f) => ({ ...f, title: "", description: "" }));
      reload();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/portfolio/${id}`);
      toast("Photo supprimée");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Portfolio"
        subtitle={isBarber ? "Votre galerie, affichée sur votre profil public." : "Galeries des barbers."}
        actions={
          <Button variant="primary" icon={<Plus size={18} weight="bold" aria-hidden />} onClick={() => setOpen(true)}>
            Ajouter des photos
          </Button>
        }
      />
      <div className="mb-6 flex flex-col gap-6 sm:flex-row">
        {!isBarber && (
          <div className="sm:w-56">
            <Select label="Barber" value={barber} onChange={(e) => setBarber(e.target.value)}>
              <option value="">Tous</option>
              {barbers.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.username}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="sm:w-56">
          <Select label="Type de coupe" value={cutType} onChange={(e) => setCutType(e.target.value)}>
            <option value="">Tous</option>
            {(data?.cutTypes.length ? data.cutTypes : CUT_TYPES).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      </div>
      <TableToolbar table={table} placeholder="Titre, type, barber…" />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      )}
      {data && data.items.length > 0 && table.total === 0 && <EmptyState icon={<Images size={28} />} title="Aucun résultat" />}
      {data?.items.length === 0 && <EmptyState icon={<Images size={28} />} title="Galerie vide" text="Ajoutez vos plus belles réalisations." />}
      <motion.ul layout className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence>
          {table.rows.map((p) => (
            <motion.li key={p._id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group relative overflow-hidden rounded-lg border border-line bg-surface">
              <img src={p.imageUrl} alt={p.title ?? p.cutType} className="aspect-square w-full object-cover" loading="lazy" />
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.title ?? p.cutType}</p>
                  {typeof p.barber === "object" && !isBarber && <p className="text-xs text-muted">{p.barber.username}</p>}
                </div>
                <Badge tone="outline">{p.cutType}</Badge>
              </div>
              <button
                onClick={() => remove(p._id)}
                type="button"
                className="absolute top-2 right-2 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-100 transition-opacity hover:bg-danger pointer-coarse:size-11 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
                aria-label={`Supprimer ${p.title ?? p.cutType}`}
              >
                <Trash size={18} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      <Pagination table={table} />

      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter au portfolio" size="lg">
        <form onSubmit={submit} className="flex flex-col gap-6">
          <PhotoPicker label="Photos" value={images} onChange={setImages} max={8} />
          {!isBarber && (
            <Select label="Barber" value={form.barber} onChange={(e) => setForm((f) => ({ ...f, barber: e.target.value }))} required>
              <option value="">Choisir…</option>
              {barbers.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.username}
                </option>
              ))}
            </Select>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <Select label="Type de coupe" value={form.cutType} onChange={(e) => setForm((f) => ({ ...f, cutType: e.target.value }))} required>
              {CUT_TYPES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Input label="Titre" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={80} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} />
          <div className="flex justify-end">
            <Button type="submit" variant="brand" loading={busy}>
              Publier
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
