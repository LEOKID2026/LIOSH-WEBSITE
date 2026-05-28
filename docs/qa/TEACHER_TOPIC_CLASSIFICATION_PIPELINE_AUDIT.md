# Teacher Topic Classification Pipeline — Root-Cause Audit

**Date:** 2026-05-28  
**Status:** Investigation only — no code changed, no SQL executed, no commit, no push.  
**Scope:** All six subjects, individual student report, class report, School Report Hub, teacher dashboard.

---

## 1. Executive Summary

After hiding `"נושא לא מסווג"` and filtering `general` topics in the previous targeted fix, some subjects — most critically **Hebrew** — now produce **zero useful recommendations**. The root cause is not in the UI filtering layer but in the **data pipeline**: the demo-school simulation data was generated with topic keys (`vowels_reading`, `plurals`, `verb_forms`, `sentence_structure`) that do not exist in the product's Hebrew topic label map. Every Hebrew topic unit inserted by the simulator resolves to `null` in `resolveTopicLabelHe` and is therefore correctly — but silently — dropped by V2 filtering.

Secondary issues affect English, science, and moledet/geography (partial label gaps for sim-generated keys), and there is a structural session-topic issue in the Hebrew learning master where sessions receive `topic = "mixed"` even when a specific topic is selected.

**The fastest fix** is a targeted label-map expansion: add the simulation topic keys as valid Hebrew labels (with owner-approved text). **A broader fix** is to align the simulator's `topic-catalog.mjs` with the canonical product topic key list.

---

## 2. Pipeline — Step-by-Step from Question to Teacher UI

```
Step 1 — Question metadata
  ↓  question/generator defines: subject, topic/operation, subtopicId
  ↓  Hebrew questions often lack .topic (only subtopicId or nothing)

Step 2 — Runtime session start (lazy)
  ↓  hebrewTrackingTopicKeyRef.current = question.topic || question.operation || "mixed"
  ↓  buildHebrewSessionStartPayload: topic = trackingRef || question.topic || question.operation || operation || "reading"
  ↓  POST /api/learning/session/start → learning_sessions.topic

Step 3 — Runtime answer save
  ↓  saveLearningAnswer: topic = question.topic || question.operation || operation || "reading"
  ↓  POST /api/learning/answer → answers.answer_payload.topic

Step 4 — Classroom activity (for school-portal students)
  ↓  classroom_activities.topic = weakTopic || pickTopic(subject,grade) || subject
  ↓  classroom_activity_student_status.* (no per-answer topic, inherits from activity row)

Step 5 — Aggregation (per-student report)
  ↓  aggregateParentReportPayload()
  ↓    Sessions: topicKey = session.topic || "general"  ← FALLBACK
  ↓    Answers:  topic    = payload.topic || session.topic || "general"  ← FALLBACK

Step 6 — Class-level aggregation
  ↓  aggregateClassReportFromStudentPayloads()
  ↓    mergeTopicRollup: key = sourceTopic.topic || "general"  ← FALLBACK
  ↓    classroom activity rollup: topicKey = activity.topic || "general"  ← FALLBACK

Step 7 — Teacher Guidance V2 (per student + per class)
  ↓  buildStudentTeacherGuidanceV2 / buildClassTeacherGuidanceV2
  ↓    For each topicKey in subjects[subject].topics:
  ↓      isTeacherRecommendableTopicKey(topicKey) → false for "general", "" → SKIP
  ↓      resolveTopicLabelHe(subject, topicKey) → null if key not in label map → SKIP

Step 8 — Label resolution
  ↓  resolveTopicLabelHe → topicBucketLabelHe → per-subject name function
  ↓    Returns label if mapped; null if label equals raw key (unmapped) or "נושא זה"

Step 9 — UI rendering
  ↓  Student report / class report / school hub / dashboard
  ↓  Only units with topicLabelHe != null are shown
```

---

## 3. Per-Subject Classification Readiness

