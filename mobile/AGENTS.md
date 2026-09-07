# Expo HAS CHANGED

This project targets **SDK 57** (React Native 0.86, React 19.2).

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Pin note: this was on SDK 54 to match the Expo Go build on the team's device. Expo Go
auto-updates and ships exactly one SDK, so that pin went stale the moment the phone moved
to 57 — the app then failed to open with a generic "something went wrong". Track whatever
SDK the team's Expo Go is on, or build a standalone APK (`eas build -p android --profile
preview`) and stop depending on Expo Go entirely.

Note: `babel.config.js` requires `babel-preset-expo` as an explicit top-level devDependency —
npm nests it under `node_modules/expo/`, where a root Babel config cannot resolve it.
