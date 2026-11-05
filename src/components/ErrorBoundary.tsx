import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface State {
  error: Error | null;
}

/** Catches a crashing page so the rest of the app (header, nav) keeps working */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // a stale lazy chunk after a redeploy/rebuild — a reload fetches the new one
    const chunk = /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(error.message);
    return (
      <section role="alert" className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-[11px] tracking-[0.35em] text-accent uppercase">Incident</p>
        <h1 className="mt-6 font-display text-4xl font-medium">{chunk ? "Une nouvelle version est disponible" : "Cette page n'a pas pu s'afficher"}</h1>
        <p className="mt-4 leading-relaxed text-muted">{chunk ? "Rechargez la page pour continuer." : "Une erreur inattendue s'est produite. Rechargez la page ou revenez à l'accueil."}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button onClick={() => location.reload()} className="min-h-12 cursor-pointer bg-gold px-7 text-xs tracking-[0.2em] text-onaccent uppercase hover:bg-gold-hover">
            Recharger
          </button>
          <Link to="/" onClick={() => this.setState({ error: null })} className="inline-flex min-h-12 items-center border border-text/40 px-7 text-xs tracking-[0.2em] uppercase hover:border-text">
            Accueil
          </Link>
        </div>
      </section>
    );
  }
}
