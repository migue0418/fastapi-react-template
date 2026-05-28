import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";

describe("LoginPage", () => {
  it("shows validation feedback when credentials are missing", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: null,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Usuario y contraseña son obligatorios.",
    );
  });
});
