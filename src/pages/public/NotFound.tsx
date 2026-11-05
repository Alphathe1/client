import { LinkButton } from "../../components/ui/Button";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col items-center justify-center px-6 py-32 text-center">
      <p className="font-display text-8xl font-normal text-accent sm:text-9xl">404</p>
      <h1 className="mt-6 font-display text-4xl font-medium">Page introuvable</h1>
      <p className="mt-4 text-muted">Cette adresse ne mène à aucune page du salon.</p>
      <LinkButton to="/" variant="secondary" className="mt-12">
        Retour à l'accueil
      </LinkButton>
    </section>
  );
}
