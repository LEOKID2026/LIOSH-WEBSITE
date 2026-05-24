# Video Tutorials — Help Center Integration Recommendation

- **Status:** Audit / recommendation only — **not implemented**
- **Generated:** 2026-05-24
- **Owner:** Visual review complete; integration placement audit for publish wave planning
- **Companion docs:**
  - [VIDEO_TUTORIALS_VISUAL_REVIEW_INDEX.md](./VIDEO_TUTORIALS_VISUAL_REVIEW_INDEX.md)
  - [VIDEO_TUTORIALS_MASTER_PLAN.md](./VIDEO_TUTORIALS_MASTER_PLAN.md)
  - [STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md](./STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md)

---

## Scope of this document

This document recommends **where each captured workflow video should appear** in the Help Center after a future publish wave. It does **not** copy files, flip manifest `assetKind`, edit articles, or change product code.

### How Help Center video wiring works today (verified)

| Mechanism | Behavior |
|-----------|----------|
| `videoBlock(section, slug)` in [articleHelpers.js](../../data/help-center/articleHelpers.js) | Looks up manifest id `{section}/{slug}/main`. Returns `{ kind: "video", src: null }` until `assetKind === "captured"`. |
| [HelpVideoEmbed.js](../../components/help/HelpVideoEmbed.js) | Chooses **desktop** vs **mobile** via `matchMedia("(max-width: 640px)")` on `sourcesByViewport.desktop` / `.mobile`. No manual toggle. |
| [HelpArticleBody.js](../../components/help/HelpArticleBody.js) | Renders blocks **in array order** — placement = block order in each article file. |
| Section hub pages (`/help/parents`, `/help/students`, `/help/subjects`) | [sectionPageBuilders.js](../../components/help/sectionPageBuilders.js) — **search list only**; **no** `videoBlock` / article body. |
| [videos-manifest.json](../../data/help-center/videos-manifest.json) | **42** entries (one per article that already calls `videoBlock`). All **`assetKind: "placeholder"`** today. Public paths: `help-center/videos/<section>/<slug>/{desktop\|mobile}/main.webm`. |

### Publish mapping rule (audit → public)

Captured files live under **pilot folders** (`qa-evidence-audit/...`). At publish time, copy each approved WebM (and generate poster `.jpg`) to the **manifest path** for the **primary article slug** — not the pilot folder name.

Example: capture folder `parent-video-pilot/parent-report-ai/` → public `help-center/videos/parent-report/report-overview/...` (manifest id `parent-report/report-overview/main`).

---

## 1. Final video inventory

