import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarBlank, Check, Clock, Phone, Scissors, Star, User as UserIcon, Users } from "@phosphor-icons/react";
import { Button, buttonClass, LinkButton } from "../../components/ui/Button";
import { Select, Textarea } from "../../components/ui/Field";
import { Avatar, EmptyState, ErrorState, Skeleton } from "../../components/ui/Display";
import { ServicesEmpty } from "../../components/site/ServicesEmpty";
import { useAuth } from "../../context/AuthContext";
import { useSite } from "../../context/SiteContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError, qs } from "../../lib/api";
import { telHref } from "../../lib/site/links";
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

/** Choice card states (spec §4): line at rest, line-strong on hover, brass outline and tint once chosen */
const choice = (selected: boolean) =>
  `cursor-pointer rounded-lg border text-left transition-colors duration-100 ease-out ${selected ? "border-brand bg-brand/8" : "border-line bg-surface hover:border-line-strong"}`;

/** Day and time pills: the same three states; a closed day is dimmed and disabled */
const pill = (selected: boolean) =>
  `cursor-pointer rounded-md border text-text transition-colors duration-100 ease-out aria-disabled:cursor-not-allowed aria-disabled:opacity-35 ${
    selected ? "border-brand bg-brand/8" : "border-line bg-surface not-aria-disabled:hover:border-line-strong"
  }`;

/** Mounts with each step: after a user-driven step change, moves focus to that step's heading (the clicked control is gone) */
function FocusHeading({ pending }: { pending: { current: boolean } }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    marker.current?.parentElement?.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, [pending]);
  return <span ref={marker} hidden />;
}

