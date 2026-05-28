import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";
import type { NavigationItem } from "@/features/app-shell/navigation";
import { navigation } from "@/features/app-shell/navigation";

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isOpen: boolean;
  onClose: () => void;
};

const SECTION_LABELS: Record<string, string> = {
  principal: "Principal",
  admin: "Administración",
};

export function Sidebar({ collapsed, onToggleCollapsed, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.full_name?.trim() || user?.username || "Usuario";
  const userInitial = useMemo(() => displayName.charAt(0).toUpperCase(), [displayName]);
  const visibleNavigation = useMemo(
    () =>
      navigation.filter((item) => {
        if (!item.requiredRoles || item.requiredRoles.length === 0) {
          return true;
        }

        return user?.roles.some((role) => item.requiredRoles?.includes(role)) ?? false;
      }),
    [user],
  );

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <aside
      className={[
        "app-shell-sidebar",
        collapsed ? "is-collapsed" : "",
        isOpen ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Navegacion principal"
    >
      <button
        type="button"
        className="app-shell-collapse-button"
        onClick={() => {
          onClose();
          onToggleCollapsed();
        }}
        aria-label={collapsed ? "Expandir menu" : "Plegar menu"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="app-shell-sidebar-header">
        <NavLink to="/" className="app-shell-brand" onClick={onClose}>
          <span className="app-shell-mark">
            <img
              className="app-shell-logo"
              src="/logo.svg"
              alt="Logo"
            />
          </span>
          <div className="app-shell-brand-copy">
            <strong>FastAPI Template</strong>
          </div>
        </NavLink>
      </div>

      <nav className="app-shell-nav" aria-label="Navegacion principal">
        {visibleNavigation.map((item, index) => {
          const showSection =
            !collapsed &&
            item.section !== undefined &&
            (index === 0 || visibleNavigation[index - 1].section !== item.section);

          return (
            <div key={item.id} className="app-shell-nav-group">
              {showSection ? (
                <span className="app-shell-nav-section-label">
                  {SECTION_LABELS[item.section ?? ""] ?? item.section}
                </span>
              ) : null}
              <SidebarItem item={item} collapsed={collapsed} onNavigate={onClose} />
            </div>
          );
        })}
      </nav>

      <div className="app-shell-footer" ref={menuRef}>
        <button
          type="button"
          className="app-shell-user-button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((previous) => !previous)}
        >
          <span className="app-shell-user-avatar" aria-hidden="true">
            {userInitial}
          </span>
          {!collapsed ? (
            <>
              <span className="app-shell-user-info">
                <strong className="app-shell-user-name">{displayName}</strong>
                <span className="app-shell-user-meta">Sesión activa</span>
              </span>
              <span className="app-shell-user-chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            </>
          ) : null}
        </button>

        {menuOpen ? (
          <div className="app-shell-user-menu" role="menu" aria-label="Opciones de usuario">
            <div className="app-shell-user-menu-info">Sesión activa</div>
            <NavLink
              to="/perfil"
              role="menuitem"
              className="app-shell-user-menu-item"
              onClick={() => setMenuOpen(false)}
            >
              Mi perfil
            </NavLink>
            <NavLink
              to="/sesiones"
              role="menuitem"
              className="app-shell-user-menu-item"
              onClick={() => setMenuOpen(false)}
            >
              Sesiones activas
            </NavLink>
            <button
              type="button"
              role="menuitem"
              className="app-shell-user-menu-item app-shell-user-menu-item-danger"
              onClick={() => void handleLogout()}
            >
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

type SidebarItemProps = {
  item: NavigationItem;
  collapsed: boolean;
  onNavigate: () => void;
};

function SidebarItem({ item, collapsed, onNavigate }: SidebarItemProps) {
  const hasChildren = Boolean(item.children?.length);
  const Icon = item.icon;

  return (
    <div className="app-shell-nav-section">
      <NavLink
        to={item.path}
        end={!hasChildren}
        className={({ isActive }) =>
          isActive ? "app-shell-link is-active" : "app-shell-link"
        }
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        onClick={onNavigate}
      >
        <span className="app-shell-link-icon-wrapper">
          <span className="app-shell-link-icon">{Icon ? <Icon aria-hidden="true" /> : null}</span>
        </span>
        {!collapsed ? (
          <div className="app-shell-link-text">
            <span className="app-shell-link-label">{item.label}</span>
          </div>
        ) : null}
      </NavLink>

      {hasChildren && !collapsed ? (
        <div className="app-shell-link-children">
          {item.children?.map((child) => (
            <NavLink
              key={child.id}
              to={child.path}
              end
              className={({ isActive }) =>
                isActive ? "app-shell-child-link is-active" : "app-shell-child-link"
              }
              onClick={onNavigate}
            >
              <span className="app-shell-child-label">{child.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}
