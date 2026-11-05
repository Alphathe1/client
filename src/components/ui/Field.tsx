import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

const control =
  "w-full border bg-surface px-4 text-base text-text placeholder:text-subtle transition-colors duration-300 outline-none focus:border-accent disabled:opacity-50";

interface FieldShellProps {
  label: string;
  id: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
}

function FieldShell({ label, id, error, hint, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-[11px] tracking-[0.25em] text-muted uppercase">
        {label}
        {required && (
          <span className="ml-0.5 text-accent" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className = "", type, id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <FieldShell label={label} id={fid} error={error} hint={hint} required={rest.required}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={`${control} min-h-12 ${error ? "border-danger" : "border-line"} ${isPassword ? "pr-12" : ""} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-text"
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, hint, className = "", id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell label={label} id={fid} error={error} hint={hint} required={rest.required}>
      <textarea ref={ref} id={fid} rows={3} aria-invalid={!!error || undefined} className={`${control} py-3 ${error ? "border-danger" : "border-line"} ${className}`} {...rest} />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, className = "", id, children, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell label={label} id={fid} error={error} required={rest.required}>
      <select ref={ref} id={fid} className={`${control} min-h-12 cursor-pointer ${error ? "border-danger" : "border-line"} ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});
