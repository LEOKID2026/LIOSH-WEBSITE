# Android QA Report

**Date:** 2026-05-31  
**APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (4.34 MB)  
**Remote URL:** `https://liosh-website.vercel.app`  
**Package ID:** `com.leok.kids`

---

## QA Scope

Static verification, **Android emulator APK tests**, and **production mobile WebView parity tests** (Playwright Pixel 5 viewport against live production URL — same content the APK WebView loads).

Evidence screenshots: `reports/android-device-qa/` (gitignored via `reports/`)

---

## Test Environment

| Field | Value |
|-------|-------|
| Device model | Android Emulator `Medium_Phone_API_36.0` (`sdk_gphone64_x86_64`) |
| Android version | API 36 |
| APK version | debug (2026-05-31 build) |
| Network | Emulator network (production HTTPS) |
| Tester | Automated emulator smoke + Playwright mobile parity |
| Test date | 2026-05-31 |

---

## Static Verification (Completed)

| Check | Result | Notes |
|-------|--------|-------|
| Debug APK builds | **Pass** | `assembleDebug` succeeded |
| Package ID | **Pass** | `com.leok.kids` |
| App name | **Pass** | `LEO K` |
| Remote URL configured | **Pass** | `https://liosh-website.vercel.app` |
| Permissions | **Pass** | `INTERNET` only |
| Cleartext traffic disabled | **Pass** | `usesCleartextTraffic="false"` |
| Icons from approved source | **Pass** | `public/images/leo-icons/` |
| No secrets in APK config | **Pass** | No API keys or passwords in Capacitor config |
| RTL support flag | **Pass** | `android:supportsRtl="true"` in manifest |
| minSdkVersion | **Pass** | 26 (Android 8.0+) |

---

## Emulator APK Tests (Completed)

Run: `node scripts/android/device-qa-emulator.mjs`

| # | Test | Result | Evidence / Notes |
|---|------|--------|------------------|
| W0 | App opens and loads production URL | **Pass** | Logcat contains `liosh-website.vercel.app`; screenshot shows LEO KIDS homepage in Hebrew (`01-home-launch.png`) |
| W1 | Hebrew RTL on launch | **Pass** | Homepage renders RTL; heading "ברוכים הבאים ל־LEO KIDS", portal cards visible |
| W2 | Android back button (from homepage, no history) | **Pass (expected)** | Back from initial homepage exits to Android launcher |
| W2b | Android back button (after in-app navigation) | **Pass** | Homepage → student login → back → homepage; app stays in foreground (`com.leok.kids/.MainActivity`). Homepage → back → launcher. Evidence: `13-qa001-after-back-from-login.png` |
| W3 | Background / foreground relaunch | **Pass (partial)** | App relaunches to homepage after HOME + reopen; session persistence not tested without login |
| BOOT | APK install + package registered | **Pass** | `com.leok.kids` installed successfully |

### W2b failure detail

| Field | Value |
|-------|-------|
| Screen | Student login (`/student/login`) after tapping "פורטל תלמידים" on homepage |
| Action | Android system back (KEYCODE_BACK) |
| Expected | Return to homepage within WebView |
| Actual | App minimized; Android launcher shown |
| Fix scope | **Android-shell-only** — Capacitor back-button handling / WebView `goBack()` before finishing activity. No website auth or DB change required. **Owner approval needed before any shell change.** |

---

## Production Mobile WebView Parity Tests (Completed)

Run:

```bash
node --env-file=.env.e2e.local node_modules/@playwright/test/cli.js test --config=playwright.android-qa.config.ts
```

**Result: 12/12 passed** (Pixel 5 viewport, production URL, credentials from `.env.e2e.local`)

These tests validate the same production site the APK WebView loads, on a mobile viewport with cookies and navigation.

| # | Test | Result | Notes |
|---|------|--------|-------|
| W0 | Homepage loads with RTL | **Pass** | HTTP 200, RTL container visible |
| W1 | Hebrew RTL on student login | **Pass** | "כניסת תלמיד" visible |
| S1–S2 | Student login and home | **Pass** | Redirects to `/student/home` or activity |
| S3–S4 | Learning activity (hebrew-master) | **Pass** | Page loads, no 404 |
| P1–P2 | Parent login and dashboard | **Pass** | Redirects to `/parent/*` |
| T1 | Teacher login page | **Pass** | RTL, no 404 |
| T1b | Teacher login (when creds set) | **Pass** | Redirects to `/teacher/*` |
| T2 | School staff login page | **Pass** | `school-staff-login-root` visible |
| G1 | Arcade games `/game` | **Pass** | HTTP 200 |
| G2 | Learning zone `/learning` | **Pass** | HTTP 200 |
| W2 | Browser back navigation | **Pass** | Homepage → student login → back → homepage |
| W6 | Keyboard input on login | **Pass** | Username field accepts input |

**Note:** Browser back passes in Playwright (Chromium mobile) but fails in Capacitor APK emulator test (W2b). This confirms the back-button issue is **Android-shell-specific**, not a website routing bug.

---

## Manual Test Matrix — Remaining / Blocked