| Subject | Topic metadata (generators) | Runtime persistence | Aggregation quality | Hebrew label coverage | Teacher rec. readiness |
|---|---|---|---|---|---|
| **math** | ✅ Rich (OPERATION_NAMES, 25+ keys) | ✅ Good — operation state saved | ⚠️ `general` fallback exists | ✅ Full for all production keys | ✅ Ready |
| **geometry** | ✅ Rich (TOPIC_NAMES, 17 keys) | ✅ Good | ⚠️ `general` fallback exists | ✅ Full for all production keys | ✅ Ready |
| **english** | ⚠️ Partial — `simple_sentences` sim key not mapped | ✅ Good | ⚠️ `general` fallback exists | ⚠️ `simple_sentences` missing | ⚠️ Partial — one weak-class key invisible |
| **hebrew** | ❌ All sim keys wrong | ⚠️ Session gets `"mixed"` | ⚠️ `general` fallback exists | ❌ All sim keys unmapped | ❌ Zero recommendations |
| **science** | ⚠️ `living_things`, `matter`, `forces` not mapped | ✅ Good | ⚠️ `general` fallback exists | ⚠️ 3 of 6 sim keys missing | ⚠️ Partial |
| **moledet_geography** | ⚠️ `maps_basic`, `regions`, `history` not mapped | ✅ Good | ⚠️ `general` fallback exists | ⚠️ 3 of 5 sim keys missing | ⚠️ Partial |

---

## 4. Exact Root Cause — Hebrew Recommendations Disappearing

### Primary root cause: Simulation topic keys diverge from product label map (Category 7 + Category 4)

`scripts/school-portal/sim/topic-catalog.mjs` defines Hebrew topic keys for the demo data:

```js
hebrew: {
  1: ["vowels_reading", "plurals"],
  2: ["vowels_reading", "plurals"],
  3: ["plurals", "verb_forms"],
  4: ["plurals", "verb_forms"],
  5: ["verb_forms", "sentence_structure"],
  6: ["verb_forms", "sentence_structure"],
},
```

`scripts/school-portal/demo-school-data.mjs` WEAK_TOPICS_BY_CLASS uses the same keys:
```js
"כיתה א׳ 2": { topic: "vowels_reading", subject: "hebrew" },
"כיתה ב׳ 1": { topic: "plurals",        subject: "hebrew" },
```

The product label map in `utils/math-report-generator.js` `HEBREW_TOPIC_NAMES` contains:
```
reading, comprehension, reading_comprehension, writing, grammar, vocabulary,
speaking, mixed, main_idea, sequence, inference, fact_vs_opinion
```

**None** of the four simulation keys (`vowels_reading`, `plurals`, `verb_forms`, `sentence_structure`) appear there.

**Resolution trace for `"vowels_reading"`:**
1. `isTeacherRecommendableTopicKey("vowels_reading")` → `true` (not "general")
2. `topicBucketLabelHe("hebrew", "vowels_reading")` → `getHebrewTopicName("vowels_reading")` → `HEBREW_TOPIC_NAMES["vowels_reading"]` = `undefined` → returns `"vowels_reading"` (the key itself)
3. Check: `label === baseKey` → `"vowels_reading" === "vowels_reading"` → **TRUE**
4. Try again with baseKey: same result
5. Final check: `label === baseKey` → `true` → **returns `null`**
6. V2: `topicLabelHe = null` → **unit skipped**

This applies identically to `plurals`, `verb_forms`, and `sentence_structure`. **All Hebrew V2 recommendation units are discarded**, leaving the Hebrew teacher with zero specific recommendations.

### Secondary root cause: Hebrew session topic saved as "mixed" (Category 2)

In `pages/learning/hebrew-master.js`:
```js
hebrewTrackingTopicKeyRef.current = questionOut.topic || questionOut.operation || "mixed";
```

Hebrew question objects in `utils/hebrew-question-generator.js` typically do not carry a `.topic` field (they have `subtopicId` such as `"g1.phoneme_awareness"` but not `.topic`). So `hebrewTrackingTopicKeyRef.current` is set to `"mixed"` for nearly all questions.

When the session is started lazily (first answer triggers it), `buildHebrewSessionStartPayload` runs:
```js
topic: String(
  hebrewTrackingTopicKeyRef.current || // → "mixed" (already set from first question)
  currentQuestion?.topic ||            // → undefined
  currentQuestion?.operation ||        // → undefined
  operation ||                         // → e.g. "reading" (UI-selected topic)
  "reading"
)
```

