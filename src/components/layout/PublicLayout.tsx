import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { List, X } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { useAuth } from "../../context/AuthContext";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "../../context/ThemeContext";
import { ErrorBoundary } from "../ErrorBoundary";
import { buttonClass } from "../ui/Button";
import { shopStatus } from "../../lib/shopStatus";

const NAV = [
  { to: "/services", label: "Prestations" },
  { to: "/barbers", label: "Barbers" },
  { to: "/gallery", label: "Galerie" },
];

const navLink = ({ isActive }: { isActive: boolean }) =>
  `py-2 text-[15px] font-medium transition-colors hover:text-text ${isActive ? "text-text" : "text-muted"}`;

/** Live open/closed state, so visitors know before they scroll */
function OpenNow() {
  const s = shopStatus();
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className={`size-2 rounded-full ${s.open ? "bg-success" : "bg-danger"}`} />
      <span>
        <span className="font-semibold text-text">{s.text}</span> · {s.sub}
      </span>
    </p>
  );
}

function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-lg">
      <a href="#main" className="sr-only bg-gold px-4 py-2 text-onaccent focus:not-sr-only focus:absolute focus:top-2 focus:left-2">
        Aller au contenu
      </a>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-8 px-6 sm:px-10" aria-label="Navigation principale">
        <Logo />
        <ul className="hidden items-center gap-9 lg:flex">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} className={navLink}>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-6 lg:flex">
          <div className="hidden xl:block">
            <OpenNow />
          </div>
          <ThemeToggle />
          {user?.role === "client" ? (
            <UserMenu variant="header" align="right" />
          ) : (
            <Link to={user ? "/dashboard" : "/login"} className="text-[15px] font-medium text-text transition-colors hover:text-muted">
              {user ? "Tableau de bord" : "Connexion"}
            </Link>
          )}
          <Link to="/book" className={buttonClass("pole", "sm")}>
            Réserver
          </Link>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex size-11 cursor-pointer items-center justify-center text-text"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {open ? <X size={26} /> : <List size={26} />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <ul className="flex flex-col px-6 pt-4">
              {NAV.map((n) => (
                <li key={n.to} className="border-b border-line">
                  <NavLink to={n.to} className="block py-4 font-display text-4xl font-bold uppercase">
                    {n.label}
                  </NavLink>
                </li>
              ))}
              <li className="border-b border-line">
                <Link to={user ? "/dashboard" : "/login"} className="block py-4 font-display text-4xl font-bold uppercase">
                  {user ? (user.role === "client" ? "Mon compte" : "Tableau de bord") : "Connexion"}
                </Link>
              </li>
            </ul>
            <div className="px-6 py-6">
              <OpenNow />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  const heading = "font-display text-xl font-bold text-on-field uppercase";
  const link = "transition-colors duration-150 hover:text-on-field";
  return (
    <footer className="bg-field text-on-field-secondary">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        <div>
          <p className="font-sign text-3xl font-bold tracking-wide text-brass">L'EMPIRE</p>
          <p className="mt-1 font-sign text-xs font-semibold tracking-[0.55em]">BARBER</p>
          <p className="mt-5 max-w-xs">Le coiffeur préféré de ton coiffeur préféré. Coupes, dégradés, barbe et rasage à la serviette chaude.</p>
        </div>
        <div>
          <h2 className={heading}>Naviguer</h2>
          <ul className="mt-5 space-y-3">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className={link}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/login" className={link}>
                Connexion
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={heading}>Horaires</h2>
          <p className="mt-5 text-on-field">Ouvert 7j/7</p>
          <p className="mt-3">Réserve ton créneau en ligne, ou appelle-nous.</p>
        </div>
        <div>
          <h2 className={heading}>Nous trouver</h2>
          <address className="mt-5 space-y-3 not-italic">
            <p>
              <a href="https://maps.app.goo.gl/G3odT4f29Yp48sLa6" className={link}>
                Voir le salon sur Google Maps
              </a>
            </p>
            <p>
              <a href="tel:0658861445" className={link}>
                06 58 86 14 45
              </a>
            </p>
          </address>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 pb-28 text-sm sm:flex-row sm:justify-between sm:px-10 lg:pb-6">
          <span>© {new Date().getFullYear()} L'Empire Barber</span>
          <a href="https://instagram.com/lempire_barber" className={link}>
            @lempire_barber
          </a>
        </div>
      </div>
    </footer>
  );
}

/** Thumb-reach booking shortcut on small screens, hidden where booking or sign-in is already the page */
function MobileBookBar() {
  const { pathname } = useLocation();
  if (/^\/(book|login|register)/.test(pathname)) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg p-3 lg:hidden">
      <Link to="/book" className={buttonClass("pole", "lg", "w-full")}>
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
      <Header />
      <main id="main" className="min-h-dvh overflow-x-clip">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileBookBar />
    </>
  );
}
