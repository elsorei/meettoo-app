/**
 * HTTP client for the MeetToo API.
 *
 * Responsibilities:
 *  - Prefix every request with the configured base URL (EXPO_PUBLIC_API_URL).
 *  - Attach the bearer access token from secure storage.
 *  - Unwrap the `{ success, data }` envelope and surface errors as `ApiError`.
 *  - Transparently refresh the access token once on a 401, then retry.
 *
 * The client is deliberately framework-agnostic: it knows nothing about React.
 * The session layer (AuthContext) wires in callbacks for "tokens refreshed" and
 * "session expired" so it can persist new tokens or log the user out.
 */
import { API_URL, isApiConfigured } from '../config/env';
import type { AuthTokens } from '../lib/tokenStore';
import type { ApiErrorBody, AuthTokensResult } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Hooks the session layer registers so the client can manage tokens. */
export interface ClientSession {
  getTokens(): AuthTokens | null;
  /** Called after a successful silent refresh so new tokens get persisted. */
  onTokensRefreshed(tokens: AuthTokens): void;
  /** Called when refresh fails — the session is no longer valid. */
  onSessionExpired(): void;
}

let session: ClientSession | null = null;

export function attachSession(s: ClientSession): void {
  session = s;
}

interface RequestOptions {
  method?: string;
  /** JSON body; serialised automatically. */
  body?: unknown;
  /** Query string params. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Set false for the auth endpoints that must not carry a bearer token. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

async function parseError(res: Response): Promise<ApiError> {
  let code = 'HTTP_ERROR';
  let message = `Request failed (${res.status})`;
  let details: unknown;
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    /* non-JSON error body — keep the defaults */
  }
  return new ApiError(res.status, code, message, details);
}

/** Low-level fetch that does NOT attempt a refresh. Returns the raw Response. */
async function rawFetch(path: string, opts: RequestOptions): Promise<Response> {
  if (!isApiConfigured) {
    throw new ApiError(0, 'NO_API_URL', 'EXPO_PUBLIC_API_URL is not configured.');
  }
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  if (opts.auth !== false) {
    const token = session?.getTokens()?.accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
}

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const current = session?.getTokens();
  if (!current?.refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await rawFetch('/api/auth/refresh', {
          method: 'POST',
          auth: false,
          body: { refreshToken: current.refreshToken },
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { success: boolean; data: AuthTokensResult };
        const next: AuthTokens = {
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
        };
        session?.onTokensRefreshed(next);
        return next;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Make a request, unwrap the envelope, and return `data` typed as `T`.
 * On a 401 for an authenticated request, refreshes once and retries.
 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, opts);

  if (res.status === 401 && opts.auth !== false && session?.getTokens()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await rawFetch(path, opts);
    } else {
      session.onSessionExpired();
      throw await parseError(res);
    }
  }

  if (!res.ok) throw await parseError(res);

  // Some endpoints (logout) return a message without `data`; tolerate that.
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return (json?.data ?? json) as T;
}

/** Like `request`, but returns the whole envelope (for paginated responses). */
export async function requestEnvelope<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  let res = await rawFetch(path, opts);

  if (res.status === 401 && opts.auth !== false && session?.getTokens()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await rawFetch(path, opts);
    } else {
      session.onSessionExpired();
      throw await parseError(res);
    }
  }

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}
