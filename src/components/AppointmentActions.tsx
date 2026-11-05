import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarX, CheckCircle, PencilSimple, Star, UserMinus } from "@phosphor-icons/react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Textarea } from "./ui/Field";
import { StarInput } from "./ui/Display";
import { PrestationForm } from "./PrestationForm";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import type { Appointment } from "../lib/types";

/** Role-aware actions for a single appointment */
export function AppointmentActions({ appt, onChange }: { appt: Appointment; onChange: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState<"cancel" | "review" | "prestation" | null>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const upcoming = ["pending", "confirmed"].includes(appt.status);
  const isClient = user?.role === "client";

  const setStatus = async (status: Appointment["status"], cancelReason?: string) => {
    setBusy(true);
    try {
      await api.patch(`/appointments/${appt._id}/status`, { status, ...(cancelReason ? { cancelReason } : {}) });
      toast(status === "cancelled" ? "Rendez-vous annulé" : "Statut mis à jour");
      setModal(null);
      onChange();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const sendReview = async () => {
    setBusy(true);
    try {
      await api.post("/reviews", { appointment: appt._id, rating, ...(comment ? { comment } : {}) });
      toast("Merci pour votre avis !");
      setModal(null);
      onChange();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {upcoming && (
        <>
          <Button size="sm" variant="secondary" icon={<PencilSimple size={16} aria-hidden />} onClick={() => navigate(`/book?reschedule=${appt._id}`)}>
            Modifier
          </Button>
          <Button size="sm" variant="danger" icon={<CalendarX size={16} aria-hidden />} onClick={() => setModal("cancel")}>
            Annuler
          </Button>
        </>
      )}
      {!isClient && upcoming && (
        <>
          <Button size="sm" variant="gold" icon={<CheckCircle size={16} aria-hidden />} onClick={() => setModal("prestation")}>
            Terminer
          </Button>
          <Button size="sm" variant="ghost" icon={<UserMinus size={16} aria-hidden />} onClick={() => setStatus("no-show")} disabled={busy}>
            Absent
          </Button>
        </>
      )}
      {isClient && appt.status === "completed" && !appt.reviewed && (
        <Button size="sm" variant="gold" icon={<Star size={16} weight="fill" aria-hidden />} onClick={() => setModal("review")}>
          Noter {appt.barber.username}
        </Button>
      )}

      <Modal open={modal === "cancel"} onClose={() => setModal(null)} title="Annuler le rendez-vous ?" description="Le créneau sera libéré et le barber sera prévenu.">
        <Textarea label="Motif" hint="Optionnel" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>
            Garder
          </Button>
          <Button variant="danger" loading={busy} onClick={() => setStatus("cancelled", reason)}>
            Confirmer l'annulation
          </Button>
        </div>
      </Modal>

      <Modal open={modal === "review"} onClose={() => setModal(null)} title={`Noter ${appt.barber.username}`} description={appt.service.name}>
        <StarInput value={rating} onChange={setRating} />
        <div className="mt-4">
          <Textarea label="Votre commentaire" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Comment s'est passée votre coupe ?" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>
            Plus tard
          </Button>
          <Button variant="gold" loading={busy} onClick={sendReview}>
            Publier l'avis
          </Button>
        </div>
      </Modal>

      <Modal open={modal === "prestation"} onClose={() => setModal(null)} title="Enregistrer la prestation" description={`${appt.client.username} · ${appt.service.name}`} size="lg">
        <PrestationForm
          appointment={appt}
          onDone={() => {
            setModal(null);
            onChange();
          }}
        />
      </Modal>
    </div>
  );
}
