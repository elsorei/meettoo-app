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
  emailVerified: boolean;
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

/** Invitation / participation status of a guest on an event. */
export type GuestStatus = 'pending' | 'accepted' | 'declined';

/**
 * A guest on an event. `user_id` / `name` are null when someone is invited by
 * email before they have a MeetToo account. `invited_by` is the user who added
 * them (null for guests the creator added at event creation).
 */
export interface EventGuest {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  status: GuestStatus;
  invited_by: string | null;
  invited_by_name: string | null;
  created_at: string;
}

/**
 * Full event detail from GET /api/events/:id — the list shape plus the guest
 * roster, the creator's "guests can invite" setting, and `can_invite`: a
 * SERVER-COMPUTED flag telling the current user whether they may add guests
 * (true iff they own the event, or the setting is on and they are a guest).
 * The UI only mirrors this flag; the real authorization lives in the API.
 */
/** Registered participant of an event (event_participants). */
export interface EventParticipant {
  id: string;
  user_id: string;
  role: 'organizer' | 'participant' | 'reserve';
  confirmation: 'pending' | 'accepted' | 'declined';
  display_name: string;
  photo_url: string | null;
}

export interface EventDetail extends AgendaEvent {
  description: string | null;
  allow_guests_to_invite: boolean;
  can_invite: boolean;
  guests: EventGuest[];
  participants: EventParticipant[];
}

/** Fields the app may update on an event (owner only, enforced server-side). */
export interface EventUpdate {
  allowGuestsToInvite?: boolean;
}

/** Payload for POST /api/events. */
export interface CreateEventInput {
  type: EventType;
  title: string;
  description?: string;
  eventDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  locationName?: string;
  visibility?: 'private' | 'invitees' | 'friends' | 'public_view' | 'public_open';
  isPrivate?: boolean;
}

export type RsvpAnswer = 'accepted' | 'declined';
