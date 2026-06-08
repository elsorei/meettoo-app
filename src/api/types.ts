/**
 * Shapes mirroring the MeetToo API responses.
 *
 * The API wraps every payload in an envelope: `{ success, data }` for single
 * resources, plus a `pagination` block for list endpoints. Errors come back as
 * `{ success: false, error: { code, message, details? } }`.
 */

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEnvelope<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Authenticated user, as returned by /auth/login and /auth/me. */
export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  photoUrl: string | null;
  timezone: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
}

export type EventType = 'appointment' | 'commitment' | 'reminder' | 'gathering';
export type EventStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'suspended'
  | 'completed';

/**
 * Event as serialised by GET /api/events (snake_case straight from SQL).
 * Only the fields the app reads today are typed; the rest stay loose.
 */
export interface AgendaEvent {
  id: string;
  type: EventType;
  title: string;
  event_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  status: EventStatus;
  has_alarm: boolean;
  owner_id: string;
  location_name: string | null;
  participant_count: number;
  attachment_count: number;
  my_confirmation: 'pending' | 'accepted' | 'declined' | null;
  created_at: string;
  updated_at: string;
}
