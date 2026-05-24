---
name: help center video tutorials phase
overview: A plan-only design for a Help Center Video Tutorials Phase that adds short, narration-free screen-recording tutorials to every Help Center article. Builds on the existing `HelpVideoEmbed`, the `data/help-center/**` registry, and the existing `help:*` script chain (manifest → capture → data-safety review → publish → verify) so videos plug in without changing product logic, auth, reports, or learning flows.
todos:
  - id: wave-a-manifest
    content: Define data/help-center/videos-manifest.json with the 20 Wave A entries (section, slug, audience, viewports, wave, durationSecTarget, auth, route, captureSteps, assets shape).
    status: completed
  - id: helpvideoembed-upgrade
    content: "Whitelisted upgrade to components/help/HelpVideoEmbed.js (per §9): dual <source> (webm + mp4-deferred), IntersectionObserver-based lazy mount, keep back-compat with existing `src` prop, no autoplay."
    status: completed
  - id: videoblock-helper
    content: Add videoBlock(section, slug, id?) helper in data/help-center/articleHelpers.js that reads videos-manifest.json and emits the existing kind:"video" block shape.
    status: completed
  - id: wave-a-article-wiring
    content: Insert one videoBlock(...) call in each of the 20 Wave A articles under data/help-center/content/{parents,students,parent-report,subjects}.js — no other text changes.
    status: completed
  - id: capture-script
    content: Add scripts/help-center/capture-help-videos.mjs (Playwright recordVideo, reuses virtual-student-qa lib for auth, enforces base-URL allowlist, deterministic captureSteps, synthetic cursor overlay, no new npm deps).
    status: completed
  - id: build-videos-manifest-script
    content: Add scripts/help-center/build-videos-manifest.mjs to validate the manifest schema and pre-compute derived paths.
    status: completed
  - id: data-safety-review-videos
    content: Add scripts/help-center/video-data-safety-review.mjs mirroring the screenshots data-safety review. The agent performs this review internally during the continuous pass — it is NOT a user approval checkpoint.
    status: completed
  - id: publish-videos-script
    content: Add scripts/help-center/publish-videos.mjs that copies ONLY clips that pass the internal data-safety review from qa-evidence-audit/help-center/videos/ to public/help-center/videos/.
    status: completed
  - id: verify-videos-script
    content: "Add scripts/help-center/verify-videos.mjs: file existence, VTT validity, file-size caps, no autoplay, orphan check, build SSR check."
    status: completed
  - id: package-scripts
    content: "Add help:* npm scripts: help:build-video-manifest, help:capture-videos, help:video-data-safety-review, help:publish-videos, help:verify-videos, help:videos (chained)."
    status: completed
  - id: ffmpeg-deferred
    content: ffmpeg is NOT approved. MP4 transcoding is DEFERRED. The first execution publishes WebM only; manifest mp4 fields stay null. A future explicit plan update may approve ffmpeg later; the agent must not ask about it during execution.
    status: completed
  - id: wave-b-continuation
    content: Wave B (remaining 22 articles) is internal sequencing only and is produced immediately after Wave A inside the SAME continuous implementation pass. No separate approval. No separate merge. Failure to complete Wave B inside the same pass is a blocker, not a partial ship.
    status: completed
  - id: docs-and-final-report
    content: Author docs/help-center/VIDEO-TUTORIALS-PLAN.md, VIDEO-MANUAL-QA.md, and VIDEO-SIGNOFF.md. VIDEO-SIGNOFF.md is filled out by the agent at the end of the continuous pass as part of the final implementation report (per §11.3) — it is not a mid-pass approval gate.
    status: completed
isProject: false
---

## 0. Status & non-goals

- Plan-only. Do NOT implement, capture, edit files, create scripts, or commit during this conversation. Execution begins only when a single final manual user approval is given AFTER this plan is accepted (see §11.1).
- Do not interfere with the in-flight Help Center screenshot phase. This plan assumes that phase completes first; videos are a fully separate, additive phase.
- The current Help Center implementation is preserved as-is. `HelpVideoEmbed` already exists at [`components/help/HelpVideoEmbed.js`](components/help/HelpVideoEmbed.js) and is already wired in [`components/help/HelpArticleBody.js`](components/help/HelpArticleBody.js) for `block.kind === "video"`. No new article schema is needed — only data is added later.
- Hebrew/RTL only. Captions, transcripts, and any future narration are Hebrew. No English UI strings.
- Fixed design decisions (binding for the first execution; not reopened during the continuous pass):
  - Container strategy = WebM only for the first execution. The `HelpVideoEmbed` upgrade is still designed to accept BOTH WebM + MP4 via `<source>` fallback, so future MP4 files can be added later as data only. The manifest `mp4` fields remain null/empty during the first execution.
  - ffmpeg is NOT approved. MP4 transcoding is DEFERRED to a future explicit plan update. The agent must NOT ask about ffmpeg again during execution.
  - Coverage = FULL with DUAL viewport — one short tutorial concept per existing Help Center article (42 articles). Each tutorial is recorded in BOTH viewports (desktop AND mobile). Final asset target: 42 desktop WebM + 42 mobile WebM = 84 WebM clips, plus 42 desktop posters + 42 mobile posters = 84 posters. Wave A (20 articles) and Wave B (22 articles) are INTERNAL sequencing only — they are NOT approval checkpoints, NOT separate merges, and MUST both be completed inside the same continuous implementation pass. Each Wave A and Wave B entry must produce BOTH viewports; a missing viewport for any article is a blocker per §11.2, not a partial ship.

## 1. Recommended video inventory

> Wave A and Wave B below describe INTERNAL execution order only. They are not approval checkpoints, not separate merges, and not two ships. Both waves are produced in the SAME continuous implementation pass once final manual approval is given (see §11.1). The full 42-video target is the only acceptance bar; partial Wave A completion is a blocker per §11.2.

