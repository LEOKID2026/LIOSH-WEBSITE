# Capacitor Setup Report

**Date:** 2026-05-31  
**Scope:** Internal/debug APK — Capacitor remote-URL shell  
**Status:** Setup complete, debug APK built successfully

---

## Owner-Confirmed Configuration

| Setting | Value |
|---------|-------|
| Target phase | Internal/debug APK only (no Google Play) |
| Production URL | `https://liosh-website.vercel.app` |
| Package ID | `com.leok.kids` |
| App name | `LEO K` |
| Icon source | `public/images/leo-icons/` |

---

## Packages Installed

| Package | Version | Type |
|---------|---------|------|
| `@capacitor/core` | ^8.3.4 | devDependency |
| `@capacitor/cli` | ^8.3.4 | devDependency |
| `@capacitor/android` | ^8.3.4 | devDependency |

Installed via: `npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android`

---

## npm Scripts Added

| Script | Command |
|--------|---------|
| `cap:sync` | `npx cap sync android` |
| `cap:open` | `npx cap open android` |
| `cap:build:debug` | `cd android && gradlew.bat assembleDebug` |

---

## capacitor.config.ts Decisions

**File:** [`capacitor.config.ts`](../../capacitor.config.ts)

| Setting | Value | Rationale |
|---------|-------|-----------|
| `appId` | `com.leok.kids` | Owner-confirmed reverse-DNS ID |
| `appName` | `LEO K` | Owner-confirmed launcher name |
| `webDir` | `out` | Required by Capacitor CLI; contains minimal placeholder (`out/index.html`). Unused at runtime because `server.url` is set. |
| `server.url` | `https://liosh-website.vercel.app` | Remote-URL mode — WebView loads live production site |
| `server.cleartext` | `false` | HTTPS only |
| `server.allowNavigation` | `liosh-website.vercel.app`, `*.supabase.co` | Restrict navigation to production domain and Supabase |
| `android.allowMixedContent` | `false` | No HTTP mixed content |
| `android.captureInput` | `true` | Ensures keyboard/input works in WebView |
| `android.webContentsDebuggingEnabled` | `false` | Disabled for security; enable locally only during debug sessions |

Synced copy written to: `android/app/src/main/assets/capacitor.config.json`

---

## Android Project Generation

Command: `npx cap add android`

Generated directory: `android/`

Key generated files:
- `android/app/src/main/java/com/leok/kids/MainActivity.java`
- `android/app/build.gradle`
- `android/variables.gradle`
- `android/gradlew` / `android/gradlew.bat`

---

## Android Manifest Changes

**File:** `android/app/src/main/AndroidManifest.xml`

| Change | Before | After |
|--------|--------|-------|
| Permissions | `INTERNET` only | `INTERNET` only (unchanged — no extra permissions added) |
| `usesCleartextTraffic` | not set | `false` |
| App name | `LEO K` | `LEO K` (set by Capacitor init from config) |
| Package | — | `com.leok.kids` |

**Permissions audit:** Only `android.permission.INTERNET` is declared. No camera, microphone, location, storage, or notification permissions.

---

## SDK Versions

**File:** `android/variables.gradle`

| Setting | Value |
|---------|-------|
| `minSdkVersion` | 26 (Android 8.0) |
| `compileSdkVersion` | 36 |
| `targetSdkVersion` | 36 |

`minSdkVersion` raised from Capacitor default 24 to 26 per plan (SameSite cookie + modern WebView support).

---

## Icon & Splash Asset Pipeline

### Icons (applied)

Source files from `public/images/leo-icons/`:

| Source | Used for |
|--------|----------|
| `icon-192.png` | `ic_launcher.png`, `ic_launcher_round.png` (all densities) |
| `icon-192-maskable.png` | `ic_launcher_foreground.png` (all densities) |

Copied to: `mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`

Adaptive icon background color: `#050816` (matches `manifest.json` `background_color`)

### Splash (default Capacitor)

Default Capacitor splash assets retained. Splash customization deferred — not blocking for debug APK.

---

## .gitignore Updates

Added to [`.gitignore`](../../.gitignore):

```
android/app/build/
*.jks
*.keystore
keystore.properties
signing.properties
```

---

## Sync Command

After any config or web asset change:

```bash
npx cap sync android
```

---

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| `out/` in `.gitignore` | Low | Placeholder `out/index.html` exists locally but is gitignored. Required for `cap sync`. Document for future developers. |
| Icon density sizing | Low | Same 192px source copied to all densities. Acceptable for debug APK; optimize per-density sizes before Play Store release. |
| Remote URL requires network | Expected | App cannot function offline beyond SW-cached assets from production site |
| Device QA pending | Medium | Flow verification requires manual testing on Android device/emulator (see `ANDROID_QA_REPORT.md`) |
| JAVA_HOME not in system PATH | Low | Build requires setting `JAVA_HOME` to Android Studio JBR (documented in build report) |

---

## Files Created or Modified

| File | Action |
|------|--------|
| `package.json` | Added Capacitor devDependencies + 3 scripts |
| `package-lock.json` | Updated by npm install |
| `capacitor.config.ts` | Created |
| `out/index.html` | Created (Capacitor webDir placeholder) |
| `android/` | Created by `npx cap add android` |
| `android/app/src/main/AndroidManifest.xml` | Added `usesCleartextTraffic="false"` |
| `android/variables.gradle` | Set `minSdkVersion = 26` |
| `android/app/src/main/res/values/ic_launcher_background.xml` | Background `#050816` |
| `android/app/src/main/res/mipmap-*/` | Leo K icons copied |
| `.gitignore` | Keystore/signing ignores added |

---

## What Was NOT Changed

- `next.config.js`, `pages/_app.js`, auth logic, DB schema, Hebrew copy, UI
- Existing Vercel/web deployment
- No SQL, migrations, secrets, or signing files
