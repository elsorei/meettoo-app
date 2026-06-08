/**
 * Runtime configuration, sourced from Expo public env vars.
 *
 * `EXPO_PUBLIC_API_URL` is inlined at build time by Expo (any var prefixed with
 * EXPO_PUBLIC_ is exposed to the client). Set it in a local `.env` file or in
 * the EAS / CI environment — see `.env.example`.
 *
 * Example: EXPO_PUBLIC_API_URL=https://studiorei-api-production.up.railway.app
 */

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  // Fail loud in development so a missing env var doesn't turn into a confusing
  // "Network request failed" later. In production builds the value is baked in.
  console.warn(
    '[config] EXPO_PUBLIC_API_URL is not set. Network requests will fail until ' +
      'you add it to your .env file (see .env.example).'
  );
}

/** Base URL of the MeetToo API, without a trailing slash. */
export const API_URL = (rawApiUrl ?? '').replace(/\/+$/, '');

export const isApiConfigured = API_URL.length > 0;
