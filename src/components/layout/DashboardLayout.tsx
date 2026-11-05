import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarBlank,
  CalendarCheck,
  CashRegister,
  ChartLineUp,
  House,
  Images,
  List,
  Receipt,
  Scissors,
  SidebarSimple,
  Star,
  Users,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "../../context/ThemeContext";
import { ErrorBoundary } from "../ErrorBoundary";
import { UserMenu } from "./UserMenu";
import { LinkButton } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof List;
  roles: Role[];
}

const STAFF: Role[] = ["owner", "manager", "barber"];
const ADMIN: Role[] = ["owner", "manager"];

/** Sidebar navigation (staff only — clients get a top bar and an avatar menu instead) */
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: ChartLineUp, roles: STAFF },
  { to: "/caisse", label: "Terminal de caisse", icon: CashRegister, roles: ADMIN },
  { to: "/dashboard/caisse", label: "Journal de caisse", icon: Receipt, roles: ADMIN },
  { to: "/dashboard/planning", label: "Planning", icon: CalendarBlank, roles: STAFF },
  { to: "/dashboard/appointments", label: "Rendez-vous", icon: CalendarCheck, roles: STAFF },
  { to: "/dashboard/clients", label: "Clients", icon: Users, roles: STAFF },
  { to: "/dashboard/portfolio", label: "Portfolio", icon: Images, roles: STAFF },
  { to: "/dashboard/reviews", label: "Avis", icon: Star, roles: STAFF },
  { to: "/dashboard/services", label: "Services & tarifs", icon: Scissors, roles: ADMIN },
  { to: "/dashboard/team", label: "Équipe", icon: UsersThree, roles: ADMIN },
];

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-8 pb-10">
        <Logo />
      </div>
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1.5">
          {items.map((n) => (
            <li key={n.to + n.label}>
              <NavLink
                to={n.to}
                end={n.to === "/dashboard"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `relative flex min-h-12 items-center gap-4 px-4 text-[13px] tracking-wide transition-colors ${isActive ? "text-onaccent" : "text-muted hover:bg-surface-2 hover:text-text"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="side-active" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-gold" />}
                    <n.icon size={20} weight={isActive ? "fill" : "regular"} className="relative" aria-hidden />
                    <span className="relative">{n.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <UserMenu variant="sidebar" />
    </div>
  );
}

const COLLAPSE_KEY = "empire-sidebar-collapsed";

export default function DashboardLayout() {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { pathname } = useLocation();
  const isTerminal = pathname === "/caisse";
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return !c;
    });

  return (
    <div className="flex min-h-dvh">
      {!isClient && (
        <aside
          aria-hidden={collapsed}
          className={`sticky top-0 hidden h-dvh shrink-0 bg-surface transition-[width] duration-300 ease-out print:hidden lg:block ${collapsed ? "w-0 overflow-hidden" : "w-72 border-r border-line"}`}
        >
          <div className="h-full w-72">
            <SideNav />
          </div>
        </aside>
      )}

      <AnimatePresence>
        {drawer && !isClient && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%", transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 w-[86vw] max-w-80 border-r border-line bg-surface"
            >
              <button onClick={() => setDrawer(false)} className="absolute top-5 right-3 flex size-11 cursor-pointer items-center justify-center rounded-xl text-muted hover:text-text" aria-label="Fermer le menu">
                <X size={22} />
              </button>
              <SideNav onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-18 shrink-0 items-center justify-between gap-3 border-b border-line bg-bg px-4 print:hidden sm:px-8">
          <div className="flex items-center gap-3">
            {isClient ? (
              <>
                <LinkButton to="/" variant="secondary" size="sm" icon={<House size={16} aria-hidden />}>
                  Retour à l'accueil
                </LinkButton>
              </>
            ) : (
              <>
                <button onClick={() => setDrawer(true)} className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-text hover:bg-surface-2 lg:hidden" aria-label="Ouvrir le menu">
                  <List size={24} />
                </button>
                <button
                  onClick={toggleCollapsed}
                  className="hidden size-11 cursor-pointer items-center justify-center rounded-xl text-text hover:bg-surface-2 lg:flex"
                  aria-label={collapsed ? "Afficher la barre latérale" : "Masquer la barre latérale"}
                  aria-pressed={collapsed}
                >
                  <SidebarSimple size={22} weight={collapsed ? "regular" : "fill"} />
                </button>
                {collapsed && (
                  <div className="hidden lg:block">
                    <Logo compact />
                  </div>
                )}
                <p className="ml-2 hidden text-sm text-muted sm:block">
                  Bonjour, <span className="font-semibold text-text">{user?.username}</span>
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            {isClient && <UserMenu variant="header" align="right" />}
          </div>
        </header>
        {isTerminal ? (
          <main id="main" className="flex min-h-0 flex-1 flex-col">
            <ErrorBoundary key={pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        ) : (
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
            <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
              <ErrorBoundary key={pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </main>
        )}
      </div>
    </div>
  );
}
