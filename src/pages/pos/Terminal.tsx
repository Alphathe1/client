import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, CreditCard, MagnifyingGlass, Money, Percent, Printer, Receipt, Trash, User as UserIcon, X } from "@phosphor-icons/react";
import { Modal } from "../../components/ui/Modal";
import { Avatar } from "../../components/ui/Display";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDuration, formatPrice } from "../../lib/format";
import type { ClientSummary, PaidTicket, PaymentMethod, RegisterSummary, Service, User } from "../../lib/types";

/* ───────────────────────── ticket ───────────────────────── */

/** One haircut or service on the ticket. Each tap on a service adds one line. */
interface Line {
  key: string;
  serviceId: string;
  name: string;
  unitPrice: number;
  barberId: string;
  barberName: string;
  rate: number;
}
type Discount = { kind: "pct" | "amount"; value: number } | null;

const DEFAULT_RATE = 0.5;
const NOTES = [200, 500, 1000, 2000]; // Algerian banknotes
const uid = () => Math.random().toString(36).slice(2, 10);

function totalsOf(lines: Line[], discountRule: Discount) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice, 0);
  const raw = !discountRule ? 0 : discountRule.kind === "pct" ? Math.round((subtotal * discountRule.value) / 100) : discountRule.value;
  const discount = Math.min(raw, subtotal);
  const total = subtotal - discount;
  const ratio = subtotal ? total / subtotal : 0;
  const commission = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.rate, 0) * ratio);
  return { subtotal, discount, total, commission };
}

const btn = "flex min-h-12 cursor-pointer items-center justify-center gap-2 border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const btnPlain = `${btn} border-line bg-surface text-text hover:border-text/40`;
const btnMain = `${btn} border-brass-fill bg-brass-fill text-black hover:bg-brass-fill/85`;

/* ───────────────────────── payment ───────────────────────── */

function PayModal({ open, total, busy, onClose, onPay }: { open: boolean; total: number; busy: boolean; onClose: () => void; onPay: (method: PaymentMethod, cashGiven?: number) => void }) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [given, setGiven] = useState("");
  useEffect(() => {
    if (open) {
      setMethod("cash");
      setGiven("");
    }
  }, [open]);
  const givenNum = given === "" ? total : Number(given);
  const change = givenNum - total;
  const short = method === "cash" && change < 0;

  return (
    <Modal open={open} onClose={onClose} title="Règlement" description={`Total à encaisser : ${formatPrice(total)}`}>
      <div className="flex flex-col gap-6">
        <div role="radiogroup" aria-label="Moyen de paiement" className="grid grid-cols-2 gap-3">
          {(
            [
              ["cash", "Espèces", Money],
              ["card", "Carte", CreditCard],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="radio"
              aria-checked={method === id}
              onClick={() => setMethod(id)}
              className={`${btn} min-h-14 ${method === id ? "border-text bg-surface-2 text-text" : "border-line text-muted hover:border-text/40"}`}
            >
              <Icon size={20} aria-hidden /> {label}
            </button>
          ))}
        </div>

        {method === "cash" && (
          <div className="flex flex-col gap-4">
            <label htmlFor="cash-given" className="text-sm text-muted">
              Montant reçu (DA)
            </label>
            <input
              id="cash-given"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              autoFocus
              value={given}
              placeholder={String(total)}
              onChange={(e) => setGiven(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !short && onPay("cash", givenNum)}
              className="min-h-14 w-full border border-line bg-surface px-4 text-3xl font-medium tabular-nums outline-none focus:border-text/60"
            />
            <div className="grid grid-cols-5 gap-2">
              <button onClick={() => setGiven(String(total))} className={`${btnPlain} min-h-11 px-0`}>
                Exact
              </button>
              {NOTES.map((n) => (
                <button key={n} onClick={() => setGiven(String((given === "" ? 0 : Number(given)) + n))} className={`${btnPlain} min-h-11 px-0 tabular-nums`}>
                  +{n}
                </button>
              ))}
            </div>
            <div className={`flex items-baseline justify-between border-t border-line pt-4 ${short ? "text-danger" : ""}`}>
              <span>{short ? "Il manque" : "À rendre"}</span>
              <span className="text-4xl font-medium tabular-nums">{formatPrice(Math.abs(change))}</span>
            </div>
          </div>
        )}

        <button onClick={() => onPay(method, method === "cash" ? givenNum : undefined)} disabled={busy || short} className={`${btnMain} min-h-14`}>
          <Check size={18} aria-hidden /> {busy ? "Encaissement…" : `Valider ${formatPrice(total)}`}
        </button>
      </div>
    </Modal>
  );
}

