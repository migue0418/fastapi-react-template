import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { RoleRoute } from "@/features/auth/RoleRoute";
import { AppShell } from "@/features/app-shell/AppShell";
import { HomePage } from "@/features/home/HomePage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { SessionsPage } from "@/features/sessions/SessionsPage";
import { UsersPage } from "@/features/users/UsersPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route
              path="/usuarios"
              element={
                <RoleRoute allowedRoles={["admin"]}>
                  <UsersPage />
                </RoleRoute>
              }
            />
            <Route path="/users" element={<Navigate to="/usuarios" replace />} />
            <Route path="/sesiones" element={<SessionsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
