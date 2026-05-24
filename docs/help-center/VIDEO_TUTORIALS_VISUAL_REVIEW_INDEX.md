# Video Tutorials — Visual Review Index

- **Purpose:** Owner visual review of **raw captured WebMs** (technical capture wave complete).
- **Generated:** 2026-05-24
- **Machine-readable companion:** [qa-evidence-audit/video-tutorials-review-summary.json](../../qa-evidence-audit/video-tutorials-review-summary.json)
- **Status docs:** [VIDEO_TUTORIALS_CURRENT_STATUS.md](./VIDEO_TUTORIALS_CURRENT_STATUS.md) · [VIDEO_TUTORIALS_MASTER_PLAN.md](./VIDEO_TUTORIALS_MASTER_PLAN.md) · [STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md](./STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md)

**This is review-prep only.** Nothing here publishes, wires Help Center articles, or flips the manifest. After your review we will decide **approved** vs **recapture**, then plan a separate publish/wiring wave.

---

## How to review

1. Open each **desktop** and **mobile** `main.webm` below (paths are repo-relative from project root).
2. Play at **1×** first; use pause/scrub for Hebrew captions and fine UI.
3. Mark each workflow in your notes: **approved** · **technical pass** (keep but minor fixes) · **deferred** · **needs recapture**.
4. Parent workflows **#1, #3–#6** were previously owner-approved on capture quality; this pass can **confirm** or **downgrade** before publish.
5. All **student SL1–SL9** files are **technical pass** only until you approve them here.

**Base folders**

| Track | Folder |
|-------|--------|
| Parent | `qa-evidence-audit/parent-video-pilot/` |
| Student | `qa-evidence-audit/student-video-pilot/` |

---

## Deferred workflow (no WebM)

### Video #2 — רישום הורה וכניסה ראשונה

| Field | Value |
|-------|--------|
| **Status** | **deferred** |
| **Desktop WebM** | *(none)* |
| **Mobile WebM** | *(none)* |
| **Reason** | True parent signup does not reliably reach `/parent/dashboard` in preflight (signup/session/email-confirmation gate). **Do not** substitute fake signup footage. |
| **Artifact only** | `qa-evidence-audit/parent-video-pilot/create-parent-account/desktop/preflight-report.json` |
| **Retry when** | Dev/Supabase signup completes reliably in preflight |

---

## Global reviewer checklist

For **every** video (each desktop + mobile file), confirm:

