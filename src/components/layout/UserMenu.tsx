import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, CaretDown, ClockCounterClockwise, House, SignOut, UserCircle } from "@phosphor-icons/react";
import { Avatar } from "../ui/Display";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABEL } from "../../lib/format";
import { EASE_SWIFT } from "../../lib/motion";

/** Links shown inside the client's avatar dropdown */
const CLIENT_MENU: { to: string; label: string; icon: typeof UserCircle }[] = [
  { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle },
  { to: "/dashboard/appointments", label: "Mes rendez-vous", icon: CalendarCheck },
  { to: "/dashboard/history", label: "Mon historique", icon: ClockCounterClockwise },
  { to: "/", label: "Retour au site", icon: House },
];

type Variant = "header" | "sidebar" | "rail";

const WRAPPER: Record<Variant, string> = {
  header: "relative",
  sidebar: "relative m-3",
  rail: "relative my-3 flex justify-center",
};

/** Avatar button with a dropdown (profile, role-specific links, logout).
 *  `sidebar` is the full-width card of the open sidebar, `rail` the avatar alone once it is collapsed. */
export function UserMenu({ variant, align = "left" }: { variant: Variant; align?: "left" | "right" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // React's root listener runs before a focus trap's document listener: preventDefault tells the trap this Escape is spent
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !open) return;
    e.preventDefault();
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;
  const inDashboard = pathname.startsWith("/dashboard") || pathname === "/caisse";
  const links = user.role === "client" ? CLIENT_MENU.filter((l) => inDashboard || l.to !== "/") : [{ to: "/dashboard/profile", label: "Mon profil", icon: UserCircle }];
  const item = "flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-sm text-text transition-colors duration-100 ease-out hover:bg-surface-2";
  const position = {
    header: `top-full mt-2 w-64 ${align === "right" ? "right-0" : "left-0"}`,
    sidebar: "right-0 bottom-full left-0 mb-2",
    rail: "bottom-full left-2 mb-2 w-64",
  }[variant];

  return (
    <div ref={ref} onKeyDown={onKeyDown} className={WRAPPER[variant]}>
      {variant === "sidebar" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-line bg-surface-2 p-2.5 text-left transition-colors duration-100 ease-out hover:border-line-strong"
        >
          <Avatar name={user.username} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{user.username}</span>
            <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
          </span>
          <CaretDown size={14} className={`text-muted transition-transform duration-150 ${open ? "" : "rotate-180"}`} aria-hidden />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu du compte"
          className="flex cursor-pointer items-center gap-2 rounded-full p-0.5 transition-opacity duration-100 ease-out hover:opacity-85"
        >
          <Avatar name={user.username} src={user.avatarUrl} />
          {variant === "header" && <CaretDown size={16} className={`text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} aria-hidden />}
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: variant === "header" ? -6 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18, ease: EASE_SWIFT }}
            className={`absolute z-50 overflow-hidden rounded-md border border-line bg-surface shadow-pop ${position}`}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Avatar name={user.username} src={user.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{user.username}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            {links.map((l) => (
              <Link key={l.to + l.label} to={l.to} role="menuitem" className={item}>
                <l.icon size={18} className="text-muted" aria-hidden /> {l.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className={`${item} border-t border-line hover:text-danger`}
            >
              <SignOut size={18} className="text-muted" aria-hidden /> Déconnexion
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
