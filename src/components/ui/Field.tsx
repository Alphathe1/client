import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

/** Shared look of text controls: surface fill, a boundary that reaches 3:1, brass on focus.
 *  16px on phones (iOS zooms into anything smaller), 14px from the `sm` breakpoint up. */
export const controlClass =
  "w-full rounded-sm border bg-surface px-3 text-base text-text outline-offset-0 transition-colors duration-100 ease-out placeholder:text-subtle focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-surface-2 read-only:text-muted sm:text-sm";

const borderClass = (error: string | undefined) => (error ? "border-danger" : "border-line-strong hover:border-text");

interface FieldShellProps {
  label: string;
  id: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  /** short note on the label row, e.g. a character counter */
  aside?: ReactNode;
  children: ReactNode;
}

/** Label, control, then the error (announced) or the hint */
export function FieldShell({ label, id, error, hint, required, aside, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          )}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error: string | undefined, hint: string | undefined) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  aside?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, aside, className = "", type, id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <FieldShell label={label} id={fid} error={error} hint={hint} required={rest.required} aside={aside}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(fid, error, hint)}
          className={`${controlClass} min-h-11 ${borderClass(error)} ${isPassword ? "pr-12" : ""} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute top-1/2 right-0.5 flex size-10 -translate-y-1/2 pointer-coarse:size-11 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-100 ease-out hover:text-text"
          >
            {show ? <EyeSlash size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        )}
      </div>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  aside?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, hint, aside, className = "", id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell label={label} id={fid} error={error} hint={hint} required={rest.required} aside={aside}>
      <textarea
        ref={ref}
        id={fid}
        rows={3}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={`${controlClass} py-2.5 ${borderClass(error)} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, hint, className = "", id, children, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell label={label} id={fid} error={error} hint={hint} required={rest.required}>
      <select
        ref={ref}
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={`${controlClass} min-h-11 cursor-pointer ${borderClass(error)} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});