Since `hebrewTrackingTopicKeyRef.current = "mixed"` is truthy, it wins over the valid `operation` state. **Sessions are saved with `topic = "mixed"` even when the user selected "reading" or "grammar".**

Answers, however, use:
```js
topic: String(question?.topic || question?.operation || operation || "reading"),
```
which correctly falls through to `operation` (the UI-selected topic), so **answer-level topics are correct** for real game data.

---

## 5. Root Causes for Other Subjects' Weak Topic Quality

### English

`WEAK_TOPICS_BY_CLASS`: `"כיתה ב׳ 3": { topic: "simple_sentences", subject: "english" }`  
Simulation also uses `"simple_sentences"` for grades 1–2.

`ENGLISH_TOPIC_NAMES` contains `sentences: "בניית משפטים"` but **not** `simple_sentences`.  
→ `resolveTopicLabelHe("english", "simple_sentences")` = `null` → unit dropped.

Grades 3–6 use `grammar_basics` and `reading_comprehension` which **are** mapped → those classes have partial English recommendations.

### Science

Simulation keys for science: `living_things`, `animals`, `plants`, `matter`, `environment`, `forces`

`SCIENCE_TOPIC_NAMES` contains: `body`, `animals`, `plants`, `materials`, `earth_space`, `environment`, `experiments`, `animals_plants`, `basic_experiments`

Unmapped sim keys:
- `living_things` → not in map → dropped
- `matter` → not in map (closest: `materials`) → dropped
- `forces` → not in map → dropped

Mapped sim keys: `animals`, `plants`, `environment` → those produce valid recommendations.

### Moledet/Geography

Simulation keys: `community`, `maps_basic`, `maps`, `regions`, `history`

`MOLEDET_GEOGRAPHY_TOPIC_NAMES` contains: `homeland`, `community`, `citizenship`, `geography`, `basic_geography`, `values`, `maps`, `map_reading`, `directions`, `places`

Unmapped sim keys:
- `maps_basic` → not in map → dropped
- `regions` → not in map → dropped
- `history` → not in map → dropped

Mapped: `community`, `maps` → those produce valid recommendations.

### Math

`WEAK_TOPICS_BY_CLASS`: `"כיתה ה׳ 3": { topic: "multiplication_advanced", subject: "math" }`  
`OPERATION_NAMES` does not contain `multiplication_advanced` (only `multiplication`).  
→ dropped for that class.

Old nightly simulator (`run-school-nightly-simulation.mjs` line 167):
```js
const topic = (weakTopics[slot.classId] && weakTopics[slot.classId][0]) || slot.subject;
```
When no weak topic exists for a class, **`slot.subject` becomes the topic** (e.g., `topic = "hebrew"` for Hebrew classes). These sessions get `topic = "hebrew"` which is not in any topic label map → dropped.

---

## 6. Missing / Invalid Topic Keys by Subject

### Hebrew (all simulation-only — none exist in product label map)
| Key | Origin | Status |
|---|---|---|
| `vowels_reading` | topic-catalog.mjs + WEAK_TOPICS | ❌ No label |
| `plurals` | topic-catalog.mjs + WEAK_TOPICS | ❌ No label |
| `verb_forms` | topic-catalog.mjs | ❌ No label |
| `sentence_structure` | topic-catalog.mjs | ❌ No label |
| `mixed` | all masters fallback | ⚠️ Has label "ערבוב" but non-specific for recommendation |

### English
| Key | Origin | Status |
|---|---|---|
| `simple_sentences` | topic-catalog.mjs + WEAK_TOPICS | ❌ No label (map has `sentences`) |

### Science
| Key | Origin | Status |
|---|---|---|
| `living_things` | topic-catalog.mjs | ❌ No label |
| `matter` | topic-catalog.mjs | ❌ No label (map has `materials`) |
| `forces` | topic-catalog.mjs | ❌ No label |

### Moledet/Geography
| Key | Origin | Status |
|---|---|---|
| `maps_basic` | topic-catalog.mjs | ❌ No label (map has `basic_geography`) |
| `regions` | topic-catalog.mjs | ❌ No label |
| `history` | topic-catalog.mjs | ❌ No label |

