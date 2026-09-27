# Camping Map (mobile)

The Android/iPhone counterpart to the [camping_map](../camping_map) website — same Supabase
project, same data, same login, different screens. Built with Expo + React Native.

## Stack

Expo Router (navigation) · MapLibre React Native (map) · Supabase JS (data + auth) ·
`@react-native-google-signin/google-signin` (native Google sign-in).

No separate backend: this app talks to the exact same Supabase project as the website. A visit
posted here shows up on the website and vice versa.

## Getting started

```bash
npm install
cp .env.example .env     # fill in the Google web client ID; Supabase values are already filled in
```

Two of this app's dependencies contain native code (the map, and Google sign-in) and **do not work
in plain Expo Go** — Expo Go only bundles a fixed set of native modules, and these aren't in it.
You need a **development build** instead:

```bash
npx expo run:android     # requires Android Studio + SDK installed locally
# or, with no local Android setup at all:
npx eas build --profile development --platform android
```

The EAS route needs a free Expo account (`npx eas login`) and produces a downloadable, installable
`.apk` — no Android Studio required. Once that build is installed on a phone once, `npx expo start`
gives live-reloading development from then on, the same as Expo Go would for a pure-JS app.

## Required setup outside this codebase

- **Supabase**: nothing extra — reuses the website's project (`pleetxrbmezffuvxvqyt`) and schema.
- **Google Sign-In**: needs a *second* Google Cloud OAuth client beyond the website's, of type
  **Android**, registered with this app's package name (`com.tjax55.campingmap`) and its signing
  certificate's SHA-1 fingerprint. `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID` in `.env` is the
  website's existing **Web application** client ID, reused as-is — see the comment in
  `src/lib/useAuth.ts` for why only that one goes in code.

## What's not been verified on a real device

Nothing in this app has been run on physical hardware or a simulator — building it required a
native compile step this environment can't perform. Typechecking, linting, and `expo-doctor` all
pass, and the trickiest API calls (MapLibre's `Layer`/`GeoJSONSource` props, the Google Sign-In
library's `signIn()` response shape) were checked directly against the installed packages' type
definitions rather than assumed from memory. But "typechecks correctly" and "renders correctly on
a phone" are different claims — the first real build is where any remaining mismatches will surface.

## Known scope cuts from the web app (first pass)

- **No custom van-icon pins.** The web app draws colored van silhouettes on a `<canvas>`; there's
  no direct equivalent in React Native. Pins here are plain colored circles, colored the same way
  clusters already are.
- **No National Forest land overlay.** The web app's version relies on a MapLibre GL JS-specific
  URL token (`{bbox-epsg-3857}`) to use a live ArcGIS endpoint as a raster tile source. Whether
  MapLibre *Native* (the different engine this library wraps) supports that same token is
  unverified. Left out rather than shipped as a guess. The BLM overlay is unaffected — it's a
  standard `{z}/{y}/{x}` tile cache, which every map engine supports.
- **"Add a spot" needs coordinates typed in**, not picked by tapping the map. The web version's
  pick-on-map flow needs the map screen and the submit screen to hand a location back and forth,
  which is real cross-screen navigation state not built in this pass.
