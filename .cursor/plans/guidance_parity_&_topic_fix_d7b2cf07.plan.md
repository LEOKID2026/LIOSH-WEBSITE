---
name: Guidance Parity & Topic Fix
overview: A three-pronged plan to (A) give the school physical-class Report Hub V2-compatible guidance parity, (B) fix math/geometry session topic fallbacks so real skill keys reach the pipeline, and (C) replace the math teacher-created activity free-text topic input with a canonical dropdown enforcing stored keys like `addition`, `multiplication`, `fractions`.
todos:
  - id: mandatory-workflow
    content: Mandatory Workflow Block is the single source of truth for execution — do not begin until owner approves.
    status: completed
  - id: math-activity-topic-dropdown
    content: Replace free-text math topic input in `pages/teacher/class/[classId]/activities/new.js` with a grade-aware canonical dropdown using `GRADES[gradeLevel].operations` + `getMathReportBucketDisplayName` for Hebrew labels
    status: completed
  - id: cross-subject-reason
    content: Generalise `classifyDroppedTopicReason` in `lib/teacher-server/teacher-guidance-v2.server.js` to emit `subject_name_topic` / `cross_subject_topic` / `unmapped_topic` generically
    status: completed
  - id: session-topic-helpers
    content: Create `lib/learning/session-topic-helpers.js` with `resolveMathSessionTopic` (validates against `OPERATIONS` whitelist) and `resolveGeometrySessionTopic` (validates against `GEOMETRY_TOPICS` keys whitelist); both return `""` for subject-name, generic, mixed, or unknown keys
    status: completed
  - id: math-master-topic-fix
    content: Update `pages/learning/math-master.js` to import and call `resolveMathSessionTopic` for session/answer topic; remove `|| "math"` fallback
    status: completed
  - id: geometry-master-topic-fix
    content: Update `pages/learning/geometry-master.js` to import and call `resolveGeometrySessionTopic` for session/answer topic; remove `|| "geometry"` fallback
    status: completed
  - id: physical-class-builder-v2
    content: Update `lib/school-server/school-physical-class-report.server.js` to build per-subject V2 guidance and expose `subjectGuidanceBlocks` + `physicalClassGuidanceSeverityTier`
    status: completed
  - id: physical-view-model-v2
    content: Update `parsePhysicalClassReportViewModel` in `lib/school-portal/school-report-view-model.js` to read `subjectGuidanceBlocks` and use V2 focus/insight logic
    status: completed
  - id: unit-tests-phys
    content: Add PHYS-1–PHYS-4 test cases to `scripts/tests/school-report-view-model-unit.mjs`
    status: completed
  - id: unit-tests-tc
    content: Add TC-1–TC-9 test cases (including source-helper tests + math activity canonical fixture) to `scripts/tests/teacher-guidance-v2-unit.mjs`
    status: completed
  - id: qa-closure
    content: Run all tests and `npm run build`; produce closure report, `git status --short`, confirmations
    status: completed
isProject: false
---

# Teacher Guidance Surface Parity & Topic Classification Plan

Plan path: `docs/qa/TEACHER_GUIDANCE_SURFACE_PARITY_AND_TOPIC_CLASSIFICATION_PLAN.md`

---

## MANDATORY WORKFLOW BLOCK

This plan document is the single source of truth for this implementation.

- The owner approves implementation by pressing Cursor Build / Implement on this plan.
- No additional chat-body implementation instructions are required after approval.
- After approval: implement full approved scope start to finish, in the order described in this plan.
- Phases and sections are execution order only — they are not stop-and-wait gates requiring intermediate approval.
- Complete all implementation, then run QA, fix failures, rerun tests, and produce a closure report.
- No SQL unless explicitly stated in this plan. This plan has no SQL.
- No commit/push unless explicitly approved by the owner after the closure report is reviewed.
- If commit/push is approved: use explicit pathspecs only (e.g. `git add lib/school-server/... lib/teacher-server/...`).
- Never use `git add .` or `git add -A`.
- Do not touch simulation/parallel workstream files (`scripts/school-portal/sim/**`, nightly/daily sim scripts).

---

## 1. Accepted Parity Audit Summary

- Teacher subject-class page and school subject-class modal both call `buildTeacherClassReportPayload → buildClassTeacherGuidanceV2` with a single `subjectScope`. Already parity-equivalent on the server; only view presentation differs.
- School physical-class Report Hub calls `buildSchoolPhysicalClassReportPayload → aggregateClassReportFromStudentPayloads` (all subjects). Does **not** call `buildClassTeacherGuidanceV2`. `teacherGuidanceBlock` is `null`. View-model hard-codes `{ version: "v1" }` and reads raw `weaknessTopics` only.
- Math/geometry topics in the inspected payload: only `math`, `geometry`, and cross-subject `animals`. No skill-level keys (`addition`, `angles`, `area`, etc.) were present.
- Subject fallback dominance: 0% mapped topic coverage in all inspected math/geometry/hebrew/moledet subject-class reports.

