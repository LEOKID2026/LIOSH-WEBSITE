---
name: Activity Creation Fix Plan
overview: "Fix all P0/P1 issues found in the teacher activity creation audit: grade display, school teacher context locking, server authorization hardening, topic dropdown correctness, geometry classroom generation, Hebrew error messages, private teacher separation, and discussion model documentation. Discussion multi-question/explanation-only is deferred to Phase B."
todos:
  - id: write-plan-doc
    content: Write docs/qa/TEACHER_ACTIVITY_CREATION_AUTHORIZATION_AND_TOPIC_FIX_PLAN.md with full phase details
    status: pending
  - id: p1-grade-display
    content: "Phase 1: fix raw grade key display in all 3 activity creation pages and generator errors"
    status: pending
  - id: p2-context-lock
    content: "Phase 2: load class context on mount in activities/new.js, lock grade and subject for school teachers"
    status: pending
  - id: p3-server-auth
    content: "Phase 3: harden POST /api/teacher/activities to load owned class and pass real grade to subject check"
    status: pending
  - id: p4-topic-dropdowns
    content: "Phase 4: add science topic dropdown, fix empty topic guard, constrain subject list"
    status: pending
  - id: p5-geometry-fix
    content: "Phase 5: add circles+shapes_basic diagram specs, add DIAGRAM_OPTIONAL_KINDS for rotation/transformations/solids"
    status: pending
  - id: p6-hebrew-errors
    content: "Phase 6: translate all 16 English validation messages to Hebrew"
    status: pending
  - id: p7-private-separation
    content: "Phase 7: remove g7–g9 from private teacher grade options, verify separation"
    status: pending
  - id: p8-discussion-full
    content: "Phase 8: implement multi-question discussion + explanation-only mode (SQL prep + server + UI + student page)"
    status: pending
  - id: p9-qa-tests
    content: "Phase 9: add geometry tests for 5 broken topics, authorization tests, grade display tests, discussion multi-question tests"
    status: pending
isProject: false
---

# Teacher Activity Creation — Authorization & Topic Fix Plan

**Source audit:** `docs/qa/TEACHER_ACTIVITY_CREATION_AUTHORIZATION_AND_TOPIC_AUDIT.md`  
**Plan document:** `docs/qa/TEACHER_ACTIVITY_CREATION_AUTHORIZATION_AND_TOPIC_FIX_PLAN.md`  
**Implementation guard:** No code change until owner approves this plan after browser review.

---

## Geometry Architecture Decision — Option C (Hybrid)

Two-category approach for the five broken topics:

**Category 1 — Add diagram specs** (topic has deterministic shape data in generator output):
- `circles` (g6): generator emits `kind: "circle_area"` or `"circle_perimeter"` with `params.radius` and `shape: "circle"`. The renderer already handles `kind: "circle"`. Add 10 lines to `utils/geometry-diagram-spec.js` routing `topic === "circles"` to the existing circle spec via the kind/radius.
- `shapes_basic`: generator emits `kind: "shapes_basic_square"` or `"shapes_basic_rectangle"`. These have no numeric side values (identification questions). Add a spec returning `{ kind: "square", mode: "identify" }` or `{ kind: "rectangle", mode: "identify" }` — shape renderer shows an unlabeled shape outline. Requires one new renderer mode (`identify`) that renders the shape without numeric labels.

**Category 2 — Relax gate for diagram-optional conceptual items** (`rotation`, `transformations`, `solids`):
- These produce index/Hebrew-label MCQ questions (e.g. `rotation`: answers 90/180/270, `transformations`: "הזזה"/"שיקוף", `solids`: 1–6 index). No meaningful diagram can be derived from params.
- Add `DIAGRAM_OPTIONAL_KINDS` set in `generate-activity-questions-client.js`. Items whose `params.kind` is in this set pass the gate without a diagram spec. They are still validated as valid MCQ (choices + correctAnswer required).
- This is pedagogically valid: identification/recognition questions are standard for these topics.

```js
// generate-activity-questions-client.js — new constant
// Only the five confirmed broken topics are included.
// "quadrilaterals" is NOT included — it already has partial diagram coverage
// and broadening the gate further than needed is not safe without explicit proof.
const DIAGRAM_OPTIONAL_KINDS = new Set([
  "transformations",  // Hebrew-label MCQ ("הזזה"/"שיקוף") — no computable diagram
  "rotation",         // numeric MCQ (90/180/270) — no shape diagram derivable
  "solids",           // index MCQ (1–6) — 3D shapes have no 2D diagram spec
  "shapes_basic_properties_square",    // falls through after spec returns null
  "shapes_basic_properties_rectangle",
  "shapes_basic_properties_angles",
]);

function frozenGeometryItemHasDiagram(item) {
  if (!item?.params?.kind) return false;
  const kind = String(item.params.kind).replace(/^story_/, "");
  if (DIAGRAM_OPTIONAL_KINDS.has(kind)) return true;
  const spec = getGeometryDiagramSpec({ topic: item.topic, shape: item.shape, params: item.params });
  return Boolean(spec?.kind);
}
```

---

## Phase 1 — Hebrew Grade Display / Raw Key Cleanup

