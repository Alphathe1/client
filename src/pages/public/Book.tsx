import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarBlank, Check, Clock, Scissors, Star, User as UserIcon } from "@phosphor-icons/react";
import { Button } from "../../components/ui/Button";
import { Select, Textarea } from "../../components/ui/Field";
import { Avatar, EmptyState, ErrorState, Skeleton } from "../../components/ui/Display";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError, qs } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDuration, formatPrice, toDateKey } from "../../lib/format";
import type { Appointment, Barber, ClientSummary, Service, Slot } from "../../lib/types";

const STEPS = [
  { label: "Service", icon: Scissors },
  { label: "Barber", icon: UserIcon },
  { label: "Date & heure", icon: CalendarBlank },
  { label: "Confirmation", icon: Check },
];

const slide = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -40, opacity: 0, transition: { duration: 0.15 } }),
};

function next14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function Book() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const rescheduleId = params.get("reschedule");

  const services = useFetch<Service[]>("/services");
  const barbers = useFetch<Barber[]>("/users/barbers");
  const original = useFetch<Appointment>(rescheduleId && user ? `/appointments/${rescheduleId}` : null);
  const isStaff = user && user.role !== "client";
  const clients = useFetch<ClientSummary[]>(isStaff && !rescheduleId ? "/clients" : null);

  const [serviceId, setServiceId] = useState(params.get("service") ?? "");
  const [barberId, setBarberId] = useState(params.get("barber") ?? "");
  const [date, setDate] = useState(params.get("date") ?? toDateKey(new Date()));
  const [start, setStart] = useState(params.get("start") ?? "");
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState("");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Appointment | null>(null);

  // pre-fill from the appointment being rescheduled
  useEffect(() => {
    const a = original.data;
    if (!a) return;
    setServiceId(a.service._id);
    setBarberId(a.barber._id);
    setDate(toDateKey(new Date(a.start)));
    setNotes(a.notes ?? "");
    setStep(2);
  }, [original.data]);

  // resume where the user left off (e.g. after logging in)
  useEffect(() => {
    if (params.get("start") && params.get("service") && params.get("barber")) setStep(3);
    else if (params.get("service") && params.get("barber")) setStep(2);
    else if (params.get("service")) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const service = services.data?.find((s) => s._id === serviceId);
  const barber = barbers.data?.find((b) => b._id === barberId);
  const days = useMemo(next14Days, []);

  useEffect(() => {
    if (!serviceId || !barberId || !date) return;
    let cancelled = false;
    setSlots(null);
    setSlotsError(null);
    api
      .get<Slot[]>(`/appointments/availability${qs({ barber: barberId, service: serviceId, date, exclude: rescheduleId })}`)
      .then((s) => !cancelled && setSlots(s))
      .catch((e) => !cancelled && setSlotsError(e.message));
    return () => {
      cancelled = true;
    };
  }, [serviceId, barberId, date, rescheduleId]);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const canNext = [!!serviceId, !!barberId, !!start, true][step];

  const confirm = async () => {
    if (!user) {
      const back = `/book${qs({ service: serviceId, barber: barberId, date, start })}`;
      setParams({ service: serviceId, barber: barberId, date, start });
      navigate("/login", { state: { from: back } });
      return;
    }
    setSubmitting(true);
    try {
      const res = rescheduleId
        ? await api.patch<Appointment>(`/appointments/${rescheduleId}`, { barber: barberId, service: serviceId, start, notes })
        : await api.post<Appointment>("/appointments", { barber: barberId, service: serviceId, start, notes: notes || undefined, client: isStaff ? clientId : undefined });
      setDone(res.data);
      toast(rescheduleId ? "Rendez-vous modifié" : "Réservation confirmée !");
    } catch (e) {
      const err = e as ApiError;
      toast(err.message, "error");
      if (err.status === 409) {
        setStart("");
        go(2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 pt-10 pb-16 text-center">
        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="flex size-24 items-center justify-center rounded-full bg-gold text-onaccent">
          <Check size={48} weight="bold" aria-hidden />
        </motion.div>
        <h1 className="mt-8 font-display text-5xl font-medium">{rescheduleId ? "C'est modifié !" : "C'est réservé !"}</h1>
        <p className="mt-3 text-muted">
          {done.service.name} avec <span className="text-text">{done.barber.username}</span>
          <br />
          <span className="text-accent">
            {new Date(done.start).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </span>
        </p>
        <p className="mt-2 text-sm text-subtle">Une notification de confirmation vous a été envoyée. Un rappel suivra la veille.</p>
        <div className="mt-8 flex gap-3">
          <Link to="/dashboard/appointments" className="inline-flex min-h-12 items-center bg-gold px-7 text-xs tracking-[0.2em] text-onaccent uppercase hover:bg-gold-hover">
            Mes rendez-vous
          </Link>
          <Link to="/" className="inline-flex min-h-12 items-center border border-text/40 px-7 text-xs tracking-[0.2em] uppercase hover:border-text">
            Accueil
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6">
      <h1 className="font-display text-5xl sm:text-6xl font-medium">{rescheduleId ? "Modifier le rendez-vous" : "Réserver"}</h1>

      {/* progress */}
      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Étapes de réservation">
        {STEPS.map((s, i) => (
          <li key={s.label}>
            <button
              onClick={() => i < step && go(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className="flex w-full cursor-pointer flex-col gap-2 text-left disabled:cursor-default"
            >
              <span className="relative h-1 overflow-hidden rounded-full bg-line">
                <motion.span className="absolute inset-y-0 left-0 bg-gold" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} />
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-semibold sm:text-sm ${i === step ? "text-accent" : i < step ? "text-text" : "text-subtle"}`}>
                <s.icon size={16} aria-hidden className="hidden sm:block" />
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
              {step === 0 && (
                <fieldset>
                  <legend className="mb-4 text-lg font-semibold">Choisissez votre prestation</legend>
                  {services.error && <ErrorState message={services.error} onRetry={services.reload} />}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {services.loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
                    {services.data?.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => {
                          setServiceId(s._id);
                          setStart("");
                          go(1);
                        }}
                        aria-pressed={serviceId === s._id}
                        className={`cursor-pointer rounded-2xl border p-5 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] ${serviceId === s._id ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-accent/60"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold">{s.name}</span>
                          <span className="font-display text-2xl text-accent tabular-nums lining-nums font-medium">{formatPrice(s.price)}</span>
                        </div>
                        <span className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                          <Clock size={14} aria-hidden /> {formatDuration(s.duration)} · {s.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 1 && (
                <fieldset>
                  <legend className="mb-4 text-lg font-semibold">Avec quel barber ?</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {barbers.loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    {barbers.data?.map((b) => (
                      <button
                        key={b._id}
                        onClick={() => {
                          setBarberId(b._id);
                          setStart("");
                          go(2);
                        }}
                        aria-pressed={barberId === b._id}
                        className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] ${barberId === b._id ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-accent/60"}`}
                      >
                        <Avatar name={b.username} src={b.avatarUrl} size="lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{b.username}</span>
                          <span className="block truncate text-sm text-muted">{b.specialties?.join(" · ")}</span>
                          <span className="mt-1 flex items-center gap-1 text-sm">
                            <Star size={14} weight="fill" className="text-accent" aria-hidden />
                            {b.rating ? (
                              <>
                                <span className="tabular-nums">{b.rating}</span> <span className="text-subtle">({b.reviewCount})</span>
                              </>
                            ) : (
                              <span className="text-subtle">Nouveau</span>
                            )}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 2 && (
                <div>
                  <fieldset>
                    <legend className="mb-4 text-lg font-semibold">Quel jour ?</legend>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {days.map((d) => {
                        const key = toDateKey(d);
                        const closed = !barber?.workingHours?.some((w) => w.day === d.getDay());
                        const active = key === date;
                        return (
                          <button
                            key={key}
                            disabled={closed}
                            onClick={() => {
                              setDate(key);
                              setStart("");
                            }}
                            aria-pressed={active}
                            aria-label={d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + (closed ? ", fermé" : "")}
                            className={`flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-xl border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-accent bg-gold text-onaccent" : "border-line bg-surface hover:border-accent/60"}`}
                          >
                            <span className={`text-[11px] uppercase ${active ? "text-onaccent/70" : "text-muted"}`}>{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                            <span className="font-display text-2xl leading-none font-medium">{d.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="mt-8">
                    <legend className="mb-4 text-lg font-semibold">Créneaux disponibles</legend>
                    {slotsError && <ErrorState message={slotsError} />}
                    {!slots && !slotsError && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <Skeleton key={i} className="h-11" />
                        ))}
                      </div>
                    )}
                    {slots?.length === 0 && <EmptyState icon={<CalendarBlank size={28} />} title="Aucun créneau ce jour-là" text="Essayez une autre date ou un autre barber." />}
                    {slots && slots.length > 0 && (
                      <motion.div className="grid grid-cols-3 gap-2 sm:grid-cols-5" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.02 } } }}>
                        {slots.map((s) => (
                          <motion.button
                            key={s.start}
                            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                            onClick={() => setStart(s.start)}
                            aria-pressed={start === s.start}
                            className={`min-h-11 cursor-pointer rounded-xl border text-sm font-semibold tabular-nums transition-colors ${start === s.start ? "border-accent bg-gold text-onaccent" : "border-line bg-surface hover:border-accent/60 hover:text-accent"}`}
                          >
                            {s.time}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </fieldset>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <h2 className="text-lg font-semibold">Vérifiez et confirmez</h2>
                  {isStaff && !rescheduleId && (
                    <Select label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                      <option value="">Sélectionner un client…</option>
                      {clients.data?.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.username} — {c.email}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Textarea label="Une précision pour votre barber ?" hint="Optionnel — ex. « garder la longueur sur le dessus »" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
                  {!user && (
                    <p className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-accent">
                      Vous devrez vous connecter ou créer un compte pour confirmer. Votre sélection est conservée.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} icon={<ArrowLeft size={18} aria-hidden />}>
              Retour
            </Button>
            {step < 3 ? (
              <Button onClick={() => go(step + 1)} disabled={!canNext}>
                Continuer <ArrowRight size={18} aria-hidden />
              </Button>
            ) : (
              <Button variant="gold" onClick={confirm} loading={submitting} disabled={!start || (!!isStaff && !rescheduleId && !clientId)} icon={<Check size={18} weight="bold" aria-hidden />}>
                {user ? (rescheduleId ? "Enregistrer" : "Confirmer la réservation") : "Se connecter et confirmer"}
              </Button>
            )}
          </div>
        </div>

        {/* summary */}
        <aside className="h-fit rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24" aria-label="Récapitulatif">
          <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">Récapitulatif</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Service</dt>
              <dd className="text-right font-semibold">{service?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Barber</dt>
              <dd className="font-semibold">{barber?.username ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Date</dt>
              <dd className="text-right font-semibold">{start ? new Date(start).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Durée</dt>
              <dd className="font-semibold">{service ? formatDuration(service.duration) : "—"}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
            <span className="text-muted">Total</span>
            <span className="font-display text-4xl text-accent font-medium">{service ? formatPrice(service.price) : "—"}</span>
          </div>
          <p className="mt-2 text-xs text-subtle">Paiement sur place. Annulation gratuite depuis votre espace.</p>
        </aside>
      </div>
    </section>
  );
}
