# Student Learning Video Tutorials — Addendum Plan

- **Status:** **APPROVED** — capture wave in progress (2026-05-24)
- **Last updated:** 2026-05-24
- **Companion doc:** [VIDEO_TUTORIALS_MASTER_PLAN.md](./VIDEO_TUTORIALS_MASTER_PLAN.md) (parent / report workflows)
- **Scope:** General workflow videos for **real student learning** on the product (not Help Center tours, not one video per article)

---

## Relationship to the parent-video wave

The **6-video parent/report set** in `VIDEO_TUTORIALS_MASTER_PLAN.md` is **not** full tutorial coverage for the site. It covers parent login, dashboard, reports, Copilot, signup (blocked), add-child, and **basic** student login (`Video #4`).

This addendum defines a **second video set** (9 workflows × desktop + mobile) focused on:

- Student home and learning hub
- Real practice sessions (Math + Geometry **mandatory** with live step-by-step explanation UI)
- Wrong-answer help, progress/streak, missions/journey, games, subject overview

### Parent-wave completion gate (must be true before student capture)

| Item | State (2026-05-24) |
|------|---------------------|
| Videos 1, 5 desktop, 5 mobile, 6, 4, 3 captured | Technical pass or approved under `qa-evidence-audit/parent-video-pilot/` |
| Video 2 (parent signup) | **Blocked** — does not block student set, but parent wave should be **reported** before student work starts |
| Publish / manifest / screenshots | **None** (unchanged) |

**Owner approvals (2026-05-24):**

- Addendum **approved** for capture.
- **SL2** is the primary embed on `students/choose-subject-and-grade`; **SL9** is link-only (no second embed).
- Capture order: Math before Geometry; arcade scope is online `/student/arcade` only (no `/offline` workflow).
- Parent wave signed off except Video **#2** (deferred).

---

## Global production rules (same spirit as parent plan)

| Rule | Detail |
|------|--------|
| Workflow videos | **Not** one video per Help Center article |
| Primary embed | **One** primary article per workflow; secondaries **link only** |
| Screenshots | Stay canonical; at future publish time move **below** video |
| Real product only | No fake static Help Center substitutes for learning UI |
| Account | QA/demo student **`ADMIN` / `1234`** tied to **`ישראל ישראלי`** (`npm run help:provision-demo` if access code missing) |
| Viewports | Desktop **1366×900**; mobile **390×844** |
| Output (audit only) | `qa-evidence-audit/student-video-pilot/<slug>/{desktop\|mobile}/main.webm` |
| Future public path | `help-center/videos/<section>/<slug>/{desktop\|mobile}/main.webm` |
| Tooling | `scripts/student-video-pilot/**` — `npm run student-video:preflight`, `student-video:capture`, `student-video:wave` |
| No publish / wiring / screenshots / product / legal / security / commit / push | Until explicit later wave |

### Data-write policy

Most learning captures **write** session/answer/progress rows for the demo student. That is acceptable **only** for `ADMIN` / demo child data. Preflight must confirm:

- No real/private student PII in frame  
- Captures use **minimal** answers (2–4 questions where “few answers” is enough)  
- Wrong-answer video uses **intentional** wrong input on QA data only  

---

## Coverage mapping (Help Center vs product)

| Help Center area | Parent/report set | This student set |
|------------------|-------------------|------------------|
| מדריך להורים | Videos 1, 5, 6, 3, 2 (blocked) | — |
| הסבר דוח הורים | Videos 1, 5, 6 | — |
| מדריך לתלמידים | Video #4 (login only) | **Videos SL1–SL8** (home, practice, missions, games) |
| מדריכי מקצועות | Screenshots only | **SL3 Math**, **SL4 Geometry**, **SL9 overview** + **SL2** practice entry |

---

# Video catalog (9 workflows)

Each workflow needs **desktop + mobile** approval before it is `complete`.

Completion = desktop approved **and** mobile approved **and** both pass technical verification.

---

## SL1 — כניסת תלמיד ועמוד הבית

