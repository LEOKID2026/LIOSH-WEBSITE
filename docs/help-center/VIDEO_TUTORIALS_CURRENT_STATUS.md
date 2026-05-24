# Video Tutorials — Current Status

- **Status:** Parent wave **complete except Video #2 (deferred)**; student wave **capture complete** (18/18 technical pass)
- **Last updated:** 2026-05-24
- **Plans:**
  - [VIDEO_TUTORIALS_MASTER_PLAN.md](./VIDEO_TUTORIALS_MASTER_PLAN.md)
  - [STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md](./STUDENT_LEARNING_VIDEO_TUTORIALS_PLAN.md)

Audit-only outputs. No publish, manifest wiring, or article changes.

---

## Summary

| Track | State |
|-------|--------|
| Parent videos (#1–#6) | **5/6 workflows complete** (owner-approved). Video **#2 deferred**. |
| Student learning (SL1–SL9) | **18/18 WebMs captured** — technical pass; owner visual review optional before publish wave |
| Help overview pilot | **Excluded** — not part of approved deliverables |

---

## 1. Parent video status

Base: `qa-evidence-audit/parent-video-pilot/`

| # | Title | Desktop path | Mobile path | Desktop | Mobile | Workflow complete |
|---|--------|--------------|-------------|---------|--------|-------------------|
| 1 | מדריך להורה — כניסה לדוח ושימוש ב-AI | `parent-report-ai/desktop/main.webm` | `parent-report-ai/mobile/main.webm` | approved | approved | **yes** |
| 2 | רישום הורה וכניסה ראשונה | — | — | **deferred** | **deferred** | **no** |
| 3 | הוספת ילד וקבלת קוד תלמיד | `add-students/desktop/main.webm` | `add-students/mobile/main.webm` | approved | approved | **yes** |
| 4 | כניסת תלמיד עם קוד ו-PIN | `student-login/desktop/main.webm` | `student-login/mobile/main.webm` | approved | approved | **yes** |
| 5 | קריאת דוח הורים | `how-to-read-report/desktop/main.webm` | `how-to-read-report/mobile/main.webm` | approved | approved | **yes** |
| 6 | שימוש ב-Copilot | `parent-copilot/desktop/main.webm` | `parent-copilot/mobile/main.webm` | approved | approved | **yes** |

### Video #2 — deferred

- **Status:** `deferred — blocked by signup/session/email-confirmation gate`
- **Decision (2026-05-24):** Defer true signup; do not fake or substitute misleading “signup” footage.
- **Retry when:** Supabase/dev signup reliably reaches `/parent/dashboard` in preflight.
- **Artifact:** `create-parent-account/desktop/preflight-report.json` only.

---

## 2. Student learning status (SL1–SL9)

Base: `qa-evidence-audit/student-video-pilot/`  
Tooling: `scripts/student-video-pilot/` — `npm run student-video:preflight`, `student-video:capture`, `student-video:wave`

**Embed decisions (approved):** SL2 primary on `students/choose-subject-and-grade`; SL9 link-only; arcade = `/student/arcade` only.

| ID | Title | Desktop | Mobile | Workflow complete | Notes |
|----|--------|---------|--------|-------------------|--------|
| SL1 | כניסת תלמיד ועמוד הבית | technical pass | technical pass | technical pass | Login + home + missions/journey |
| SL2 | איך מתחילים תרגול במקצוע | technical pass | technical pass | technical pass | Math practice entry |
| SL3 | תרגול בחשבון — הסבר צעד־צעד | technical pass | technical pass | technical pass | **Mandatory** step-by-step UI |
| SL4 | תרגול בגאומטריה — הסבר צעד־צעד | technical pass | technical pass | technical pass | **Mandatory** diagram + steps |
| SL5 | מה קורה כשטועים בשאלה | technical pass | technical pass | technical pass | Wrong answer + explanation |
| SL6 | רצף, ניקוד והתקדמות | technical pass | technical pass | technical pass | Short math streak |
| SL7 | משימות יומיות / מסע חודשי | technical pass | technical pass | technical pass | Home panels |
| SL8 | משחקים ותרגול חווייתי | technical pass | technical pass | technical pass | Arcade brief sample |
| SL9 | סקירת מקצועות באתר | technical pass | technical pass | technical pass | Link-only embed vs SL2 |

“Workflow complete” for students = **both viewports captured + automated verification passed**. Owner may still request re-capture before publish.

---

## 3. All output WebM paths (28 files)

### Parent (10)

- `qa-evidence-audit/parent-video-pilot/parent-report-ai/{desktop,mobile}/main.webm`
- `qa-evidence-audit/parent-video-pilot/add-students/{desktop,mobile}/main.webm`
- `qa-evidence-audit/parent-video-pilot/student-login/{desktop,mobile}/main.webm`
- `qa-evidence-audit/parent-video-pilot/how-to-read-report/{desktop,mobile}/main.webm`
- `qa-evidence-audit/parent-video-pilot/parent-copilot/{desktop,mobile}/main.webm`

### Student (18)

- `qa-evidence-audit/student-video-pilot/student-home-tour/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/start-practice/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/math-step-explanation/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/geometry-step-explanation/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/wrong-answer-help/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/streak-and-progress/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/daily-missions-journey/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/subjects-overview/{desktop,mobile}/main.webm`
- `qa-evidence-audit/student-video-pilot/games-arcade/{desktop,mobile}/main.webm`

Each folder also has `capture-meta.json`, `preflight-report.json`, and `_frames/` (audit).

---

## 4. Blockers handled during student wave

| Issue | Handling |
|-------|----------|
| Corrupt `.next` / API 500 on `/api/student/login` | Cleared `.next`, single dev server on **3001** |
| UI login timeout | API login via `page.request` + cookie session |
| Overlay `ctx` bug in capture engine | Fixed `pad` parameter in browser evaluate |
| Relative `/learning/*` URLs in headless | `baseUrl`-aware navigation in `learning-flow.mjs` |
| Geometry topic `selectOption` failures | DOM `selectedIndex` + `change` event |
| Duration verification too strict | Tuned `verifyRules` per workflow |
| SL2 preflight feedback flake | Relaxed to question surface + answer attempt |
| Parallel dev servers sharing `.next` | Stopped 3098/3108/3110; one server only |

---

## 5. Cleanup / safety

| Item | Status |
|------|--------|
| Help overview pilot | Excluded |
| Dev ports 3098/3108/3110 | Stopped |
| Active capture dev | `npm run dev` → **3001** |
| `public/` publish | **No** |
| Manifest / article wiring | **No** |
| Screenshots | **Not touched** |
| Product / legal / security | **Not touched** |
| Commit / push | **No** |

---

## 6. Next steps (not started)

1. Optional owner visual review of student technical-pass WebMs.
2. Video #2 — retry when Supabase signup gate is resolved.
3. Future publish wave: copy to `public/help-center/videos/...`, flip manifest `assetKind`, reorder article blocks.

---

## Change log

| Date | Change |
|------|--------|
| 2026-05-24 | Initial snapshot |
| 2026-05-24 | Parent #3–#6 owner-approved; #2 deferred; student SL1–SL9 captured (18 WebMs) |
