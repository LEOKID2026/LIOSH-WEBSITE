---
name: Classroom Activities All Subjects
overview: Comprehensive audit and rollout plan for adding Geometry, Hebrew, English, and Moledet-Geography to classroom activities, plus fixing Science quality gaps. All findings are read-only; no files are modified.
todos:
  - id: audit-complete
    content: Audit complete — read plan above; no files modified
    status: pending
  - id: blocker-science-grade
    content: "Decide: fix Science grade/difficulty regression before or alongside Phase B1"
    status: pending
  - id: blocker-hebrew-typing
    content: "Decide: exclude typing-mode items from Hebrew classroom activities, or add acceptedAnswers scoring"
    status: pending
  - id: blocker-geometry-diagram
    content: "Decide: render geometry diagrams in student activity player, or text-only for Phase B2"
    status: pending
  - id: blocker-hebrew-copy
    content: Get Hebrew UI copy approval before enabling any new subject dropdown labels
    status: pending
  - id: phase-b1-moledet
    content: "Implement Phase B1: Moledet-Geography adapter + Science grade fix"
    status: pending
  - id: phase-b2-geometry-science
    content: "Implement Phase B2: Geometry adapter + remaining Science fixes"
    status: pending
  - id: phase-b3-hebrew
    content: "Implement Phase B3: Hebrew adapter"
    status: pending
  - id: phase-b4-english
    content: "Implement Phase B4: English generator extraction + adapter"
    status: pending
isProject: false
---

# Classroom Activities — Full Subject Expansion Audit

## Architecture Recap (Phase A)

The Phase A gate lives in exactly two files:

- [`lib/classroom-activities/classroom-activities-preview.js`](lib/classroom-activities/classroom-activities-preview.js) — `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS = new Set(["math", "science"])`
- [`lib/classroom-activities/generate-activity-questions-client.js`](lib/classroom-activities/generate-activity-questions-client.js) — subject switch; throws for unlisted subjects

All create requests are also blocked server-side in [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js) via `parseCreateActivityBody` → `subject_preview_not_supported`.

The teacher UI at [`pages/teacher/class/[classId]/activities/new.js`](pages/teacher/class/[classId]/activities/new.js) filters the subject dropdown with `REPORT_SUBJECTS.filter(s => ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS.has(s))`.

---

## 1. Current State Per Subject

### Math (Phase A — implemented, needs cleanup)

- Generator: [`utils/math-question-generator.js`](utils/math-question-generator.js)
- Grade filter: YES — `normalizeGradeKey` → g1–g6, passed to generator
- Topic filter: WEAK — `mathOperationFromTopic(topic)` is a substring heuristic; does not use the full curriculum topic catalog
- `correctAnswer`: YES (computed numeric string)
- `choices`: NOT included in frozen set — student uses free-text input
- `explanation` / `hint`: rarely populated by generator at top level
- `skillKey`: available via `params.diagnosticSkillId` but not copied to frozen item
- Diagrams: none

### Science (Phase A — implemented, critical quality gaps)

- Bank: [`data/science-questions.js`](data/science-questions.js) (~945 items across 9 batch files)
- Grade filter: **MISSING from classroom preview** — `generate-activity-questions-client.js` lines 110–115 filter only by topic substring; `gradeLevel` is accepted but unused
- Topic filter: WEAK — substring match only; falls back to entire bank if pool too small
- Selection: deterministic `source[i % source.length]` — no shuffle, no deduplication
- `correctAnswer`: YES (via `correctIndex` → `options[i]`)
- `choices`: YES (4-option MCQ)
- `explanation`: YES on most items
- Thin pool risk: 41 blocker cells (especially g1–g3 medium/hard life-science)
- `skillKey`: available via `params.diagnosticSkillId` but not copied

### Geometry (not yet supported)

