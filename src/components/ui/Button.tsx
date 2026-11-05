import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { CircleNotch } from "@phosphor-icons/react";

type Variant = "primary" | "pole" | "gold" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-md font-semibold transition-[background-color,color,border-color] duration-150 ease-out active:translate-y-px motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-45 select-none";

const variants: Record<Variant, string> = {
  primary: "border border-text bg-text text-bg hover:bg-transparent hover:text-text",
  pole: "border border-brass-fill bg-brass-fill text-black hover:border-brass-fill/85 hover:bg-brass-fill/85",
  gold: "border border-gold bg-gold text-onaccent hover:bg-transparent hover:text-text",
  secondary: "border border-text bg-transparent text-text hover:bg-text hover:text-bg",
  ghost: "text-muted hover:text-text",
  danger: "border border-danger/50 text-danger hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-12 px-6 text-[15px]",
  lg: "min-h-14 px-8 text-base",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra = "") => `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <CircleNotch size={18} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ variant = "primary", size = "md", className = "", icon, children, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
