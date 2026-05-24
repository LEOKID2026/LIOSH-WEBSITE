# Video Tutorials — Publish Playback QA Report

- **Status:** Published + **compact preview/modal UX** QA pass (26/26 primary, 2/2 negative)
- **Last updated:** 2026-05-24
- **UX mode:** Compact thumbnail card → modal player (not large inline `<video>`)
- **Machine-readable:** [qa-evidence-audit/help-center-video-playback-qa/results.json](../../qa-evidence-audit/help-center-video-playback-qa/results.json)
- **Runner:** `node scripts/help-center/playback-qa-publish-wave.mjs`

---

## Executive summary

| Gate | Result |
|------|--------|
| Compact preview + modal UX | **Implemented** in `components/help/HelpVideoEmbed.js` |
| `npm run help:verify-videos` | **PASS** (13 captured, 29 dormant) |
| Browser QA (13 × desktop + mobile) | **26/26 PASS** |
| Negative (#2, SL9 slot) | **2/2 PASS** |
| `npm run build` | **PASS** (exit 0) |

**Final owner sign-off:** still **on hold** until display UX is accepted in manual review.

---

## UX change (2026-05-24)

### Before
Large inline `<video controls>` dominated the article (especially on mobile) before the user chose to play.

### After
1. **Article body:** compact preview card (~9.5–11rem height, max ~220px QA cap)
   - Poster image visible
   - Centered play icon
   - Hebrew CTA: **צפו בסרטון הדרכה** (only new user-facing string)
   - `data-help-video-preview` marker for QA
   - Still **before** screenshot blocks

2. **On click/tap:** centered modal (`role="dialog"`)
   - Semi-transparent backdrop (not device fullscreen)
   - Header with label + **סגור** close button (min 44×44 tap target)
   - Video plays in modal with `controls`, `playsInline`, `controlsList="nofullscreen"`
   - Escape key closes; backdrop click closes
   - Body scroll locked while open; video pauses on close
   - No autoplay until user opens modal

3. **Mobile:** preview fits article width; modal `max-h-[90vh]`; video `max-h-[70vh]`; close always in header

4. **Desktop:** preview `max-w-xl`; modal `max-w-3xl` centered

---

## Checks performed (per URL × viewport)

| Check | Result |
|-------|--------|
| HTTP 200 | Pass |
| No inline `<video>` before open | Pass |
| Compact preview card + poster | Pass (height ≤ 220px) |
| Preview before screenshots | Pass (where screenshots exist) |
| Click opens modal | Pass |
| Correct desktop/mobile WebM in modal | Pass |
| Playback ≥2s in modal | Pass |
| Close button works; dialog hidden after | Pass |
| No `document.fullscreenElement` during play | Pass |
| No horizontal overflow | Pass |
| No media 404 | Pass |

---

## Primary URLs (26/26 pass)

All 13 primary Help Center URLs pass on **desktop (1366×900)** and **mobile (390×844)**.

See [results.json](../../qa-evidence-audit/help-center-video-playback-qa/results.json) for per-URL detail.

---

## Negative cases (2/2 pass)

| URL | Expected | Result |
|-----|----------|--------|
| `/help/parents/create-parent-account` | No preview, no video | Pass |
| `/help/parent-report/subjects-overview` | No published SL9 video | Pass |

---

## `npm run help:verify-videos`

```
OK: 42 entries (13 captured, 29 placeholder dormant);
public webm=26, posters=26
```

---

## `npm run build`

- **Exit code:** 0
- **Note:** Pre-existing webpack warning on `question-metadata-scanner.js` (unrelated to Help Center videos).

---

## Files changed (this UX pass)

| File | Change |
|------|--------|
| `components/help/HelpVideoEmbed.js` | Compact preview + modal player |
| `scripts/help-center/playback-qa-publish-wave.mjs` | QA updated for modal UX |
| `docs/help-center/VIDEO_TUTORIALS_PUBLISH_QA_REPORT.md` | This report |

**Not changed:** article Hebrew body copy (except embed CTA **צפו בסרטון הדרכה**), screenshots, manifest, product/legal/security, git commit/push.

---

## Re-run

```bash
npm run help:verify-videos
node scripts/help-center/playback-qa-publish-wave.mjs
npm run build
```

Requires `npm run dev` on port **3001** for playback QA.
