# Video Tutorials Master Plan (Parent Workflows)

- **Status:** Parent wave **substantially complete** (5/6 workflows); Video #2 **deferred**; nothing published, nothing wired
- **Last updated:** 2026-05-24 (owner approvals recorded)
- **Scope owner:** Help Center video tutorials track
- **Supersedes (for video work):** [.cursor/plans/help_center_video_tutorials_phase_70615046.plan.md](../../.cursor/plans/help_center_video_tutorials_phase_70615046.plan.md) (42-article plan is **out of scope** here)

---

## Scope rules

- This is **not** the previous 42-article Help Center video plan.
- Target: **4–8 general workflow videos** covering complete, useful parent/student workflows.
- Each video: **~60–90 seconds**.
- **Every** approved workflow requires **both** a desktop and a mobile version. A workflow is `complete` only when both are approved.
- One **primary** Help Center embed per video. Secondary articles **link only** — no duplicate embeds across articles.
- Existing screenshots **stay** and remain canonical for fine-grained UI references; at publish time they move **below** the video, never deleted automatically.
- Videos are for **overview / workflow understanding**; screenshots remain canonical for fine UI details.
- This document is the master plan only. It does not capture, publish, wire, or modify product/screenshot/manifest/article files.

## Decision log

1. **Mobile viewport:** default capture viewport is **390×844** for all mobile versions.
2. **Video #3 — Add child:** use a **dedicated isolated capture parent**, not the shared `E2E_PARENT_*` QA parent. Must **not** mutate `ישראל ישראלי` credentials.
3. **Public path convention:** keep the existing manifest-compatible section/slug schema:
   `help-center/videos/<section>/<slug>/<desktop|mobile>/main.webm`.
   Workflow-named paths deferred to the later publish wave (may require manifest schema change).
4. **Video #1 primary article:** `parent-report/report-overview` (other report/parent articles link-only).
5. **Video #6 primary article:** `parents/parent-copilot`. Video #1 only **links** there; it does not embed there.

## Missing articles / slug gaps

None. Every workflow in this plan maps to an existing slug in:

- [data/help-center/content/parents.js](../../data/help-center/content/parents.js)
- [data/help-center/content/parent-report.js](../../data/help-center/content/parent-report.js)
- [data/help-center/content/students.js](../../data/help-center/content/students.js)

Embed/render helpers used by articles:

- `videoBlock(section, slug)` in [data/help-center/articleHelpers.js](../../data/help-center/articleHelpers.js) — only renders when the manifest entry has `assetKind: "captured"`. Until then it is a no-op, so the same article keeps showing only its screenshots.

---

# Part A — Video production plan

Each workflow uses the schema: Goal, Desktop status, Mobile status, Expected duration (desktop / mobile), Data writes, QA/demo account, Risks/blockers, Current status, Mobile addendum.

Completion definition: **workflow complete = desktop approved AND mobile approved AND both pass review.**

---

## Video 1 — מדריך להורה — כניסה לדוח ושימוש ב-AI

- **Goal:** Parent logs in, opens child report, moves from short to detailed, asks Copilot one practical question, gets a useful Hebrew answer.
- **Desktop version status:** **approved**
  - File: `qa-evidence-audit/parent-video-pilot/parent-report-ai/desktop/main.webm`
  - Duration: **~66.0 s**. Frame count: **528** @ 8 fps. Technical verification: passed.
