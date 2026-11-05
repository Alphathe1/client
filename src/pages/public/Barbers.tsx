import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Display";
import { useFetch } from "../../lib/useFetch";
import type { Barber } from "../../lib/types";
import { BarberCard } from "./Home";
import { PageHero } from "./Services";

export default function Barbers() {
  const { data, loading, error, reload } = useFetch<Barber[]>("/users/barbers");
  return (
    <>
      <PageHero title="Nos barbers" text="Chaque barber a sa signature. Découvrez leurs réalisations et les avis de leurs clients avant de choisir." />
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
        {error && <ErrorState message={error} onRetry={reload} />}
        <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
          {data?.map((b) => (
            <BarberCard key={b._id} barber={b} />
          ))}
        </div>
        {data?.length === 0 && <EmptyState title="Aucun barber pour le moment" />}
      </div>
    </>
  );
}
