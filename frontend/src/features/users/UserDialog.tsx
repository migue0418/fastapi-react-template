import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  createUserRequest,
  getUserRequest,
  listRolesRequest,
  resetUserPasswordRequest,
  updateUserRequest,
} from "@/features/users/api";
import type { RoleOption } from "@/features/users/types";
import { ModalDialog } from "@/shared/ui/ModalDialog";

type UserDialogProps = {
  open: boolean;
  userId: number | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type FormState = {
  username: string;
  fullName: string;
  email: string;
  password: string;
  isActive: boolean;
  selectedRoleIds: number[];
};

const EMPTY_FORM: FormState = {
  username: "",
  fullName: "",
  email: "",
  password: "",
  isActive: true,
  selectedRoleIds: [],
};

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function UserDialog({ open, userId, onClose, onSaved }: UserDialogProps) {
  const isEditing = userId !== null;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [availableRoles, user] = await Promise.all([
          listRolesRequest(),
          isEditing && userId !== null ? getUserRequest(userId) : Promise.resolve(null),
        ]);

        if (isCancelled) {
          return;
        }

        setRoles(availableRoles);

        if (user) {
          setForm({
            username: user.username,
            fullName: user.full_name ?? "",
            email: user.email ?? "",
            password: "",
            isActive: user.is_active,
            selectedRoleIds: user.role_ids,
          });
          return;
        }

        const defaultRoleId =
          availableRoles.find((role) => role.name === "user")?.id ?? availableRoles[0]?.id;

        setForm({
          ...EMPTY_FORM,
          selectedRoleIds: defaultRoleId ? [defaultRoleId] : [],
        });
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el formulario");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [isEditing, open, userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = form.username.trim();
    if (trimmedUsername.length === 0) {
      setError("El usuario es obligatorio.");
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setError("El usuario debe tener entre 3 y 50 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError("El usuario solo puede contener letras, números, guiones y guiones bajos.");
      return;
    }

    if (!isEditing && form.password.trim().length === 0) {
      setError("La contraseña inicial es obligatoria.");
      return;
    }
    if (form.password.trim().length > 0 && form.password.trim().length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (form.selectedRoleIds.length === 0) {
      setError("Selecciona al menos un rol.");
      return;
    }

    setIsSubmitting(true);

    try {
      const basePayload = {
        username: form.username.trim(),
        full_name: normalizeOptionalText(form.fullName),
        email: normalizeOptionalText(form.email),
        is_active: form.isActive,
        role_ids: form.selectedRoleIds,
      };

      if (isEditing && userId !== null) {
        await updateUserRequest(userId, basePayload);
        if (form.password.trim().length > 0) {
          await resetUserPasswordRequest(userId, form.password);
        }
      } else {
        await createUserRequest({
          ...basePayload,
          password: form.password,
        });
      }

      await onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (roleId: number) => {
    setForm((current) => ({
      ...current,
      selectedRoleIds: current.selectedRoleIds.includes(roleId)
        ? current.selectedRoleIds.filter((id) => id !== roleId)
        : [...current.selectedRoleIds, roleId],
    }));
  };

  return (
    <ModalDialog
      open={open}
      title={isEditing ? "Editar usuario" : "Crear usuario"}
      onClose={onClose}
      disableClose={isSubmitting}
      width={720}
    >
      {isLoading ? (
        <div className="ui-empty-state">Cargando formulario...</div>
      ) : (
        <form className="ui-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="ui-form-grid">
            <label className="ui-field">
              <span className="ui-field-label">Usuario</span>
              <input
                type="text"
                className="ui-input"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                required
              />
            </label>

            <label className="ui-field">
              <span className="ui-field-label">Nombre completo</span>
              <input
                type="text"
                className="ui-input"
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>

            <label className="ui-field">
              <span className="ui-field-label">Email</span>
              <input
                type="email"
                className="ui-input"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>

            <label className="ui-field">
              <span className="ui-field-label">
                {isEditing ? "Nueva contraseña" : "Contraseña inicial"}
              </span>
              <input
                type="password"
                className="ui-input"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                required={!isEditing}
                placeholder={isEditing ? "Dejar vacío para mantener la actual" : ""}
              />
            </label>
          </div>

          <label className="ui-toggle-card">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <div>
              <strong>Usuario activo</strong>
              <span>Permite acceso al sistema y mantiene sus credenciales operativas.</span>
            </div>
          </label>

          <section className="ui-stack">
            <div className="ui-section-heading">
              <h3>Roles</h3>
              <p>Selecciona los permisos que tendrá este usuario.</p>
            </div>

            <div className="ui-role-grid">
              {roles.length === 0 ? (
                <div className="ui-empty-state">No hay roles disponibles.</div>
              ) : (
                roles.map((role) => {
                  const checked = form.selectedRoleIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`ui-role-option${checked ? " is-selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                      />
                      <div>
                        <strong>{role.name}</strong>
                        <span>{role.description || "Sin descripción"}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </section>

          {error ? <div className="ui-alert ui-alert-danger">{error}</div> : null}

          <div className="ui-modal-actions">
            <button type="button" className="ui-button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="ui-button ui-button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </ModalDialog>
  );
}