- **Mobile version status:** **approved** (technical pass + owner visual review confirmed 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/parent-report-ai/mobile/main.webm`
  - Duration: **71.0 s**. Frame count: **568** @ 8 fps. Technical verification: passed.
- **Workflow complete:** **yes** (both viewports approved; **not** published or wired to Help Center yet)
- **Publish / wiring:** **none** — files remain under `qa-evidence-audit/` only; no `public/` copy; no manifest `assetKind: "captured"` flip; no article block reorder yet.
- **Expected duration (reference):** desktop **60–75 s** / mobile **70–90 s**
- **Data writes:** no (login session + read-only Copilot turn).
- **QA/demo account needed:** `E2E_PARENT_*` + child `ישראל ישראלי`. Seeded report data via `npm run help:seed-demo-report` if empty. Capture-only Bearer route injection for `/api/parent/copilot-turn` (capture script only; not a product change).
- **Risks / blockers (resolved for this workflow):**
  - Empty report data — mitigated via `help:seed-demo-report`.
  - Copilot `401` without Bearer route — mitigated in capture via route injection (capture-only).
  - Dashboard clutter — mitigated via scroll + card-only highlight on demo child.
- **Mobile capture notes (archive):**
  - Viewport: **390×844**; tap ripple; max 3 intentional scrolls; Copilot Q&A with programmatic fill (no OS keyboard in frame).

---

## Video 2 — רישום הורה וכניסה ראשונה

- **Goal:** New parent: registration tab, policy acceptance, account creation, first landing on dashboard.
- **Desktop version status:** **deferred** — blocked by signup/session/email-confirmation gate (no capture; not faked).
- **Mobile version status:** **deferred** — same gate.
- **Owner decision (2026-05-24):** Defer true signup video. Do **not** replace with misleading “signup” or first-login substitute. Retry when Supabase/dev signup completes reliably.
- **Expected duration:** desktop **65–85 s** / mobile **70–90 s**
- **Data writes:** **yes.** Creates Supabase Auth user, `parent_profiles` row, policy acceptance row.
- **QA/demo account needed:** **disposable signup email per run** (e.g. env-driven alias). **Not** the shared `E2E_PARENT_*` (would not be a true first-time signup).
- **Risks / blockers:**
  - Duplicate email if alias is reused.
  - Supabase email confirmation if enabled in env.
  - Policy panel height (full-page on mobile).
  - Real email accidentally visible in frame.
- **Current status:** `deferred` — retry later when signup reaches dashboard in preflight.
- **Capture tooling:** `scripts/parent-video-pilot/preflight-create-parent-account-*.mjs`, `capture-create-parent-account-*.mjs` (not run to success).
- **Mobile addendum:**
  - Adjusted storyboard (policy panel full-page; tab stack vertical).
  - Viewport: 390×844.
  - Required scrolls: through policy panel before accept.
  - Capture deltas: scroll-driven; no field highlights wider than viewport.
  - Mobile risks: long policy text wall; caption overlap with accept button.

---

## Video 3 — הוספת ילד וקבלת קוד תלמיד

- **Goal:** Parent adds a child and sets a student username + PIN for student login.
- **Desktop version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/add-students/desktop/main.webm`
  - Duration: **65.0 s**. Frames: **520** @ 8 fps. Verification: passed.
- **Mobile version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/add-students/mobile/main.webm`
  - Duration: **65.0 s**. Frames: **520** @ 8 fps. Verification: passed.
- **Isolated parent:** ephemeral `parent-video-isolated-*@example.com` via service role (capture tooling); demo child cleaned after capture.
- **Expected duration:** desktop **60–80 s** / mobile **65–85 s**
- **Data writes:** **yes.** `POST /api/parent/create-student` and `POST /api/parent/create-student-access-code`.
- **QA/demo account needed:** **dedicated isolated capture parent** (0–1 children before run). Must **not** be the shared QA parent owning `ישראל ישראלי`, and must **not** mutate `ישראל ישראלי` credentials. Created child should use a disposable name (e.g. `ילד לדוגמה וידאו`) and be cleaned up after capture.
- **Risks / blockers:**
  - Student limit reached on chosen parent.
  - Accidental rotation of demo child PIN.
  - Dashboard clutter; new card off-screen on mobile after create.
- **Workflow complete:** **yes** (both viewports approved 2026-05-24).
- **Publish / wiring:** none.
- **Mobile addendum:**
  - Adjusted storyboard (vertical stack; scroll to new card after create; credential block may need scroll).
  - Viewport: 390×844.
  - Required scrolls: form area → new card → credential block.
  - Capture deltas: explicit `scrollIntoViewIfNeeded` on new card; PIN field is masked input — never read back.
  - Mobile risks: success toast timing; credential confirmation lines wrap.

---

## Video 4 — כניסת תלמיד עם קוד ו-PIN

- **Goal:** Student logs in with username + PIN and reaches the student home.
- **Desktop version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/student-login/desktop/main.webm`
  - Duration: **47.0 s**. Frames: **376** @ 8 fps. Verification: passed.
- **Mobile version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/student-login/mobile/main.webm`
  - Duration: **47.0 s**. Frames: **376** @ 8 fps. Verification: passed.
- **Expected duration:** desktop **50–70 s** / mobile **55–75 s**
- **Data writes:** **no** (student session cookie only).
- **QA/demo account needed:** student **ADMIN / 1234** tied to `ישראל ישראלי`. The active `student_access_codes` row for the demo child must exist (see [docs/help-center/BLOCKER-REPORT-14.1.md](BLOCKER-REPORT-14.1.md) for the typical failure mode); verify with `npm run help:provision-demo` if needed.
- **Risks / blockers:**
  - Missing/expired access code.
  - Wrong display name on home if access code is bound to a different student row.
  - `בודקים חיבור…` spinner — capture must start after session check resolves to `none`.
- **Workflow complete:** **yes** (both viewports approved 2026-05-24).
- **Publish / wiring:** none.
- **Mobile addendum:**
  - Mostly same storyboard (student login is already mobile-first).
  - Viewport: 390×844.
  - Capture deltas: use **tap ripple** overlay instead of desktop cursor; PIN field type=password remains masked.
  - Mobile risks: virtual keyboard overlap on PIN field; home subject grid layout differs from desktop.

---

## Video 5 — קריאת דוח הורים — דוח קצר מול דוח מקיף

- **Goal:** Teach how to read reports — short vs detailed — without Copilot typing (complements Video #1).
- **Help Center primary embed (later):** `parents/how-to-read-report` — [/help/parents/how-to-read-report](../../pages/help/parents/how-to-read-report)
- **Storyboard:** approved 2026-05-24.
- **Desktop version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/how-to-read-report/desktop/main.webm`
  - Duration: **68.0 s**. Frames: **544** @ 8 fps. Copilot avoided. Verification: passed.
- **Mobile version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/how-to-read-report/mobile/main.webm`
  - Duration: **72.0 s**. Frames: **576** @ 8 fps. Copilot avoided. Verification: passed.
- **Expected duration:** desktop **60–80 s** / mobile **75–90 s**
- **Data writes:** no.
- **QA/demo account needed:** `E2E_PARENT_*` + `ישראל ישראלי` + seeded report (`help:seed-demo-report`).
- **Risks / blockers:**
  - Empty report.
  - Accidental Copilot focus on detailed page.
  - Detailed page is long; risk of free-form scroll filming.
- **Workflow complete:** **yes** (both viewports approved 2026-05-24).
- **Publish / wiring:** none.
- **Mobile addendum:**
  - Adjusted storyboard (more scrolling between summary, diagnostic block, and detailed sections).
  - Viewport: 390×844.
  - Required scrolls: limit to **3 intentional scrolls** total; show only **2 detailed sections**.
  - Capture deltas: do **not** scroll to Copilot panel; do **not** type into Copilot.
  - Mobile risks: section header overlap with caption strip; period chips wrap.

---

## Video 6 — שימוש ב-Copilot לשאלות המשך

- **Goal:** Follow-up Copilot usage — two question turns and a quick-action chip on a loaded detailed report.
- **Desktop version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/parent-copilot/desktop/main.webm`
  - Duration: **61.0 s**. Frames: **488** @ 8 fps. Two useful Copilot turns verified.
- **Mobile version status:** **approved** (owner 2026-05-24)
  - File: `qa-evidence-audit/parent-video-pilot/parent-copilot/mobile/main.webm`
  - Duration: **67.0 s**. Frames: **536** @ 8 fps. Two useful Copilot turns verified.
- **Expected duration:** desktop **60–75 s** / mobile **70–90 s**
- **Data writes:** no.
- **QA/demo account needed:** same as Video #1 (`E2E_PARENT_*` + `ישראל ישראלי` + seeded data + capture-only Bearer route injection on `/api/parent/copilot-turn`).
- **Risks / blockers:**
  - Clarification-only answers if data is thin (re-seed if needed).
  - Rate limits on `/api/parent/copilot-turn`.
  - Second answer off-screen on mobile.
- **Workflow complete:** **yes** (both viewports approved 2026-05-24).
- **Publish / wiring:** none.
- **Mobile addendum:**
  - Adjusted storyboard — re-scroll after each answer; quick-action chips may wrap to two rows.
  - Viewport: 390×844.
  - Required scrolls: after Q1 answer; after Q2 answer.
  - Capture deltas: pin scroll to the Copilot answer region between turns; do not let the input scroll out of view.
  - Mobile risks: keyboard overlay covering latest answer; chat history compaction after 4 turns (engine behavior).

---

# Part B — Help Center integration map

Per-video schema: primary article, secondary link-only articles, placement, screenshots policy, player switching, proposed public path, publish prerequisites.

**Integration rules (apply to all rows below):**

- Primary article calls `videoBlock(section, slug)` (already present in articles — only the manifest flip from `placeholder` to `captured` will activate the embed at publish time).
- Secondary articles use `relatedLinks([{ href: "<primary article URL>", label: ... }])` only — **no** `videoBlock(...)` for that workflow in those articles.
- Existing `screenshotBlock(...)` calls **stay**. Visually, at publish time, the article block order should be: intro → video → screenshots. Screenshots are not deleted.
- The Help Center player must support **desktop/mobile switching** (the existing manifest already declares `viewports: ["desktop", "mobile"]` per entry; that contract is honored).
- Public paths follow the manifest-compatible schema `help-center/videos/<section>/<slug>/<desktop|mobile>/main.webm`. Workflow-named paths are out of scope here.

---

## Video 1 — Integration

- **Primary article:** `parent-report/report-overview` — [/help/parent-report/report-overview](../../pages/help/parent-report/) (article: [data/help-center/content/parent-report.js](../../data/help-center/content/parent-report.js))
- **Secondary articles (link-only):**
  - `parents/welcome-and-overview`
  - `parents/how-to-read-report`
  - `parent-report/detailed-report`
- **Placement inside primary article:** top, immediately after intro paragraph, **before** existing screenshots.
- **Screenshots:** keep; at publish time move below the video. Do not delete.
- **Player desktop/mobile switching:** **yes** (single embed switches by viewport).
- **Proposed public path (later):**
  - desktop: `help-center/videos/parent-report/report-overview/desktop/main.webm`
  - mobile: `help-center/videos/parent-report/report-overview/mobile/main.webm`
- **Publish prerequisites:**
  - Mobile version captured and reviewed.
  - Video data-safety review (no real PII, demo child only).
  - Manifest entry flipped to `assetKind: "captured"` for `parent-report/report-overview/main`.
  - Owner approval of publish wave.

---

## Video 2 — Integration

- **Primary article:** `parents/create-parent-account` — [/help/parents/create-parent-account](../../pages/help/parents/)
- **Secondary articles (link-only):**
  - `parents/welcome-and-overview`
  - `parents/troubleshooting-login`
- **Placement inside primary article:** top, after intro, **before** screenshots.
- **Screenshots:** keep; move below video at publish time.
- **Player desktop/mobile switching:** yes.
- **Proposed public path (later):**
  - desktop: `help-center/videos/parents/create-parent-account/desktop/main.webm`
  - mobile: `help-center/videos/parents/create-parent-account/mobile/main.webm`
- **Publish prerequisites:**
  - Disposable signup account playbook documented (alias generator + cleanup steps).
  - Both viewports captured and reviewed.
  - Data-safety review confirms no real email frames.
  - Manifest flipped for `parents/create-parent-account/main`.

---

## Video 3 — Integration

- **Primary article:** `parents/add-students` — [/help/parents/add-students](../../pages/help/parents/)
- **Secondary articles (link-only):**
  - `parents/parent-dashboard-tour`
  - `parents/student-pin-and-credentials`
  - `parents/edit-or-delete-student`
- **Placement inside primary article:** top, after intro, **before** screenshots.
- **Screenshots:** keep; move below video at publish time.
- **Player desktop/mobile switching:** yes.
- **Proposed public path (later):**
  - desktop: `help-center/videos/parents/add-students/desktop/main.webm`
  - mobile: `help-center/videos/parents/add-students/mobile/main.webm`
- **Publish prerequisites:**
  - Dedicated isolated capture parent confirmed.
  - Post-capture cleanup of created student validated.
  - Demo child `ישראל ישראלי` credentials proven unchanged.
  - Both viewports captured and reviewed.
  - Manifest flipped for `parents/add-students/main`.

---

## Video 4 — Integration

- **Primary article:** `students/student-login` — [/help/students/student-login](../../pages/help/students/)
- **Secondary articles (link-only):**
  - `parents/student-pin-and-credentials`
  - `parents/troubleshooting-login`
  - `students/student-home-tour`
- **Placement inside primary article:** top, after intro, **before** screenshots.
- **Screenshots:** keep; move below video at publish time.
- **Player desktop/mobile switching:** yes.
- **Proposed public path (later):**
  - desktop: `help-center/videos/students/student-login/desktop/main.webm`
  - mobile: `help-center/videos/students/student-login/mobile/main.webm`
- **Publish prerequisites:**
  - `ADMIN`/`1234` `student_access_codes` row active for `ישראל ישראלי`.
  - Both viewports captured and reviewed.
  - Manifest flipped for `students/student-login/main`.

---

## Video 5 — Integration

- **Primary article:** `parents/how-to-read-report` — [/help/parents/how-to-read-report](../../pages/help/parents/)
- **Secondary articles (link-only):**
  - `parent-report/report-overview`
  - `parent-report/detailed-report`
  - `parent-report/summary-card`
- **Placement inside primary article:** top, after intro, **before** screenshots.
- **Screenshots:** keep; move below video at publish time.
- **Player desktop/mobile switching:** yes.
- **Proposed public path (later):**
  - desktop: `help-center/videos/parents/how-to-read-report/desktop/main.webm`
  - mobile: `help-center/videos/parents/how-to-read-report/mobile/main.webm`
- **Publish prerequisites:**
  - Seeded report data present (`help:seed-demo-report`).
  - Both viewports captured; mobile scroll budget respected.
  - Data-safety review passed.
  - Manifest flipped for `parents/how-to-read-report/main`.

---

## Video 6 — Integration

- **Primary article:** `parents/parent-copilot` — [/help/parents/parent-copilot](../../pages/help/parents/)
- **Secondary articles (link-only):**
  - `parent-report/report-overview`
  - `parent-report/detailed-report`
- **Placement inside primary article:** top, after intro, **before** screenshots.
- **Screenshots:** keep; move below video at publish time.
- **Player desktop/mobile switching:** yes.
- **Proposed public path (later):**
  - desktop: `help-center/videos/parents/parent-copilot/desktop/main.webm`
  - mobile: `help-center/videos/parents/parent-copilot/mobile/main.webm`
- **Publish prerequisites:**
  - Report data deep enough to produce non-clarification answers across two turns.
  - Capture-only Bearer route pattern for `/api/parent/copilot-turn` retained (capture script only).
  - Both viewports captured and reviewed.
  - Manifest flipped for `parents/parent-copilot/main`.

---

## Integration constraints (verbatim)

- Do **not** create one video per article.
- Do **not** duplicate the same video embed across many articles.
- Prefer **one** primary embed + links from related articles.
- Existing screenshots are **not** deleted; they move **below** the video at publish time.
- Screenshots remain canonical for step-by-step UI details.
- Videos are for overview/workflow understanding.
- No `public/` publish in this plan.
- No manifest/article wiring in this plan.
- No screenshots work in this plan.
- No product/legal/security edits in this plan.
- No commit, no push in this plan.

---

# Status board

| # | Title | Desktop | Mobile | Workflow complete |
|---|-------|---------|--------|--------------------|
| 1 | מדריך להורה — כניסה לדוח ושימוש ב-AI | approved | approved | **yes** |
| 2 | רישום הורה וכניסה ראשונה | **deferred** | **deferred** | no |
| 3 | הוספת ילד וקבלת קוד תלמיד | approved | approved | **yes** |
| 4 | כניסת תלמיד עם קוד ו-PIN | approved | approved | **yes** |
| 5 | קריאת דוח הורים — דוח קצר מול דוח מקיף | approved | approved | **yes** |
| 6 | שימוש ב-Copilot לשאלות המשך | approved | approved | **yes** |

---

# What this plan explicitly does NOT do

- Does not write to `public/`.
- Does not edit [data/help-center/videos-manifest.json](../../data/help-center/videos-manifest.json) (no `assetKind` flips).
- Does not edit any article file under [data/help-center/content/](../../data/help-center/content/).
- Does not edit [data/help-center/articleHelpers.js](../../data/help-center/articleHelpers.js).
- Does not capture any new desktop or mobile video.
- Does not touch screenshots (capture, publish, manifest, or article wiring).
- Does not edit product, legal, or security files.
- Does not commit; does not push.

---

# Next decision points

1. **Video #2 (deferred):** retry true parent signup when Supabase/dev gate is fixed — see [VIDEO_TUTORIALS_CURRENT_STATUS.md](./VIDEO_TUTORIALS_CURRENT_STATUS.md).
2. **Student set:** optional owner visual review of 18 technical-pass WebMs under `qa-evidence-audit/student-video-pilot/`.
3. **Publish wave timing:** when flipping manifest entries to `captured`, publish parent + student batches together or separately.