| Field | Value |
|-------|--------|
| **Title** | כניסת תלמיד ועמוד הבית |
| **Goal** | Show student login and the student home: identity, subjects entry, coins/progress cues, missions/journey if visible. |
| **Route / user flow** | `/student/login` → wait past `בודקים חיבור…` → fill `ADMIN` + PIN → `/student/home` → hold on greeting (**ישראל ישראלי** or player name) → scroll/highlight subject cards → show coins/stats → show daily missions panel → show monthly journey / persistence block if rendered |
| **Desktop required** | Yes (1366×900) |
| **Mobile required** | Yes (390×844); tap ripple; scroll to missions/journey if below fold |
| **Expected duration** | Desktop **55–75 s** / mobile **60–85 s** |
| **Changes data** | **No** (session cookie only) |
| **QA / demo account** | `ADMIN` / `1234`; `help:provision-demo` if login fails |
| **Preflight checks** | API + UI login; `/student/home` loads; name visible; ≥4 subject entry points; missions or monthly block visible **or** documented “feature off” skip in capture script |
| **Blockers** | Missing access code; wrong child name; infinite session spinner; empty home dashboard |
| **Step-by-step UI** | N/A |
| **Output paths** | `qa-evidence-audit/student-video-pilot/student-home-tour/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/student-home-tour` — [/help/students/student-home-tour](../../pages/help/students/student-home-tour) |
| **Secondary (link-only)** | `students/student-login`, `students/daily-missions`, `students/monthly-persistence`, `students/choose-subject-and-grade` |

**Note:** Parent **Video #4** covers login → home briefly; **SL1** is the canonical **home tour** (do not duplicate embed on `student-login`).

---

## SL2 — איך מתחילים תרגול במקצוע

| Field | Value |
|-------|--------|
| **Title** | איך מתחילים תרגול במקצוע |
| **Goal** | Show the standard path from home to the first answered question in any subject (use **Math** as the example subject). |
| **Route / user flow** | `/student/home` → link **אזור לימודים** or subject card → `/learning` → tap **חשבון** → `/learning/math-master` → select grade + operation (defaults OK) → **התחל** / enter learning mode → show **one live question** → submit **one correct answer** → brief feedback (no long session) |
| **Desktop required** | Yes |
| **Mobile required** | Yes; scroll grade/operation chips if wrapped |
| **Expected duration** | Desktop **60–80 s** / mobile **70–90 s** |
| **Changes data** | **Yes** — session start + ≥1 answer for demo student |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | `math-master` loads; learning mode starts; question renders; answer accepted; feedback visible |
| **Blockers** | Not logged in; lobby stuck; no questions generated; grade mismatch empty bank |
| **Step-by-step UI** | Not required in this video (only first answer + short feedback) |
| **Output paths** | `qa-evidence-audit/student-video-pilot/start-practice/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/choose-subject-and-grade` |
| **Secondary (link-only)** | `students/student-home-tour`, `students/answering-questions`, `subjects/math` |

---

## SL3 — תרגול בחשבון — שאלה, תשובה והסבר צעד־צעד **(MANDATORY)**

