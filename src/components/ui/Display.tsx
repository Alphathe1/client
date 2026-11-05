import type { ReactNode } from "react";
import { CheckCircle, Clock, Prohibit, Star, UserMinus, XCircle } from "@phosphor-icons/react";
import { initials, STATUS_LABEL } from "../../lib/format";
import type { AppointmentStatus } from "../../lib/types";

export function Avatar({ name, src, size = "md" }: { name: string; src?: string | undefined; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-3xl" }[size];
  return src ? (
    <img src={src} alt="" className={`${sz} shrink-0 rounded-full object-cover grayscale-[30%]`} loading="lazy" />
  ) : (
    <span aria-hidden className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-text ring-1 ring-accent/50`}>
      {initials(name)}
    </span>
  );
}

const statusStyle: Record<AppointmentStatus, { cls: string; icon: ReactNode }> = {
  pending: { cls: "bg-warning/10 text-warning border-warning/30", icon: <Clock size={14} weight="bold" /> },
  confirmed: { cls: "bg-accent/10 text-accent border-accent/30", icon: <CheckCircle size={14} weight="bold" /> },
  completed: { cls: "bg-success/10 text-success border-success/30", icon: <CheckCircle size={14} weight="fill" /> },
  cancelled: { cls: "bg-danger/10 text-danger border-danger/30", icon: <XCircle size={14} weight="bold" /> },
  "no-show": { cls: "bg-subtle/15 text-muted border-line", icon: <UserMinus size={14} weight="bold" /> },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = statusStyle[status];
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-sans text-[11px] font-medium tracking-wide whitespace-nowrap uppercase ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "gold" | "outline" }) {
  const cls = {
    default: "border-line bg-surface-2 text-muted",
    gold: "border-gold bg-gold text-onaccent",
    outline: "border-accent/50 text-accent",
  }[tone];
  return <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-sans text-[11px] font-medium tracking-wide uppercase ${cls}`}>{children}</span>;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} weight={i <= Math.round(value) ? "fill" : "regular"} className={i <= Math.round(value) ? "text-accent" : "text-subtle"} aria-hidden />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Note" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="flex size-11 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95"
        >
          <Star size={30} weight={i <= value ? "fill" : "regular"} className={i <= value ? "text-accent" : "text-subtle"} />
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-3 ${className}`} />;
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-accent" aria-hidden>
        {icon ?? <Prohibit size={28} />}
      </div>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <XCircle size={32} className="text-danger" aria-hidden />
      <p className="text-sm text-text">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="min-h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold text-accent hover:underline">
          Réessayer
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-12 flex flex-col gap-8 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-4xl leading-[0.95] font-bold tracking-normal text-text sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-4">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-line bg-surface p-6 sm:p-8 ${className}`}>{children}</div>;
}

/** Section heading: a plain condensed title, left aligned */
export function SectionTitle({ title, className = "" }: { title: ReactNode; className?: string }) {
  return <h2 className={`font-display text-5xl leading-[0.95] font-bold text-text uppercase sm:text-6xl ${className}`}>{title}</h2>;
}
