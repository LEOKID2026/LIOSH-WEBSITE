---
name: video tutorials master plan doc
overview: Create a single written master-plan markdown file at docs/help-center/VIDEO_TUTORIALS_MASTER_PLAN.md that codifies the small parent-tutorial video set (Part A) and maps each video to the real Help Center articles (Part B) without capturing, publishing, wiring, or touching any other files.
todos:
  - id: create-plan-doc
    content: Create docs/help-center/VIDEO_TUTORIALS_MASTER_PLAN.md with Part A (6 workflow entries, desktop+mobile fields, statuses) and Part B (integration map using verified slugs, primary/secondary mapping, placement, public path conventions, prereqs).
    status: completed
  - id: return-summary
    content: After file creation, return path, Part A summary, Part B summary, confirmation of no missing slugs, and the three open decisions for user approval before any further capture.
    status: completed
isProject: false
---

## Scope

- One markdown file only: `docs/help-center/VIDEO_TUTORIALS_MASTER_PLAN.md`.
- No captures, no publish, no manifest/article wiring, no screenshot work, no product/legal/security edits, no commit, no push.
- Article slugs cited below were verified directly from [data/help-center/content/parents.js](data/help-center/content/parents.js), [data/help-center/content/parent-report.js](data/help-center/content/parent-report.js), and [data/help-center/content/students.js](data/help-center/content/students.js). Embed helper is [data/help-center/articleHelpers.js](data/help-center/articleHelpers.js) (`videoBlock(section, slug)` only renders when `assetKind: "captured"`).

## File to create

Path: `docs/help-center/VIDEO_TUTORIALS_MASTER_PLAN.md`

Top-of-file front matter:
- Title: `Video Tutorials Master Plan (Parent Workflows)`
- Status: `DRAFT — capture in progress; nothing published`
- Last updated: today
- Scope rules block: not 42 videos, 4–8 max, every workflow needs desktop + mobile, no `public/` publish yet, no Help Center wiring yet.

## Part A — Video production plan (per workflow)

Table-of-contents row order: 1–6 as below. Each entry uses this fixed schema (header + bullets):

- Title (Hebrew)
- Goal
- Desktop version status
- Mobile version status
- Expected duration (desktop / mobile)
- Data writes (yes/no, what)
- QA/demo account needed
- Risks / blockers
- Current status: `planned | desktop approved | mobile approved | complete`
- Mobile addendum: same-or-adjusted storyboard, mobile risks, expected mobile duration, mobile capture deltas (selectors / scroll rules / viewport)

Concrete content for each row:

1. `מדריך להורה — כניסה לדוח ושימוש ב-AI`
   - Desktop: APPROVED (`qa-evidence-audit/parent-video-pilot/parent-report-ai/desktop/main.webm`, ~66 s, 528 frames @ 8 fps).
   - Mobile: planned, not captured.
   - Duration: desktop 60–75 s; mobile 70–90 s.
   - Data writes: no.
   - Account: `E2E_PARENT_*` + child `ישראל ישראלי`; `npm run help:seed-demo-report` if empty; capture-only Bearer route for `/api/parent/copilot-turn`.
   - Risks: empty report; Copilot 401 without Bearer; dashboard clutter (other QA children); policy gate.
   - Status: `desktop approved` (workflow not complete).
   - Mobile addendum: adjusted (scroll to child card, scroll to Copilot, period=week in URL); viewport ~390×844.

2. `רישום הורה וכניסה ראשונה`
   - Desktop + mobile: planned.
   - Duration: 65–85 s / 70–90 s.
   - Data writes: yes (Auth user + `parent_profiles` + policy acceptance row).
   - Account: disposable signup email per run, NOT shared `E2E_PARENT_*`.
   - Risks: duplicate email, Supabase email confirmation, policy panel height, email visibility.
   - Status: `planned`.
   - Mobile addendum: policy panel full-page, tab stack vertical; same storyboard with scroll-only adjustment.

3. `הוספת ילד וקבלת קוד תלמיד`
   - Desktop + mobile: planned.
   - Duration: 60–80 s / 65–85 s.
   - Data writes: yes (`POST /api/parent/create-student`, `POST /api/parent/create-student-access-code`).
   - Account: isolated capture parent (0–1 children); MUST NOT mutate `ישראל ישראלי` credentials.
   - Risks: student limit, dashboard clutter, accidental overwrite of demo child PIN.
   - Status: `planned`.
   - Mobile addendum: vertical stack; scroll to new card after create.

4. `כניסת תלמיד עם קוד ו-PIN`
   - Desktop + mobile: planned.
   - Duration: 50–70 s / 55–75 s.
   - Data writes: no (session cookie only).
   - Account: student `ADMIN` / `1234` → `ישראל ישראלי` (`student_access_codes` must be active).
   - Risks: missing access code (per BLOCKER-REPORT-14.1 pattern), `בודקים חיבור…` spinner.
   - Status: `planned`.
   - Mobile addendum: same storyboard; viewport realistic mobile; use tap ripple overlay instead of desktop cursor.

5. `קריאת דוח הורים — דוח קצר מול דוח מקיף`
   - Desktop + mobile: planned.
   - Duration: 60–80 s / 75–90 s.
   - Data writes: no.
   - Account: `E2E_PARENT_*` + `ישראל ישראלי` + seeded report.
   - Risks: empty report, accidental Copilot focus, long detailed page.
   - Status: `planned`.
   - Mobile addendum: more scroll (limit to 3 intentional scrolls); show only 2 detailed sections.

