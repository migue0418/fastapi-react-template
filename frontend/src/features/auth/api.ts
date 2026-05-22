import { api } from "@/shared/api/http";
import type {
  AuthenticatedUser,
  LoginCredentials,
  SessionInfo,
  TokenResponse,
} from "@/features/auth/types";

export async function loginRequest(
  credentials: LoginCredentials,
  rememberMe: boolean,
): Promise<TokenResponse> {
  return api.post<TokenResponse, { username: string; password: string; remember_me: boolean }>(
    "/auth/login",
    {
      username: credentials.username,
      password: credentials.password,
      remember_me: rememberMe,
    },
  );
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  return api.get<AuthenticatedUser>("/auth/me");
}

export async function logoutRequest(): Promise<void> {
  await api.post<void, undefined>("/auth/logout");
}

export async function getSessionsRequest(): Promise<SessionInfo[]> {
  return api.get<SessionInfo[]>("/auth/sessions");
}

export async function revokeSessionRequest(sessionId: number): Promise<void> {
  await api.delete<void>(`/auth/sessions/${sessionId}`);
}
