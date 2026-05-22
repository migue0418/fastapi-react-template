import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

import { Sidebar } from "@/features/app-shell/Sidebar";

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-shell-mobile-topbar">
        <Link to="/" className="app-shell-mobile-brand" aria-label="Ir al dashboard">
          <span className="app-shell-mobile-brand-mark">
            <img
              className="app-shell-mobile-brand-logo"
              src="/logo.svg"
              alt=""
              aria-hidden="true"
            />
          </span>
          <span className="app-shell-mobile-brand-title">FastAPI Template</span>
        </Link>
        <button
          type="button"
          className="app-shell-mobile-toggle"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </header>

      <div
        className={`app-shell-backdrop${isSidebarOpen ? " is-visible" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((previous) => !previous)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`app-shell-main${isSidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="app-shell-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