### Math
| Key | Origin | Status |
|---|---|---|
| `multiplication_advanced` | WEAK_TOPICS_BY_CLASS | ❌ No label (map has `multiplication`) |

### Cross-subject (old nightly simulator)
| Key | Origin | Status |
|---|---|---|
| `"hebrew"` | run-school-nightly-simulation.mjs L167 fallback | ❌ Subject name used as topic |
| `"science"` | same | ❌ Subject name used as topic |
| `"math"` | same | ❌ Subject name used as topic |
| `"english"` | same | ❌ Subject name used as topic |
| `"moledet_geography"` | same | ❌ Subject name used as topic |
| `"geometry"` | same | ❌ Subject name used as topic |
| `"general"` | aggregation fallbacks | ✅ Correctly filtered by V2 |

---

## 7. Files and Functions Responsible

| Layer | File | Function / Line | Issue |
|---|---|---|---|
| Simulation metadata | `scripts/school-portal/sim/topic-catalog.mjs` | `TOPICS_BY_SUBJECT_GRADE.hebrew` | Hebrew sim keys not in product map |
| Simulation metadata | `scripts/school-portal/demo-school-data.mjs` | `WEAK_TOPICS_BY_CLASS` L91–101 | `vowels_reading`, `plurals`, `multiplication_advanced`, `simple_sentences` not in label maps |
| Old sim | `scripts/school-portal/run-school-nightly-simulation.mjs` | L167 | Fallback `|| slot.subject` makes subject name the topic |
| Runtime persistence | `pages/learning/hebrew-master.js` | `buildHebrewSessionStartPayload` L1480 | `hebrewTrackingTopicKeyRef || "mixed"` wins over valid `operation` state |
| Aggregation | `lib/parent-server/report-data-aggregate.server.js` | L369, L445 | Both session and answer fall to `"general"` when topic is null |
| Class aggregation | `lib/teacher-server/teacher-class-report.server.js` | `mergeTopicRollup` L36 | `|| "general"` fallback |
| Classroom activity | `lib/teacher-server/classroom-activity-class-report.server.js` | L266 | `activity.topic || "general"` |
| Dashboard activity | `lib/teacher-server/teacher-dashboard-activity.server.js` | L231 | `sess.topic ? ... : "general"` |
| Label mapping | `utils/math-report-generator.js` | `HEBREW_TOPIC_NAMES` | Missing: `vowels_reading`, `plurals`, `verb_forms`, `sentence_structure` |
| Label mapping | `utils/math-report-generator.js` | `ENGLISH_TOPIC_NAMES` | Missing: `simple_sentences` |
| Label mapping | `utils/math-report-generator.js` | `SCIENCE_TOPIC_NAMES` | Missing: `living_things`, `matter`, `forces` |
| Label mapping | `utils/math-report-generator.js` | `MOLEDET_GEOGRAPHY_TOPIC_NAMES` | Missing: `maps_basic`, `regions`, `history` |
| Label mapping | `utils/math-report-generator.js` | `OPERATION_NAMES` | Missing: `multiplication_advanced` |
| V2 filtering | `lib/teacher-server/teacher-guidance-v2.server.js` | `buildStudentTeacherGuidanceV2` L307–309 | Correctly drops unmapped — not the bug but the symptom |

---

## 8. Real Data Examples Proving the Issue

> Note: these examples are derived by code-path tracing rather than live SQL queries, which this audit is not permitted to run. The code paths are deterministic.

### Student Example A — Hebrew student, grade 1, כיתה א׳ 2

**Source:** `WEAK_TOPICS_BY_CLASS["כיתה א׳ 2"] = { topic: "vowels_reading", subject: "hebrew" }`

| Step | Value |
|---|---|
| Session `topic` in DB | `"vowels_reading"` |
| Aggregation topic key | `"vowels_reading"` |
| `isTeacherRecommendableTopicKey` | `true` (not "general") |
| `topicBucketLabelHe("hebrew", "vowels_reading")` | `"vowels_reading"` (not in HEBREW_TOPIC_NAMES, function returns raw key) |
| `resolveTopicLabelHe` check `label === baseKey` | `true` → returns `null` |
| V2 recommendation unit | **DROPPED** |
| Teacher UI shows | **no Hebrew recommendations** |