---

## 2. Existing Data vs New Data — What This Plan Will and Will Not Fix

**This is the single most important constraint for owner expectation-setting. Read before approving.**

### What this plan fixes immediately for ALL existing reports

- Physical-class Report Hub surface parity: the manager will now see math/geometry V2 guidance blocks (including subject fallbacks) instead of only the one science topic that happened to map. The guidance will be _consistent_ between the teacher class page and the manager physical-class hub modal.
- Cross-subject topic reason: `animals` under math/geometry will be classified as `cross_subject_topic` instead of `unmapped_topic`, giving cleaner diagnostics in `classificationGapSummary`.
- Physical-class `insight` text will use `physicalClassGuidanceSeverityTier` and the worst subject, not the generic "x answers" summary.

### What this plan fixes only for newly created sessions/answers/activities

The master-page topic fallback fix (`math-master.js`, `geometry-master.js`) and the math activity topic dropdown fix only affect **future** DB rows. Sessions, answers, and activities created after deployment will carry real operation/topic keys (e.g. `multiplication`, `area`) instead of `"math"` / `"geometry"` subject-name strings or Hebrew free-text labels.

### What will NOT change for existing historical data

**No SQL. No DB migration. No retroactive correction.**

Existing rows in `learning_sessions.topic`, `answers.answer_payload.topic`, and `classroom_activities.topic` remain unchanged. This means:

- The currently inspected math class `f3ce0760-d33d-458a-a458-2ea72edf838b` will still produce broad math subject fallback after this implementation, because its historical answers carry only `math` and `animals` topic keys.
- The geometry class `aaac8e23-5f6d-4afa-a1a2-f77c9b567433` will still produce `גיאומטריה — קושי ברמת מקצוע בכיתה` for the same reason.
- The student `bfe02b03-1e46-4107-9434-e3a1a83db5be` will still produce a math subject fallback unit, not a specific operation-level recommendation, for the same historical data.
- The physical-class `כיתה ג׳ 3` will now consistently show math and geometry subject fallbacks on the manager hub (better parity), but the fallbacks themselves will remain broad because the underlying historical data has not changed.
- Existing teacher-created math activities that stored Hebrew free-text labels (e.g. `"חיבור"`) remain as `unmapped_topic` in V2 for those historical activity rows.

### Expected browser result for inspected examples after implementation

| Surface | Expected change | Still broad fallback? |
| --- | --- | --- |
| Math class `f3ce0760` — teacher page | No visible change; same V2 unit | Yes, until new sessions accumulate |
| Math class `f3ce0760` — school subject-class modal | No visible change; same V2 unit | Yes |
| Geometry class `aaac8e23` — teacher page | No visible change | Yes |
| Physical class `כיתה ג׳ 3` — manager hub | Now shows math + geometry fallback blocks alongside science topic; no longer hides them. Insight line changes. **This is the visible improvement.** | Math/geometry remain broad; science topic still appears |
| Student `bfe02b03` — teacher page | No visible change | Yes |
| Student `bfe02b03` — school student modal | No visible change | Yes |

### When will topic-level diagnosis actually appear in the browser?

After deployment of the master-page fix and the math activity dropdown fix, **new practice sessions** and **new teacher-created math activities** will carry real canonical topic keys. Once enough new answers accumulate in the report window, topic-level V2 units will appear alongside (or replacing) the broad fallback units.

**Owner manual verification** of topic-level diagnosis must use data generated **after** the fix is deployed, not the existing demo-seed data. The existing inspected class data will remain broad.

---

## 3. Architecture Decision — Physical Report Hub Parity

**Chosen option B: compose per-subject V2 guidance from each subject-class report.**

Rationale: physical class has no single teacher or `subjectScope`; building one cross-subject V2 block would lose per-subject coherence. Composing from existing subject-class guidance units is consistent with the paths already running V2.

### How `buildSchoolPhysicalClassReportPayload` gets each subject `teacherId`

Each row in `subjectRows` (from `loadSubjectClassesForPhysicalReport`) already carries `row.teacherId`. This is the teacher of that subject class in the school. The physical builder will use `row.teacherId` directly.

### Shared vs duplicated aggregation

The physical builder currently loads all student payloads once into `studentPayloadMap`. To avoid double-loading, the builder will **not** call the full `buildTeacherClassReportPayload` for each subject. Instead:

