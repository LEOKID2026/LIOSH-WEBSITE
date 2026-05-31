# Android Build and Signing Report

**Date:** 2026-05-31  
**Scope:** Internal/debug APK only — no release signing, no Google Play upload

---

## Build Result Summary

| Item | Result |
|------|--------|
| Build command | `gradlew.bat assembleDebug` |
| Build status | **SUCCESS** |
| Build time | ~1 min 24 sec (first build; Gradle 8.14.3 downloaded) |
| Output APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| APK size | **4.34 MB** (4,547,919 bytes) |
| Signing | Android debug keystore (auto-generated, not committed) |
| Release keystore | **Not created** (per plan) |
| Safe-area rebuild | **SUCCESS** (2026-05-31) — after `MainActivity` inset padding fix |
| Back-button rebuild | **SUCCESS** (2026-05-31) — after `OnBackPressedCallback` in `MainActivity` |

---

## Prerequisites

### Required software

| Tool | Minimum version | Verified on build machine |
|------|----------------|--------------------------|
| JDK | 17+ | Android Studio JBR at `C:\Program Files\Android\Android Studio\jbr` |
| Android SDK | API 26+ | `%LOCALAPPDATA%\Android\Sdk` |
| Gradle | 8.14.3 | Bundled via `android/gradlew` (auto-downloaded) |
| Node.js | 18+ | Used for Capacitor CLI |

### Environment variables (Windows)

If `java` is not in PATH, set before building:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

---

## Build Instructions (Debug APK)

### One-time setup

```bash
# From repo root
npm install
npx cap sync android
```

### Build debug APK

**Windows (PowerShell):**

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```

**Or via npm script (after setting JAVA_HOME):**

```bash
npm run cap:build:debug
```

### Output location

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Install on Device

### Via ADB (USB debugging enabled)

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Via file transfer

Copy `app-debug.apk` to the device and open it. Enable "Install from unknown sources" if prompted (debug APK only).

### Via Android Studio

```bash
npm run cap:open
```

Then Run → Run 'app' on a connected device or emulator.

---

## Emulator Setup (optional)

1. Open Android Studio → Device Manager
2. Create Virtual Device (recommended: Pixel 6, API 34+)
3. Start emulator
4. Install APK via ADB or Run from Android Studio

---

## Signing Rules (This Phase)

| Rule | Status |
|------|--------|
| Debug APK uses auto-generated debug keystore | Yes |
| No release keystore created | Confirmed |
| No signing passwords in repo, docs, logs, or screenshots | Confirmed |
| No `*.jks` or `*.keystore` files committed | Confirmed (`.gitignore` updated) |

---

## Release / AAB Readiness Notes (NOT executed)

These steps are documented for a future phase when Google Play release is approved. **Do not execute without owner approval.**

### Release build (future)

```bash
cd android
./gradlew bundleRelease   # Produces AAB for Play Store
```

### Signing setup (future — owner-managed, outside repo)

1. Generate upload keystore locally (never commit):
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Create `keystore.properties` locally (gitignored):
   ```
   storeFile=../upload-keystore.jks
   storePassword=<owner-managed>
   keyAlias=upload
   keyPassword=<owner-managed>
   ```
3. Configure `android/app/build.gradle` `signingConfigs` (future change — requires owner approval)
4. Recommend Google Play App Signing (Google manages app signing key)

### AAB output location (future)

```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Build Warnings (non-blocking)

| Warning | Impact |
|---------|--------|
| `Using flatDir should be avoided` | Capacitor/Cordova plugin default; no action needed for debug |
| `unchecked or unsafe operations` in capacitor-android | Library compile note; no action needed |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `JAVA_HOME is not set` | Set to Android Studio JBR path (see above) |
| `SDK location not found` | Set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk` |
| `License not accepted` | Run `sdkmanager --licenses` from Android SDK cmdline-tools |
| App shows blank screen | Verify device has network; confirm `https://liosh-website.vercel.app` is reachable |
| App shows placeholder instead of site | Run `npx cap sync android` and rebuild; verify `server.url` in `capacitor.config.ts` |

---

## Hard Limits (This Phase)

- Internal/debug APK only
- No Google Play publishing
- No Play Console release
- No APK/AAB upload to Google Play
- No release signing keystore
- No secrets in repo

---

## Safe-Area Fix Rebuild (2026-05-31)

After shell inset padding fix, rebuild and reinstall:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npx cap sync android
cd android
.\gradlew.bat assembleDebug
cd ..
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

**Result:** BUILD SUCCESSFUL. WebView inset verified: top 63px, bottom 63px on API 36 emulator.

Screenshots: `reports/android-device-qa/09-safe-area-home-fixed.png`, `10-safe-area-login-fixed.png`

---

## Back-Button Fix Rebuild (2026-05-31)

After `OnBackPressedCallback` in `MainActivity.java`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
cd ..
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

**Result:** BUILD SUCCESSFUL. QA-001 verified on emulator: back from student login returns to homepage; back from homepage exits to launcher.

Evidence: `reports/android-device-qa/13-qa001-after-back-from-login.png`

---
