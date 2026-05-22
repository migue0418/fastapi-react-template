import {
  categoryHighlights,
  inventoryAlerts,
  kpis,
  quickActions,
  recentMovements,
} from "@/features/home/dashboard";

import "./HomePage.css";

export function HomePage() {
  return (
    <section className="home-page">
      <div className="home-kpi-grid">
        {kpis.map((item) => (
          <article key={item.label} className={`home-kpi-card tone-${item.tone}`}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.detail}</span>
          </article>
        ))}
      </div>

      <div className="home-dashboard-grid">
        <article className="home-panel">
          <div className="home-panel-header">
            <div>
              <p className="home-section-kicker">Panel principal</p>
              <h3>Elementos destacados</h3>
            </div>
            <span className="home-section-badge">Pendientes</span>
          </div>
          <div className="home-alert-list">
            {inventoryAlerts.map((item) => (
              <article key={item.reference} className="home-alert-card">
                <div>
                  <strong>{item.reference}</strong>
                  <p>{item.description}</p>
                </div>
                <div className="home-alert-meta">
                  <span>{item.location}</span>
                  <strong>{item.stock}</strong>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-header">
            <div>
              <p className="home-section-kicker">Actividad reciente</p>
              <h3>Últimas acciones</h3>
            </div>
            <span className="home-section-badge is-soft">Últimas acciones</span>
          </div>
          <div className="home-movement-list">
            {recentMovements.map((item) => (
              <div key={`${item.reference}-${item.time}`} className="home-movement-row">
                <div>
                  <strong>{item.reference}</strong>
                  <p>{item.summary}</p>
                </div>
                <div className="home-movement-meta">
                  <span>{item.time}</span>
                  <strong>{item.status}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-header">
            <div>
              <p className="home-section-kicker">Atajos</p>
              <h3>Acciones rapidas</h3>
            </div>
          </div>
          <div className="home-action-list">
            {quickActions.map((item) => (
              <article key={item.title} className="home-action-card">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span>{item.hint}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel-header">
            <div>
              <p className="home-section-kicker">Resumen</p>
              <h3>Distribución</h3>
            </div>
          </div>
          <div className="home-category-list">
            {categoryHighlights.map((item) => (
              <article key={item.name} className="home-category-card">
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <span>{item.trend}</span>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