1. For each subject class row, re-aggregate the already-loaded `studentPayloadMap` entries using `aggregateClassReportFromStudentPayloads(studentPayloads, { scopeSubjects: new Set([row.subjectFocus]) })`.
2. Call `buildClassTeacherGuidanceV2(scopedAgg, { subjectScope: row.subjectFocus, studentPayloads })` directly.
3. Extract the resulting `teacherGuidanceBlock` and store as that subject's entry in `subjectGuidanceBlocks`.

The `studentPayloads` variable is already available inside `buildSchoolPhysicalClassReportPayload` after the main aggregation loop.

### What happens if one subject class fails or has no teacher

If a subject row has `row.teacherId = null` or the guidance build returns an error, that subject is included in `subjectGuidanceBlocks` with a `{ subjectFocus, classId, teacherId: null, guidanceSeverityTier: null, classRecommendationUnits: [], insufficientData: true }` entry. It does not abort the whole physical report.

### Sort order of subject blocks

`subjectGuidanceBlocks` is sorted by severity tier descending (worst first): `critical_class` > `class_needs_reinforcement` > `class_monitor` > `class_on_track` > `null`. Within same tier, sort by `cohortAccuracy` ascending (weaker first).

### `teacherGuidanceBlock` on physical payload

**Not added.** The physical payload will expose `subjectGuidanceBlocks` and `physicalClassGuidanceSeverityTier` as top-level fields. There will be no single `teacherGuidanceBlock` on the physical payload. The view-model reads `subjectGuidanceBlocks` directly.

### `parsePhysicalClassReportViewModel` behaviour

- When `body?.reportMeta?.version === "v2"` and `body.subjectGuidanceBlocks` is present: read V2 path.
- Flatten `classRecommendationUnits` from each subject block into a merged focus list, prefixed with subject label.
- Max `focusItems` = 10 (up to 2 per subject, sorted by severity then accuracy ascending).
- `insight` computed from `physicalClassGuidanceSeverityTier` + worst subject block headline.
- When version is `"v1"` or `subjectGuidanceBlocks` absent: fall back to existing V1 path (raw `weaknessTopics`). Backward compat preserved.

---

## 4. Topic Classification Root Cause & Repair

### Root causes

| Bad key | Origin |
| --- | --- |
| `"math"` as topic | `math-master.js` — `String(operation || "math")` fallback when operation is unresolved |
| `"geometry"` as topic | `geometry-master.js` — `String(currentQuestion?.topic || topic || "geometry")` fallback |
| Hebrew free-text in math activities | `pages/teacher/class/[classId]/activities/new.js` — free-text input for math topic with default `"חיבור"` |
| `"animals"` under math/geometry | Demo sim: `weakTopicForClass` does not check `weak.subject === slot.subject`; science `animals` weak topic applied to math/geometry activities |
| `"general"` | Aggregation fallback when topic is null/empty |

### Source-of-truth flow matrix

| Flow | Where topic is created | Where topic is saved | Does this plan fix it? |
| --- | --- | --- | --- |
| Regular student math practice | `math-master.js` — uses `operation` (e.g. `multiplication`); if empty, falls back to `"math"` | `learning_sessions.topic`, `answer_payload.topic` | **Yes** — `resolveSessionTopic` helper; fallback → `""` so aggregation produces `"general"` |
| Regular student geometry practice | `geometry-master.js` — uses `currentQuestion.topic` (e.g. `area`); if empty, falls back to `"geometry"` | `learning_sessions.topic`, `answer_payload.topic` | **Yes** — `resolveSessionTopic` helper; fallback → `""` |
| Teacher-created geometry / hebrew / moledet / english activity | UI dropdown enforces canonical English key from subject constants (e.g. `area`, `homeland`). | `classroom_activities.topic` | **No change needed** — already canonical |
| Teacher-created **math** activity | UI free-text input; default `"חיבור"` (Hebrew). Server accepts any 1–120 char string. | `classroom_activities.topic` | **Yes** — dropdown added in this plan (see §5) |
| School/demo generated classroom activity | `db-simulator.mjs` — `weakTopicForClass` ignores subject; can write `animals` as topic for math/geometry activities | `classroom_activities.topic` | **No** — simulation files out of scope; existing demo rows stay bad |
| Physical Report Hub aggregation | `aggregateClassReportFromStudentPayloads` passes through topic strings from session/answer rows | In-memory | **Partially** — classification gap detection improved; raw topic pass-through unchanged |

### Repair strategy

**A. Session/answer topic fallback fix — shared pure helper module**