- Generator: [`utils/geometry-question-generator.js`](utils/geometry-question-generator.js) — procedural
- Conceptual bank: [`utils/geometry-conceptual-bank.js`](utils/geometry-conceptual-bank.js) — 52 templates
- Probe bank: [`utils/geometry-probe-bank.js`](utils/geometry-probe-bank.js)
- Grade filter: STRONG — `geometry-grade-topic-policy.js`, grade-specific `TOPIC_SHAPES`
- Topic filter: STRONG — 18 topic keys (`area`, `perimeter`, `circles`, `pythagoras`, etc.)
- `correctAnswer`: computed (formulas) or static string — generally reliable; RISK: some items use Hebrew string labels or index strings ("1"…"6") that require stem alignment
- `choices`: generator returns `answers[]` (shuffled MCQ) — **not copied to frozen set today** — needs adapter
- `explanation`: NOT in generator output; lives separately in [`utils/geometry-explanations.js`](utils/geometry-explanations.js) keyed by `topic`/`kind`
- `hint`: not present
- `shape` and `params` needed for [`components/learning/geometry/GeometryExplanationDiagram.jsx`](components/learning/geometry/GeometryExplanationDiagram.jsx)
- `skillKey`: `params.diagnosticSkillId` present

### Hebrew (not yet supported)

- Generator: [`utils/hebrew-question-generator.js`](utils/hebrew-question-generator.js) (~5,300 lines, standalone util)
- Rich bank: [`utils/hebrew-rich-question-bank.js`](utils/hebrew-rich-question-bank.js) (54 items)
- G3 reading bank: [`data/hebrew-g3-reading-bank.js`](data/hebrew-g3-reading-bank.js) (46 items)
- Archive NOT live: `data/hebrew-questions/g1-g6.js` — explicitly excluded
- Grade filter: YES — per-grade inline pools + `minGrade/maxGrade` on rich pool
- Topic filter: YES — reading, comprehension, grammar, vocabulary, writing, speaking, mixed
- `correctAnswer`: YES — generator resolves `answers[correct]` after shuffle
- `choices`: YES — 4-option MCQ for most; some subtopics use typing mode (`answerMode: "typing"`)
- `explanation`: NOT on bank rows
- `hint`: NOT on bank rows
- `skillKey`: `params.diagnosticSkillId` present
- Complications: (a) niqqud/audio pipeline used at g1–g2 — classroom frozen items should store plain text stems; (b) reading passages are embedded in `question` text (no separate `passage` field); (c) typing mode items store `acceptedAnswers[]` — server `answersMatch` can handle this but `choices` would be empty

### English (not yet supported)

- Data pools: [`data/english-questions/grammar-pools.js`](data/english-questions/grammar-pools.js) (~617), [`data/english-questions/sentence-pools.js`](data/english-questions/sentence-pools.js) (~229), [`data/english-questions/translation-pools.js`](data/english-questions/translation-pools.js) (~172 phrase pairs), [`data/english-questions/word-lists.js`](data/english-questions/word-lists.js) (~722 entries)
- Generator: **INSIDE `pages/learning/english-master.js`** — not a standalone util (critical coupling)
- Grade filter: YES — `minGrade/maxGrade` per pool row; `englishPoolItemAllowedWithClassSplit`
- Topic filter: YES — vocabulary, grammar, translation, sentences, writing
- `correctAnswer`: YES for grammar/sentences (static); REQUIRES RUNTIME EXPANSION for translation (phrase pairs lack MCQ options) and vocabulary (random word list entry)
- `choices`: YES for grammar/sentences (static options); runtime-assembled for translation/vocabulary (pool rows have no `options`)
- `explanation`: YES on grammar/sentences; absent on translation/vocabulary
- Complications: (a) generator is embedded in the page — must be extracted into `utils/english-question-generator.js`; (b) translation items need distractor expansion at preview time; (c) bilingual question direction (`en_to_he` / `he_to_en`) must be captured in `params`

### Moledet-Geography (not yet supported)

