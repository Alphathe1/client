import { InstagramLogo, TiktokLogo } from "@phosphor-icons/react";
import type { SiteContent } from "../../lib/site/types";
import { socialLinks } from "../../lib/site/links";

/** Icon per social network: the one place the footer and the invitation draw them */
export const SOCIAL_ICON = { instagram: InstagramLogo, tiktok: TiktokLogo };

/** The salon's filled-in profiles as icon links; renders nothing when there are none */
export function SocialLinks({ contact }: { contact: Pick<SiteContent["contact"], "instagram" | "tiktok"> }) {
  const socials = socialLinks(contact);
  if (socials.length === 0) return null;
  return (
    <ul className="mt-2 flex gap-1">
      {socials.map((s) => {
        const Icon = SOCIAL_ICON[s.network];
        return (
          <li key={s.network}>
            <a
              href={s.href}
              aria-label={s.handle ? `${s.label} : ${s.handle}` : s.label}
              className="flex size-10 items-center justify-center rounded-sm transition-colors duration-100 ease-out hover:bg-surface-2 hover:text-text pointer-coarse:size-11"
            >
              <Icon size={20} aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
