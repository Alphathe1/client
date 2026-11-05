import { useState, type FormEvent } from "react";
import { Camera, FloppyDisk, LockKey } from "@phosphor-icons/react";
import { HoursEditor } from "../../components/HoursEditor";
import { Button } from "../../components/ui/Button";
import { Avatar, Card, PageHeader } from "../../components/ui/Display";
import { Input, Textarea } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import { fileToDataUrl } from "../../lib/image";
import { ROLE_LABEL } from "../../lib/format";
import type { User, WorkingHours } from "../../lib/types";

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const isBarber = user?.role === "barber";
  const [form, setForm] = useState({
    username: user?.username ?? "",
    phone: user?.phone ?? "",
    bio: user?.bio ?? "",
    preferences: user?.preferences ?? "",
    specialties: user?.specialties?.join(", ") ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  });
  const [hours, setHours] = useState<WorkingHours[]>(user?.workingHours ?? []);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  if (!user) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onAvatar = async (file?: File) => {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, 400, 0.85);
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.patch<User>("/auth/me", {
        username: form.username,
        phone: form.phone,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        ...(user.role === "client" ? { preferences: form.preferences } : {}),
        ...(isBarber ? { specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean), workingHours: hours } : {}),
      });
      setUser(res.data);
      toast("Profil mis à jour");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    setPwError(null);
    try {
      await api.patch("/auth/me/password", pw);
      toast("Mot de passe modifié");
      setPw({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setPwError((err as ApiError).message);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Mon profil" subtitle={`${ROLE_LABEL[user.role]} · ${user.email}`} />
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={save} className="flex flex-col gap-5">
            <div className="flex items-center gap-5">
              <Avatar name={form.username || user.username} src={form.avatarUrl || undefined} size="xl" />
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold transition-colors hover:border-accent hover:text-accent">
                <Camera size={18} aria-hidden /> Changer la photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onAvatar(e.target.files?.[0])} />
              </label>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Input label="Nom" value={form.username} onChange={set("username")} required minLength={3} autoComplete="username" />
              <Input label="Téléphone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </div>
            {user.role === "client" && <Textarea label="Mes préférences" hint="Partagées avec votre barber — ex. « dégradé bas, pas de cire »" value={form.preferences} onChange={set("preferences")} maxLength={1000} />}
            {user.role !== "client" && <Textarea label="Bio" value={form.bio} onChange={set("bio")} maxLength={300} />}
            {isBarber && (
              <>
                <Input label="Spécialités" value={form.specialties} onChange={set("specialties")} hint="Séparées par des virgules" />
                <HoursEditor value={hours} onChange={setHours} />
              </>
            )}
            <div className="flex justify-end">
              <Button type="submit" variant="gold" loading={busy} icon={<FloppyDisk size={18} aria-hidden />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>
        <Card className="h-fit">
          <form onSubmit={changePassword} className="flex flex-col gap-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <LockKey size={18} className="text-accent" aria-hidden /> Mot de passe
            </h2>
            {pwError && <p role="alert" className="text-sm text-danger">{pwError}</p>}
            <Input label="Mot de passe actuel" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required />
            <Input label="Nouveau mot de passe" type="password" autoComplete="new-password" hint="8 caractères min., une majuscule, une minuscule, un chiffre." value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required />
            <Button type="submit" variant="secondary" loading={pwBusy}>
              Modifier
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
