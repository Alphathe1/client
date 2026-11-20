import { FEATURE_ICONS, HOME_SECTION_IDS, type SiteContent } from "./types.ts";

/** Field limits (spec §6.2). server/src/validation/site.ts declares the same table; server/tests/site.test.ts checks both match. */
export const LIMITS = {
  tagline: 90,
  description: 200,
  phoneMin: 6,
  phoneMax: 24,
  address: 140,
  url: 500,
  hoursSummary: 60,
  announcementText: 140,
  announcementLinkLabel: 30,
  heroTitle: 90,
  heroText: 240,
  heroCta: 24,
  featuresMin: 2,
  featuresMax: 4,
  featureTitle: 40,
  featureText: 140,
  salonKicker: 30,
  salonTitle: 70,
  salonPointsMin: 1,
  salonPointsMax: 3,
  salonPointTitle: 50,
  salonPointText: 240,
  salonImagesMax: 2,
  pricesTitle: 50,
  pricesText: 160,
  highlightsMin: 1,
  highlightsMax: 2,
  highlightTitle: 50,
  highlightText: 160,
  teamTitle: 50,
  teamText: 160,
  invitationTitle: 70,
  invitationText: 160,
  invitationSign: 50,
  pageTitle: 40,
  pageText: 200,
} as const;

