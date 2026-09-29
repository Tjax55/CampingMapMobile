# FreeCamp (mobile)

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

## Verified on a real device

Built and installed on a physical Android phone via EAS Build, and tested there directly (this
environment can't run a native build or see a device screen itself, so every finding below came
from the project owner testing and reporting back). Three real bugs were found and fixed this way:

- **`npm install` failing in EAS's cloud build** — a react/react-dom peer dependency conflict that
  needed `--legacy-peer-deps` locally also broke EAS's own install. Fixed with a committed `.npmrc`
  so every install, local or cloud, uses that flag automatically.
- **Tapping a pin did nothing** — `onPress` was attached to `Map`, but `Map` only receives tapped
  `features` if a child `Source`'s own `onPress` bubbles them up. Moved to `GeoJSONSource`.
- **The map's pins vanished after navigating to the site detail screen and back, and never
  returned** — a known, unresolved Android bug in how `react-native-screens` (which Expo Router
  uses) handles a heavy native view like a map being backgrounded and restored. Fixed by rendering
  the site detail and submit screens as overlays on the same permanently-mounted map screen instead
  of separate routes — see `SiteDetailPanel.tsx`'s comment.

## Known scope cuts and limitations

- **No clustering.** `GeoJSONSource`'s `cluster` prop was tested on-device and confirmed broken in
  this library version (`@maplibre/maplibre-react-native` 11.4.0): with it on, nothing rendered
  until zoomed in far past `clusterMaxZoom`, and only in the one spot zoomed into — even with the
  cluster circle's styling simplified to flat values with no expressions. Turning `cluster` off
  fixed rendering completely, confirmed live: all 8,700+ sites show correctly at every zoom. All
  pins render individually now rather than grouping in dense areas at low zoom, unlike the website.
  Worth revisiting if the library ships a fix, or on further investigation of why clustering
  specifically (and only clustering) fails here.
- **No custom van-icon pins.** The web app draws colored van silhouettes on a `<canvas>`; there's
  no direct equivalent in React Native. Pins here are plain colored circles.
- **No National Forest land overlay.** The web app's version relies on a MapLibre GL JS-specific
  URL token (`{bbox-epsg-3857}`) to use a live ArcGIS endpoint as a raster tile source. Whether
  MapLibre *Native* (the different engine this library wraps) supports that same token is
  unverified — not tested, since the clustering bug was the higher priority to chase down first.
  Left out rather than shipped as a guess. The BLM overlay is unaffected — it's a standard
  `{z}/{y}/{x}` tile cache, which every map engine supports, and is confirmed working on-device.
- **"Add a spot" needs coordinates typed in**, not picked by tapping the map. The web version's
  pick-on-map flow needs the map screen and the submit panel to hand a location back and forth,
  which is real state-coordination not built in this pass.
- **Font glyphs 404 from OpenFreeMap on this device** (`Failed to load glyph range 0-255 for font
  stack Open Sans Regular,Arial Unicode MS Regular`), seen in the on-device logs. Text labels on the
  base map (place names, etc.) may be missing as a result. Not yet investigated — pins, colors, and
  the land overlay all render fine regardless, so this hasn't blocked anything so far.
- **A harmless "Can't perform a React state update on a component that hasn't mounted yet"
  console warning**, seen occasionally in the on-device logs. Its stack trace only ever points at
  generic React Native/Expo internals (`LogBoxData.js`, `ExpoRoot.js`), never at any file in this
  app — it comes from `useAuth`'s Supabase sign-in listener (used by both `SiteDetailPanel` and
  `SubmitPanel`), which is driven by the native Google Sign-In module and Supabase's background
  session check rather than by anything on screen. It's a known, cosmetic-only quirk of that
  combination and doesn't affect sign-in or anything else working correctly.
