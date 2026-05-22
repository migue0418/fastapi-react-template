import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";

import { useAuth } from "@/features/auth/AuthProvider";

type RoleRouteProps = {
  children: ReactElement;
  allowedRoles: string[];
};

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">Validando permisos...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = user.roles.some((role) => allowedRoles.includes(role));
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
}