Topic resolution is extracted into a **new shared module** `lib/learning/session-topic-helpers.js`. Both master pages import from this module. Tests import the same module directly, avoiding any Next.js/React page side-effects.

The helpers validate against existing canonical constants and **reject subject-name and generic keys explicitly**, not just on emptiness. See §5 for the full helper specification and §11 TC-7/TC-8 for the required assertions.

**B. Math activity topic normalization — in scope (see §5)**

**C. Aggregation — no change**

`report-data-aggregate.server.js` correctly passes through stored topic strings. No change.

**D. Classification gap detection — generalised (see §6)**

---

## 5. Shared Session Topic Helper Module + Math Activity Normalization

### 5a. `lib/learning/session-topic-helpers.js` — new shared pure helper module

**New file:** `lib/learning/session-topic-helpers.js`

This module exports two pure functions with no browser/React dependencies. Both master pages import from here; tests import the same module directly.

**`resolveMathSessionTopic(operation)`**

Validates against the canonical math operation key set from `OPERATIONS` in `utils/math-constants.js`. The invalid-key list is:

- `""` / null / undefined → `""`
- `"math"` (subject name) → `""`
- `"general"` → `""`
- `"mixed"` → `""`
- Any string NOT in `OPERATIONS` set → `""`
- Any canonical operation key (e.g. `"multiplication"`, `"fractions"`, `"addition"`) → returned as-is

Implementation sketch:

```javascript
import { OPERATIONS } from "../../utils/math-constants.js";

const VALID_MATH_OPERATIONS = new Set(OPERATIONS);
const MATH_REJECT_KEYS = new Set(["math", "general", "mixed"]);

export function resolveMathSessionTopic(operation) {
  const op = String(operation || "").trim();
  if (!op) return "";
  if (MATH_REJECT_KEYS.has(op)) return "";
  if (!VALID_MATH_OPERATIONS.has(op)) return "";
  return op;
}
```

**`resolveGeometrySessionTopic(questionOrTopic)`**

Validates against the canonical geometry topic key set from `TOPICS` in `utils/geometry-constants.js`. The invalid-key list:

- `""` / null / undefined → `""`
- `"geometry"` (subject name) → `""`
- `"general"` → `""`
- `"mixed"` → `""`
- Any string NOT in `Object.keys(GEOMETRY_TOPICS)` → `""`
- Any canonical geometry topic key (e.g. `"area"`, `"angles"`, `"perimeter"`) → returned as-is

```javascript
import { TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";

const VALID_GEOMETRY_TOPICS = new Set(Object.keys(GEOMETRY_TOPICS));
const GEO_REJECT_KEYS = new Set(["geometry", "general", "mixed"]);

export function resolveGeometrySessionTopic(questionOrTopic) {
  const t = String(
    (typeof questionOrTopic === "object" && questionOrTopic !== null
      ? questionOrTopic.topic
      : questionOrTopic) || ""
  ).trim();
  if (!t) return "";
  if (GEO_REJECT_KEYS.has(t)) return "";
  if (!VALID_GEOMETRY_TOPICS.has(t)) return "";
  return t;
}
```

When either helper returns `""`, the aggregation layer produces `"general"` and V2 flags it as a classification gap. The helpers are zero-dependency (no React/Next.js); tests import them directly.

### 5b. Math Teacher-Created Activity Topic Normalization — IN SCOPE

**This is a blocking requirement. The free-text math topic input must be replaced before this plan closes.**

### What currently exists

`pages/teacher/class/[classId]/activities/new.js` renders a free-text `<input>` for math topic with default value `"חיבור"` (Hebrew). The server (`teacher-activities.server.js`) accepts any 1–120 char string. Hebrew labels stored this way are not recognized by `resolveTopicLabelHe("math", "חיבור") → null`.

For geometry, hebrew, moledet_geography, and english: the UI already uses canonical dropdowns. Math must match.

### Exact implementation

**File:** `pages/teacher/class/[classId]/activities/new.js`

**Change:** replace the `else` branch free-text input for math with a grade-aware canonical dropdown.

Required imports to add:
- `import { GRADES as MATH_GRADES } from "../../../../../utils/math-constants.js";`
- `import { getMathReportBucketDisplayName } from "../../../../../utils/math-report-generator.js";`

New helper function (mirrors `geometryTopicOptionsForGrade`):

```javascript
function mathTopicOptionsForGrade(gradeKey) {
  const operations = MATH_GRADES[gradeKey]?.operations || [];
  return operations
    .filter((op) => op !== "mixed")
    .map((key) => ({ key, label: getMathReportBucketDisplayName(key) || key }));
}
```

