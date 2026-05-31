# Android App Readiness Audit

**Date:** 2026-05-31  
**Scope:** Internal/debug APK via Capacitor remote-URL shell  
**Production URL:** `https://liosh-website.vercel.app`  
**Package ID:** `com.leok.kids`  
**App name:** `LEO K`

---

## Phase 0 — Production Suitability Decision

### Owner-confirmed target phase

**Internal/debug APK for device testing only.** No Google Play release in this phase.

### Options evaluated

| Approach | Suitability for this phase | Notes |
|----------|---------------------------|-------|
| **Capacitor remote-URL shell (selected)** | **Approved for internal/debug APK** | Fastest path to validate WebView behavior, auth cookies, and learning flows on a real Android device. No website code changes required. |
| Google Play via Capacitor remote-URL | Deferred | Requires separate WebView policy review and Families policy compliance before any store submission. Not in scope for this phase. |
| Trusted Web Activity (TWA) | Deferred | Google's recommended PWA-to-Play path; requires `assetlinks.json` on production domain. Better evaluated when Play Store release is approved. |

### Decision

Use **Capacitor remote-URL mode** loading `https://liosh-website.vercel.app`. The Android APK is a native shell around the existing production web app. This is acceptable for internal/debug device testing. It is **not** approved for Google Play production release without a separate policy review (documented in `GOOGLE_PLAY_READINESS_CHECKLIST.md`).

---

## PWA Manifest Audit

**File:** `public/manifest.json`

| Check | Status | Detail |
|-------|--------|--------|
| `name` / `short_name` | Pass | `LEO K - Kids Games & Learning` / `LEO K` |
| `start_url` | Pass | `/` |
| `display` | Pass | `standalone` |
| `orientation` | Pass | `any` |
| `theme_color` | Pass | `#fbbf24` |
| `background_color` | Pass | `#050816` |
| Icons 192×192 | Pass | `public/images/leo-icons/icon-192.png` exists |
| Icons 512×512 | Pass | `public/images/leo-icons/icon-512.png` exists |
| Maskable icons | Pass | `icon-192-maskable.png`, `icon-512-maskable.png` exist |
| Shortcuts | Pass | Arcade Games, Learning Zone |
| Service worker | Pass | `public/sw.js` registered in production via `pages/_app.js` |

**Icon inventory (verified on disk):**

- `icon-192.png` (34,934 bytes)
- `icon-512.png` (199,764 bytes)
- `icon-192-maskable.png` (37,974 bytes)
- `icon-512-maskable.png` (218,254 bytes)

No missing icon files. No replacement icons needed.

---

## Viewport & Mobile Meta Audit

**File:** `pages/_app.js`

| Meta | Value | Status |
|------|-------|--------|
| `viewport` | `width=device-width, initial-scale=1, viewport-fit=cover` | Pass |
| `theme-color` | `#fbbf24` | Pass |
| `apple-mobile-web-app-capable` | `yes` | Pass |
| `mobile-web-app-capable` | `yes` | Pass |
| RTL support | `dir="rtl"` on offline fallback in SW | Pass (site uses Hebrew RTL) |

Additional: `useIOSViewportFix` hook sets `--app-100vh` CSS variable for mobile viewport stability.

---

## Cookie / Auth WebView Compatibility

| Session | Cookie name | SameSite | HttpOnly | Secure (prod) | WebView risk |
|---------|-------------|----------|----------|---------------|--------------|
| Student | `liosh_student_session` | Lax | yes | yes | **Low** — same-origin remote URL |
| Staff (school) | `liosh_staff_session` | **Strict** | yes | yes | **Medium** — needs QA on top-level navigation |
| Guardian | `liosh_guardian_session` | Lax | yes | yes | **Low** |
| Parent/teacher | Supabase Bearer token | N/A (Authorization header) | N/A | HTTPS | **Low** |

**Remote-URL mode:** WebView requests originate from `https://liosh-website.vercel.app`, matching cookie `Path=/` and `Secure` requirements. SameSite=Lax cookies work for same-site top-level navigations and form submissions.

**Staff session (SameSite=Strict):** Requires manual device QA — staff login and school portal navigation must be verified on a real device (see `ANDROID_QA_REPORT.md`).

**Same-origin guard:** Production API mutations check `Origin`/`Referer` against the request host. WebView sends the production origin — **compatible**.

---

## CSP Header Compatibility

**File:** `next.config.js`

| Directive | Value | WebView impact |
|-----------|-------|----------------|
| `default-src` | `'self'` | Pass — same origin |
| `connect-src` | `'self'`, `*.supabase.co`, `wss://*.supabase.co` | Pass — Supabase realtime and API |
| `script-src` | `'self' 'unsafe-inline'` | Pass |
| `frame-ancestors` | `'none'` | Pass — WebView is not an iframe |
| `X-Frame-Options` | `DENY` | Pass — WebView is not an iframe |

No CSP changes required for Capacitor remote-URL mode.

---

## Service Worker in Capacitor WebView

- Android WebView (Chromium, API 26+) supports service workers.
- Capacitor uses the system WebView (Chromium-based on modern devices).
- `public/sw.js` registers in production only; caches static assets and provides offline fallback.
- **Risk:** SW caching may serve stale content after site updates. Mitigation: SW checks for updates hourly (`pages/_app.js`). Document in QA if stale content observed.
- **Risk:** Offline mode in WebView may behave differently than browser PWA. Test offline indicator on device.

---

## Google Play WebView Policy Review (readiness only — not submitting)

| Check | Status | Notes |
|-------|--------|-------|
| Same owner as website | Confirmed | App wraps the owner's production learning site |
| Real learning product | Confirmed | Full learning platform: activities, games, reports, parent/school portals |
| Not affiliate/referral traffic | Confirmed | First-party educational product |
| Policy risk level | **Medium** for Play Store | Remote-URL WebView apps face scrutiny; TWA may be preferable for future Play release |
| Mitigation | Document only | Complete Families policy checklist before any submission |

**This phase does not submit to Google Play.**

---

## Known Gaps and Mitigations

| Gap | Severity | Mitigation |
|-----|----------|------------|
| Staff SameSite=Strict session | Medium | Manual QA on Android device |
| SW stale cache in WebView | Low | Hourly update check; user can force-refresh |
| No native splash screen | Low | Optional; not blocking debug APK |
| Remote URL requires network | Expected | App loads live site; offline limited to SW-cached assets |
| Back button behavior | Medium | QA: WebView history vs Android system back |
| Audio autoplay policies | Low | QA TTS and game sounds on device |

---

## Audit Conclusion

The site is **ready for internal/debug APK packaging** via Capacitor remote-URL mode. PWA assets, viewport configuration, and auth cookie patterns are compatible with Android WebView. No website code changes are required for this phase.

**Next steps:** Capacitor installation, Android project generation, icon configuration, debug APK build, and device QA per the plan.
