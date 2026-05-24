# Video Tutorials — Final Signoff (Help Center Integration)

- **Status:** **Technical closure** — publish + compact preview/modal UX accepted as technical pass
- **Owner final approval:** **Not requested in this step** — this document closes the integration track for engineering handoff
- **Date:** 2026-05-24
- **Scope:** 13 published workflow videos (Parent #1, #3–#6; SL1–SL8). Parent **#2** deferred. **SL9** not published.

---

## 1. Final video UX

| Requirement | State |
|-------------|--------|
| Compact preview card in article (poster + play affordance) | **Done** — `components/help/HelpVideoEmbed.js` |
| Modal opens on click/tap | **Done** — `role="dialog"`, backdrop click + Escape close |
| Close button always visible | **Done** — header **סגור** (min 44×44px) |
| No autoplay before click | **Done** — `<video>` only mounted in modal after user action |
| No unwanted fullscreen | **Done** — `playsInline`, `controlsList="nofullscreen"`; QA: no `document.fullscreenElement` during play |
| Desktop/mobile source switching | **Done** — `matchMedia("(max-width: 640px)")` selects manifest desktop/mobile WebM |
| Preview before screenshots | **Done** — article block order: intro → `videoBlock` → `screenshotBlock`(s) |
| Approved Hebrew label only | **צפו בסרטון הדרכה** on preview; **סגור** in modal (embed component only) |

**UX mode name:** `compact-preview-modal` (see [VIDEO_TUTORIALS_PUBLISH_QA_REPORT.md](./VIDEO_TUTORIALS_PUBLISH_QA_REPORT.md)).

---

## 2. Published videos

### Active manifest entries (`assetKind: "captured"`)

| # | Workflow | Manifest id | Primary article |
|---|----------|-------------|-----------------|
| #1 | כניסה לדוח ושימוש ב-AI | `parent-report/report-overview/main` | `/help/parent-report/report-overview` |
| #3 | הוספת ילד | `parents/add-students/main` | `/help/parents/add-students` |
| #4 | כניסת תלמיד | `students/student-login/main` | `/help/students/student-login` |
| #5 | קריאת דוח | `parents/how-to-read-report/main` | `/help/parents/how-to-read-report` |
| #6 | Copilot | `parents/parent-copilot/main` | `/help/parents/parent-copilot` |
| SL1 | עמוד הבית | `students/student-home-tour/main` | `/help/students/student-home-tour` |
| SL2 | התחלת תרגול | `students/choose-subject-and-grade/main` | `/help/students/choose-subject-and-grade` |
| SL3 | חשבון הסבר | `subjects/math/main` | `/help/subjects/math` |
| SL4 | גאומטריה הסבר | `subjects/geometry/main` | `/help/subjects/geometry` |
| SL5 | טעות בשאלה | `students/hints-and-explanations/main` | `/help/students/hints-and-explanations` |
| SL6 | רצף והתקדמות | `students/answering-questions/main` | `/help/students/answering-questions` |
| SL7 | משימות/מסע | `students/daily-missions/main` | `/help/students/daily-missions` |
| SL8 | ארקייד | `students/coins-and-arcade/main` | `/help/students/coins-and-arcade` |

**Counts**

| Asset | Count |
|-------|-------|
| Active video entries | **13** |
| WebM files in `public/help-center/videos/` | **26** (desktop + mobile) |
| Poster JPG files | **26** |
| Manifest entries remaining `placeholder` | **29** (42-article scaffold) |

### Not published

| Item | Reason |
|------|--------|
| **Parent #2** — רישום הורה | **Deferred** — true signup blocked; no WebM; manifest `parents/create-parent-account` stays `placeholder` |
| **SL9** — סקירת מקצועות | **Held** — no clean primary article slot; raw captures remain in `qa-evidence-audit/student-video-pilot/subjects-overview/` only |

**Audit sources (not served from `public/`):**

- Parent pilots: `qa-evidence-audit/parent-video-pilot/`
- Student pilots: `qa-evidence-audit/student-video-pilot/`

---

## 3. Verification

| Check | Result | When |
|-------|--------|------|
| `npm run help:verify-videos` | **PASS** — 13 captured, 29 dormant; 26 webm + 26 posters in `public/` | 2026-05-24 (closure) |
| Modal playback QA | **28/28 PASS** (26 primary + 2 negative) | 2026-05-24 |
| Primary pages (13 × desktop + mobile) | **26/26 PASS** | Playwright — `scripts/help-center/playback-qa-publish-wave.mjs` |
| Negative: `/help/parents/create-parent-account` | **PASS** — no video/preview | Same runner |
| Negative: `/help/parent-report/subjects-overview` | **PASS** — no published tutorial video | Same runner |
| `npm run build` | **PASS** (exit 0) | 2026-05-24 (after modal UX) |

**Evidence**

- [qa-evidence-audit/help-center-video-playback-qa/results.json](../../qa-evidence-audit/help-center-video-playback-qa/results.json) — `uxMode: "compact-preview-modal"`
- [VIDEO_TUTORIALS_PUBLISH_QA_REPORT.md](./VIDEO_TUTORIALS_PUBLISH_QA_REPORT.md)

**Build note:** Pre-existing webpack warning on `question-metadata-scanner.js` (adaptive planner API) — **unrelated** to Help Center videos.

---

## 4. Files changed (integration track)

Grouped by area. Includes work across capture, publish, UX, and QA phases.

### Docs

| File | Role |
|------|------|
| `docs/help-center/VIDEO_TUTORIALS_MASTER_PLAN.md` | Parent workflow plan + integration map |
| `docs/help-center/VIDEO_TUTORIALS_CURRENT_STATUS.md` | Status during capture waves |
| `docs/help-center/VIDEO_TUTORIALS_VISUAL_REVIEW_INDEX.md` | Owner visual review index |
| `docs/help-center/VIDEO_TUTORIALS_INTEGRATION_RECOMMENDATION.md` | Embed placement recommendations |
| `docs/help-center/VIDEO_TUTORIALS_PUBLISH_QA_REPORT.md` | Publish + modal UX QA |
| `docs/help-center/VIDEO_TUTORIALS_FINAL_SIGNOFF.md` | **This closure document** |
| `docs/help-center/STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md` | Student SL1–SL9 plan (if present in repo) |

### Components

| File | Role |
|------|------|
| `components/help/HelpVideoEmbed.js` | Compact preview + modal player (final UX) |

### Scripts

| File | Role |
|------|------|
| `scripts/help-center/publish-workflow-videos-wave.mjs` | Copy audit WebMs → `public/`, posters, manifest flip |
| `scripts/help-center/playback-qa-publish-wave.mjs` | Playwright playback QA (modal UX) |
| `scripts/help-center/smoke-help-videos-wave.mjs` | SSR `videoBlock` smoke (optional) |
| `qa-evidence-audit/build-video-review-summary.mjs` | Review summary generator |
| `scripts/student-video-pilot/**` | Student capture wave (SL1–SL9) |
| `scripts/parent-video-pilot/**` | Parent capture pilots |

### Manifest / data

| File | Role |
|------|------|
| `data/help-center/videos-manifest.json` | 13 entries `assetKind: "captured"`; 29 `placeholder` |
| `data/help-center/articleHelpers.js` | `videoBlock()` — unchanged contract |

### Article files (block reorder only — no Hebrew body edits)

| File | Articles touched |
|------|------------------|
| `data/help-center/content/parent-report.js` | `report-overview` |
| `data/help-center/content/parents.js` | `add-students`, `how-to-read-report`, `parent-copilot` |
| `data/help-center/content/students.js` | `student-login`, `student-home-tour`, `choose-subject-and-grade`, `answering-questions`, `daily-missions`, `coins-and-arcade`, `hints-and-explanations` (order only) |
| `data/help-center/content/subjects.js` | `math`, `geometry` (+ shared template order for other subjects) |

### Public video assets

`public/help-center/videos/<section>/<slug>/{desktop,mobile}/main.webm` and `main.jpg` — **52 files** for 13 workflows.

### QA evidence

| Path | Role |
|------|------|
| `qa-evidence-audit/parent-video-pilot/**` | Parent capture WebMs + meta |
| `qa-evidence-audit/student-video-pilot/**` | Student capture WebMs + meta (incl. SL9 audit-only) |
| `qa-evidence-audit/video-tutorials-review-summary.json` | Machine-readable review inventory |
| `qa-evidence-audit/help-center-video-playback-qa/results.json` | Modal playback QA results |

---

## 5. Safety confirmations

| Rule | Confirmed |
|------|-----------|
| Screenshots not touched / not deleted | **Yes** |
| Hebrew article copy not changed | **Yes** — only embed labels **צפו בסרטון הדרכה** / **סגור** |
| Secondary `relatedLinks` not added | **Yes** |
| Product / legal / security files not changed | **Yes** |
| Git commit | **No** (closure step) |
| Git push | **No** |

---

## 6. Remaining future items

| Item | Notes |
|------|--------|
| **Parent #2** signup video | Retry when dev/Supabase signup reaches dashboard reliably in preflight; do not fake signup footage |
| **SL9** subjects overview | Decide new article slug or placement; publish from `qa-evidence-audit/student-video-pilot/subjects-overview/` when approved |
| **Secondary related links** | Optional later wave — Hebrew link labels need owner copy approval ([INTEGRATION_RECOMMENDATION](./VIDEO_TUTORIALS_INTEGRATION_RECOMMENDATION.md) §3) |
| **42-plan placeholder entries** | 27 manifest slots still `placeholder` with no workflow capture — separate cleanup or future captures |
| **Owner product sign-off** | Distinct from this technical closure — content accuracy, Copilot tone on video, etc. |

---

## Quick reference commands

```bash
npm run help:verify-videos
node scripts/help-center/playback-qa-publish-wave.mjs
npm run build
```

Dev server: `npm run dev` → http://localhost:3001

---

## Related plans (historical)

- [.cursor/plans/video_tutorials_master_plan_doc_24894053.plan.md](../../.cursor/plans/video_tutorials_master_plan_doc_24894053.plan.md)
- [STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md](./STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md) (if tracked)

**End of Help Center video integration track (technical).**
