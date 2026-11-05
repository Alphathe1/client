import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, SignIn, UserPlus } from "@phosphor-icons/react";
import { Logo } from "../../components/layout/Logo";
import { ThemeToggle } from "../../context/ThemeContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError } from "../../lib/api";

const PASSWORD_RX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$/;

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-field p-16 text-on-field lg:flex">
        <p className="font-display text-3xl font-extrabold uppercase">L'Empire</p>
        <div>
          <p className="font-display text-7xl leading-[0.9] font-extrabold uppercase xl:text-8xl">Votre fauteuil, vos coupes.</p>
          <p className="mt-8 max-w-md text-lg text-on-field/70">Réservez, modifiez ou annulez vos rendez-vous, et retrouvez l'historique de vos coupes avec les notes de votre barber.</p>
        </div>
        <p className="border-t border-on-field/15 pt-8 text-sm text-on-field/60">Le coiffeur préféré de ton coiffeur préféré</p>
      </div>
      <div className="flex flex-col px-6 py-10 sm:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex min-h-11 items-center gap-3 text-muted hover:text-text">
            <ArrowLeft size={18} aria-hidden /> Retour au site
          </Link>
          <span className="flex items-center gap-4">
            <ThemeToggle />
            <Logo compact />
          </span>
        </div>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <h1 className="font-display text-6xl leading-[0.95] font-extrabold uppercase">{title}</h1>
            <p className="mt-3 text-muted">{subtitle}</p>
            <div className="mt-10">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function useRedirect() {
  const location = useLocation();
  return (location.state as { from?: string } | null)?.from ?? "/dashboard";
}

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const redirect = useRedirect();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={redirect} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(email, password);
      toast(`Bienvenue, ${u.username} !`);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Connexion" subtitle="Heureux de vous revoir dans l'Empire.">
      <form onSubmit={submit} className="flex flex-col gap-7" noValidate>
        {error && (
          <p role="alert" className="border-l-4 border-danger bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Mot de passe" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" loading={loading} icon={<SignIn size={20} aria-hidden />}>
          Se connecter
        </Button>
        <p className="text-center text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link to="/register" state={{ from: redirect }} className="text-accent underline underline-offset-4">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const redirect = useRedirect();
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={redirect} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (f = form) => {
    const e: Record<string, string> = {};
    if (f.username.trim().length < 3) e.username = "Au moins 3 caractères.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Adresse email invalide.";
    if (!PASSWORD_RX.test(f.password)) e.password = "8 caractères min. avec une majuscule, une minuscule et un chiffre.";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`reg-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setServerError(null);
    setLoading(true);
    try {
      await register({ username: form.username.trim(), email: form.email, password: form.password, ...(form.phone ? { phone: form.phone } : {}) });
      toast("Compte créé — bienvenue dans l'Empire !");
      navigate(redirect, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.field) setErrors({ [apiErr.field]: apiErr.message });
      else setServerError(apiErr.message);
    } finally {
      setLoading(false);
    }
  };

  const blur = (k: string) => () => {
    const e = validate();
    setErrors((prev) => {
      const next = { ...prev };
      if (e[k]) next[k] = e[k];
      else delete next[k];
      return next;
    });
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Réservez en ligne et suivez l'historique de vos coupes.">
      <form onSubmit={submit} className="flex flex-col gap-7" noValidate>
        {serverError && (
          <p role="alert" className="border-l-4 border-danger bg-danger/10 p-3 text-sm text-danger">
            {serverError}
          </p>
        )}
        <Input id="reg-username" label="Nom d'utilisateur" autoComplete="username" value={form.username} onChange={set("username")} onBlur={blur("username")} error={errors.username} required />
        <Input id="reg-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} onBlur={blur("email")} error={errors.email} required />
        <Input id="reg-phone" label="Téléphone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} hint="Optionnel — pour vous joindre en cas d'imprévu." />
        <Input
          id="reg-password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          onBlur={blur("password")}
          error={errors.password}
          hint="8 caractères min., une majuscule, une minuscule, un chiffre."
          required
        />
        <Button type="submit" variant="gold" size="lg" loading={loading} icon={<UserPlus size={20} aria-hidden />}>
          Créer mon compte
        </Button>
        <p className="text-center text-sm text-muted">
          Déjà inscrit ?{" "}
          <Link to="/login" state={{ from: redirect }} className="text-accent underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
