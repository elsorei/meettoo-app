/**
 * Central design tokens for MeetToo.
 * Keeping colours, spacing and the intro timing in one place makes the brand
 * easy to tune without hunting through components.
 */

export const colors = {
  // Brand / intro (dark)
  introBackground: '#0B1020', // deep night — matches the native splash background
  introBackgroundMid: '#161235',
  introBackgroundEnd: '#241A4D', // drifts toward violet
  accent: '#7C6CF6', // indigo-violet
  accentSoft: '#B7AEFF',
  textOnDark: '#FFFFFF',
  textOnDarkDim: 'rgba(255, 255, 255, 0.72)',
  textOnDarkFaint: 'rgba(255, 255, 255, 0.55)',

  // App (light)
  background: '#FFFFFF',
  surface: '#F4F5FB',
  text: '#11131A',
  textDim: '#5A6072',
  border: '#E6E8F2',
  primary: '#5A4AF4',
  danger: '#D14343',
  success: '#2E9E5B',
} as const;

/** Scala di spacing condivisa (px). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Intro animation timeline (milliseconds).
 * Total runtime ≈ leadIn + holdAfterLead + taglineIn + hold + fadeOut (~2.7s).
 * Kept short and snappy so it can play on every launch without feeling like a gate.
 */
export const introTiming = {
  leadIn: 550, // "agenda…" fades/slides in
  holdAfterLead: 350, // a beat on the ellipsis, the invitation
  taglineIn: 600, // "meet anywhere with anyone" arrives
  hold: 650, // hold the full composition
  fadeOut: 550, // dissolve to reveal the app
  reduceMotionHold: 900, // simple hold when motion is reduced
} as const;
