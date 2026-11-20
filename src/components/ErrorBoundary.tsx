import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { buttonClass } from "./ui/Button";

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
        <p className="text-sm font-medium text-danger">Incident</p>
        <h1 className="mt-3 text-3xl font-semibold text-text">{chunk ? "Une nouvelle version est disponible" : "Cette page n'a pas pu s'afficher"}</h1>
        <p className="mt-3 text-base text-muted">{chunk ? "Rechargez la page pour continuer." : "Une erreur inattendue s'est produite. Rechargez la page ou revenez à l'accueil."}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => location.reload()} className={buttonClass("primary")}>
            Recharger
          </button>
          <Link to="/" onClick={() => this.setState({ error: null })} className={buttonClass("secondary")}>
            Accueil
          </Link>
        </div>
      </section>
    );
  }
}
