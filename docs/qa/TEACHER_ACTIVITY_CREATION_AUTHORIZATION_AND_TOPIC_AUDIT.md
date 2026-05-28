# Teacher Activity Creation — Authorization & Topic Audit

**Date:** 2026-05-28  
**Status:** Read-only audit — no code changes, no SQL, no commits  
**Scope:** School teacher and private teacher activity creation flows, authorization, grade display, topic/subject coverage, discussion model, and error messages

---

## Table of Contents

1. [Files and APIs Inspected](#1-files-and-apis-inspected)
2. [Grade Display and Grade Keys](#2-grade-display-and-grade-keys)
3. [School Teacher Authorization and Context Locking](#3-school-teacher-authorization-and-context-locking)
4. [Private Teacher Separation](#4-private-teacher-separation)
5. [Subject / Topic Availability Matrix](#5-subject--topic-availability-matrix)
6. [Geometry Failure Investigation](#6-geometry-failure-investigation)
7. [English Error Messages in Hebrew UI](#7-english-error-messages-in-hebrew-ui)
8. [Discussion Activity Model](#8-discussion-activity-model)
9. [Regular Activity Creation Model](#9-regular-activity-creation-model)
10. [Data and Performance Risk](#10-data-and-performance-risk)
11. [Prioritized Fix Plan](#11-prioritized-fix-plan)
12. [Files Likely to Change on Implementation Approval](#12-files-likely-to-change-on-implementation-approval)

---

## 1. Files and APIs Inspected

### School Teacher — UI Pages

| Route | File |
|-------|------|
| `/teacher/class/[classId]/activities/new` | `pages/teacher/class/[classId]/activities/new.js` |
| `/teacher/class/[classId]/discussion/new` | `pages/teacher/class/[classId]/discussion/new.js` |
| `/teacher/class/[classId]/activities` | `pages/teacher/class/[classId]/activities/index.js` |
| `/teacher/class/[classId]/worksheets/new` | `pages/teacher/class/[classId]/worksheets/new.js` |
| `/teacher/class/[classId]/activities/[id]/monitor` | `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` |
| `/teacher/class/[classId]/activities/[id]/report` | `pages/teacher/class/[classId]/activities/[activityId]/report.js` |

### School Teacher — API Routes

| API endpoint | File |
|-------------|------|
| `POST /api/teacher/activities` | `pages/api/teacher/activities/index.js` |
| `GET /api/teacher/activities` | `pages/api/teacher/activities/index.js` |
| `GET/PATCH /api/teacher/activities/[id]/status` | `pages/api/teacher/activities/[activityId]/status.js` |
| `GET /api/teacher/discussion/question-preview` | `pages/api/teacher/discussion/question-preview.js` |
| `POST /api/teacher/discussion/question-preview` | `pages/api/teacher/discussion/question-preview.js` |
| `GET /api/teacher/classes/[classId]` | `pages/api/teacher/classes/[classId].js` |

### Private Teacher — UI Pages

| Route | File |
|-------|------|
| `/teacher/students/activities/new` | `pages/teacher/students/activities/new.js` |
| `/teacher/worksheets/new` | `pages/teacher/worksheets/new.js` |
| `/teacher/students/activities/batch/[batchId]/monitor` | `pages/teacher/students/activities/batch/[batchId]/monitor.js` |
| `/teacher/student/[studentId]` | `pages/teacher/student/[studentId].js` |

### Private Teacher — API Routes

| API endpoint | File |
|-------------|------|
| `POST /api/teacher/student-activities` | `pages/api/teacher/student-activities/index.js` |
| `GET /api/teacher/students` | `pages/api/teacher/students.js` |

### Shared Server Libraries

| Library | File |
|---------|------|
| Subject authorization | `lib/school-server/school-subjects.server.js` |
| Activity parse + create | `lib/teacher-server/teacher-activities.server.js` |
| Discussion preview server | `lib/teacher-server/discussion-question-preview.server.js` |
| Question generator (all subjects) | `lib/classroom-activities/generate-activity-questions-client.js` |
| Shared activity logic | `lib/classroom-activities/classroom-activities-shared.server.js` |
| Grade formatter | `lib/learning-student-defaults.js` |
| Teacher UI Hebrew labels | `lib/teacher-portal/teacher-ui.he.js` |

### Constants / Banks

| Resource | File |
|----------|------|
| Geometry constants | `utils/geometry-constants.js` |
| Math constants | `utils/math-constants.js` |
| Hebrew constants | `utils/hebrew-constants.js` |
| English generator | `utils/english-question-generator.js` |
| Moledet geography constants | `utils/moledet-geography-constants.js` |
| Supported subjects (set) | `lib/classroom-activities/classroom-activities-preview.js` |

### Migrations

| Migration | File |
|-----------|------|
| Private teacher subjects table | `supabase/migrations/036_private_teacher_subjects.sql` |
| Discussion activity mode + batch | `supabase/migrations/037_discussion_activity_mode.sql` |

---

## 2. Grade Display and Grade Keys

### Where `g3` comes from

The internal grade key format `g1`–`g6` originates in question banks and grade constants:  
- `utils/geometry-constants.js` — `GRADES` object uses `g1`/`g2`/.../`g6` as keys  
- `utils/math-constants.js` — same `g1`–`g6` keys  
- DB column `grade_level` in `teacher_classes`, `student_activities`, `classroom_activities` stores `g3` directly  

### Where `כיתה 3` comes from

Not found as a static string — this is almost certainly produced at runtime when raw `g3` is inserted into a template like `` `כיתה ${gradeLevel}` ``.

Confirmed live occurrence in `pages/teacher/students/activities/new.js` lines 138, 279, 286, 304:
```js
`לא ניתן לשלב תלמידים מכיתות שונות. הפעילות נועלת לכיתה ${currentLocked}. ` +
`תלמיד זה בכיתה ${student.gradeLevel}.`
```
When `currentLocked = "g3"`, this produces: `הפעילות נועלת לכיתה g3` — wrong.

### Where `כיתה ג׳` is defined

`lib/learning-student-defaults.js` exports `formatGradeLevelHe(gradeLevel)` which maps `g3` → `כיתה ג׳`. It is complete for `g1`–`g6` and also accepts `grade_3`, `3`, and Hebrew forms as input.

### Which surfaces leak raw grade keys

| Surface | Current display | Expected display | Source file / helper | Fix needed? |
|---------|----------------|-----------------|---------------------|------------|
| Activity creation grade dropdown (`new.js`) | `g1`, `g2`, …, `g6` (raw key as option text) | `כיתה א׳`, …, `כיתה ו׳` | `pages/teacher/class/[classId]/activities/new.js` line 340–344 | **Yes** |
| Discussion page grade field (read-only display) | `g3` (raw value in disabled input) | `כיתה ג׳` | `components/teacher-portal/TeacherDiscussionQuestionPicker.jsx` line 459 | **Yes** |
| Private teacher activity grade dropdown | `g1`–`g9` (raw key) | `כיתה א׳`, …, `כיתה ו׳` | `pages/teacher/students/activities/new.js` line 405–408 | **Yes** |
| Private teacher grade-lock badge | `כיתה g3` (template literal) | `כיתה ג׳` | `pages/teacher/students/activities/new.js` lines 138, 279, 286, 304 | **Yes** |
| Error messages from generators | `כיתה g3 נושא shapes_basic רמה medium` | `כיתה ג׳ נושא צורות בסיסיות רמה בינוני` | `lib/classroom-activities/generate-activity-questions-client.js` lines 701–704, 738–739, 779–800, 815–817, 887–889 | **Yes** |
| `GEOMETRY_GRADES[g3].name` | `כיתה ג'` (straight apostrophe, not geresh ׳) | `כיתה ג׳` | `utils/geometry-constants.js` line 134–136 | Minor (apostrophe punctuation) |

**The helper exists and is correct.** The problem is that it is used only in `lib/learning-client/studentHomeDashboardClient.js` (student-facing side) and is not imported in any teacher activity creation page or component.

---

## 3. School Teacher Authorization and Context Locking

### Does the route know the classId?

**Yes.** `classId` comes from `context.params.classId` via `getServerSideProps` in both `activities/new.js` and `discussion/new.js`. It is passed as a prop.

### Does it know the class grade?

- **Discussion page (`discussion/new.js`):** YES. A `useEffect` calls `GET /api/teacher/classes/{classId}` and sets `gradeLevel` from `json.data.class.gradeLevel`. Grade is then passed as `gradeLevel` prop to `TeacherDiscussionQuestionPicker`.
- **Regular activity page (`activities/new.js`):** NO. There is NO `useEffect` to load class info. Grade defaults to hardcoded `"g3"`. The teacher can change it freely to any grade.

### Does it know the class subject?

- **Discussion:** The picker shows only subjects permitted in `school_teacher_subjects` — this is enforced correctly via the GET to `/api/teacher/discussion/question-preview?gradeLevel=...`.
- **Regular activity:** NO class subject is fetched. The teacher can choose any subject from `REPORT_SUBJECTS` filtered by `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS`. No subject pre-filling.

### Does it check teacher authorization for the subject?

**Server side — regular activity POST:**
```js
// activities/index.js lines 107–113
subjectGate = await assertSchoolTeacherSubjectAllowed(
  ctx.serviceRole,
  ctx.teacherId,
  parsed.payload.subject,
  null          // ← gradeLevel is always null for non-discussion
);
```
- Subject is checked against `school_teacher_subjects` (correct).
- `gradeLevel = null` → the `grade_level` column in `school_teacher_subjects` is **not matched against the actual class grade**. The grant row with `grade_level = null` (wildcard) or any grade_level matches regardless.
- There is **no check** that the teacher's class (`classId`) belongs to their authorized set.

**Server side — discussion POST:**
```js
// activities/index.js lines 92–105
const owned = await loadTeacherClassOwned(...);     // verifies teacher owns the class
subjectGate = await assertDiscussionActivitySubjectAllowed(
  ctx.serviceRole, ctx.teacherId,
  parsed.payload.subject,
  owned.row.grade_level     // ← class grade is passed
);
```
- Class ownership is verified.
- Subject is checked against `school_teacher_subjects` with the actual class grade (better than non-discussion).

**Why can the teacher currently choose other subjects/grades on regular activities?**

Three combined gaps:
1. UI does not load class grade → teacher can type/select any grade.
2. Server receives `gradeLevel: null` for subject check → grade not validated.
3. Server does not check that the teacher's class belongs to their allowed class set (no `school_teacher_classes` or equivalent cross-check).

### Is authorization only UI-level or server-level?

Subject authorization IS server-enforced (POST will be rejected for wrong subject). However, grade is only enforced for discussion mode, not for regular activities.

The class ownership check (`loadTeacherClassOwned`) verifies the teacher owns the class record. But a teacher could create an activity for math in a class designated as "Hebrew" if they have a math grant.

### Required expected behavior (not implemented)

| Expected | Current state | Gap |
|----------|--------------|-----|
| Subject dropdown pre-filled from class `subject_focus` | Not pre-filled; defaults to "math" | Missing |
| Grade dropdown pre-filled and locked to class grade | Not pre-filled; defaults to `g3` | Missing |
| Only subjects in `school_teacher_subjects` for this teacher shown | Not filtered in regular activity UI (only filtered in discussion picker) | Missing |
| Server validates grade matches class grade | Not validated for regular activities | Missing |

---

## 4. Private Teacher Separation

### Current private teacher model

- **Students**: Private teacher links students via `POST /api/teacher/students/link`. Students are shown in a multi-select list at `/teacher/students/activities/new`.
- **Multiple students**: Yes — teacher can select any subset of their linked students.
- **Different grades**: Students from different grades can be linked, but the activity creation page enforces grade-lock: once the first student is selected, all subsequent selections must match that grade. Students with a different grade are disabled.
- **Groups/classes**: No formal group creation in private teacher flow. The multi-student batch is the only grouping mechanism (via `batch_id` in `student_activities`).
- **Subject flexibility**: Private teachers get subjects from `private_teacher_subjects` table, which is subject-only (no grade scope). The grade is derived from selected students, not from a class.
- **Grade range**: The UI allows grades `g1`–`g9` (line 405 in `students/activities/new.js`). Grades `g7`–`g9` have no bank data.

### Shared vs separate code paths

| Layer | Shared | Private-specific | School-specific |
|-------|--------|-----------------|----------------|
| Question generator | `generateActivityQuestionSetClient` (shared) | — | — |
| Subject permission check | `normalizeSubjectKey`, `isActivityPreviewSubjectSupported` | `checkPrivateTeacherSubjectPermission` / `private_teacher_subjects` | `checkSchoolTeacherSubjectPermission` / `school_teacher_subjects` |
| Activity storage | `classroom_activities` (school) vs `student_activities` (private) | `student_activities`, `batch_id` | `classroom_activities`, `recipient_scope` |
| API route | Different: `/api/teacher/student-activities` vs `/api/teacher/activities` | `/api/teacher/student-activities` | `/api/teacher/activities` |
| UI page | Separate | `pages/teacher/students/activities/new.js` | `pages/teacher/class/[classId]/activities/new.js` |

### Risk: what breaks if shared UI is constrained

If the shared question-generation path (`generateActivityQuestionSetClient`) is changed:
- Both school teacher and private teacher flows are affected simultaneously.
- If grade validation is added to that function, private teachers with students in mixed grades could break.

If subject dropdown in `activities/new.js` is restricted by class subject without the same restriction applied to `students/activities/new.js`, the private teacher retains full flexibility.

**The two main activity creation pages are already separate files. Constraining one does not automatically constrain the other.**

---

## 5. Subject / Topic Availability Matrix

### How topics are populated per subject

| Subject | Topic source for UI | Topic source for generator | Mechanism |
|---------|-------------------|---------------------------|-----------|
| math | `MATH_GRADES[gradeKey].operations` → `getMathReportBucketDisplayName` | `mathOperationFromTopic(topic)` — maps topic string to operation key | Topic key → operation (add/sub/mul/div/fractions) |
| geometry | `GEOMETRY_GRADES[gradeKey].topics` (minus `mixed`) | `normalizeGeometryTopic` + `generateQuestion` | Topic must be in grade's topic list |
| hebrew | `HEBREW_GRADES[gradeKey].topics` | `normalizeHebrewTopic` + `generateQuestion` | Topic must be in grade's topic list |
| english | `ENGLISH_GRADES[gradeKey].topics` | `normalizeEnglishTopic` + `generateEnglishQuestion` | Topic must be in grade's topic list |
| science | No topic dropdown — free text / no per-grade list | `normalizeScienceTopic` → topic bank query | Filtered by `grades` array in bank and `topic` field |
| moledet_geography | `MOLEDET_TOPICS` (no grade filter) | `normalizeMoledetGeographyTopic` + bank query | Topic matched against bank, grade used for filtering |

### Science — critical gap

Science has **no per-grade topic list** in the UI. The topic field is a free-text input or uses the bank's implicit structure. This means:
- No dropdown for science topics → teacher must type topic key.
- If the typed topic doesn't match any bank entry, zero questions are found.
- No guard on the UI prevents typing an invalid topic.

### Coverage matrix — Geometry (most complete audit performed)

| Grade | Topics in GRADES | `shapes_basic` | `area` | `perimeter` | `angles` | `triangles` | `quadrilaterals` | `volume` | `parallel_perpendicular` | `symmetry` | `solids` | `circles` | `pythagoras` |
|-------|-----------------|---------------|-------|------------|---------|------------|----------------|--------|------------------------|----------|---------|----------|------------|
| g1 | shapes_basic, transformations | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| g2 | shapes_basic, area, solids, transformations | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — |
| g3 | shapes_basic, angles, parallel_perpendicular, triangles, quadrilaterals, area, perimeter, rotation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| g4 | shapes_basic, angles, parallel_perpendicular, triangles, quadrilaterals, diagonal, symmetry, area, perimeter, volume | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| g5 | angles, parallel_perpendicular, quadrilaterals, solids, diagonal, heights, tiling, area, perimeter, volume, mixed | — | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | — |
| g6 | solids, circles, volume, area, perimeter, angles, triangles, symmetry, pythagoras, mixed | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |

**Key geometry notes:**
- Topic key is validated against `GEOMETRY_GRADES[gradeKey].topics` before generation.
- Generator requires each question to produce a valid diagram spec (`frozenGeometryItemHasDiagram`). If the diagram generator cannot produce enough valid diagrams for a topic at a given difficulty, the "not enough questions" error is thrown even when the topic is valid.
- This is the most likely cause of the `shapes_basic + g3 + medium` failure (see §6).

### Coverage matrix summary for all subjects (grades 1–6)

| Subject | Grade | UI topics available | Generator accepts | Bank covers | Known gaps |
|---------|-------|------------------- |------------------|-------------|-----------|
| math | g1–g6 | addition, subtraction, multiplication, division, fractions (grade-dependent) | Same (via `mathOperationFromTopic`) | Procedural generator — always produces questions | None known |
| geometry | g1 | shapes_basic, transformations | Same | Diagram-based generator — may fail at higher difficulty | shapes_basic+medium at g1 may fail (limited diagrams) |
| geometry | g2 | shapes_basic, area, solids, transformations | Same | As above | |
| geometry | g3 | shapes_basic, angles, parallel_perpendicular, triangles, quadrilaterals, area, perimeter, rotation | Same | As above | **shapes_basic+medium CONFIRMED failure risk** |
| geometry | g4–g6 | Grade-specific topics | Same | As above | Not audited in detail |
| hebrew | g1–g6 | Grade-specific topics | Same | Generator with bank | Placeholder check built in; some topics may be thin |
| english | g1–g6 | Grade-specific topics | Same | Generator with bank | Non-MCQ items are filtered out; some topics thin |
| science | g1–g6 | No dropdown (free text) | `normalizeScienceTopic` (topic map) | `data/science-questions.js` static bank | **No UI topic picker — teacher must know topic keys** |
| moledet_geography | g1–g6 | homeland, community, citizenship, geography, values, maps, mixed | Same | Bank query per topic | Not all combinations may have enough questions |

---

## 6. Geometry Failure Investigation

### Error observed
```
אין מספיק שאלות גיאומטריה עבור כיתה g3 נושא shapes_basic רמה medium
```

### Root cause analysis

**Step 1 — Is `shapes_basic` a valid geometry topic key?**

Yes. `GEOMETRY_TOPICS.shapes_basic = { name: "צורות בסיסיות", ... }` exists.

**Step 2 — Is `shapes_basic` in `GEOMETRY_GRADES.g3.topics`?**

Yes. Line 136 of `utils/geometry-constants.js`:
```js
g3: {
  name: "כיתה ג'",
  topics: ["shapes_basic", "angles", "parallel_perpendicular", "triangles", "quadrilaterals", "area", "perimeter", "rotation"],
  ...
}
```
The topic-allowed check (line 736–739 of `generate-activity-questions-client.js`) passes.

**Step 3 — Is `g3` the correct grade key format?**

Yes. `normalizeGradeKey("g3")` returns `"g3"` directly (matches `/^g[1-6]$/`). The grade format is not the issue.

**Step 4 — Why does generation fail?**

The generator loop (lines 746–758 of `generate-activity-questions-client.js`) calls `generateQuestion(levelConfig, "shapes_basic", "g3", null)` up to `n * 40 = 200` attempts. Each generated question must:
1. Not be a "no_question" placeholder.
2. Have a valid `correctAnswer`.
3. Have `choices` that include `correctAnswer`.
4. Pass `frozenGeometryItemHasDiagram(item)` — the question must have a renderable diagram spec.

If the geometry question generator for `shapes_basic` at `medium` difficulty cannot produce enough questions that also have valid renderable diagram specs, the loop exhausts its attempts and throws the error.

**Step 5 — What about difficulty level?**

`medium` uses `GEOMETRY_LEVELS.medium = { maxSide: 20, decimals: true }`. The shapes_basic generator at g3 with decimals and maxSide 20 may produce questions that fail diagram validation because diagram specs for basic shapes with specific numeric parameters may be sparse.

**Step 6 — Does the same issue happen for other topics?**

Any geometry topic that:
- Has few valid diagram types for a given difficulty (especially `easy` with very limited parameters), OR
- Has numeric parameters that the diagram spec does not handle,

will throw the same error. The `rotation` topic for g3 is particularly at risk since rotation diagrams have limited spec coverage.

### Summary

| Component | Status |
|-----------|--------|
| `shapes_basic` key valid | ✓ |
| `g3` grade key format | ✓ |
| Topic in g3 allowed list | ✓ |
| Generator finds valid diagram items | **Likely insufficient for medium difficulty** |
| Error message contains raw `g3` | **Bug — should say `כיתה ג׳`** |

The error is **not** caused by missing bank data or wrong key mapping. It is caused by the geometry question generator failing to produce enough questions that pass the diagram-spec validation at the requested difficulty.

---

## 7. English Error Messages in Hebrew UI

The server sends `error.message` from validation functions, and the client reads `json?.error?.message`. Many of these messages are English.

| English message | File / line | Trigger | Proposed Hebrew text |
|----------------|------------|---------|---------------------|
| `"topic required"` | `lib/teacher-server/discussion-question-preview.server.js` line 99 | POST to discussion preview with empty topic | `נושא הוא שדה חובה` |
| `"topic required (1-120 chars)"` | `lib/teacher-server/teacher-activities.server.js` line 166 | POST to `/api/teacher/activities` without topic | `יש להזין נושא (עד 120 תווים)` |
| `"title required (1-120 chars)"` | `lib/teacher-server/teacher-activities.server.js` line 143 | POST without title | `יש להזין כותרת (עד 120 תווים)` |
| `"classId must be a UUID"` | `lib/teacher-server/teacher-activities.server.js` line 148 | POST with invalid classId | `מזהה הכיתה אינו תקין` |
| `"invalid subject"` | `lib/teacher-server/teacher-activities.server.js` line 153 | POST with unknown subject | `מקצוע לא תקין` |
| `"subject not supported for classroom activity preview"` | `lib/teacher-server/teacher-activities.server.js` line 160 | POST with subject not in preview set | `מקצוע זה אינו נתמך ליצירת פעילות כיתה` |
| `"invalid mode"` | `lib/teacher-server/teacher-activities.server.js` line 171 | POST with unknown mode | `סוג פעילות לא תקין` |
| `"invalid questionSelection"` | `lib/teacher-server/teacher-activities.server.js` line 176 | POST with unknown questionSelection | `אופן בחירת השאלות לא תקין` |
| `"discussion mode requires questionCount 1"` | `lib/teacher-server/teacher-activities.server.js` line 224 | POST discussion with count > 1 | `פעילות דיון מכילה שאלה אחת בלבד` |
| `"invalid recipientScope"` | `lib/teacher-server/teacher-activities.server.js` line 235 | POST discussion with invalid scope | `טווח נמענים לא תקין` |
| `"studentIds required for selected_students"` | `lib/teacher-server/teacher-activities.server.js` line 243 | POST discussion selected_students without IDs | `יש לבחור לפחות תלמיד אחד` |
| `"invalid studentIds"` | `lib/teacher-server/teacher-activities.server.js` line 250 | POST with non-UUID student IDs | `מזהה תלמיד לא תקין` |
| `"preview generation failed"` | `lib/teacher-server/discussion-question-preview.server.js` line 134 | Internal exception in question generator | `יצירת שאלות נכשלה — נסה נושא או רמת קושי אחרים` |
| `"invalid subject"` | `lib/teacher-server/discussion-question-preview.server.js` line 94 | POST preview with invalid subject | `מקצוע לא תקין` |
| `"Too many requests"` | `pages/api/teacher/activities/index.js` line 79 | Rate limit exceeded | `יותר מדי בקשות — המתן מעט ונסה שוב` |
| `"Method not allowed"` | multiple API files | Wrong HTTP method | `שיטת בקשה לא נתמכת` |
| `"Unexpected server error"` | multiple API files | Unhandled exception | `שגיאת שרת בלתי צפויה — נסה שוב` |

**Notes:**
- The error codes themselves (e.g. `"validation_failed"`, `"subject_not_permitted"`) are internal codes and should ideally not be shown directly in the UI. However, the client fallback `json?.error?.code` may be displayed if `message` is absent.
- Error messages inside the Hebrew generator exceptions (e.g. `אין מספיק שאלות גיאומטריה עבור כיתה ${gradeKey}`) ARE in Hebrew but still contain raw grade/topic/level keys rather than human-readable labels.

---

## 8. Discussion Activity Model

### Current implementation

**Database (migration 037):**
- `classroom_activities.mode` constraint now includes `'discussion'`.
- `student_activities.mode` constraint includes `'discussion'`.
- Comment in migration: *"discussion = single-question teacher discussion exercise."*
- No `display_only` or `answer_required` column exists.

**API (server):**
- `parseCreateActivityBody` enforces `questionCount === 1` for discussion (line 220–226):
  ```js
  if (mode === "discussion" && Math.floor(questionCount) !== 1) {
    return { ok: false, code: "validation_failed", message: "discussion mode requires questionCount 1" };
  }
  ```
- Only `whole_class` or `selected_students` scope is supported; no "display only" variant.

**UI (`TeacherDiscussionQuestionPicker.jsx`):**
- Generates a pool of 5 candidate questions (hardcoded `count: 5` at line 201).
- Teacher selects exactly ONE question (`selectedIndex`).
- `questionCount: 1` is hardcoded in `createDiscussion` (line 249).
- `questionSet: [selected]` — only one question sent.
- No "explanation only / no answer required" toggle in the UI.

**Student side:**
- `shouldRevealCorrectAnswerToStudent` returns `false` for discussion mode — correct answer is withheld from students.
- But there is NO mechanism to mark a discussion question as "no answer required" — students still see the question as a question requiring a response.

### Current vs. desired feature table

| Feature | Current behavior | Desired behavior | Missing / status |
|---------|----------------|-----------------|-----------------|
| Multiple questions in one discussion | Not supported. Server rejects `questionCount > 1`. UI hardcodes 1. | Support 2–5 questions in a single discussion session | Server validation change, UI refactor, DB migration (remove `questionCount=1` constraint for discussion) |
| Teacher selects from a question pool | Yes — 5 candidates, pick one | Extend to allow picking multiple | UI refactor needed |
| Display/explanation mode (no answer required) | Not supported | Teacher can mark discussion as "explanation only" | New DB column, server logic, student UI branch |
| Student sees whether answer is required | Not differentiated | Clear "answer required" vs "view only" indicator | Missing in student-facing component |
| Recipient targeting (whole class vs selected) | Supported ✓ | Same | Already implemented |
| Auto-activate on create | Yes (UI calls PATCH status → activate immediately after create) ✓ | Same | Already works |
| Private teacher student discussion | Supported via `/api/teacher/student-activities` ✓ | Same | Already works |

---

## 9. Regular Activity Creation Model

### School teacher (`pages/teacher/class/[classId]/activities/new.js`)

- **Question count**: Teacher inputs 1–50 (default 5). Server validates 1–50.
- **Preview flow**: "Preview" button calls `generateActivityQuestionSetClient` client-side. Only on successful preview can the teacher save. Save sends the pre-generated `questionSet` to the server.
- **Grade context**: Not loaded from class. Defaults to `g3`. Teacher can change freely.
- **Subject context**: Not loaded from class. Defaults to `math`. Teacher can change freely to any supported subject.
- **Topic dropdown**: Populated from grade-specific constants for each subject. If grade is `g3` and subject is `geometry`, the topics shown are `shapes_basic`, `angles`, etc. (correct data source).
- **Authorization check**: Server checks subject permission via `assertSchoolTeacherSubjectAllowed` but with `gradeLevel = null`. Grade of class is not validated against chosen grade.
- **Mode selection**: `guided_practice`, `quiz`, `homework`, `live_lesson` — "discussion" is absent from MODES in this page (only `discussion/new.js` creates discussions).
- **Modes not in school teacher regular flow**: `discussion` mode is excluded from MODES list on `new.js` — teacher must use the discussion tab explicitly.

### Failure cases documented

- **Geometry any grade at high/medium difficulty**: May fail if diagram generator runs out of valid diagram specs within 200 attempts.
- **Science**: No topic dropdown — requires teacher to know topic keys (`body`, `animals`, `plants`, etc.). Empty topic or wrong topic key returns "not enough questions."
- **Hebrew/English**: If grade has no topics for a given key (topics list empty for that grade), the `if (!gradeTopics.includes(topicKey))` guard throws the error immediately.
- **Private teacher grades g7–g9**: Outside any bank coverage → always fails with "not enough questions."

### Does teacher preview match create?

Yes. The preview is sent as `questionSet` in the POST body. The server stores exactly those questions. There is no re-generation on save.

---

## 10. Data and Performance Risk

| Risk | Location | Severity | Notes |
|------|----------|----------|-------|
| No class context loaded on activity creation | `activities/new.js` | High | Teacher makes a full round-trip to the server for save but not for context. A single GET at mount would fix context and authorization. |
| Discussion subject list re-fetched on gradeKey change | `TeacherDiscussionQuestionPicker.jsx` | Medium | The `useEffect` that fetches permitted subjects triggers on `gradeKey` change. Every grade dropdown change causes a round-trip. Should be cached. |
| Class member list fetched on every component mount | `TeacherDiscussionQuestionPicker.jsx` | Low | Members fetched once on mount. Acceptable for typical class sizes. |
| `generateActivityQuestionSetClient` runs fully client-side | All activity creation | Low | On mobile, generating 200-attempt geometry loops is CPU-intensive. If geometry fails after 200 attempts, the UI hangs for several hundred ms. |
| Science bank loaded dynamically via `import()` | `generate-activity-questions-client.js` | Low | Dynamic import for science questions on first use. Cold start may be slow. |
| Grade g7–g9 silently accepted | Private teacher page | Medium | If a private teacher has a student with `gradeLevel = g7`, the generator runs through `n * 40` attempts for every subject before throwing "not enough questions." |

---

## 11. Prioritized Fix Plan

### P0 — Must fix before continuing

These are blocking or correctness issues.

| # | Issue | Root cause | Files to change |
|---|-------|-----------|----------------|
| P0-1 | Grade dropdown shows raw keys (`g1`, `g2`, …) instead of `כיתה א׳`, `כיתה ב׳`, … | `formatGradeLevelHe` not used in activity creation pages | `pages/teacher/class/[classId]/activities/new.js`, `components/teacher-portal/TeacherDiscussionQuestionPicker.jsx`, `pages/teacher/students/activities/new.js` |
| P0-2 | Grade template literals show `כיתה g3` instead of `כיתה ג׳` | Raw grade key inserted into string templates | `pages/teacher/students/activities/new.js` (4 occurrences), generator error messages in `lib/classroom-activities/generate-activity-questions-client.js` |
| P0-3 | Regular activity page does not load class grade/subject on mount; teacher can create activity for wrong grade | No `useEffect` to call `GET /api/teacher/classes/{classId}` | `pages/teacher/class/[classId]/activities/new.js` |
| P0-4 | School teacher can choose any subject in regular activity (UI not filtered) | No permitted-subject filter applied to subject dropdown in `activities/new.js` (only done in discussion picker) | `pages/teacher/class/[classId]/activities/new.js` |
| P0-5 | Server subject check passes `gradeLevel = null` for regular activities, not enforcing class grade | `activities/index.js` line 107–113 hardcodes `null` | `pages/api/teacher/activities/index.js`, server authorization |
| P0-6 | English error messages visible to Hebrew-speaking teachers | Validation messages in `parseCreateActivityBody` and `buildDiscussionQuestionPreview` are English | `lib/teacher-server/teacher-activities.server.js` (8 messages), `lib/teacher-server/discussion-question-preview.server.js` (3 messages) |
| P0-7 | Geometry `shapes_basic + g3 + medium` fails with "not enough questions" | Geometry diagram generator cannot produce enough medium-difficulty `shapes_basic` diagrams for g3 | `utils/geometry-question-generator.js` (needs investigation of shapes_basic medium diagram pool) |
| P0-8 | Discussion topic dropdown may be empty if `school_teacher_subjects` has no rows | No subjects granted → `permittedSubjects` empty → subject list empty → "no permissions" displayed | DB: `school_teacher_subjects` must be populated for school teachers; not a code change |

### P1 — Important, can follow immediately after P0

| # | Issue | Description |
|---|-------|-------------|
| P1-1 | Discussion supports only 1 question | Allow 2–5 questions per discussion session |
| P1-2 | No "explanation only / display mode" in discussion | Add `answer_required: boolean` field to discussion activities |
| P1-3 | Science topic UI is free-text — teacher must know topic keys | Add a science topic dropdown with keys: `body`, `animals`, `plants`, `materials`, `experiments`, `earth_space`, `environment` |
| P1-4 | Private teacher grade range includes g7–g9 (unsupported) | Limit private teacher grade dropdown to g1–g6 |
| P1-5 | Error messages from generators still contain raw grade/topic keys even in Hebrew | Replace `${gradeKey}` with `${formatGradeLevelHe(gradeKey)}` and topic key with its Hebrew name |
| P1-6 | Server authorization check does not validate that chosen grade matches class grade | Load class grade on POST and compare with `body.gradeLevel` |

### P2 — Later improvements

| # | Issue | Description |
|---|-------|-------------|
| P2-1 | No coverage dashboard for subject × grade × topic | Build teacher-facing coverage warnings per topic |
| P2-2 | Geometry medium-difficulty shapes pool is thin | Expand geometry question generator for `shapes_basic` at medium and easy levels |
| P2-3 | Discussion subject list is re-fetched on grade change | Cache permitted subjects in component state or move to a context |
| P2-4 | `כיתה ג'` in constants uses straight apostrophe not geresh ׳ | Minor typography: change `'` to `׳` in `utils/geometry-constants.js` and similar files |
| P2-5 | No grade or subject pre-fill from class on private teacher page | Auto-select grade from selected student's grade; already partially done via `lockedGrade` |
| P2-6 | No warning when selected topic has few questions at chosen difficulty | Preflight question-count check before full generation |

---

## 12. Files Likely to Change on Implementation Approval

Ordered by expected priority of change.

| File | Change type | Why |
|------|------------|-----|
| `pages/teacher/class/[classId]/activities/new.js` | UI fix | Grade display, class context load, subject filter |
| `components/teacher-portal/TeacherDiscussionQuestionPicker.jsx` | UI fix | Grade display, subject filter already done for discussion |
| `pages/teacher/students/activities/new.js` | UI fix | Grade display, template literals, g7–g9 range |
| `lib/teacher-server/teacher-activities.server.js` | Error messages | Hebrew validation messages |
| `lib/teacher-server/discussion-question-preview.server.js` | Error messages | Hebrew validation messages |
| `pages/api/teacher/activities/index.js` | Authorization | Pass class grade to subject check |
| `lib/classroom-activities/generate-activity-questions-client.js` | Error messages + possible diagram fix | Hebrew error strings with formatted grade/topic/level |
| `utils/geometry-question-generator.js` | Bug fix | shapes_basic medium diagram pool |
| `lib/learning-student-defaults.js` | No change needed | `formatGradeLevelHe` already correct |
| `lib/school-server/school-subjects.server.js` | Authorization | If grade-level enforcement for regular activities is added |

**Files that must NOT change** (per audit scope):
- Worksheet / PDF activity implementation
- School simulation files
- Parent / guardian report files
- Any SQL migration files

---

## Confirmation Checklist

| Check | Status |
|-------|--------|
| No code changes made | ✓ Confirmed |
| No SQL executed | ✓ Confirmed |
| No commit created | ✓ Confirmed |
| No push to remote | ✓ Confirmed |
| No staging of files | ✓ Confirmed |
| No simulation files touched | ✓ Confirmed |
| No migrations created | ✓ Confirmed |

### `git status --short` output

```
?? docs/diagnostics/TEACHER_SCHOOL_STATUS_CURRENT_SIM_INSPECTION.md
```

Only one pre-existing untracked file is present. This audit report (`docs/qa/TEACHER_ACTIVITY_CREATION_AUTHORIZATION_AND_TOPIC_AUDIT.md`) was the only file written.

---

*End of audit. For implementation authorization, refer to §11 Prioritized Fix Plan and §12 Files Likely to Change.*
