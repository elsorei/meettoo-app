/**
 * Typed wrapper around secure storage for the auth session tokens.
 * Centralises the storage keys so nothing else hard-codes them.
 */
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';

const ACCESS_TOKEN_KEY = 'meettoo.accessToken';
const REFRESH_TOKEN_KEY = 'meettoo.refreshToken';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getSecureItem(ACCESS_TOKEN_KEY),
    getSecureItem(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    setSecureItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setSecureItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteSecureItem(ACCESS_TOKEN_KEY),
    deleteSecureItem(REFRESH_TOKEN_KEY),
  ]);
}
