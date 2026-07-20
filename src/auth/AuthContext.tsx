/**
 * Session provider: the single source of truth for "is the user logged in".
 *
 * On mount it restores tokens from secure storage and verifies them with
 * /auth/me. It also wires the HTTP client's session hooks so the client can
 * read the current access token, persist refreshed tokens, and trigger logout
 * when a refresh fails.
 *
 * Offline: un errore di RETE all'avvio NON butta fuori l'utente — i token
 * restano e la sessione riparte come autenticata (le schermate mostrano i
 * loro stati di errore/retry). Solo un vero 401 dal server cancella i token.
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
import { ApiError, attachSession, isNetworkError } from '../api/client';
import type { SessionUser } from '../api/types';
import { clearTokens, loadTokens, saveTokens, type AuthTokens } from '../lib/tokenStore';
import { registerForPush } from '../lib/push';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Logout da TUTTI i dispositivi. */
  signOutEverywhere: () => Promise<void>;
  /** Cancella definitivamente l'account (richiede la password). */
  deleteAccount: (password: string) => Promise<void>;
  /** Ricarica /auth/me (es. dopo un update del profilo o al retry offline). */
  refreshUser: () => Promise<void>;
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
      } catch (e) {
        if (!active) return;
        if (isNetworkError(e)) {
          // Offline (aereo, metro, ...): la sessione resta valida. Il profilo
          // arriverà al prossimo refreshUser()/retry con rete.
          setStatus('authenticated');
          return;
        }
        // Risposta vera del server (401/403/...): sessione morta.
        tokensRef.current = null;
        await clearTokens();
        setStatus('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const adoptSession = useCallback(async (result: {
    accessToken: string;
    refreshToken: string;
    user: SessionUser;
  }) => {
    const next: AuthTokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
    tokensRef.current = next;
    await saveTokens(next);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  // A sessione attiva, registra il dispositivo per le push (best-effort,
  // silenzioso su simulatore/permesso negato).
  useEffect(() => {
    if (status === 'authenticated') {
      void registerForPush();
    }
  }, [status]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await adoptSession(await authApi.login(email, password));
    },
    [adoptSession]
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      await adoptSession(await authApi.register(input));
    },
    [adoptSession]
  );

  const clearSession = useCallback(async () => {
    tokensRef.current = null;
    await clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* best effort — clear locally regardless */
    }
    await clearSession();
  }, [clearSession]);

  const signOutEverywhere = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } catch {
      /* best effort — clear locally regardless */
    }
    await clearSession();
  }, [clearSession]);

  const deleteAccount = useCallback(
    async (password: string) => {
      // Se il server rifiuta (password errata, rete giù) l'errore risale
      // alla UI e la sessione locale resta intatta.
      await authApi.deleteAccount(password);
      await clearSession();
    },
    [clearSession]
  );

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await clearSession();
      }
      // Errori di rete: silenziosi, riproverà chi ha chiamato.
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn,
      signUp,
      signOut,
      signOutEverywhere,
      deleteAccount,
      refreshUser,
    }),
    [status, user, signIn, signUp, signOut, signOutEverywhere, deleteAccount, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