### Student Example B — Hebrew student, grade 2, כיתה ב׳ 1

**Source:** `WEAK_TOPICS_BY_CLASS["כיתה ב׳ 1"] = { topic: "plurals", subject: "hebrew" }`

| Step | Value |
|---|---|
| Session `topic` in DB | `"plurals"` |
| Aggregation topic key | `"plurals"` |
| `topicBucketLabelHe("hebrew", "plurals")` | `"plurals"` (not in map, returns raw key) |
| `resolveTopicLabelHe` | `null` |
| V2 recommendation unit | **DROPPED** |
| Teacher UI shows | **no Hebrew recommendations** |

### Class Example C — English class, כיתה ב׳ 3 (partial loss)

**Source:** `WEAK_TOPICS_BY_CLASS["כיתה ב׳ 3"] = { topic: "simple_sentences", subject: "english" }`  
Topic-catalog also adds `"vocabulary"` sessions for grade 2.

| Topic key | Label resolved | V2 unit |
|---|---|---|
| `simple_sentences` | `null` (not in ENGLISH_TOPIC_NAMES) | **DROPPED** |
| `vocabulary` | `"אוצר מילים"` ✅ | **SHOWN** |

Result: the class shows English vocabulary weakness but NOT the `simple_sentences` weakness, which is the class's designated weak area.

### Class Example D — Science class, כיתה ג׳ 3 (partial coverage)

**Source:** `WEAK_TOPICS_BY_CLASS["כיתה ג׳ 3"] = { topic: "animals", subject: "science" }`  
Topic-catalog adds `"animals"`, `"plants"`, `"matter"` for grade 3.

| Topic key | Label resolved | V2 unit |
|---|---|---|
| `animals` | `"בעלי חיים"` ✅ | **SHOWN** |
| `plants` | `"צמחים"` ✅ | **SHOWN** |
| `matter` | `null` (not in SCIENCE_TOPIC_NAMES) | **DROPPED** |

Result: science recommendations are partially shown, but the `matter` topic weakness is invisible.

---

## 9. Proposed Fixes by Layer

### Layer A — Question metadata (generators)

**Issue:** Hebrew question objects do not carry a `.topic` field. The topic is known only from the enclosing container key (e.g., `G1_EASY_QUESTIONS.reading`), not from the question object itself.

**Fix:** In `utils/hebrew-question-generator.js`, add `topic: "<bucket_key>"` to every question object at build time, or add a `topic` stamp when questions are picked from a bucket. This is a medium-effort change but makes the runtime pipeline unambiguous.

**Affected file:** `utils/hebrew-question-generator.js`

---

### Layer B — Runtime persistence

**Issue (Hebrew):** `hebrewTrackingTopicKeyRef.current` is set to `"mixed"` when a question has no `.topic` or `.operation` field. This wins over the valid `operation` state in `buildHebrewSessionStartPayload`.

**Fix:** Modify `buildHebrewSessionStartPayload` to prefer `operation` (the UI-selected topic) over `hebrewTrackingTopicKeyRef.current` when the ref is `"mixed"`:
```js
topic: String(
  (hebrewTrackingTopicKeyRef.current !== "mixed" && hebrewTrackingTopicKeyRef.current)
    || operation
    || "reading"
),
```

**Affected file:** `pages/learning/hebrew-master.js`

---

### Layer C — Aggregation

**Issue:** All aggregation entry points fall back to `"general"` when `topic` is null. This is expected behavior, but it silently absorbs data from sessions where topic was never set.

**Fix:** No change needed in the aggregation itself — `"general"` is correctly filtered by V2. The fix must be upstream (runtime persistence and question metadata). Logging could be added to measure `general` prevalence per subject.

---

### Layer D — Label mapping (fastest safe fix)

**Issue:** Simulation topic keys are valid curriculum concepts but missing Hebrew labels.

**Fix:** Add the following entries to their respective maps in `utils/math-report-generator.js`:

**`HEBREW_TOPIC_NAMES`** — add:
```js
vowels_reading:      "קריאה בניקוד",
plurals:             "יחיד ורבים",
verb_forms:          "צורות הפועל",
sentence_structure:  "מבנה המשפט",
```

