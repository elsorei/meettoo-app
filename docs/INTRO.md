# Opening intro (animated slogan)

The animated opening of the MeetToo app: the slogan **"agenda… meet anywhere with anyone"** arrives in two beats, holds, then dissolves to reveal the app.

> Added on branch `claude/relaxed-ride-Dl7io` — commits `91f62f1` (scaffold + intro) and `5a42510` (timing). Built before the API/network layer (`33829e3`), which preserved the intro overlay.

## Behaviour

On cold start the native splash (`#0B1020`) hands off seamlessly to an animated overlay:

- **Beat 1** — `agenda…` fades in and rises.
- a short pause.
- **Beat 2** — the `MEETTOO` wordmark and the `meet anywhere with anyone` tagline arrive together.
- a short hold, then the whole overlay **dissolves** to reveal the app underneath.

~2.7s total. **Tap anywhere to skip.** Honours the OS **Reduce Motion** setting (no staged motion — present, hold, fade). Plays on **every cold start** by default.

## Files

| File | Role |
|------|------|
| `src/components/IntroScreen.tsx` | The animated overlay. RN `Animated` (native driver) + `LinearGradient` background. Props: `onReady?` (first frame painted -> hide native splash) and `onFinish` (fully dissolved -> unmount). |
| `src/branding.ts` | Copy + flag: `WORDMARK`, `SLOGAN_LEAD` (`agenda`), `SLOGAN_ELLIPSIS` (`…`), `SLOGAN_TAGLINE`, `SHOW_INTRO_ON_EVERY_LAUNCH`. |
| `src/theme.ts` | `colors` (intro gradient `#0B1020 -> #161235 -> #241A4D`, `accentSoft #B7AEFF`, …) and `introTiming` (ms). |
| `App.tsx` | Mounts `IntroScreen` as the top-most overlay above `RootNavigator` (inside `AuthProvider`); manages `expo-splash-screen`. |
| `app.json` | `expo-splash-screen` plugin with `backgroundColor: "#0B1020"` (matches the gradient start) for a seamless handoff. |

## How it is wired (`App.tsx`)

- `SplashScreen.preventAutoHideAsync()` at module load.
- `introDone` state starts as `!SHOW_INTRO_ON_EVERY_LAUNCH`.
- Renders `<RootNavigator />` with `<IntroScreen>` on top while `!introDone`.
- `onReady` -> `SplashScreen.hideAsync()` (the native splash drops only once the intro is painted).
- `onFinish` -> `setIntroDone(true)` (unmounts the overlay).
- If the intro is disabled, a `useEffect` hides the native splash instead.

## Tuning

- **Copy** -> `src/branding.ts`
- **Timing** -> `src/theme.ts` -> `introTiming` (`leadIn 550`, `holdAfterLead 350`, `taglineIn 600`, `hold 650`, `fadeOut 550`, `reduceMotionHold 900`)
- **Colours** -> `src/theme.ts` -> `colors`
- **When it plays** -> `SHOW_INTRO_ON_EVERY_LAUNCH` in `src/branding.ts` (`true` = every cold start; set `false` + gate on a persisted flag for first-launch-only)
- **Native splash colour** -> `app.json` `expo-splash-screen` plugin (keep equal to `colors.introBackground`)

## Notes / do not break

- `IntroScreen` must remain the **top-most sibling** and unmount via `onFinish`; do not render `RootNavigator` above it.
- `onReady` is what hides the native splash — keep calling it, or the splash can linger.
- Animations use RN `Animated` with `useNativeDriver: true` (opacity / translateY only). No Reanimated dependency.
- Dependencies: `expo-splash-screen`, `expo-linear-gradient`, `expo-status-bar`.
- **No icon / splash image assets** are committed yet (no `assets/`); the native splash is colour-only. Add brand assets and reference them in `app.json` (`icon` + the plugin `image`).
- Validated with `tsc --noEmit`, `expo config`, and an iOS Metro bundle. `fontWeight: '200'` on the lead may render heavier on Android (no thin weight) — cosmetic.
