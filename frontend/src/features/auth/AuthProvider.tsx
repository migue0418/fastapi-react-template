import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";

import { fetchCurrentUser, loginRequest, logoutRequest } from "@/features/auth/api";
import type {
  AuthenticatedUser,
  LoginCredentials,
  LoginOptions,
} from "@/features/auth/types";
import { refreshAccessToken, setAccessToken } from "@/shared/api/http";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials, options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
};

type JwtPayload = {
  exp?: number;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function storeToken(
  token: string | null,
  setTokenState: Dispatch<SetStateAction<string | null>>,
): void {
  setAccessToken(token);
  setTokenState(token);
}

function clearAuthState(
  setUser: Dispatch<SetStateAction<AuthenticatedUser | null>>,
  setTokenState: Dispatch<SetStateAction<string | null>>,
): void {
  setUser(null);
  storeToken(null, setTokenState);
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadBase64 = token.split(".")[1];
    return JSON.parse(window.atob(payloadBase64)) as JwtPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const refreshedToken = await refreshAccessToken();
        if (!refreshedToken || cancelled) {
          return;
        }

        storeToken(refreshedToken, setToken);
        const currentUser = await fetchCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          clearAuthState(setUser, setToken);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      clearAuthState(setUser, setToken);
    };

    window.addEventListener("auth:expired", handleExpiredSession);
    return () => {
      window.removeEventListener("auth:expired", handleExpiredSession);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) {
      return;
    }

    const millisecondsUntilRefresh = payload.exp * 1000 - Date.now() - 60_000;
    if (millisecondsUntilRefresh <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const refreshedToken = await refreshAccessToken();
        if (!refreshedToken) {
          clearAuthState(setUser, setToken);
          return;
        }

        storeToken(refreshedToken, setToken);
        try {
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
        } catch {
          // Keep the last known user if the profile refresh fails transiently.
        }
      })();
    }, millisecondsUntilRefresh);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [token]);

  const value: AuthContextValue = {
    user,
    isLoading,
    login: async (credentials, options) => {
      const authTokens = await loginRequest(credentials, options?.rememberMe ?? false);
      storeToken(authTokens.access_token, setToken);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    },
    logout: async () => {
      try {
        await logoutRequest();
      } finally {
        clearAuthState(setUser, setToken);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