- Bank: [`data/geography-questions/g1.js`](data/geography-questions/g1.js) … `g6.js` (~3,506 total items; ~617 per grade)
- Generator: [`utils/moledet-geography-question-generator.js`](utils/moledet-geography-question-generator.js)
- Curriculum: [`data/moledet-geography-curriculum.js`](data/moledet-geography-curriculum.js)
- Grade filter: STRONG — per-grade files, no silent cross-grade fallback; `listTopicQuestionsForGradeLevel` returns `emptyPool: true` if nothing found
- Topic filter: STRONG — 6 topics: homeland, community, citizenship, geography, values, maps
- `correctAnswer`: YES — 4-option MCQ, `correct` index → `answers[correct]`; generator resolves to string
- `choices`: YES — 4-option MCQ (text)
- `explanation`: NOT on bank rows
- `hint`: NOT on bank rows
- `skillKey`: `skillId` present on bank rows
- Map/image data: NONE — all text-only questions
- Quality risks: 725 duplicate `stemHash` values (pedagogical spiral is intentional but inflates uniqueness perception); some factual quality flags noted in `docs/product-quality-phase-23-homeland-geography-factual-review.md`

---

## 2. Adapter Feasibility Per Subject

| Subject | Adapter type needed | Key work |
|---------|---------------------|----------|
| **Math** | Cleanup only | Add `choices` (MCQ) or document free-text; fix topic mapping to use curriculum keys; copy `skillKey` |
| **Science** | Generator cleanup | Add real grade+difficulty filter; add shuffle + dedup; fix cycling |
| **Geometry** | Thin adapter + normalization | Snapshot `answers[]` as `choices`; pull explanation from `geometry-explanations.js`; normalize correctAnswer type; capture `shape` + `params` |
| **Hebrew** | Thin adapter | Call `generateQuestion` from existing util; strip audio metadata; handle typing mode `acceptedAnswers`; no archive items |
| **English** | Generator extraction + adapter | Extract generator from `english-master.js` → new `utils/english-question-generator.js`; pre-expand translation MCQ distractors |
| **Moledet-Geography** | Thin adapter | Clone science pattern; add grade+level filter from `listTopicQuestionsForGradeLevel`; shuffle; copy `skillId` → `skillKey` |

---

## 3. Required Unified Question Format

Every adapter must output objects conforming to this schema before they are stored in `classroom_activities.question_set`:

```json
{
  "question":      "(required) string — full question stem; passages embedded if needed",
  "correctAnswer": "(required) string — authoritative answer stored server-side only",
  "choices":       "(optional) string[] — MCQ options array; present for MCQ subjects",
  "acceptedAnswers": "(optional) string[] — for typing-mode items with multiple valid answers",
  "explanation":   "(optional) string — full explanation; omitted in quiz start payload",
  "hint":          "(optional) string — hint text; omitted in quiz start payload",
  "subject":       "(required) string — lowercase subject key",
  "topic":         "(required) string — canonical topic key from curriculum definition",
  "subtopic":      "(optional) string",
  "gradeLevel":    "(optional) string — g1..g6",
  "difficulty":    "(optional) string — easy | medium | hard | mixed",
  "skillKey":      "(optional) string — diagnosticSkillId for adaptive planner",
  "params":        "(optional) object — extra render data; see subject-specific notes below"
}
```

Subject-specific `params` extensions:

- **Geometry**: `{ kind, shape, patternFamily, subtype, side, base, height, radius, ... }` — needed by `GeometryExplanationDiagram`
- **Hebrew**: `{ gradeKey, levelKey, patternFamily, subtype, answerMode }` — `answerMode` tells student UI whether to show MCQ or text input
- **English**: `{ topic, direction, patternFamily, grammarOptionSet, listKey }` — `direction` is `en_to_he` or `he_to_en`
- **Moledet-Geography**: `{ skillId, subtype, difficulty, cognitiveLevel }` — mirrors bank row

The existing `validateSameExactQuestionSet` in [`lib/classroom-activities/classroom-activities-shared.server.js`](lib/classroom-activities/classroom-activities-shared.server.js) already accepts `correctAnswer` (no schema change needed at DB level). `stripQuestionSetForStudent` already removes all answer-revealing fields.

