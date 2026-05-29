# Enriched Activity Report Export — Planning Document

**Date:** 2026-05-29 (plan) · **Last updated:** 2026-05-29 (implementation signoff)  
**Status:** Phases 1–3 complete — enriched Excel approved as infrastructure. PDF not started.  
**Scope:** Classroom activity report at `/teacher/class/[classId]/activities/[activityId]/report`  
**Target:** Enriched Excel export (Phase 1–3). Future PDF from same payload (Phase 4).  
**Constraint:** No Hebrew text, UI design, CSS, routes, or visible wording changed without explicit owner approval.  
**Constraint:** No commit or push unless owner performs manually.

---

## Implementation Status (Owner Signoff — 2026-05-29)

| Area | Status | Notes |
|---|---|---|
| **Enriched Excel implementation** | **Complete** | 7-sheet workbook, dedicated `/report-export` API, report page wiring, 144 selftests passing, `npm run build` green. |
| **Hebrew / title / filename cleanup** | **Complete** | Export-display sanitization only (DB title unchanged). `activityExportTitleHe()` strips `SIM`, ISO dates, internal suffixes; `buildEnrichedActivityReportDownloadStem()` for enriched Excel filename. CSV stem unchanged. Owner to re-download one SIM Excel to confirm Hebrew-only title/filename in practice. |
| **Full question / options export** | **Pending real-activity validation** | Extractor + display code path covered by selftest (e.g. `45°`/`90°` options → `ב — 90°`). **SIM `question_set` stores placeholders only** (`שאלה 1`, `א/ב/ג/ד`) per `scripts/school-portal/sim/topic-catalog.mjs` — Excel correctly reflects stored data. Full product signoff requires one **real non-SIM closed activity** with real question text and options in `classroom_activities.question_set`. |
| **PDF export** | **Disabled — v2 planned** | v1 jsPDF Hebrew fixed but layout not product-ready. Button hidden (`TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false`). See [TEACHER_PDF_V2_REDESIGN_PLAN.md](./TEACHER_PDF_V2_REDESIGN_PLAN.md). Excel remains approved detailed export. |

---

## Table of Contents

