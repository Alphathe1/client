import { useState, type FormEvent } from "react";
import { Button } from "./ui/Button";
import { Input, Select, Textarea } from "./ui/Field";
import { PhotoPicker } from "./ui/PhotoPicker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { Appointment, Barber, ClientSummary, Prestation, Service } from "../lib/types";

export const CUT_TYPES = ["Dégradé", "Taper", "Crop", "Classique", "Texturé", "Barbe", "Rasage", "Couleur", "Enfant"];

interface Props {
  appointment?: Appointment;
  prestation?: Prestation;
  clientId?: string;
  onDone: () => void;
}

/** Create (optionally from an appointment) or edit a prestation */
export function PrestationForm({ appointment, prestation, clientId, onDone }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "owner" || user?.role === "manager";
  const services = useFetch<Service[]>("/services");
  const clients = useFetch<ClientSummary[]>(!appointment && !prestation && !clientId ? "/clients" : null);
  const barbers = useFetch<Barber[]>(isAdmin && !appointment && !prestation ? "/users/barbers" : null);

  const [form, setForm] = useState({
    client: clientId ?? appointment?.client._id ?? prestation?.client?._id ?? "",
    barber: appointment?.barber._id ?? prestation?.barber._id ?? "",
    service: appointment?.service._id ?? prestation?.service._id ?? "",
    price: String(prestation?.price ?? appointment?.price ?? ""),
    cutType: prestation?.cutType ?? "",
    notes: prestation?.notes ?? "",
  });
  const [before, setBefore] = useState<string[]>(prestation?.beforePhotos ?? []);
  const [after, setAfter] = useState<string[]>(prestation?.afterPhotos ?? []);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      if (k === "service" && !prestation) {
        const s = services.data?.find((x) => x._id === value);
        if (s) next.price = String(s.price);
      }
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      service: form.service,
      ...(form.price ? { price: Number(form.price) } : {}),
      ...(form.cutType ? { cutType: form.cutType } : {}),
      notes: form.notes,
      beforePhotos: before,
      afterPhotos: after,
    };
    try {
      if (prestation) {
        await api.patch(`/prestations/${prestation._id}`, payload);
        toast("Prestation mise à jour");
      } else {
        await api.post("/prestations", {
          ...payload,
          client: form.client,
          ...(appointment ? { appointment: appointment._id } : {}),
          ...(isAdmin && form.barber ? { barber: form.barber } : {}),
        });
        toast("Prestation enregistrée");
      }
      onDone();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {clients.data && (
        <Select label="Client" value={form.client} onChange={set("client")} required>
          <option value="">Choisir…</option>
          {clients.data.map((c) => (
            <option key={c._id} value={c._id}>
              {c.username} — {c.email}
            </option>
          ))}
        </Select>
      )}
      {barbers.data && (
        <Select label="Barber" value={form.barber} onChange={set("barber")} required>
          <option value="">Choisir…</option>
          {barbers.data.map((b) => (
            <option key={b._id} value={b._id}>
              {b.username}
            </option>
          ))}
        </Select>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Select label="Service réalisé" value={form.service} onChange={set("service")} required>
          <option value="">Choisir…</option>
          {services.data?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Input label="Prix (DA)" type="number" inputMode="numeric" min={0} step={50} value={form.price} onChange={set("price")} />
      </div>
      <Select label="Type de coupe" value={form.cutType} onChange={set("cutType")}>
        <option value="">—</option>
        {CUT_TYPES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      <Textarea label="Notes sur la coupe" hint="Sabots, longueurs, produits utilisés… visibles par l'équipe et le client." value={form.notes} onChange={set("notes")} maxLength={2000} />
      <div className="grid gap-6 sm:grid-cols-2">
        <PhotoPicker label="Photos avant" value={before} onChange={setBefore} />
        <PhotoPicker label="Photos après" value={after} onChange={setAfter} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="submit" variant="gold" loading={busy}>
          {prestation ? "Enregistrer" : "Valider la prestation"}
        </Button>
      </div>
    </form>
  );
}
