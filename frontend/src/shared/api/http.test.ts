import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, setAccessToken } from "@/shared/api/http";

const INVALID_CREDENTIALS_DETAIL =
  "Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestedUrls(): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input));
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it("convierte un detail en lista (422 de FastAPI) en texto legible", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        detail: [
          { loc: ["body", "username"], msg: "Field required", type: "missing" },
          {
            loc: ["body", "password"],
            msg: "String should have at least 8 characters",
            type: "string_too_short",
          },
        ],
      }),
    );

    await expect(api.post("/users", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Field required. String should have at least 8 characters",
    });
  });

  it("expone el status y el detail en texto", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { detail: "La contraseña actual no es válida" }));

    const request = api.post("/users/me/change-password", {});

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 400,
      message: "La contraseña actual no es válida",
    });
  });

  it("usa HTTP <status> si el cuerpo no es JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

    await expect(api.get("/users")).rejects.toMatchObject({ status: 500, message: "HTTP 500" });
  });

  it("no intenta refrescar ante un 401 de /auth/login", async () => {
    const expiredListener = vi.fn();
    window.addEventListener("auth:expired", expiredListener);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: INVALID_CREDENTIALS_DETAIL }));

    await expect(
      api.post("/auth/login", { username: "admin", password: "mala", remember_me: false }),
    ).rejects.toMatchObject({ status: 401, message: INVALID_CREDENTIALS_DETAIL });

    expect(requestedUrls()).toEqual(["/api/auth/login"]);
    expect(expiredListener).not.toHaveBeenCalled();
    window.removeEventListener("auth:expired", expiredListener);
  });

  it("refresca y reintenta ante un 401 de otra ruta", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Invalid access token" }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "nuevo-token" }))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 1 }]));

    await expect(api.get("/users")).resolves.toEqual([{ id: 1 }]);

    expect(requestedUrls()).toEqual(["/api/users", "/api/auth/refresh", "/api/users"]);
    const retryInit = fetchMock.mock.calls[2][1];
    expect(retryInit?.headers).toMatchObject({ Authorization: "Bearer nuevo-token" });
  });

  it("lanza ApiError 401 y emite auth:expired si el refresh falla", async () => {
    const expiredListener = vi.fn();
    window.addEventListener("auth:expired", expiredListener);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Invalid access token" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Invalid refresh token" }));

    await expect(api.get("/users")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Sesión expirada",
    });

    expect(expiredListener).toHaveBeenCalledTimes(1);
    window.removeEventListener("auth:expired", expiredListener);
  });
});