**Problem:** Grade dropdown, template literals, and generator error messages expose raw `g3`/`medium`/`shapes_basic` to teachers.

**Fix in [`pages/teacher/class/[classId]/activities/new.js`](pages/teacher/class/[classId]/activities/new.js):**
- Import `formatGradeLevelHe` from `lib/learning-student-defaults.js`.
- Change grade `<select>` option labels: `{["g1","g2","g3","g4","g5","g6"].map(g => <option key={g} value={g}>{formatGradeLevelHe(g)}</option>)}`

**Fix in [`components/teacher-portal/TeacherDiscussionQuestionPicker.jsx`](components/teacher-portal/TeacherDiscussionQuestionPicker.jsx):**
- Import `formatGradeLevelHe`.
- Change the disabled grade field: `value={formatGradeLevelHe(gradeKey)}`.

**Fix in [`pages/teacher/students/activities/new.js`](pages/teacher/students/activities/new.js):**
- Import `formatGradeLevelHe`.
- Grade dropdown labels (lines 405–408): `{["g1","g2","g3","g4","g5","g6"].map(g => <option key={g} value={g}>{formatGradeLevelHe(g)}</option>)}` (also remove g7–g9, see Phase 7).
- Four template-literal occurrences of `` כיתה ${lockedGrade} `` and `` כיתה ${currentLocked} `` → `` {formatGradeLevelHe(lockedGrade)} `` and `` {formatGradeLevelHe(currentLocked)} ``.

**Fix in [`lib/classroom-activities/generate-activity-questions-client.js`](lib/classroom-activities/generate-activity-questions-client.js):**
- Add `import { formatGradeLevelHe } from "../learning-student-defaults.js"` (works in both browser and Node since `lib/learning-student-defaults.js` is pure JS).
- Add topic-name helpers for each subject (use existing constants to map key → Hebrew name).
- Change all 6 "not enough questions" throw strings. Before:
  ```js
  `אין מספיק שאלות גיאומטריה עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
  ```
  After (example):
  ```js
  `אין מספיק שאלות גיאומטריה עבור ${formatGradeLevelHe(gradeKey)} — נושא: ${GEOMETRY_TOPICS[topicKey]?.name || topicKey} — רמה: ${LEVELS[levelKey]?.name || levelKey}`
  ```
  Apply the same pattern to math, science, hebrew, english, moledet throw messages using each subject's constants.

---

## Phase 2 — School Teacher Context Locking

**Problem:** `/teacher/class/[classId]/activities/new.js` does not load class context; grade and subject default to `g3`/`math` and remain freely editable.

**Fix in [`pages/teacher/class/[classId]/activities/new.js`](pages/teacher/class/[classId]/activities/new.js):**

Add a `useEffect` on mount that calls `GET /api/teacher/classes/{classId}` (same API the discussion page uses). On success:
1. Set `gradeLevel` from `json.data.class.gradeLevel` and mark it locked (`gradeLocked = true`).
2. Set `subject` from `json.data.class.subjectFocus` if present and mark it locked (`subjectLocked = true`).
3. Reset topic to the default for the newly set subject/grade.

Add a `classContext` state: `{ gradeLocked: bool, subjectLocked: bool, className: string }`.

Change the grade dropdown: when `gradeLocked`, render as a read-only display (`<span>` or disabled `<select>`) showing `formatGradeLevelHe(gradeLevel)`, not an editable dropdown.

Change the subject dropdown: when `subjectLocked`, render as a read-only display, not an editable dropdown.

If the API call fails with 403 (subject not permitted), show a Hebrew error and set `creationBlocked = true`:
```
אין לך הרשאה ליצור פעילויות לכיתה זו. פנה למנהל בית הספר.
```

**Confirmed:** `pages/api/teacher/classes/[classId].js` (line 60) already returns `subjectFocus: row.subject_focus` in the response body. No API change needed. Source: `lib/teacher-server/teacher-classes.server.js` → `mapClassRow` → `subject_focus` field.

---

## Phase 3 — Server-Side Authorization Hardening

**Problem:** `POST /api/teacher/activities` calls `assertSchoolTeacherSubjectAllowed(..., null)` — grade is never validated for regular activities. Subject mismatch against the class's `subject_focus` is also not enforced. UI locking alone is not sufficient because a forged POST can omit or spoof `gradeLevel` and `subject`.

### Rule: `gradeLevel` is REQUIRED for non-discussion classroom activities

For regular activities (mode ≠ `"discussion"`), the server must:
1. Require `body.gradeLevel` to be present — reject with 400 and Hebrew error if absent.
2. Load the owned class row.
3. Reject with 403 if `body.gradeLevel !== owned.row.grade_level`.
4. Reject with 403 if `owned.row.subject_focus` exists and `parsed.payload.subject !== owned.row.subject_focus`.

Hebrew errors:
- Missing grade: `"רמת הכיתה חסרה או אינה תואמת לכיתה המשויכת"`
- Grade mismatch: `"רמת הכיתה חסרה או אינה תואמת לכיתה המשויכת"`
- Subject mismatch: `"המקצוע שנבחר אינו תואם לכיתה המשויכת"`

**Fix in [`pages/api/teacher/activities/index.js`](pages/api/teacher/activities/index.js):**

Replace the current `if/else` block (lines 91–116) so ALL modes load the owned class before the subject gate:

```js
// Load class ownership for ALL modes
const owned = await loadTeacherClassOwned(ctx.serviceRole, ctx.teacherId, parsed.payload.classId);
if (!owned.ok) return sendTeacherApiError(res, owned.status, owned.code, owned.code);