**`ENGLISH_TOPIC_NAMES`** — add:
```js
simple_sentences: "משפטים פשוטים",
```

**`SCIENCE_TOPIC_NAMES`** — add:
```js
living_things: "יצורים חיים",
matter:        "חומרים",
forces:        "כוחות",
```

**`MOLEDET_GEOGRAPHY_TOPIC_NAMES`** — add:
```js
maps_basic: "מפות בסיסיות",
regions:    "אזורים ואיזורים",
history:    "היסטוריה",
```

**`OPERATION_NAMES` (math)** — add:
```js
multiplication_advanced: "כפל מתקדם",
```

> **Owner approval required** before adding these labels. Text above is proposed only and must be confirmed by product/curriculum owner.

**Affected file:** `utils/math-report-generator.js`

---

### Layer E — Teacher Guidance V2 filtering

**Issue:** V2 is correctly filtering — this is not broken. It correctly uses `resolveTopicLabelHe` as the gate.

**Potential improvement:** Consider also filtering the `"mixed"` topic from recommendation units. `"ערבוב"` is too coarse for a meaningful intervention recommendation. This can be done by adding `"mixed"` to the non-recommendable key set in `isTeacherRecommendableTopicKey`.

**Affected file:** `lib/teacher-portal/teacher-ui.he.js`

---

### Layer F — UI / view-model

**No new issues identified at this layer.** The previous targeted fix already ensured all UI components filter by `topicLabelHe != null`. The UI is behaving correctly — it is the data that is deficient.

---

### Layer G — Simulation / demo data (broader planning)

**Issue:** `scripts/school-portal/sim/topic-catalog.mjs` uses Hebrew topic keys invented for simulation that do not exist in the product label map.

**Fix option 1 (label expansion, safe):** Keep sim keys as-is, add Hebrew labels for them (Layer D above).

**Fix option 2 (sim alignment, broader):** Change `topic-catalog.mjs` to use only canonical product topic keys that are already in the label maps:
```js
hebrew: {
  1: ["reading", "grammar"],
  2: ["reading", "grammar"],
  3: ["grammar", "comprehension"],
  4: ["grammar", "comprehension"],
  5: ["comprehension", "writing"],
  6: ["comprehension", "writing"],
},
```
This requires resetting or retroactively correcting simulation data in the DB.

**Also fix:** `run-school-nightly-simulation.mjs` L167 — replace `|| slot.subject` with `|| "general"` or a proper fallback from topic-catalog, so subject names are never saved as topic keys.

**Affected files:**
- `scripts/school-portal/sim/topic-catalog.mjs`
- `scripts/school-portal/demo-school-data.mjs` (WEAK_TOPICS_BY_CLASS)
- `scripts/school-portal/run-school-nightly-simulation.mjs`

---

## 10. Which Fixes Are Safe / Targeted Now

These can be done in one focused change with low risk:

| Fix | Layer | Risk | Files |
|---|---|---|---|
| Add Hebrew labels for `vowels_reading`, `plurals`, `verb_forms`, `sentence_structure` | Label mapping | Low | `utils/math-report-generator.js` |
| Add English label for `simple_sentences` | Label mapping | Low | `utils/math-report-generator.js` |
| Add Science labels for `living_things`, `matter`, `forces` | Label mapping | Low | `utils/math-report-generator.js` |
| Add Moledet labels for `maps_basic`, `regions`, `history` | Label mapping | Low | `utils/math-report-generator.js` |
| Add Math label for `multiplication_advanced` | Label mapping | Low | `utils/math-report-generator.js` |
| Exclude `"mixed"` from recommendable topics | V2 filtering | Low | `lib/teacher-portal/teacher-ui.he.js` |

**Prerequisite:** All Hebrew labels above must be confirmed by the product/curriculum owner before implementation.

---

## 11. Which Fixes Require Broader Planning

