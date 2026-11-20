import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowSquareOut,
  CalendarBlank,
  CalendarCheck,
  CashRegister,
  ChartLineUp,
  Crown,
  House,
  Images,
  List,
  PencilSimpleLine,
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
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "../../context/ThemeContext";
import { ErrorBoundary } from "../ErrorBoundary";
import { IconButton, LinkButton } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { useHasSiteDraft } from "../../lib/siteDraftStore";
import type { Role } from "../../lib/types";
import { EASE_SWIFT } from "../../lib/motion";

interface NavItem {
  to: string;
  label: string;
  icon: typeof List;
  roles: Role[];
  /** warning dot while the site editor keeps unpublished changes (spec §4, navigation link) */
  draftDot?: boolean;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const STAFF: Role[] = ["owner", "manager", "barber"];
const ADMIN: Role[] = ["owner", "manager"];

/** Sidebar navigation, grouped by intent (staff only — clients get a top bar and an avatar menu instead).
 *  A group whose entries are all hidden for the current role is not rendered. */
const NAV_GROUPS: NavGroup[] = [
  { label: "Pilotage", items: [{ to: "/dashboard", label: "Vue d'ensemble", icon: ChartLineUp, roles: STAFF }] },
  {
    label: "Activité",
    items: [
      { to: "/dashboard/planning", label: "Planning", icon: CalendarBlank, roles: STAFF },
      { to: "/dashboard/appointments", label: "Rendez-vous", icon: CalendarCheck, roles: STAFF },
      { to: "/dashboard/clients", label: "Clients", icon: Users, roles: STAFF },
    ],
  },
  {
    label: "Caisse",
    items: [
      { to: "/caisse", label: "Terminal de caisse", icon: CashRegister, roles: ADMIN },
      { to: "/dashboard/caisse", label: "Journal de caisse", icon: Receipt, roles: ADMIN },
    ],
  },
  {
    label: "Vitrine",
    items: [
      { to: "/dashboard/site", label: "Éditeur du site", icon: PencilSimpleLine, roles: ["owner"], draftDot: true },
      { to: "/dashboard/portfolio", label: "Portfolio", icon: Images, roles: STAFF },
      { to: "/dashboard/reviews", label: "Avis", icon: Star, roles: STAFF },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/dashboard/services", label: "Services et tarifs", icon: Scissors, roles: ADMIN },
      { to: "/dashboard/team", label: "Équipe", icon: UsersThree, roles: ADMIN },
    ],
  },
];

/** pages that lay out their own full-height screen instead of the padded content column */
const FULL_BLEED = ["/caisse", "/dashboard/site"];

/** Where the current URL sits in the navigation, for the breadcrumb */
function currentPlace(pathname: string): { group?: string; label: string } {
  let best: { group: string; label: string; length: number } | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const hit = item.to === "/dashboard" ? pathname === "/dashboard" : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (hit && (!best || item.to.length > best.length)) best = { group: group.label, label: item.label, length: item.to.length };
    }
  }
  if (best) return { group: best.group, label: best.label };
  if (pathname.startsWith("/dashboard/profile")) return { label: "Mon profil" };
  if (pathname.startsWith("/dashboard/history")) return { label: "Mon historique" };
  if (pathname.startsWith("/dashboard/appointments")) return { label: "Mes rendez-vous" };
  return { label: "Mon espace" };
}

/** `full` and `drawer` show labels and group titles; `rail` shows icons only */
type NavMode = "full" | "rail" | "drawer";

