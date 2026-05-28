import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";
import "./LoginPage.css";

const brandHighlights = [
  {
    title: "Autenticación JWT",
    description: "Login seguro con tokens JWT y refresco de sesión.",
  },
  {
    title: "Gestión de roles",
    description: "Control de acceso basado en roles listo para personalizar.",
  },
  {
    title: "API + Frontend",
    description: "Backend FastAPI y frontend React listos para escalar.",
  },
] as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Usuario y contraseña son obligatorios.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(
        { username: username.trim(), password },
        { rememberMe },
      );
      navigate("/", { replace: true });
    } catch {
      setError("Credenciales invalidas o error de servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-brand-header">
            <div className="login-logo-wrap">
              <svg
                className="login-logo"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="login-brand-heading">
              <p className="login-kicker">FastAPI Template</p>
              <span className="login-badge">Admin Panel</span>
            </div>
          </div>
          <h1>Panel de administración listo para usar.</h1>
          <p className="login-copy">
            Accede, gestiona usuarios y roles, y amplía el proyecto con tus propias
            funcionalidades.
          </p>
          <div className="login-benefits" aria-label="Beneficios principales">
            {brandHighlights.map((item) => (
              <article key={item.title} className="login-benefit-card">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <form className="login-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="login-form-header">
            <p>Bienvenido de nuevo</p>
            <h2>Inicia sesión</h2>
            <span>
              Introduce tus credenciales para acceder al panel.
            </span>
          </div>

          <label className="login-field">
            <span>Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="admin"
            />
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Introduce tu contraseña"
            />
          </label>

          <label className="login-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Mantener sesión iniciada</span>
          </label>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