if (parsed.payload.mode !== "discussion") {
  // gradeLevel is REQUIRED for regular classroom activities
  const bodyGradeLevel = typeof body.gradeLevel === "string" ? body.gradeLevel.trim() : null;
  if (!bodyGradeLevel || bodyGradeLevel !== owned.row.grade_level) {
    return sendTeacherApiError(res, 403, "grade_mismatch",
      "רמת הכיתה חסרה או אינה תואמת לכיתה המשויכת");
  }

  // Subject must match class subject_focus if set
  if (owned.row.subject_focus && parsed.payload.subject !== owned.row.subject_focus) {
    return sendTeacherApiError(res, 403, "subject_mismatch",
      "המקצוע שנבחר אינו תואם לכיתה המשויכת");
  }
}

// Subject gate — use real class grade
const classGrade = owned.row.grade_level || null;
let subjectGate;
if (parsed.payload.mode === "discussion") {
  subjectGate = await assertDiscussionActivitySubjectAllowed(
    ctx.serviceRole, ctx.teacherId, parsed.payload.subject, classGrade
  );
} else {
  subjectGate = await assertSchoolTeacherSubjectAllowed(
    ctx.serviceRole, ctx.teacherId, parsed.payload.subject, classGrade  // was null
  );
}
if (!subjectGate.ok) return sendTeacherApiError(res, subjectGate.status, subjectGate.code, subjectGate.code);

// Pass owned to createClassroomActivity to avoid second DB call
const created = await createClassroomActivity(ctx.serviceRole, ctx.teacherId, parsed, {
  schoolId: subjectGate.membership?.schoolId ?? null,
  ownedRow: owned.row,
});
```

**Fix in [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js):**

Add `gradeLevel` as an explicitly parsed (non-stored) field in `parseCreateActivityBody`:
```js
const gradeLevel = body.gradeLevel != null ? String(body.gradeLevel).trim().slice(0, 32) : null;
// Included in returned payload so the handler can cross-check against owned.row.grade_level.
// Not stored on the activity row — grade lives on the frozen question_set.
```

---

## Phase 4 — Subject/Topic Dropdown Correctness

### Science topic dropdown — grade-aware

**Source of truth:** `data/science-curriculum.js` exports `SCIENCE_GRADES` where each grade key (`g1`–`g6`) has a `topics` array listing exactly which topic keys are available for that grade:
```js
// Example from data/science-curriculum.js:
g1: { topics: ["body","animals","plants","materials","earth_space","environment"] }
g2: { topics: ["body","animals","plants","materials","experiments","earth_space","environment"] }
// etc.
```

**Fix in [`pages/teacher/class/[classId]/activities/new.js`](pages/teacher/class/[classId]/activities/new.js), [`pages/teacher/students/activities/new.js`](pages/teacher/students/activities/new.js), and [`components/teacher-portal/TeacherDiscussionQuestionPicker.jsx`](components/teacher-portal/TeacherDiscussionQuestionPicker.jsx):**

Import `SCIENCE_GRADES` and a Hebrew topic label map (can be inlined):
```js
import { SCIENCE_GRADES } from "../../../data/science-curriculum.js";

const SCIENCE_TOPIC_LABELS = {
  body:        "גוף האדם",
  animals:     "בעלי חיים",
  plants:      "צמחים",
  materials:   "חומרים",
  experiments: "ניסויים",
  earth_space: "כדור הארץ וחלל",
  environment: "סביבה",
};
```

Derive available options from the current grade:
```js
// Inside the topic-rendering block, when subject === "science":
const scienceTopicsForGrade = (SCIENCE_GRADES[gradeLevel]?.topics ?? [])
  .map(key => ({ key, label: SCIENCE_TOPIC_LABELS[key] ?? key }));
