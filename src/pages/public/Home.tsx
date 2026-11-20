import { useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarBlank, Phone, Smiley, Users } from "@phosphor-icons/react";
import { Button, buttonClass, LinkButton } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { EmptyState, ErrorState, Skeleton, Stars } from "../../components/ui/Display";
import { Reveal } from "../../components/ui/Echo";
import { BarberCard } from "../../components/site/BarberCard";
import { featureIcon } from "../../components/site/featureIcons";
import { OpeningStatus } from "../../components/site/OpeningStatus";
import { PriceRow } from "../../components/site/PriceRow";
import { ServicesEmpty } from "../../components/site/ServicesEmpty";
import { SiteImage } from "../../components/site/SiteImage";
import { SOCIAL_ICON } from "../../components/site/social";
import { SECTION, SECTION_TITLE, WRAP } from "../../components/site/styles";
import { useSite } from "../../context/SiteContext";
import { useFetch } from "../../lib/useFetch";
import { formatPrice } from "../../lib/format";
import { socialLinks, telHref } from "../../lib/site/links";
import type { HomeSectionId, SiteContent } from "../../lib/site/types";
import type { Barber, Review, Service } from "../../lib/types";

interface Fetched<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

interface SectionProps {
  content: SiteContent;
  services: Fetched<Service[]>;
  barbers: Fetched<Barber[]>;
}

const FEATURE_COLUMNS: Record<number, string> = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

/** Pick a service, continue to the full booking flow */
function QuickBooking({ services }: { services: Service[] | null }) {
  const navigate = useNavigate();
  const [service, setService] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(service ? `/book?service=${service}` : "/book");
      }}
      className="rounded-lg border border-line bg-surface p-6 sm:p-8"
    >
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-text">
          <CalendarBlank size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text">Réservation rapide</h2>
          <p className="text-sm text-muted">Choisissez votre créneau en quelques secondes</p>
        </div>
      </div>
      <div className="mt-6">
        <Select label="Prestation" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Choisir une prestation</option>
          {services?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} — {formatPrice(s.price)}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="primary" className="mt-6 w-full">
        Continuer
        <ArrowRight size={18} aria-hidden />
      </Button>
    </form>
  );
}