function next14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Confirmation screen; takes focus on mount so keyboard focus doesn't drop to <body> */
function BookDone({ done, rescheduled }: { done: Appointment; rescheduled: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex size-20 items-center justify-center rounded-full border border-success/40 bg-success/12 text-success"
      >
        <Check size={40} weight="bold" aria-hidden />
      </motion.div>
      <h1 ref={heading} tabIndex={-1} className="mt-8 text-4xl font-semibold text-text outline-none sm:text-5xl">{rescheduled ? "C'est modifié !" : "C'est réservé !"}</h1>
      <p className="mt-4 text-muted">
        {done.service.name} avec <span className="text-text wrap-anywhere">{done.barber.username}</span>
        <br />
        <span className="font-mono text-text">
          {new Date(done.start).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
        </span>
      </p>
      <p className="mt-3 text-sm text-subtle">Une notification de confirmation vous a été envoyée. Un rappel suivra la veille.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/dashboard/appointments" variant="primary">
          Mes rendez-vous
        </LinkButton>
        <LinkButton to="/" variant="secondary">
          Accueil
        </LinkButton>
      </div>
    </section>
  );
}

export default function Book() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const rescheduleId = params.get("reschedule");
  const salonPhone = useSite().content.contact.phone;
  const tel = telHref(salonPhone);

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
  const [slotsAttempt, setSlotsAttempt] = useState(0);
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
  }, [serviceId, barberId, date, rescheduleId, slotsAttempt]);

  const focusStep = useRef(false);
  const slotsHeadingRef = useRef<HTMLLegendElement>(null);

  const go = (to: number) => {
    focusStep.current = true;
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
    return <BookDone done={done} rescheduled={!!rescheduleId} />;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 pb-20 sm:px-8 lg:px-10">
      <h1 className="text-4xl font-semibold text-text sm:text-5xl">{rescheduleId ? "Modifier le rendez-vous" : "Réserver"}</h1>

      {/* progress */}
      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Étapes de réservation">
        {STEPS.map((s, i) => (
          <li key={s.label} className="min-w-0">
            <button
              type="button"
              onClick={() => i < step && go(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className="flex min-h-11 w-full cursor-pointer flex-col gap-2 rounded-sm text-left disabled:cursor-default"
            >
              <span className="relative h-1 overflow-hidden rounded-full bg-surface-3">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-brand"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                />
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-medium sm:text-sm ${i === step ? "text-text" : i < step ? "text-muted" : "text-subtle"}`}>
                <s.icon size={16} aria-hidden className={`hidden shrink-0 sm:block ${i === step ? "text-brand" : ""}`} />
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}>
              <FocusHeading pending={focusStep} />
              {step === 0 && (
                <fieldset>
                  <legend tabIndex={-1} data-step-heading className="mb-4 text-lg font-semibold text-text outline-none">Choisissez votre prestation</legend>
                  {services.error ? (
                    <ErrorState message={services.error} onRetry={services.reload} />
                  ) : services.data?.length === 0 ? (
                    <ServicesEmpty />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {services.loading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
                      {services.data?.map((s) => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => {
                            setServiceId(s._id);
                            setStart("");
                            go(1);
                          }}
                          aria-pressed={serviceId === s._id}
                          className={`${choice(serviceId === s._id)} min-w-0 p-5`}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0 font-semibold text-text wrap-anywhere">{s.name}</span>
                            <span className="shrink-0 font-mono font-medium text-text">{formatPrice(s.price)}</span>
                          </span>
                          <span className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                            <Clock size={14} aria-hidden />
                            <span className="font-mono">{formatDuration(s.duration)}</span> · {s.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}

              {step === 1 && (
                <fieldset>
                  <legend tabIndex={-1} data-step-heading className="mb-4 text-lg font-semibold text-text outline-none">Avec quel barber ?</legend>
                  {barbers.error ? (
                    <ErrorState message={barbers.error} onRetry={barbers.reload} />
                  ) : barbers.data?.length === 0 ? (
                    <EmptyState
                      icon={<Users size={24} />}
                      title="Aucun barber disponible pour le moment"
                      text="Appelez le salon pour réserver."
                      action={
                        tel ? (
                          <a href={tel} className={buttonClass("secondary", "sm")}>
                            <Phone size={16} aria-hidden />
                            <span className="font-mono">{salonPhone}</span>
                          </a>
                        ) : undefined
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {barbers.loading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}
                      {barbers.data?.map((b) => (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => {
                            setBarberId(b._id);
                            setStart("");
                            go(2);
                          }}
                          aria-pressed={barberId === b._id}
                          className={`${choice(barberId === b._id)} flex min-w-0 items-center gap-4 p-4`}
                        >
                          <Avatar name={b.username} src={b.avatarUrl} size="lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block min-w-0 font-semibold text-text wrap-anywhere">{b.username}</span>
                            <span className="block truncate text-sm text-muted">{b.specialties?.join(" · ")}</span>
                            <span className="mt-1 flex items-center gap-1 text-sm">
                              <Star size={14} weight="fill" className="text-brand" aria-hidden />
                              {b.rating ? (
                                <>
                                  <span className="font-mono text-text">{b.rating.toFixed(1)}</span>
                                  <span className="font-mono text-subtle">({b.reviewCount})</span>
                                </>
                              ) : (
                                <span className="text-subtle">Nouveau</span>
                              )}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}

              {step === 2 && (
                <div>
                  <fieldset>
                    <legend tabIndex={-1} data-step-heading className="mb-4 text-lg font-semibold text-text outline-none">Quel jour ?</legend>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {days.map((d) => {
                        const key = toDateKey(d);
                        const closed = !barber?.workingHours?.some((w) => w.day === d.getDay());
                        const active = key === date;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-disabled={closed || undefined}
                            onClick={() => {
                              if (closed) return;
                              setDate(key);
                              setStart("");
                            }}
                            aria-pressed={active}
                            aria-label={d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + (closed ? ", fermé" : "")}
                            className={`${pill(active)} flex min-h-16 flex-col items-center justify-center gap-1`}
                          >
                            <span className="text-xs text-muted">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                            <span className="font-mono text-xl leading-none font-medium">{d.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="mt-8">
                    <legend ref={slotsHeadingRef} tabIndex={-1} className="mb-4 text-lg font-semibold text-text outline-none">Créneaux disponibles</legend>
                    {slotsError && <ErrorState message={slotsError} onRetry={() => {
                      setSlotsAttempt((n) => n + 1);
                      slotsHeadingRef.current?.focus({ preventScroll: true });
                    }} />}
                    {!slots && !slotsError && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <Skeleton key={i} className="h-11" />
                        ))}
                      </div>
                    )}
                    {slots?.length === 0 && <EmptyState icon={<CalendarBlank size={24} />} title="Aucun créneau ce jour-là" text="Essayez une autre date ou un autre barber." />}
                    {slots && slots.length > 0 && (
                      <motion.div className="grid grid-cols-3 gap-2 sm:grid-cols-5" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.02 } } }}>
                        {slots.map((s) => (
                          <motion.button
                            key={s.start}
                            type="button"
                            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                            onClick={() => setStart(s.start)}
                            aria-pressed={start === s.start}
                            className={`${pill(start === s.start)} min-h-11 font-mono text-sm font-medium`}
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
                  <h2 tabIndex={-1} data-step-heading className="text-lg font-semibold text-text outline-none">Vérifiez et confirmez</h2>
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
                  <Textarea
                    label="Une précision pour votre barber ?"
                    hint="Optionnel — ex. « garder la longueur sur le dessus »"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                  />
                  {!user && (
                    <p className="rounded-md border border-line bg-surface-2 p-4 text-sm text-muted">
                      Vous devrez vous connecter ou créer un compte pour confirmer. Votre sélection est conservée.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} icon={<ArrowLeft size={18} aria-hidden />}>
              Retour
            </Button>
            {step < 3 ? (
              <Button onClick={() => go(step + 1)} disabled={!canNext}>
                Continuer <ArrowRight size={18} aria-hidden />
              </Button>
            ) : (
              <Button
                variant="brand"
                onClick={confirm}
                loading={submitting}
                disabled={!start || (!!isStaff && !rescheduleId && !clientId)}
                icon={<Check size={18} weight="bold" aria-hidden />}
              >
                {user ? (rescheduleId ? "Enregistrer" : "Confirmer la réservation") : "Se connecter et confirmer"}
              </Button>
            )}
          </div>
        </div>

        {/* summary */}
        <aside className="h-fit rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-20" aria-labelledby="book-summary">
          <h2 id="book-summary" className="text-sm font-semibold text-text">
            Récapitulatif
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Service</dt>
              <dd className="min-w-0 text-right font-medium text-text wrap-anywhere">{service?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Barber</dt>
              <dd className="min-w-0 text-right font-medium text-text wrap-anywhere">{barber?.username ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Date</dt>
              <dd className="text-right font-mono text-text">
                {start ? new Date(start).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Durée</dt>
              <dd className="font-mono text-text">{service ? formatDuration(service.duration) : "—"}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
            <span className="text-muted">Total</span>
            <span className="font-mono text-3xl font-medium text-text">{service ? formatPrice(service.price) : "—"}</span>
          </div>
          <p className="mt-2 text-xs text-subtle">Paiement sur place. Annulation gratuite depuis votre espace.</p>
        </aside>
      </div>
    </section>
  );
}