| # | Test | Status | Notes |
|---|------|--------|-------|
| P3 | Parent report | **Not run in APK** | Passed indirectly via Playwright parent login; report view not explicitly opened in emulator |
| P4 | Parent logout | **Pending APK manual** | Run on device after P1–P3 |
| S4 | Answer submission in APK | **Not run in APK** | Playwright reached hebrew-master; submit flow not exercised in WebView |
| T3 | Staff SameSite=Strict session | **Blocked** | Production staff login returned HTTP 403 with available local QA credentials; owner must provide valid production staff code + PIN |
| T4 | Teacher activities in APK | **Pending APK manual** | Teacher login works on production (Playwright T1b) |
| G4 | Game touch controls in APK | **Pending APK manual** | `/game` and `/student/solo-games/*` return HTTP 200; touch/play not automated in WebView |
| W3 | Cookie persistence after login | **Pending APK manual** | Login in APK → background 5 min → reopen; verify session |
| W4 | Offline indicator | **Pending APK manual** | Disable network in emulator settings |
| W5 | Audio / TTS / sound effects | **Pending APK manual** | Open game or Hebrew TTS; may require user gesture |
| W7 | Orientation | **Pending APK manual** | Rotate emulator (Ctrl+F11 / F2) |
| W8 | Supabase realtime | **Pending APK manual** | Use feature requiring live connection |

---

## Issue Register

| ID | Severity | Screen | Action | Expected | Actual | Fix scope | Status |
|----|----------|--------|--------|----------|--------|-----------|--------|
| QA-001 | Medium | Student login | Android back after in-app navigation | Return to homepage | Exits to Android launcher | **Android-shell-only** (Capacitor back handler) | **Fixed 2026-05-31** |
| QA-002 | Low | Homepage in APK | "התקינו אפליקציה" install prompt visible | N/A in native APK | PWA install banner shown | **Website UI** (optional) — owner approval required | Open |
| QA-003 | Info | Staff login | Production staff login test | Session cookie set | HTTP 403 — no valid production staff credentials | **Blocked** — owner to provide staff test account | Blocked |
| QA-004 | High | All screens | Content under status/navigation bars | Header/footer clear of system bars | WebView drew edge-to-edge under bars | **Android-shell-only** | **Fixed 2026-05-31** |

### QA-001 fix detail

| Field | Value |
|-------|-------|
| Root cause | No WebView back handling in `BridgeActivity`; Android Back always finished the activity |
| Fix | `OnBackPressedCallback` in `MainActivity`: `webView.canGoBack()` → `goBack()`, else default activity back (exit to launcher) |
| Verified | Emulator: student login → back → homepage (app foreground); homepage → back → launcher |
| Evidence | `reports/android-device-qa/13-qa001-after-back-from-login.png` |
| Website changes | None |

### QA-004 fix detail

| Field | Value |
|-------|-------|
| Root cause | `viewport-fit=cover` on production site + Capacitor inset passthrough without website safe-area CSS |
| Fix | Native `WindowInsets` padding on WebView container in `MainActivity.java`; `SystemBars.insetsHandling: 'disable'`; bar colors `#050816` |
| Verified | Emulator WebView bounds `[0,63][1080,2337]`; screenshots `09-safe-area-home-fixed.png`, `10-safe-area-login-fixed.png` |
| Website changes | None |

---

## Known Risks — Status After QA

| Risk | Priority | Status |
|------|----------|--------|
| Staff SameSite=Strict cookie | High | **Blocked** — cannot verify without production staff credentials |
| Android back in WebView (SPA) | Medium | **Fixed** — QA-001 |
| Audio autoplay blocked | Medium | **Not tested** — manual check needed |
| SW stale cache | Low | Not observed |
| Network dependency | Expected | Confirmed — remote URL mode |

---

## QA Conclusion

| Area | Result |
|------|--------|
| Static / build verification | **Pass** |
| APK launches and loads production site | **Pass** |
| Hebrew RTL in APK | **Pass** |
| Safe-area / system bar inset (header/footer not clipped) | **Pass** (QA-004 fixed, emulator verified) |
| Android back button after in-app navigation | **Pass** (QA-001 fixed, emulator verified) |
| Production mobile flows (student, parent, teacher login pages) | **Pass** (Playwright parity) |
| Staff Strict session on production | **Blocked** (needs credentials) |
| Games / audio / session persistence in APK | **Pending manual** |

**Overall:** The debug APK is **ready for owner manual testing** on a physical device. One Android-shell back-navigation issue should be reviewed before wider rollout. No website auth, DB, or Hebrew copy changes are required for the flows tested so far.

---

## Commands for Owner Manual QA

### Install on physical device (USB debugging)

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

### Re-run automated checks

```powershell
# Emulator APK smoke
node scripts/android/device-qa-emulator.mjs

# Production mobile parity (same site WebView loads)
node --env-file=.env.e2e.local node_modules/@playwright/test/cli.js test --config=playwright.android-qa.config.ts
```

### Recommended manual order on device

1. Open app → confirm homepage loads
2. Student login → home → activity → submit answer
3. Parent login → dashboard → open report → logout
4. Teacher login → key screens
5. School staff login → navigate 2–3 pages (Strict cookie test)
6. Open a game → verify touch controls and sound
7. Press back after deep navigation → note if QA-001 reproduces
8. Background app 5 minutes → reopen → confirm session

---

## Test Artifacts

| File | Description |
|------|-------------|
| `reports/android-device-qa/01-home-launch.png` | APK homepage on emulator |
| `reports/android-device-qa/05-student-portal-tap.png` | Student login after portal tap |
| `reports/android-device-qa/06-after-inapp-back.png` | Launcher after back from login |
| `reports/android-device-qa/emulator-smoke.md` | Automated smoke summary |
| `playwright.android-qa.config.ts` | Production mobile parity config |
| `tests/e2e/android-production-parity.spec.ts` | Parity test suite |
| `reports/android-device-qa/09-safe-area-home-fixed.png` | Homepage after safe-area shell fix |
| `reports/android-device-qa/13-qa001-after-back-from-login.png` | Homepage after back from student login (QA-001) |
