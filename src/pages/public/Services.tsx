import { LinkButton } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Display";
import { PageIntro } from "../../components/site/PageIntro";
import { PriceRow } from "../../components/site/PriceRow";
import { ServicesEmpty } from "../../components/site/ServicesEmpty";
import { SECTION, WRAP } from "../../components/site/styles";
import { useSite } from "../../context/SiteContext";
import { useFetch } from "../../lib/useFetch";
import type { Service } from "../../lib/types";

export default function Services() {
  const { title, text } = useSite().content.pages.services;
  const { data, loading, error, reload } = useFetch<Service[]>("/services");
  const groups = new Map<string, Service[]>();
  for (const s of data ?? []) {
    const category = s.category || "Autres";
    groups.set(category, [...(groups.get(category) ?? []), s]);
  }

  return (
    <>
      <PageIntro title={title} text={text} />
      <div className={`${WRAP} ${SECTION}`}>
        <div className="max-w-4xl">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : groups.size === 0 ? (
            <ServicesEmpty />
          ) : (
            <>
              <div className="flex flex-col gap-14">
                {[...groups].map(([category, services], i) => (
                  <section key={category} aria-labelledby={`category-${i}`}>
                    <h2 id={`category-${i}`} className="text-2xl font-semibold text-text wrap-anywhere">
                      {category}
                    </h2>
                    <ul className="mt-4 divide-y divide-line border-y border-line">
                      {services.map((s) => (
                        <li key={s._id}>
                          <PriceRow service={s} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <LinkButton to="/book" variant="brand" size="lg" className="mt-14">
                Réserver un rendez-vous
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </>
  );
}
