import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { changeOwnPasswordRequest } from "@/features/auth/api";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_FORM: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changeOwnPasswordRequest(form.currentPassword, form.newPassword);
      setForm(EMPTY_FORM);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="ui-page">
      <header className="ui-page-header">
        <div className="ui-page-copy">
          <p className="ui-page-kicker">Cuenta</p>
          <h1>Mi perfil</h1>
          <p className="ui-page-subtitle">Gestiona tu información personal y tu contraseña.</p>
        </div>
      </header>

      <div className="ui-card" style={{ maxWidth: "480px" }}>
        <section className="ui-stack">
          <div className="ui-section-heading">
            <h3>Información</h3>
          </div>
          <dl className="ui-definition-list">
            <div>
              <dt>Usuario</dt>
              <dd>{user?.username}</dd>
            </div>
            <div>
              <dt>Nombre</dt>
              <dd>{user?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd>{user?.roles.join(", ") ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="ui-stack">
          <div className="ui-section-heading">
            <h3>Cambiar contraseña</h3>
            <p>Introduce tu contraseña actual y la nueva para actualizarla.</p>
          </div>

          <form className="ui-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="ui-field">
              <span className="ui-field-label">Contraseña actual</span>
              <input
                type="password"
                className="ui-input"
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </label>

            <label className="ui-field">
              <span className="ui-field-label">Nueva contraseña</span>
              <input
                type="password"
                className="ui-input"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <label className="ui-field">
              <span className="ui-field-label">Confirmar nueva contraseña</span>
              <input
                type="password"
                className="ui-input"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            {error ? <div className="ui-alert ui-alert-danger">{error}</div> : null}
            {success ? (
              <div className="ui-alert ui-alert-success">Contraseña actualizada correctamente.</div>
            ) : null}

            <div className="ui-modal-actions">
              <button
                type="submit"
                className="ui-button ui-button-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