function PaidModal({ ticket, onClose }: { ticket: PaidTicket | null; onClose: () => void }) {
  return (
    <Modal open={!!ticket} onClose={onClose} title={ticket ? `Ticket N° ${ticket.number} encaissé` : ""} description={ticket ? `${ticket.paymentMethod === "card" ? "Carte" : "Espèces"} · ${formatPrice(ticket.total)}` : ""}>
      {ticket && (
        <div className="flex flex-col gap-6">
          {ticket.paymentMethod === "cash" && ticket.change !== undefined && (
            <div className="flex items-baseline justify-between border border-line bg-surface-2 p-6">
              <span>À rendre</span>
              <span className="text-5xl font-medium tabular-nums">{formatPrice(ticket.change)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => window.print()} className={`${btnPlain} min-h-14`}>
              <Printer size={18} aria-hidden /> Imprimer
            </button>
            <button onClick={onClose} autoFocus className={`${btnMain} min-h-14`}>
              Nouveau ticket
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Printed receipt — only visible on paper */
function PrintedReceipt({ ticket, cashier }: { ticket: PaidTicket | null; cashier: string }) {
  if (!ticket) return null;
  return (
    <div className="hidden bg-white p-6 font-sans text-[12px] text-black print:block">
      <div className="mx-auto w-[72mm]">
        <p className="text-center text-2xl font-semibold">L'Empire Barber</p>
        <p className="text-center">@lempire_barber — 06 58 86 14 45</p>
        <p className="mt-3 flex justify-between border-y border-dashed border-black py-1">
          <span>Ticket N° {ticket.number}</span>
          <span>{new Date(ticket.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
        </p>
        <table className="mt-2 w-full">
          <tbody>
            {ticket.lines.map((l, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5">
                  {l.serviceName}
                  <br />
                  <span className="text-[10px]">par {l.barberName}</span>
                </td>
                <td className="py-0.5 text-right whitespace-nowrap">{formatPrice(l.unitPrice * l.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 border-t border-dashed border-black pt-1">
          {ticket.discount > 0 && (
            <p className="flex justify-between">
              <span>Remise</span>
              <span>− {formatPrice(ticket.discount)}</span>
            </p>
          )}
          <p className="flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{formatPrice(ticket.total)}</span>
          </p>
          <p className="flex justify-between">
            <span>{ticket.paymentMethod === "card" ? "Carte" : "Espèces"}</span>
            <span>{formatPrice(ticket.cashGiven ?? ticket.total)}</span>
          </p>
          {ticket.change !== undefined && ticket.change > 0 && (
            <p className="flex justify-between">
              <span>Rendu</span>
              <span>{formatPrice(ticket.change)}</span>
            </p>
          )}
        </div>
        <p className="mt-3 text-center">Caissier : {cashier}</p>
        <p className="mt-1 text-center">Merci de votre visite</p>
      </div>
    </div>
  );
}

/* ───────────────────────── terminal ───────────────────────── */

export default function Terminal() {
  const { user } = useAuth();
  const toast = useToast();
  const barbersReq = useFetch<User[]>("/users?role=barber");
  const servicesReq = useFetch<Service[]>("/services");
  const clientsReq = useFetch<ClientSummary[]>("/clients");
  const register = useFetch<RegisterSummary>("/caisse");

  const barbers = useMemo(() => barbersReq.data?.filter((b) => b.isActive) ?? [], [barbersReq.data]);
  const services = servicesReq.data ?? [];
  const categories = useMemo(() => [...new Set(services.map((s) => s.category))], [services]);

  const [lines, setLines] = useState<Line[]>([]);
  const [discountRule, setDiscountRule] = useState<Discount>(null);
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [barberId, setBarberId] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"pay" | "discount" | "client" | "cancel" | null>(null);
  const [paid, setPaid] = useState<PaidTicket | null>(null);
  const [busy, setBusy] = useState(false);

  // a single barber on duty is selected automatically
  useEffect(() => {
    if (!barberId && barbers.length === 1) setBarberId(barbers[0]!._id);
  }, [barbers, barberId]);

  const { subtotal, discount, total } = totalsOf(lines, discountRule);
  const barber = barbers.find((b) => b._id === barberId);
  const visible = services.filter((s) => (category === "Toutes" || s.category === category) && s.name.toLowerCase().includes(search.trim().toLowerCase()));

  const addService = (s: Service) => {
    if (!barber) {
      toast("Choisissez d'abord le barber qui a fait la coiffure", "error");
      return;
    }
    setLines((ls) => [...ls, { key: uid(), serviceId: s._id, name: s.name, unitPrice: s.price, barberId: barber._id, barberName: barber.username, rate: barber.commissionRate ?? DEFAULT_RATE }]);
  };

  const resetTicket = () => {
    setLines([]);
    setDiscountRule(null);
    setClient(null);
  };

  const pay = async (method: PaymentMethod, cashGiven?: number) => {
    if (!lines.length) return;
    setBusy(true);
    try {
      const res = await api.post<PaidTicket>("/caisse/tickets", {
        lines: lines.map((l) => ({ service: l.serviceId, barber: l.barberId, unitPrice: l.unitPrice, quantity: 1 })),
        ...(discount ? { discount } : {}),
        paymentMethod: method,
        ...(method === "cash" && cashGiven !== undefined ? { cashGiven } : {}),
        ...(client ? { client: client._id } : {}),
      });
      setModal(null);
      setPaid(res.data);
      resetTicket();
      register.reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const loading = barbersReq.loading || servicesReq.loading;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col bg-bg text-text lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden print:hidden">
        {/* ═════ top bar ═════ */}
        <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-5">
            <Link to="/dashboard" className={`${btnPlain} px-4`}>
              <ArrowLeft size={16} aria-hidden /> Tableau de bord
            </Link>
            <p className="text-xl font-semibold">Caisse</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <span className="hidden tabular-nums sm:block">{register.data ? `Aujourd'hui : ${formatPrice(register.data.totals.revenue)}` : ""}</span>
            <span className="hidden sm:block">{user?.username}</span>
            <Link to="/dashboard/caisse" className={`${btnPlain} px-4`}>
              <Receipt size={16} aria-hidden /> Journal
            </Link>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,420px)_1fr]">
          {/* ═════ ticket ═════ */}
          <aside className="order-2 flex min-h-0 flex-col border-t border-line lg:order-1 lg:border-t-0 lg:border-r" aria-label="Ticket en cours">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <p className="text-sm text-muted">Ticket N° {register.data?.nextTicketNumber ?? "—"}</p>
              {client ? (
                <button onClick={() => setClient(null)} className="flex cursor-pointer items-center gap-2 text-sm" aria-label={`Retirer le client ${client.username}`}>
                  <UserIcon size={14} aria-hidden /> {client.username} <X size={12} aria-hidden />
                </button>
              ) : (
                <button onClick={() => setModal("client")} className="cursor-pointer text-sm text-muted underline-offset-4 hover:text-text hover:underline">
                  Ajouter un client
                </button>
              )}
            </div>

            <ul aria-label="Lignes du ticket" className="min-h-48 flex-1 overflow-y-auto">
              {lines.length === 0 && (
                <li className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-subtle">
                  <Receipt size={28} aria-hidden />
                  Choisissez un barber, puis touchez une prestation.
                </li>
              )}
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <motion.li key={l.key} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="flex items-center gap-3 border-b border-line px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{l.name}</span>
                      <span className="block truncate text-xs text-subtle">{l.barberName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatPrice(l.unitPrice)}</span>
                    <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Retirer ${l.name}`} className="flex size-10 shrink-0 cursor-pointer items-center justify-center text-subtle hover:text-danger">
                      <Trash size={18} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="border-t border-line px-5 py-4">
              {discount > 0 && (
                <div className="mb-3 flex justify-between text-sm text-muted tabular-nums">
                  <span>Sous-total {formatPrice(subtotal)}</span>
                  <button onClick={() => setDiscountRule(null)} className="cursor-pointer hover:text-text" aria-label="Retirer la remise">
                    Remise − {formatPrice(discount)} ×
                  </button>
                </div>
              )}
              <div className="flex items-end justify-between gap-4">
                <span className="text-muted">Total</span>
                <span className="text-4xl font-semibold tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
              <button onClick={() => setModal("pay")} disabled={!lines.length} className={`${btnMain} col-span-2 min-h-16 text-base`}>
                <Money size={22} aria-hidden /> Encaisser
              </button>
              <button onClick={() => setModal("discount")} disabled={!lines.length} className={btnPlain}>
                <Percent size={18} aria-hidden /> Remise
              </button>
              <button onClick={() => setModal("cancel")} disabled={!lines.length} className={`${btnPlain} text-danger hover:border-danger/60`}>
                <X size={18} aria-hidden /> Annuler
              </button>
            </div>
          </aside>

          {/* ═════ catalogue ═════ */}
          <main id="main" className="order-1 flex min-h-0 flex-col lg:order-2">
            <div className="flex items-center gap-3 overflow-x-auto border-b border-line px-5 py-3" role="radiogroup" aria-label="Barber ayant réalisé la coiffure">
              <span className="shrink-0 text-sm text-muted">Barber</span>
              {loading && <span className="text-sm text-subtle">Chargement…</span>}
              {!loading && barbers.length === 0 && <span className="text-sm text-danger">Aucun barber actif — ajoutez-en depuis Équipe.</span>}
              {barbers.map((b) => (
                <button
                  key={b._id}
                  role="radio"
                  aria-checked={barberId === b._id}
                  onClick={() => setBarberId(b._id)}
                  className={`${btn} shrink-0 gap-3 ${barberId === b._id ? "border-brass-fill bg-brass-fill text-black" : "border-line bg-surface hover:border-text/40"}`}
                >
                  <Avatar name={b.username} src={b.avatarUrl} size="sm" />
                  {b.username}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              {["Toutes", ...categories].map((c) => (
                <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={`min-h-11 cursor-pointer px-5 text-sm transition-colors ${category === c ? "bg-text text-bg" : "border border-line text-muted hover:text-text"}`}>
                  {c}
                </button>
              ))}
              <label className="ml-auto flex min-h-11 items-center gap-2 border border-line bg-surface px-3 focus-within:border-text/60">
                <MagnifyingGlass size={16} className="text-muted" aria-hidden />
                <span className="sr-only">Rechercher une prestation</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-36 bg-transparent text-sm outline-none placeholder:text-subtle" />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {visible.length === 0 && !loading && <p className="py-16 text-center text-sm text-subtle">{services.length ? "Aucune prestation ne correspond." : "Aucune prestation — créez-les depuis Services & tarifs."}</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((s) => (
                  <motion.button key={s._id} whileTap={{ scale: 0.97 }} onClick={() => addService(s)} className="flex min-h-28 cursor-pointer flex-col justify-between border border-line bg-surface p-4 text-left transition-colors hover:border-text/50">
                    <span className="font-medium leading-snug">{s.name}</span>
                    <span className="flex items-end justify-between gap-2">
                      <span className="text-xl font-semibold tabular-nums">{formatPrice(s.price)}</span>
                      <span className="text-xs text-subtle">{formatDuration(s.duration)}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ═════ modals ═════ */}
      <PayModal open={modal === "pay"} total={total} busy={busy} onClose={() => setModal(null)} onPay={pay} />
      <PaidModal ticket={paid} onClose={() => setPaid(null)} />

      <DiscountModal
        open={modal === "discount"}
        subtotal={subtotal}
        onClose={() => setModal(null)}
        onApply={(d) => {
          setDiscountRule(d);
          setModal(null);
        }}
      />

      <Modal open={modal === "client"} onClose={() => setModal(null)} title="Associer un client" description="Facultatif — la prestation rejoint l'historique du client.">
        <ClientPicker
          clients={clientsReq.data ?? []}
          onPick={(c) => {
            setClient(c);
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "cancel"} onClose={() => setModal(null)} title="Annuler le ticket ?" description="Toutes les lignes du ticket en cours seront retirées. Rien n'a encore été encaissé.">
        <div className="flex justify-end gap-3">
          <button onClick={() => setModal(null)} className={btnPlain}>
            Garder
          </button>
          <button
            onClick={() => {
              resetTicket();
              setModal(null);
            }}
            className={`${btn} border-danger/50 text-danger hover:bg-danger/10`}
          >
            Annuler le ticket
          </button>
        </div>
      </Modal>

      <PrintedReceipt ticket={paid} cashier={user?.username ?? ""} />
    </>
  );
}

function DiscountModal({ open, subtotal, onClose, onApply }: { open: boolean; subtotal: number; onClose: () => void; onApply: (d: Discount) => void }) {
  const [amount, setAmount] = useState("");
  useEffect(() => {
    if (open) setAmount("");
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Remise" description={`Sur un sous-total de ${formatPrice(subtotal)}.`}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 15, 20].map((p) => (
            <button key={p} onClick={() => onApply({ kind: "pct", value: p })} className={`${btnPlain} min-h-14 text-xl`}>
              {p} %
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-2.5">
            <span className="text-sm text-muted">Montant fixe (DA)</span>
            <input type="number" inputMode="numeric" min={0} max={subtotal} step={50} value={amount} onChange={(e) => setAmount(e.target.value)} className="min-h-12 border border-line bg-surface px-4 tabular-nums outline-none focus:border-text/60" />
          </label>
          <button onClick={() => amount && onApply({ kind: "amount", value: Math.min(subtotal, Math.max(0, Math.round(Number(amount)))) })} disabled={!amount} className={btnMain}>
            Appliquer
          </button>
        </div>
        <button onClick={() => onApply(null)} className="self-start text-sm text-muted underline-offset-4 hover:underline">
          Retirer la remise
        </button>
      </div>
    </Modal>
  );
}

function ClientPicker({ clients, onPick }: { clients: ClientSummary[]; onPick: (c: ClientSummary | null) => void }) {
  const [q, setQ] = useState("");
  const list = clients.filter((c) => `${c.username} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  return (
    <div className="flex flex-col gap-4">
      <label className="flex min-h-12 items-center gap-3 border border-line bg-surface px-4 focus-within:border-text/60">
        <MagnifyingGlass size={18} className="text-muted" aria-hidden />
        <span className="sr-only">Rechercher un client</span>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email ou téléphone…" className="flex-1 bg-transparent outline-none placeholder:text-subtle" />
      </label>
      <ul className="max-h-80 divide-y divide-line overflow-y-auto border-y border-line">
        <li>
          <button onClick={() => onPick(null)} className="flex min-h-12 w-full cursor-pointer items-center px-2 text-left text-muted hover:text-text">
            Client de passage
          </button>
        </li>
        {list.map((c) => (
          <li key={c._id}>
            <button onClick={() => onPick(c)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-2 text-left hover:bg-surface-2">
              <Avatar name={c.username} src={c.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.username}</span>
                <span className="block truncate text-sm text-muted">{c.phone ?? c.email}</span>
              </span>
              <span className="text-xs text-subtle">{c.visitCount} visites</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-sm text-subtle">Aucun client trouvé.</li>}
      </ul>
    </div>
  );
}
