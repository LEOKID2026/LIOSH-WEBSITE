# Android QA Report

**Date:** 2026-05-31  
**APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (4.34 MB)  
**Remote URL:** `https://liosh-website.vercel.app`  
**Package ID:** `com.leok.kids`

---

## QA Scope

This report covers static verification (build, config, permissions) and a manual test matrix for device/emulator testing. **Device flow tests require owner execution on a real Android device or emulator.**

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

## Manual Test Matrix (Device Required)

**Instructions:** Install `app-debug.apk` on an Android device or emulator with network access. Mark each test Pass/Fail/Blocked.

### Parent Flows

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| P1 | Parent login | Open app → navigate to parent login → enter email/password | Login succeeds, dashboard loads | **Pending device test** |
| P2 | Parent dashboard | After login, view dashboard | Student list, activity summary visible | **Pending device test** |
| P3 | Parent report | Open a student report | Report renders with Hebrew text, charts load | **Pending device test** |
| P4 | Parent logout | Tap logout | Session cleared, redirected to login/home | **Pending device test** |

### Student Flows

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| S1 | Student code/PIN login | Navigate to student login → enter code + PIN | Login succeeds, student home loads | **Pending device test** |
| S2 | Student home | View student home screen | Navigation, assigned activities visible | **Pending device test** |
| S3 | Activity open | Open an assigned learning activity | Activity loads, questions render | **Pending device test** |
| S4 | Answer submission | Submit an answer in activity | Answer accepted, feedback shown | **Pending device test** |
| S5 | Session persistence | Background app → reopen | Student session still active (cookie persisted) | **Pending device test** |

### School / Teacher / Staff Flows

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| T1 | Teacher login | Navigate to teacher portal → login | Dashboard loads | **Pending device test** |
| T2 | School staff login | Navigate to school portal → staff login | School dashboard loads | **Pending device test** |
| T3 | Staff session (SameSite=Strict) | Login as staff → navigate between school pages | Session maintained across navigation | **Pending device test — medium risk** |
| T4 | Teacher activities | View/create assigned activities | Activity list and forms work | **Pending device test** |

### Games & Learning

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| G1 | Arcade games | Navigate to `/game` or student arcade | Games list loads, game opens | **Pending device test** |
| G2 | Learning zone | Navigate to `/learning` | Learning activities load | **Pending device test** |
| G3 | Hebrew master | Open Hebrew learning activity | RTL text renders correctly | **Pending device test** |
| G4 | Game playability | Play a mini-game (e.g. runner, puzzle) | Touch controls work, game runs | **Pending device test** |

### WebView Behavior

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| W1 | Hebrew RTL rendering | View any Hebrew page | Text direction right-to-left, layout correct | **Pending device test** |
| W2 | Back button | Navigate deep → press Android back | WebView history navigates back correctly | **Pending device test** |
| W3 | Cookie persistence | Login → background 5 min → reopen | Session still active | **Pending device test** |
| W4 | Offline indicator | Disable network while app open | Offline indicator appears (if SW cached) | **Pending device test** |
| W5 | Audio / TTS | Trigger Hebrew TTS or game sound | Audio plays (may require user gesture) | **Pending device test** |
| W6 | Keyboard input | Tap text input in login/forms | Soft keyboard appears, input captured | **Pending device test** |
| W7 | Orientation | Rotate device | Layout adapts (orientation: any) | **Pending device test** |
| W8 | Supabase realtime | Use feature requiring Supabase connection | WebSocket connects (CSP allows `wss://*.supabase.co`) | **Pending device test** |

---

## Known Risks for Device QA

| Risk | Priority | Mitigation |
|------|----------|------------|
| Staff SameSite=Strict cookie | High | Test T3 specifically; document if staff login fails |
| Audio autoplay blocked | Medium | Test W5; may need tap-to-start |
| SW stale cache | Low | Force-refresh if old content shown |
| Network dependency | Expected | App requires internet for remote URL mode |

---

## QA Conclusion

**Static verification: PASS** — APK builds, configuration is correct, permissions minimal, icons applied.

**Device flow testing: PENDING** — Requires manual execution on Android device/emulator. Use the matrix above to record results.

### Recommended test order

1. Install APK via ADB
2. Verify app opens and loads production site (W1)
3. Student login flow (S1–S4)
4. Parent login flow (P1–P4)
5. Games (G1–G4)
6. Staff/teacher flows (T1–T4)
7. WebView behavior (W2–W8)

---

## Test Environment Template

| Field | Value |
|-------|-------|
| Device model | _fill on test_ |
| Android version | _fill on test_ |
| APK version | debug (2026-05-31 build) |
| Network | Wi-Fi / mobile data |
| Tester | _fill on test_ |
| Test date | _fill on test_ |