---

## 4. Subject-Specific Complications

### Geometry — Diagram Render Data

Geometry questions that reference shapes (area, perimeter, circles, pythagoras) are currently rendered with SVG diagrams driven by `getGeometryDiagramSpec(params, shape, topic)`. A frozen classroom question must include the full `params` object and `shape` string so the student player can reconstruct the diagram. The adapter must snapshot these. The student player (`pages/student/activity/[activityId].js`) will need a small diagram-aware render path for geometry items (check `q.params.kind` and `q.subject === "geometry"`). This is a UI addition but does not affect scoring or security.

### Hebrew — Passages, Niqqud, Typing Mode

Reading comprehension passages are embedded in `question` text (no separate field). This is acceptable for frozen sets. The adapter should:
- Call `generateQuestion` from `hebrew-question-generator.js` (already a standalone util)
- Store `answers[]` as `choices` and the resolved `correctAnswer` string (not the index)
- Store `acceptedAnswers` for typing-mode items
- Store `answerMode` in `params` so the student player can render correctly
- OMIT audio/niqqud API calls — classroom frozen questions use plain text stems only; nakdan enrichment belongs to live learning only
- Do NOT use archive bank (`data/hebrew-questions/`)

### English — Generator Coupling and Translation Expansion

The English generator (`generateQuestion` in `english-master.js`) is the only subject generator not extracted to a standalone util. Before an adapter can be written, this function (and its helpers: `resolveEnglishQType`, `buildEnglishMcqOptions`, etc.) must be moved to `utils/english-question-generator.js`. Translation pool rows have no `options` field; at preview time the adapter must build MCQ distractors from the word list pool (the same logic `english-master.js` uses today).

### Moledet-Geography — Quality Pre-Screening

The 725 duplicate `stemHash` values mean deduplication by `question|correctAnswer` fingerprint (as math does) is essential. The generator already shuffles `answers` and recomputes `correctIndex`. The adapter should use `listTopicQuestionsForGradeLevel(gradeKey, levelKey, topic)` to get the correct grade-level pool — do NOT import grade files directly. If the pool returns `emptyPool: true`, throw a clear error rather than falling back to another grade.

### Science — Current Bugs to Fix Before Expansion

These are regressions in the existing Phase A implementation:
1. **Grade filter missing**: science preview ignores `gradeLevel` entirely — must add `q.grades.includes(gradeKey)` filter
2. **Difficulty filter missing**: `minLevel`/`maxLevel` not applied — must add `levelAllowed(q, levelKey)` filter (already exists in `science-master.js`)
3. **No shuffle**: `source[i % source.length]` cycling → replace with Fisher-Yates + dedup by `question|correctAnswer`
4. **Topic mismatch for Hebrew topic strings**: teacher may type Hebrew topic labels — add a normalization map (Hebrew label → bank `topic` key) matching what science-master uses

---

## 5. Security / Scoring Requirements

All subjects share the same security model — no changes to the security layer are needed. Confirmed properties:

- `stripQuestionSetForStudent` (lines 159–172 of `classroom-activities-shared.server.js`) removes `correctAnswer`, `correct_answer`, `expectedAnswer`, `answer` from every student payload
- Quiz mode additionally removes `hint` and `explanation` (confirmed by tests in `classroom-activities-shared.test.mjs` lines 16–29)
- `extractCorrectAnswerFromQuestion` supports `correctAnswer` or `correct_answer` alias — adapters should write `correctAnswer`
- `answersMatch` uses numeric tolerance + case-insensitive string comparison — covers MCQ, free text, and Hebrew answers
- `validateSameExactQuestionSet` (called at save time server-side) requires `question` and `correctAnswer` — all adapters must pass this
- Student answer route (`pages/api/student/activities/[activityId]/answer.js`) reads `question_snapshot` from DB at score time — `correctAnswer` never sent to client

The only new security consideration is geometry `params` — diagram render data exposed to students is non-sensitive (shape dimensions, not answers). The `correctAnswer` is still stripped normally.