In the `subject` `onChange` handler, add:
```javascript
if (next === "math") {
  const opts = mathTopicOptionsForGrade(gradeLevel);
  if (opts.length) setTopic(opts[0].key);
}
```

In the `gradeLevel` `onChange` handler, add:
```javascript
if (subject === "math") {
  const opts = mathTopicOptionsForGrade(g);
  if (opts.length) setTopic(opts[0].key);
}
```

Replace the final `else` (free-text input) render branch with:
```jsx
subject === "math" ? (
  <select ...>
    {mathTopicOptionsForGrade(gradeLevel).map(({ key, label }) => (
      <option key={key} value={key}>{label}</option>
    ))}
  </select>
) : (
  <input ... />  // free-text for any future subjects not yet in the dropdown system
)
```

**Initial state:** change `const [topic, setTopic] = useState("חיבור")` to `useState("")`, and on first render (or in a `useEffect` when subject/grade changes) set topic to the first canonical key for the selected subject+grade.

### Canonical math topic key list offered to teacher

The dropdown options come from `MATH_GRADES[gradeLevel].operations`, which is per-grade. All keys in `MATH_GRADES` are already in `OPERATION_NAMES` in `math-report-generator.js`. Examples of canonical keys and their Hebrew display labels:

- `addition` → `"חיבור"`
- `subtraction` → `"חיסור"`
- `multiplication` → `"כפל"`
- `division` → `"חילוק"`
- `division_with_remainder` → `"חילוק עם שארית"`
- `fractions` → `"שברים"`
- `percentages` → `"אחוזים"`
- `sequences` → `"סדרות"`
- `decimals` → `"עשרוניים"`
- `rounding` → `"עיגול"`
- `divisibility` → `"סימני התחלקות"`
- `prime_composite` → `"מספרים ראשוניים ופריקים"`
- `powers` → `"חזקות"`
- `ratio` → `"יחס"`
- `equations` → `"משוואות"`
- `order_of_operations` → `"סדר פעולות"`
- `compare` → `"השוואה"`
- `number_sense` → `"חוש מספרים"`
- `factors_multiples` → `"גורמים וכפולות"`
- `word_problems` → `"בעיות מילוליות"`
- `estimation` → `"אומדן"`
- `scale` → `"קנה מידה"`

`mixed` is excluded from the dropdown (same policy as geometry). No new Hebrew labels invented — all labels come from existing `OPERATION_NAMES`.

### What happens to existing math activities with Hebrew free-text topics

Historical `classroom_activities` rows with Hebrew text in `topic` remain as `unmapped_topic` in V2. No retroactive fix. New activities after this deployment will store canonical English keys and resolve to topic-level V2 units.

### QA proving canonical key is stored and V2 resolves it

See TC-9 in §11.

---

## 6. Generic Cross-Subject / Subject-Name Key Policy

### Hard rule: do not map generic subject keys to Hebrew labels

Do not add entries to `resolveTopicLabelHe` for:

- `math` → any Hebrew label
- `geometry` → any Hebrew label

These keys are classification failures. They may only contribute to `droppedAnswerCount` in `classificationGapSummary` and subject-level fallback. They must never become teacher-facing topic diagnosis labels.

### Generalised reason classification in `classifyDroppedTopicReason`

The updated `classifyDroppedTopicReason(subjectId, topicKey)` in `lib/teacher-server/teacher-guidance-v2.server.js` will use this logic:

```
1. If topicKey is empty / null / "general" → "general"
2. If topicKey === "mixed" → "mixed"
3. If !isTeacherRecommendableTopicKey(topicKey) → "general"
4. If topicKey === subjectId → "subject_name_topic"
5. If resolveTopicLabelHe(subjectId, topicKey) is non-null → null (mapped, keep)
6. If resolveTopicLabelHe(otherSubjectId, topicKey) is non-null
   for any otherSubjectId in REPORT_AGG_SUBJECTS → "cross_subject_topic"
7. Else → "unmapped_topic"
```

This is generic: `animals` under math triggers step 6 because `resolveTopicLabelHe("science", "animals")` returns a Hebrew label. `math` under math triggers step 4. Hebrew free-text labels (e.g. `"חיבור"`) pass through steps 1–6 failing all and land at step 7 `unmapped_topic`. No hardcoded subject strings needed.

### Finalised policy table

| Key situation | Reason emitted | Contributes to fallback? | Shown to teacher? |
| --- | --- | --- | --- |
| `math` under `math` | `subject_name_topic` | Yes (subject fallback) | No |
| `geometry` under `geometry` | `subject_name_topic` | Yes | No |
| `animals` under `math` or `geometry` | `cross_subject_topic` | Yes | No |
| Hebrew free-text (e.g. `"חיבור"`) | `unmapped_topic` | Yes | No |
| `general` / empty | `general` | Yes | No |
| `mixed` | `mixed` | Yes | No |
| Valid mapped canonical key | `null` (kept) | No — used as topic unit | Yes, via `topicLabelHe` |