1. [Current State Audit](#a-current-state)
2. [Proposed Shared Payload — ActivityReportPayload](#b-proposed-shared-payload)
3. [Enriched Excel Design](#c-enriched-excel-design)
4. [PDF Future Extension](#d-pdf-future-extension)
5. [Data Quality and Safety](#e-data-quality-and-safety)
6. [Implementation Phases](#f-implementation-phases)
7. [Acceptance Criteria](#g-acceptance-criteria)

---

## A. Current State

### A1. Activity Report Page

**File:** `pages/teacher/class/[classId]/activities/[activityId]/report.js`

This is a Next.js page with `getServerSideProps` that just passes `classId` and `activityId` as props. All data is loaded client-side via `useEffect` → `teacherAuthFetch` → the report API route.

**Rendered UI elements on the page:**
- Activity mode label (`activityModeLabelHe`)
- Class summary: completion rate %, class accuracy %
- Two export buttons: "ייצוא Excel" and "ייצוא CSV" (client-side generation from in-memory `data`)
- Weak skills section (shown when `data.weakSkills` is non-empty)
- Student table: תלמיד | סטטוס | ציון | נכונות (sorted by `scorePct` descending)

The page currently shows `scorePct` as `%` in the table (`{s.scorePct ?? "—"}%`). The correctness column shows `{s.correctCount}/{data.activity.questionCount}` which is the preferred 1/N format.

### A2. Report API Route

**File:** `pages/api/teacher/activities/[activityId]/report.js`

- Method: `GET`
- Auth: `requireTeacherApiContext` (Bearer token, service role)
- Feature gate: `classroom_activities`
- Subject gate: `assertSchoolTeacherSubjectAllowed`
- Status gate: activity must be `closed` or `archived` — reports are only available post-close
- Delegates entirely to `buildActivityReportPayload(serviceRole, teacherId, activityId)`

### A3. Server-side Payload Builder

**File:** `lib/teacher-server/teacher-activities.server.js` — function `buildActivityReportPayload`

The payload returned is:

```javascript
{
  ok: true,
  activity: {
    // from mapActivityRow(owned.row):
    activityId, classId, teacherId,
    title, subject, topic, subtopic,   // topic/subtopic: string values stored at creation
    skillKey,                           // optional: activity-level skill key
    difficultyLevel,                    // 'easy'|'medium'|'hard'|'mixed'|null
    questionCount,                      // integer, 1-50
    mode,                               // 'live_lesson'|'guided_practice'|'quiz'|'homework'|'discussion'
    questionSelection,                  // 'same_exact' (only live mode currently)
    timeLimitSeconds,                   // integer or null
    dueAt,                              // ISO timestamp or null
    status,                             // 'closed'|'archived'
    currentQuestionIdx,                 // integer or null (live_lesson only)
    activatedAt, pausedAt, closedAt, archivedAt,  // ISO timestamps
    recipientScope,                     // 'whole_class'|'selected_students'|null
    assignedStudentIds,                 // string[] or null
    createdAt, updatedAt,
  },
  summary: {
    notStartedCount, inProgressCount, submittedCount,
    classAccuracy,     // float 0–100 (correct/answers across all students)
    rosterCount,
    completionRate,    // float 0–100 (submitted/roster)
  },
  students: [           // one row per student in classroom_activity_student_status
    {
      studentId,
      studentFullNameMasked,   // masked display name (initials strategy)
      status,                  // 'not_started'|'in_progress'|'submitted'|'timed_out'
      startedAt,               // ISO or null
      submittedAt,             // ISO or null
      lastSeenAt,              // ISO or null
      answersCount,            // integer
      correctCount,            // integer
      scorePct,                // float 0–100 or null (computed at close/submit)
      stuck,                   // boolean — true if in_progress + lastSeen > 3 min ago
    }
  ],
  perQuestion: [        // one row per question slot (0..questionCount-1)
    {
      questionIndex,
      totalAnswers,     // total attempts across all students for this question
      correctCount,
      wrongCount,
      accuracyPct,      // float 0–100
      wrongStudentIds,  // string[] of studentIds who got it wrong
      prompt,           // question text from question_set[i] (or '' if missing)
    }
  ],
  weakSkills: [         // only skills with accuracy < 60% and ≥ 2 attempts
    {
      skillKey,
      accuracyPct,
      answers,          // total attempts for this skill
      correct,
      skillLabelHe,     // resolved Hebrew label (e.g. "חישוב זוויות")
    }
  ]
}
```

**Note:** The `question_set` column (frozen JSONB array on `classroom_activities`) is loaded but its full content — choices, correct answers, hints, explanations — is NOT currently passed through to the report API response. Only the `prompt` text field is extracted into `perQuestion[i].prompt`.

### A4. Existing CSV/Excel Export

**File:** `lib/teacher-portal/teacher-activity-report-export.js`

- **Library:** `xlsx` (SheetJS)
- **Current output:** A single workbook with one sheet named `"דוח פעילות"`
- **RTL:** Sheet is configured with `sheet["!views"] = [{ rightToLeft: true }]`
- **Columns in the single sheet (5 columns):**

| Hebrew header | Source field |
|---|---|
| תלמיד | `s.studentFullNameMasked` |
| סטטוס | `studentActivityStatusLabelHe(s.status)` |
| תשובות | `s.answersCount` |
| נכונות | `{correctCount}/{questionCount}` or raw `correctCount` |
| ציון | `s.scorePct` as number or `""` |

- **Sort:** Descending by `scorePct`
- **Filename stem:** `דוח-פעילות-{sanitized-title}-{date}.xlsx` / `.csv`

**What is exported today:** Student-level summary only. No question details. No class/teacher context. No per-question analytics. No topic/skill breakdown.

### A5. Available Data: Already in Memory vs Requires Additional Query

| Data Category | Currently in API Payload | Needs Additional Query |
|---|---|---|
| Activity metadata (title, subject, topic, subtopic, skillKey, difficulty, mode, dates) | ✅ Yes | — |
| Activity timestamps (activatedAt, closedAt, archivedAt) | ✅ Yes | — |
| Time limit, due date | ✅ Yes | — |
| Student roster (status, correct/total, score, timestamps) | ✅ Yes | — |
| Per-question class accuracy (correctCount, wrongCount, accuracyPct, wrongStudentIds) | ✅ Yes (`perQuestion`) | — |
| Question prompt text | ✅ Partial (`perQuestion[i].prompt` only) | — |
| Question choices / answer options | ❌ Not exposed | Load from `classroom_activities.question_set` (already in DB) |
| Correct answers per question | ❌ Not exposed | Load from `classroom_activities.question_set` (already in DB) |
| Per-student per-question answer detail | ❌ Not in report payload | Query `classroom_activity_attempts` per student (function `buildActivityStudentAnswersPayload` already exists) |
| `question_snapshot` per attempt (frozen at answer time) | ❌ Not in report payload | Query `classroom_activity_attempts.question_snapshot` |
| Skill-level weakness analysis (Hebrew labels) | ✅ Yes (`weakSkills`) | — |
| Class info (name, grade_level, subject_focus) | ❌ Not in report payload | Query `teacher_classes` (function `loadTeacherClassOwned` already exists) |
| Teacher display name | ❌ Not in report payload | Query `teacher_profiles` (function `loadTeacherProfileRow` already exists) |
| Grade level at activity level | ❌ Not stored in `classroom_activities` | Parsed in `parseCreateActivityBody` but dropped from INSERT. Use class `grade_level` as fallback. |
| Student full name (unmasked) | ❌ Masked for privacy in current payload | Available via `students` table. Teacher context may justify unmasked in export with owner approval. |
| Time spent per question per student | ❌ Not in report payload | `classroom_activity_attempts.time_spent_ms` — exists but not currently surfaced |
| Hints used, explanation viewed per attempt | ❌ Not in report payload | `classroom_activity_attempts.hints_used`, `explanation_viewed` — exists |

### A6. Question Snapshot Storage Status

**CONFIRMED STORED:**

1. `classroom_activities.question_set` — frozen JSONB array written at activity creation time. Contains full question objects with `question/prompt`, `choices`, `correct_answer`/`correctAnswer`, `skillKey`, `subject`, `topic`, `params`, `shape`, optionally `hint`, `explanation`. This is the authoritative frozen set for teacher-facing exports.

2. `classroom_activity_attempts.question_snapshot` — server-written copy of the question at answer-recording time. Per DB comment: "Server-written copy of `question_set[index]` at scoring time; never trusted from student." This provides a secondary historical record per student attempt.

3. `classroom_activity_attempts.correct_answer` — server-derived from `question_set` at answer time. Also frozen.

**Conclusion: Question snapshots are fully stored historically. No re-generation from question bank is needed for exports.**

**What is NOT stored at activity level:**
- `grade_level` is accepted in `parseCreateActivityBody` as `body.gradeLevel` and resolved via `resolveCanonicalGradeKey`, but the `createClassroomActivity` INSERT does not include it in `insertRow`. Grade level must be read from the linked `teacher_classes.grade_level` column instead.

---

## B. Proposed Shared Payload

Define a single `ActivityReportPayload` shape computed server-side. This payload is used as the single source of truth for:
- The on-screen report (current, unchanged)
- The enriched Excel export (Phase 2)
- The future PDF export (Phase 4)

The enriched payload **extends** the current `buildActivityReportPayload` output — it does not replace or change the existing return shape. A new optional enriched mode can be triggered by an optional query param (e.g., `?full=1`) or as a separate builder function.

```typescript
// Proposed shape — TypeScript-style documentation only

interface ActivityReportPayload {
  ok: true;

  // ── Activity ──────────────────────────────────────────────────
  activity: {
    activityId: string;
    title: string;
    subject: string;          // e.g. "geometry", "math"
    topic: string;
    subtopic: string | null;
    skillKey: string | null;
    difficultyLevel: "easy" | "medium" | "hard" | "mixed" | null;
    mode: "live_lesson" | "guided_practice" | "quiz" | "homework" | "discussion";
    questionSelection: "same_exact";
    questionCount: number;
    status: "closed" | "archived";
    timeLimitSeconds: number | null;
    dueAt: string | null;       // ISO
    activatedAt: string | null; // ISO
    closedAt: string | null;    // ISO
    archivedAt: string | null;  // ISO
    createdAt: string;          // ISO
    recipientScope: "whole_class" | "selected_students" | null;
  };

  // ── Class info ────────────────────────────────────────────────
  // NEW — requires additional query to teacher_classes
  classInfo: {
    classId: string;
    className: string;
    gradeLevel: string | null;    // from teacher_classes.grade_level
    subjectFocus: string | null;  // from teacher_classes.subject_focus
  } | null;

  // ── Teacher info ──────────────────────────────────────────────
  // NEW — requires additional query to teacher_profiles
  teacherInfo: {
    teacherId: string;
    displayName: string | null;
  } | null;

  // ── Class summary ─────────────────────────────────────────────
  summary: {
    rosterCount: number;
    notStartedCount: number;
    inProgressCount: number;
    submittedCount: number;
    completionRate: number;    // float 0–100
    classAccuracy: number;     // float 0–100
  };

  // ── Student summaries ─────────────────────────────────────────
  students: StudentSummary[];

  // ── Questions ─────────────────────────────────────────────────
  // NEW — expose full frozen question_set from classroom_activities
  questions: QuestionDetail[];

  // ── Per-student per-question responses ────────────────────────
  // NEW — requires query to classroom_activity_attempts
  responses: StudentResponse[];

  // ── Per-question analytics ────────────────────────────────────
  perQuestion: PerQuestionAnalytics[];   // already exists, prompt-only

  // ── Skill / weak-skills analytics ────────────────────────────
  weakSkills: WeakSkillEntry[];          // already exists

  // ── Export metadata ───────────────────────────────────────────
  exportMeta: {
    generatedAt: string;    // ISO — report generation time
    exportVersion: "1";
  };
}

interface StudentSummary {
  studentId: string;
  studentFullNameMasked: string;
  status: "not_started" | "in_progress" | "submitted" | "timed_out";
  startedAt: string | null;
  submittedAt: string | null;
  lastSeenAt: string | null;
  answersCount: number;
  correctCount: number;
  scorePct: number | null;   // internal use only; not shown as "grade" to students
}

interface QuestionDetail {
  questionIndex: number;       // 0-based
  questionText: string;        // from question_set[i].question or .prompt
  choices: string[] | null;    // multiple-choice options, or null for open answer
  correctAnswer: string;       // server-derived, always present for same_exact
  skillKey: string | null;
  skillLabelHe: string | null; // resolved Hebrew label
  subject: string | null;      // per-question subject if present
  topic: string | null;        // per-question topic if present
  difficultyLevel: string | null;
  hint: string | null;
  explanation: string | null;
  params: object | null;       // raw question params (shape/geometry data etc.)
  shape: string | null;
}

interface StudentResponse {
  studentId: string;
  studentFullNameMasked: string;
  questionIndex: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  answeredAt: string | null;   // ISO
  timeSpentMs: number | null;
  hintsUsed: number;
  explanationViewed: boolean;
}

interface PerQuestionAnalytics {
  questionIndex: number;
  prompt: string;
  totalAnswers: number;
  correctCount: number;
  wrongCount: number;
  accuracyPct: number;         // float 0–100
  wrongStudentIds: string[];
}

interface WeakSkillEntry {
  skillKey: string;
  skillLabelHe: string;
  accuracyPct: number;
  answers: number;
  correct: number;
}
```

**Server-side builder notes:**

The enriched payload should be a separate function, e.g. `buildEnrichedActivityReportPayload`, that calls the existing `buildActivityReportPayload` and then appends the additional data:

1. Load full `question_set` from `owned.row.question_set` — **already available in the DB load, just not passed through**
2. Load `classInfo` via `loadTeacherClassOwned` — one extra DB read, cached from owned class
3. Load `teacherInfo` via `loadTeacherProfileRow` — one extra DB read
4. Load `responses` via a single bulk query on `classroom_activity_attempts` for the activity — already done by `buildPerQuestionAggregates` but not the full per-student detail

---

## C. Enriched Excel Design

### Overall Excel constraints

- All sheets: `sheet["!views"] = [{ rightToLeft: true }]` (already done for current sheet)
- All header rows: bold font weight (SheetJS `s.font = { bold: true }`)
- Filename: `דוח-פעילות-{sanitized-title}-{YYYY-MM-DD}.xlsx` (same as current)
- Hebrew column names throughout
- Numbers: no localization — plain integers/floats (Excel handles locale)
- Percentages in teacher-facing analytics sheets: OK as ratios / `X/Y` or float
- Student correctness: always expressed as `X/N` — never `%` alone in student rows
- Dates/times: ISO strings written as text or Excel date serials (text is safer for RTL)
- Missing data: empty cell, never "N/A" string (cleaner for filtering)

---

### Sheet 1 — סיכום פעילות (Activity Summary)

**Purpose:** High-level metadata and aggregate results.

| Column (Hebrew) | Source | Notes |
|---|---|---|
| שם פעילות | `activity.title` | |
| מקצוע | `activity.subject` | internal key, e.g. "geometry" |
| נושא | `activity.topic` | |
| תת-נושא | `activity.subtopic` | empty if null |
| רמת קושי | `activity.difficultyLevel` | "easy"/"medium"/"hard"/"mixed" or empty |
| מצב פעילות | `activity.mode` | internal key, e.g. "quiz" |
| מספר שאלות | `activity.questionCount` | |
| הגבלת זמן (שניות) | `activity.timeLimitSeconds` | empty if null |
| תאריך הפעלה | `activity.activatedAt` | ISO text |
| תאריך סגירה | `activity.closedAt` | ISO text |
| שם כיתה | `classInfo.className` | empty if classInfo null |
| שכבת כיתה | `classInfo.gradeLevel` | empty if null |
| שם מורה | `teacherInfo.displayName` | empty if null |
| מספר תלמידים ברשימה | `summary.rosterCount` | |
| הגישו | `summary.submittedCount` | |
| אחוז השלמה | `summary.completionRate` | float, teacher analytics |
| דיוק כיתה | `summary.classAccuracy` | float, teacher analytics |
| דוח נוצר ב | `exportMeta.generatedAt` | ISO text |

**Format:** Key–value pairs in two columns (A=label, B=value), not a table. Easier to read as a header sheet.

---

### Sheet 2 — פרטי שאלות (Question Details)

**Purpose:** Full frozen question list with correct answers.

**Data source:** `questions[]` (from full `question_set` expansion)

| Column (Hebrew) | Source | Notes |
|---|---|---|
| מספר שאלה | `q.questionIndex + 1` | 1-based for display |
| טקסט שאלה | `q.questionText` | |
| תשובה נכונה | `q.correctAnswer` | |
| אפשרות א | `q.choices?.[0]` | empty if no choices |
| אפשרות ב | `q.choices?.[1]` | empty if no choices |
| אפשרות ג | `q.choices?.[2]` | empty if no choices |
| אפשרות ד | `q.choices?.[3]` | empty if no choices |
| מיומנות | `q.skillLabelHe ?? q.skillKey` | Hebrew label preferred |
| מיומנות (מפתח) | `q.skillKey` | internal key for filtering |
| נושא (שאלה) | `q.topic` | per-question topic if stored |
| הסבר | `q.explanation` | empty if null |

**Notes:**
- Only include choice columns if `question_set` has any multiple-choice questions; otherwise omit.
- If `choices` has more than 4 items, add אפשרות ה, ו etc.
- `params` and `shape` fields are NOT included (internal geometry data, not meaningful in Excel).

---

### Sheet 3 — סיכום תלמידים (Student Summary)

**Purpose:** One row per student. Primary teacher review sheet.

**Data source:** `students[]` sorted by `scorePct` descending, then `studentFullNameMasked` alphabetically.

| Column (Hebrew) | Source | Notes |
|---|---|---|
| תלמיד | `s.studentFullNameMasked` | |
| סטטוס | Hebrew label from `studentActivityStatusLabelHe(s.status)` | |
| תשובות | `s.answersCount` | |
| נכונות | `{s.correctCount}/{activity.questionCount}` | X/N format |
| שאלות שגויות | `activity.questionCount - s.correctCount` | computed |
| ציון (%) | `s.scorePct` | float; teacher internal only |
| התחיל ב | `s.startedAt` | ISO text or empty |
| הגיש ב | `s.submittedAt` | ISO text or empty |

**Note on `scorePct`:** This column exists for teacher/admin analytical use. The column header should remain `ציון (%)` and be clearly positioned as internal analytics, not a "grade" in the student-facing sense. The `נכונות` column (X/N format) is the primary correctness signal.

---

### Sheet 4 — תשובות תלמידים — מרחב (Student Answers — Long Format)

**Purpose:** One row per student × per question. Full answer audit trail. The most data-dense sheet and the most important for question-level analysis.

**Data source:** `responses[]` joined with `questions[]` and `students[]`

| Column (Hebrew) | Source | Notes |
|---|---|---|
| תלמיד | `studentFullNameMasked` | |
| מספר שאלה | `r.questionIndex + 1` | 1-based |
| טקסט שאלה | `questions[r.questionIndex].questionText` | |
| תשובת תלמיד | `r.selectedAnswer` | empty if not answered |
| תשובה נכונה | `r.correctAnswer` | |
| נכון? | `r.isCorrect === true ? "✓" : r.isCorrect === false ? "✗" : ""` | or Hebrew: כן/לא |
| זמן (שניות) | `r.timeSpentMs != null ? (r.timeSpentMs / 1000).toFixed(1) : ""` | |
| נעזר ברמז | `r.hintsUsed > 0 ? r.hintsUsed : ""` | |
| צפה בהסבר | `r.explanationViewed ? "כן" : ""` | |
| ענה ב | `r.answeredAt` | ISO text or empty |

**Sort:** By `studentId`, then `questionIndex` ascending. (Group by student for readability.)

**Note:** Rows with no attempt (student did not answer the question) should still appear with `selectedAnswer` = empty and `isCorrect` = empty, to make it clear the question was skipped.

---

### Sheet 5 — ניתוח שאלות (Question Analytics)

**Purpose:** Per-question class-level statistics.

**Data source:** `perQuestion[]` joined with `questions[]`

| Column (Hebrew) | Source | Notes |
|---|---|---|
| מספר שאלה | `pq.questionIndex + 1` | |
| טקסט שאלה | `pq.prompt` | |
| תשובות | `pq.totalAnswers` | |
| נכונות | `pq.correctCount` | |
| שגויות | `pq.wrongCount` | |
| דיוק (%) | `pq.accuracyPct` | float, teacher analytics |
| דיוק (X/N) | `{pq.correctCount}/{pq.totalAnswers}` | X/N format |
| מיומנות | `questions[pq.questionIndex].skillLabelHe` | |
| תלמידים שטעו | count of `pq.wrongStudentIds` | integer count |

**Sort:** By `accuracyPct` ascending (hardest questions first).

---

### Sheet 6 — ניתוח מיומנויות (Skill Analytics)

**Purpose:** Aggregated weak-skill / skill breakdown.

**Data source:** `weakSkills[]` — currently only includes skills with < 60% accuracy and ≥ 2 answers. For the export, include ALL skills present in attempts (not just weak ones).

**Requires:** Change in server payload or compute from `responses[]` client-side at export time.

| Column (Hebrew) | Source | Notes |
|---|---|---|
| מיומנות | `skillLabelHe` | Hebrew label |
| מיומנות (מפתח) | `skillKey` | internal |
| ניסיונות | `answers` | |
| נכונות | `correct` | |
| דיוק X/N | `{correct}/{answers}` | |
| דיוק (%) | `accuracyPct` | float |
| חלשה? | `accuracyPct < 60 ? "כן" : ""` | flag |

**Note:** The existing `weakSkills` in the payload only includes skills below the 60% threshold. For a full export, either:
- Compute all-skills from `responses[]` data (preferred — no server change), or
- Add an `allSkills` variant to the server payload.

---

### Sheet 7 — המלצות ומעקב (Recommendations & Follow-up)

**Purpose:** Narrative output for the teacher based on weak skills and completion data.

**Data source:** `weakSkills[]`, `summary`

**Content (two-column key–value layout, not a table):**
- "אחוז השלמה": `{completionRate}%`
- "תלמידים שלא סיימו": `notStartedCount + inProgressCount`
- "מיומנויות לחיזוק" (list):
  - For each weak skill: `{skillLabelHe} — דיוק {accuracyPct}% ({correct}/{answers})`
- "הצעות לפעולה": free-text template cell (teacher fills manually)

**Note:** Do NOT generate AI recommendations or invent pedagogical advice. Only surface factual data that the teacher sees on the report screen. The "הצעות לפעולה" cell is left blank for the teacher to fill.

---

### Sheet 8 — נתוני גלם (Raw Data / Audit Trail)

**Inclusion criteria:** Include only if there is a concrete teacher need identified by the product owner. Otherwise omit in Phase 2.

**Would contain:** Full `classroom_activity_attempts` dump — one row per (student, questionIndex), including all metadata fields: `selectedAnswer`, `correctAnswer`, `isCorrect`, `questionSnapshot`, `timeSpentMs`, `hintsUsed`, `explanationViewed`, `answeredAt`.

**Concern:** `questionSnapshot` is a full JSONB blob and would produce very wide/messy cells. It should be serialized as a JSON string or omitted.

**Decision needed from owner:** Include raw sheet or limit to structured sheets 1–7?

---

## D. PDF Future Extension

### D1. Payload Compatibility

The PDF must use **exactly the same `ActivityReportPayload`** as the Excel export. No new data fetching. The payload shape defined in Section B should be considered the interface contract.

### D2. Teacher PDF

**Purpose:** A printable single-document summary for teacher records.

**Proposed sections in order:**
1. Header block: activity title, class name, teacher name, subject, topic, date range (activated → closed)
2. Class summary stats table (completion rate, class accuracy)
3. Questions list with correct answers (numbered, full text, choices if applicable)
4. Student summary table (same as Sheet 3)
5. Per-question analytics table (same as Sheet 5)
6. Weak skills / follow-up section (same as Sheet 7)

### D3. Parent PDF Option (Future)

If a parent-facing PDF is ever needed (requires owner approval before implementation):
- Include only the parent's student's data
- Show: question text, student answer, correctness (✓ / ✗)
- Do NOT show other students' answers or scores
- Do NOT show class-level analytics
- Format as feedback letter, not a grade sheet
- No percentage grades — show `{correct} מתוך {total} שאלות` only

### D4. Student PDF Option (Future)

If a student-facing summary PDF is ever needed (requires owner approval):
- Show: question by question, student's answer, correct answer, explanation if available
- No class comparison data
- No percentages or "score" framing
- Use `{correct} מתוך {total}` only

### D5. RTL / Hebrew Considerations for PDF

- Use an RTL-capable PDF library. Options: `pdfmake` (has RTL support + Hebrew font embedding), `jsPDF` with RTL plugin, or server-side rendering to HTML→PDF.
- Hebrew fonts must be embedded in the PDF binary (Alef, David Libre, or Rubik are good Open Font License options).
- All text flows right-to-left.
- Table columns must be ordered RTL (first data column is on the right).
- Page margins should allow for RTL paragraph alignment.
- Do NOT use `puppeteer`/headless-Chrome on Vercel edge/serverless — too heavy. Prefer a pure-JS library or a dedicated render service.
- The recommended library is **`@react-pdf/renderer`** with a custom RTL Hebrew font, or **`pdfmake`** with Hebrew font files embedded as base64. Both are browser-safe and SSR-safe.

### D6. PDF Server vs Browser Generation

- **Phase 4 recommendation:** Generate PDF client-side (browser) using `@react-pdf/renderer` or `pdfmake`, same pattern as the current Excel export. No new API route needed.
- If PDF size or complexity grows, a dedicated `/api/teacher/activities/[activityId]/report-pdf` route can be added later — consuming the same `ActivityReportPayload`.

---

## E. Data Quality and Safety

### E1. No Fake Analysis

- Do not generate AI-written summaries, pedagogical recommendations, or inferred conclusions.
- `weakSkills` is computed from real attempt data — it is factual, not inferred.
- The "Recommendations" sheet (Sheet 7) contains only structural placeholders. The teacher fills in text.

### E2. Question Snapshot Integrity

- **Use `classroom_activities.question_set`** as the primary source for question text, choices, and correct answers in the export. It is frozen at creation time.
- Per-student answer correctness is evaluated against `classroom_activity_attempts.correct_answer`, which is server-derived. Trust it.
- Do not re-evaluate correctness using live question bank data. The frozen snapshot is the only safe historical reference.
- The `question_snapshot` on each attempt row is a secondary confirmation. It can be used to verify consistency but is not needed as the primary export source.

### E3. Timestamps

- `activatedAt`, `closedAt`, `submittedAt`, `startedAt`, `lastSeenAt`, `answeredAt` are all stored as `timestamptz` and available.
- Export them as-is (ISO text). Do not convert to local time on the server — let Excel handle timezone display.
- Do not infer durations (e.g. "time on task") unless `timeSpentMs` is stored. `timeSpentMs` IS stored in `classroom_activity_attempts` but is not currently surfaced in the report payload. Include it as an optional column in Sheet 4, with empty cells where null.

### E4. Grade Level

- `classroom_activities` does NOT store `grade_level` (it is parsed but dropped from INSERT — see `createClassroomActivity`).
- Use `teacher_classes.grade_level` as the source. This is the grade the class is configured with, which is the most accurate available value.
- If `classInfo` is null or `gradeLevel` is null, export as empty — do not infer.

### E5. Topic / Subject / Subtopic

- `activity.topic` and `activity.subtopic` are stored at creation time in `classroom_activities`. Use these directly.
- Per-question `topic` and `subject` may differ if questions come from different topic domains. Use `questions[i].topic` for per-question rows.
- Do not infer topic hierarchy beyond what is stored.

### E6. Student Name Masking

- Current export uses `studentFullNameMasked` (masked display name, e.g. initials strategy).
- If the owner requires unmasked teacher-export names for internal reports, this requires explicit approval and a separate configuration flag. Do not change masking behavior without approval.
- All current audit trail data in `classroom_activity_attempts` stores `student_id` UUID — names are resolved at query time from the `students` table.

### E7. Correctness Display Rules

- In any student-facing surface (never applies to this teacher export): show `X מתוך N` only.
- In teacher/export context: `correctCount/questionCount` format (X/N) is the primary display for student rows.
- `scorePct` as a percentage is permissible in teacher-facing analytics columns (Sheet 3 "ציון %", Sheet 5 "דיוק %") but must be clearly labeled as an internal analytics metric.
- **Do not add a "grade" column labeled "ציון סופי" or similar** — this would imply an official graded outcome. Use "ציון (%)" as a neutral analytics label.

---

## F. Implementation Phases

### Phase 0 — Audit Only ✅
- Document current state. No code changes.
- Output: this document.

### Phase 1 — Create Enriched Shared Payload Builder ✅

**Files to create/modify:**
- `lib/teacher-server/teacher-activities.server.js` — add `buildEnrichedActivityReportPayload`
- The function extends `buildActivityReportPayload` output with:
  1. Full `questions[]` array from `owned.row.question_set`
  2. `responses[]` from a bulk query on `classroom_activity_attempts` for all students
  3. `classInfo` from `loadTeacherClassOwned`
  4. `teacherInfo` from `loadTeacherProfileRow`
  5. `exportMeta` with `generatedAt`

**API considerations:**
- The existing `/api/teacher/activities/[activityId]/report` route can optionally accept `?full=1` to return the enriched payload
- Alternatively, a separate route `/api/teacher/activities/[activityId]/report-export` can serve the enriched payload only (preferred — keeps the screen route lean)
- The on-screen report page continues using the existing route unchanged

**DB reads added (for enriched mode):**
- `classroom_activity_attempts` bulk query for all students in activity (already done partially in `buildPerQuestionAggregates`, just needs full columns)
- `teacher_classes` (one read, already done in `loadTeacherClassOwned` during activity creation)
- `teacher_profiles` (one read, `loadTeacherProfileRow` already exists)

**No new DB schema required for Phase 1.**

### Phase 2 — Replace/Enrich Excel Export ✅

**Files to modify:**
- `lib/teacher-portal/teacher-activity-report-export.js` — add new workbook builder using enriched payload

**Approach:**
- Keep existing `buildActivityReportWorkbook` function intact for backward compat
- Add `buildEnrichedActivityReportWorkbook(enrichedPayload)` which produces the multi-sheet workbook
- The report page calls the enriched export when the enriched payload is loaded; falls back to current if not

**Dependencies:**
- SheetJS `xlsx` is already installed
- Cell styling (bold headers) requires the pro version of `xlsx`. Alternatively, use `exceljs` for richer styling. **Owner decision required** before implementing styled headers.
- If styling is not priority, plain SheetJS CE (free) is sufficient for structure and RTL.

**No CSS/UI changes to the report page beyond updating the onClick handler to call the new function.**

### Phase 3 — Tests / Verification ✅ (with one open validation item)

**Test targets:**
- Unit test for `buildEnrichedActivityReportWorkbook` with mock payload
- Verify sheet names, column counts, RTL flag
- Verify `correctness` format is `X/N` in student sheet
- Verify no attempt rows fabricated for un-answered questions
- Verify export still works when `classInfo` / `teacherInfo` are null
- Verify existing `downloadActivityReportXlsx` (original 1-sheet version) still functions

**Open validation (not blocking infrastructure approval):** Export one enriched Excel from a **real non-SIM closed activity** whose `question_set` contains actual question stems and option text (not SIM placeholders). SIM activities cannot satisfy this check.

### Phase 4 — PDF Export (v1 not approved — v2 planned)

**Status:** v1 jsPDF implementation **disabled** (`TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false`). Button hidden. Code retained for reference only.

**v1 outcome:** Hebrew rendering fixed (setR2L + Noto), but table-heavy layout not product-ready.

**Next:** See [TEACHER_PDF_V2_REDESIGN_PLAN.md](./TEACHER_PDF_V2_REDESIGN_PLAN.md) — recommended **Option A: HTML print / save-to-PDF** summary layout. No implementation until owner approves.

**Not in scope:** parent PDF, student PDF, AI recommendations, Excel replacement.

### Phase 5 — Optional UI Improvements

**Requires explicit owner approval for any visible change:**
- Add section toggle on screen report to expand per-question details
- Add question-level drill-down table on screen
- Any Hebrew wording or design changes

**Do not implement Phase 5 without approval.**

---

## G. Acceptance Criteria

| Criterion | Verification |
|---|---|
| Existing report page (`/teacher/class/.../activities/.../report`) still works identically | Manual QA: load the page, check table renders |
| Current CSV export still produces the same 5-column output | Manual QA: download CSV, compare to current |
| Current 1-sheet Excel export still produces the same output | Manual QA: download Excel, check sheet "דוח פעילות" unchanged |
| New enriched Excel opens correctly in Excel/LibreOffice in Hebrew RTL mode | Manual QA: open file, verify RTL, verify Hebrew column headers |
| All new sheets have `rightToLeft: true` in views | Code review |
| Student correctness in Sheet 3 uses `X/N` format, not `%` alone | Code review + manual QA |
| `scorePct` columns are labeled as analytics, not "grade" | Code review |
| Question text is included from frozen `question_set` | Code review: source is `owned.row.question_set`, not re-queried from question bank |
| Student answer in long-format sheet traces to the correct question | Code review + data validation |
| Missing answers (student skipped question) appear as empty row, not omitted | Code review |
| `classInfo` and `teacherInfo` null safety — export succeeds even if these queries fail | Code review |
| No data invented — all cells derive from DB fields or computed arithmetic | Code review |
| `grade_level` sourced from `teacher_classes`, not fabricated | Code review |
| No Hebrew wording or UI changes made without approval | Code review |
| No commit or push performed | Git status: clean working tree |

---

## Appendix: Key Files Reference

| File | Role |
|---|---|
| `pages/teacher/class/[classId]/activities/[activityId]/report.js` | Report page (client) |
| `pages/api/teacher/activities/[activityId]/report.js` | Report API route |
| `lib/teacher-server/teacher-activities.server.js` | `buildActivityReportPayload` + all server logic |
| `lib/teacher-portal/teacher-activity-report-export.js` | CSV + 1-sheet Excel + enriched 7-sheet Excel |
| `lib/teacher-portal/teacher-activity-report-export-labels.js` | Export-only Hebrew labels, title/filename sanitization |
| `lib/classroom-activities/frozen-activity-question.server.js` | Frozen `question_set` extraction (incl. `questionText` / `options`) |
| `lib/teacher-server/teacher-activities-enriched.server.js` | `buildEnrichedActivityReportPayload` |
| `pages/api/teacher/activities/[activityId]/report-export.js` | Enriched export API route |
| `scripts/teacher-portal/activity-report-export-selftest.mjs` | `npm run test:activity-report-export` |
| `lib/teacher-server/teacher-classes.server.js` | `loadTeacherClassOwned`, `loadClassMembers` |
| `lib/teacher-server/teacher-session.server.js` | `loadTeacherProfileRow` |
| `lib/classroom-activities/classroom-activities-shared.server.js` | `mapActivityRow`, `extractCorrectAnswerFromQuestion`, question set logic |
| `lib/classroom-activities/classroom-skill-labels-he.js` | `resolveClassroomSkillLabelHe`, `decorateWeakSkillsForTeacherDisplay` |
| `supabase/migrations/024_classroom_activities.sql` | DB schema: `classroom_activities`, `classroom_activity_student_status`, `classroom_activity_attempts` |
| `supabase/migrations/037_discussion_activity_mode.sql` | Added `discussion` mode, `recipient_scope`, `assigned_student_ids` |
| `supabase/migrations/038_discussion_multi_question.sql` | Added `answer_required` column |

---

## Appendix: Open Questions / Decisions Required from Owner

1. **Student name masking in export:** Should the teacher Excel export use masked names (current) or full unmasked names? Current behavior is masked. Changing to unmasked requires an explicit decision.

2. **Raw data sheet (Sheet 8):** Include or omit? If included, should `question_snapshot` JSON blobs be exported as stringified JSON or omitted?

3. **Excel styling:** Is rich cell formatting (bold headers, colored rows) required? If yes, SheetJS CE may be insufficient and `exceljs` or SheetJS Pro would be needed. Plain-structured sheets are achievable without styling dependencies.

4. **Skill analytics — all skills vs weak only:** Sheet 6 proposes all-skills export (not just weak). The server currently only surfaces weak skills (< 60%). Computing all-skills from `responses[]` can be done client-side at export time with no server change. Confirm approach.

5. **`grade_level` gap at activity level:** The `classroom_activities` table does not store `grade_level` despite parsing it. If per-activity grade level (distinct from class grade level) is needed for future analytics or filtering, a DB migration adding `grade_level` to `classroom_activities` should be considered. For now, class-level `grade_level` is used as proxy.

6. **Export route split:** Add `?full=1` to existing route, or create a dedicated `/report-export` route? The dedicated route is cleaner (keeps screen route lean and allows different caching/auth policies). Owner decision.

7. **PDF dependency:** Which PDF library to use (`@react-pdf/renderer` vs `pdfmake`)? Both support Hebrew and RTL. Decision needed before Phase 4.