function SideNav({ mode, onNavigate }: { mode: NavMode; onNavigate?: () => void }) {
  const { user } = useAuth();
  const uid = useId();
  const hasDraft = useHasSiteDraft();
  if (!user) return null;
  const rail = mode === "rail";
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => n.roles.includes(user.role)) })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-14 shrink-0 items-center border-b border-line ${rail ? "justify-center" : "px-5"}`}>
        {rail ? (
          <Link to="/" aria-label="L'Empire Barber — accueil" title="Accueil du site" className="flex size-10 items-center justify-center rounded-sm text-brand transition-colors duration-100 ease-out hover:bg-surface-2">
            <Crown size={22} weight="fill" aria-hidden />
          </Link>
        ) : (
          <Logo compact />
        )}
      </div>
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g, gi) => {
          const titleId = `${uid}-${gi}`;
          return (
            <div key={g.label} className={gi === 0 ? "" : rail ? "mt-3 border-t border-line pt-3" : "mt-6"}>
              {!rail && (
                <p id={titleId} className="px-3 pb-1.5 text-xs font-medium text-subtle">
                  {g.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5" aria-labelledby={rail ? undefined : titleId} aria-label={rail ? g.label : undefined}>
                {g.items.map((n) => {
                  const dot = !!n.draftDot && hasDraft;
                  const railLabel = dot ? `${n.label}, modifications non publiées` : n.label;
                  return (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.to === "/dashboard"}
                      onClick={onNavigate}
                      title={rail ? railLabel : undefined}
                      aria-label={rail ? railLabel : undefined}
                      className={({ isActive }) =>
                        `relative flex min-h-10 items-center gap-3 rounded-sm text-sm transition-colors duration-100 ease-out pointer-coarse:min-h-11 ${rail ? "justify-center" : "px-3"} ${isActive ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2 hover:text-text"}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <motion.span layoutId={`nav-active-${mode}`} transition={{ type: "spring", stiffness: 500, damping: 40 }} className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
                          <n.icon size={18} weight={isActive ? "fill" : "regular"} className="shrink-0" aria-hidden />
                          {!rail && <span className="truncate">{n.label}</span>}
                          {dot &&
                            (rail ? (
                              <span aria-hidden className="absolute top-2 right-2.5 size-2 rounded-full bg-warning" />
                            ) : (
                              <>
                                <span aria-hidden className="ml-auto size-2 shrink-0 rounded-full bg-warning" />
                                <span className="sr-only">, modifications non publiées</span>
                              </>
                            ))}
                        </>
                      )}
                    </NavLink>
                  </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <UserMenu variant={rail ? "rail" : "sidebar"} />
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
  const drawerRef = useRef<HTMLElement>(null);
  // the sidebar widens over 200 ms (duration-200 below): show the labels once it is wide enough,
  // instead of flashing them inside the 64px rail; collapsing switches to icons at once
  const [railShown, setRailShown] = useState(collapsed);
  useEffect(() => {
    if (collapsed) {
      setRailShown(true);
      return;
    }
    const timer = setTimeout(() => setRailShown(false), 200);
    return () => clearTimeout(timer);
  }, [collapsed]);
  useFocusTrap(drawerRef, drawer, () => setDrawer(false));

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawer) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [drawer]);

  // the drawer is a phone/tablet pattern: leaving it open past lg would keep the scroll lock and focus trap on
  useEffect(() => {
    if (!drawer) return;
    const mq = window.matchMedia("(min-width: 64rem)");
    const onChange = (e: MediaQueryListEvent) => e.matches && setDrawer(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [drawer]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return !c;
    });

  const place = currentPlace(pathname);
  const fullBleed = FULL_BLEED.includes(pathname);

  return (
    <div className="flex min-h-dvh text-sm">
      <a href="#main" className="sr-only rounded-sm bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Aller au contenu
      </a>

      {!isClient && (
        <aside className={`sticky top-0 z-40 hidden h-dvh shrink-0 border-r border-line bg-surface transition-[width] duration-200 ease-out print:hidden lg:block ${collapsed ? "w-16" : "w-62"}`}>
          <SideNav mode={collapsed || railShown ? "rail" : "full"} />
        </aside>
      )}

      <AnimatePresence>
        {drawer && !isClient && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              tabIndex={-1}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%", transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ duration: 0.24, ease: EASE_SWIFT }}
              className="absolute inset-y-0 left-0 w-[86vw] max-w-72 border-r border-line bg-surface outline-none"
            >
              <div className="absolute top-2 right-2">
                <IconButton label="Fermer le menu" onClick={() => setDrawer(false)}>
                  <X size={20} aria-hidden />
                </IconButton>
              </div>
              <SideNav mode="drawer" onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-bg px-3 print:hidden sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {isClient ? (
              <LinkButton to="/" variant="secondary" size="sm" icon={<House size={16} aria-hidden />}>
                Retour à l'accueil
              </LinkButton>
            ) : (
              <>
                <div className="lg:hidden">
                  <IconButton label="Ouvrir le menu" onClick={() => setDrawer(true)}>
                    <List size={20} aria-hidden />
                  </IconButton>
                </div>
                <div className="hidden lg:block">
                  <IconButton label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"} onClick={toggleCollapsed}>
                    <SidebarSimple size={20} aria-hidden />
                  </IconButton>
                </div>
                <p className="ml-1 flex min-w-0 items-center gap-2">
                  {place.group && (
                    <>
                      <span className="hidden text-subtle sm:inline">{place.group}</span>
                      <span aria-hidden className="hidden text-subtle sm:inline">
                        /
                      </span>
                    </>
                  )}
                  <span className="truncate font-medium text-text">{place.label}</span>
                </p>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!isClient && (
              <div className="hidden sm:block">
                <LinkButton to="/" variant="ghost" size="sm" icon={<ArrowSquareOut size={16} aria-hidden />}>
                  Voir le site
                </LinkButton>
              </div>
            )}
            <ThemeToggle />
            <NotificationBell />
            {isClient && <UserMenu variant="header" align="right" />}
          </div>
        </header>
        {fullBleed ? (
          <main id="main" className="flex min-h-0 flex-1 flex-col">
            <ErrorBoundary key={pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        ) : (
          <main id="main" className="mx-auto w-full max-w-350 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE_SWIFT }}>
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
