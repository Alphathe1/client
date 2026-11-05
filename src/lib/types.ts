export type Role = "owner" | "manager" | "barber" | "client";

export interface WorkingHours {
  day: number;
  start: string;
  end: string;
}

export interface User {
  _id: string;
  email: string;
  username: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  specialties?: string[];
  workingHours?: WorkingHours[];
  commissionRate?: number;
  preferences?: string;
  staffNotes?: string;
  isActive: boolean;
  isAdmin?: boolean;
  createdAt: string;
}

export interface Barber extends Pick<User, "_id" | "username" | "avatarUrl" | "bio" | "specialties" | "workingHours"> {
  rating: number | null;
  reviewCount: number;
}

export interface BarberProfile extends Barber {
  prestationCount: number;
  portfolio: PortfolioItem[];
  reviews: Review[];
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: string;
  imageUrl?: string;
  isActive: boolean;
}

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no-show";

type Ref<T> = T;

export interface Appointment {
  _id: string;
  client: Ref<Pick<User, "_id" | "username" | "email" | "phone" | "avatarUrl">>;
  barber: Ref<Pick<User, "_id" | "username" | "avatarUrl">>;
  service: Ref<Pick<Service, "_id" | "name" | "price" | "duration" | "category">>;
  start: string;
  end: string;
  price: number;
  status: AppointmentStatus;
  notes?: string;
  cancelReason?: string;
  reviewed: boolean;
}

export type PaymentMethod = "cash" | "card";

export interface Prestation {
  _id: string;
  appointment?: string;
  /** absent for walk-in sales rung up at the register */
  client?: Pick<User, "_id" | "username" | "email" | "phone" | "avatarUrl">;
  barber: Pick<User, "_id" | "username" | "avatarUrl">;
  service: Pick<Service, "_id" | "name" | "price">;
  price: number;
  date: string;
  cutType?: string;
  notes?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  commissionRate?: number;
  commission: number;
  paymentMethod: PaymentMethod;
  source: "caisse" | "appointment" | "manual";
  recordedBy?: Pick<User, "_id" | "username">;
  ticketNumber?: number;
}

export interface PaidTicket {
  _id: string;
  number: number;
  day: string;
  lines: { service: string; serviceName: string; barber: string; barberName: string; unitPrice: number; quantity: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashGiven?: number;
  change?: number;
  commission: number;
  createdAt: string;
}

export interface RegisterSummary {
  from: string;
  to: string;
  nextTicketNumber: number;
  totals: { count: number; revenue: number; commission: number; shop: number; cash: number; card: number };
  barbers: { _id: string; username: string; avatarUrl?: string; count: number; revenue: number; commission: number }[];
  sales: Prestation[];
}

export interface PortfolioItem {
  _id: string;
  barber: string | Pick<User, "_id" | "username" | "avatarUrl">;
  imageUrl: string;
  title?: string;
  cutType: string;
  description?: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  client: Pick<User, "_id" | "username" | "avatarUrl">;
  barber: string | Pick<User, "_id" | "username" | "avatarUrl">;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: "booking_confirmed" | "new_appointment" | "reminder" | "cancelled" | "modified" | "review";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ClientSummary extends Pick<User, "_id" | "username" | "email" | "phone" | "avatarUrl" | "createdAt" | "isActive"> {
  visitCount: number;
  totalSpent: number;
  lastVisit: string | null;
}

export interface ClientFile {
  client: User;
  appointments: Appointment[];
  prestations: Prestation[];
  stats: {
    visitCount: number;
    totalSpent: number;
    cancelled: number;
    noShows: number;
    lastVisit: string | null;
  };
}

export interface Slot {
  time: string;
  start: string;
}

export interface Stats {
  range: "day" | "week" | "month";
  appointmentsCount: number;
  cancelledCount: number;
  prestationsCount: number;
  revenue: number;
  commission: number;
  shopRevenue: number;
  averageTicket: number;
  newClients: number;
  barberPerformance: {
    _id: string;
    username: string;
    avatarUrl?: string;
    prestations: number;
    revenue: number;
    commission: number;
    rating: number | null;
    reviewCount: number;
  }[];
  topServices: { _id: string; name: string; count: number; revenue: number }[];
  series: { label: string; revenue: number; commission: number; prestations: number }[];
  upcoming: Appointment[];
}
