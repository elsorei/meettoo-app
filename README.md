# MeetToo

**agenda… meet anywhere with anyone**

Mobile app built with React Native + Expo (SDK 56, TypeScript).

## The opening

On launch the app plays a short branded intro: the slogan arrives in two beats —
_agenda…_ first, then _meet anywhere with anyone_ — holds for a moment, and
dissolves to reveal the app. It hands off seamlessly from the native splash, can
be skipped with a tap, and honours the system **Reduce Motion** setting.

## Getting started

```bash
npm install
npm start          # then press i (iOS), a (Android), or scan the QR with Expo Go
```

Other scripts:

```bash
npm run ios        # open in the iOS simulator
npm run android    # open on an Android emulator/device
npm run typecheck  # tsc --noEmit
```

## Project structure

```
App.tsx                      App root: shows Home, overlays the intro, manages the native splash
src/
  branding.ts                Slogan/wordmark copy + intro on/off flag
  theme.ts                   Colours and the intro animation timing
  components/IntroScreen.tsx  The animated opening (two-beat reveal → dissolve)
  screens/HomeScreen.tsx     Placeholder home the intro dissolves into
```

## Tuning the intro

- **Timing** lives in `src/theme.ts` (`introTiming`) — durations for each beat,
  the hold, and the fade-out.
- **Copy** lives in `src/branding.ts` (`SLOGAN_LEAD`, `SLOGAN_TAGLINE`, `WORDMARK`).
- **When it plays**: `SHOW_INTRO_ON_EVERY_LAUNCH` in `src/branding.ts`. It's on
  by default; flip it off and gate on a persisted flag to show it only on first
  launch.
- **Splash colours**: the native splash background (`#0B1020`) is set in
  `app.json` under the `expo-splash-screen` plugin and matches the intro gradient
  so the handoff is seamless.

## Brand assets

The app currently ships without custom icon/splash images, so it falls back to
Expo defaults. To add your own, drop the files in an `assets/` folder and wire
them up in `app.json`:

```jsonc
"icon": "./assets/icon.png",
"plugins": [
  ["expo-splash-screen", {
    "backgroundColor": "#0B1020",
    "image": "./assets/splash-icon.png",
    "imageWidth": 180
  }]
]
```