For typing-mode Hebrew items, `acceptedAnswers` contains correct alternatives. The adapter must store these in the frozen item and `answersMatch` on the server will need to iterate them — this may require a small extension to `answersMatch` or a separate `answersMatchList` helper.

---

## 6. UI Impact

### Current Teacher UI Gaps

The topic field is a free-text `<input>` with no subject-aware validation. This means:
- Math teachers type Hebrew operation names (`חיבור`) or English ones (`addition`) — accepted via heuristic
- Science teachers must type an exact bank topic key (`body`, `animals`) or the preview falls back to the full bank

### Required UI Changes (subject-aware topic dropdown)

When each new subject is added, the teacher UI must replace the free-text topic input with a subject-aware `<select>` that lists valid topics for the selected subject+grade combination. A shared helper like `getTopicsForSubjectAndGrade(subject, gradeKey)` should be created, driven by the existing curriculum constants:

| Subject | Curriculum source | Topics |
|---------|-------------------|--------|
| Math | `utils/math-constants.js` | operation names per grade |
| Science | `data/science-curriculum.js` | `SCIENCE_GRADES[g].topics` |
| Geometry | `utils/geometry-constants.js` | `GRADES[g].topics` |
| Hebrew | `data/hebrew-curriculum.js` | fixed 6 topics (all grades) |
| English | `data/english-curriculum.js` | `ENGLISH_GRADES[g].topics` |
| Moledet-Geography | `utils/moledet-geography-constants.js` | `GRADES[g].topics` |

The dropdown must not show topics that have zero questions for the selected grade+difficulty combination — the adapter should expose a `hasSufficientQuestions(subject, gradeKey, topic, difficulty, count)` check used in the UI before preview.

### Subject Enablement Order (UI)

- No UI copy changes until Hebrew copy is reviewed by the product owner
- The subject dropdown filter `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS.has(s)` is the single safe gate — only update this Set when an adapter is fully tested
- Each new subject must go through preview → save → student-start → student-answer → submit flow before the subject appears in the dropdown

---

## 7. QA Plan

### Per Subject — Adapter Unit Tests

Each subject needs a test file at `tests/classroom-activities/generate-[subject]-activity-questions.test.mjs`:

- Generates exactly `N` questions for valid grade+topic+difficulty combos
- Each item passes `validateSameExactQuestionSet`
- Each item has a non-empty `question` string
- Each item has a non-null `correctAnswer` string
- MCQ items have `choices` array with 2–6 elements containing `correctAnswer`
- Throws (not falls back) for unsupported grade+topic combinations
- Throws for empty pools (moledet-geography g1–g2 with thin topics)
- Dedup: no two items have identical `question|correctAnswer` fingerprint (for N ≤ pool size)

### Scoring Tests (extend `classroom-activities-shared.test.mjs`)

- `stripQuestionSetForStudent` removes `correctAnswer` for all new subject items
- Quiz mode removes `hint`/`explanation` for all new subjects
- `answersMatch` correctly scores MCQ answer (selected choice text == `correctAnswer`)
- `answersMatch` correctly rejects wrong choice
- Hebrew typing mode: `answersMatch` matches one of `acceptedAnswers`
- Geometry numeric answer: `answersMatch` numeric tolerance works

### Generator/Bank Tests

- Geometry: `generateQuestion` returns `answers[]` (choices) for all grade/topic/difficulty combos
- Science: after grade+difficulty fix, preview returns only questions where `q.grades.includes(gradeKey)`
- Moledet-Geography: empty-pool branches throw; thin-pool branches warn
- English: grammar/sentences pools return static MCQ; translation returns expanded MCQ

### Teacher Preview Tests (extend `tests/e2e/teacher-activities.spec.ts`)

- Teacher can select new subject in dropdown (after it is enabled)
- Topic dropdown lists only valid topics for selected subject+grade
- Preview renders N questions; all have visible question text and choices (where applicable)
- Preview cannot be saved without previewing first
- Unsupported grade+topic combos show a clear Hebrew error (no placeholder questions)

