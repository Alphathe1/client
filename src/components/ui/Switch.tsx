import { useId } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** second line under the label */
  hint?: string;
  disabled?: boolean;
}

/** On/off setting. A real checkbox underneath, so the keyboard (Space) and screen readers get it for free. */
export function Switch({ checked, onChange, label, hint, disabled = false }: SwitchProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={`group flex min-h-11 items-center justify-between gap-4 ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text">{label}</span>
        {/* hidden from the label's name, read as the description instead */}
        {hint && (
          <span id={`${id}-hint`} aria-hidden className="block text-xs text-subtle">
            {hint}
          </span>
        )}
      </span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span
          aria-hidden
          className={`h-6 w-11 rounded-full border border-line-strong bg-surface-3 ${disabled ? "" : "group-hover:border-text"} transition-colors duration-180 ease-swift peer-checked:border-brand-fill peer-checked:bg-brand-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand`}
        />
        <span aria-hidden className="absolute top-1 left-1 size-4 rounded-full bg-muted transition-transform duration-180 ease-swift peer-checked:translate-x-5 peer-checked:bg-on-brand" />
      </span>
    </label>
  );
}
