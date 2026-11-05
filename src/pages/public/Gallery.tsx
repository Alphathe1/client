import { ErrorState, Skeleton } from "../../components/ui/Display";
import { useFetch } from "../../lib/useFetch";
import type { PortfolioItem } from "../../lib/types";
import { GalleryGrid } from "./BarberProfile";
import { PageHero } from "./Services";

export default function Gallery() {
  const { data, loading, error, reload } = useFetch<{ items: PortfolioItem[]; cutTypes: string[] }>("/portfolio");
  return (
    <>
      <PageHero title="La galerie" text="Les dernières créations de l'équipe, classées par style : dégradé, barbe, crop, classique." />
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        )}
        {data && <GalleryGrid items={data.items} showBarber />}
      </div>
    </>
  );
}
