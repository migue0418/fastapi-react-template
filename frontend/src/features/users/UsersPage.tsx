import { useEffect, useMemo, useState } from "react";

import { deleteUserRequest, listUsersRequest } from "@/features/users/api";
import type { UserListItem } from "@/features/users/types";
import { UserDialog } from "@/features/users/UserDialog";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PaginationFooter } from "@/shared/ui/Pagination";

type SortKey = "username" | "full_name" | "email" | "roles" | "is_active";
type StatusFilter = "all" | "active" | "inactive";

function getSortValue(user: UserListItem, sortKey: SortKey): string {
  if (sortKey === "is_active") {
    return user.is_active ? "1" : "0";
  }

  if (sortKey === "roles") {
    return user.roles.join(", ");
  }

  return String(user[sortKey] ?? "");
}

export function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("username");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const loadUsers = async () => {
    try {
      const data = await listUsersRequest();
      setUsers(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    listUsersRequest()
      .then((data) => {
        if (active) { setUsers(data); setError(null); }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.is_active).length;
    return {
      total,
      active,
      inactive: total - active,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        user.username,
        user.full_name ?? "",
        user.email ?? "",
        user.roles.join(", "),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [query, statusFilter, users]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((left, right) => {
      const comparison = getSortValue(left, sortKey).localeCompare(getSortValue(right, sortKey), "es", {
        sensitivity: "base",
        numeric: true,
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredUsers, sortDirection, sortKey]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [page, pageSize, sortedUsers]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  };

  const openCreateDialog = () => {
    setEditingUserId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (userId: number) => {
    setEditingUserId(userId);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteUserRequest(pendingDelete.id);
      setPendingDelete(null);
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el usuario");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="ui-page">
      <header className="ui-page-header">
        <div className="ui-page-copy">
          <p className="ui-page-kicker">Administración</p>
          <h1>Gestión de usuarios</h1>
          <p className="ui-page-subtitle">
            Administra cuentas, roles y estado de acceso reutilizando la base visual del shell.
          </p>
        </div>

        <button type="button" className="ui-button ui-button-primary" onClick={openCreateDialog}>
          Nuevo usuario
        </button>
      </header>

      <section className="ui-stats-grid" aria-label="Resumen de usuarios">
        <article className="ui-stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
          <p>Usuarios registrados en el sistema.</p>
        </article>
        <article className="ui-stat-card">
          <span>Activos</span>
          <strong>{stats.active}</strong>
          <p>Cuentas con acceso operativo.</p>
        </article>
        <article className="ui-stat-card">
          <span>Inactivos</span>
          <strong>{stats.inactive}</strong>
          <p>Usuarios deshabilitados o pendientes.</p>
        </article>
      </section>

      <section className="ui-toolbar">
        <label className="ui-field ui-toolbar-field">
          <span className="ui-field-label">Búsqueda</span>
          <div className="ui-search">
            <svg className="ui-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              className="ui-input"
              placeholder="Usuario, nombre, email o rol"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            />
          </div>
        </label>

        <label className="ui-field ui-toolbar-field ui-toolbar-field-compact">
          <span className="ui-field-label">Estado</span>
          <select
            className="ui-select"
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
      </section>

      {error ? <div className="ui-alert ui-alert-danger">{error}</div> : null}

      <section className="ui-table-card">
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="ui-sort-button" onClick={() => toggleSort("username")}>
                    Usuario <span>{getSortIndicator("username")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="ui-sort-button" onClick={() => toggleSort("full_name")}>
                    Nombre <span>{getSortIndicator("full_name")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="ui-sort-button" onClick={() => toggleSort("email")}>
                    Email <span>{getSortIndicator("email")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="ui-sort-button" onClick={() => toggleSort("roles")}>
                    Roles <span>{getSortIndicator("roles")}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="ui-sort-button" onClick={() => toggleSort("is_active")}>
                    Estado <span>{getSortIndicator("is_active")}</span>
                  </button>
                </th>
                <th className="ui-actions-column">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="ui-empty-state">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ui-empty-state">
                    No hay usuarios para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                    </td>
                    <td>{user.full_name || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td>{user.roles.length > 0 ? user.roles.join(", ") : "-"}</td>
                    <td>
                      {user.is_locked ? (
                        <span className="ui-status-pill is-locked">Bloqueado</span>
                      ) : (
                        <span
                          className={`ui-status-pill${user.is_active ? " is-active" : " is-inactive"}`}
                        >
                          {user.is_active ? "Activo" : "Inactivo"}
                        </span>
                      )}
                    </td>
                    <td className="ui-actions-column">
                      <div className="ui-inline-actions">
                        <button
                          type="button"
                          className="ui-icon-button"
                          onClick={() => openEditDialog(user.id)}
                          aria-label={`Editar ${user.username}`}
                          title={`Editar ${user.username}`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25zm17.7-10.2a1 1 0 0 0 0-1.4L18.35 3.3a1 1 0 0 0-1.4 0l-1.85 1.85 3.75 3.75 1.85-1.85z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="ui-icon-button is-danger"
                          onClick={() => setPendingDelete(user)}
                          aria-label={`Eliminar ${user.username}`}
                          title={`Eliminar ${user.username}`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M6 7h12v2H6V7zm2 3h8l-.8 10H8.8L8 10zm3-6h2l1 1h4v2H6V5h4l1-1z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          page={page}
          pageSize={pageSize}
          total={filteredUsers.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="usuarios"
        />
      </section>

      <UserDialog
        open={isDialogOpen}
        userId={editingUserId}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingUserId(null);
        }}
        onSaved={loadUsers}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar usuario"
        confirmLabel="Eliminar"
        isLoading={isDeleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        message={
          pendingDelete ? (
            <>
              Vas a eliminar al usuario <strong>{pendingDelete.username}</strong>. Esta accion no se
              puede deshacer.
            </>
          ) : (
            "Vas a eliminar este usuario. Esta accion no se puede deshacer."
          )
        }
      />
    </section>
  );
}
