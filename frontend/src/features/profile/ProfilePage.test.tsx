import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changeOwnPasswordRequest } from "@/features/auth/api";
import { AuthContext } from "@/features/auth/AuthProvider";
import type { AuthenticatedUser, LoginLocationState } from "@/features/auth/types";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { ApiError } from "@/shared/api/http";

vi.mock("@/features/auth/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/api")>()),
  changeOwnPasswordRequest: vi.fn(),
}));

const CURRENT_USER: AuthenticatedUser = {
  id: 1,
  username: "admin",
  full_name: null,
  email: null,
  is_active: true,
  roles: ["admin"],
};

function LoginProbe() {
  const state = useLocation().state as LoginLocationState | null;
  return <p>{state?.notice ?? "Sin aviso"}</p>;
}

function renderProfilePage(logout: () => Promise<void>) {
  render(
    <MemoryRouter initialEntries={["/perfil"]}>
      <AuthContext.Provider value={{ user: CURRENT_USER, isLoading: false, login: vi.fn(), logout }}>
        <Routes>
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

async function submitPasswordChange(currentPassword: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Contraseña actual"), currentPassword);
  await user.type(screen.getByLabelText("Nueva contraseña"), "nueva-segura-123");
  await user.type(screen.getByLabelText("Confirmar nueva contraseña"), "nueva-segura-123");
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.mocked(changeOwnPasswordRequest).mockReset();
  });

  it("cierra la sesión y lleva al login con el aviso tras cambiar la contraseña", async () => {
    vi.mocked(changeOwnPasswordRequest).mockResolvedValue(undefined);
    const logout = vi.fn().mockResolvedValue(undefined);
    renderProfilePage(logout);

    await submitPasswordChange("actual-segura-123");

    expect(
      await screen.findByText("Contraseña cambiada. Inicia sesión de nuevo."),
    ).toBeInTheDocument();
    expect(changeOwnPasswordRequest).toHaveBeenCalledWith("actual-segura-123", "nueva-segura-123");
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("llega al login aunque falle la petición de logout", async () => {
    vi.mocked(changeOwnPasswordRequest).mockResolvedValue(undefined);
    renderProfilePage(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await submitPasswordChange("actual-segura-123");

    expect(
      await screen.findByText("Contraseña cambiada. Inicia sesión de nuevo."),
    ).toBeInTheDocument();
  });

  it("muestra el error y no cierra la sesión si la contraseña actual es incorrecta", async () => {
    vi.mocked(changeOwnPasswordRequest).mockRejectedValue(
      new ApiError(400, "La contraseña actual no es válida"),
    );
    const logout = vi.fn();
    renderProfilePage(logout);

    await submitPasswordChange("incorrecta-123");

    expect(await screen.findByText("La contraseña actual no es válida")).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Mi perfil" })).toBeInTheDocument();
  });
});