```

Render as a `<select>` over `scienceTopicsForGrade`. If the array is empty (e.g. unsupported grade), do NOT render the dropdown — instead render:
```
לא נמצאו נושאים זמינים לכיתה זו במקצוע מדעים.
```
and block submission.

This ensures only topics confirmed to exist in the bank for that grade are offered to the teacher. Do not add a free-text fallback for school teacher activity creation.

### Empty geometry topic guard

The existing `useEffect` in the activity page already resets topic when `opts.length > 0`. Add explicit guard when `opts.length === 0` after a subject/grade change: set `topic` to `""` and show a Hebrew message:
```
לא נמצאו נושאים זמינים עבור מקצוע ורמת כיתה אלו.
```

### Subject list in regular activity creation

Once Phase 2 is in place and the subject is locked from the class, the subject dropdown itself becomes read-only — so filtering it to only permitted subjects is implicit. For robustness, also pass the permitted-subjects list returned by the Phase 2 class load to the UI state, so if the class has no `subjectFocus`, the dropdown is still limited to `permittedSubjects` from `school_teacher_subjects`.

---

## Phase 5 — Geometry Classroom Generation Fix

**Files to change:**
- [`utils/geometry-diagram-spec.js`](utils/geometry-diagram-spec.js) — add `circles` and `shapes_basic_identify` specs
- [`lib/classroom-activities/generate-activity-questions-client.js`](lib/classroom-activities/generate-activity-questions-client.js) — add `DIAGRAM_OPTIONAL_KINDS` and update `frozenGeometryItemHasDiagram`

### `utils/geometry-diagram-spec.js` additions

**Block A — `circles` topic (g6):**
```js
if (topic === "circles") {
  const kind = p?.kind || "";
  if ((kind === "circle_area" || kind === "story_circle_area") && typeof p.radius === "number") {
    return { kind: "circle", mode: "area", radius: p.radius };
  }
  if ((kind === "circle_perimeter" || kind === "story_circle_perimeter") && typeof p.radius === "number") {
    return { kind: "circle", mode: "perimeter", radius: p.radius };
  }
  return null;
}
```

**Block B — `shapes_basic` topic (g1–g4):**
```js
if (topic === "shapes_basic") {
  const kind = p?.kind || "";
  if (kind === "shapes_basic_square" || kind === "shapes_basic_properties_square") {
    return { kind: "square", mode: "identify" };
  }
  if (kind === "shapes_basic_rectangle" || kind === "shapes_basic_properties_rectangle") {
    return { kind: "rectangle", mode: "identify" };
  }
  return null;  // other shapes_basic kinds fall through to DIAGRAM_OPTIONAL_KINDS gate
}
```

**Exact renderer file:** [`components/learning/geometry/GeometryExplanationDiagram.jsx`](components/learning/geometry/GeometryExplanationDiagram.jsx) — this is the only JSX file in that directory and the one that renders diagram shapes via `kind` switch. Add a `mode === "identify"` branch for `kind: "square"` and `kind: "rectangle"` that renders the shape outline without numeric labels.

### `generate-activity-questions-client.js` changes

Add `DIAGRAM_OPTIONAL_KINDS` set (see Geometry Architecture section above). Update `frozenGeometryItemHasDiagram` to check this set before calling `getGeometryDiagramSpec`.

---

## Phase 6 — Hebrew Error Messages

**Scope:** Only the following three files are in scope. Do NOT change error messages in any parent, guardian, worksheet, school-portal, or unrelated API routes.

**Files to change:**
- [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js) — `parseCreateActivityBody` validation messages
- [`lib/teacher-server/discussion-question-preview.server.js`](lib/teacher-server/discussion-question-preview.server.js) — `buildDiscussionQuestionPreview` messages
- [`pages/api/teacher/activities/index.js`](pages/api/teacher/activities/index.js) — new `grade_mismatch` and `subject_mismatch` errors added in Phase 3

Full translation table (replace English `message` field with Hebrew):

| Current (English) | File | Replacement |
|---|---|---|
| `"topic required"` | discussion-question-preview.server.js:99 | `"נושא הוא שדה חובה"` |
| `"topic required (1-120 chars)"` | teacher-activities.server.js:166 | `"יש להזין נושא (עד 120 תווים)"` |
| `"title required (1-120 chars)"` | teacher-activities.server.js:143 | `"יש להזין כותרת (עד 120 תווים)"` |
| `"classId must be a UUID"` | teacher-activities.server.js:148 | `"מזהה הכיתה אינו תקין"` |
| `"invalid subject"` | teacher-activities.server.js:153 + discussion-preview.server.js:94 | `"מקצוע לא תקין"` |
| `"subject not supported for classroom activity preview"` | teacher-activities.server.js:160 | `"מקצוע זה אינו נתמך ליצירת פעילות כיתה"` |
| `"invalid mode"` | teacher-activities.server.js:171 | `"סוג פעילות לא תקין"` |
| `"invalid questionSelection"` | teacher-activities.server.js:176 | `"אופן בחירת השאלות לא תקין"` |
| `"discussion mode requires questionCount 1"` | teacher-activities.server.js:224 | `"פעילות דיון מכילה שאלה אחת בלבד"` |
| `"invalid recipientScope"` | teacher-activities.server.js:235 | `"טווח נמענים לא תקין"` |
| `"studentIds required for selected_students"` | teacher-activities.server.js:243 | `"יש לבחור לפחות תלמיד אחד"` |
| `"invalid studentIds"` | teacher-activities.server.js:250 | `"מזהה תלמיד לא תקין"` |
| `"preview generation failed"` | discussion-question-preview.server.js:134 | `"יצירת שאלות נכשלה — נסה נושא או רמת קושי אחרים"` |
| `"Too many requests"` | activities/index.js | `"יותר מדי בקשות — המתן מעט ונסה שוב"` |
| `"Method not allowed"` | activities/index.js only | `"שיטת בקשה לא נתמכת"` |
| `"Unexpected server error"` | activities/index.js only | `"שגיאת שרת — נסה שוב"` |
| `"grade_mismatch"` (new error code) | activities/index.js | `"רמת הכיתה חסרה או אינה תואמת לכיתה המשויכת"` |
| `"subject_mismatch"` (new error code) | activities/index.js | `"המקצוע שנבחר אינו תואם לכיתה המשויכת"` |

The error `code` field (`validation_failed`, `subject_not_permitted`, etc.) must not be shown to teachers directly. The UI already reads `json?.error?.message` first — the message field must always be Hebrew.

---

## Phase 7 — Private Teacher Separation

**File: [`pages/teacher/students/activities/new.js`](pages/teacher/students/activities/new.js)**

- Remove `g7`, `g8`, `g9` from the grade options array. Change to `["g1","g2","g3","g4","g5","g6"]`. This matches bank coverage.
- Apply `formatGradeLevelHe` to grade labels (covered in Phase 1).
- No other restrictions on subject or topic — private teacher remains unconstrained.
- The same-grade lock for multi-student selection remains unchanged.
- School teacher permissions (`school_teacher_subjects`) must not be checked for private teachers — this is already correctly separated via `assertPrivateTeacherSubjectAllowed` vs `assertSchoolTeacherSubjectAllowed`.

**Regression check:** Private teacher worksheet pages (`pages/teacher/worksheets/new.js`, `pages/teacher/class/[classId]/worksheets/new.js`) — no changes needed. Verify they still load.

---

## Phase 8 — Multi-question Discussion + Explanation-only Mode

This phase is part of the main build scope. It is NOT deferred.

### Current state (to preserve and extend)

- One question per discussion enforced at server (`parseCreateActivityBody` line 220) and UI (`selectedIndex` single-selection).
- `recipient_scope`: `whole_class` / `selected_students` — implemented and unchanged.
- Correct answer always withheld from students (`shouldRevealCorrectAnswerToStudent` returns `false` for discussion).
- Discussion already excluded from all diagnostic rollups (`mode === "discussion"` check in server and tests).

---

### 8-A. SQL Migration (REQUIRED — owner runs manually before code deployment)

**Migration placeholder file:** `supabase/migrations/<NEXT_MIGRATION_NUMBER>_discussion_multi_question.sql`

At build time, implementation must inspect `supabase/migrations/` to find the current highest number and use next sequential number. Cursor must NOT run this SQL.

**Full SQL content:**
```sql
-- <NEXT_MIGRATION_NUMBER>_discussion_multi_question.sql
-- OWNER MUST RUN MANUALLY. Agent must NOT execute.
-- Adds answer_required column to classroom_activities.
-- Multi-question support requires no DB change beyond this:
--   question_set is already JSONB (array-safe).
--   question_count has no DB CHECK constraint — only server validation changes.