| ID | Title | Desktop (audit) | Mobile (audit) | Status | Public destination (later) | Embed? |
|----|--------|-----------------|----------------|--------|------------------------------|--------|
| **#1** | מדריך להורה — כניסה לדוח ושימוש ב-AI | `qa-evidence-audit/parent-video-pilot/parent-report-ai/desktop/main.webm` | `.../mobile/main.webm` | **approved** | `public/help-center/videos/parent-report/report-overview/{desktop,mobile}/main.webm` | **Primary embed** |
| **#2** | רישום הורה וכניסה ראשונה | — | — | **deferred** | `public/help-center/videos/parents/create-parent-account/...` (when captured) | **Defer** — no embed until capture |
| **#3** | הוספת ילד וקבלת קוד תלמיד | `qa-evidence-audit/parent-video-pilot/add-students/desktop/main.webm` | `.../mobile/main.webm` | **approved** | `public/help-center/videos/parents/add-students/...` | **Primary embed** |
| **#4** | כניסת תלמיד עם קוד ו-PIN | `qa-evidence-audit/parent-video-pilot/student-login/desktop/main.webm` | `.../mobile/main.webm` | **approved** | `public/help-center/videos/students/student-login/...` | **Primary embed** |
| **#5** | קריאת דוח הורים — דוח קצר מול דוח מקיף | `qa-evidence-audit/parent-video-pilot/how-to-read-report/desktop/main.webm` | `.../mobile/main.webm` | **approved** | `public/help-center/videos/parents/how-to-read-report/...` | **Primary embed** |
| **#6** | שימוש ב-Copilot לשאלות המשך | `qa-evidence-audit/parent-video-pilot/parent-copilot/desktop/main.webm` | `.../mobile/main.webm` | **approved** | `public/help-center/videos/parents/parent-copilot/...` | **Primary embed** |
| **SL1** | כניסת תלמיד ועמוד הבית | `qa-evidence-audit/student-video-pilot/student-home-tour/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/students/student-home-tour/...` | **Primary embed** |
| **SL2** | איך מתחילים תרגול במקצוע | `qa-evidence-audit/student-video-pilot/start-practice/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/students/choose-subject-and-grade/...` | **Primary embed** |
| **SL3** | תרגול בחשבון — הסבר צעד־צעד | `qa-evidence-audit/student-video-pilot/math-step-explanation/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/subjects/math/...` | **Primary embed** |
| **SL4** | תרגול בגאומטריה — הסבר צעד־צעד | `qa-evidence-audit/student-video-pilot/geometry-step-explanation/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/subjects/geometry/...` | **Primary embed** |
| **SL5** | מה קורה כשטועים בשאלה | `qa-evidence-audit/student-video-pilot/wrong-answer-help/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/students/hints-and-explanations/...` | **Primary embed** |
| **SL6** | רצף, ניקוד והתקדמות | `qa-evidence-audit/student-video-pilot/streak-and-progress/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/students/answering-questions/...` | **Primary embed** |
| **SL7** | משימות יומיות / מסע התקדמות חודשי | `qa-evidence-audit/student-video-pilot/daily-missions-journey/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/students/daily-missions/...` | **Primary embed** |
| **SL8** | משחקים ותרגול חווייתי | `qa-evidence-audit/student-video-pilot/games-arcade/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | `public/help-center/videos/students/coins-and-arcade/...` | **Primary embed** |
| **SL9** | סקירת מקצועות באתר | `qa-evidence-audit/student-video-pilot/subjects-overview/desktop/main.webm` | `.../mobile/main.webm` | **technical pass** | **See §4 — no manifest/article slot today** | **Owner decision** |

**Counts:** 28 WebMs ready · 1 workflow deferred (#2) · 15 workflows with a clear primary manifest slot · **SL9 needs a decision** before publish.

---

## 2. Primary embed map

**Rule:** Exactly **one** primary article per workflow video. `videoBlock(section, slug)` already exists on each primary row below; publish activates it via manifest flip only (plus block reorder where noted).

### Summary table

| Video | Primary section / slug | Help Center URL | Embed | Screenshots below video? |
|-------|------------------------|-----------------|-------|---------------------------|
| #1 | `parent-report` / `report-overview` | [/help/parent-report/report-overview](/help/parent-report/report-overview) | Yes | Yes (both short + detailed) |
| #2 | *(deferred)* `parents` / `create-parent-account` | [/help/parents/create-parent-account](/help/parents/create-parent-account) | No (yet) | Yes (when live) |
| #3 | `parents` / `add-students` | [/help/parents/add-students](/help/parents/add-students) | Yes | Yes |
| #4 | `students` / `student-login` | [/help/students/student-login](/help/students/student-login) | Yes | Yes |
| #5 | `parents` / `how-to-read-report` | [/help/parents/how-to-read-report](/help/parents/how-to-read-report) | Yes | Yes |
| #6 | `parents` / `parent-copilot` | [/help/parents/parent-copilot](/help/parents/parent-copilot) | Yes | Yes |
| SL1 | `students` / `student-home-tour` | [/help/students/student-home-tour](/help/students/student-home-tour) | Yes | Yes |
| SL2 | `students` / `choose-subject-and-grade` | [/help/students/choose-subject-and-grade](/help/students/choose-subject-and-grade) | Yes | Yes |
| SL3 | `subjects` / `math` | [/help/subjects/math](/help/subjects/math) | Yes | Yes (question + explanation) |
| SL4 | `subjects` / `geometry` | [/help/subjects/geometry](/help/subjects/geometry) | Yes | Yes (question + explanation) |
| SL5 | `students` / `hints-and-explanations` | [/help/students/hints-and-explanations](/help/students/hints-and-explanations) | Yes | None today — optional screenshots later |
| SL6 | `students` / `answering-questions` | [/help/students/answering-questions](/help/students/answering-questions) | Yes | Yes |
| SL7 | `students` / `daily-missions` | [/help/students/daily-missions](/help/students/daily-missions) | Yes | Yes |
| SL8 | `students` / `coins-and-arcade` | [/help/students/coins-and-arcade](/help/students/coins-and-arcade) | Yes | Yes |
| SL9 | **TBD** — see §4 | **TBD** | **TBD** | TBD |

---

### Parent videos (detail)

#### Video #1 → `parent-report/report-overview`

| Field | Recommendation |
|-------|----------------|
| **Why this article** | Title and TOC are “דוח מקוצר / דוח מפורט”; video shows login → short → detailed → Copilot — the canonical parent report entry point. Matches [VIDEO_TUTORIALS_MASTER_PLAN.md](./VIDEO_TUTORIALS_MASTER_PLAN.md) decision #4. |
| **Current block order** | `heading(short)` → `paragraph` → `screenshot(short)` → **`videoBlock`** → `heading(detailed)` → `paragraph` → `screenshot(detailed)` |
| **Recommended placement** | After first intro `paragraph` under “דוח מקוצר”, **before** all screenshots: `intro → video → screenshots` for the whole article. |
| **Screenshots** | **Keep** `short-report` and `detailed-report`; move **below** video (reorder blocks only). |
| **Overlap note** | Video #5 is reading-focused without Copilot; #1 is the “full journey” embed — **not** a duplicate if #5 stays link-only to #1 for Copilot. |

#### Video #3 → `parents/add-students`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article title “הוספת תלמיד” matches capture goal exactly; manifest id `parents/add-students/main` exists. |
| **Current order** | `heading` → `paragraph` → `screenshot(form)` → **`videoBlock`** → `list` |
| **Recommended placement** | After intro `paragraph`, **before** `screenshot(form)` and grade list. |
| **Screenshots** | Keep `form` below video. |

#### Video #4 → `students/student-login`

| Field | Recommendation |
|-------|----------------|
| **Why** | Only student article dedicated to login steps; parent PIN article stays screenshot-first with link to here. |
| **Current order** | `heading` → `list(steps)` → `screenshot(login)` → **`videoBlock`** |
| **Recommended placement** | After step `list`, **before** screenshot (video demonstrates motion; screenshot keeps static field layout). |
| **Screenshots** | Keep below video. |

#### Video #5 → `parents/how-to-read-report`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article summary is explicitly “מבוא קצר לדוח” and links into report articles; video teaches short vs detailed **without** Copilot — complements #1. |
| **Current order** | `heading` → `paragraph` → `screenshot(report-link)` → **`videoBlock`** → `relatedLinks` |
| **Recommended placement** | After intro `paragraph`, **before** screenshot and related links. |
| **Screenshots** | Keep below video. |
| **Overlap note** | #1 on `report-overview` vs #5 here: **intentional split** — link from `report-overview` to this article for “how to read” depth; do **not** embed #5 on `report-overview`. |

#### Video #6 → `parents/parent-copilot`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article is Copilot-specific; video is two-turn Copilot workflow on detailed report. |
| **Current order** | `heading` → `paragraph` → `screenshot(copilot-panel)` → **`videoBlock`** → `heading(limits)` → `list` |
| **Recommended placement** | After “איך שואלים?” `paragraph`, **before** panel screenshot; limits section stays after video. |
| **Screenshots** | Keep below video. |

#### Video #2 → deferred

| Field | Recommendation |
|-------|----------------|
| **Primary (future)** | `parents/create-parent-account` — `videoBlock` already present; leave **`placeholder`** until real signup capture exists. |
| **Embed now** | **No** |

---

### Student videos (detail)

#### SL1 → `students/student-home-tour`

| Field | Recommendation |
|-------|----------------|
| **Why** | Canonical home tour; parent Video #4 only covers login → home briefly. |
| **Current order** | `heading` → `paragraph` → `screenshot(home)` → **`videoBlock`** |
| **Recommended placement** | After intro `paragraph`, **before** screenshot. |
| **Screenshots** | Keep below video. |

#### SL2 → `students/choose-subject-and-grade`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article section id `learning-hub` / “אזור לימודים”; video shows home → `/learning` → math → first question. Owner-approved primary for SL2. |
| **Current order** | `heading` → `paragraph` → `screenshot(subjects)` → **`videoBlock`** → `relatedLinks` |
| **Recommended placement** | After intro `paragraph`, **before** subjects screenshot. |
| **Screenshots** | Keep below video. |
| **SL9** | **Do not** second-embed SL9 here — see §4. |

#### SL3 → `subjects/math`

| Field | Recommendation |
|-------|----------------|
| **Why** | Subject guide for חשבון; mandatory step-by-step explanation is the core of this article’s “איך נראה תרגול?” section. |
| **Current order** | `who` → `topics` → `practice` heading → `paragraph` → `screenshot(question)` → **`videoBlock`** → `screenshot(explanation)` → `tips` |
| **Recommended placement** | Under `practice` heading, after `paragraph`, **before** both screenshots (video = live flow; screenshots = static detail). |
| **Screenshots** | Keep **both** below video. |

#### SL4 → `subjects/geometry`

| Field | Recommendation |
|-------|----------------|
| **Why** | Same pattern as SL3 for גיאומטריה + diagram. |
| **Recommended placement** | Same as SL3 — after practice `paragraph`, before question/explanation screenshots. |

#### SL5 → `students/hints-and-explanations`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article is “רמזים והסברים” / wrong-answer path; no other article focuses on mistake → explanation. |
| **Current order** | `heading` → `paragraph` → `callout` → **`videoBlock`** (no screenshot today) |
| **Recommended placement** | After `callout`, video is already last instructional block — **acceptable as-is**; optional future screenshot below video. |
| **Screenshots** | None in article today — **do not delete** anything; optional add later below video. |

#### SL6 → `students/answering-questions`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article covers answering flow and feedback; video shows streak/score across multiple answers. |
| **Current order** | `heading` → `list` → `screenshot(question)` → **`videoBlock`** |
| **Recommended placement** | After `list`, **before** screenshot. |

#### SL7 → `students/daily-missions` *(recommended over monthly-persistence)*

| Field | Recommendation |
|-------|----------------|
| **Why** | Video opens with **משימות יומיות** then scrolls to **מסע התמדה חודשי**; daily-missions article title matches the first and larger share of runtime. `monthly-persistence` article is single-topic and would mislead if it were the only embed host. |
| **Current order** | `heading` → `paragraph` → `screenshot(missions)` → **`videoBlock`** |
| **Recommended placement** | After intro `paragraph`, **before** missions screenshot. |
| **Alternate** | If owner prefers monthly journey as brand: primary **`students/monthly-persistence`** instead — **pick one** (§4). |

#### SL8 → `students/coins-and-arcade`

| Field | Recommendation |
|-------|----------------|
| **Why** | Article title “מטבעות וארקייד”; capture is `/student/arcade` only (approved scope). |
| **Current order** | `heading` → `paragraph` → `screenshot(arcade)` → **`videoBlock`** |
| **Recommended placement** | After intro `paragraph`, **before** screenshot. |
| **Note** | `students/offline-games` stays separate — link-only to this primary, not offline footage. |

#### SL9 → **no verified primary today**

See **§4 Conflicts** for options. Until resolved, **do not** copy SL9 WebMs to `public/` or flip a manifest entry.

---

## 3. Secondary link-only map

**Rule:** Related articles add **`relatedLinks`** pointing to the **primary Help Center URL** of that workflow. They keep their existing `videoBlock` as **placeholder** (renders nothing) — **do not** flip those entries to `captured` with duplicate WebMs.

Suggested Hebrew labels are for a **future** owner-approved copy pass — **do not edit article text in the integration wave without approval**.

### Video #1 (primary: `/help/parent-report/report-overview`)

| Secondary article | Suggested link label (Hebrew) |
|-------------------|-------------------------------|
| `parents/welcome-and-overview` | סרטון: כניסה לדוח ושימוש ב-AI |
| `parents/how-to-read-report` | סרטון מלא: מהדוח הקצר לדוח המפורט |
| `parent-report/detailed-report` | סרטון: סקירת דוח עם Copilot |
| `parents/parent-copilot` | המשך: שאלות נוספות ב-Copilot (סרטון נפרד) |

### Video #3 (primary: `/help/parents/add-students`)

| Secondary | Label |
|-----------|--------|
| `parents/parent-dashboard-tour` | סרטון: הוספת תלמיד חדש |
| `parents/student-pin-and-credentials` | אחרי ההוספה: קוד PIN לתלמיד |
| `parents/edit-or-delete-student` | ניהול תלמידים קיימים |

### Video #4 (primary: `/help/students/student-login`)

| Secondary | Label |
|-----------|--------|
| `parents/student-pin-and-credentials` | סרטון: איך התלמיד נכנס |
| `parents/troubleshooting-login` | בעיות כניסה — צפו בסרטון ההדרכה |
| `students/student-home-tour` | אחרי הכניסה: סיור בעמוד הבית |

### Video #5 (primary: `/help/parents/how-to-read-report`)

| Secondary | Label |
|-----------|--------|
| `parent-report/report-overview` | סרטון: דוח קצר ודוח מפורט |
| `parent-report/detailed-report` | המשך: חלקי הדוח המפורט |
| `parent-report/summary-card` | הבנת כרטיס הסיכום בדוח |

### Video #6 (primary: `/help/parents/parent-copilot`)

| Secondary | Label |
|-----------|--------|
| `parent-report/report-overview` | לפני Copilot: איך פותחים את הדוח |
| `parent-report/detailed-report` | דוח מפורט — הקשר לשאלות Copilot |

### SL1 (primary: `/help/students/student-home-tour`)

| Secondary | Label |
|-----------|--------|
| `students/student-login` | קודם: איך מתחברים |
| `students/choose-subject-and-grade` | מהבית לאזור הלימודים |
| `students/daily-missions` | משימות יומיות בעמוד הבית |
| `students/monthly-persistence` | מסע התמדה חודשי בעמוד הבית |

### SL2 (primary: `/help/students/choose-subject-and-grade`)

| Secondary | Label |
|-----------|--------|
| `students/student-home-tour` | מהבית לתרגול |
| `students/answering-questions` | אחרי בחירת מקצוע: איך עונים |
| `subjects/math` | דוגמה: תרגול בחשבון עם הסבר |

### SL3 (primary: `/help/subjects/math`)

| Secondary | Label |
|-----------|--------|
| `students/hints-and-explanations` | הסברים אחרי תשובה |
| `students/choose-subject-and-grade` | איך מגיעים לתרגול בחשבון |
| `students/answering-questions` | מענה על שאלות |

### SL4 (primary: `/help/subjects/geometry`)

| Secondary | Label |
|-----------|--------|
| `subjects/math` | השוואה: חשבון מול גיאומטריה חזותית |
| `students/hints-and-explanations` | הסברים לשאלות חזותיות |

### SL5 (primary: `/help/students/hints-and-explanations`)

| Secondary | Label |
|-----------|--------|
| `subjects/math` | דוגמה במתמטיקה |
| `students/answering-questions` | סוגי שאלות ותשובות |

### SL6 (primary: `/help/students/answering-questions`)

| Secondary | Label |
|-----------|--------|
| `students/tips-for-good-practice` | טיפים לרצף תרגול |
| `students/coins-and-arcade` | מטבעות על תרגול |

### SL7 (primary: `/help/students/daily-missions` — if owner confirms)

| Secondary | Label |
|-----------|--------|
| `students/monthly-persistence` | סרטון: משימות יומיות ומסע חודשי (באותו סרטון) |
| `students/student-home-tour` | איפה רואים את המשימות בבית |

### SL8 (primary: `/help/students/coins-and-arcade`)

| Secondary | Label |
|-----------|--------|
| `students/offline-games` | משחקים מקוונים מול לא מקוון |
| `students/student-home-tour` | מטבעות מעמוד הבית |

### SL9 (primary TBD — link-only from)

| Secondary | Label |
|-----------|--------|
| `subjects/math` | סקירת כל המקצועות באתר |
| `subjects/geometry` | *(same pattern for all six `subjects/*`)* |
| `subjects/english` | |
| `subjects/hebrew` | |
| `subjects/science` | |
| `subjects/moledet-geography` | |
| `students/choose-subject-and-grade` | סרטון: סיור בכל המקצועות *(only if SL9 primary URL agreed — §4)* |

### Articles that should **not** receive workflow captures (remain placeholder only)

These already call `videoBlock` for the old 42-article plan but have **no** matching capture in this wave — leave `placeholder`:

`parents/welcome-and-overview`, `parent-dashboard-tour`, `student-pin-and-credentials`, `edit-or-delete-student`, `monthly-rewards`, `install-as-app`, `mobile-and-offline`, `troubleshooting-login`, `privacy-and-data`, all `parent-report/*` except **`report-overview`** (for #1 only), `students/avatar-and-profile`, `offline-games`, `tips-for-good-practice`, non-math/geometry `subjects/*`, etc.

---

## 4. Conflicts / decisions needed

| # | Conflict | Analysis | Recommendation |
|---|----------|----------|----------------|
| **C1** | **SL2 vs SL9** on `students/choose-subject-and-grade` | Both target learning hub; owner approved **SL2 = only embed** on this slug. SL9 cannot share without violating one-embed rule. | **SL2** remains sole embed on `choose-subject-and-grade`. **SL9** needs its own primary (C2). |
| **C2** | **SL9 — no manifest/article slot** | `/help/subjects` hub has **no** article body. No `students/subjects-overview` slug. `parent-report/subjects-overview` is a **parent report chart** — wrong audience and content. | **Preferred:** Add new article + manifest entry `students/subjects-hub-overview` (or `students/learning-subjects-overview`) in a **small content PR** before SL9 publish. **Fallback:** Hold SL9 in audit only until that exists. **Rejected:** Embed SL9 on `choose-subject-and-grade`; embed on `/help/subjects` index without code change. |
| **C3** | **SL7 — `daily-missions` vs `monthly-persistence`** | One video shows **both** panels. | **Primary: `daily-missions`**. Link from `monthly-persistence` with label clarifying both appear in the same video. **Owner:** confirm or swap primary. |
| **C4** | **Parent #1 vs #5** on report reading | Both touch short/detailed reports. | **Not a conflict** if #1 = `report-overview` (journey + Copilot) and #5 = `how-to-read-report` (reading pedagogy, no Copilot). Use cross-links only. |
| **C5** | **Parent #4 vs SL1** on login/home | Overlapping login footage. | **Not a conflict** — #4 = login article; SL1 = home tour. Cross-link; different primaries. |
| **C6** | **Pilot folder names ≠ manifest slugs** | e.g. `parent-report-ai` → `report-overview`. | Publish script must **map** audit folder → manifest `assets` paths (document in publish runbook). |
| **C7** | **Video #2 deferred** | `create-parent-account` has `videoBlock` + placeholder manifest. | Keep **placeholder**; no public copy; optional callout “סרטון בקרוב” later with owner Hebrew approval. |
| **C8** | **Block order vs policy “video before screenshots”** | Most articles currently: screenshot → video. | Publish wave includes **block reorder** in primary articles only (no Hebrew text changes). |
| **C9** | **`hints-and-explanations` has no screenshot** | SL5 is video-only in article. | Acceptable; optional screenshot capture later — not blocking. |
| **C10** | **42 manifest placeholders vs 15 workflow videos** | 27 articles keep empty video slots. | Expected — `videoBlock` stays no-op until those workflows are captured or placeholders removed in a separate cleanup (out of scope). |

### Owner decisions requested (minimal)

1. **SL9 primary home** — new student article slug (recommended) vs hold SL9 from publish batch.  
2. **SL7 primary** — `daily-missions` (recommended) vs `monthly-persistence`.  
3. **Publish batching** — parent+student together vs parent first.  
4. **Block reorder** — approve mechanical reorder (intro → video → screenshots) without Hebrew copy edits.

---

## 5. Implementation plan (future — do not execute yet)

### Phase A — Prep

1. Owner signs off this recommendation + §4 decisions.  
2. Freeze audit WebM paths listed in [VIDEO_TUTORIALS_VISUAL_REVIEW_INDEX.md](./VIDEO_TUTORIALS_VISUAL_REVIEW_INDEX.md).  
3. If SL9 approved: add `students/subjects-hub-overview` article in `students.js` + manifest entry (42 → 43) — **only with owner approval**.

### Phase B — Copy assets

For each approved workflow (excluding #2 and pending SL9):

| Step | Action |
|------|--------|
| B1 | Copy `qa-evidence-audit/.../main.webm` → `public/help-center/videos/<section>/<slug>/{desktop,mobile}/main.webm` per §1 table. |
| B2 | Generate `main.jpg` poster per viewport (existing pipeline / `help:publish-videos`). |
| B3 | Verify file sizes non-zero; desktop/mobile pairs match. |

**Pilot → manifest copy map:**

| Audit folder | Copy to public prefix |
|--------------|------------------------|
| `parent-video-pilot/parent-report-ai` | `help-center/videos/parent-report/report-overview/` |
| `parent-video-pilot/add-students` | `help-center/videos/parents/add-students/` |
| `parent-video-pilot/student-login` | `help-center/videos/students/student-login/` |
| `parent-video-pilot/how-to-read-report` | `help-center/videos/parents/how-to-read-report/` |
| `parent-video-pilot/parent-copilot` | `help-center/videos/parents/parent-copilot/` |
| `student-video-pilot/student-home-tour` | `help-center/videos/students/student-home-tour/` |
| `student-video-pilot/start-practice` | `help-center/videos/students/choose-subject-and-grade/` |
| `student-video-pilot/math-step-explanation` | `help-center/videos/subjects/math/` |
| `student-video-pilot/geometry-step-explanation` | `help-center/videos/subjects/geometry/` |
| `student-video-pilot/wrong-answer-help` | `help-center/videos/students/hints-and-explanations/` |
| `student-video-pilot/streak-and-progress` | `help-center/videos/students/answering-questions/` |
| `student-video-pilot/daily-missions-journey` | `help-center/videos/students/daily-missions/` |
| `student-video-pilot/games-arcade` | `help-center/videos/students/coins-and-arcade/` |
| `student-video-pilot/subjects-overview` | **TBD** after C2 resolved |

### Phase C — Manifest

1. For each published workflow only, set `assetKind: "captured"` on the matching manifest id (e.g. `parent-report/report-overview/main`).  
2. Leave all other 42 entries as **`placeholder`**.  
3. Set `durationSecTarget` / optional `transcriptHe` if available from `capture-meta.json`.  
4. Confirm each entry has `viewports: ["desktop", "mobile"]` and `assets.desktop` / `assets.mobile` webm paths.

### Phase D — Article wiring (minimal)

1. **Reorder blocks** on primary articles: intro content → `videoBlock` → `screenshotBlock`(s) → rest.  
2. **Do not** change paragraph/list Hebrew without owner approval.  
3. Add **`relatedLinks`** on secondary articles (§3) in a separate copy-approved pass.  
4. **Do not** add second `videoBlock` on any secondary article.

### Phase E — Verify

```bash
npm run help:verify-videos
```

Expect: only flipped entries require files in `public/`; placeholders must **not** exist on disk.

Run Help Center visual QA (desktop + mobile) on all primary URLs in §2 summary table.

### Phase F — Player behavior checklist

- [ ] `HelpVideoEmbed` switches at 640px (`MOBILE_MQ`) — test both viewports.  
- [ ] Lazy mount + no autoplay preserved.  
- [ ] Posters load from manifest `assets[vp].poster`.  
- [ ] Empty `videoBlock` (placeholder) still renders nothing — no broken `<video>` on non-published articles.

---

## 6. Safety checks for publish phase

| Check | Intent |
|-------|--------|
| No placeholder WebMs in `public/` | `help:verify-videos` rejects placeholder files on disk |
| No duplicate WebMs across manifest ids | One capture per `assetKind: captured` entry |
| No real/private data in approved files | Re-run `help:video-data-safety-review` or manual spot-check |
| All desktop/mobile pairs exist | 28 files for published set; no zero-byte |
| No missing mobile version | Every flipped entry has both viewports |
| No broken articles | `next build` + spot-check each primary URL |
| No screenshot deletion | Reorder only; manifests/screenshots unchanged |
| No Hebrew body edits without approval | `relatedLinks` labels in §3 are proposals only |
| `ישראל ישראלי` / demo accounts only | Especially parent report + student learning videos |
| Video #3 isolated parent | Confirm no demo-child credential mutation in prod QA account |
| Copilot captures | Product must not depend on capture-only Bearer injection |
| SL9 scope | Do not publish arcade/offline confusion on `coins-and-arcade` / `offline-games` |

---

## Audit verification (this task)

| Check | Result |
|-------|--------|
| `public/help-center/videos/` | Not used (no publish) |
| Manifest `assetKind: "captured"` | **0** entries |
| Article files edited | **No** |
| Screenshots / product / legal / security | **Not touched** |
| Git commit / push | **No** |

---

## Related machine-readable data

- [qa-evidence-audit/video-tutorials-review-summary.json](../../qa-evidence-audit/video-tutorials-review-summary.json) — durations, sizes, frame counts for all 28 WebMs.