| Field | Value |
|-------|--------|
| **Title** | תרגול בחשבון — שאלה, תשובה והסבר צעד־צעד |
| **Goal** | Show a **real** Math practice question, post-answer feedback, and the **live step-by-step explanation modal** (`showSolution` / `📘 הסבר מלא`). |
| **Route / user flow** | Logged-in → `/learning/math-master` → start learning → **hold on question text** → submit answer → hold **correct/incorrect feedback** → tap **📘 הסבר מלא** (or equivalent) → **hold explanation modal** with **≥2 steps** visible (`activeStep.title`, step navigation if shown) → optionally one step with **animation** if it auto-plays |
| **Desktop required** | Yes |
| **Mobile required** | Yes; scroll so explanation modal + step list are fully visible; avoid OS keyboard in frame (programmatic fill) |
| **Expected duration** | Desktop **65–85 s** / mobile **75–95 s** |
| **Changes data** | **Yes** — 1–2 answers + explanation view (read-only after answer) |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | **Mandatory:** explanation modal opens; `isShowingAnySolution` true; step titles visible; not lobby-only frame; prefight fails if only static help text |
| **Blockers** | Explanation button missing; modal empty; zero animation steps; capture shows curriculum lobby only |
| **Step-by-step requirements (exact)** | 1) Real question UI in `mode === "learning"`. 2) Visible answer feedback after submit. 3) Open **full explanation** (modal/panel), not inline hint only. 4) Capture **≥2 distinct step titles** in explanation. 5) Caption explains “איך משתמשים בהסבר צעד־אחר־צעד”. |
| **Output paths** | `qa-evidence-audit/student-video-pilot/math-step-explanation/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `subjects/math` |
| **Secondary (link-only)** | `students/hints-and-explanations`, `students/answering-questions`, `students/choose-subject-and-grade` |

**DOM hints for capture tooling:** `showSolution`, `activeStep`, button text `הסבר מלא`, route `/learning/math-master`.

---

## SL4 — תרגול בגאומטריה — שאלה חזותית והסבר צעד־צעד **(MANDATORY)**

| Field | Value |
|-------|--------|
| **Title** | תרגול בגאומטריה — שאלה חזותית והסבר צעד־צעד |
| **Goal** | Show a **visual** Geometry item (diagram/shape) and the same **step-by-step explanation** pattern as Math. |
| **Route / user flow** | `/learning/geometry-master` → pick topic with diagram-friendly question (preflight selects topic) → learning mode → highlight **diagram/shape** (`GeometryExplanationDiagram` or canvas) → answer → feedback → **📘 הסבר מלא** → hold modal with diagram **and** steps |
| **Desktop required** | Yes |
| **Mobile required** | Yes; ensure diagram not cropped; may require scroll inside modal |
| **Expected duration** | Desktop **65–85 s** / mobile **75–95 s** |
| **Changes data** | **Yes** |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | Question with non-empty diagram spec; explanation opens; diagram visible in capture frames |
| **Blockers** | Text-only geometry item with no diagram; explanation without `GeometryExplanationDiagram` |
| **Step-by-step requirements (exact)** | Same as SL3, plus: **diagram/shape visible** in question or explanation for **≥5 s** of hold time. |
| **Output paths** | `qa-evidence-audit/student-video-pilot/geometry-step-explanation/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `subjects/geometry` |
| **Secondary (link-only)** | `students/hints-and-explanations`, `subjects/math` (compare numeric vs visual) |

---

## SL5 — מה קורה כשטועים בשאלה

| Field | Value |
|-------|--------|
| **Title** | מה קורה כשטועים בשאלה |
| **Goal** | Safe demo of a **wrong** answer and how the product helps (feedback + explanation). |
| **Route / user flow** | Continue or new short session on `math-master` (or geometry if math bank thin) → **intentionally wrong answer** → hold error/incorrect feedback → open **הסבר מלא** → show 1–2 corrective steps → tap continue / next (no grind) |
| **Desktop required** | Yes |
| **Mobile required** | Yes |
| **Expected duration** | Desktop **55–75 s** / mobile **60–85 s** |
| **Changes data** | **Yes** — one deliberate wrong attempt on QA data |
| **QA / demo account** | `ADMIN` / `1234` only |
| **Preflight checks** | Wrong answer triggers visible “לא נכון” (or equivalent) + explanation available |
| **Blockers** | UI accepts any answer; no feedback; explanation blocked |
| **Step-by-step requirements** | Wrong feedback visible; explanation opened after wrong answer (not only after correct). |
| **Output paths** | `qa-evidence-audit/student-video-pilot/wrong-answer-help/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/hints-and-explanations` |
| **Secondary (link-only)** | `subjects/math`, `students/answering-questions` |

---

## SL6 — רצף, ניקוד והתקדמות

| Field | Value |
|-------|--------|
| **Title** | רצף, ניקוד והתקדמות |
| **Goal** | Show score/streak/coins/badges updating across a few quick correct answers (no long gameplay). |
| **Route / user flow** | `math-master` learning mode → answer **2–3** questions correctly in a row → highlight streak counter / points / badge toast if triggered → stop before marathon |
| **Desktop required** | Yes |
| **Mobile required** | Yes |
| **Expected duration** | Desktop **50–70 s** / mobile **55–75 s** |
| **Changes data** | **Yes** — few answers only |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | Streak or score UI updates between answers; at least one progress signal visible |
| **Blockers** | UI does not surface streak; profile patch fails silently |
| **Step-by-step UI** | Not required |
| **Output paths** | `qa-evidence-audit/student-video-pilot/streak-and-progress/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/answering-questions` |
| **Secondary (link-only)** | `students/tips-for-good-practice`, `students/coins-and-arcade` |

