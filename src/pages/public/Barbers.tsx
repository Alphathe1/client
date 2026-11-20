import { Users } from "@phosphor-icons/react";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Display";
import { BarberCard } from "../../components/site/BarberCard";
import { PageIntro } from "../../components/site/PageIntro";
import { SECTION, WRAP } from "../../components/site/styles";
import { useSite } from "../../context/SiteContext";
import { useFetch } from "../../lib/useFetch";
import type { Barber } from "../../lib/types";

export default function Barbers() {
  const { title, text } = useSite().content.pages.barbers;
  const { data, loading, error, reload } = useFetch<Barber[]>("/users/barbers");
  return (
    <>
      <PageIntro title={title} text={text} />
      <div className={`${WRAP} ${SECTION}`}>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-4/5" />
            ))}
          </div>
        ) : data?.length ? (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((b) => (
              <li key={b._id} className="min-w-0">
                <BarberCard barber={b} headingLevel="h2" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Users size={24} />} title="Aucun barber pour le moment" text="L'équipe sera présentée ici." />
        )}
      </div>
    </>
  );
}