Wave A — internal sequencing only (matches the flows you listed; produced first inside the same pass):

- Parents (8): `create-parent-account`, `parent-dashboard-tour`, `add-students`, `student-pin-and-credentials`, `parent-copilot`, `install-as-app`, `mobile-and-offline`, `how-to-read-report`.
- Students (4): `student-login`, `student-home-tour`, `choose-subject-and-grade`, `answering-questions`.
- Subjects (6, one each): `math`, `geometry`, `hebrew`, `english`, `science`, `moledet-geography`.
- Parent Report (2 anchors): `report-overview`, `detailed-report`.
- Wave A subtotal: 20 videos.

Wave B — internal sequencing only (remaining articles, produced immediately after Wave A inside the SAME continuous pass; no separate approval, no separate merge):

- Parents (5 remaining of 13): `welcome-and-overview`, `edit-or-delete-student`, `monthly-rewards`, `troubleshooting-login`, `privacy-and-data`.
- Students (7 remaining of 11): `hints-and-explanations`, `daily-missions`, `monthly-persistence`, `coins-and-arcade`, `avatar-and-profile`, `offline-games`, `tips-for-good-practice`.
- Parent Report (10 remaining of 12): `summary-card`, `data-presence`, `trends-and-confidence`, `strengths-and-improvements`, `topics-and-buckets`, `subjects-overview`, `recommendations`, `challenges-section`, `printing-and-pdf`, `understanding-the-disclaimer`.
- Wave B subtotal: 22 videos.

Total target (asset-level):

- 42 tutorial concepts (one per article).
- 84 WebM clips (42 desktop + 42 mobile — every article in BOTH viewports).
- 84 posters (42 desktop + 42 mobile).
- 0 MP4 (DEFERRED per §0/§4).

Both waves are mandatory inside a single continuous pass; any inability to complete all 42 articles in BOTH viewports is a blocker, not a partial deliverable.

Audience tagging (encoded in the manifest as `audience: "parent" | "student" | "both"`):

- `parents/*` videos → `parent`.
- `students/*` videos → `student`.
- `parent-report/*` videos → `parent`.
- `subjects/*` videos → `both` (uses student-side flow; useful for both audiences).

Duration & viewport rule (binding, owner decision):

