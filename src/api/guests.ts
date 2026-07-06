/**
 * Event guest endpoints. Mirrors meettoo-api `modules/agenda` guest routes.
 *
 * The right to add a guest is enforced on the SERVER: a caller may invite iff
 * they own the event, or the event's `allow_guests_to_invite` is on and they
 * are already a guest. The app only mirrors that rule in the UI via the
 * `can_invite` flag from GET /api/events/:id — it is never the real gate.
 */
import { request } from './client';
import type { EventGuest } from './types';

/** POST /api/events/:id/guests — invite a guest by email. */
export function inviteGuest(
  eventId: string,
  email: string,
  signal?: AbortSignal
): Promise<EventGuest> {
  return request<EventGuest>(
    `/api/events/${encodeURIComponent(eventId)}/guests`,
    { method: 'POST', body: { email }, signal }
  );
}

/** DELETE /api/events/:id/guests/:guestId — remove a guest (owner-only). */
export function removeGuest(
  eventId: string,
  guestId: string,
  signal?: AbortSignal
): Promise<void> {
  return request<void>(
    `/api/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(
      guestId
    )}`,
    { method: 'DELETE', signal }
  );
}
