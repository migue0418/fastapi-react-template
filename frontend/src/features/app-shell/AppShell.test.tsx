import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/features/app-shell/AppShell";
import { AuthContext } from "@/features/auth/AuthProvider";
import type { AuthenticatedUser } from "@/features/auth/types";

const CURRENT_USER: AuthenticatedUser = {
  id: 1,
  username: "admin",
  full_name: null,
  email: null,
  is_active: true,
  roles: ["admin"],
};

function renderAppShell() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthContext.Provider
        value={{ user: CURRENT_USER, isLoading: false, login: vi.fn(), logout: vi.fn() }}
      >
        <AppShell />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("expone un único landmark de navegación principal dentro de la barra lateral", () => {
    renderAppShell();

    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.getAllByLabelText("Navegación principal")).toHaveLength(1);
    expect(screen.getByRole("complementary", { name: "Barra lateral" })).toContainElement(navigation);
  });

  it("nombra con tilde los botones del menú", async () => {
    const user = userEvent.setup();
    renderAppShell();

    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Plegar menú" }));

    expect(screen.getByRole("button", { name: "Expandir menú" })).toBeInTheDocument();
  });
});
