import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";

import { useAuth } from "@/features/auth/AuthProvider";

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">Restaurando sesion...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
