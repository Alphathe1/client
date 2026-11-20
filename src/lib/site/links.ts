import type { SiteContent } from "./types.ts";
import { PATTERNS } from "./validate.ts";

/** href for an owner-entered link: https:// or an internal path; anything else (javascript:, //host, http:) gives "" */
export function safeLink(value: string): string {
  return PATTERNS.https.test(value) || PATTERNS.internalPath.test(value) ? value : "";
}

/** tel: link from a displayed number ("06 58 86 14 45" → "tel:0658861445"); "" when there is nothing to dial */
export function telHref(phone: string): string {
  const dialable = phone.replace(/[^\d+]/g, "");
  return /\d/.test(dialable) ? `tel:${dialable}` : "";
}

/** "@handle" from a profile address (instagram.com/x, tiktok.com/@x); "" when the address can't be read */
export function socialHandle(url: string): string {
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0];
    return first ? `@${first.replace(/^@/, "")}` : "";
  } catch {
    return "";
  }
}

export interface SocialLink {
  network: "instagram" | "tiktok";
  label: string;
  href: string;
  handle: string;
}

/** The salon's profiles that are filled in, as external https:// links */
export function socialLinks(contact: Pick<SiteContent["contact"], "instagram" | "tiktok">): SocialLink[] {
  const links: SocialLink[] = [];
  const add = (network: SocialLink["network"], label: string, url: string) => {
    const href = safeLink(url);
    if (href.startsWith("https://")) links.push({ network, label, href, handle: socialHandle(href) });
  };
  add("instagram", "Instagram", contact.instagram);
  add("tiktok", "TikTok", contact.tiktok);
  return links;
}

/** `src` for an image value: uploads are served by the API (/site/media/… → <apiBase>/site/media/…); an invalid value gives "" */
export function mediaSrc(value: string, apiBase: string): string {
  if (PATTERNS.mediaPath.test(value)) return `${apiBase}${value}`;
  return PATTERNS.https.test(value) || PATTERNS.imagesPath.test(value) ? value : "";
}
