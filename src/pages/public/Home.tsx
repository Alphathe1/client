import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarBlank, Drop, InstagramLogo, Phone, Ruler, Scissors, ShieldCheck, Smiley, Star, TiktokLogo, UserCircle } from "@phosphor-icons/react";
import { buttonClass, LinkButton } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Display";
import { Reveal } from "../../components/ui/Echo";
import { useFetch } from "../../lib/useFetch";
import { formatDuration, formatPrice } from "../../lib/format";
import { shopStatus } from "../../lib/shopStatus";
import type { Barber, Review, Service } from "../../lib/types";

const WRAP = "mx-auto max-w-7xl px-6 sm:px-10";
const CARD = "rounded-2xl border border-line bg-surface";

/** Placeholder barbershop photos (Unsplash, hot-linked) — swap for real salon photos later */
const unsplash = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const IMG = {
  tools: unsplash("1678356163587-6bb3afb89679", 1600),
  fade: unsplash("1759675905700-a1b5efedc05c", 900),
  cutting: unsplash("1547648946-2b1fd7eab923", 900),
  beard: unsplash("1621605815971-fbc98d665033", 900),
  team: [unsplash("1741345980697-f3c43eba44a0", 700), unsplash("1611431182782-cb1f5acd6e94", 700), unsplash("1761522002071-67755dc6c820", 700)],
};

/** Local photo from /public/images, falling back to a neutral placeholder until the file exists. */
function Photo({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className: string }) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        if (!el.dataset.fallback) {
          el.dataset.fallback = "1";
          el.src = `https://placehold.co/${width}x${height}/18181b/a1a1aa?text=Photo`;
        }
      }}
    />
  );
}

/** Section heading: centred title + one line of context, as in the design */
function Heading({ title, text, className = "" }: { title: string; text?: string; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-4xl leading-tight font-semibold text-text sm:text-5xl">{title}</h2>
      {text && <p className="mx-auto mt-4 max-w-xl text-muted">{text}</p>}
    </div>
  );
}

/** Quick reservation: pick a service, continue to the full booking flow */
function QuickBooking({ services }: { services: Service[] | null }) {
  const navigate = useNavigate();
  const [service, setService] = useState("");
  const field = "mt-2 min-h-12 w-full rounded-lg border border-line bg-bg/60 px-4 text-text outline-none focus:border-text/50";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(service ? `/book?service=${service}` : "/book");
      }}
      className="rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-md sm:p-8"
    >
      <div className="flex items-center gap-4">
        <span className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface-2 text-text" aria-hidden>
          <CalendarBlank size={20} />
        </span>
        <div>
          <h2 className="text-lg leading-tight font-semibold">Réservation rapide</h2>
          <p className="text-sm text-subtle">Choisissez votre créneau en quelques secondes</p>
        </div>
      </div>
      <label className="mt-8 block text-sm font-medium text-subtle">
        Prestation
        <select value={service} onChange={(e) => setService(e.target.value)} className={field}>
          <option value="">Choisir une prestation</option>
          {services?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} — {formatPrice(s.price)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-text font-semibold text-bg transition-colors hover:bg-text/80"
      >
        Continuer
        <ArrowRight size={18} aria-hidden />
      </button>
    </form>
  );
}

function Hero({ services }: { services: Service[] | null }) {
  const status = shopStatus();
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-bg text-text">
      <Photo src={IMG.tools} alt="" width={1600} height={1000} className="absolute inset-0 -z-30 size-full object-cover opacity-20 grayscale" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-bg/75" />
      <div className={`${WRAP} grid items-center gap-16 py-20 sm:py-28 lg:grid-cols-12 lg:gap-20 lg:py-36`}>
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-sm text-muted">
            <span aria-hidden className={`size-2 rounded-full ${status.open ? "bg-success" : "bg-danger"}`} />
            <span className="font-medium text-text">{status.text}</span>
            <span>· {status.sub}</span>
          </p>
          <p aria-hidden className="mt-10 font-sign text-6xl leading-none font-bold tracking-wide text-brass sm:text-8xl">
            L'EMPIRE
          </p>
          <p aria-hidden className="mt-3 font-sign text-sm font-semibold tracking-[0.7em] text-brass sm:text-base">
            BARBER
          </p>
          <h1 className="mt-10 max-w-2xl text-3xl leading-tight font-semibold text-text sm:text-4xl lg:text-5xl">
            <span className="sr-only">L'Empire Barber. </span>Le coiffeur préféré de ton coiffeur préféré.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">Dégradés, barbe et rasage à la serviette chaude. On est ouverts tous les jours : choisis ta prestation et réserve ton créneau.</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton to="/book" variant="pole" size="lg" icon={<CalendarBlank size={20} aria-hidden />}>
              Réserver
            </LinkButton>
            <a href="tel:0658861445" className={buttonClass("secondary", "lg")}>
              <Phone size={20} aria-hidden />
              06 58 86 14 45
            </a>
          </div>
        </div>
        <div className="lg:col-span-5">
          <QuickBooking services={services} />
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Scissors, t: "Dégradés précis", d: "Dégradés zéro, taper et textures travaillés à la lame et à la tondeuse." },
  { icon: Drop, t: "Produits premium", d: "Des pommades et soins sélectionnés pour une finition qui tient." },
  { icon: ShieldCheck, t: "Salon impeccable", d: "Outils désinfectés et lames neuves à chaque client." },
  { icon: Ruler, t: "Finitions nettes", d: "Contours et lignes tracés au rasoir pour un résultat net." },
];

