import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarBlank, List, MapPin, Phone, X } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { ErrorBoundary } from "../ErrorBoundary";
import { buttonClass, IconButton } from "../ui/Button";
import { OpeningStatus } from "../site/OpeningStatus";
import { SmartLink } from "../site/SmartLink";
import { SocialLinks } from "../site/social";
import { WRAP } from "../site/styles";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../../context/ThemeContext";
import { useSite } from "../../context/SiteContext";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { weekRows } from "../../lib/site/hours";
import { safeLink, telHref } from "../../lib/site/links";
import type { Role } from "../../lib/types";

/** "Tarifs" is the title of the page it opens and of the home section: one word for one thing (spec §5.1) */
const NAV = [
  { to: "/services", label: "Tarifs" },
  { to: "/barbers", label: "Barbers" },
  { to: "/gallery", label: "Galerie" },
];

/** Where "account" leads: sign-in, the client's space, or the staff dashboard */
function accountLink(role: Role | undefined) {
  if (!role) return { to: "/login", label: "Connexion" };
  return { to: "/dashboard", label: role === "client" ? "Mon compte" : "Tableau de bord" };
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `relative flex h-16 items-center text-sm font-medium transition-colors duration-100 ease-out hover:text-text ${
    isActive ? "text-text after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand" : "text-muted"
  }`;

/** Optional one-line notice above the header, managed in the editor */
function AnnouncementBar() {
  const { announcement } = useSite().content;
  if (!announcement.enabled || announcement.text.trim() === "") return null;
  return (
    <div className="border-b border-line bg-surface-2">
      <p className={`${WRAP} flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm text-text`}>
        <span className="min-w-0 wrap-anywhere">{announcement.text}</span>
        {announcement.linkLabel.trim() !== "" && (
          <SmartLink
            href={announcement.linkTo}
            className="inline-flex min-h-9 min-w-0 items-center font-medium text-text underline underline-offset-4 wrap-anywhere hover:text-muted pointer-coarse:min-h-11"
          >
            {announcement.linkLabel}
          </SmartLink>
        )}
      </p>
    </div>
  );
}

/** Full-screen menu under 1024px. Focus stays inside; Escape, any link, or widening the window closes it. */
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { contact } = useSite().content;
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    // past 1024px the header shows the links again: never leave a full-screen menu, and its scroll lock, behind
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onChange = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener("change", onChange);
    return () => {
      document.body.classList.remove("overflow-hidden");
      desktop.removeEventListener("change", onChange);
    };
  }, [open, onClose]);

  // any link closes the menu, even one to the page already shown
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) onClose();
  };
  const account = accountLink(user?.role);
  const tel = telHref(contact.phone);
  const big = "flex min-h-16 items-center text-3xl font-semibold";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          onClick={onClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg outline-none lg:hidden"
        >
          <div className={`${WRAP} flex h-16 shrink-0 items-center justify-between border-b border-line`}>
            <Logo />
            <IconButton label="Fermer le menu" onClick={onClose}>
              <X size={24} aria-hidden />
            </IconButton>
          </div>
          <nav aria-label="Navigation mobile" className={`${WRAP} flex-1 py-4`}>
            <ul>
              {NAV.map((n) => (
                <li key={n.to} className="border-b border-line">
                  <NavLink to={n.to} className={({ isActive }) => `${big} ${isActive ? "text-brand" : "text-text"}`}>
                    {n.label}
                  </NavLink>
                </li>
              ))}
              <li className="border-b border-line">
                <Link to={account.to} className={`${big} text-text`}>
                  {account.label}
                </Link>
              </li>
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              <OpeningStatus />
              {tel && (
                <a href={tel} className="inline-flex min-h-11 items-center gap-2 text-text">
                  <Phone size={18} className="text-muted" aria-hidden />
                  <span className="font-mono">{contact.phone}</span>
                </a>
              )}
            </div>
          </nav>
          <div className={`${WRAP} shrink-0 border-t border-line py-4`}>
            <Link to="/book" className={buttonClass("brand", "lg", "w-full")}>
              <CalendarBlank size={20} aria-hidden />
              Réserver un rendez-vous
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Header() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const account = accountLink(user?.role);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md print:static">
      <nav aria-label="Navigation principale" className={`${WRAP} flex h-16 items-center justify-between gap-6`}>
        <Logo />
        <ul className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} className={navLink}>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 lg:flex">
          <div className="mr-2 hidden xl:block">
            <OpeningStatus />
          </div>
          <ThemeToggle />
          {user?.role === "client" ? (
            <UserMenu variant="header" align="right" />
          ) : (
            <Link to={account.to} className="inline-flex min-h-10 items-center rounded-sm px-3 text-sm font-medium text-text transition-colors duration-100 ease-out hover:bg-surface-2">
              {account.label}
            </Link>
          )}
          <Link to="/book" className={buttonClass("brand", "sm")}>
            Réserver
          </Link>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <IconButton label="Ouvrir le menu" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}>
            <List size={24} aria-hidden />
          </IconButton>
        </div>
      </nav>
      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </header>
  );
}

