import { ErrorState, Skeleton } from "../../components/ui/Display";
import { GalleryGrid } from "../../components/site/GalleryGrid";
import { PageIntro } from "../../components/site/PageIntro";
import { SECTION, WRAP } from "../../components/site/styles";
import { useSite } from "../../context/SiteContext";
import { useFetch } from "../../lib/useFetch";
import type { PortfolioItem } from "../../lib/types";

export default function Gallery() {
  const { title, text } = useSite().content.pages.gallery;
  const { data, loading, error, reload } = useFetch<{ items: PortfolioItem[]; cutTypes: string[] }>("/portfolio");
  return (
    <>
      <PageIntro title={title} text={text} />
      <div className={`${WRAP} ${SECTION}`}>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : (
          <GalleryGrid items={data?.items ?? []} showBarber />
        )}
      </div>
    </>
  );
}
