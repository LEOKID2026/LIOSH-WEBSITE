# Video Tutorials — Current Status

- **Status:** Parent wave **complete except Video #2 (deferred)**; student capture wave **in progress**
- **Last updated:** 2026-05-24
- **Authoritative plans:**
  - Parent workflows: [VIDEO_TUTORIALS_MASTER_PLAN.md](./VIDEO_TUTORIALS_MASTER_PLAN.md)
  - Student learning: [STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md](./STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md)

This file is a **snapshot report** only. It does not publish, wire, or change product assets.

---

## Summary

| Track | State |
|-------|--------|
| Parent videos (#1–#6) | **5 of 6** workflows **complete** (owner-approved). Video **#2 deferred**. |
| Student learning (SL1–SL9) | Addendum **approved**; capture wave running via `scripts/student-video-pilot/` |
| Help overview pilot | **Excluded** — not part of approved deliverables |

---

## 1. Current parent video status

Base directory: `qa-evidence-audit/parent-video-pilot/`

**Completion rule:** Both desktop and mobile **approved** → workflow complete.

| # | Title | Desktop path | Mobile path | Desktop | Mobile | Workflow complete | Blocker | Visual review |
|---|--------|--------------|-------------|---------|--------|-------------------|---------|---------------|
| **1** | מדריך להורה — כניסה לדוח ושימוש ב-AI | `parent-report-ai/desktop/main.webm` | `parent-report-ai/mobile/main.webm` | **approved** | **approved** | **yes** | — | done |
| **2** | רישום הורה וכניסה ראשונה | `create-parent-account/desktop/main.webm` | `create-parent-account/mobile/main.webm` | **deferred** | **deferred** | **no** | Signup/session/email-confirmation gate | n/a |
| **3** | הוספת ילד וקבלת קוד תלמיד | `add-students/desktop/main.webm` | `add-students/mobile/main.webm` | **approved** | **approved** | **yes** | — | done (2026-05-24) |
| **4** | כניסת תלמיד עם קוד ו-PIN | `student-login/desktop/main.webm` | `student-login/mobile/main.webm` | **approved** | **approved** | **yes** | — | done (2026-05-24) |
| **5** | קריאת דוח הורים — דוח קצר מול דוח מקיף | `how-to-read-report/desktop/main.webm` | `how-to-read-report/mobile/main.webm` | **approved** | **approved** | **yes** | — | done (2026-05-24) |
| **6** | שימוש ב-Copilot לשאלות המשך | `parent-copilot/desktop/main.webm` | `parent-copilot/mobile/main.webm` | **approved** | **approved** | **yes** | — | done (2026-05-24) |

---

## 2. Video #2 — deferred (not faked)

| Field | Value |
|-------|--------|
| **Status** | `deferred — blocked by signup/session/email-confirmation gate` |
| **Owner decision (2026-05-24)** | Defer true signup video. Do **not** fake signup or use misleading “first login” substitute. |
| **Retry when** | Supabase/dev signup reliably reaches `/parent/dashboard` in preflight. |
| **Artifacts** | `create-parent-account/desktop/preflight-report.json` only — **no** `main.webm` files |

---

## 3. Parent WebM outputs (10 files)

| Path | Video |
|------|-------|
| `qa-evidence-audit/parent-video-pilot/parent-report-ai/desktop/main.webm` | #1 |
| `qa-evidence-audit/parent-video-pilot/parent-report-ai/mobile/main.webm` | #1 |
| `qa-evidence-audit/parent-video-pilot/how-to-read-report/desktop/main.webm` | #5 |
| `qa-evidence-audit/parent-video-pilot/how-to-read-report/mobile/main.webm` | #5 |
| `qa-evidence-audit/parent-video-pilot/parent-copilot/desktop/main.webm` | #6 |
| `qa-evidence-audit/parent-video-pilot/parent-copilot/mobile/main.webm` | #6 |
| `qa-evidence-audit/parent-video-pilot/student-login/desktop/main.webm` | #4 |
| `qa-evidence-audit/parent-video-pilot/student-login/mobile/main.webm` | #4 |
| `qa-evidence-audit/parent-video-pilot/add-students/desktop/main.webm` | #3 |
| `qa-evidence-audit/parent-video-pilot/add-students/mobile/main.webm` | #3 |

---

## 4. Student learning videos (SL1–SL9)

| Item | Status |
|------|--------|
| Plan | [STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md](./STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md) — **approved** |
| Tooling | `scripts/student-video-pilot/` |
| Output | `qa-evidence-audit/student-video-pilot/<slug>/{desktop,mobile}/main.webm` |
| Wave report | `qa-evidence-audit/student-video-pilot/wave-report.json` (after wave) |
| Embed decisions | SL2 primary on `students/choose-subject-and-grade`; SL9 link-only; arcade = `/student/arcade` only |

**Per-workflow status:** see §5 after capture wave completes (or `wave-report.json`).

---

## 5. Student workflow status table

_Update this section when the capture wave finishes._

| ID | Title | Desktop | Mobile | Workflow complete |
|----|--------|---------|--------|-------------------|
| SL1 | כניסת תלמיד ועמוד הבית | _in progress_ | _pending_ | no |
| SL2 | איך מתחילים תרגול במקצוע | _pending_ | _pending_ | no |
| SL3 | תרגול בחשבון — הסבר צעד־צעד | _pending_ | _pending_ | no |
| SL4 | תרגול בגאומטריה — הסבר צעד־צעד | _pending_ | _pending_ | no |
| SL5 | מה קורה כשטועים בשאלה | _pending_ | _pending_ | no |
| SL6 | רצף, ניקוד והתקדמות | _pending_ | _pending_ | no |
| SL7 | משימות יומיות / מסע חודשי | _pending_ | _pending_ | no |
| SL9 | סקירת מקצועות באתר | _pending_ | _pending_ | no |
| SL8 | משחקים ותרגול חווייתי | _pending_ | _pending_ | no |

---

## 6. Cleanup / safety

| Item | Status |
|------|--------|
| Help overview pilot | **Excluded** |
| Pilot dev ports 3098/3108/3110 | Stopped / not used |
| Active dev for capture | **3001** (`npm run dev`) |
| `public/` publish | **No** |
| Manifest / article wiring | **No** |
| Screenshots | **Not touched** |
| Product / legal / security | **Not touched** |
| Commit / push | **No** |

---

## Change log

| Date | Change |
|------|--------|
| 2026-05-24 | Initial snapshot |
| 2026-05-24 | Owner approved parent #3–#6; Video #2 deferred; student addendum approved; capture wave started |
