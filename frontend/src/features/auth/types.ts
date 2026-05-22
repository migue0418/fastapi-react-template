export type LoginCredentials = {
  username: string;
  password: string;
};

export type LoginOptions = {
  rememberMe?: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type AuthenticatedUser = {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  roles: string[];
};

export type SessionInfo = {
  id: number;
  created_at: string;
  expires_at: string;
  user_agent: string | null;
  is_current: boolean;
};
