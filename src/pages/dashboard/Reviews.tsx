import { useState } from "react";
import { ChatCircleText, Trash } from "@phosphor-icons/react";
import CountUp from "../../components/reactbits/CountUp";
import { Button } from "../../components/ui/Button";
import { Avatar, Card, EmptyState, ErrorState, PageHeader, Skeleton, Stars } from "../../components/ui/Display";
import { Select } from "../../components/ui/Field";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, qs } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate } from "../../lib/format";
import type { Barber, Review } from "../../lib/types";

export default function Reviews() {
  const { user } = useAuth();
  const toast = useToast();
  const isBarber = user?.role === "barber";
  const barbers = useFetch<Barber[]>(isBarber ? null : "/users/barbers");
  const [barber, setBarber] = useState(isBarber ? user!._id : "");
  const { data, loading, error, reload } = useFetch<Review[]>(`/reviews${qs({ barber })}`);
  const [rating, setRating] = useState("");
  const table = useTable(data, {
    searchText: (r) => `${r.client.username} ${r.comment ?? ""} ${typeof r.barber === "object" ? r.barber.username : ""}`,
    sorts: [
      { id: "new", label: "Plus récents", cmp: (a, b) => b.createdAt.localeCompare(a.createdAt) },
      { id: "old", label: "Plus anciens", cmp: (a, b) => a.createdAt.localeCompare(b.createdAt) },
      { id: "best", label: "Meilleures notes", cmp: (a, b) => b.rating - a.rating },
      { id: "worst", label: "Moins bonnes notes", cmp: (a, b) => a.rating - b.rating },
    ],
    defaultSort: "new",
    filter: (r) => !rating || r.rating === Number(rating),
    resetKey: `${barber}|${rating}`,
    pageSize: 6,
  });
  const avg = data?.length ? data.reduce((s, r) => s + r.rating, 0) / data.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: data?.filter((r) => r.rating === n).length ?? 0 }));

  const remove = async (id: string) => {
    try {
      await api.delete(`/reviews/${id}`);
      toast("Avis supprimé");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <>
      <PageHeader title="Avis clients" subtitle={isBarber ? "Ce que vos clients disent de vous." : "Les évaluations laissées après chaque visite."} />
      {!isBarber && (
        <div className="mb-6 sm:w-56">
          <Select label="Barber" value={barber} onChange={(e) => setBarber(e.target.value)}>
            <option value="">Tous</option>
            {barbers.data?.map((b) => (
              <option key={b._id} value={b._id}>
                {b.username}
              </option>
            ))}
          </Select>
        </div>
      )}
      <TableToolbar table={table} placeholder="Client ou commentaire…">
        <FilterSelect label="Note" value={rating} onChange={setRating} options={[{ value: "", label: "Toutes" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` }))]} />
      </TableToolbar>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="h-fit">
            <p className="text-sm text-muted">Note moyenne</p>
            <p className="mt-2 font-mono text-5xl leading-none font-medium text-text">
              <CountUp to={avg} decimals={1} />
            </p>
            <div className="mt-3">
              <Stars value={avg} />
            </div>
            <p className="mt-1 text-sm text-muted">
              <span className="font-mono">{data.length}</span> avis
            </p>
            <ul className="mt-6 flex flex-col gap-2">
              {dist.map((d) => (
                <li key={d.n} className="flex items-center gap-4 text-sm">
                  <span className="w-3 font-mono">{d.n}</span>
                  <meter min={0} max={data.length} value={d.count} className="sr-only">
                    {d.count}
                  </meter>
                  <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span className={`block h-full rounded-full bg-primary ${["w-0", "w-1/12", "w-2/12", "w-3/12", "w-4/12", "w-5/12", "w-6/12", "w-7/12", "w-8/12", "w-9/12", "w-10/12", "w-11/12", "w-full"][Math.round((d.count / data.length) * 12)]}`} />
                  </span>
                  <span className="w-6 text-right font-mono text-muted">{d.count}</span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="lg:col-span-2">
          {table.total === 0 && <EmptyState icon={<ChatCircleText size={28} />} title="Aucun résultat" />}
          <ul className="flex flex-col gap-4">
            {table.rows.map((r) => (
              <li key={r._id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={r.client.username} src={r.client.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-semibold">{r.client.username}</p>
                      <p className="text-xs text-muted">
                        {formatDate(r.createdAt)}
                        {typeof r.barber === "object" && !isBarber && ` · ${r.barber.username}`}
                      </p>
                    </div>
                  </div>
                  <Stars value={r.rating} size={14} />
                </div>
                {r.comment && <p className="mt-3 text-sm text-muted">{r.comment}</p>}
                {!isBarber && (
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="ghost" icon={<Trash size={16} aria-hidden />} onClick={() => remove(r._id)}>
                      Supprimer
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination table={table} />
          </div>
        </div>
      )}
      {data?.length === 0 && <EmptyState icon={<ChatCircleText size={28} />} title="Aucun avis pour le moment" />}
    </>
  );
}
