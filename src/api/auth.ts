/**
 * Auth endpoints. Mirrors meettoo-api `modules/auth/auth.routes.ts`.
 */
import { request } from './client';
import type { LoginResult, SessionUser } from './types';

/** POST /api/auth/login — email + password, returns tokens + user. */
export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
}

/** POST /api/auth/register — consumer signup, returns tokens + user. */
export function register(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: input,
  });
}

/** GET /api/auth/me — current session user (requires a valid access token). */
export function getMe(): Promise<SessionUser> {
  return request<SessionUser>('/api/auth/me');
}

/** POST /api/auth/logout — revokes the refresh token server-side. */
export function logout(): Promise<unknown> {
  return request<unknown>('/api/auth/logout', { method: 'POST' });
}
