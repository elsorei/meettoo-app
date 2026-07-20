/**
 * Brand copy for MeetToo, in one place so wording stays consistent.
 */

export const WORDMARK = 'MeetToo';

/** The slogan, split for the two-beat reveal in the intro. */
export const SLOGAN_LEAD = 'agenda'; // shown first, with a trailing ellipsis
export const SLOGAN_ELLIPSIS = '…';
export const SLOGAN_TAGLINE = 'meet anywhere with anyone'; // arrives second

/**
 * When true the animated intro plays on every cold start.
 *
 * To show it only on the very first launch instead, set this to false and gate
 * it on a persisted flag (e.g. AsyncStorage / expo-secure-store) read in App.tsx.
 * Left on by default so the intro is always visible while the app takes shape.
 */
export const SHOW_INTRO_ON_EVERY_LAUNCH = true;
