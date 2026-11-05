import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, CaretDown, ClockCounterClockwise, House, SignOut, UserCircle } from "@phosphor-icons/react";
import { Avatar } from "../ui/Display";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABEL } from "../../lib/format";

/** Links shown inside the client's avatar dropdown */
const CLIENT_MENU: { to: string; label: string; icon: typeof UserCircle }[] = [
  { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle },
  { to: "/dashboard/appointments", label: "Mes rendez-vous", icon: CalendarCheck },
  { to: "/dashboard/history", label: "Mon historique", icon: ClockCounterClockwise },
  { to: "/", label: "Retour au site", icon: House },
];

/** Avatar button with a dropdown (profile, role-specific links, logout) */
export function UserMenu({ variant, align = "left" }: { variant: "header" | "sidebar"; align?: "left" | "right" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const inDashboard = pathname.startsWith("/dashboard") || pathname === "/caisse";
  const links = user.role === "client" ? CLIENT_MENU.filter((l) => inDashboard || l.to !== "/") : [{ to: "/dashboard/profile", label: "Mon profil", icon: UserCircle }];
  const item = "flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-sm transition-colors hover:bg-surface-2";

  return (
    <div ref={ref} className={variant === "sidebar" ? "relative m-3" : "relative"}>
      {variant === "header" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu du compte"
          className="flex cursor-pointer items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-85"
        >
          <Avatar name={user.username} src={user.avatarUrl} size="lg" />
          <CaretDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-left transition-colors hover:border-text/30"
        >
          <Avatar name={user.username} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.username}</span>
            <span className="block text-xs text-accent">{ROLE_LABEL[user.role]}</span>
          </span>
          <CaretDown size={14} className={`text-muted transition-transform ${open ? "" : "rotate-180"}`} aria-hidden />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: variant === "sidebar" ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-64 overflow-hidden border border-line bg-surface shadow-2xl shadow-black/40 ${variant === "sidebar" ? "right-0 bottom-full left-0 mb-2 w-auto" : `top-full mt-3 ${align === "right" ? "right-0" : "left-0"}`}`}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-4">
              <Avatar name={user.username} src={user.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.username}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            {links.map((l) => (
              <Link key={l.to + l.label} to={l.to} role="menuitem" className={item}>
                <l.icon size={18} className="text-accent" aria-hidden /> {l.label}
              </Link>
            ))}
            <button
              role="menuitem"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className={`${item} border-t border-line text-muted hover:text-danger`}
            >
              <SignOut size={18} aria-hidden /> Déconnexion
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

