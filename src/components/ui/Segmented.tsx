import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";

interface SegmentedProps<T extends string> {
  /** unique on the page: it names the sliding indicator */
  id: string;
  /** accessible name of the group */
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  /** show the icons alone; the labels stay available to assistive tech and as tooltips */
  iconOnly?: boolean;
  /** the whole group: dimmed, not focusable, arrows ignored */
  disabled?: boolean;
}

/** One choice among a few (period, device). Radio semantics: Tab reaches the group, arrows move the choice. */
export function Segmented<T extends string>({ id, label, value, onChange, options, iconOnly = false, disabled = false }: SegmentedProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (disabled || step === 0 || options.length === 0) return;
    e.preventDefault();
    const next = (Math.max(current, 0) + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    buttons.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} onKeyDown={onKeyDown} className={`inline-flex rounded-sm border border-line bg-surface p-0.5 ${disabled ? "opacity-45" : ""}`}>
      {options.map((o, i) => {
        const active = i === current;
        return (
          <button
            key={o.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? o.label : undefined}
            title={iconOnly ? o.label : undefined}
            tabIndex={active || (current === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative flex min-h-9 cursor-pointer items-center justify-center rounded-xs px-3 text-sm transition-colors duration-100 ease-out disabled:cursor-not-allowed pointer-coarse:min-h-11 ${active ? "font-semibold text-text" : "font-medium text-muted hover:text-text"}`}
          >
            {active && <motion.span layoutId={`segmented-${id}`} transition={{ type: "spring", stiffness: 500, damping: 40 }} className="absolute inset-0 rounded-xs border border-line-strong bg-surface-3" />}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {!iconOnly && o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