---

## 7. Subject Fallback Policy Refinement

**When subject fallback is acceptable (temporary, low-confidence):**

- Topic metadata is genuinely absent: `general`, missing, `subject_name_topic`, `cross_subject_topic`.
- Historical data not retroactively fixable.
- Subject accuracy is below threshold and enough answers exist.

**When subject fallback is a QA/data-pipeline failure:**

- Math or geometry subject fallback covers > 80% of subject answers AND the bad-key reason is `subject_name_topic` or `cross_subject_topic` (not just `general`).
- This indicates a fixable upstream source, not merely sparse data.

**Teacher-facing display:**

- Headline: keep `[מקצוע] — קושי ברמת מקצוע`.
- Action for math/geometry: `מומלץ לפתוח תרגול אבחוני קצר כדי לזהות את הנושא המדויק — טרם אובחן נושא מדויק`.
- Do not expose raw reason codes (`subject_name_topic`, etc.) to teachers.

---

## 8. Physical Report Hub — Exact File Changes

- [`pages/api/school/classes/physical-report.js`](pages/api/school/classes/physical-report.js): no change to route.
- [`lib/school-server/school-physical-class-report.server.js`](lib/school-server/school-physical-class-report.server.js):
  - Import `aggregateClassReportFromStudentPayloads` (already used), `buildClassTeacherGuidanceV2` from guidance-v2 server.
  - After main aggregation, for each subject row: call `aggregateClassReportFromStudentPayloads(studentPayloads, { scopeSubjects: new Set([row.subjectFocus]) })`, then `buildClassTeacherGuidanceV2(scopedAgg, { subjectScope: row.subjectFocus, studentPayloads })`. If `row.teacherId` is null, emit `insufficientData: true` block.
  - Collect `subjectGuidanceBlocks` (sorted by severity desc, accuracy asc). Compute `physicalClassGuidanceSeverityTier`.
  - Add `subjectGuidanceBlocks`, `physicalClassGuidanceSeverityTier` to payload. Set `reportMeta.version: "v2"`.
  - Do NOT add `teacherGuidanceBlock` to the physical payload.
- [`lib/school-portal/school-report-view-model.js`](lib/school-portal/school-report-view-model.js) — `parsePhysicalClassReportViewModel`:
  - When `body?.reportMeta?.version === "v2"` and `body.subjectGuidanceBlocks` present: flatten units, pass to `buildFocusAreasFromWeaknessSource` with `{ version: "v2" }`.
  - Build `insight` from `physicalClassGuidanceSeverityTier` + worst-subject headline.
  - Preserve V1 path otherwise.

---

## 9. Teacher Class / Student Page — Changes

Minor additions only:

- [`lib/teacher-server/teacher-guidance-v2.server.js`](lib/teacher-server/teacher-guidance-v2.server.js): generalise `classifyDroppedTopicReason` per §6 logic. No other change.
- [`pages/teacher/class/[classId].js`](pages/teacher/class/[classId].js): no rendering change.
- [`pages/teacher/student/[studentId].js`](pages/teacher/student/[studentId].js): no rendering change.
- [`lib/teacher-server/teacher-class-report.server.js`](lib/teacher-server/teacher-class-report.server.js): no change.

---

## 10. Implementation Boundaries

Out of scope:

- SQL / DB migrations
- Retroactive correction of existing answer/session/activity rows
- Changes to simulation scripts (`scripts/school-portal/**`)
- Question generator logic (generators already produce correct keys)
- Hebrew question metadata, parent/guardian reports, worksheet PDF, school messaging
- Broad UI redesign
- Demo-data regeneration (separate plan if needed)
- Geometry / hebrew / moledet / english activity topic pickers — already canonical; no change

---

## 11. QA Requirements

### Surface parity tests (`scripts/tests/school-report-view-model-unit.mjs`)

- `PHYS-1`: physical class payload with `subjectGuidanceBlocks` and `version: "v2"` produces V2 `focusItems` including math and geometry fallback blocks.
- `PHYS-2`: physical Report Hub view-model `insight` uses `physicalClassGuidanceSeverityTier`, not the generic activity summary.
- `PHYS-3`: subject-class modal and physical hub agree on geometry `guidanceSeverityTier` for the same fixture.
- `PHYS-4`: physical hub `focusItems` includes math and geometry subject fallback entries when topic data is missing; does not hide them.