| Check | |
|-------|---|
| ☐ | No blank/white opening (first ~3 s should show real UI) |
| ☐ | No error pages (404, 500, “משהו השתבש”, empty Copilot errors) |
| ☐ | No long loading-only sections (spinners dominate the frame) |
| ☐ | No debug overlays (Playwright borders, console, dev-only badges beyond capture captions) |
| ☐ | Hebrew captions readable (not clipped; not covering primary action) |
| ☐ | Desktop/mobile layout correct for viewport (1366×900 desktop; 390×844 mobile) |
| ☐ | No private data exposed (real emails, phone numbers, non-demo names) |
| ☐ | Correct child/account shown (`ישראל ישראלי` where expected; isolated disposable child for add-child only) |
| ☐ | Required workflow actually happens (not lobby-only or static Help page) |
| ☐ | **Math / Geometry (SL3, SL4):** step-by-step explanation UI visible (📘 הסבר מלא, ≥2 step titles) |
| ☐ | **Copilot (#1, #6):** answers useful in Hebrew, not errors/clarification-only |
| ☐ | **Add-child / signup-like (#3, #2 when retried):** no real PII; **no mutation** of `ישראל ישראלי` credentials |

---

# Parent videos

QA parent (`E2E_PARENT_*`) + demo child **`ישראל ישראלי`** unless noted. Capture overlays = Hebrew captions + highlights only.

---

## Video #1 — מדריך להורה — כניסה לדוח ושימוש ב-AI

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/parent-video-pilot/parent-report-ai/desktop/main.webm` | `qa-evidence-audit/parent-video-pilot/parent-report-ai/mobile/main.webm` |
| **Duration** | 66 s | 71 s |
| **Frame count** | 528 @ 8 fps | 568 @ 8 fps |
| **Status** | approved | approved |

**What the video should show:** Parent login → dashboard → select demo child → short report → detailed report → one practical Copilot question → useful Hebrew answer → closing caption on follow-up.

**What the reviewer should check:** Child card is **`ישראל ישראלי`**; report sections have data (not empty); transition short → detailed is clear; Copilot answer is substantive; mobile scroll does not hide the answer.

**Known caveats:** Copilot uses **capture-only** Bearer route injection on `/api/parent/copilot-turn` (not product behavior). Report data depends on `help:seed-demo-report`. Unique frame hash count is low in meta (27 desktop) — verify visually that motion is sufficient.

---

## Video #3 — הוספת ילד וקבלת קוד תלמיד

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/parent-video-pilot/add-students/desktop/main.webm` | `qa-evidence-audit/parent-video-pilot/add-students/mobile/main.webm` |
| **Duration** | 65 s | 65 s |
| **Frame count** | 520 @ 8 fps | 520 @ 8 fps |
| **Status** | approved | approved |

**What the video should show:** Isolated capture parent → add child form → create → new child card → student username + PIN shown (masked PIN field) → confirmation caption.

**What the reviewer should check:** Disposable child name (e.g. `ילד לדוגמה וידאו`), **not** `ישראל ישראלי`; no real parent email; credentials block readable on mobile after scroll; PIN never read aloud in UI.

**Known caveats:** Uses **ephemeral isolated parent** (`parent-video-isolated-*@example.com`), not shared `E2E_PARENT_*`. **Data writes** occur; demo child cleaned in tooling after capture. Meta records disposable username `videochild…` — confirm it is not a production account.

---

## Video #4 — כניסת תלמיד עם קוד ו-PIN

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/parent-video-pilot/student-login/desktop/main.webm` | `qa-evidence-audit/parent-video-pilot/student-login/mobile/main.webm` |
| **Duration** | 47 s | 47 s |
| **Frame count** | 376 @ 8 fps | 376 @ 8 fps |
| **Status** | approved | approved |

**What the video should show:** `/student/login` → past session check → `ADMIN` + PIN → student home with greeting and subject entry.

**What the reviewer should check:** No infinite `בודקים חיבור…`; home shows expected student identity; PIN field masked; mobile keyboard not dominating frame.

**Known caveats:** Shorter than 50–70 s target but verification passed. Overlaps narratively with student **SL1** (SL1 is the canonical home tour).

---

## Video #5 — קריאת דוח הורים — דוח קצר מול דוח מקיף

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/parent-video-pilot/how-to-read-report/desktop/main.webm` | `qa-evidence-audit/parent-video-pilot/how-to-read-report/mobile/main.webm` |
| **Duration** | 68 s | 72 s |
| **Frame count** | 544 @ 8 fps | 576 @ 8 fps |
| **Status** | approved | approved |

**What the video should show:** Short report overview → switch/open detailed report → **two** detailed sections highlighted → **no** Copilot typing (complements #1).

**What the reviewer should check:** Copilot panel not focused; period chips readable; mobile scroll limited (~3 intentional scrolls); disclaimer/summary blocks visible.

**Known caveats:** Intentionally avoids Copilot to differ from Video #1. Requires seeded report data.

---

## Video #6 — שימוש ב-Copilot לשאלות המשך

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/parent-video-pilot/parent-copilot/desktop/main.webm` | `qa-evidence-audit/parent-video-pilot/parent-copilot/mobile/main.webm` |
| **Duration** | 61 s | 67 s |
| **Frame count** | 488 @ 8 fps | 536 @ 8 fps |
| **Status** | approved | approved |

**What the video should show:** Loaded detailed report → **two** Copilot question turns → quick-action chip → both answers visible and useful.

**What the reviewer should check:** Second answer on mobile not off-screen; no rate-limit/error strings; Hebrew quality; child context matches demo report.

**Known caveats:** Same capture-only Bearer injection as #1. Thin report data may yield weak answers — re-seed if answers look generic.

---

# Student learning videos

Account: **`ADMIN` / `1234`** → child **`ישראל ישראלי`**. All SL1–SL9: **technical pass** (awaiting owner visual approval).

---

## SL1 — כניסת תלמיד ועמוד הבית

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/student-home-tour/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/student-home-tour/mobile/main.webm` |
| **Duration** | 63.5 s | 63.5 s |
| **Frame count** | 508 @ 8 fps | 508 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Login → home greeting → subject cards → coins/stats → daily missions → monthly journey/persistence if rendered.

**What the reviewer should check:** Name **`ישראל ישראלי`** (or player name); ≥4 subject entries; missions + journey panels visible or acceptably skipped with caption.

**Known caveats:** API login used in capture (not typing on login form). Canonical home tour — do not confuse with parent Video #4 only.

---

## SL2 — איך מתחילים תרגול במקצוע

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/start-practice/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/start-practice/mobile/main.webm` |
| **Duration** | 52 s | 52 s |
| **Frame count** | 416 @ 8 fps | 416 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Home → learning hub → **חשבון** → `math-master` → grade/operation → start → **one** live question → **one correct** answer → brief feedback.

**What the reviewer should check:** Real question UI (not lobby-only); feedback visible; mobile chip wrapping readable.

**Known caveats:** Shorter than 60–80 s target. **Primary future embed:** `students/choose-subject-and-grade`. Writes answer progress for demo student.

---

## SL3 — תרגול בחשבון — הסבר צעד־צעד **(mandatory)**

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/math-step-explanation/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/math-step-explanation/mobile/main.webm` |
| **Duration** | 58 s | 58 s |
| **Frame count** | 464 @ 8 fps | 464 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Math learning mode → question → answer → feedback → **📘 הסבר מלא** → modal with **≥2 step titles** and step navigation.

**What the reviewer should check:** Explanation is full modal/panel, not inline hint only; steps legible on mobile; caption explains step-by-step usage.

**Known caveats:** Preflight signals: `explanationOpen`, `explanationSteps` true. Below 65–85 s desktop target — confirm explanation hold time is long enough for learners.

---

## SL4 — תרגול בגאומטריה — הסבר צעד־צעד **(mandatory)**

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/geometry-step-explanation/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/geometry-step-explanation/mobile/main.webm` |
| **Duration** | 58 s | 58 s |
| **Frame count** | 464 @ 8 fps | 464 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Geometry learning → **diagram/shape visible** → answer → feedback → full explanation with diagram + steps.

**What the reviewer should check:** Diagram not cropped on mobile; same step-by-step bar as SL3; topic selection not confusing.

**Known caveats:** Topic picked via DOM `selectedIndex` workaround during capture. Diagram must be on screen ≥5 s per plan.

---

## SL5 — מה קורה כשטועים בשאלה

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/wrong-answer-help/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/wrong-answer-help/mobile/main.webm` |
| **Duration** | 42.5 s | 42.5 s |
| **Frame count** | 340 @ 8 fps | 340 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Intentional **wrong** answer → incorrect feedback → open explanation → 1–2 corrective steps → continue (no long grind).

**What the reviewer should check:** Wrong path is obvious; explanation opens **after** wrong answer; only QA/demo data affected.

**Known caveats:** Shortest student workflow; below 55–75 s target — confirm pacing still teaches the mistake→help loop.

---

## SL6 — רצף, ניקוד והתקדמות

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/streak-and-progress/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/streak-and-progress/mobile/main.webm` |
| **Duration** | 39 s | 39 s |
| **Frame count** | 312 @ 8 fps | 312 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** 2–3 quick correct answers in math learning → streak/score/coins/badges update.

**What the reviewer should check:** Visible delta between answers; no marathon session; progress UI not hidden by captions.

**Known caveats:** Below 50–70 s target; verify streak counter actually changes on screen.

---

## SL7 — משימות יומיות / מסע התקדמות חודשי

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/daily-missions-journey/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/daily-missions-journey/mobile/main.webm` |
| **Duration** | 44.5 s | 44.5 s |
| **Frame count** | 356 @ 8 fps | 356 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Home → daily missions panel → monthly journey/persistence → “what to do next” copy.

**What the reviewer should check:** Both panels have Hebrew copy; mobile scroll missions → journey (≤2 scrolls); missions not accidentally completed unless needed for visibility.

**Known caveats:** Feature flags could hide panels in other envs — verify content matches your demo flags.

---

## SL8 — משחקים ותרגול חווייתי

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/games-arcade/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/games-arcade/mobile/main.webm` |
| **Duration** | 44 s | 44 s |
| **Frame count** | 352 @ 8 fps | 352 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** `/student/arcade` only (not offline hub) → coin balance if shown → pick game → **≤15 s** sample play → caption on fun vs practice.

**What the reviewer should check:** No long match; no arcade load failure; scope is online arcade only per approved plan.

**Known caveats:** Arcade room join may write ephemeral room state. WebSocket/env issues would show as loading stalls.

---

## SL9 — סקירת מקצועות באתר

| Field | Desktop | Mobile |
|-------|---------|--------|
| **WebM path** | `qa-evidence-audit/student-video-pilot/subjects-overview/desktop/main.webm` | `qa-evidence-audit/student-video-pilot/subjects-overview/mobile/main.webm` |
| **Duration** | 43.5 s | 43.5 s |
| **Frame count** | 348 @ 8 fps | 348 @ 8 fps |
| **Status** | technical pass | technical pass |

**What the video should show:** Learning hub tour across subjects (Math, Geometry, Hebrew, English, Science, Moledet, etc.) — entry points, not full lessons.

**What the reviewer should check:** Distinct from SL2 (no deep math session); subjects identifiable; **link-only** future embed (not primary on `choose-subject-and-grade`).

**Known caveats:** Shortest overview; largest desktop file size (~2.2 MB) — check compression artifacts if any.

---

## File audit (2026-05-24)

| Check | Result |
|-------|--------|
| All 28 listed WebMs exist | **PASS** |
| Zero-byte files | **none** |
| Duplicate WebM paths | **none** |
| Files under `public/help-center/videos/` | **none** (directory does not exist) |
| Manifest `assetKind: "captured"` entries | **0** |
| Help Center article wiring / publish | **not performed** |

Regenerate summary: `node qa-evidence-audit/build-video-review-summary.mjs`

---

## Quick path list (28 WebMs)

<details>
<summary>Click to expand all paths</summary>

**Parent (10)**

- `qa-evidence-audit/parent-video-pilot/parent-report-ai/desktop/main.webm`
- `qa-evidence-audit/parent-video-pilot/parent-report-ai/mobile/main.webm`
- `qa-evidence-audit/parent-video-pilot/add-students/desktop/main.webm`
- `qa-evidence-audit/parent-video-pilot/add-students/mobile/main.webm`
- `qa-evidence-audit/parent-video-pilot/student-login/desktop/main.webm`
- `qa-evidence-audit/parent-video-pilot/student-login/mobile/main.webm`
- `qa-evidence-audit/parent-video-pilot/how-to-read-report/desktop/main.webm`
- `qa-evidence-audit/parent-video-pilot/how-to-read-report/mobile/main.webm`
- `qa-evidence-audit/parent-video-pilot/parent-copilot/desktop/main.webm`
- `qa-evidence-audit/parent-video-pilot/parent-copilot/mobile/main.webm`

**Student (18)**

- `qa-evidence-audit/student-video-pilot/student-home-tour/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/start-practice/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/math-step-explanation/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/geometry-step-explanation/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/wrong-answer-help/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/streak-and-progress/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/daily-missions-journey/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/games-arcade/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/subjects-overview/{desktop,mobile}/main.webm`

</details>

---

## After review (not in this step)

1. Record per-workflow decisions: **approved** / **needs recapture** / keep **deferred** (#2).
2. Only then plan: copy to `public/help-center/videos/`, manifest `assetKind`, article `videoBlock` order, screenshot moves below video.
