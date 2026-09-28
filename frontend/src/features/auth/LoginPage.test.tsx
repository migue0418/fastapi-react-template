import { MemoryRouter } from "react-router-dom";
import type { InitialEntry } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { ApiError } from "@/shared/api/http";

const INVALID_CREDENTIALS_DETAIL =
  "Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.";

type RenderOptions = {
  login?: () => Promise<void>;
  initialEntries?: InitialEntry[];
};

function renderLoginPage({ login = vi.fn(), initialEntries = ["/login"] }: RenderOptions = {}) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={{ user: null, isLoading: false, login, logout: vi.fn() }}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

async function submitCredentials() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Usuario"), "admin");
  await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginPage", () => {
  it("muestra la validación si faltan credenciales", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Usuario y contraseña son obligatorios.");
  });

  it("muestra el detalle del backend cuando login rechaza con ApiError", async () => {
    renderLoginPage({ login: vi.fn().mockRejectedValue(new ApiError(401, INVALID_CREDENTIALS_DETAIL)) });

    await submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_CREDENTIALS_DETAIL);
  });

  it("muestra un mensaje de conexión si el error no viene de la API", async () => {
    renderLoginPage({ login: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });

    await submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    );
  });

  it("traduce el 429 del rate limit a un mensaje legible", async () => {
    renderLoginPage({ login: vi.fn().mockRejectedValue(new ApiError(429, "HTTP 429")) });

    await submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos. Espera un minuto y vuelve a intentarlo.",
    );
  });

  it("traduce un error 5xx a un mensaje legible", async () => {
    renderLoginPage({ login: vi.fn().mockRejectedValue(new ApiError(500, "HTTP 500")) });

    await submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error del servidor. Inténtalo más tarde.",
    );
  });

  it("muestra el aviso recibido en location.state", () => {
    renderLoginPage({
      initialEntries: [
        { pathname: "/login", state: { notice: "Contraseña cambiada. Inicia sesión de nuevo." } },
      ],
    });

    expect(screen.getByRole("status")).toHaveTextContent("Contraseña cambiada. Inicia sesión de nuevo.");
  });

  it("no muestra aviso sin location.state", () => {
    renderLoginPage();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
