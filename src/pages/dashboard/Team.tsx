import { useState, type FormEvent } from "react";
import { ArrowCounterClockwise, PencilSimple, Prohibit, UserPlus, UsersThree } from "@phosphor-icons/react";
import { HoursEditor } from "../../components/HoursEditor";
import { Button } from "../../components/ui/Button";
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { ROLE_LABEL } from "../../lib/format";
import type { Role, User, WorkingHours } from "../../lib/types";

const DEFAULT_HOURS: WorkingHours[] = [1, 2, 3, 4, 5, 6].map((day) => ({ day, start: "09:00", end: "19:00" }));

export default function Team() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<User[]>("/users?role=owner,manager,barber");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const table = useTable(data, {
    searchText: (u) => `${u.username} ${u.email} ${u.phone ?? ""} ${u.specialties?.join(" ") ?? ""}`,
    sorts: [
      { id: "name", label: "Nom : A → Z", cmp: (a, b) => a.username.localeCompare(b.username, "fr") },
      { id: "role", label: "Rôle", cmp: (a, b) => a.role.localeCompare(b.role) },
      { id: "new", label: "Plus récents", cmp: (a, b) => b.createdAt.localeCompare(a.createdAt) },
    ],
    defaultSort: "name",
    filter: (u) => (!roleFilter || u.role === roleFilter) && (activeFilter === "" || (activeFilter === "active" ? u.isActive : !u.isActive)),
    resetKey: `${roleFilter}|${activeFilter}`,
    pageSize: 6,
  });
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "", role: "barber" as Role, bio: "", specialties: "" });
  const [hours, setHours] = useState<WorkingHours[]>(DEFAULT_HOURS);
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (u: User | "new") => {
    setFieldError(null);
    setEditing(u);
    if (u === "new") {
      setForm({ username: "", email: "", password: "", phone: "", role: "barber", bio: "", specialties: "" });
      setHours(DEFAULT_HOURS);
    } else {
      setForm({ username: u.username, email: u.email, password: "", phone: u.phone ?? "", role: u.role, bio: u.bio ?? "", specialties: u.specialties?.join(", ") ?? "" });
      setHours(u.workingHours?.length ? u.workingHours : DEFAULT_HOURS);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFieldError(null);
    const body = {
      username: form.username,
      email: form.email,
      role: form.role,
      phone: form.phone,
      bio: form.bio,
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      ...(form.role === "barber" ? { workingHours: hours } : {}),
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (editing === "new") await api.post("/users", body);
      else if (editing) await api.patch(`/users/${editing._id}`, body);
      toast(editing === "new" ? "Membre ajouté à l'équipe" : "Profil mis à jour");
      setEditing(null);
      reload();
    } catch (err) {
      const a = err as ApiError;
      setFieldError({ ...(a.field ? { field: a.field } : {}), message: a.message });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: User) => {
    try {
      if (u.isActive) await api.delete(`/users/${u._id}`);
      else await api.patch(`/users/${u._id}`, { isActive: true });
      toast(u.isActive ? "Compte désactivé" : "Compte réactivé");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (f: string) => (fieldError?.field === f ? fieldError.message : undefined);

  return (
    <>
      <PageHeader
        title="Équipe"
        subtitle="Barbers, managers : comptes, spécialités et horaires."
        actions={
          <Button variant="gold" icon={<UserPlus size={18} aria-hidden />} onClick={() => open("new")}>
            Ajouter un membre
          </Button>
        }
      />
      <TableToolbar table={table} placeholder="Nom, email, spécialité…">
        <FilterSelect label="Rôle" value={roleFilter} onChange={setRoleFilter} options={[{ value: "", label: "Tous" }, { value: "barber", label: "Barbers" }, { value: "manager", label: "Managers" }, { value: "owner", label: "Propriétaires" }]} />
        <FilterSelect label="Statut" value={activeFilter} onChange={setActiveFilter} options={[{ value: "", label: "Tous" }, { value: "active", label: "Actifs" }, { value: "inactive", label: "Désactivés" }]} />
      </TableToolbar>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-80" />}
      {data && data.length > 0 && table.total === 0 && <EmptyState icon={<UsersThree size={28} />} title="Aucun résultat" />}
      {data?.length === 0 && <EmptyState icon={<UsersThree size={28} />} title="Aucun membre" />}
      <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {table.rows.map((u) => (
          <li key={u._id} className={`flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 ${u.isActive ? "" : "opacity-55"}`}>
            <div className="flex items-center gap-4">
              <Avatar name={u.username} src={u.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{u.username}</p>
                <p className="truncate text-sm text-muted">{u.email}</p>
              </div>
              <Badge tone={u.role === "barber" ? "outline" : "gold"}>{ROLE_LABEL[u.role]}</Badge>
            </div>
            {u.specialties && u.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {u.specialties.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            )}
            {!u.isActive && <p className="text-xs font-semibold text-danger">Compte désactivé</p>}
            <div className="mt-auto flex gap-2 border-t border-line pt-3">
              <Button size="sm" variant="secondary" icon={<PencilSimple size={16} aria-hidden />} onClick={() => open(u)} disabled={u.role === "owner" && me?.role !== "owner"}>
                Modifier
              </Button>
              {u._id !== me?._id && (
                <Button size="sm" variant="ghost" icon={u.isActive ? <Prohibit size={16} aria-hidden /> : <ArrowCounterClockwise size={16} aria-hidden />} onClick={() => toggleActive(u)} disabled={u.role === "owner" && me?.role !== "owner"}>
                  {u.isActive ? "Désactiver" : "Réactiver"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pagination table={table} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nouveau membre" : "Modifier le membre"} size="lg">
        <form onSubmit={submit} className="flex flex-col gap-6">
          {fieldError && !fieldError.field && <p role="alert" className="text-sm text-danger">{fieldError.message}</p>}
          <div className="grid gap-6 sm:grid-cols-2">
            <Input label="Nom" value={form.username} onChange={set("username")} required minLength={3} error={err("username")} />
            <Select label="Rôle" value={form.role} onChange={set("role")}>
              <option value="barber">Barber</option>
              <option value="manager">Manager</option>
              {me?.role === "owner" && <option value="owner">Propriétaire</option>}
            </Select>
            <Input label="Email" type="email" value={form.email} onChange={set("email")} required error={err("email")} />
            <Input label="Téléphone" type="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <Input
            label={editing === "new" ? "Mot de passe" : "Nouveau mot de passe"}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            required={editing === "new"}
            hint={editing === "new" ? "8 caractères min., une majuscule, une minuscule, un chiffre." : "Laisser vide pour ne pas changer."}
            error={err("password")}
          />
          {form.role === "barber" && (
            <>
              <Input label="Spécialités" value={form.specialties} onChange={set("specialties")} hint="Séparées par des virgules : Dégradé, Barbe, Rasage" />
              <Textarea label="Bio" value={form.bio} onChange={set("bio")} maxLength={300} />
              <HoursEditor value={hours} onChange={setHours} />
            </>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="gold" loading={busy}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
