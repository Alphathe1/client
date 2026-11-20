import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowCounterClockwise, Info, WarningCircle } from "@phosphor-icons/react";
import { Button } from "../../../components/ui/Button";
import { controlClass } from "../../../components/ui/Field";
import { DAYS } from "../../../lib/format";
import { BLOCK_GROUP_LABELS, BLOCK_LABELS, blockGroup, fieldId, type BlockId } from "../../../lib/site/editor";
import type { InnerPage } from "../../../lib/site/types";
import { LIMITS, MESSAGES } from "../../../lib/site/validate";
import { AddImageButton, AnnounceContext, IconPicker, ImageField, ListImageSlot, ListItem, ListSection, SwitchField, TextField, useEditorForm } from "./fields";

/** Short explanation inside a form: neutral (info) or warning; text and icon, never colour alone */
export function Notice({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  const look = tone === "warning" ? "border-warning/40 bg-warning/12" : "border-line bg-surface-2";
  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 text-sm text-text ${look}`}>
      {tone === "warning" ? <WarningCircle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden /> : <Info size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const inlineLink = "font-medium text-text underline underline-offset-2 hover:decoration-2";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {children}
    </section>
  );
}

/** Monday first, as the salon's week reads */
const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

function DayRow({ index }: { index: number }) {
  const { draft, dispatch, errorAt, touch, busy } = useEditorForm();
  const d = draft.hours.days[index];
  if (!d) return null;
  const name = DAYS[d.day] ?? "Jour";
  const base = `hours.days.${index}`;
  const startError = errorAt(`${base}.start`);
  const endError = errorAt(`${base}.end`);
  const error = startError ?? endError;
  const errId = `${fieldId(base)}-err`;
  const time = (key: "start" | "end", label: string, invalid: boolean) => (
    <input
      id={fieldId(`${base}.${key}`)}
      type="time"
      aria-label={`${label} le ${name.toLowerCase()}`}
      value={d[key]}
      readOnly={busy}
      aria-invalid={invalid || undefined}
      aria-describedby={error ? errId : undefined}
      onChange={(e) => dispatch({ type: "set", path: `${base}.${key}`, value: e.target.value })}
      onBlur={() => touch(`${base}.${key}`)}
      className={`${controlClass} min-h-11 w-32! font-mono ${invalid ? "border-danger" : "border-line-strong hover:border-text"}`}
    />
  );
  return (
    <div className="flex flex-col gap-1.5 border-b border-line py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex min-h-11 w-32 cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={d.open} disabled={busy} onChange={(e) => dispatch({ type: "set", path: `${base}.open`, value: e.target.checked })} className="size-4" />
          {name}
          <span className="sr-only"> : ouvert</span>
        </label>
        {d.open ? (
          <div className="flex flex-wrap items-center gap-2">
            {time("start", "Ouverture", !!startError)}
            <span aria-hidden className="text-subtle">
              –
            </span>
            {time("end", "Fermeture", !!endError)}
          </div>
        ) : (
          <span className="text-sm text-subtle">Fermé</span>
        )}
      </div>
      {error && (
        <p id={errId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function HoursFields() {
  const { draft, errorAt } = useEditorForm();
  const rows = WEEK.map((day) => draft.hours.days.findIndex((d) => d.day === day)).filter((i) => i >= 0);
  const listError = errorAt("hours.days");
  return (
    <>
      <SwitchField path="hours.detailed" label="Afficher des horaires détaillés" hint="Désactivé, le site affiche seulement la phrase ci-dessous, comme aujourd'hui." />
      <TextField path="hours.summary" label="Phrase d'horaires" max={LIMITS.hoursSummary} hint="Par exemple « Ouvert 7j/7 »." />
      <div id={fieldId("hours.days")} tabIndex={-1} role="group" aria-labelledby="hours-days-title" className="flex flex-col outline-none">
        <h3 id="hours-days-title" className="text-sm font-semibold text-text">
          Heures par jour
        </h3>
        <p className="mt-1 mb-2 text-xs text-subtle">
          {draft.hours.detailed ? "Le statut « Ouvert » ou « Fermé » du site est calculé avec ces heures." : "Elles ne s'affichent qu'une fois l'option ci-dessus activée."}
        </p>
        {rows.map((i) => (
          <DayRow key={i} index={i} />
        ))}
        {listError && (
          <p role="alert" className="text-sm text-danger">
            {listError}
          </p>
        )}
      </div>
    </>
  );
}

function PageFields({ page }: { page: InnerPage }) {
  return (
    <>
      <TextField path={`pages.${page}.title`} label="Titre de la page" max={LIMITS.pageTitle} />
      <TextField path={`pages.${page}.text`} label="Texte d'introduction" max={LIMITS.pageText} rows={3} />
    </>
  );
}

/** The fields of one block, in the order validateContent reports them (Publish lands on the first invalid one) */
function BlockFields({ block }: { block: BlockId }) {
  const { draft } = useEditorForm();
  switch (block) {
    case "identity":
      return (
        <>
          <Group title="Identité">
            <TextField path="identity.tagline" label="Accroche" max={LIMITS.tagline} hint="Une phrase courte qui présente le salon." />
            <TextField path="identity.description" label="Description" max={LIMITS.description} rows={3} hint="Reprise dans le pied de page." />
          </Group>
          <Group title="Contact">
            <TextField path="contact.phone" label="Téléphone" max={LIMITS.phoneMax} type="tel" mono hint="Chiffres, espaces et + ( ) . -, 6 caractères au moins." />
            <TextField path="contact.address" label="Adresse" max={LIMITS.address} required={false} hint="Facultative : laissez vide pour ne pas l'afficher." />
            <TextField path="contact.mapsUrl" label="Lien vers la carte" type="url" required={false} hint={MESSAGES.link} placeholder="https://maps.app.goo.gl/…" />
          </Group>
          <Group title="Réseaux">
            <TextField path="contact.instagram" label="Instagram" type="url" required={false} hint={MESSAGES.link} placeholder="https://instagram.com/…" />
            <TextField path="contact.tiktok" label="TikTok" type="url" required={false} hint={MESSAGES.link} placeholder="https://www.tiktok.com/@…" />
          </Group>
        </>
      );
    case "hours":
      return <HoursFields />;
    case "announcement":
      return (
        <>
          <SwitchField path="announcement.enabled" label="Afficher l'annonce" hint="Une ligne au-dessus de l'en-tête, sur toutes les pages." />
          <TextField path="announcement.text" label="Texte" max={LIMITS.announcementText} rows={2} required={draft.announcement.enabled} hint="Obligatoire quand l'annonce est affichée." />
          <TextField path="announcement.linkLabel" label="Texte du lien" max={LIMITS.announcementLinkLabel} required={false} hint="Facultatif, à remplir avec la destination." />
          <TextField path="announcement.linkTo" label="Destination du lien" required={false} hint="Adresse https://…, ou page du site commençant par /, par exemple /services." placeholder="/services" />
        </>
      );
    case "hero":
      return (
        <>
          <TextField path="home.hero.title" label="Titre" max={LIMITS.heroTitle} hint="Le titre principal de l'accueil." />
          <TextField path="home.hero.text" label="Texte" max={LIMITS.heroText} rows={4} />
          <TextField path="home.hero.cta" label="Texte du bouton de réservation" max={LIMITS.heroCta} />
          <ImageField path="home.hero.image" label="Photo" hint="Facultative." />
        </>
      );
    case "features":
      return (
        <ListSection path="home.features.items" noun="Atout" rule="De 2 à 4 atouts." add={{ label: "Ajouter un atout", item: () => ({ icon: "star", title: "", text: "" }) }}>
          {draft.home.features.items.map((_, i, items) => (
            <ListItem key={i} path="home.features.items" index={i} count={items.length} title={`Atout ${i + 1}`}>
              <IconPicker path={`home.features.items.${i}.icon`} label="Icône" />
              <TextField path={`home.features.items.${i}.title`} label="Titre" max={LIMITS.featureTitle} />
              <TextField path={`home.features.items.${i}.text`} label="Texte" max={LIMITS.featureText} rows={2} />
            </ListItem>
          ))}
        </ListSection>
      );
    case "salon":
      return (
        <>
          <TextField path="home.salon.kicker" label="Surtitre" max={LIMITS.salonKicker} hint="Le petit texte au-dessus du titre." />
          <TextField path="home.salon.title" label="Titre" max={LIMITS.salonTitle} />
          <Group title="Points">
            <ListSection path="home.salon.points" noun="Point" rule="De 1 à 3 points." add={{ label: "Ajouter un point", item: () => ({ title: "", text: "" }) }}>
              {draft.home.salon.points.map((_, i, points) => (
                <ListItem key={i} path="home.salon.points" index={i} count={points.length} title={`Point ${i + 1}`}>
                  <TextField path={`home.salon.points.${i}.title`} label="Titre" max={LIMITS.salonPointTitle} />
                  <TextField path={`home.salon.points.${i}.text`} label="Texte" max={LIMITS.salonPointText} rows={3} />
                </ListItem>
              ))}
            </ListSection>
          </Group>
          <Group title="Photos">
            <ListSection path="home.salon.images" noun="Photo" rule="Jusqu'à 2 photos. Sans photo, la section garde son texte seul.">
              {draft.home.salon.images.map((_, i) => (
                <ListImageSlot key={i} path="home.salon.images" index={i} label={`Photo ${i + 1}`} />
              ))}
              <AddImageButton path="home.salon.images" label="Ajouter une photo" />
            </ListSection>
          </Group>
        </>
      );
    case "prices":
      return (
        <>
          <TextField path="home.prices.title" label="Titre" max={LIMITS.pricesTitle} />
          <TextField path="home.prices.text" label="Texte" max={LIMITS.pricesText} rows={3} />
          <Notice>
            Les six premières prestations en ligne s'affichent ici. Elles se gèrent dans{" "}
            <Link to="/dashboard/services" className={inlineLink}>
              Services et tarifs
            </Link>
            .
          </Notice>
        </>
      );
    case "highlights":
      return (
        <ListSection path="home.highlights.items" noun="Carte" rule="1 ou 2 cartes." add={{ label: "Ajouter une carte", item: () => ({ image: "", title: "", text: "" }) }}>
          {draft.home.highlights.items.map((_, i, items) => (
            <ListItem key={i} path="home.highlights.items" index={i} count={items.length} title={`Carte ${i + 1}`}>
              <ImageField path={`home.highlights.items.${i}.image`} label="Photo" hint="Facultative." />
              <TextField path={`home.highlights.items.${i}.title`} label="Titre" max={LIMITS.highlightTitle} />
              <TextField path={`home.highlights.items.${i}.text`} label="Texte" max={LIMITS.highlightText} rows={3} />
            </ListItem>
          ))}
        </ListSection>
      );
    case "team":
      return (
        <>
          <TextField path="home.team.title" label="Titre" max={LIMITS.teamTitle} />
          <TextField path="home.team.text" label="Texte" max={LIMITS.teamText} rows={3} />
          <Notice>
            Trois barbers de l'équipe s'affichent ici. Ils se gèrent dans{" "}
            <Link to="/dashboard/team" className={inlineLink}>
              Équipe
            </Link>
            .
          </Notice>
        </>
      );
    case "testimonial":
      return (
        <Notice>
          Cette section n'a rien à saisir : elle montre le premier avis client avec un commentaire. Sans un tel avis, elle n'apparaît pas, même affichée. Les avis se gèrent dans{" "}
          <Link to="/dashboard/reviews" className={inlineLink}>
            Avis
          </Link>
          .
        </Notice>
      );
    case "invitation":
      return (
        <>
          <TextField path="home.invitation.title" label="Titre" max={LIMITS.invitationTitle} />
          <TextField path="home.invitation.text" label="Texte" max={LIMITS.invitationText} rows={3} />
          <TextField path="home.invitation.sign" label="Texte du panneau jaune" max={LIMITS.invitationSign} />
        </>
      );
    default:
      return <PageFields page={block} />;
  }
}

interface BlockFormProps {
  block: BlockId;
  /** the block is a hidden home section */
  hidden: boolean;
  onShow: () => void;
  /** false when the block already shows its original content (or has none) */
  canReset: boolean;
  /** asks for confirmation before resetting */
  onReset: () => void;
}

/** The form of the chosen block (spec §6.5): group, name, fields, then "Rétablir le contenu d'origine" */
export function BlockForm({ block, hidden, onShow, canReset, onReset }: BlockFormProps) {
  // one polite live region per form; the count makes a repeated message (two "supprimé" in a row) announce again
  const [note, setNote] = useState({ text: "", count: 0 });
  const announce = useCallback((text: string) => setNote((n) => ({ text, count: n.count + 1 })), []);
  return (
    <AnnounceContext.Provider value={announce}>
    <form noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="site-block-title" className="flex flex-col gap-6 p-5 sm:p-6">
      <p role="status" aria-live="polite" className="sr-only">
        {note.count % 2 ? `${note.text}​` : note.text}
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-subtle">{BLOCK_GROUP_LABELS[blockGroup(block)]}</p>
          <h2 id="site-block-title" tabIndex={-1} className="text-xl font-semibold text-text outline-none">
            {BLOCK_LABELS[block]}
          </h2>
        </div>
        {hidden && (
          <Notice tone="warning">
            Section masquée : elle n'apparaît pas sur l'accueil.{" "}
            <button type="button" onClick={onShow} className={`${inlineLink} cursor-pointer`}>
              Afficher la section
            </button>
          </Notice>
        )}
      </div>
      <BlockFields block={block} />
      {canReset && (
        <div className="border-t border-line pt-5">
          <Button variant="ghost" size="sm" icon={<ArrowCounterClockwise size={16} aria-hidden />} onClick={onReset}>
            Rétablir le contenu d'origine
          </Button>
        </div>
      )}
    </form>
    </AnnounceContext.Provider>
  );
}