### Student Activity Tests

- Student start payload contains `choices` (not `correctAnswer`) for MCQ subjects
- Quiz start payload omits `hint` and `explanation`
- Student submits correct answer → `isCorrect: true` in response
- Student submits wrong answer → `isCorrect: false` in response
- Student cannot submit `correctAnswer` field in request body (server ignores it)

### Regression Tests — Independent Learning

- Each new subject adapter must not break the existing `pages/learning/[subject]-master.js` flow (adapters are new files; generators are called read-only)

---

## 8. Recommended Rollout

### Phase B1 — Moledet-Geography (SMALL, 1–2 days)

Easiest subject to add. Pure static MCQ bank, strong per-grade per-level pools, standalone generator, no media, no typing mode. The adapter is a near-clone of the science pattern but correctly wires grade+level filtering. Can be done immediately after the simulation phase.

Steps:
1. Write `generateMoledettGeographyActivityQuestions` in `generate-activity-questions-client.js`
2. Add `"moledet-geography"` to `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS`
3. Add topic dropdown for moledet-geography to teacher UI
4. Add adapter unit tests + scoring tests
5. Run sim

### Phase B2 — Science Fixes + Geometry (MEDIUM, 3–4 days)

Science bug fixes are technically part of Phase A completion — they should be treated as high-priority regressions, not Phase B features. Fix simultaneously with Geometry because they follow the same pattern (bank sampling + grade filter).

Science steps:
1. Add grade+difficulty filter to science preview in `generate-activity-questions-client.js`
2. Add shuffle + dedup
3. Add Hebrew→bank topic normalization map
4. Update `classroom-activities-shared.test.mjs` to assert grade filter works

Geometry steps:
1. Write `generateGeometryActivityQuestions` in `generate-activity-questions-client.js`
2. Snapshot `answers[]` as `choices`, pull explanation from `geometry-explanations.js`
3. Add `shape` and `params` to frozen item
4. Confirm student player can render geometry diagram from `params` (minor UI addition)
5. Add `"geometry"` to `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS`
6. Adapter + scoring tests

### Phase B3 — Hebrew (MEDIUM-LARGE, 3–5 days)

Hebrew generator is large but well-organized as a standalone util. The main work is adapter design (typing mode, niqqud exclusion) and ensuring the generator is called with the right grade+topic params. No archive items.

Steps:
1. Write `generateHebrewActivityQuestions` in `generate-activity-questions-client.js`
2. Filter out typing-mode items if classroom player does not yet support them, OR include them with `params.answerMode` and verify `answersMatch` handles `acceptedAnswers`
3. Strip any audio/niqqud metadata from frozen items
4. Add `"hebrew"` to `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS`
5. Hebrew topic dropdown in teacher UI (6 topics, all grades)
6. Add `answersMatchList` helper to `classroom-activities-shared.server.js` if needed for `acceptedAnswers`
7. Full test suite

### Phase B4 — English (LARGE, 5–7 days)

Largest scope due to generator coupling. Must not be rushed.

Steps:
1. Extract `generateQuestion` and all helpers from `pages/learning/english-master.js` → new `utils/english-question-generator.js` (no behavior change; update import in master page)
2. Write `generateEnglishActivityQuestions` in `generate-activity-questions-client.js`
3. Pre-expand translation rows (build MCQ distractors at preview time using word list pools)
4. Pre-expand vocabulary rows (select random word + distractors at preview time)
5. Add `"english"` to `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS`
6. English topic dropdown (vocab, grammar, translation, sentences) per grade
7. Full test suite
8. Regression test that `english-master.js` still works with extracted generator

---

## 9. Deliverables Summary

### Subject Readiness Table

