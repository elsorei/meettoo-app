# Feature: guests can invite others (creator-authorised)

Mirrors Google Calendar's "Guests can invite others" — but **off by default** and
usable **only when the event creator turns it on**. The permission is enforced by
the API; the app only reflects it.

**Status:** app side implemented on branch `claude/relaxed-ride-Dl7io`
(`meettoo-app`). The `meettoo-api` side still needs the columns, endpoints, and
rule below.

## Permission rule (authoritative — server side)

A user may add a guest to event `E` **iff**:

- they are `E.owner_id` (the creator), **or**
- `E.allow_guests_to_invite === true` **and** they are already a guest of `E`.

Never trust the client: the "Invite" button is gated on a server-computed
`can_invite` flag, but `POST .../guests` must re-check the rule and return `403`
otherwise.

## Data model (Postgres)

- `events.allow_guests_to_invite BOOLEAN NOT NULL DEFAULT false` — set by the creator.
- Guests table row exposes: `id`, `event_id`, `user_id` (nullable — email invite
  before signup), `email` (nullable), `name` (nullable),
  `status` (`pending` | `accepted` | `declined`), `invited_by` (user_id, nullable),
  `created_at`.

## Endpoints (contract the app already calls)

Standard `{ success, data }` envelope.

### `GET /api/events/:id`
Returns `EventDetail` = the list event shape **plus**:
- `allow_guests_to_invite: boolean`
- `can_invite: boolean` — computed for the caller per the rule above
- `guests: EventGuest[]` — `{ id, event_id, user_id, email, name, status, invited_by, invited_by_name, created_at }`

### `PATCH /api/events/:id`  (owner only)
Body may include `allow_guests_to_invite: boolean`. Returns the updated `EventDetail`.
`403` if the caller is not the owner.

### `POST /api/events/:id/guests`
Body `{ email }`. Enforce the rule; on success add the guest with
`invited_by = caller`, `status = 'pending'`, return the created `EventGuest`.
`403` not allowed - `409` already a guest - `422` invalid email. If the email has
no account yet, create a pending invite.

### `DELETE /api/events/:id/guests/:guestId`  (owner only)
Remove the guest. `204` on success.

## Defaults assumed (change freely)

1. **Chaining** — with the flag on, guests-of-guests can also invite (like Google).
   To cap to one level, only allow invites from guests whose `invited_by IS NULL`.
2. **Auto-join** — invited guests are added immediately (`pending`), no approval;
   the creator can remove them.
3. **Cap** — consider a per-event max (e.g. 100) against runaway chains.
4. **Identity** — invite by **email** (works before the person signs up).

## App side (done — `meettoo-app`)

- `src/api/types.ts` — `EventGuest`, `GuestStatus`, `EventDetail`, `EventUpdate`
- `src/api/agenda.ts` — `getEvent`, `updateEvent`
- `src/api/guests.ts` — `inviteGuest`, `removeGuest`
- `src/screens/EventDetailScreen.tsx` — detail sheet: guest list, creator toggle,
  invite-by-email box (shown only when `can_invite`)
- `src/screens/AgendaScreen.tsx` — tapping an event opens the sheet

The UI degrades gracefully (loading / error states) until the endpoints exist.
