/**
 * Agenda / events endpoints. Mirrors meettoo-api `modules/agenda/agenda.routes.ts`.
 */
import { request, requestEnvelope } from './client';
import type {
  AgendaEvent,
  CreateEventInput,
  EventDetail,
  EventUpdate,
  PaginatedEnvelope,
  RsvpAnswer,
} from './types';

export interface ListEventsParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  type?: 'appointment' | 'commitment' | 'reminder' | 'gathering';
  status?: 'pending' | 'confirmed' | 'cancelled' | 'suspended' | 'completed';
  page?: number;
  limit?: number;
}

/**
 * GET /api/events — paginated list of the user's events (owned or invited to).
 * Returns the full envelope so callers can read pagination metadata.
 */
export function listEvents(
  params: ListEventsParams = {},
  signal?: AbortSignal
): Promise<PaginatedEnvelope<AgendaEvent>> {
  return requestEnvelope<PaginatedEnvelope<AgendaEvent>>('/api/events', {
    query: { ...params },
    signal,
  });
}

/** POST /api/events — create an event on the current user's agenda. */
export function createEvent(input: CreateEventInput): Promise<EventDetail> {
  return request<EventDetail>('/api/events', { method: 'POST', body: input });
}

/**
 * PUT /api/events/:id/confirm — RSVP of the current user (participant).
 * `accepted` | `declined`; the server records confirmed_at.
 */
export function confirmParticipation(
  id: string,
  confirmation: RsvpAnswer
): Promise<EventDetail> {
  return request<EventDetail>(
    `/api/events/${encodeURIComponent(id)}/confirm`,
    { method: 'PUT', body: { confirmation } }
  );
}

/** GET /api/events/:id — full detail incl. guests, settings, and can_invite. */
export function getEvent(
  id: string,
  signal?: AbortSignal
): Promise<EventDetail> {
  return request<EventDetail>(`/api/events/${encodeURIComponent(id)}`, {
    signal,
  });
}

/**
 * PUT /api/events/:id — update event settings. Used by the creator's
 * "allow guests to invite" toggle. Owner-only (enforced server-side).
 */
export function updateEvent(
  id: string,
  patch: EventUpdate,
  signal?: AbortSignal
): Promise<EventDetail> {
  return request<EventDetail>(`/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: patch,
    signal,
  });
}

/** PUT /api/events/:id/guests/respond — RSVP dell'invitato guest. */
export function respondAsGuest(
  id: string,
  status: RsvpAnswer
): Promise<unknown> {
  return request<unknown>(
    `/api/events/${encodeURIComponent(id)}/guests/respond`,
    { method: 'PUT', body: { status } }
  );
}
