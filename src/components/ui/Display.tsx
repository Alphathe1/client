import type { ReactNode } from "react";
import { Prohibit, Star, WarningCircle } from "@phosphor-icons/react";
import { buttonClass } from "./Button";
import { initials, STATUS_LABEL } from "../../lib/format";
import type { AppointmentStatus } from "../../lib/types";

export function Avatar({ name, src, size = "md" }: { name: string; src?: string | undefined; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-3xl" }[size];
  return src ? (
    <img src={src} alt="" className={`${sz} shrink-0 rounded-full object-cover`} loading="lazy" />
  ) : (
    <span aria-hidden className={`${sz} flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 font-medium text-text`}>
      {initials(name)}
    </span>
  );
}

/** One colour per state, always next to its label: colour is never the only signal.
 *  Waiting needs attention (warning), confirmed is good news (success), done is history (neutral). */
const statusTone: Record<AppointmentStatus, string> = {
  pending: "border-warning/40 bg-warning/12 text-warning",
  confirmed: "border-success/40 bg-success/12 text-success",
  completed: "border-line bg-surface-2 text-muted",
  cancelled: "border-danger/40 bg-danger/12 text-danger",
  "no-show": "border-line bg-surface-2 text-subtle",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusTone[status]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "brand" | "outline" }) {
  const cls = {
    default: "border-line bg-surface-2 text-muted",
    brand: "border-brand/40 bg-brand/12 text-brand",
    outline: "border-line-strong text-text",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} weight={i <= Math.round(value) ? "fill" : "regular"} className={i <= Math.round(value) ? "text-brand" : "text-subtle"} aria-hidden />
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
          className="flex size-11 cursor-pointer items-center justify-center rounded-sm transition-colors duration-100 ease-out hover:bg-surface-2"
        >
          <Star size={28} weight={i <= value ? "fill" : "regular"} className={i <= value ? "text-brand" : "text-subtle"} aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-3 ${className}`} />;
}

/** Nothing to show yet: say what belongs here and offer the action that fills it */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-md bg-surface-2 text-muted" aria-hidden>
        {icon ?? <Prohibit size={24} />}
      </div>
      <p className="text-base font-semibold text-text">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-danger/40 bg-danger/12 px-6 py-8 text-center">
      <WarningCircle size={28} className="text-danger" aria-hidden />
      <p className="text-sm text-text">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonClass("secondary", "sm")}>
          Réessayer
        </button>
      )}
    </div>
  );
}

/** The page's own h1, its one-line purpose, and its main actions */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</div>;
}