function Hero({ content, services }: SectionProps) {
  const { hero } = content.home;
  const tel = telHref(content.contact.phone);
  return (
    <section data-section="hero" className="relative isolate overflow-hidden border-b border-line">
      <SiteImage src={hero.image} loading="eager" className="absolute inset-0 -z-20 size-full object-cover opacity-20 grayscale" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-bg/70" />
      <div className={`${WRAP} grid grid-cols-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-28`}>
        <div className="min-w-0 lg:col-span-7">
          <div className="mb-6 xl:hidden">
            <OpeningStatus />
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold text-balance text-text wrap-anywhere sm:text-5xl lg:text-6xl">
            <span className="sr-only">L'Empire Barber. </span>
            {hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-muted wrap-anywhere">{hero.text}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton to="/book" variant="brand" size="lg" icon={<CalendarBlank size={20} aria-hidden />} className="max-w-full wrap-anywhere">
              {hero.cta}
            </LinkButton>
            {tel && (
              <a href={tel} className={buttonClass("secondary", "lg")}>
                <Phone size={20} aria-hidden />
                <span className="font-mono">{content.contact.phone}</span>
              </a>
            )}
          </div>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <QuickBooking services={services.data} />
        </div>
      </div>
    </section>
  );
}

function Features({ content }: SectionProps) {
  const { items } = content.home.features;
  return (
    <section data-section="features" aria-labelledby="home-features" className="border-b border-line">
      <h2 id="home-features" className="sr-only">
        Nos atouts
      </h2>
      <ul className={`${WRAP} ${SECTION} grid grid-cols-1 gap-10 sm:grid-cols-2 ${FEATURE_COLUMNS[items.length] ?? "lg:grid-cols-4"}`}>
        {items.map((f, i) => {
          const Icon = featureIcon(f.icon);
          return (
            <li key={i} className="min-w-0">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-md border border-line bg-surface-2 text-text">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 text-base font-semibold text-text wrap-anywhere">{f.title}</h3>
              <p className="mt-2 text-muted wrap-anywhere">{f.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Salon({ content }: SectionProps) {
  const { kicker, title, points, images } = content.home.salon;
  const photos = images.filter(Boolean).slice(0, 2);
  return (
    <section data-section="salon" aria-labelledby="home-salon">
      <div className={`${WRAP} ${SECTION} grid grid-cols-1 items-center gap-12 ${photos.length ? "lg:grid-cols-2 lg:gap-20" : ""}`}>
        <div className="max-w-xl min-w-0">
          <p className="text-sm font-medium text-subtle wrap-anywhere">{kicker}</p>
          <h2 id="home-salon" className={`mt-3 ${SECTION_TITLE}`}>
            {title}
          </h2>
          <dl className="mt-8 space-y-6">
            {points.map((p, i) => (
              <div key={i}>
                <dt className="font-semibold text-text wrap-anywhere">{p.title}</dt>
                <dd className="mt-1 text-muted wrap-anywhere">{p.text}</dd>
              </div>
            ))}
          </dl>
          <LinkButton to="/gallery" variant="secondary" className="mt-10">
            Voir la galerie
          </LinkButton>
        </div>
        {photos.length > 0 && (
          <div className={`grid gap-4 sm:gap-6 ${photos.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {photos.map((src, i) => (
              <Reveal key={`${i}-${src}`} className={photos.length === 2 && i === 0 ? "mt-10" : ""} delay={i * 0.1}>
                <SiteImage src={src} className="aspect-3/4 w-full rounded-lg object-cover grayscale" />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Prices({ content, services }: SectionProps) {
  const { title, text } = content.home.prices;
  return (
    <section data-section="prices" aria-labelledby="home-prices" className="border-y border-line bg-surface">
      <div className={`${WRAP} ${SECTION}`}>
        <div className="max-w-2xl">
          <h2 id="home-prices" className={SECTION_TITLE}>
            {title}
          </h2>
          <p className="mt-3 text-muted wrap-anywhere">{text}</p>
        </div>
        <div className="mt-10">
          {services.error ? (
            <ErrorState message={services.error} onRetry={services.reload} />
          ) : services.loading ? (
            <div className="grid grid-cols-1 gap-x-12 gap-y-2 md:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : services.data?.length ? (
            <>
              <ul className="grid grid-cols-1 gap-x-12 gap-y-1 md:grid-cols-2">
                {services.data.slice(0, 6).map((s) => (
                  <li key={s._id} className="min-w-0">
                    <PriceRow service={s} />
                  </li>
                ))}
              </ul>
              <LinkButton to="/services" variant="secondary" className="mt-10">
                Toute la carte
              </LinkButton>
            </>
          ) : (
            <ServicesEmpty />
          )}
        </div>
      </div>
    </section>
  );
}

function Highlights({ content }: SectionProps) {
  const { items } = content.home.highlights;
  return (
    <section data-section="highlights" aria-labelledby="home-highlights">
      <h2 id="home-highlights" className="sr-only">
        À la une
      </h2>
      <ul className={`${WRAP} ${SECTION} grid grid-cols-1 gap-6 ${items.length > 1 ? "md:grid-cols-2" : ""}`}>
        {items.map((h, i) => (
          <li
            key={i}
            className={`relative isolate flex min-h-80 min-w-0 flex-col justify-end overflow-hidden rounded-lg border border-line p-6 sm:min-h-96 sm:p-8 ${h.image ? "" : "bg-surface-2"}`}
          >
            {h.image && (
              <>
                <SiteImage src={h.image} className="absolute inset-0 -z-20 size-full object-cover grayscale" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-black/65" />
              </>
            )}
            <h3 className={`text-2xl font-semibold wrap-anywhere ${h.image ? "text-white" : "text-text"}`}>{h.title}</h3>
            <p className={`mt-3 max-w-md wrap-anywhere ${h.image ? "text-white/80" : "text-muted"}`}>{h.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Team({ content, barbers }: SectionProps) {
  const { title, text } = content.home.team;
  return (
    <section data-section="team" aria-labelledby="home-team" className="border-t border-line">
      <div className={`${WRAP} ${SECTION}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl min-w-0">
            <h2 id="home-team" className={SECTION_TITLE}>
              {title}
            </h2>
            <p className="mt-3 text-muted wrap-anywhere">{text}</p>
          </div>
          {barbers.data?.length ? (
            <Link to="/barbers" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-muted transition-colors duration-100 ease-out hover:text-text">
              Voir tous les profils
              <ArrowRight size={16} aria-hidden />
            </Link>
          ) : null}
        </div>
        <div className="mt-10">
          {barbers.error ? (
            <ErrorState message={barbers.error} onRetry={barbers.reload} />
          ) : barbers.loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="aspect-4/5" />
              ))}
            </div>
          ) : barbers.data?.length ? (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {barbers.data.slice(0, 3).map((b) => (
                <li key={b._id} className="min-w-0">
                  <BarberCard barber={b} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Users size={24} />} title="Aucun barber pour le moment" text="L'équipe sera présentée ici." />
          )}
        </div>
      </div>
    </section>
  );
}

/** One recent real review, managed on the Reviews page; nothing at all when there is none (or it cannot be loaded) */
function Testimonial() {
  const { data, loading } = useFetch<Review[]>("/reviews");
  const review = data?.find((r) => r.comment && r.comment.length > 20) ?? data?.find((r) => r.comment);
  if (loading)
    return (
      <section data-section="testimonial" aria-hidden className={`${WRAP} ${SECTION}`}>
        <Skeleton className="mx-auto h-56 max-w-3xl" />
      </section>
    );
  if (!review) return null;
  return (
    <section data-section="testimonial" aria-labelledby="home-testimonial" className={`${WRAP} ${SECTION}`}>
      <h2 id="home-testimonial" className="sr-only">
        Avis client
      </h2>
      <figure className="mx-auto max-w-3xl rounded-lg border border-line bg-surface p-8 text-center sm:p-12">
        <div className="flex justify-center">
          <Stars value={review.rating} size={18} />
        </div>
        <blockquote className="mt-6 text-xl font-medium text-text wrap-anywhere sm:text-2xl">« {review.comment} »</blockquote>
        <figcaption className="mt-6 text-sm text-muted">
          <span className="font-semibold text-text">{review.client.username}</span>
          {typeof review.barber === "object" && <>, client de {review.barber.username}</>}
        </figcaption>
      </figure>
    </section>
  );
}

function Invitation({ content }: SectionProps) {
  const { title, text, sign } = content.home.invitation;
  const socials = socialLinks(content.contact);
  return (
    <section data-section="invitation" aria-labelledby="home-invitation" className={`${WRAP} ${SECTION}`}>
      <div className="flex flex-col gap-10 rounded-lg border border-line bg-surface p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-14">
        <div className="min-w-0">
          <h2 id="home-invitation" className={`max-w-2xl ${SECTION_TITLE}`}>
            {title}
          </h2>
          <p className="mt-3 max-w-md text-muted wrap-anywhere">{text}</p>
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
              {socials.map((s) => {
                const Icon = SOCIAL_ICON[s.network];
                return (
                  <li key={s.network} className="min-w-0">
                    <a
                      href={s.href}
                      aria-label={s.handle ? `${s.label} : ${s.handle}` : s.label}
                      className="inline-flex min-h-11 max-w-full items-center gap-2 text-muted transition-colors duration-100 ease-out hover:text-text"
                    >
                      <Icon size={20} aria-hidden className="shrink-0" />
                      <span className="min-w-0 wrap-anywhere">{s.handle || s.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-5 lg:items-end">
          <p className="flex max-w-full items-center gap-3 rounded-md bg-brand-fill px-4 py-3 font-semibold text-on-brand">
            <Smiley size={28} weight="fill" className="shrink-0" aria-hidden />
            <span className="min-w-0 wrap-anywhere">{sign}</span>
          </p>
          <LinkButton to="/book" variant="primary" size="lg" icon={<CalendarBlank size={20} aria-hidden />}>
            Réserver un rendez-vous
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

const SECTIONS: Record<HomeSectionId, ComponentType<SectionProps>> = {
  hero: Hero,
  features: Features,
  salon: Salon,
  prices: Prices,
  highlights: Highlights,
  team: Team,
  testimonial: Testimonial,
  invitation: Invitation,
};

export default function Home() {
  const { content } = useSite();
  const visible = content.home.order.filter((id) => !content.home.hidden.includes(id));
  // always fetched, so a hidden section shown again (live preview) never flashes its empty state
  const services = useFetch<Service[]>("/services");
  const barbers = useFetch<Barber[]>("/users/barbers");
  return (
    <>
      {/* one h1 per page, even when the owner hides the header section (spec §7) */}
      {!visible.includes("hero") && <h1 className="sr-only">L'Empire Barber</h1>}
      {visible.map((id) => {
        const Section = SECTIONS[id];
        return <Section key={id} content={content} services={services} barbers={barbers} />;
      })}
    </>
  );
}