/** Same sources as the server's PATTERNS (checked by server/tests/site.test.ts) */
export const PATTERNS = {
  phone: /^[0-9 +().-]+$/,
  time: /^([01]\d|2[0-3]):[0-5]\d$/,
  https: /^https:\/\/[^\s"'<>]+$/,
  /** "/…" inside the site; "//host" and "/\host" would leave it (browsers read a backslash as a slash) */
  internalPath: /^\/(?!\/)[^\s"'<>\\]*$/,
  mediaPath: /^\/site\/media\/[a-f0-9]{24}$/,
  imagesPath: /^\/images\/[\w-]+(?:\/[\w-]+)*\.(?:jpe?g|png|webp)$/,
} as const;

export const MESSAGES = {
  required: "Champ obligatoire.",
  max: (n: number) => `${n} caractères au maximum.`,
  count: (min: number, max: number) => (min === 0 ? `${max} au maximum.` : `De ${min} à ${max} éléments.`),
  phone: "De 6 à 24 caractères : chiffres, espaces et + ( ) . -",
  link: "Adresse commençant par https://, ou rien.",
  linkOrPath: "Adresse commençant par https://, ou chemin du site commençant par /.",
  image: "Image envoyée, adresse https:// ou chemin /images/…",
  imageRequired: "Choisissez une image ou retirez cet emplacement.",
  icon: "Icône inconnue.",
  time: "Heure au format HH:mm, par exemple 09:00.",
  timeOrder: "L'heure de fermeture doit suivre l'heure d'ouverture.",
  day: "Jour inconnu.",
  days: "Les sept jours doivent figurer une fois chacun.",
  order: "Chaque section doit figurer une fois.",
  section: "Section inconnue.",
  hidden: "Section masquée en double.",
  linkTo: "Indiquez où mène le lien.",
  linkLabel: "Indiquez le texte du lien.",
} as const;

export interface SiteIssue {
  /** dotted path of the field, indices included ("home.features.items.1.title"), as the server's zod issues */
  path: string;
  message: string;
}

export const isLink = (value: string) => value === "" || PATTERNS.https.test(value);
export const isLinkOrPath = (value: string) => isLink(value) || PATTERNS.internalPath.test(value);
export const isImage = (value: string) =>
  value === "" || PATTERNS.https.test(value) || PATTERNS.mediaPath.test(value) || PATTERNS.imagesPath.test(value);

/** Every problem in `c`, field by field. Each rule runs on its own, like zod on the server, so both name the same fields. */
export function validateContent(c: SiteContent): SiteIssue[] {
  const issues: SiteIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  const text = (path: string, value: string, max: number, required = true) => {
    if (required && value.trim() === "") add(path, MESSAGES.required);
    if (value.length > max) add(path, MESSAGES.max(max));
  };
  const url = (path: string, value: string, ok: (v: string) => boolean, message: string) => {
    if (value.length > LIMITS.url) add(path, MESSAGES.max(LIMITS.url));
    if (!ok(value)) add(path, message);
  };
  const count = (path: string, list: readonly unknown[], min: number, max: number) => {
    if (list.length < min || list.length > max) add(path, MESSAGES.count(min, max));
  };

  text("identity.tagline", c.identity.tagline, LIMITS.tagline);
  text("identity.description", c.identity.description, LIMITS.description);

  const { phone } = c.contact;
  if (phone.length < LIMITS.phoneMin || phone.length > LIMITS.phoneMax || !PATTERNS.phone.test(phone)) add("contact.phone", MESSAGES.phone);
  text("contact.address", c.contact.address, LIMITS.address, false);
  url("contact.mapsUrl", c.contact.mapsUrl, isLink, MESSAGES.link);
  url("contact.instagram", c.contact.instagram, isLink, MESSAGES.link);
  url("contact.tiktok", c.contact.tiktok, isLink, MESSAGES.link);

  text("hours.summary", c.hours.summary, LIMITS.hoursSummary);
  const days = c.hours.days;
  if (days.length !== 7 || new Set(days.map((d) => d.day)).size !== days.length) add("hours.days", MESSAGES.days);
  days.forEach((d, i) => {
    const p = `hours.days.${i}`;
    if (!Number.isInteger(d.day) || d.day < 0 || d.day > 6) add(`${p}.day`, MESSAGES.day);
    if (!PATTERNS.time.test(d.start)) add(`${p}.start`, MESSAGES.time);
    if (!PATTERNS.time.test(d.end)) add(`${p}.end`, MESSAGES.time);
    // "HH:mm" strings compare in time order; same raw comparison as the server
    if (d.open && !(d.start < d.end)) add(`${p}.end`, MESSAGES.timeOrder);
  });

  const a = c.announcement;
  text("announcement.text", a.text, LIMITS.announcementText, a.enabled);
  text("announcement.linkLabel", a.linkLabel, LIMITS.announcementLinkLabel, false);
  url("announcement.linkTo", a.linkTo, isLinkOrPath, MESSAGES.linkOrPath);
  if (a.linkLabel.trim() !== "" && a.linkTo === "") add("announcement.linkTo", MESSAGES.linkTo);
  if (a.linkTo !== "" && a.linkLabel.trim() === "") add("announcement.linkLabel", MESSAGES.linkLabel);

  const h = c.home;
  h.order.forEach((id, i) => {
    if (!HOME_SECTION_IDS.includes(id)) add(`home.order.${i}`, MESSAGES.section);
  });
  if (h.order.length !== HOME_SECTION_IDS.length || new Set(h.order).size !== h.order.length) add("home.order", MESSAGES.order);
  h.hidden.forEach((id, i) => {
    if (!HOME_SECTION_IDS.includes(id)) add(`home.hidden.${i}`, MESSAGES.section);
  });
  if (h.hidden.length > HOME_SECTION_IDS.length || new Set(h.hidden).size !== h.hidden.length) add("home.hidden", MESSAGES.hidden);

  text("home.hero.title", h.hero.title, LIMITS.heroTitle);
  text("home.hero.text", h.hero.text, LIMITS.heroText);
  url("home.hero.image", h.hero.image, isImage, MESSAGES.image);
  text("home.hero.cta", h.hero.cta, LIMITS.heroCta);

  count("home.features.items", h.features.items, LIMITS.featuresMin, LIMITS.featuresMax);
  h.features.items.forEach((f, i) => {
    const p = `home.features.items.${i}`;
    if (!FEATURE_ICONS.includes(f.icon)) add(`${p}.icon`, MESSAGES.icon);
    text(`${p}.title`, f.title, LIMITS.featureTitle);
    text(`${p}.text`, f.text, LIMITS.featureText);
  });

  text("home.salon.kicker", h.salon.kicker, LIMITS.salonKicker);
  text("home.salon.title", h.salon.title, LIMITS.salonTitle);
  count("home.salon.points", h.salon.points, LIMITS.salonPointsMin, LIMITS.salonPointsMax);
  h.salon.points.forEach((point, i) => {
    text(`home.salon.points.${i}.title`, point.title, LIMITS.salonPointTitle);
    text(`home.salon.points.${i}.text`, point.text, LIMITS.salonPointText);
  });
  count("home.salon.images", h.salon.images, 0, LIMITS.salonImagesMax);
  h.salon.images.forEach((src, i) => {
    const p = `home.salon.images.${i}`;
    if (src === "") add(p, MESSAGES.imageRequired);
    else url(p, src, isImage, MESSAGES.image);
  });

  text("home.prices.title", h.prices.title, LIMITS.pricesTitle);
  text("home.prices.text", h.prices.text, LIMITS.pricesText);

  count("home.highlights.items", h.highlights.items, LIMITS.highlightsMin, LIMITS.highlightsMax);
  h.highlights.items.forEach((item, i) => {
    const p = `home.highlights.items.${i}`;
    url(`${p}.image`, item.image, isImage, MESSAGES.image);
    text(`${p}.title`, item.title, LIMITS.highlightTitle);
    text(`${p}.text`, item.text, LIMITS.highlightText);
  });

  text("home.team.title", h.team.title, LIMITS.teamTitle);
  text("home.team.text", h.team.text, LIMITS.teamText);
  text("home.invitation.title", h.invitation.title, LIMITS.invitationTitle);
  text("home.invitation.text", h.invitation.text, LIMITS.invitationText);
  text("home.invitation.sign", h.invitation.sign, LIMITS.invitationSign);

  for (const page of ["services", "barbers", "gallery"] as const) {
    text(`pages.${page}.title`, c.pages[page].title, LIMITS.pageTitle);
    text(`pages.${page}.text`, c.pages[page].text, LIMITS.pageText);
  }

  return issues;
}