---

## SL7 — משימות יומיות / מסע התקדמות חודשי

| Field | Value |
|-------|--------|
| **Title** | משימות יומיות / מסע התקדמות חודשי |
| **Goal** | Show daily missions and monthly journey / persistence UI on student home. |
| **Route / user flow** | `/student/home` → highlight **משימות יומיות** panel → expand/scroll tasks → highlight **מסע התמדה חודשי** / progress bar / `StudentMonthlyPersistencePanel` / monthly journey minutes → show “what to do next” copy |
| **Desktop required** | Yes |
| **Mobile required** | Yes; **2 intentional scrolls** max (missions → journey) |
| **Expected duration** | Desktop **55–75 s** / mobile **65–90 s** |
| **Changes data** | **No** (read-only home; mission completion optional — **do not** complete missions in capture unless required for visibility) |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | Both panels render with non-empty Hebrew copy; monthly progress % visible |
| **Blockers** | Feature flags hide panels; empty mission list |
| **Step-by-step UI** | N/A |
| **Output paths** | `qa-evidence-audit/student-video-pilot/daily-missions-journey/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/daily-missions` |
| **Secondary (link-only)** | `students/monthly-persistence`, `students/student-home-tour` |

---

## SL8 — משחקים ותרגול חווייתי

| Field | Value |
|-------|--------|
| **Title** | משחקים ותרגול חווייתי |
| **Goal** | Brief tour of online games (arcade): pick a game, **very short** sample, explain fun/engagement vs structured practice. |
| **Route / user flow** | `/student/arcade` → show coin balance if visible → highlight one game card (e.g. **fourline** or **ludo**) → enter game room → **≤15 s** gameplay (one move or round start) → return or overlay caption; **no long match** |
| **Desktop required** | Yes |
| **Mobile required** | Yes |
| **Expected duration** | Desktop **50–70 s** / mobile **55–75 s** |
| **Changes data** | **Maybe** — arcade room join may write room state; prefer **observe-only** preflight route if possible |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | `/api/arcade/games` OK; at least one game launches; no auth errors |
| **Blockers** | Arcade disabled in env; WebSocket/room stuck on loading |
| **Step-by-step UI** | N/A |
| **Output paths** | `qa-evidence-audit/student-video-pilot/games-arcade/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/coins-and-arcade` |
| **Secondary (link-only)** | `students/offline-games`, `students/student-home-tour` |

---

## SL9 — סקירת מקצועות באתר

| Field | Value |
|-------|--------|
| **Title** | סקירת מקצועות באתר |
| **Goal** | Show all **6 subjects** and where a child chooses what to learn (overview only, no deep practice in each). |
| **Route / user flow** | `/learning` (hub) → hold grid of subjects: **חשבון, גיאומטריה, עברית, אנגלית, מדעים, מולדת וגיאוגרפיה** → tap into **2 subjects** max (e.g. Math + Hebrew) → show **lobby/top** of master page only (**≤3 s** each) → return to hub → closing caption |
| **Desktop required** | Yes |
| **Mobile required** | Yes; vertical scroll on hub |
| **Expected duration** | Desktop **60–80 s** / mobile **70–90 s** |
| **Changes data** | **No** |
| **QA / demo account** | `ADMIN` / `1234` |
| **Preflight checks** | All six tiles visible on `/learning`; each `*-master` route loads |
| **Blockers** | Missing subject tile; hub redirects to login |
| **Step-by-step UI** | Not required (lobby/peek only) |
| **Output paths** | `qa-evidence-audit/student-video-pilot/subjects-overview/{desktop,mobile}/main.webm` |
| **Primary Help Center article** | `students/choose-subject-and-grade` (or split: add short pointer from `subjects/*` articles — **one** embed only here) |
| **Secondary (link-only)** | `subjects/math`, `subjects/geometry`, `subjects/english`, `subjects/hebrew`, `subjects/science`, `subjects/moledet-geography` |

**Subject routes (verified in repo):**

