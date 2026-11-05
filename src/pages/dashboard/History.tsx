import { Scissors } from "@phosphor-icons/react";
import CountUp from "../../components/reactbits/CountUp";
import { PrestationCard } from "../../components/PrestationCard";
import { LinkButton } from "../../components/ui/Button";
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { useFetch } from "../../lib/useFetch";
import type { Prestation } from "../../lib/types";

export default function History() {
  const { data, loading, error, reload } = useFetch<Prestation[]>("/prestations");
  const table = useTable(data, {
    searchText: (p) => `${p.service.name} ${p.barber.username} ${p.cutType ?? ""} ${p.notes ?? ""}`,
    sorts: [
      { id: "new", label: "Plus récentes", cmp: (a, b) => b.date.localeCompare(a.date) },
      { id: "old", label: "Plus anciennes", cmp: (a, b) => a.date.localeCompare(b.date) },
      { id: "price", label: "Prix : décroissant", cmp: (a, b) => b.price - a.price },
    ],
    defaultSort: "new",
    pageSize: 6,
  });
  const total = data?.reduce((s, p) => s + p.price, 0) ?? 0;
  return (
    <>
      <PageHeader title="Mon historique" subtitle="Toutes vos coupes, avec les notes de votre barber et les photos." />
      {data && data.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-6 sm:w-fit">
          <Card>
            <p className="text-sm text-muted">Visites</p>
            <p className="font-display text-5xl text-accent font-medium">
              <CountUp to={data.length} />
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Fidélité</p>
            <p className="font-display text-5xl font-medium">
              <CountUp to={total} suffix=" DA" />
            </p>
          </Card>
        </div>
      )}
      <TableToolbar table={table} placeholder="Coupe, barber, note…" />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && <Skeleton className="h-64" />}
      {data?.length === 0 && <EmptyState icon={<Scissors size={28} />} title="Aucune visite pour l'instant" action={<LinkButton to="/book">Réserver ma première coupe</LinkButton>} />}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {table.rows.map((p) => (
          <PrestationCard key={p._id} p={p} showClient={false} />
        ))}
      </div>
      <Pagination table={table} />
    </>
  );
}
