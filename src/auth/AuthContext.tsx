/**
 * Session provider: the single source of truth for "is the user logged in".
 *
 * On mount it restores tokens from secure storage and verifies them with
 * /auth/me. It also wires the HTTP client's session hooks so the client can
 * read the current access token, persist refreshed tokens, and trigger logout
 * when a refresh fails.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as authApi from '../api/auth';
import { attachSession } from '../api/client';
import type { SessionUser } from '../api/types';
import { clearTokens, loadTokens, saveTokens, type AuthTokens } from '../lib/tokenStore';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  // Tokens live in a ref so the client can read the latest value synchronously
  // without re-rendering on every refresh.
  const tokensRef = useRef<AuthTokens | null>(null);

  // Register the client <-> session bridge exactly once.
  useEffect(() => {
    attachSession({
      getTokens: () => tokensRef.current,
      onTokensRefreshed: (next) => {
        tokensRef.current = next;
        void saveTokens(next);
      },
      onSessionExpired: () => {
        tokensRef.current = null;
        void clearTokens();
        setUser(null);
        setStatus('unauthenticated');
      },
    });
  }, []);

  // Restore an existing session on cold start.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadTokens();
      if (!stored) {
        if (active) setStatus('unauthenticated');
        return;
      }
      tokensRef.current = stored;
      try {
        const me = await authApi.getMe(); // refreshes transparently if needed
        if (!active) return;
        setUser(me);
        setStatus('authenticated');
      } catch {
        if (!active) return;
        tokensRef.current = null;
        await clearTokens();
        setStatus('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    const next: AuthTokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
    tokensRef.current = next;
    await saveTokens(next);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* best effort — clear locally regardless */
    }
    tokensRef.current = null;
    await clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