| Subject | Master route |
|---------|----------------|
| חשבון | `/learning/math-master` |
| גיאומטריה | `/learning/geometry-master` |
| עברית | `/learning/hebrew-master` |
| אנגלית | `/learning/english-master` |
| מדעים | `/learning/science-master` |
| מולדת/גיאוגרפיה | `/learning/moledet-geography-master` |

---

# Recommended capture order (after approval)

1. **SL1** — home (foundation)  
2. **SL2** — start practice  
3. **SL3** — Math step-by-step **(mandatory gate)**  
4. **SL4** — Geometry step-by-step **(mandatory gate)**  
5. **SL5** — wrong answer  
6. **SL6** — streak/progress  
7. **SL7** — missions/journey  
8. **SL9** — subjects overview (before games so hub is fresh)  
9. **SL8** — games (last; optional env risk)

---

# Future Help Center integration (not in this phase)

When publishing later, proposed primary embed mapping:

| Workflow | Section / slug | Public path (later) |
|----------|----------------|---------------------|
| SL1 | `students/student-home-tour` | `help-center/videos/students/student-home-tour/...` |
| SL2 | `students/choose-subject-and-grade` | `.../students/choose-subject-and-grade/...` |
| SL3 | `subjects/math` | `.../subjects/math/...` |
| SL4 | `subjects/geometry` | `.../subjects/geometry/...` |
| SL5 | `students/hints-and-explanations` | `.../students/hints-and-explanations/...` |
| SL6 | `students/answering-questions` | `.../students/answering-questions/...` |
| SL7 | `students/daily-missions` | `.../students/daily-missions/...` |
| SL8 | `students/coins-and-arcade` | `.../students/coins-and-arcade/...` |
| SL9 | `students/choose-subject-and-grade` | same primary as SL2 — **do not** second embed; use `relatedLinks` from subject articles |

**Embed rule (decided):** **SL2** is the sole primary embed on `students/choose-subject-and-grade`. **SL9** is link-only from subject articles and related links — no second embed on that article.

---

# Status board (student set)

| ID | Title | Desktop | Mobile | Workflow complete |
|----|-------|---------|--------|-------------------|
| SL1 | כניסת תלמיד ועמוד הבית | technical pass | technical pass | technical pass |
| SL2 | איך מתחילים תרגול במקצוע | technical pass | technical pass | technical pass |
| SL3 | תרגול בחשבון — הסבר צעד־צעד | technical pass | technical pass | technical pass |
| SL4 | תרגול בגאומטריה — הסבר צעד־צעד | technical pass | technical pass | technical pass |
| SL5 | מה קורה כשטועים בשאלה | technical pass | technical pass | technical pass |
| SL6 | רצף, ניקוד והתקדמות | technical pass | technical pass | technical pass |
| SL7 | משימות יומיות / מסע חודשי | technical pass | technical pass | technical pass |
| SL8 | משחקים ותרגול חווייתי | technical pass | technical pass | technical pass |
| SL9 | סקירת מקצועות באתר | technical pass | technical pass | technical pass |

Outputs under `qa-evidence-audit/student-video-pilot/`. Not published.

---

# What this addendum does NOT do

- Does not capture any student-learning video  
- Does not write to `public/`  
- Does not edit `videos-manifest.json` or article files  
- Does not touch screenshots  
- Does not modify product, legal, or security code  
- Does not commit or push  

---

# Open decisions for owner (before capture)

1. **SL2 vs SL9** — single primary embed on `students/choose-subject-and-grade` (see recommendation above).  
2. **Math vs Geometry first** after SL2 — order above prioritizes mandatory explanation videos early.  
3. **Arcade scope** — online `/student/arcade` only, or include `/offline` in a separate future workflow?  
4. **Parent Video #2** — resolve signup blocker before treating “all site tutorials” as complete.  
5. **Visual review** — approve parent-wave technical passes (especially mobile #5, #6, #4, #3) before student capture spend.

---

# Approval checklist

- [x] Owner approves this addendum plan (2026-05-24)  
- [x] SL2 primary embed on `students/choose-subject-and-grade`; SL9 link-only  
- [x] Parent-video wave reported (Video #2 deferred)  
- [x] `scripts/student-video-pilot/**` implemented; SL1–SL9 captured (technical pass)  
