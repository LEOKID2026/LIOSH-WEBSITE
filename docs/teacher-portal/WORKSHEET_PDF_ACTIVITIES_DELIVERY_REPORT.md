# Worksheet PDF Activities — QA Closure Report

**Date:** 2026-05-27  
**Status:** Post-SQL QA complete — ready for owner commit  
**Migration:** `029_worksheet_activities.sql` applied manually in Supabase (owner-confirmed success)

## Executive summary

Worksheet PDF activities are **live in the remote database**, **isolated from classroom activities**, and **verified end-to-end** via automated QA (`scripts/worksheet-activities/verify-worksheet-qa.mjs`).  
**41/41** automated checks passed against a production build (`next build` + `next start` on port 3002).  
One security fix was applied during QA (student answer-key PDF blocked).  
**No SQL was run by the agent.** **No commit or push** was performed.

---

## 1. Schema and storage verification (read-only)

| Check | Result |
|-------|--------|
| `worksheet_activities` | Exists, queryable |
| `worksheet_files` | Exists, queryable |
| `worksheet_questions` | Exists, queryable |
| `worksheet_student_status` | Exists, queryable |
| `worksheet_student_answers` | Exists, queryable |
| Storage bucket `worksheet-pdfs` | Exists |
| Bucket `public` | `false` (private) |
| `file_size_limit` | 20,971,520 (20 MB) |
| `allowed_mime_types` | `["application/pdf"]` |

---

## 2. Build

| Command | Result |
|---------|--------|
| `npm run build` | **Pass** (second run after QA fixes; `.next/BUILD_ID` present) |

Worksheet routes included in build output: teacher worksheets pages, student worksheet page, all worksheet API routes.

---

## 3. Automated QA (Section 15 — plan)

**Script:** `node --env-file=.env.local scripts/worksheet-activities/verify-worksheet-qa.mjs`  
**Server:** `next start` on `http://localhost:3002` (production build)  
**Credentials:** Demo school — `dan@leo-k.com`, `school@leo-k.com`, student PIN `1234` (`DEMO_TEACHER_PASSWORD` / `SCHOOL_QA_PASSWORD` = `leo7479`)

**Final run: 41/41 PASS**

### 3.1 Regression — existing classroom activities

| Check | Result |
|-------|--------|
| `GET /api/teacher/activities?classId=…` returns activities | Pass (8 activities) |
| `GET /api/teacher/activities/{id}/report` | Pass (200) |
| `GET /api/school/activities` contains no worksheet data | Pass (50 classroom activities; no worksheet leakage) |
| `classroom_activities` vs `worksheet_activities` tables separate | Pass |

**No changes** to `pages/api/teacher/activities/*`, `pages/api/student/activities/*`, or `pages/api/school/activities/index.js`.

### 3.2 Worksheet E2E (API-level)

| Flow | Result |
|------|--------|
| Teacher creates `digital_answers` worksheet | Pass |
| Upload valid PDF | Pass |
| Reject non-PDF (magic bytes) | Pass (400) |
| Upsert questions (MC, numeric, free_text) | Pass |
| Activate | Pass |
| Student lists active worksheets | Pass |
| Student signed PDF URL | Pass |
| PDF open tracking (`pdf_open_count`, timestamps) | Pass (incl. second open) |
| Digital submit | Pass |
| Re-submit blocked | Pass (409) |
| Score hidden before publish (`displayScore` null, `pending_review`) | Pass |
| Teacher manual grade (free text) | Pass |
| Teacher publish | Pass |
| Score visible after publish (`displayScore` 87.5%) | Pass |
| PDF-only worksheet: mark complete → `grading_status=submitted` | Pass |

### 3.3 Auto-grading (unit + integration)

| Type | Result |
|------|--------|
| `multiple_choice` | Pass |
| `true_false` | Pass |
| `numeric` (exact match) | Pass |
| `free_text` (no auto) | Pass |
| Final score after publish reflects auto + manual | Pass (87.5%) |

### 3.4 Permissions