### Topic classification tests (`scripts/tests/teacher-guidance-v2-unit.mjs`)

- `TC-1`: math session fixture with `operation = "multiplication"` produces `classRecommendationUnits` with `topicLabelHe` for multiplication, not a subject fallback.
- `TC-2`: geometry session fixture with `question.topic = "area"` produces a topic-level unit for `area`, not a subject fallback.
- `TC-3`: `animals` under `subjects.math.topics` is classified as `cross_subject_topic` in `classificationGapSummary`.
- `TC-4` (Option A — approved): `classifyDroppedTopicReason("math", "math")` returns `"subject_name_topic"`. `detectFallbackDominance({ droppedAnswerCount: 85, totalAnswers: 100 })` returns `{ dominant: true, reason: "high_fallback_ratio", ratio: 0.85 }`. Test **passes** by asserting the finding object shape — it does not assert that the implementation rejects such data.

### Master-page source-fix verification (`TC-5`, `TC-6`, `TC-7`, `TC-8`)

**TC-5** — post-fix synthetic fixture: math student payload where all topic keys are real operation strings (`multiplication`, `fractions`). Asserts: no subject fallback unit generated; at least one topic-level unit with `topicLabelHe` present.

**TC-6** — post-fix synthetic fixture: geometry student payload where topic keys are real geometry strings (`area`, `angles`). Asserts: topic-level units present, no subject fallback.

**TC-7 — unit test of `resolveMathSessionTopic` from `lib/learning/session-topic-helpers.js`:**

```javascript
import { resolveMathSessionTopic } from "../../lib/learning/session-topic-helpers.js";

assert(resolveMathSessionTopic("multiplication") === "multiplication");
assert(resolveMathSessionTopic("fractions") === "fractions");
assert(resolveMathSessionTopic("addition") === "addition");
assert(resolveMathSessionTopic(undefined) === "");
assert(resolveMathSessionTopic("") === "");
assert(resolveMathSessionTopic("math") === "");        // subject name — must be rejected
assert(resolveMathSessionTopic("general") === "");     // generic — rejected
assert(resolveMathSessionTopic("mixed") === "");       // mixed — rejected
assert(resolveMathSessionTopic("חיבור") === "");       // Hebrew free-text — not in OPERATIONS set, rejected
```

The critical assertion: `resolveMathSessionTopic("math") === ""`. The subject name `"math"` is not a valid diagnostic key and must be blocked at the helper level, not just at the fallback level. `"math"` is not in `VALID_MATH_OPERATIONS` (it is not in the `OPERATIONS` array from `math-constants.js`), so it naturally fails the whitelist check.

**TC-8 — unit test of `resolveGeometrySessionTopic` from `lib/learning/session-topic-helpers.js`:**

```javascript
import { resolveGeometrySessionTopic } from "../../lib/learning/session-topic-helpers.js";

assert(resolveGeometrySessionTopic({ topic: "area" }) === "area");
assert(resolveGeometrySessionTopic({ topic: "angles" }) === "angles");
assert(resolveGeometrySessionTopic({ topic: "perimeter" }) === "perimeter");
assert(resolveGeometrySessionTopic({ topic: undefined }) === "");
assert(resolveGeometrySessionTopic({ topic: "" }) === "");
assert(resolveGeometrySessionTopic({ topic: "geometry" }) === "");   // subject name — rejected
assert(resolveGeometrySessionTopic({ topic: "general" }) === "");    // generic — rejected
assert(resolveGeometrySessionTopic({ topic: "mixed" }) === "");      // mixed — rejected
assert(resolveGeometrySessionTopic({ topic: "animals" }) === "");    // not in GEOMETRY_TOPICS — rejected
```

The critical assertion: `resolveGeometrySessionTopic({ topic: "geometry" }) === ""`. `"geometry"` is not a key in `Object.keys(GEOMETRY_TOPICS)` (which contains `"area"`, `"angles"`, `"perimeter"`, etc. — not `"geometry"` itself), so it naturally fails the whitelist check. No special-case needed.

### Math activity canonical topic (`TC-9`)

**TC-9 — unit/fixture test for math activity topic normalization:**

Create a test fixture simulating the activity creation flow for `subject = "math"`, `gradeLevel = "g3"`, `topic = "multiplication"` (selected from the canonical dropdown):

1. Assert `mathTopicOptionsForGrade("g3")` returns an array whose `key` values are all from `MATH_GRADES.g3.operations` (excluding `mixed`).
2. Assert every returned key is recognized by `getMathReportBucketDisplayName(key)` — i.e. the displayed Hebrew label is not the raw key string.
3. Assert `resolveTopicLabelHe("math", "multiplication")` returns a non-null Hebrew string (proves the canonical key resolves in V2).
4. Assert `resolveTopicLabelHe("math", "חיבור")` returns `null` (proves Hebrew free-text still fails and would be `unmapped_topic`).

