/**
 * Agenda / events endpoints. Mirrors meettoo-api `modules/agenda/agenda.routes.ts`.
 */
import { requestEnvelope } from './client';
import type { AgendaEvent, PaginatedEnvelope } from './types';

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