| Check | Result |
|-------|--------|
| Wrong student → PDF URL | Pass (403) |
| Wrong teacher → worksheet detail | Pass (404) |
| Student `?fileRole=answer_key` | Pass (403) — **fixed during QA** |
| School manager worksheet list | Pass (200) |
| School report aggregate only (no per-student rows) | Pass |

### 3.5 Not run in automation (manual / out of scope)

Per plan Section 15, these remain **manual** if desired: Playwright UI walkthrough, parent PDF export, diagnostic engine, full school UI screenshots, `.docx`/`.zip`/`.exe` upload UI tests (API non-PDF rejection is covered).

---

## 4. Fixes applied during QA

### 4.1 Security: student answer-key PDF

**Issue:** `GET /api/student/worksheet-activities/{id}/pdf-url?fileRole=answer_key` returned 200 with the worksheet PDF (query param ignored).

**Fix:** Reject any `fileRole` other than `worksheet` with **403** in  
`pages/api/student/worksheet-activities/[worksheetId]/pdf-url.js`.

### 4.2 Publish-gate UX flag

**Improvement:** `waitingForTeacher` now true when the student has submitted (digital or PDF-only) and the result is not yet published —  
`lib/worksheet-activities/worksheet-student.server.js`.

### 4.3 QA harness

Added `scripts/worksheet-activities/verify-worksheet-qa.mjs` with:

- Schema + bucket checks (service role, read-only)
- Grading unit tests
- Full HTTP flow against running server
- `Origin` header for cookie-mutation APIs (required in production)
- Default base URL `http://localhost:3001` (use `WORKSHEET_QA_BASE_URL` for `next start`)

---

## 5. Isolation confirmation

| Surface | Worksheet data? |
|---------|-----------------|
| `/api/school/activities` | **No** |
| `/api/school/worksheet-activities` | **Yes** (dedicated) |
| `classroom_activities` table | Unchanged |
| Teacher class “פעילויות” tab | Unchanged (automatic activities only) |
| Teacher class “דפי עבודה” tab | Worksheets only |

---

## 6. Owner follow-up

1. **Commit** when ready (agent did not commit).
2. **Deploy** application code to the environment that uses the migrated Supabase project.
3. Optional: run QA locally:
   ```bash
   npm run build
   npx next start -p 3002
   # separate terminal:
   $env:DEMO_TEACHER_PASSWORD="leo7479"
   $env:SCHOOL_QA_PASSWORD="leo7479"
   $env:WORKSHEET_QA_BASE_URL="http://localhost:3002"
   node --env-file=.env.local scripts/worksheet-activities/verify-worksheet-qa.mjs
   ```
4. Spot-check teacher/student UI in browser (Hebrew copy, publish confirmation).

---

## 7. `git status --short`

```
 M .cursor/plans/worksheet_pdf_activities_d439b61f.plan.md
 M components/teacher-portal/TeacherClassActivitiesNav.jsx
 M pages/student/home.js
 M pages/teacher/student/[studentId].js
?? components/teacher-portal/TeacherStudentWorksheetsPanel.jsx
?? components/worksheet-activities/
?? docs/school-portal/SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md
?? docs/teacher-portal/WORKSHEET_PDF_ACTIVITIES_DELIVERY_REPORT.md
?? lib/worksheet-activities/
?? pages/api/school/worksheet-activities/
?? pages/api/student/worksheet-activities/
?? pages/api/teacher/students/[studentId]/worksheets.js
?? pages/api/teacher/worksheet-activities/
?? pages/student/worksheet/
?? pages/teacher/class/[classId]/worksheets/
?? scripts/worksheet-activities/
?? supabase/migrations/029_worksheet_activities.sql
```

---

## Reference

- Plan: [WORKSHEET_PDF_ACTIVITIES_PLAN.md](./WORKSHEET_PDF_ACTIVITIES_PLAN.md)  
- Migration: [supabase/migrations/029_worksheet_activities.sql](../../supabase/migrations/029_worksheet_activities.sql)  
- QA script: [scripts/worksheet-activities/verify-worksheet-qa.mjs](../../scripts/worksheet-activities/verify-worksheet-qa.mjs)
