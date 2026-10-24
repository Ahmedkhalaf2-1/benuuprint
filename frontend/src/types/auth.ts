export interface AuthRole {
  code: string;
  name?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roles: AuthRole[];
  permissions: string[];
}

/** What the same-origin BFF returns to the browser (refresh token never included). */
export interface SessionPayload {
  accessToken: string;
  expiresIn?: number;
  user?: unknown;
}