function Features() {
  return (
    <section className="border-b border-line">
      <div className={`${WRAP} grid gap-x-10 gap-y-12 py-20 sm:grid-cols-2 lg:grid-cols-4`}>
        {FEATURES.map(({ icon: Icon, t, d }) => (
          <div key={t}>
            <span className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface-2 text-text" aria-hidden>
              <Icon size={22} />
            </span>
            <h3 className="mt-6 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Salon() {
  const points = [
    { t: "On prend le temps", d: "La durée indiquée pour chaque prestation est entièrement réservée pour vous. Personne n'attend derrière." },
    { t: "On écoute d'abord", d: "Longueur, nuque, contour de barbe : vous expliquez, le barber propose, puis il coupe." },
  ];
  return (
    <section>
      <div className={`${WRAP} grid items-center gap-16 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24`}>
        <div className="max-w-xl">
          <p className="text-sm font-medium text-subtle">Le salon</p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">Un salon, pas une chaîne.</h2>
          <dl className="mt-10 space-y-8">
            {points.map((p) => (
              <div key={p.t}>
                <dt className="text-lg font-semibold">{p.t}</dt>
                <dd className="mt-2 text-muted">{p.d}</dd>
              </div>
            ))}
          </dl>
          <LinkButton to="/gallery" variant="secondary" className="mt-12">
            Voir la galerie
          </LinkButton>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <Reveal className="mt-10">
            <Photo src={IMG.fade} alt="Un dégradé fraîchement terminé" width={600} height={800} className="aspect-3/4 w-full rounded-2xl object-cover grayscale" />
          </Reveal>
          <Reveal delay={0.1}>
            <Photo src={IMG.cutting} alt="Un barbier au travail" width={600} height={800} className="aspect-3/4 w-full rounded-2xl object-cover grayscale" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PriceItem({ service: s }: { service: Service }) {
  return (
    <li>
      <Link
        to={`/book?service=${s._id}`}
        className="group block rounded-xl border border-transparent px-4 py-5 transition-colors hover:border-line hover:bg-surface-2"
        aria-label={`Réserver ${s.name}, ${formatPrice(s.price)}, ${formatDuration(s.duration)}`}
      >
        <div className="flex items-baseline justify-between gap-6">
          <span className="text-lg font-semibold">{s.name}</span>
          <span className="text-lg font-semibold whitespace-nowrap tabular-nums">{formatPrice(s.price)}</span>
        </div>
        <p className="mt-2 flex items-baseline justify-between gap-6 text-sm text-muted">
          <span>{s.description}</span>
          <span className="shrink-0 whitespace-nowrap text-subtle">{formatDuration(s.duration)}</span>
        </p>
      </Link>
    </li>
  );
}

function Menu({ services, loading }: { services: Service[] | null; loading: boolean }) {
  return (
    <section id="tarifs" className="border-y border-line bg-surface">
      <div className={`${WRAP} py-24 sm:py-32`}>
        <Heading title="Les tarifs" text="Des prix fixes, réglés au salon. Touchez une prestation pour la réserver." />
        <ul className="mx-auto mt-16 grid max-w-5xl gap-x-12 gap-y-2 md:grid-cols-2">
          {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          {services?.slice(0, 6).map((s) => (
            <PriceItem key={s._id} service={s} />
          ))}
        </ul>
        <div className="mt-14 text-center">
          <LinkButton to="/services" variant="secondary">
            Toute la carte
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  const items = [
    { src: IMG.fade, alt: "Dégradé à la lame", icon: Scissors, t: "Dégradés précis", d: "Des transitions nettes et des lignes franches, adaptées à la forme de votre tête." },
    { src: IMG.beard, alt: "Soin de la barbe", icon: UserCircle, t: "Barbe & rasage", d: "Rasage à la serviette chaude, tailles de barbe et soins du visage." },
  ];
  return (
    <section>
      <div className={`${WRAP} grid gap-6 py-24 sm:py-32 md:grid-cols-2`}>
        {items.map(({ src, alt, icon: Icon, t, d }) => (
          <div key={t} className="relative isolate flex min-h-96 flex-col justify-end overflow-hidden rounded-2xl border border-line p-8 sm:min-h-[28rem] sm:p-10">
            <Photo src={src} alt={alt} width={900} height={700} className="absolute inset-0 -z-20 size-full object-cover grayscale" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-black/60" />
            <span className="mb-6 flex size-11 items-center justify-center rounded-lg border border-white/15 bg-black/50 text-white backdrop-blur" aria-hidden>
              <Icon size={22} />
            </span>
            <h3 className="text-2xl font-semibold text-white">{t}</h3>
            <p className="mt-3 max-w-sm text-white/70">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BarberCard({ barber, index = 0 }: { barber: Barber; index?: number; large?: boolean }) {
  const photo = barber.avatarUrl || IMG.team[index % IMG.team.length];
  return (
    <Link to={`/barbers/${barber._id}`} className="group relative isolate block aspect-3/4 overflow-hidden rounded-2xl border border-line bg-surface-2">
      <img src={photo} alt="" className="size-full object-cover grayscale transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none" loading="lazy" />
      <span aria-hidden className="sr-only">
        {barber.username.slice(0, 1)}
      </span>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-black/70 p-6">
        <div>
          <h3 className="text-xl font-semibold text-white">{barber.username}</h3>
          {barber.specialties?.length ? <p className="mt-1 text-sm text-white/70">{barber.specialties.join(", ")}</p> : null}
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-white">
          {barber.rating ? (
            <>
              <Star size={14} weight="fill" aria-hidden />
              {barber.rating.toFixed(1)}
            </>
          ) : (
            <span className="text-white/70">Nouveau</span>
          )}
        </span>
      </div>
    </Link>
  );
}

function Team({ barbers, loading }: { barbers: Barber[] | null; loading: boolean }) {
  return (
    <section className="border-t border-line">
      <div className={`${WRAP} py-24 sm:py-32`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">L'équipe</h2>
            <p className="mt-4 text-muted">Rencontrez nos barbers, spécialistes du dégradé et de la coupe.</p>
          </div>
          <Link to="/barbers" className="inline-flex min-h-12 items-center gap-2 font-medium text-muted transition-colors hover:text-text">
            Voir tous les profils
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-3/4" />)}
          {barbers?.slice(0, 3).map((b, i) => (
            <BarberCard key={b._id} barber={b} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  const { data } = useFetch<Review[]>("/reviews");
  const review = data?.find((r) => r.comment && r.comment.length > 20) ?? data?.find((r) => r.comment);
  if (!review) return null;
  return (
    <section className={`${WRAP} pb-24 sm:pb-32`}>
      <figure className={`${CARD} mx-auto max-w-4xl p-8 text-center sm:p-14`}>
        <span className="flex justify-center gap-1 text-text" role="img" aria-label={`${review.rating} sur 5`}>
          {Array.from({ length: review.rating }).map((_, i) => (
            <Star key={i} size={18} weight="fill" aria-hidden />
          ))}
        </span>
        <blockquote className="mt-8 text-2xl leading-snug font-medium text-text sm:text-3xl">« {review.comment} »</blockquote>
        <figcaption className="mt-8 text-muted">
          <span className="font-semibold text-text">{review.client.username}</span>
          {typeof review.barber === "object" && <>, client de {review.barber.username}</>}
        </figcaption>
      </figure>
    </section>
  );
}

function Invitation() {
  return (
    <section className={`${WRAP} pb-24 sm:pb-32`}>
      <div className="flex flex-col items-start gap-10 rounded-3xl border border-line bg-field p-8 text-on-field sm:p-14 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-2xl text-4xl leading-tight font-semibold text-on-field sm:text-5xl">Ton fauteuil t'attend.</h2>
          <p className="mt-4 max-w-md text-on-field-secondary">Choisis la prestation, le barber et le créneau. La confirmation est immédiate.</p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-on-field-secondary">
            <a href="https://instagram.com/lempire_barber" className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-on-field">
              <InstagramLogo size={20} aria-hidden />
              @lempire_barber
            </a>
            <a href="https://www.tiktok.com/@lempire_barber" className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-on-field">
              <TiktokLogo size={20} aria-hidden />
              Lempire_barber
            </a>
          </div>
        </div>
        <div className="flex flex-col items-start gap-6 lg:items-end">
          <p className="flex items-center gap-3 rounded-lg bg-[#f2c200] px-4 py-3 font-semibold text-black">
            <Smiley size={28} weight="fill" aria-hidden />
            Souris, tu es chez L'Empire !
          </p>
          <Link to="/book" className={buttonClass("pole", "lg")}>
            <CalendarBlank size={20} aria-hidden />
            Réserver un rendez-vous
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const services = useFetch<Service[]>("/services");
  const barbers = useFetch<Barber[]>("/users/barbers");
  return (
    <>
      <Hero services={services.data} />
      <Features />
      <Salon />
      <Menu services={services.data} loading={services.loading} />
      <Highlights />
      <Team barbers={barbers.data} loading={barbers.loading} />
      <Testimonial />
      <Invitation />
    </>
  );
}