begin;

alter table public.classroom_activities
  add column if not exists answer_required boolean not null default true;

comment on column public.classroom_activities.answer_required is
  'When false, discussion is display/explanation only.
   Students see all prompts/questions but are not required to submit an answer to complete.
   Defaults to true for all existing and new activities.
   Only meaningful for mode = discussion; ignored for all other modes.';

-- Update existing mode comment to reflect multi-question support.
comment on column public.classroom_activities.mode is
  'Activity delivery mode.
   live_lesson = teacher-broadcast.
   guided_practice / quiz / homework = student self-paced.
   discussion = teacher discussion exercise (1–5 questions).
     Multi-question and explanation-only (answer_required=false) supported.
   discussion mode is excluded from all diagnostic rollups.';

commit;
```

**Tables affected:** `classroom_activities` only.

**`student_activities` column not needed:** The server returns `answerRequired` from the classroom activity row through the `/api/student/activities/[id]/start` response. No separate column on `student_activities`.

**Backward compatibility:** `DEFAULT true` means all existing rows retain `answer_required = true` — identical current behavior. No data migration needed.

**Rollout order:**
1. Owner applies SQL manually after review.
2. Code changes (8-B through 8-E) use the new column.
3. Existing single-question discussions continue to work — no behavioral change for them.

---

### 8-B. Server Changes

**File: [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js)**

1. **`parseCreateActivityBody`** — change discussion `questionCount` validation (currently line 220):
   ```js
   // Before:
   if (mode === "discussion" && Math.floor(questionCount) !== 1) { ... }

   // After:
   if (mode === "discussion" && (questionCount < 1 || questionCount > 5)) {
     return { ok: false, code: "validation_failed",
       message: "פעילות דיון חייבת להכיל 1 עד 5 שאלות" };
   }
   ```

2. **`parseCreateActivityBody`** — add `answerRequired` field:
   ```js
   const answerRequired = body.answerRequired === false ? false : true;
   // Include in returned payload.
   ```

3. **`createClassroomActivity`** — add `answer_required` to the INSERT row:
   ```js
   if (parsed.payload.mode === "discussion") {
     insertRow.answer_required = parsed.payload.answerRequired ?? true;
   }
   ```

4. **`loadClassroomActivityForStudent`** (or wherever the start response is built) — include `answerRequired` from `row.answer_required` in the returned activity object so the student page can read it.

**File: [`lib/teacher-server/student-activity-play.server.js`](lib/teacher-server/student-activity-play.server.js)**

For explanation-only discussion (`answer_required = false`), the student should be able to complete the activity without submitting any answer. Add a "view-only complete" path:
- If `activity.answerRequired === false` and activity mode is `discussion`, the submit endpoint must accept a "viewed" action without requiring `selectedAnswer`.
- Score is 0 (not counted) — discussion already excluded from diagnostics.

---

### 8-C. UI Changes — Teacher Side

**File: [`components/teacher-portal/TeacherDiscussionQuestionPicker.jsx`](components/teacher-portal/TeacherDiscussionQuestionPicker.jsx)**

1. **Multi-select state:** Replace `selectedIndex` (single `null | number`) with `selectedIndices` (a `Set<number>`, max size 5):
   ```js
   const [selectedIndices, setSelectedIndices] = useState(() => new Set());
   ```
   Clicking a preview card toggles its index in `selectedIndices`. If `selectedIndices.size >= 5`, clicking an unselected card is blocked and shows:
   ```
   ניתן לבחור עד 5 שאלות
   ```

2. **Selected count display:** Show `נבחרו {selectedIndices.size} מתוך 5` below the preview list. "צור דיון" button is disabled until `selectedIndices.size >= 1`.

3. **Mode toggle:** Add a toggle control above the "צור דיון" button:
   ```
   ○ דיון עם מענה (תלמידים מגישים תשובה)
   ○ הסבר בלבד — ללא מענה נדרש
   ```
   State: `const [answerRequired, setAnswerRequired] = useState(true);`

4. **Submit payload:** Change the POST body:
   ```js
   const selectedQuestions = [...selectedIndices].sort().map(i => preview[i]);
   const body = {
     ...existingFields,
     questionCount: selectedQuestions.length,
     questionSet: selectedQuestions,
     answerRequired,   // new field
   };
   ```

5. **Grade display (Phase 1 overlap):** The disabled grade input currently shows the raw `gradeKey` value — change to `formatGradeLevelHe(gradeKey)`.

6. **Mobile:** All controls must work on mobile — use `<button type="button">` for card selection, not hover-only interactions. Toggle should use large tap targets.

---

### 8-D. UI Changes — Student Side

**File: [`pages/student/activity/[activityId].js`](pages/student/activity/[activityId].js)**

The student page already handles `isDiscussion` branching. Extend it:

1. **Read `answerRequired` from activity object** (returned by start endpoint):
   ```js
   const isAnswerRequired = activity?.answerRequired !== false;
   const isExplanationOnly = isDiscussion && !isAnswerRequired;
   ```

2. **Explanation-only rendering:** When `isExplanationOnly`:
   - Replace the answer input / choices section with a read-only content view.
   - Show a banner: `אין צורך להגיש תשובה — קרא/י את התוכן`
   - Replace "שליחת תשובה" button with "קראתי — המשך" button.
   - "קראתי — המשך" advances `currentIdx` without posting to `/answer`.
   - On the last question, show "סיימתי לקרוא" which calls `submitActivity` directly.

3. **Multi-question discussion completion:**
   - Current: after submitting one question, if `effectiveIdx < questionSet.length - 1`, auto-advances.
   - For multi-question, discussion already advances correctly through this path (line 153).
   - The existing "שאלה הבאה" and "סיום והגשה" buttons already render for non-live-lesson modes (lines 337–359).
   - For discussion mode specifically: suppress the "שאלה הבאה" skip button (students must answer or view each in order). Only show "שאלה הבאה" after feedback is received.

4. **Done screen for explanation-only:**
   - When `isExplanationOnly` and `phase === "done"`:
     ```
     "קראת את ההסבר של המורה. תודה!"
     ```
   - No score shown (matches current discussion done screen behavior).

5. **Done screen for multi-question discussion:**
   - Show: `"סיימת ${questionSet.length} שאלות דיון. תודה על המענה!"`

---

### 8-E. Diagnostic Firewall (Maintain + Extend)

**No change required to existing exclusion logic.** The firewall in `classroom-activities-shared.server.js` checks `mode === "discussion"` — this already covers all discussion variants (multi-question and explanation-only). Both use the same `mode: "discussion"` value.

**Required regression tests** (see Phase 9 QA additions below) must confirm this.

---

### 8-F. Backward Compatibility

- Existing single-question discussion rows: `answer_required = true` (default), `question_count = 1` — identical behavior, no change.
- Teacher picker: if existing discussion was created without `answerRequired` field, server defaults to `true`.
- Student page: if `activity.answerRequired` is `undefined` (old row), `isAnswerRequired` defaults to `true` — no regression.
- Preview API (`/api/teacher/discussion/question-preview`): no change — still generates 5 candidates regardless of how many will be selected.

---

## Phase 9 — QA Requirements

### Test files to create/extend

**New tests in `tests/classroom-activities/generate-geometry-activity-questions.test.mjs`:**
```
test("geometry g3 shapes_basic medium generates N=5")
test("geometry g3 rotation easy generates N=5")
test("geometry g2 transformations easy generates N=5")
test("geometry g5 solids easy generates N=5")
test("geometry g6 circles medium generates N=5")
```
Each asserts `qs.length === 5`, valid choices, valid correctAnswer. Diagram spec check is optional (items may or may not have spec — `frozenGeometryItemHasDiagram` must return `true`).

**New tests in `tests/teacher-activity-authorization.test.mjs`** (create this file):
```
test("school teacher creates activity — subject permitted — succeeds")
test("school teacher creates activity — subject not permitted — 403")
test("school teacher creates activity — grade mismatch from body — 403")
test("school teacher creates activity — missing gradeLevel — 403")
test("school teacher creates math activity from Hebrew class — 403")
test("private teacher creates activity — not gated by school subjects")
```

**New tests in `tests/teacher-grade-display.test.mjs`** (create this file):
```
test("formatGradeLevelHe g3 returns כיתה ג׳")
test("formatGradeLevelHe for all g1–g6 returns proper Hebrew letters")
test("generator error messages do not contain raw grade keys")
```
The last test invokes `generateActivityQuestionSetClient` with an invalid topic and checks that the thrown error message does NOT match `/\bg[1-6]\b/` (raw key).

**New discussion tests in `tests/discussion-multi-question.test.mjs`** (create this file):
```
test("create normal discussion with 1 question — server accepts")
test("create normal discussion with 3 questions — server accepts")
test("create normal discussion with 5 questions — server accepts")
test("server rejects discussion with 0 questions")
test("server rejects discussion with 6 questions")
test("create explanation-only discussion (answerRequired=false) — server accepts")
test("parseCreateActivityBody answerRequired=false sets answer_required false")
test("parseCreateActivityBody answerRequired missing defaults to true")
test("multi-question discussion excluded from diagnostic rollup")
test("explanation-only discussion excluded from diagnostic rollup")
test("explanation-only discussion — student complete without answer — succeeds")
test("normal discussion — student must submit answer — enforced")
```

**Extend `tests/discussion-activity-diagnostic-firewall.test.mjs`:**
```
test("multi-question discussion (questionCount=3) does not appear in diagnostic rollup")
test("explanation-only discussion (answer_required=false) does not appear in diagnostic rollup")
```

### Existing test suite

Run full suite after changes:
```
node --test tests/classroom-activities/generate-geometry-activity-questions.test.mjs
node --test tests/classroom-activities/generate-hebrew-activity-questions.test.mjs
node --test tests/classroom-activities/generate-english-activity-questions.test.mjs
node --test tests/classroom-activities/generate-moledet-geography-activity-questions.test.mjs
node --test tests/classroom-activities/classroom-activities-shared.test.mjs
node --test tests/discussion-activity-permissions.test.mjs
node --test tests/discussion-activity-lifecycle.test.mjs
node --test tests/discussion-recipients.test.mjs
node --test tests/discussion-private-multi-student.test.mjs
node --test tests/discussion-activity-diagnostic-firewall.test.mjs
node --test tests/discussion-multi-question.test.mjs
```

### Build check
```
npm run build
```

### QA checklist (manual browser — desktop and mobile)

All items below must be verified on both desktop browser and mobile browser (the original bug reports were from mobile).

**Desktop + Mobile pages to verify:**
- `/teacher/class/[classId]/activities/new`
- `/teacher/class/[classId]/discussion/new`
- `/teacher/students/activities/new`

**Checklist:**

1. Grade display: grade dropdown shows `כיתה א׳`…`כיתה ו׳`, not `g1`…`g6` — on desktop and mobile.
2. Grade lock: grade and subject fields are read-only and pre-filled from class context after mount — visible correctly on mobile (not collapsed/hidden by CSS).
3. Subject lock: switching subject is blocked for school teacher from a class page — on desktop and mobile.
4. Authorization: using browser dev tools, forge a POST body with wrong `subject` — server returns 403 with `"המקצוע שנבחר אינו תואם לכיתה המשויכת"`.
5. Authorization: forge a POST body with wrong `gradeLevel` or omit it — server returns 403 with `"רמת הכיתה חסרה או אינה תואמת לכיתה המשויכת"`.
6. Topics: select geometry + g3 → `shapes_basic` appears; click preview — succeeds.
7. Circles: select geometry + g6 → `circles` appears; click preview — succeeds with diagram.
8. Science topics: select science + g1 → only g1-available topics appear; select science + g3 → includes "ניסויים"; empty grade yields "לא נמצאו נושאים זמינים".
9. Hebrew errors: trigger validation failure (remove topic text) — no English text appears in error banner — on desktop and mobile.
10. Private teacher: open `/teacher/students/activities/new` — grade options are `כיתה א׳`…`כיתה ו׳` only (no g7–g9) — on desktop and mobile.
11. Discussion single-question: open `/teacher/class/[classId]/discussion/new` — preview, select 1 question, create succeeds — on desktop and mobile.
12. Discussion multi-question: select 3 questions (checkbox-style), create succeeds; student sees 3 prompts in sequence — on desktop and mobile.
13. Discussion explanation-only: toggle "הסבר בלבד ללא מענה", create succeeds; student sees content without answer input, clicks "קראתי — המשך" through all prompts, completes without submitting an answer.
14. Discussion max guard: attempting to select a 6th question shows "ניתן לבחור עד 5 שאלות".
15. Student done screen: normal discussion shows "תודה על המענה", explanation-only shows "קראת את ההסבר".
16. Diagnostic firewall: discussion activities (single/multi/explanation-only) do not appear in teacher class diagnostic report.
17. Worksheet regression: open `/teacher/class/[classId]/worksheets/new` — page loads, no change in behavior.
18. Geometry preview: `rotation`, `transformations`, `solids` all generate preview without diagram-gate error — on desktop and mobile.

---

## Priority Order

### P0 — Block before next release

- P0-1: Grade raw key display in all activity creation pages (Phase 1)
- P0-2: Grade template literals showing `כיתה g3` (Phase 1)
- P0-3: Class context not loaded in regular activity page (Phase 2)
- P0-4: Subject dropdown not filtered for school teacher (Phase 2 + Phase 4)
- P0-5: Server subject check ignores grade for regular activities (Phase 3)
- P0-6: English validation messages visible to teachers (Phase 6)
- P0-7: Geometry `shapes_basic + g3 + medium` fails due to diagram gate (Phase 5)

### P1 — Follow immediately after P0 verified

- P1-1: Science topic dropdown missing (Phase 4)
- P1-2: Private teacher grade range includes unsupported g7–g9 (Phase 7)
- P1-3: Generator error messages expose raw `g3`/`shapes_basic`/`medium` (Phase 1, last item)
- P1-4: Other geometry topics broken by diagram gate: `rotation`, `transformations`, `solids`, `circles` (Phase 5)
- P1-5: Empty topic dropdown for geometry grade mismatch shows broken UI (Phase 4)

### P1 (continued)

- P1-6: Multi-question discussion — server allows 1–5 questions (Phase 8)
- P1-7: Explanation-only / answer_required=false discussion mode (Phase 8)
- P1-8: Student play page renders multi-question discussion and explanation-only correctly (Phase 8)

### P2 — Deferred

- P2-1: Geometry medium-difficulty shapes pool expansion
- P2-4: Geometry conceptual topic coverage dashboard
- P2-5: Typography fix: straight apostrophe `'` → geresh `׳` in geometry constants

