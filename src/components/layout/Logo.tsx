import { Link } from "react-router-dom";

/** The gold salon sign, as a wordmark: engraved capitals in brass */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex flex-col leading-none" aria-label="L'Empire Barber — accueil">
      <span className="font-sign text-2xl font-bold tracking-wide text-brand">L'EMPIRE</span>
      {!compact && <span className="mt-1 font-sign text-xs font-semibold tracking-[0.55em] text-subtle">BARBER</span>}
    </Link>
  );
}
