import { Phone, Scissors } from "@phosphor-icons/react";
import { buttonClass } from "../ui/Button";
import { EmptyState } from "../ui/Display";
import { useSite } from "../../context/SiteContext";
import { telHref } from "../../lib/site/links";

/** No service is bookable online: say so, and give the salon's number */
export function ServicesEmpty() {
  const { phone } = useSite().content.contact;
  const tel = telHref(phone);
  return (
    <EmptyState
      icon={<Scissors size={24} />}
      title="Aucune prestation en ligne pour le moment"
      text="Appelez le salon pour connaître les tarifs et réserver."
      action={
        tel ? (
          <a href={tel} className={buttonClass("secondary", "sm")}>
            <Phone size={16} aria-hidden />
            <span className="font-mono">{phone}</span>
          </a>
        ) : undefined
      }
    />
  );
}
