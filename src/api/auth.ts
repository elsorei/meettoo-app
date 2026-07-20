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

/** POST /api/auth/logout — revokes this device's refresh token server-side. */
export function logout(): Promise<unknown> {
  return request<unknown>('/api/auth/logout', { method: 'POST' });
}

/** POST /api/auth/logout-all — revokes every session on every device. */
export function logoutAll(): Promise<unknown> {
  return request<unknown>('/api/auth/logout-all', { method: 'POST' });
}

/** PUT /api/auth/fcm-token — registra l'Expo push token del dispositivo. */
export function updateFcmToken(fcmToken: string): Promise<unknown> {
  return request<unknown>('/api/auth/fcm-token', { method: 'PUT', body: { fcmToken } });
}

/** POST /api/auth/forgot-password — sends the reset link (never enumerates). */
export function forgotPassword(email: string): Promise<unknown> {
  return request<unknown>('/api/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: { email },
  });
}

/** POST /api/auth/reset-password — completes the reset with the email token. */
export function resetPassword(token: string, newPassword: string): Promise<unknown> {
  return request<unknown>('/api/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { token, newPassword },
  });
}

/** PUT /api/auth/me — update profile fields (name, phone). */
export function updateProfile(fields: { name?: string; phone?: string }): Promise<SessionUser> {
  return request<SessionUser>('/api/auth/me', { method: 'PUT', body: fields });
}

/** POST /api/auth/verify-email/request — re-sends the verification email. */
export function requestEmailVerification(): Promise<unknown> {
  return request<unknown>('/api/auth/verify-email/request', { method: 'POST' });
}

/** DELETE /api/auth/me — permanently deletes the account (needs the password). */
export function deleteAccount(password: string): Promise<unknown> {
  return request<unknown>('/api/auth/me', {
    method: 'DELETE',
    body: { password },
  });
}