function Footer() {
  const { user } = useAuth();
  const { identity, contact, hours } = useSite().content;
  const tel = telHref(contact.phone);
  const maps = safeLink(contact.mapsUrl);
  const account = accountLink(user?.role);
  const heading = "text-sm font-semibold text-text";
  const link = "inline-flex min-h-10 items-center transition-colors duration-100 ease-out hover:text-text pointer-coarse:min-h-11";
  return (
    <footer className="border-t border-line bg-surface text-sm text-muted">
      <div className={`${WRAP} grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16`}>
        <div className="min-w-0">
          <Logo />
          <p className="mt-4 max-w-xs wrap-anywhere">{identity.description}</p>
        </div>
        <nav aria-label="Pied de page" className="min-w-0">
          <h2 className={heading}>Naviguer</h2>
          <ul className="mt-3">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className={link}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/book" className={link}>
                Réserver
              </Link>
            </li>
            <li>
              <Link to={account.to} className={link}>
                {account.label}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">
          <h2 className={heading}>Horaires</h2>
          {hours.detailed ? (
            <dl className="mt-3 space-y-1.5">
              {weekRows(hours).map((row) => (
                <div key={row.day} className="flex justify-between gap-4">
                  <dt>{row.label}</dt>
                  <dd className={row.open ? "font-mono text-text" : "text-subtle"}>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <>
              <p className="mt-3 font-medium text-text wrap-anywhere">{hours.summary}</p>
              <p className="mt-2">Réserve ton créneau en ligne, ou appelle-nous.</p>
            </>
          )}
        </div>
        <div className="min-w-0">
          <h2 className={heading}>Nous trouver</h2>
          <address className="mt-3 not-italic">
            {contact.address.trim() !== "" && (
              <p className="flex gap-2 py-2 text-text">
                <MapPin size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 wrap-anywhere">{contact.address}</span>
              </p>
            )}
            {maps && (
              <p>
                <a href={maps} className={link}>
                  Voir le salon sur la carte
                </a>
              </p>
            )}
            {tel && (
              <p>
                <a href={tel} className={`${link} font-mono`}>
                  {contact.phone}
                </a>
              </p>
            )}
          </address>
          <SocialLinks contact={contact} />
        </div>
      </div>
      <div className="border-t border-line">
        <div className={`${WRAP} flex flex-col gap-1 pt-5 pb-28 sm:flex-row sm:justify-between lg:pb-5`}>
          <span>© {new Date().getFullYear()} L'Empire Barber</span>
          <span className="min-w-0 wrap-anywhere">{identity.tagline}</span>
        </div>
      </div>
    </footer>
  );
}

/** Thumb-reach booking shortcut under 1024px (spec §7, Fitts), except where booking is already the page */
function MobileBookBar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/book")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur-md lg:hidden print:hidden">
      <Link to="/book" className={buttonClass("brand", "lg", "w-full")}>
        <CalendarBlank size={20} aria-hidden />
        Réserver un rendez-vous
      </Link>
    </div>
  );
}

export default function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a href="#main" className="sr-only rounded-sm bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50">
        Aller au contenu
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" tabIndex={-1} className="min-h-dvh overflow-x-clip outline-none">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileBookBar />
    </>
  );
}