---

## Files Expected to Change

| File | Phases |
|---|---|
| `pages/teacher/class/[classId]/activities/new.js` | 1, 2, 4 |
| `components/teacher-portal/TeacherDiscussionQuestionPicker.jsx` | 1, 4, 8 |
| `pages/teacher/students/activities/new.js` | 1, 7 |
| `lib/classroom-activities/generate-activity-questions-client.js` | 1, 5 |
| `utils/geometry-diagram-spec.js` | 5 |
| `components/learning/geometry/GeometryExplanationDiagram.jsx` | 5 |
| `pages/api/teacher/activities/index.js` | 3, 6 |
| `lib/teacher-server/teacher-activities.server.js` | 3, 6, 8 |
| `lib/teacher-server/discussion-question-preview.server.js` | 6 |
| `lib/teacher-server/student-activity-play.server.js` | 8 |
| `pages/student/activity/[activityId].js` | 8 |
| `supabase/migrations/<NEXT_MIGRATION_NUMBER>_discussion_multi_question.sql` (new) | 8 |
| `tests/classroom-activities/generate-geometry-activity-questions.test.mjs` | 9 |
| `tests/teacher-activity-authorization.test.mjs` (new) | 9 |
| `tests/teacher-grade-display.test.mjs` (new) | 9 |
| `tests/discussion-multi-question.test.mjs` (new) | 9 |
| `tests/discussion-activity-diagnostic-firewall.test.mjs` | 9 |

