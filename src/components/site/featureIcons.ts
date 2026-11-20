import { Armchair, Circle, Clock, Coffee, Drop, HairDryer, Medal, Ruler, Scissors, ShieldCheck, Sparkle, Star, Towel, type Icon } from "@phosphor-icons/react";
import type { FeatureIcon } from "../../lib/site/types";

/** The closed list of feature icons (spec §6.2) mapped to Phosphor; the editor's icon picker (lot 3) reuses both tables */
export const FEATURE_ICON: Record<FeatureIcon, Icon> = {
  scissors: Scissors,
  drop: Drop,
  shield: ShieldCheck,
  ruler: Ruler,
  star: Star,
  clock: Clock,
  armchair: Armchair,
  sparkle: Sparkle,
  towel: Towel,
  dryer: HairDryer,
  medal: Medal,
  coffee: Coffee,
};

export const FEATURE_ICON_LABEL: Record<FeatureIcon, string> = {
  scissors: "Ciseaux",
  drop: "Goutte",
  shield: "Bouclier",
  ruler: "Règle",
  star: "Étoile",
  clock: "Horloge",
  armchair: "Fauteuil",
  sparkle: "Éclat",
  towel: "Serviette",
  dryer: "Sèche-cheveux",
  medal: "Médaille",
  coffee: "Café",
};

/** Icon of a stored id. Cached or previewed content may hold an id outside the list: it gets a neutral icon, never a crash. */
export function featureIcon(id: string): Icon {
  return Object.hasOwn(FEATURE_ICON, id) ? FEATURE_ICON[id as FeatureIcon] : Circle;
}