| Subject | Bank/Generator | Grade Filter | Topic Filter | correctAnswer | choices | Complexity | Status |
|---------|---------------|-------------|-------------|--------------|---------|------------|--------|
| Math | Procedural generator | YES | WEAK | YES | NO | Small cleanup | Phase A (needs cleanup) |
| Science | Static bank ~945 | MISSING | WEAK | YES | YES | Medium (2 bugs) | Phase A (regressed) |
| Geometry | Procedural + 52-item bank | STRONG | STRONG | YES | YES (not snapshotted) | Medium | Phase B2 |
| Hebrew | Hybrid generator ~843+ | STRONG | STRONG | YES | YES + typing | Medium-Large | Phase B3 |
| English | Pool-based (generator in page) | STRONG | STRONG | YES (partial) | PARTIAL | Large | Phase B4 |
| Moledet-Geography | Static bank ~3506 | STRONG | STRONG | YES | YES | Small | Phase B1 |

### Exact Files Likely to Change

Primary changes (adapters and gate):
- [`lib/classroom-activities/classroom-activities-preview.js`](lib/classroom-activities/classroom-activities-preview.js) — add subjects to Set
- [`lib/classroom-activities/generate-activity-questions-client.js`](lib/classroom-activities/generate-activity-questions-client.js) — add adapter per subject; fix science
- [`lib/classroom-activities/classroom-activities-shared.server.js`](lib/classroom-activities/classroom-activities-shared.server.js) — possibly add `answersMatchList` for Hebrew typing

Teacher UI:
- [`pages/teacher/class/[classId]/activities/new.js`](pages/teacher/class/[classId]/activities/new.js) — replace free-text topic with subject-aware dropdown

English extraction:
- `utils/english-question-generator.js` — NEW file (extracted from english-master)
- [`pages/learning/english-master.js`](pages/learning/english-master.js) — update import (no behavior change)

Student player (geometry only):
- [`pages/student/activity/[activityId].js`](pages/student/activity/[activityId].js) — geometry diagram render path

Tests (new):
- `tests/classroom-activities/generate-moledet-geography-activity-questions.test.mjs`
- `tests/classroom-activities/generate-geometry-activity-questions.test.mjs`
- `tests/classroom-activities/generate-hebrew-activity-questions.test.mjs`
- `tests/classroom-activities/generate-english-activity-questions.test.mjs`
- Extend [`tests/classroom-activities/classroom-activities-shared.test.mjs`](tests/classroom-activities/classroom-activities-shared.test.mjs) — scoring tests for all new subjects

### Blockers and Open Questions

1. **Science grade filter** — must be fixed before Phase B work begins (it is a Phase A regression)
2. **Hebrew typing mode** — decision needed: (a) exclude typing-mode items from classroom activities entirely (simplest), or (b) support typing mode with `acceptedAnswers` array scoring. If (b), `answersMatchList` helper must be added and tested
3. **Geometry student player** — decision needed: does the activity player render geometry diagrams from `params`? If yes, the `GeometryExplanationDiagram` component must be importable in the student player without leaking explanation content before submit. If no, geometry classroom questions will appear without visual aids (acceptable for Phase B2 if diagrams are in explanations only)
4. **Hebrew copy approval** — no Hebrew UI copy for new subjects may ship without product owner sign-off. The topic dropdown labels must be reviewed before enabling Hebrew or any new subject in the teacher UI
5. **English generator extraction** — must be done cleanly with no regression in `english-master.js`; needs a unit test to verify the extracted util returns identical output
6. **Moledet-Geography g1–g2 thin pools** — runtime coverage file flags some g1–g2 thin buckets as advisory. If teacher selects a thin g1 topic+difficulty combo, the adapter must throw clearly rather than cycling or returning duplicates

### Final Recommendation

Start with **Phase B1 (Moledet-Geography)** immediately after the simulation phase — it is the lowest-risk addition and validates the adapter pattern cleanly. Fix **Science grade/difficulty regression** in the same PR. Then proceed to **Phase B2 (Geometry + Science fixes)**, **Phase B3 (Hebrew)**, and **Phase B4 (English)** in sequence. Do not enable any subject in the UI until its adapter test suite passes end-to-end, including the student quiz leak test.
