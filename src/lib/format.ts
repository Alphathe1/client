import type { AppointmentStatus, Role } from "./types";

/** Algerian dinar, e.g. "1 200 DA" */
const currency = new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 });

export const formatPrice = (n: number) => currency.format(n);

export const formatDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(d).toLocaleDateString("fr-FR", opts);

export const formatTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const formatDuration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

export const timeAgo = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
};

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  barber: "Barber",
  client: "Client",
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  "no-show": "Absent",
};

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