This covers the full path: dropdown generates canonical key → stored to DB → V2 resolves as topic-level unit.

### Regression tests

- No raw topic keys shown as teacher-facing topic labels.
- No `נושא לא מסווג` visible in any rendered output.
- No calm message when accuracy < 65%.
- No duplicate recommendation units.
- `npm run build` passes.

---

## 12. Current Uncommitted Implementation Status

**Recommended: keep as baseline and incrementally modify. Approval for commit is not automatic.**

The current uncommitted correction (12 modified files) introduced V2 fallback engine, severity model, misleading-state guards, and Hebrew copy. These are still needed. They should not be reverted.

The new work (physical hub parity + topic classification + math activity dropdown) should be implemented on top. Then the owner reviews the combined result in the browser **using newly generated post-fix data** before approving commit.

**Condition:** if after implementation the owner finds that the broad subject fallbacks on existing historical data are too misleading even with the improved physical-hub parity, the options are:

- Keep current subject fallback but add a visible "low-confidence" label in the UI (additional adjustment, not a revert).
- Suppress subject fallback display for math/geometry until > X new answers with real topic keys accumulate (configurable threshold, not a revert).
- Revert and re-plan only as a last resort.

Do not decide during implementation. The owner will review and choose after seeing browser results with post-fix data.

Net new files modified by this plan (on top of existing uncommitted state):

- `lib/learning/session-topic-helpers.js` (**new file** — `resolveMathSessionTopic`, `resolveGeometrySessionTopic`)
- `pages/teacher/class/[classId]/activities/new.js` (math topic dropdown — **new in this version**)
- `lib/school-server/school-physical-class-report.server.js`
- `lib/school-portal/school-report-view-model.js` (further changes)
- `lib/teacher-server/teacher-guidance-v2.server.js` (generalised classification)
- `pages/learning/math-master.js` (import and use `resolveMathSessionTopic`)
- `pages/learning/geometry-master.js` (import and use `resolveGeometrySessionTopic`)
- `scripts/tests/teacher-guidance-v2-unit.mjs` (TC-1–TC-9)
- `scripts/tests/school-report-view-model-unit.mjs` (PHYS-1–PHYS-4)

---

## 13. Delivery Requirements

At closure, implementation must produce:

- Closure report.
- `node scripts/tests/teacher-guidance-v2-unit.mjs` — all PASS including TC-1–TC-9 (TC-7/TC-8 import from `lib/learning/session-topic-helpers.js`).
- `node scripts/tests/school-report-view-model-unit.mjs` — all PASS including PHYS-1–PHYS-4.
- `npm run build` — PASS.
- `git status --short`, `git diff --name-only`.
- Confirmation no SQL run.
- Confirmation no simulation/parallel files touched.
- Explicit note on what browser verification data must be: post-fix newly generated sessions and activities, not existing historical demo data.
- Commit/push only if explicitly approved with explicit pathspecs; no `git add .` or `git add -A`.

### Parent Report Safety Check (regression only — not in implementation scope)

Because parents are the primary product audience, the closure report must include a dedicated parent-report safety section even though parent reports are not modified by this plan.

**1. File-change guard**

`git diff --name-only` output must be checked against the following paths. If any of these appear in the diff, it is a blocker — stop and report before committing:

- `lib/parent-server/**`
- `pages/parent/**`
- `pages/api/parent/**`
- `pages/learning/parent-report*`
- `components/parent/**`
- `utils/parent-report*`
- `utils/detailed-parent-report*`

If none of these paths appear in the diff, confirm in the closure report: "Parent report files unchanged."

**2. Existing parent-report test script**

Search the repo for any existing parent-report smoke or unit test script (e.g. `scripts/tests/parent-report*`, `scripts/tests/*parent*`). If found, run it and include the result in the closure report.

**3. If no test script exists or environment is unavailable**

State clearly in the closure report: "No automated parent-report test found. Manual verification required." Include the following owner checklist in the closure report for manual review before commit/push approval:

- Regular parent report still loads without errors.
- Parent PDF / print preview still loads if relevant in the product.
- No "no data" or empty state when student activity exists.
- No raw English topic keys visible in the parent-facing output.
- No contradiction between subject accuracy shown to parent vs. teacher.

**4. Hard rule**

The implementation must not intentionally modify any parent/guardian report code. If a parent-report file was accidentally touched (e.g. by a shared import change), this must be called out explicitly in the closure report with justification before the owner approves commit.
