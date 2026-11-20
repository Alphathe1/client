import { LinkButton } from "../../components/ui/Button";
import { WRAP } from "../../components/site/styles";

export default function NotFound() {
  return (
    <section className={`${WRAP} flex min-h-[60dvh] flex-col items-start justify-center py-16`}>
      <p className="font-mono text-sm text-subtle">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-semibold text-text sm:text-5xl">Page introuvable</h1>
      <p className="mt-4 max-w-md text-muted">Cette adresse ne mène à aucune page du salon.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton to="/" variant="primary">
          Retour à l'accueil
        </LinkButton>
        <LinkButton to="/services" variant="secondary">
          Voir les tarifs
        </LinkButton>
      </div>
    </section>
  );
}
