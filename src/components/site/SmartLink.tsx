import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { safeLink } from "../../lib/site/links";

/** Owner-entered link: an internal path stays in the app, https:// is a plain link, anything else renders nothing */
export function SmartLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const safe = safeLink(href);
  if (!safe) return null;
  return safe.startsWith("/") ? (
    <Link to={safe} className={className}>
      {children}
    </Link>
  ) : (
    <a href={safe} className={className}>
      {children}
    </a>
  );
}
