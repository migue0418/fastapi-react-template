import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteUserRequest, listUsersRequest, unlockUserRequest } from "@/features/users/api";
import type { UserListItem } from "@/features/users/types";
import { UsersPage } from "@/features/users/UsersPage";
import { ApiError } from "@/shared/api/http";

vi.mock("@/features/users/api");

const LOCKED_USER: UserListItem = {
  id: 2,
  username: "ana",
  full_name: null,
  email: null,
  is_active: true,
  roles: ["user"],
  is_locked: true,
  locked_until: "2026-09-28T10:15:00Z",
};

const ACTIVE_USER: UserListItem = {
  id: 3,
  username: "luis",
  full_name: null,
  email: null,
  is_active: true,
  roles: ["user"],
  is_locked: false,
  locked_until: null,
};

describe("UsersPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("desbloquea un usuario bloqueado y recarga la lista", async () => {
    vi.mocked(listUsersRequest)
      .mockResolvedValueOnce([LOCKED_USER, ACTIVE_USER])
      .mockResolvedValueOnce([{ ...LOCKED_USER, is_locked: false, locked_until: null }, ACTIVE_USER]);
    vi.mocked(unlockUserRequest).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<UsersPage />);

    const unlockButton = await screen.findByRole("button", { name: "Desbloquear ana" });
    expect(unlockButton).toHaveAttribute("title", expect.stringContaining("bloqueado hasta"));
    expect(screen.queryByRole("button", { name: "Desbloquear luis" })).not.toBeInTheDocument();

    await user.click(unlockButton);

    expect(unlockUserRequest).toHaveBeenCalledWith(2);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Desbloquear ana" })).not.toBeInTheDocument(),
    );
    expect(listUsersRequest).toHaveBeenCalledTimes(2);
  });

  it("muestra el error del backend si el desbloqueo falla", async () => {
    vi.mocked(listUsersRequest).mockResolvedValue([LOCKED_USER]);
    vi.mocked(unlockUserRequest).mockRejectedValue(new ApiError(404, "Usuario no encontrado"));
    const user = userEvent.setup();
    render(<UsersPage />);

    await user.click(await screen.findByRole("button", { name: "Desbloquear ana" }));

    expect(await screen.findByText("Usuario no encontrado")).toBeInTheDocument();
  });

  it("avisa de que el borrado no se puede deshacer", async () => {
    vi.mocked(listUsersRequest).mockResolvedValue([LOCKED_USER, ACTIVE_USER]);
    const user = userEvent.setup();
    render(<UsersPage />);

    await user.click(await screen.findByRole("button", { name: "Eliminar luis" }));

    expect(screen.getByRole("dialog", { name: "Eliminar usuario" })).toHaveTextContent(
      "Vas a eliminar al usuario luis. Esta acción no se puede deshacer.",
    );
    expect(deleteUserRequest).not.toHaveBeenCalled();
  });

  it("etiqueta la paginación con tildes", async () => {
    vi.mocked(listUsersRequest).mockResolvedValue([ACTIVE_USER]);
    render(<UsersPage />);

    await screen.findByRole("button", { name: "Eliminar luis" });

    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Elementos por página" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "10 por página" })).toBeInTheDocument();
  });
});