6. `שימוש ב-Copilot לשאלות המשך`
   - Desktop + mobile: planned.
   - Duration: 60–75 s / 70–90 s.
   - Data writes: no.
   - Account: same as #1.
   - Risks: clarification-only answers if data thin; rate limits; second answer off-screen on mobile.
   - Status: `planned`.
   - Mobile addendum: re-scroll after each answer; quick-action chips may wrap.

Section close: "Workflow complete = desktop approved + mobile approved + both pass review."

## Part B — Help Center integration map

Use confirmed primary articles. Plan rule: primary article calls `videoBlock(section, slug)`; secondary articles use `relatedLinks([{ href: "<primary-article-url>", label: "…" }])` only.

For each video write a block with the following fields:

- Primary section/article (slug + URL)
- Secondary link-only articles (slug + URL list)
- Placement inside primary article: `top after intro | before screenshots | after screenshots | inside section <id>`
- Screenshots: keep yes/no; move below video yes/no
- Player needs desktop/mobile switching: yes
- Proposed public path later (uses existing manifest schema `<section>/<slug>/main`):
  - desktop: `help-center/videos/<section>/<slug>/desktop/main.webm`
  - mobile: `help-center/videos/<section>/<slug>/mobile/main.webm`
  - Note: a "workflow-named" path (e.g. `help-center/videos/parent-report-and-ai/...`) would require a manifest schema change; deferred until publish wave is approved.
- Publish prerequisites (per video)

Concrete content:

1. Video #1 — Primary: `parent-report/report-overview` (`/help/parent-report/report-overview`). Secondaries (link-only): `parents/welcome-and-overview`, `parents/how-to-read-report`, `parent-report/detailed-report`. Placement: top after intro. Screenshots: keep, move below video. Public path: `help-center/videos/parent-report/report-overview/{desktop,mobile}/main.webm`. Prereqs: mobile capture approved; data-safety review; manifest entry flipped to `captured`.

2. Video #2 — Primary: `parents/create-parent-account` (`/help/parents/create-parent-account`). Secondaries: `parents/welcome-and-overview`, `parents/troubleshooting-login`. Placement: top after intro. Screenshots: keep, move below video. Public path: `help-center/videos/parents/create-parent-account/{desktop,mobile}/main.webm`. Prereqs: disposable-signup-account playbook documented + cleanup script confirmed before capture.

3. Video #3 — Primary: `parents/add-students` (`/help/parents/add-students`). Secondaries: `parents/parent-dashboard-tour`, `parents/student-pin-and-credentials`, `parents/edit-or-delete-student`. Placement: top after intro. Screenshots: keep, move below video. Public path: `help-center/videos/parents/add-students/{desktop,mobile}/main.webm`. Prereqs: isolated parent or post-capture cleanup of created student; must not touch `ישראל ישראלי`.

4. Video #4 — Primary: `students/student-login` (`/help/students/student-login`). Secondaries: `parents/student-pin-and-credentials`, `parents/troubleshooting-login`, `students/student-home-tour`. Placement: top after intro. Screenshots: keep, move below video. Public path: `help-center/videos/students/student-login/{desktop,mobile}/main.webm`. Prereqs: `ADMIN`/`1234` access code active for demo child (verify with `help:provision-demo` if needed).

5. Video #5 — Primary: `parents/how-to-read-report` (`/help/parents/how-to-read-report`). Secondaries: `parent-report/report-overview`, `parent-report/detailed-report`, `parent-report/summary-card`. Placement: top after intro. Screenshots: keep, move below video. Public path: `help-center/videos/parents/how-to-read-report/{desktop,mobile}/main.webm`. Prereqs: seeded report data; Copilot panel NOT used.

6. Video #6 — Primary: `parents/parent-copilot` (`/help/parents/parent-copilot`). Secondaries: `parent-report/report-overview`, `parent-report/detailed-report`. Placement: top after intro. Screenshots: keep, move below video. Public path: `help-center/videos/parents/parent-copilot/{desktop,mobile}/main.webm`. Prereqs: data sufficient to avoid clarification-only answers; same Bearer route pattern as #1.

Constraints block (verbatim in doc):
- Do not create one video per article.
- Do not duplicate the same video embed across articles.
- Prefer one primary embed + links from related articles.
- Existing screenshots are not deleted; they move below the video and remain for step-by-step detail.
- Videos are for overview/workflow understanding; screenshots remain canonical for fine UI references.
- No `public/` publish yet; no manifest flip to `captured` yet; no article re-ordering yet.

## Missing articles / slug gaps

Verified: every workflow maps to an existing slug. No missing articles to author. The doc will note this explicitly so future readers don't search.

## Decision log appended to the doc

- Video #1 primary = `parent-report/report-overview` (user confirmed).
- Video #6 primary = `parents/parent-copilot`; Video #1 links there only (user confirmed).
- Public-path convention = existing manifest schema `<section>/<slug>/main` (default; workflow-named path deferred to publish-wave decision).

## What the doc will explicitly NOT do

- No file in `public/`.
- No edit to [data/help-center/videos-manifest.json](data/help-center/videos-manifest.json).
- No edit to any article file under `data/help-center/content/`.
- No changes to [data/help-center/articleHelpers.js](data/help-center/articleHelpers.js).
- No screenshot, product, legal, or security file edits.
- No commit, no push.

## Return after writing

- File path of the created plan.
- Summary of the proposed set (Part A).
- Integration map summary (Part B).
- Confirmed: no missing slugs.
- Open decisions left for user: (a) mobile viewport choice for capture (390×844 vs 393×852); (b) whether Video #3 uses a dedicated isolated parent or the shared QA parent with a disposable child name + post-capture cleanup; (c) whether to publish workflow-named paths or keep section/slug paths when the publish wave starts.