import type { SiteContent } from "./types.ts";

/** Hot-linked Unsplash photos the site has used since November: they stay until the owner uploads the salon's own */
const unsplash = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTO = {
  tools: unsplash("1678356163587-6bb3afb89679", 1600),
  fade: unsplash("1759675905700-a1b5efedc05c", 900),
  cutting: unsplash("1547648946-2b1fd7eab923", 900),
  beard: unsplash("1621605815971-fbc98d665033", 900),
};

/** Freeze every nested object and array: shared by every render, the default must never be changed in place */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Today's hard-coded texts, photos and links, as content (spec §6.2).
 * While nothing is published the site renders exactly this; published content is merged onto it (merge.ts).
 * The salon publishes no precise hours: `hours.detailed` stays false and only the summary shows.
 * `hours.days` are the editor's starting values (lot 3), never displayed while `detailed` is false.
 */
export const DEFAULT_CONTENT: SiteContent = deepFreeze<SiteContent>({
  identity: {
    tagline: "Le coiffeur préféré de ton coiffeur préféré",
    description: "Le coiffeur préféré de ton coiffeur préféré. Coupes, dégradés, barbe et rasage à la serviette chaude.",
  },
  contact: {
    phone: "06 58 86 14 45",
    address: "",
    mapsUrl: "https://maps.app.goo.gl/G3odT4f29Yp48sLa6",
    instagram: "https://instagram.com/lempire_barber",
    tiktok: "https://www.tiktok.com/@lempire_barber",
  },
  hours: {
    detailed: false,
    summary: "Ouvert 7j/7",
    days: ([1, 2, 3, 4, 5, 6, 0] as const).map((day) => ({ day, open: true, start: "09:00", end: "19:00" })),
  },
  announcement: { enabled: false, text: "", linkLabel: "", linkTo: "" },
  home: {
    order: ["hero", "features", "salon", "prices", "highlights", "team", "testimonial", "invitation"],
    hidden: [],
    hero: {
      title: "Le coiffeur préféré de ton coiffeur préféré.",
      text: "Dégradés, barbe et rasage à la serviette chaude. On est ouverts tous les jours : choisis ta prestation et réserve ton créneau.",
      image: PHOTO.tools,
      cta: "Réserver",
    },
    features: {
      items: [
        { icon: "scissors", title: "Dégradés précis", text: "Dégradés zéro, taper et textures travaillés à la lame et à la tondeuse." },
        { icon: "drop", title: "Produits premium", text: "Des pommades et soins sélectionnés pour une finition qui tient." },
        { icon: "shield", title: "Salon impeccable", text: "Outils désinfectés et lames neuves à chaque client." },
        { icon: "ruler", title: "Finitions nettes", text: "Contours et lignes tracés au rasoir pour un résultat net." },
      ],
    },
    salon: {
      kicker: "Le salon",
      title: "Un salon, pas une chaîne.",
      points: [
        { title: "On prend le temps", text: "La durée indiquée pour chaque prestation est entièrement réservée pour vous. Personne n'attend derrière." },
        { title: "On écoute d'abord", text: "Longueur, nuque, contour de barbe : vous expliquez, le barber propose, puis il coupe." },
      ],
      images: [PHOTO.fade, PHOTO.cutting],
    },
    prices: { title: "Les tarifs", text: "Des prix fixes, réglés au salon. Touchez une prestation pour la réserver." },
    highlights: {
      items: [
        { image: PHOTO.fade, title: "Dégradés précis", text: "Des transitions nettes et des lignes franches, adaptées à la forme de votre tête." },
        { image: PHOTO.beard, title: "Barbe & rasage", text: "Rasage à la serviette chaude, tailles de barbe et soins du visage." },
      ],
    },
    team: { title: "L'équipe", text: "Rencontrez nos barbers, spécialistes du dégradé et de la coupe." },
    invitation: {
      title: "Ton fauteuil t'attend.",
      text: "Choisis la prestation, le barber et le créneau. La confirmation est immédiate.",
      sign: "Souris, tu es chez L'Empire !",
    },
  },
  pages: {
    services: { title: "Les tarifs", text: "Des prix fixes, réglés au salon. La durée indiquée est entièrement réservée pour vous." },
    barbers: { title: "Nos barbers", text: "Chaque barber a sa signature. Découvrez leurs réalisations et les avis de leurs clients avant de choisir." },
    gallery: { title: "La galerie", text: "Les dernières créations de l'équipe, classées par style : dégradé, barbe, crop, classique." },
  },
});
