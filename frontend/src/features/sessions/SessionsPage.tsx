import { useEffect, useState } from "react";

import { getSessionsRequest, revokeSessionRequest } from "@/features/auth/api";
import type { SessionInfo } from "@/features/auth/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Dispositivo desconocido";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("curl")) return "curl (CLI)";
  return ua.slice(0, 60);
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const loadSessions = async () => {
    try {
      const data = await getSessionsRequest();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las sesiones.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getSessionsRequest()
      .then((data) => {
        if (active) { setSessions(data); setError(null); }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar las sesiones.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleRevoke = async (sessionId: number) => {
    setRevokingId(sessionId);
    setError(null);
    try {
      await revokeSessionRequest(sessionId);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar la sesión.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="ui-page">
      <header className="ui-page-header">
        <div className="ui-page-copy">
          <p className="ui-page-kicker">Seguridad</p>
          <h1>Sesiones activas</h1>
          <p className="ui-page-subtitle">
            Gestiona los dispositivos donde tu cuenta está autenticada.
          </p>
        </div>
      </header>

      {error ? <div className="ui-alert ui-alert-danger">{error}</div> : null}

      <section className="ui-table-card">
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Iniciada</th>
                <th>Expira</th>
                <th>Estado</th>
                <th className="ui-actions-column">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="ui-empty-state">Cargando sesiones...</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ui-empty-state">No hay sesiones activas.</td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{parseUserAgent(session.user_agent)}</td>
                    <td>{formatDate(session.created_at)}</td>
                    <td>{formatDate(session.expires_at)}</td>
                    <td>
                      {session.is_current ? (
                        <span className="ui-status-pill is-active">Sesión actual</span>
                      ) : (
                        <span className="ui-status-pill is-inactive">Activa</span>
                      )}
                    </td>
                    <td className="ui-actions-column">
                      {!session.is_current && (
                        <button
                          type="button"
                          className="ui-button"
                          onClick={() => void handleRevoke(session.id)}
                          disabled={revokingId === session.id}
                          aria-label={`Revocar sesión ${session.id}`}
                        >
                          {revokingId === session.id ? "Revocando..." : "Revocar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
