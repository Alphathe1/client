import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { CircleNotch } from "@phosphor-icons/react";

/** `brand` (brass fill) is reserved for the one action that matters most on a screen:
 *  book, confirm, publish, cash in. Ordinary main actions use `primary`. */
export type ButtonVariant = "brand" | "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border py-1.5 text-center font-medium select-none transition-colors duration-100 ease-out active:translate-y-px motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  brand: "border-brand-fill bg-brand-fill text-on-brand hover:border-brand-fill-hover hover:bg-brand-fill-hover",
  primary: "border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover",
  secondary: "border-line-strong bg-transparent text-text hover:border-text hover:bg-surface-2",
  ghost: "border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-text",
  danger: "border-danger/50 bg-transparent text-danger hover:border-danger hover:bg-danger/12",
};

/** `sm` is the dense desktop size; on a touch screen every size is at least 44px tall */
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm pointer-coarse:min-h-11",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") => `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** shows a spinner in place of the icon and blocks clicks */
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <CircleNotch size={18} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ variant = "primary", size = "md", className = "", icon, children, ...rest }: LinkProps & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children" | "title"> {
  /** accessible name and tooltip: an icon alone says nothing to a screen reader */
  label: string;
  /** set for toggles (rendered as aria-pressed); leave undefined for plain actions */
  pressed?: boolean;
  children: ReactNode;
}

/** Square icon-only button: 40px with a mouse, 44px on touch */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, pressed, className = "", children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors duration-100 ease-out hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-45 pointer-coarse:size-11 ${pressed ? "bg-surface-2 text-text" : "text-muted"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