- Every tutorial concept is recorded in BOTH viewports — `desktop` AND `mobile`. There are no desktop-only or mobile-only tutorials.
- Desktop viewport: 1366×900 (matches the screenshot phase's desktop preset).
- Mobile viewport: 390×844 (matches the screenshot phase's mobile preset).
- The mobile recording must show the REAL mobile layout that the site renders at that viewport (responsive breakpoints active). A CSS-zoomed desktop layout simulating mobile is NOT acceptable.
- Wave A: desktop target 30–60 s, mobile target 30–60 s (mobile may run slightly longer if the responsive flow has extra steps). Hard cap per viewport: 90 s.
- Wave B: desktop target 20–45 s, mobile target 20–45 s. Hard cap per viewport: 60 s.

## 2. Article-to-video mapping (manifest-shaped)

Mapping is data-only and lives in a new file `data/help-center/videos-manifest.json`. Each entry references an existing article by `section + slug` and lists one or more video assets. Each article supports zero, one (main), or multiple short videos — same as the screenshots manifest pattern.

Manifest shape (binding — every entry MUST include both viewports):

```json
{
  "version": 1,
  "generatedAt": "YYYY-MM-DD",
  "videos": [
    {
      "id": "parents/parent-dashboard-tour/main",
      "section": "parents",
      "slug": "parent-dashboard-tour",
      "audience": "parent",
      "title": "סיור בעמוד ההורה",
      "viewports": ["desktop", "mobile"],
      "wave": "A",
      "durationSecTarget": { "desktop": 45, "mobile": 50 },
      "auth": "parent",
      "route": "/parent/dashboard",
      "captureSteps": {
        "desktop": ["..."],
        "mobile":  ["..."]
      },
      "assets": {
        "desktop": {
          "webm":   "help-center/videos/parents/parent-dashboard-tour/desktop/main.webm",
          "mp4":    null,
          "poster": "help-center/videos/parents/parent-dashboard-tour/desktop/main.jpg",
          "captionsHe": null
        },
        "mobile": {
          "webm":   "help-center/videos/parents/parent-dashboard-tour/mobile/main.webm",
          "mp4":    null,
          "poster": "help-center/videos/parents/parent-dashboard-tour/mobile/main.jpg",
          "captionsHe": null
        }
      },
      "internalReview": {
        "desktop": { "status": "pending", "reason": null },
        "mobile":  { "status": "pending", "reason": null }
      },
      "transcriptHe": null
    }
  ]
}
```

Manifest validation rules (enforced by `scripts/help-center/build-videos-manifest.mjs`):

- `viewports` MUST equal `["desktop", "mobile"]` for every entry. No entry may omit a viewport.
- `assets.desktop.webm` and `assets.mobile.webm` MUST be set (path string).
- `assets.desktop.poster` and `assets.mobile.poster` MUST be set (path string).
- `assets.desktop.mp4` and `assets.mobile.mp4` MUST be `null` in the first execution (MP4 is DEFERRED per §0/§4).
- `captureSteps` MUST contain both `desktop` and `mobile` arrays — mobile steps may differ from desktop because the responsive UI exposes a different layout (hamburger menus, stacked cards, smaller modals, etc.).
- `internalReview.desktop.status` and `internalReview.mobile.status` MUST both be `"passed"` before the entry is eligible to publish; failure of either viewport excludes that viewport, which by definition breaks 84-asset coverage and triggers §11.2 blocker handling.

How `HelpVideoEmbed` references it later (dual-viewport aware):

- `HelpArticleBody` already renders blocks of `kind: "video"`. The plan adds a tiny helper `videoBlock(section, slug, id?)` in [`data/help-center/articleHelpers.js`](data/help-center/articleHelpers.js) that looks the entry up by id (defaulting to `{section}/{slug}/main`) and emits a single block that contains BOTH viewport sources:
  ```js
  {
    kind: "video",
    sourcesByViewport: {
      desktop: {
        webm: "/help-center/videos/<section>/<slug>/desktop/<id>.webm",
        mp4:  null,
        poster: "/help-center/videos/<section>/<slug>/desktop/<id>.jpg",
        captionsHe: null
      },
      mobile: {
        webm: "/help-center/videos/<section>/<slug>/mobile/<id>.webm",
        mp4:  null,
        poster: "/help-center/videos/<section>/<slug>/mobile/<id>.jpg",
        captionsHe: null
      }
    },
    transcriptHe: null,
    durationSec: { desktop: 45, mobile: 50 },
    audience: "parent"
  }
  ```
- `HelpVideoEmbed` gets a narrow upgrade (whitelisted, per §9):
  - Accept `sourcesByViewport: { desktop, mobile }` (new) in addition to the legacy `src` prop (back-compat — the current single-source signature continues to work).
  - On mount, pick which viewport's asset to load based on a `matchMedia("(max-width: 640px)")` check (matching the same breakpoint used by `HelpScreenshot.js`'s `<picture>` sources). When the breakpoint flips, swap the loaded `<source>` URL.
  - Emit BOTH `<source ... type="video/mp4">` (when MP4 is non-null — never in the first execution) and `<source ... type="video/webm">`. MP4 first when present.
  - Use the matching viewport's `poster`, `captionsHe`, and `durationSec`.
  - Continue to render nothing when both viewports' `webm` are null.
  - Lazy-mount the `<video>` only when within ~200 px of the viewport using `IntersectionObserver` so videos do not download on article entry. `preload="metadata"` on mount.
  - Keep `autoplay` OFF. Keep `controls` ON. Keep `playsInline`. Captions default ON when present.
- Each article supports:
  - No video → no manifest entry, no block emitted, nothing rendered.
  - One main tutorial → one manifest entry with id `main`, one `videoBlock(section, slug)` call. The entry carries BOTH desktop and mobile assets.
  - Multiple short tutorials → multiple manifest entries with ids `intro`, `step-1`, `step-2`, etc., each emitted via `videoBlock(section, slug, id)`. Each entry STILL carries both viewports.

## 3. Storage paths (raw → review → publish)

Mirrors the screenshots model exactly, so the publish/verify discipline already understood by the team carries over.

For every article there are TWO `<viewport>` subtrees — `desktop/` and `mobile/`. Both are mandatory.

- Raw recordings (audit, git-ignored):
  - `qa-evidence-audit/help-center/videos/<section>/<slug>/desktop/<id>.webm`
  - `qa-evidence-audit/help-center/videos/<section>/<slug>/mobile/<id>.webm`
  - `qa-evidence-audit/help-center/videos/<section>/<slug>/desktop/<id>.mp4` (DEFERRED; not produced in the first execution per §0/§4)
  - `qa-evidence-audit/help-center/videos/<section>/<slug>/mobile/<id>.mp4` (DEFERRED; not produced in the first execution per §0/§4)
  - `qa-evidence-audit/help-center/videos/<section>/<slug>/desktop/<id>.jpg` (poster extracted from frame ~0.5 s)
  - `qa-evidence-audit/help-center/videos/<section>/<slug>/mobile/<id>.jpg` (poster extracted from frame ~0.5 s)
  - Add `.gitignore` entry for `qa-evidence-audit/help-center/videos/`.
- Published (committed, served by Next):
  - `public/help-center/videos/<section>/<slug>/desktop/<id>.webm`
  - `public/help-center/videos/<section>/<slug>/mobile/<id>.webm`
  - `public/help-center/videos/<section>/<slug>/desktop/<id>.mp4` (DEFERRED; not produced in the first execution per §0/§4)
  - `public/help-center/videos/<section>/<slug>/mobile/<id>.mp4` (DEFERRED; not produced in the first execution per §0/§4)
  - `public/help-center/videos/<section>/<slug>/desktop/<id>.jpg` (poster)
  - `public/help-center/videos/<section>/<slug>/mobile/<id>.jpg` (poster)
  - `public/help-center/videos/<section>/<slug>/desktop/<id>.he.vtt` (captions, when produced)
  - `public/help-center/videos/<section>/<slug>/mobile/<id>.he.vtt` (captions, when produced)
- Future transcripts: stored either as a top-level `transcriptHe` field in the manifest entry, or as a sibling `<id>.he.txt` referenced by `transcriptPathHe` — both options are wire-compatible with `HelpVideoEmbed`'s existing `transcriptHe` prop; the manifest stays the single source of truth.

## 4. Capture method (Playwright-native; ffmpeg optional/gated)

Defaults — no new dependencies:

- Use Playwright's built-in recorder: `browser.newContext({ recordVideo: { dir, size: { width, height } } })`. This already ships with `playwright` (already in `devDependencies`). Output is `.webm`.
- Reuse existing helpers from `scripts/virtual-student-qa/lib/{config,parent-auth,student-auth}.mjs` (already used by [`scripts/help-center/capture-help-screenshots.mjs`](scripts/help-center/capture-help-screenshots.mjs)).
- New script `scripts/help-center/capture-help-videos.mjs` walks `data/help-center/videos-manifest.json`. For EACH entry, it runs TWO captures back-to-back — once at the desktop viewport and once at the mobile viewport — using the per-viewport `captureSteps` array:
  1. For each of `viewport ∈ ["desktop", "mobile"]`:
     a. Opens a fresh Playwright context with `viewport = { width: 1366, height: 900 }` (desktop) or `{ width: 390, height: 844 }` (mobile). For mobile, the context also enables `isMobile: true`, `hasTouch: true`, and a mobile user agent so the responsive UI renders its real mobile layout (NOT a desktop layout scaled down).
     b. Authenticates per `auth` field: `none` / `student` (`ADMIN` / `1234`) / `parent` (env-driven, same as screenshot capture).
     c. Navigates to `route`.
     d. Plays the deterministic `captureSteps[viewport]` (typed step recipes: `goto`, `click selector`, `type text`, `waitFor selector`, `hover`, `scroll`, `pause ms`, `highlight selector` — no free-form JS in the manifest). Mobile and desktop step arrays may differ to reflect the real mobile UX (hamburger nav, stacked layouts, swipe gestures simulated via Playwright touchscreen API where appropriate).
     e. Closes the context — Playwright finalizes the `.webm` under the matching `<viewport>/` subtree.
     f. Extracts a poster frame using Playwright's `page.screenshot()` at the planned step index (no ffmpeg needed).
  2. If EITHER viewport's capture fails, the agent records the failure for that viewport and continues; the failure will be surfaced by `internalReview` → publish gating → §11.2 blocker handling if it cannot be remediated within the continuous pass.
- Mouse cursor visibility: render a synthetic cursor overlay via `page.addStyleTag` + a small CSS-driven cursor sprite that follows `page.mouse.move` waypoints (Playwright does not screen-record the OS cursor inside the browser viewport). This is implemented inside `scripts/help-center/lib/cursor-overlay.mjs` (no new packages).
- Pacing controls (per capture step): explicit `pause ms`, `easeMoveMs`, and `dwellMs` knobs to avoid fast jumps. Default 600 ms pre-click dwell, 250 ms post-click dwell, 8 px/frame max cursor travel speed.

MP4 transcoding — DEFERRED (do not ask again during execution):

- Decision (fixed for this plan): ffmpeg is NOT approved. MP4 transcoding is DEFERRED to a future explicit plan update.
- During the first execution, the agent MUST NOT prompt about ffmpeg, MUST NOT install it, and MUST NOT produce MP4 files. All `mp4` fields in the manifest stay null/empty.
- The `HelpVideoEmbed` upgrade still ships dual-source support (so a future MP4 column can be backfilled as data only). With no MP4 files, the rendered `<video>` simply emits a single `<source ... type="video/webm">` and an `aria-label`; this is the intended steady state for the first execution.
- Documented (for the future plan update only — not actionable now): a helper `scripts/help-center/lib/transcode-webm-to-mp4.mjs` would later shell out to the system `ffmpeg` binary to produce H.264/AAC MP4 with `-movflags +faststart`, ~1.5 Mbps desktop, ~800 kbps mobile, max width 1366 / 720, silent (no audio track), 30 fps. This helper is NOT created in the first execution.

No other tools are introduced. No npm dependency is added in the first execution. ffmpeg, if it ever happens, is a system binary opted in by a future plan update — never an in-pass decision.

## 5. Demo/data safety rules (binding)

- Demo identity: same as screenshots phase — student `ADMIN` / PIN `1234`, visible child name `ישראל ישראלי`. No other student account may be recorded. Any plan-level change to the demo identity requires an explicit plan update.
- Parent login (when required) reuses the existing `E2E_PARENT_*` / `VIRTUAL_STUDENT_ACCOUNTS` env mechanism — never typed into the recording, never logged, never echoed.
- Base URL allowlist enforced in code (same guard as [`scripts/help-center/capture-help-screenshots.mjs`](scripts/help-center/capture-help-screenshots.mjs)): `localhost`, `127.0.0.1`, or `*.vercel.app` preview only. The script ABORTS otherwise. No override flag.
- `NODE_ENV === "production"` + non-localhost base URL → abort (defense in depth).
- Read-only flows only: no create/edit/delete actions against real data during a recording. The capture steps may interact with input fields (e.g. type "1234" into the PIN field) but must not submit destructive operations.
- Raw → internal review → publish (entirely inside the continuous pass; NO user approval checkpoint here; runs PER VIEWPORT for every article):
  1. Raw `.webm`/`.jpg` files land under `qa-evidence-audit/help-center/videos/<section>/<slug>/{desktop,mobile}/` and are git-ignored. Both viewports are reviewed.
  2. The agent performs an internal data-safety review pass (`scripts/help-center/video-data-safety-review.mjs`, mirroring `data-safety-review.mjs`) that inspects every clip's step-context snapshots (URL bar, visible page text, parent dashboard regions, copilot transcript, etc.) for unexpected real data (real names, real emails, real photos, real phone numbers). The review runs independently for the desktop clip and the mobile clip and writes its results into the manifest as `internalReview: { desktop: { status, reason }, mobile: { status, reason } }`.
  3. Only viewports with `internalReview.<viewport>.status === "passed"` are eligible for publish. Excluded viewports are recorded in the final report (per §11.3) with their reason and are never copied to `public/`.
  4. The publish step copies ONLY clips with `internalReview.<viewport>.status === "passed"` from `qa-evidence-audit/` to `public/help-center/videos/<section>/<slug>/<viewport>/`. Files not in the manifest are never copied. Files marked excluded are never copied.
  5. If exclusions prevent reaching the 42-article × 2-viewport = 84-asset coverage target (e.g. an article's mobile clip fails review and no remediation succeeds), that is a blocker per §11.2 — the agent stops and reports rather than silently shipping only one viewport.
- The user does NOT review individual clips during the pass. The user reviews the final implementation report (§11.3) and the file tree AFTER the continuous pass ends with the working tree dirty.
- No production main domain capture. No real parent PII in any published video. No real student names other than `ישראל ישראלי`. No external trackers, analytics, or 3rd-party hosting — all assets are self-hosted under `/public`.

## 6. Video quality standards (per-viewport caps; both viewports are mandatory)

Duration (per viewport; both waves run in the same pass — Wave A / B are internal sequencing only):

- Wave A desktop: target 30–60 s, hard cap 90 s.
- Wave A mobile:  target 30–60 s, hard cap 90 s.
- Wave B desktop: target 20–45 s, hard cap 60 s.
- Wave B mobile:  target 20–45 s, hard cap 60 s.
- Manifest-level `durationSecTarget: { desktop, mobile }` is a guideline; the capture pipeline enforces the hard cap by truncation + flagging. A clip that truncates is auto-flagged for §11.2 blocker handling if truncation removes content needed to teach the flow.

File-size caps (per viewport):

- Desktop WebM ≤ 8 MB.
- Mobile WebM  ≤ 4 MB.
- Desktop MP4 ≤ 6 MB (NOT produced in the first execution — DEFERRED per §0/§4).
- Mobile MP4  ≤ 3 MB (NOT produced in the first execution — DEFERRED per §0/§4).
- Desktop poster JPG ≤ 120 KB.
- Mobile poster JPG  ≤ 80 KB.
- Desktop VTT captions ≤ 16 KB (when produced).
- Mobile VTT captions  ≤ 16 KB (when produced).

Resolution / encoding:

- Desktop source: 1366×900, downscaled to 1280×800 for delivery. `deviceScaleFactor: 1`.
- Mobile source: 390×844, kept at native delivery resolution. `deviceScaleFactor: 1`, `isMobile: true`, `hasTouch: true`, mobile user agent. The mobile clip MUST show the REAL responsive mobile layout — no CSS-zoomed "fake mobile" rendering.
- Frame rate: 30 fps capture, 30 fps delivery, for both viewports. No motion smoothing.

Cursor / pacing (same standards both viewports, with one mobile-specific note):

- Cursor visibility: synthetic overlay cursor at 24×24 px on desktop, 32×32 px on mobile (so it remains legible on small viewports), with 60% black shadow, visible on dark gradient backgrounds. Click ripple ≤ 350 ms.
- On mobile, taps are visualized via a 40 px ripple at the touch point (no persistent cursor between taps, matching real mobile UX).
- Pacing: 600 ms pre-click/tap dwell, 250 ms post-click/tap dwell, no jump > 1 step per second. No "instant" clicks. Mobile pacing may add an extra 150 ms before scroll gestures to keep transitions readable.

Playback / loading (per `HelpVideoEmbed`):

- Autoplay: OFF for every embed, both viewports.
- Lazy load: `<video>` mounted only when inside ~200 px of viewport via `IntersectionObserver`. `preload="metadata"` on mount. Poster shown until user hits play. Only ONE viewport's source is loaded at a time, based on `matchMedia("(max-width: 640px)")`.

Captions / transcript readiness:

- Every manifest entry has an explicit `captionsHe` field per viewport and a single `transcriptHe` field for the article. All may be `null` in the first execution; the verify script flags but does not fail when null (only fails if a declared `*.vtt` path is missing on disk).

Accessibility (binding for both viewports):

- `<video>` always has an `aria-label` in Hebrew.
- Captions, when present, are `<track kind="captions" srcLang="he" default>` (default ON).
- Respects `prefers-reduced-motion` (no synthetic motion on the poster, no autoplay).
- Mobile clip controls remain reachable by keyboard and touch on 390×844 (verified manually per `docs/help-center/VIDEO-MANUAL-QA.md`).

## 7. Future narration / captions readiness

Even though the first execution ships without narration, the design supports adding it later without reworking the Help Center:

- Hebrew captions: `<id>.he.vtt` next to each clip; `HelpVideoEmbed` already renders `<track kind="captions" srcLang="he" default>`. Adding captions is data-only.
- Transcript: `transcriptHe` already supported by `HelpVideoEmbed` (renders inside a `<details>` accordion). Authors fill the manifest field; no code change needed.
- Voiceover track (future): add an `audioHe` field per manifest entry pointing to a sibling `.mp3`/`.m4a`. `HelpVideoEmbed` can later muxing-or-attach as a sibling `<audio>` synced to the video, or — preferred — captures can be re-encoded with the audio track merged in (ffmpeg). The published video still ships muted by default; a small "הפעלת הסבר קולי" toggle in `HelpVideoEmbed` (planned, not implemented now) unmutes. All of this is additive to the manifest; no article rewrites.
- Audio description (future): a parallel `audioDescriptionHe` field for users who need it; `<track kind="descriptions">` is recognized by browsers and is wire-compatible with the current component shape.
- Localization (future, out of current scope): the manifest already segregates `captionsHe`, `transcriptHe`, etc. by language suffix, so adding `captionsEn` etc. later is purely additive.

## 8. Verification & checks

A new `scripts/help-center/verify-videos.mjs` (`npm run help:verify-videos`) asserts (per-viewport):

- Manifest has exactly 42 entries; each entry's `viewports` equals `["desktop", "mobile"]`.
- Every entry's `assets.desktop.webm` and `assets.mobile.webm` are non-null path strings that resolve to real files under `public/help-center/videos/<section>/<slug>/{desktop,mobile}/`.
- Every entry's `assets.desktop.poster` and `assets.mobile.poster` are non-null path strings that resolve to real files.
- Every entry's `assets.desktop.mp4` and `assets.mobile.mp4` are exactly `null` (MP4 DEFERRED per §0/§4). Any non-null MP4 field causes verify to fail.
- Every caption file exists when an entry has `captionsHe` non-null for a given viewport and is valid WebVTT (header `WEBVTT`, Hebrew payload).
- Total counts: exactly 42 desktop `.webm`, 42 mobile `.webm`, 42 desktop `.jpg` posters, 42 mobile `.jpg` posters under `public/help-center/videos/`.
- No manifest entry declares `autoplay: true` (defensive — autoplay is not a manifest field, but `HelpVideoEmbed` is asserted in code to never set autoplay).
- No `<video>` rendered above the fold has `preload="auto"` (only `metadata`).
- File sizes are within §6 per-viewport caps; warnings (not failures) for entries near the cap; failures for entries over the cap.
- No file under `public/help-center/videos/` is missing from the manifest (orphan check, per-viewport).
- Build: `next build` succeeds; SSR of every `/help/**` route returns 200 with the (lazy) `<video>` markup intact.
- Mobile layout check (manual, documented in `docs/help-center/VIDEO-MANUAL-QA.md`): no horizontal scroll at 390×844 when a video block is rendered, controls reachable by keyboard and touch, mobile poster visible, RTL alignment preserved. Desktop poster visible at 1366×900.
- Internal data-safety check (`scripts/help-center/video-data-safety-review.mjs`): every manifest entry's `internalReview.desktop.status` AND `internalReview.mobile.status` are both `passed` before publish; any excluded viewport is recorded in the final report (§11.3); raw `qa-evidence-audit/` files never appear in `public/`. This is an internal step inside the continuous pass; it is NOT a user approval checkpoint.
- Production safety: a grep guard in the verify script flags any video filename containing real PII patterns; refuses publish if hits.

A consolidated `npm run help:videos` would chain: `help:build-video-manifest && help:capture-videos && help:video-data-safety-review && help:publish-videos && help:verify-videos`, mirroring the existing `help:screenshots` chain.

## 9. Whitelist — allowed file changes for the future implementation phase

Strict whitelist (no other paths may be modified). Any change outside this list is a hard error and must trigger a stop+report.

- Create freely:
  - `data/help-center/videos-manifest.json`
  - `public/help-center/videos/**`
  - `scripts/help-center/capture-help-videos.mjs`
  - `scripts/help-center/build-videos-manifest.mjs`
  - `scripts/help-center/publish-videos.mjs`
  - `scripts/help-center/verify-videos.mjs`
  - `scripts/help-center/video-data-safety-review.mjs`
  - `scripts/help-center/lib/cursor-overlay.mjs`
  - `scripts/help-center/lib/transcode-webm-to-mp4.mjs` (DEFERRED — not created in the first execution; listed here so a future plan update that opts in to ffmpeg can land it without re-opening the whitelist)
  - `docs/help-center/VIDEO-TUTORIALS-PLAN.md`
  - `docs/help-center/VIDEO-MANUAL-QA.md`
  - `docs/help-center/VIDEO-SIGNOFF.md`
- Narrow, additive edits only:
  - [`components/help/HelpVideoEmbed.js`](components/help/HelpVideoEmbed.js) — accept `sourcesByViewport: { desktop, mobile }` (with `{ webm, mp4, poster, captionsHe }` per viewport), pick the matching viewport at runtime via `matchMedia("(max-width: 640px)")`, render `<source>` tag(s) for the selected viewport (MP4 first when present, then WebM), add IntersectionObserver-based lazy mount, keep existing API back-compat (a single `src` prop alone continues to work).
  - [`data/help-center/articleHelpers.js`](data/help-center/articleHelpers.js) — add a `videoBlock(section, slug, id?)` helper that reads `videos-manifest.json` (at module load) and emits the video block. No other change.
  - `data/help-center/content/{parents,students,parent-report,subjects}.js` — ONLY to insert one `videoBlock(...)` call into each article that gets a video. No text changes, no schema changes.
  - `.gitignore` — add `qa-evidence-audit/help-center/videos/`.
  - [`package.json`](package.json) — add `help:capture-videos`, `help:build-video-manifest`, `help:publish-videos`, `help:video-data-safety-review`, `help:verify-videos`, `help:videos`. No new dependencies. (`ffmpeg` is a system binary, not an npm dep, and is DEFERRED — see §0/§4.)
- Forbidden (must not change):
  - Any product logic: parent/student/learning/parent-report/parent-copilot/arcade/offline/auth/API/Supabase.
  - Any existing Hebrew UI text outside the Help Center.
  - Any existing screenshot data, manifest, or `public/help-center/screenshots/**` content.
  - Any non-Help-Center file under `components/**`, `pages/**`, `utils/**`, `lib/**`, `hooks/**`.

## 10. Acceptance criteria (final completion bar for the future implementation)

> Acceptance criteria must all hold at the END of the continuous implementation pass (per §11.1). They are NOT mid-pass approval gates. The pass either reaches all of these in one go or stops via blocker handling (§11.2) — there is no partial ship.

- Coverage (full 42-article × 2-viewport = 84-asset target):
  - `data/help-center/videos-manifest.json` exists, is valid JSON, and contains exactly 42 entries — one per existing Help Center article. Wave A (20) and Wave B (22) are both present in the SAME pass.
  - Every entry declares `section`, `slug`, `audience`, `viewports`, `wave`, `durationSecTarget` (object with `desktop` and `mobile`), `auth`, `route`, `captureSteps` (object with `desktop` and `mobile`), `assets` (object with `desktop` and `mobile`), `internalReview` (object with `desktop` and `mobile`).
  - Every entry's `viewports` field equals `["desktop", "mobile"]`. No entry omits a viewport.
  - Every article in `data/help-center/content/{parents,students,parent-report,subjects}.js` that the inventory in §1 marks for video has one `videoBlock(...)` call inserted; the rendered block carries BOTH viewport sources.
- Files exist (per viewport, mandatory):
  - All 42 desktop WebM files exist under `public/help-center/videos/<section>/<slug>/desktop/<id>.webm`.
  - All 42 mobile WebM files exist under `public/help-center/videos/<section>/<slug>/mobile/<id>.webm`.
  - Total WebM assets under `public/help-center/videos/` = 84.
  - All 42 desktop poster JPGs exist; all 42 mobile poster JPGs exist; total posters = 84.
  - All `assets.desktop.mp4` and `assets.mobile.mp4` fields are `null`/empty (MP4 is DEFERRED per §0/§4). NO MP4 files are present under `public/help-center/videos/`.
  - Every non-null `captionsHe` (per viewport) resolves; `captionsHe` may be `null` per viewport in the first execution.
- Internal data-safety review (entirely internal to the agent during the pass; per viewport):
  - For every manifest entry: `internalReview.desktop.status === "passed"` AND `internalReview.mobile.status === "passed"`.
  - Any viewport with `internalReview.<viewport>.status === "excluded"` is recorded in the final report (§11.3) with its reason and is NOT under `public/`.
  - If exclusions break full 42 × 2 = 84-asset coverage, the pass ended with a blocker (§11.2) — not a partial deliverable. Shipping only one viewport for any article is forbidden.
- Capture safety:
  - Capture run logs prove base URL was `localhost` / `127.0.0.1` / `*.vercel.app`. Never the production main domain. Applies to both viewports.
  - Demo student identity matches `ADMIN` / `1234` / visible name `ישראל ישראלי` in every relevant clip (both viewports).
  - Mobile clips show the REAL mobile responsive layout, not a CSS-zoomed desktop layout (verified manually per `docs/help-center/VIDEO-MANUAL-QA.md`).
  - No real parent PII (real name, real email, real phone, real photo) appears in any file under `public/help-center/videos/` (either viewport).
- Rendering:
  - At every `/help/**` article that has a video, the page renders a `<video controls preload="metadata" playsInline>` whose `<source>` URL matches the active viewport (`matchMedia("(max-width: 640px)")` decides desktop vs mobile), captions track default when present, transcript `<details>` when transcript is set, and an `aria-label` in Hebrew.
  - No autoplay anywhere. No video downloads on article entry (network panel shows zero `.webm` requests until the user scrolls within the lazy threshold or hits play). At any moment, only ONE viewport's asset is loaded.
  - No horizontal scroll at 390×844 on any article with a video. RTL alignment preserved at both viewports.
- Build & verification:
  - `npm run help:verify-videos` exits 0 (asserts 42 entries × 2 viewports = 84 assets + 84 posters present).
  - `next build` succeeds.
  - `npm run help:verify` (screenshots, unchanged) still exits 0.
  - No existing test/QA script that was green on `main` is now red.
- Diff scope:
  - `git diff` is bounded by §9 whitelist. Any change outside it blocks the pass and triggers §11.2.
- No commit, no push:
  - The working tree is left dirty for user review. `git log` shows no new commits from the pass. No remote-mutating commands (`git push`, `git tag`, etc.) were executed.

## 11. Prerequisites, execution policy, blocker handling, final report

### 11.1 Execution approval policy

- This plan is plan-only now. Execution may begin only after BOTH of the following are true:
  1. The current Help Center screenshot phase is fully complete: the demo student `ADMIN` / `1234` / visible child `ישראל ישראלי` works end-to-end, learning data exists across all six subjects, `npm run help:screenshots` has run successfully against `localhost` or a `*.vercel.app` preview, and `npm run help:verify` exits 0. Without this, video capture for parent-report and subject flows cannot produce realistic footage.
  2. A SINGLE final manual user approval is given for this plan, AFTER the corrections in this update are accepted.
- Once final manual approval is given, the implementation runs from start to finish in ONE continuous pass. No further approval is requested during the pass.
- The agent MUST NOT stop after Wave A.
- The agent MUST NOT stop before Wave B.
- The agent MUST NOT stop between desktop captures and mobile captures — both viewports of every article are produced within the same pass.
- The agent MUST NOT publish only one viewport for any article — both desktop and mobile must reach `internalReview.<viewport>.status === "passed"` before either is published.
- The agent MUST NOT stop before internal data-safety review (both viewports).
- The agent MUST NOT stop before publish.
- The agent MUST NOT stop before verify (`help:verify-videos` + `next build`).
- The agent MUST NOT stop before writing the final implementation report (§11.3).
- The agent MUST NOT prompt about ffmpeg, MP4 transcoding, single-viewport fallbacks, or any other decision that is not explicitly written in this plan.
- The ONLY allowed stop condition during the pass is blocker handling (§11.2).
- The agent MUST NOT commit and MUST NOT push under any circumstances. The working tree is left dirty for user review.
- The user's review happens AFTER the pass ends, against the final implementation report and the file tree.

### 11.2 Blocker handling

A blocker is the ONLY condition under which the agent may stop before completing the full pass and writing the final report. A blocker exists when, and only when, the agent cannot continue safely within this plan's whitelist and rules. Examples:

- The base URL guard refuses the configured target (e.g. someone pointed it at production).
- A required path is outside the §9 whitelist and cannot be avoided.
- The demo student `ADMIN` / `1234` cannot authenticate against the chosen base URL.
- A required env var (parent login) is missing AND a parent-authenticated capture is required for an article on the §1 list.
- Internal data-safety review excludes a clip whose article has no other candidate path, breaking the 42-article × 2-viewport = 84-asset coverage target.
- A specific viewport (desktop OR mobile) cannot be captured for an article — either the responsive layout breaks, the mobile flow has no recoverable step recipe, or the desktop flow fails — and cannot be fixed inside the continuous pass. Shipping the other viewport alone is forbidden.
- `npm run help:verify-videos` or `next build` fails for a reason that cannot be fixed inside the whitelist.
- Wave B cannot be completed inside the same pass (this is explicitly a blocker, not a partial deliverable).

On a blocker, the agent stops AND returns a blocker report containing exactly:

- what was completed (sections, scripts, manifest entries, raw clips per viewport, published clips per viewport);
- what failed (the exact step / command / file / viewport);
- root cause (not just the surface error);
- files changed (full path list, each marked created / modified / deleted, grouped by the §9 whitelist buckets);
- commands run with exit codes (verbatim; PINs / passwords / tokens MUST NOT appear);
- skipped items and why (e.g. "MP4 transcoding skipped — DEFERRED by §0/§4"; "mobile clip for parents/parent-copilot skipped — responsive layout regression cannot be reproduced reliably inside the pass");
- whether any raw video files were created (and where) and whether any published video files were created (and where) — both with full path lists AND a per-viewport count (desktop raw, mobile raw, desktop published, mobile published);
- confirmation that NO commit and NO push were executed and that `git status` shows the change set uncommitted.

The agent MUST NOT relax guardrails, MUST NOT silently work around blockers, MUST NOT ship Wave A only, MUST NOT ship a single viewport for any article, and MUST NOT commit/push during or after a blocker.

### 11.3 Final implementation report

When the continuous pass completes successfully (no blocker), the agent returns ONE final implementation report. The report MUST include each of the following sections, even if a section is empty:

- Files changed — full path list, each marked created / modified / deleted, grouped by the §9 whitelist buckets. Any path outside the whitelist is a hard error and must instead have triggered §11.2.
- Video inventory completed — Wave A count (target 20 articles), Wave B count (target 22 articles), total articles covered (target 42). Counts MUST equal the targets unless a blocker was reported.
- Per-viewport asset counts:
  - Desktop WebM count (target 42).
  - Mobile WebM count (target 42).
  - Total WebM video assets (target 84).
  - Desktop poster count (target 42).
  - Mobile poster count (target 42).
  - Total posters (target 84).
- Article-to-video mapping — per section (parents / students / parent-report / subjects): the list of article slugs, the manifest entry id(s) each maps to, AND a per-article confirmation row showing `desktop: ✓` and `mobile: ✓` (or the explicit failure reason if either viewport was excluded — which by definition would have triggered §11.2).
- Raw video counts — number of `.webm` files now under `qa-evidence-audit/help-center/videos/`, grouped by section AND by viewport (`<section>/<viewport>` counts).
- Published video counts — number of `.webm` files now under `public/help-center/videos/`, grouped by section AND by viewport.
- Manifest entries — total count (target 42), plus per-section counts; explicit list of any entry where `internalReview.desktop.status !== "passed"` OR `internalReview.mobile.status !== "passed"` and why (which, if present, must have been a blocker per §11.2).
- Captions / transcript status — per entry: whether `captionsHe` is set for each viewport, whether a `.vtt` file exists for each viewport, whether `transcriptHe` is set for the article. (All may legitimately be null in the first execution; the report still enumerates them.)
- Commands run and exit codes — verbatim list of every shell command executed (e.g. `npm run help:build-video-manifest`, `npm run help:capture-videos`, `npm run help:video-data-safety-review`, `npm run help:publish-videos`, `npm run help:verify-videos`, `npx next build`), each with its exit code. PINs / passwords / tokens MUST NOT appear.
- Skipped videos / checks and why — explicit, with the affected viewport when applicable. Examples: "MP4 transcoding skipped (desktop + mobile) — DEFERRED by §0/§4; ffmpeg not installed and not approved." A skipped item without an explicit reason is a violation of this plan. A skipped viewport that breaks coverage must have triggered §11.2.
- Data-safety review result — total clips reviewed (desktop + mobile), per-viewport `passed` count, per-viewport `excluded` count, list of excluded clips with reasons and viewport. Confirmation that the user did NOT review individual clips during the pass.
- Confirmation that no production capture occurred — exact base URL used (single value applied to both viewports), with confirmation it was `localhost` / `127.0.0.1` / a specific `*.vercel.app` preview, and that the script guard would have aborted any other host.
- Confirmation that no private / real data was published — including: (a) every published clip's demo student is `ADMIN` / `1234` / `ישראל ישראלי` (both viewports); (b) the internal data-safety review pass excluded any clip surfacing unexpected real data; (c) no parent PII (real name, real email, real photo, real phone) appears in any file under `public/help-center/videos/`; (d) mobile clips show real responsive layout (not zoomed desktop).
- Confirmation that no product logic was changed — `git diff` outside §9 whitelist is empty; existing `npm run help:verify` still exits 0; no existing Hebrew UI text outside the Help Center was changed; no auth / parent / student / learning / parent-report / parent-copilot / arcade / offline / API / Supabase logic was touched.
- Confirmation that there was no commit and no push — explicit statement that `git status` shows the change set uncommitted and that no `git commit`, `git push`, `git tag`, or remote-mutating command was executed during the pass.

The user reviews this report and the file tree AFTER the pass ends. There is no in-pass user approval.

## 12. Risks & open notes (non-blocking, informational)

- Playwright's recorder produces variable-bitrate WebM. With MP4 DEFERRED, Safari < 14.1 and some older iOS WebKit builds will not play the inline `<video>` — including the mobile clip on those iOS versions. Posters still render; captions remain readable in any modern browser. Re-opening MP4 requires a future explicit plan update — not an in-pass decision.
- The synthetic cursor overlay (desktop) and tap-ripple overlay (mobile) are good enough for clean tutorial demos but are not pixel-identical to a real OS cursor or finger. Acceptable for the first execution; surfaced here so expectations are aligned.
- Recording every article twice (desktop + mobile) roughly doubles total capture time, data-safety review time, and total raw artifact size compared to a single-viewport plan. The agent budgets this inside the same continuous pass; it remains internal and is not a user checkpoint.
- The internal data-safety review for video is more expensive than for screenshots (it inspects step-context snapshots). The agent budgets time for it inside the continuous pass; it remains internal to the pass and is not a user checkpoint.
- Wave A and Wave B are INTERNAL sequencing only. They share a single manifest, a single capture/publish/verify run, a single final report, and a single user review afterwards. Failure to complete Wave B inside the same pass is a blocker per §11.2 — not a smaller deliverable.