import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CashRegister, Check, CreditCard, Money, Receipt, Trash } from "@phosphor-icons/react";
import CountUp from "../../components/reactbits/CountUp";
import { Button, LinkButton } from "../../components/ui/Button";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton } from "../../components/ui/Display";
import { FilterSelect, Pagination, TableToolbar, useTable } from "../../components/ui/DataTools";
import { Input, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";
import { api, qs } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatPrice, formatTime, toDateKey } from "../../lib/format";
import type { ClientSummary, PaymentMethod, Prestation, RegisterSummary, Service, User } from "../../lib/types";

const DEFAULT_RATE = 0.5;

/** Selectable card (spec §4): line at rest, line-strong on hover, brand outline on brand/8 once chosen */
const tile = (active: boolean) =>
  `flex cursor-pointer flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors duration-100 ease-out sm:p-5 ${
    active ? "border-brand bg-brand/8" : "border-line bg-surface hover:border-line-strong"
  }`;

function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-base font-semibold text-text">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-full border border-line-strong font-mono text-xs font-medium text-muted">
        {n}
      </span>
      {children}
    </h2>
  );
}

export default function Caisse() {
  const toast = useToast();
  const today = toDateKey(new Date());
  const [day, setDay] = useState(today);
  const isToday = day === today;

  const barbersReq = useFetch<User[]>("/users?role=barber");
  const servicesReq = useFetch<Service[]>("/services");
  const clientsReq = useFetch<ClientSummary[]>("/clients");
  const register = useFetch<RegisterSummary>(`/caisse${qs({ from: day, to: day })}`);
  const barbers = useMemo(() => barbersReq.data?.filter((b) => b.isActive) ?? [], [barbersReq.data]);

  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [price, setPrice] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState<Prestation | null>(null);

  const barber = barbers.find((b) => b._id === barberId);
  const service = servicesReq.data?.find((s) => s._id === serviceId);
  const rate = barber?.commissionRate ?? DEFAULT_RATE;
  const amount = price === "" ? (service?.price ?? 0) : Number(price);
  const commission = Math.round(amount * rate);

  // the price field follows the chosen service until the cashier edits it
  useEffect(() => {
    setPrice(service ? String(service.price) : "");
  }, [service]);

  const checkout = async () => {
    if (!barber || !service) return;
    setBusy(true);
    try {
      await api.post("/caisse/sales", {
        barber: barber._id,
        service: service._id,
        price: Math.round(amount),
        paymentMethod: method,
        ...(clientId ? { client: clientId } : {}),
      });
      toast(`${service.name} · ${barber.username} — ${formatPrice(amount)} encaissé`);
      // keep the barber selected: they often chain several clients
      setServiceId("");
      setClientId("");
      setMethod("cash");
      register.reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const cancelSale = async () => {
    if (!cancelling) return;
    try {
      await api.delete(`/caisse/sales/${cancelling._id}`);
      toast("Encaissement annulé");
      setCancelling(null);
      register.reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const totals = register.data?.totals;
  const [payFilter, setPayFilter] = useState("");
  const [barberFilter, setBarberFilter] = useState("");
  const salesTable = useTable(register.data?.sales, {
    searchText: (s) => `${s.service.name} ${s.barber.username} ${s.client?.username ?? ""} ${s.ticketNumber ?? ""}`,
    sorts: [
      { id: "new", label: "Plus récents", cmp: (a, b) => b.date.localeCompare(a.date) },
      { id: "old", label: "Plus anciens", cmp: (a, b) => a.date.localeCompare(b.date) },
      { id: "price-desc", label: "Montant : décroissant", cmp: (a, b) => b.price - a.price },
      { id: "price-asc", label: "Montant : croissant", cmp: (a, b) => a.price - b.price },
    ],
    defaultSort: "new",
    filter: (s) => (!payFilter || s.paymentMethod === payFilter) && (!barberFilter || s.barber._id === barberFilter),
    resetKey: `${day}|${payFilter}|${barberFilter}`,
    pageSize: 6,
  });

  return (
    <>
      <PageHeader
        title="Journal de caisse"
        subtitle="Encaissements, commissions à verser et part du salon. Pour un ticket complet (plusieurs coiffures, remise, rendu monnaie), ouvrez le terminal."
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <LinkButton to="/caisse" variant="primary" icon={<CashRegister size={18} aria-hidden />}>
              Ouvrir le terminal
            </LinkButton>
            <div className="w-44">
              <Input label="Journée" type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} />
            </div>
            {!isToday && (
              <Button variant="secondary" onClick={() => setDay(today)}>
                Aujourd'hui
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-12 xl:grid-cols-12">
        {/* ───────── ring up ───────── */}
        <section className="xl:col-span-7" aria-label="Nouvel encaissement">
          {!isToday ? (
            <EmptyState icon={<CashRegister size={28} />} title="Consultation d'une journée passée" text="Les encaissements se font sur la journée en cours." action={<Button onClick={() => setDay(today)}>Revenir à aujourd'hui</Button>} />
          ) : (
            <div className="flex flex-col gap-12">
              <div>
                <StepTitle n={1}>Barber</StepTitle>
                {barbersReq.error && <ErrorState message={barbersReq.error} onRetry={barbersReq.reload} />}
                {barbersReq.loading && <Skeleton className="h-28" />}
                {!barbersReq.loading && !barbersReq.error && barbers.length === 0 && <EmptyState title="Aucun barber actif" text="Ajoutez un barber depuis la page Équipe." />}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {barbers.map((b) => (
                    <button key={b._id} onClick={() => setBarberId(b._id)} aria-pressed={barberId === b._id} className={tile(barberId === b._id)}>
                      <Avatar name={b.username} src={b.avatarUrl} />
                      <span className="text-base font-medium text-text">{b.username}</span>
                      <span className="text-xs text-muted">
                        Commission <span className="font-mono">{Math.round((b.commissionRate ?? DEFAULT_RATE) * 100)} %</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <StepTitle n={2}>Coiffure réalisée</StepTitle>
                {servicesReq.error && <ErrorState message={servicesReq.error} onRetry={servicesReq.reload} />}
                {servicesReq.loading && <Skeleton className="h-28" />}
                {!servicesReq.loading && servicesReq.data?.length === 0 && <EmptyState title="Aucune prestation" text="Créez vos prestations depuis Services & tarifs." />}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {servicesReq.data?.map((s) => (
                    <button key={s._id} onClick={() => setServiceId(s._id)} aria-pressed={serviceId === s._id} className={tile(serviceId === s._id)}>
                      <span className="text-base font-medium">{s.name}</span>
                      <span className="font-mono text-base font-medium text-text">{formatPrice(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <StepTitle n={3}>Paiement</StepTitle>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Input label="Montant encaissé (DA)" type="number" inputMode="numeric" min={0} step={50} value={price} onChange={(e) => setPrice(e.target.value)} disabled={!service} hint="Modifiable en cas de remise." />
                  <Select label="Client (facultatif)" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">Client de passage</option>
                    {clientsReq.data?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.username}
                        {c.phone ? ` — ${c.phone}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div role="group" aria-label="Moyen de paiement" className="mt-6 grid grid-cols-2 gap-4">
                  {(
                    [
                      ["cash", "Espèces", Money],
                      ["card", "Carte", CreditCard],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button key={id} type="button" aria-pressed={method === id} onClick={() => setMethod(id)} className={`${tile(method === id)} flex-row items-center`}>
                      <Icon size={22} weight="light" className="text-muted" aria-hidden />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ticket */}
              <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-xs text-subtle">Barber</dt>
                    <dd className="mt-1 font-medium">{barber?.username ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-xs text-subtle">Coiffure</dt>
                    <dd className="mt-1 font-medium">{service?.name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-xs text-subtle">Commission barber (<span className="font-mono">{Math.round(rate * 100)} %</span>)</dt>
                    <dd className="mt-1 font-mono font-medium">{service ? formatPrice(commission) : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-xs text-subtle">Part salon</dt>
                    <dd className="mt-1 font-mono font-medium">{service ? formatPrice(amount - commission) : "—"}</dd>
                  </div>
                </dl>
                <Button variant="brand" size="lg" className="mt-6 w-full" loading={busy} disabled={!barber || !service || !(amount >= 0)} onClick={checkout} icon={<Check size={18} aria-hidden />}>
                  {service ? `Encaisser ${formatPrice(amount)}` : "Encaisser"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ───────── day journal ───────── */}
        <section className="flex flex-col gap-10 xl:col-span-5" aria-label="Journal de caisse">
          {register.error && <ErrorState message={register.error} onRetry={register.reload} />}
          {register.loading && !register.data && <Skeleton className="h-64" />}
          {totals && (
            <>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
                {[
                  { k: "Encaissé", v: totals.revenue, money: true },
                  { k: "Coiffures", v: totals.count },
                  { k: "Part barbers", v: totals.commission, money: true },
                  { k: "Part salon", v: totals.shop, money: true },
                ].map((t) => (
                  <div key={t.k} className="bg-surface p-4 sm:p-5">
                    <dt className="text-sm text-muted">{t.k}</dt>
                    <dd className="mt-2 font-mono text-xl font-medium text-text sm:text-2xl">
                      <CountUp key={`${day}-${t.v}`} to={t.v} suffix={t.money ? " DA" : ""} duration={0.8} />
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="-mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <Money size={16} className="text-subtle" aria-hidden /> Espèces : <span className="font-mono text-text">{formatPrice(totals.cash)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <CreditCard size={16} className="text-subtle" aria-hidden /> Carte : <span className="font-mono text-text">{formatPrice(totals.card)}</span>
                </span>
              </p>

              <div>
                <h2 className="mb-4 text-base font-semibold text-text">À verser aux barbers</h2>
                {register.data!.barbers.length === 0 ? (
                  <p className="text-sm text-subtle">Aucune coiffure encaissée sur cette journée.</p>
                ) : (
                  <ul className="divide-y divide-line border-y border-line">
                    {register.data!.barbers.map((b) => (
                      <li key={b._id} className="flex items-center gap-4 py-4">
                        <Avatar name={b.username} src={b.avatarUrl} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{b.username}</span>
                          <span className="block text-sm text-muted">
                            <span className="font-mono">{b.count}</span> coiffure{b.count > 1 ? "s" : ""} · <span className="font-mono">{formatPrice(b.revenue)}</span>
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block font-mono text-lg font-medium text-text">{formatPrice(b.commission)}</span>
                          <span className="block text-xs text-subtle">commission</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text">
                  <Receipt size={16} aria-hidden /> Encaissements
                </h2>
                <TableToolbar table={salesTable} placeholder="Service, barber, ticket…">
                  <FilterSelect label="Paiement" value={payFilter} onChange={setPayFilter} options={[{ value: "", label: "Tous" }, { value: "cash", label: "Espèces" }, { value: "card", label: "Carte" }]} />
                  <FilterSelect label="Barber" value={barberFilter} onChange={setBarberFilter} options={[{ value: "", label: "Tous" }, ...register.data!.barbers.map((b) => ({ value: b._id, label: b.username }))]} />
                </TableToolbar>
                {salesTable.total === 0 && <p className="text-sm text-subtle">{register.data!.sales.length === 0 ? "Rien pour le moment." : "Aucun résultat."}</p>}
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {salesTable.rows.map((s) => (
                      <motion.li
                        key={s._id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        className="flex items-center gap-4 rounded-md border border-line bg-surface px-4 py-3 sm:px-5"
                      >
                        <span className="w-14 shrink-0 font-mono text-sm text-muted">
                          {formatTime(s.date)}
                          {s.ticketNumber && <span className="block text-xs">N° {s.ticketNumber}</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{s.service.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {s.barber.username}
                            {s.client ? ` · ${s.client.username}` : ""} · {s.paymentMethod === "card" ? "Carte" : "Espèces"}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block font-mono font-medium text-text">{formatPrice(s.price)}</span>
                          <span className="block text-xs text-subtle">
                            barber <span className="font-mono">{formatPrice(s.commission)}</span>
                          </span>
                        </span>
                        <button type="button" onClick={() => setCancelling(s)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm text-subtle transition-colors duration-100 ease-out hover:bg-danger/12 hover:text-danger pointer-coarse:size-11" aria-label={`Annuler l'encaissement ${s.service.name} de ${formatTime(s.date)}`}>
                          <Trash size={18} weight="light" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <Pagination table={salesTable} sizes={[6, 10, 20]} />
              </div>
            </>
          )}
        </section>
      </div>

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Annuler cet encaissement ?" description={cancelling ? `${cancelling.service.name} · ${cancelling.barber.username} — ${formatPrice(cancelling.price)}. Il sera retiré de la caisse et des statistiques.` : ""}>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelling(null)}>
            Garder
          </Button>
          <Button variant="danger" onClick={cancelSale}>
            Annuler l'encaissement
          </Button>
        </div>
      </Modal>
    </>
  );
}