**Files that must NOT change:**
- Any file under `components/parent*`, `components/reporting`, `lib/parent-server`, `lib/guardian-server`
- `components/worksheet-activities/`, `pages/teacher/*/worksheets/`
- `pages/api/teacher/worksheet-activities/`
- All simulation/seeding scripts

---

## Commit Policy (for Build phase)

- Explicit pathspecs only — `git add <file>` per file.
- Never `git add .` or `git add -A`.
- No commit until owner confirms browser review passes.
- No push until owner explicitly approves.

---

## Phase 10 — Closure Report

After all phases complete, build passes, and browser verification is done, create:

**`docs/qa/TEACHER_ACTIVITY_CREATION_AUTHORIZATION_AND_TOPIC_FIX_CLOSURE_REPORT.md`**

The closure report must include all of the following sections:

### Files changed
List every file modified. One line per file.

### Tests run
List every test file executed and their pass/fail result.

### Build result
Paste the final line of `npm run build` output.

### Browser verification checklist
Check off each item from the Phase 9 QA checklist with pass/fail, and note which device type (desktop/mobile) was tested.

### git status --short
Paste the full output of `git status --short` at time of closure.

### git diff --name-only
Paste the full output of `git diff --name-only HEAD` at time of closure.

### Boundary confirmations (each must be stated explicitly)
- Confirmation: no SQL run.
- Confirmation: no parent/guardian/worksheet files changed.
- Confirmation: no simulation or seeding files touched.
- Confirmation: no commit was made.
- Confirmation: no push was made.
- Confirmation: no files staged.