| Fix | Why it needs planning |
|---|---|
| Fix `hebrewTrackingTopicKeyRef` to prefer `operation` over "mixed" | Requires verifying no regression in session-level data, and whether "mixed" mode is deliberately differentiated |
| Add `.topic` to all Hebrew question objects | ~5,000+ question records across 6 grades and 3 levels; must preserve pedagogical categorization |
| Align `topic-catalog.mjs` with canonical product keys | Requires resetting or re-labeling historical simulation data in the DB, or running a DB migration |
| Fix `run-school-nightly-simulation.mjs` subject-name-as-topic fallback | Requires re-generating historical simulation sessions |
| Retroactively fix `general` sessions in DB | Would require a SQL migration to update session topic based on grade/class context — speculative |

---

## 12. Exact Files That Would Need to Change Later

| File | What changes |
|---|---|
| `utils/math-report-generator.js` | Expand all five topic name maps |
| `utils/hebrew-question-generator.js` | Stamp `.topic` on question objects at bucket level |
| `pages/learning/hebrew-master.js` | Fix `buildHebrewSessionStartPayload` topic priority |
| `lib/teacher-portal/teacher-ui.he.js` | Add `"mixed"` to non-recommendable keys |
| `scripts/school-portal/sim/topic-catalog.mjs` | Align Hebrew (and other) topic keys to product canonical |
| `scripts/school-portal/demo-school-data.mjs` | Fix `WEAK_TOPICS_BY_CLASS` Hebrew entries |
| `scripts/school-portal/run-school-nightly-simulation.mjs` | Fix subject-name-as-topic fallback |

---

## 13. QA Plan for Verifying the Fix

### After label map expansion (Layer D):

1. **Unit test** — extend `scripts/tests/teacher-guidance-v2-unit.mjs`:
   - Assert `resolveTopicLabelHe("hebrew", "vowels_reading")` returns a non-null Hebrew string
   - Assert `resolveTopicLabelHe("hebrew", "plurals")` returns a non-null Hebrew string
   - Assert `resolveTopicLabelHe("hebrew", "verb_forms")` returns a non-null Hebrew string
   - Assert `resolveTopicLabelHe("hebrew", "sentence_structure")` returns a non-null Hebrew string
   - Assert `resolveTopicLabelHe("english", "simple_sentences")` → non-null
   - Assert `resolveTopicLabelHe("science", "living_things")` → non-null
   - Assert `resolveTopicLabelHe("science", "matter")` → non-null
   - Assert `resolveTopicLabelHe("science", "forces")` → non-null
   - Assert `resolveTopicLabelHe("moledet_geography", "maps_basic")` → non-null
   - Assert `resolveTopicLabelHe("moledet_geography", "regions")` → non-null
   - Assert `resolveTopicLabelHe("moledet_geography", "history")` → non-null

2. **Integration check** — run the existing post-implementation QA script (`scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs`)

3. **Browser check** — navigate to teacher student report for a student in כיתה א׳ 2 and confirm:
   - Hebrew section now shows at least one recommendation unit
   - The topic label is the approved Hebrew text (e.g., "קריאה בניקוד")
   - No raw English key is visible

4. **Negative check** — confirm `general` and subject-names-as-topics still produce no units

5. **Class report check** — navigate to class report for a Hebrew teacher's class and confirm `classRecommendationUnits` / `smallGroupClusters` include Hebrew units

6. **Dashboard check** — confirm teacher attention signals now surface Hebrew topic data for relevant students

---

## 14. Confirmation — No Files Were Changed

This document was produced as a read-only investigation only.

- No source code files were modified.
- No SQL was executed.
- No simulations were run.
- No commits were staged.
- No pushes were made.

---

## 15. `git status --short`

```
 M .cursor/plans/full_school_active_daily_simulation_e45efdf0.plan.md
 M package.json
 M scripts/school-portal/reset-demo-school-activities.mjs
?? docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_DELIVERY_REPORT.md
?? docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_PLAN.md
?? docs/qa/OPERATOR_DISABLE_AAA_NIGHTLY.md
?? scripts/school-portal/run-school-sim-nightly.mjs
?? scripts/school-portal/sim/
?? scripts/school-portal/timeline-school-sim.md
```

*(The `docs/qa/TEACHER_TOPIC_CLASSIFICATION_PIPELINE_AUDIT.md` file created by this report will also appear as `??` once saved.)*

---

*Audited by: AI agent, read-only mode, 2026-05-28*
