/** Content of the public site, edited by the owner (spec §6.2).
 *  Pure module, like everything in lib/site: no React, no Vite — the Node test runner imports these files
 *  directly, which is why they import each other with explicit `.ts` extensions. */

export const HOME_SECTION_IDS = ["hero", "features", "salon", "prices", "highlights", "team", "testimonial", "invitation"] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

/** Section names, as the editor's structure panel shows them (lot 3) */
export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  hero: "En-tête",
  features: "Atouts",
  salon: "Le salon",
  prices: "Tarifs",
  highlights: "Mises en avant",
  team: "Équipe",
  testimonial: "Avis",
  invitation: "Invitation",
};

/** The closed list of feature icons (spec §6.2) */
export const FEATURE_ICONS = ["scissors", "drop", "shield", "ruler", "star", "clock", "armchair", "sparkle", "towel", "dryer", "medal", "coffee"] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

/** 0 = Sunday … 6 = Saturday, as Date.getDay() */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayHours {
  day: Weekday;
  open: boolean;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
}

export interface PageCopy {
  title: string;
  text: string;
}

export type InnerPage = "services" | "barbers" | "gallery";

export interface SiteContent {
  identity: { tagline: string; description: string };
  contact: {
    phone: string;
    /** optional: "" when the salon does not publish it */
    address: string;
    /** https:// or "" */
    mapsUrl: string;
    instagram: string;
    tiktok: string;
  };
  hours: {
    /** false: only `summary` is shown and no hours are computed */
    detailed: boolean;
    summary: string;
    days: DayHours[];
  };
  announcement: { enabled: boolean; text: string; linkLabel: string; linkTo: string };
  home: {
    order: HomeSectionId[];
    hidden: HomeSectionId[];
    hero: { title: string; text: string; image: string; cta: string };
    features: { items: { icon: FeatureIcon; title: string; text: string }[] };
    salon: { kicker: string; title: string; points: { title: string; text: string }[]; images: string[] };
    prices: PageCopy;
    highlights: { items: { image: string; title: string; text: string }[] };
    team: PageCopy;
    invitation: { title: string; text: string; sign: string };
  };
  pages: Record<InnerPage, PageCopy>;
}

/** What GET /site returns. `content` is whatever was published — possibly by an older model — and null while nothing is. */
export interface SiteResponse {
  content: unknown;
  updatedAt: string | null;
}

/** Where the published content on screen comes from */
export type SiteSource = "default" | "cache" | "server";
