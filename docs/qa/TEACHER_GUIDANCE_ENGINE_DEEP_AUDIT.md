# Teacher Guidance Engine — Deep Root-Cause Audit

**Date:** 2026-05-28  
**Auditor:** AI Code Audit (investigation only — no code changed)  
**Status:** Investigation complete. No implementation performed.

---

## Executive Summary

The teacher guidance / recommendation engine has **six compounding failures** that together cause the product to silently show "no urgent topics — continue as normal" even when a student has 31% accuracy or a class has 61% accuracy.

**The core problem is not a single threshold — it is a cascading silent-drop pipeline:**

1. All answers in sessions without a topic label are bucketed to `"general"`, which is an explicitly excluded topic key.
2. Any topic key not in a small hardcoded dictionary falls back to the raw English slug, which is then rejected by the label resolver.
3. The V2 builder produces recommendation units **only** through topic-level iteration. When all topics fail the label gate, zero units are produced — with no subject-level fallback in V2.
4. When V2 produces zero recommendation units, the UI falls through to a V1 path that shows only the risk-level text (`"כדאי לעקוב"`) with no concrete actions.
5. The "focus practice" section renders `"אין נושאים דחופים כרגע — המשך כרגיל."` regardless of subject-level accuracy.
6. The `riskLevel` severity model is too weak: 31% accuracy can still yield `"moderate"` (not `"high"`) if only one risk signal fires.

**No code was changed. No SQL was executed. No commits were made.**

---

## 1. Pipeline Diagram: Data → Recommendation → UI

```
[Supabase DB]
  learning_sessions  (has: subject, topic or NULL)
  answers            (linked to session_id, topic from session)
  classroom_activity_answers

        ↓
[aggregateParentReportPayload]  (lib/parent-server/report-data-aggregate.server.js)
  - Iterates sessions
  - topicKey = session.topic || "general"   ← NULL TOPIC → "general"
  - Buckets answers into subjects[subject].topics[topicKey]
  - Output: { summary, subjects, recentMistakes, dailyActivity }

        ↓
[buildTeacherStudentReportPayload]  (lib/teacher-server/teacher-report.server.js)
  - Calls aggregateParentReportPayload
  - Calls buildStudentTeacherGuidanceV2(payload, opts)

        ↓
[buildStudentTeacherGuidanceV2]  (lib/teacher-server/teacher-guidance-v2.server.js)
  1. Calls buildStudentTeacherGuidance (V1) for riskLevel, insufficientData
  2. If v1.insufficientData → returns base with empty arrays
  3. Iterates subjects[sid].topics[topicKey]:
     a. GATE 1: isTeacherRecommendableTopicKey(topicKey)
        → blocks "general", "mixed"
     b. GATE 2: resolveTopicLabelHe(sid, topicKey)
        → returns null if topic key not in label dictionary
        → returns null if label === raw key (unmapped)
        → returns null if label === "נושא זה"
     c. GATE 3: answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL (3)
     d. GATE 4: accuracy < LOW_ACCURACY_THRESHOLD (60%)
  4. If topic passes all 4 gates → creates a recommendationUnit
  5. Output: { recommendationUnits[], strengthUnits[], supportSuggestionsV2[] }
  
  !! NO SUBJECT-LEVEL FALLBACK IN V2 !!

        ↓
[buildStudentTeacherGuidance V1]  (lib/teacher-server/teacher-recommendations.server.js)
  - Computes riskSignals
  - Has a subject-level fallback in nextPracticeFocus
  - But V2 does NOT use V1's nextPracticeFocus in its output arrays

        ↓
[Teacher Student Report Page]  (pages/teacher/student/[studentId].js)
  - isGuidanceV2 = guidance.version === "v2"
  - recommendationUnits = isGuidanceV2 ? guidance.recommendationUnits : []
  - focusItems = isGuidanceV2
      ? recommendationUnits.filter(u => u.topicLabelHe)  ← already filtered
      : v1.nextPracticeFocus
  
  RENDER:
  if guidance.insufficientData → "אין מספיק נתונים לניתוח"
  else if isGuidanceV2 && recommendationUnits.length → show V2 units
  else → show ONLY riskLevelHe(tg.riskLevel)   ← "כדאי לעקוב" for 31%
  
  FOCUS SECTION:
  if focusItems.length → show list
  else → "אין נושאים דחופים כרגע — המשך כרגיל."  ← ALWAYS SHOWN WHEN V2 UNITS = 0
```

---

## 2. Current Thresholds Table

| Threshold | Value | Location | Effect |
|-----------|-------|----------|--------|
| `LOW_ACCURACY_THRESHOLD` | **60%** | `teacher-guidance-v2.server.js:25` and `teacher-recommendations.server.js:15` | Below this → topic is "weak". At or above → topic is ignored |
| `STRENGTH_THRESHOLD` | **80%** | both files | Above this → topic is "strong" |
| `MIN_ANSWERS_FOR_TOPIC_SIGNAL` | **3** | both files | Must have ≥ 3 answers per topic to generate a unit |
| `MIN_ANSWERS_FOR_STUDENT_SIGNAL` | **5** | both files | Must have ≥ 5 total answers OR ≥ 2 sessions to avoid `insufficientData` |
| `MIN_CLASS_ANSWERS_FOR_GUIDANCE` | **10** | `teacher-recommendations.server.js:19` | Class must have ≥ 10 answers + > 0 active students |
| `INACTIVITY_DAYS_THRESHOLD` | **7** | `teacher-recommendations.server.js:21` | ≥ 7 inactive days → risk signal |
| `STRUGGLING_ACCURACY_CUTOFF` | **55%** | `teacher-recommendations.server.js:22` | Used for group placement AND `classHealthSignal = "needs_support"` |
| `ADVANCED_ACCURACY_CUTOFF` | **80%** | `teacher-recommendations.server.js:23` | Used for group placement AND `classHealthSignal = "strong"` |
| `MIN_STUDENT_ANSWERS_FOR_GROUP` | **3** | `teacher-recommendations.server.js:24` | Minimum answers to assign a student to a learning group |
| `riskLevel = "high"` | 3+ risk signals | `teacher-recommendations.server.js:240-242` | Need 3+ signals for "high" |
| `riskLevel = "moderate"` | 1–2 risk signals | same | "moderate" → Hebrew: "כדאי לעקוב" |
| `riskLevel = "low"` | 0 signals | same | "low" → Hebrew: "בקצב תקין" |
| `attentionScore` threshold | `accuracy < 50` | `teacher-class-report.server.js:99` | For class attention list: only flags students with < 50% accuracy |
| `affectedFraction >= 0.4` → `class_reteach` | 40% | `teacher-guidance-v2.server.js:177` | class-level intervention type |
| `classWeakness threshold` | `affected/size >= 0.3` | `teacher-guidance-v2.server.js:234` | "isAlsoClassWideWeakness" flag |

**Critical gap:** There is no threshold tier between 55% and 80%. The range 55%–79% is treated as `"progressing"` ("הכיתה מתקדמת כסדרה") at the class health signal level. 60%–79% students get no urgency label.

---

## 3. Root Causes — Detailed Analysis

### Root Cause A: The Double Gate Silently Drops Weak Topics

**File:** `lib/teacher-guidance-v2.server.js` lines 305–312  
**File:** `lib/teacher-portal/teacher-ui.he.js` lines 108–134

Every topic in the recommendation loop must pass **both** gates:

**Gate 1 — `isTeacherRecommendableTopicKey`:**
```javascript
const NON_RECOMMENDABLE_TOPIC_KEYS = new Set(["general", "mixed"]);
```
Blocks `"general"` and `"mixed"` unconditionally.

**Gate 2 — `resolveTopicLabelHe` returns null when:**
- `topicBucketLabelHe(sid, topicKey)` returns `"נושא זה"` (the generic Hebrew fallback)
- The label equals the raw topic key itself (i.e., the key was not found in the dictionary)
- The label is null or empty

And `topicBucketLabelHe` in turn calls subject-specific label lookups:
```javascript
if (subjectId === "hebrew") return getHebrewTopicName(k);
if (subjectId === "moledet-geography") return getMoledetGeographyTopicName(k);
```

These functions return the **raw key as fallback** when a key is not in their dictionary:
```javascript
export function getHebrewTopicName(topic) {
  return HEBREW_TOPIC_NAMES[topic] || topic;  // ← returns raw key if not found
}
```

So for any topic key not in the dictionary, `getHebrewTopicName("some_unknown_key")` returns `"some_unknown_key"`. Then in `resolveTopicLabelHe`:
```javascript
if (!label || label === "נושא זה" || label === baseKey || label === String(topicKey)) {
  label = topicBucketLabelHe(sid, baseKey);  // retry with base key
}
if (!label || label === "נושא זה" || label === baseKey) return null;  // ← DROPPED
```
Since `label === baseKey` (both equal the raw key), the recommendation unit is **silently dropped with no log, no fallback, no warning**.

---

### Root Cause B: Sessions Without a Topic → "general" → Permanently Excluded

**File:** `lib/parent-server/report-data-aggregate.server.js` line 369

```javascript
const topicKey = safeString(session.topic, 120) || "general";
```

If a learning session's `topic` column is `null` or empty, it is bucketed under `"general"`. This is then permanently excluded from all recommendation logic. All the accuracy data from those sessions — including wrong answers at 31%/33% — contributes to the summary total accuracy but is **invisible to the recommendation engine**.

This means: if a Hebrew session has no topic stored (because the question metadata or content delivery didn't set a topic), the student's 31% Hebrew accuracy is reflected in `summary.accuracy` and in `subjects.hebrew.accuracy`, but there is no `topics["readable_topic_key"]` to iterate over in the V2 engine.

---

### Root Cause C: V2 Has No Subject-Level Fallback

**File:** `lib/teacher-server/teacher-guidance-v2.server.js` lines 301–412

The entire V2 recommendation unit builder iterates only `subjects[sid].topics`:
```javascript
for (const sid of subjectsToIterate(permittedSubjects)) {
  for (const [topicKey, topicData] of Object.entries(subj.topics || {})) {
    if (!isTeacherRecommendableTopicKey(topicKey)) continue;
    const topicLabelHe = resolveTopicLabelHe(sid, topicKey);
    if (!topicLabelHe) continue;
    // ...create unit...
  }
}
```

There is **no path** that says: "if subject-level accuracy is low but no topic passes the label gate, create a subject-level fallback recommendation."

The V1 engine DOES have this fallback (line 184–202):
```javascript
// Fallback: if no weak topics but subject-level accuracy is low
if (nextPracticeFocus.length === 0 && accuracy !== null && accuracy < LOW_ACCURACY_THRESHOLD) {
  for (const subject of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[subject];
    if (subjAnswers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && subjAcc < LOW_ACCURACY_THRESHOLD) {
      nextPracticeFocus.push({ subject, topic: null, ... signal: "low_accuracy_subject" });
    }
  }
}
```

But in V2, this V1 fallback data is collected then **discarded**. The V2 result only populates `recommendationUnits[]`, not `nextPracticeFocus`. And the UI renders:
```javascript
const focusItems = isGuidanceV2
  ? recommendationUnits.filter((u) => u.topicLabelHe).slice(0, 5).map(...)
  : guidance.nextPracticeFocus...  // ← V1 path, never reached when version === "v2"
```

---

### Root Cause D: UI Falls Through to a Calm "No Urgent Topics" Message

**File:** `pages/teacher/student/[studentId].js` lines 269–316

**Recommendation section:**
```javascript
} : (
  <>
    {riskLevelHe(tg.riskLevel) ? (
      <p className="text-amber-200 mb-2">{riskLevelHe(tg.riskLevel)}</p>
    ) : null}
    {/* only inactive-days warning */}
  </>
)}
```
When V2 has 0 recommendation units, the entire "המלצות לי כמורה" section shows at most `"כדאי לעקוב"` (for 31% accuracy), with zero actionable content.

**Focus section:**
```javascript
{focusItems.length ? (
  <ul>...</ul>
) : (
  <p className="text-white/60 text-sm">אין נושאים דחופים כרגע — המשך כרגיל.</p>
)}
```
This message is shown when `focusItems.length === 0`. Because `focusItems` is derived from `recommendationUnits` in the V2 path, it will always be empty when the topic label gates fail — regardless of subject-level accuracy.

**Result:** A student with 31% Hebrew accuracy sees:
- Summary section: "דיוק: 31%" ← correct
- Recommendations section: "כדאי לעקוב" ← too weak, no actions
- Focus section: "אין נושאים דחופים כרגע — המשך כרגיל." ← actively misleading

---

### Root Cause E: The `riskLevel` Model Is Too Weak for Low Accuracy

**File:** `lib/teacher-server/teacher-recommendations.server.js` lines 237–243

```javascript
riskLevel:
  riskSignals.length >= 3 ? "high" :
  riskSignals.length >= 1 ? "moderate" :
  "low",
```

Risk signals are:
1. `"inactive_recent_days"` — inactivity ≥ 7 days
2. `"no_sessions_in_range"` — 0 sessions
3. `"low_overall_accuracy"` — accuracy < 60% with ≥ 5 answers
4. `"many_recent_mistakes"` — ≥ 5 recent mistakes

For an active student with 31% accuracy but < 5 recent mistakes and recent activity, **only one signal fires**: `"low_overall_accuracy"`. This yields `riskLevel = "moderate"` → Hebrew: `"כדאי לעקוב"`.

This is the message the product owner sees. A 31% accuracy student is in critical range and gets "כדאי לעקוב" (equivalent to "keep an eye on").

---

### Root Cause F: Class Health Signal Does Not Cover 56%–79%

**File:** `lib/teacher-server/teacher-recommendations.server.js` lines 357–362

```javascript
const classHealthSignal =
  cohortAccuracy === null ? "no_data" :
  cohortAccuracy < STRUGGLING_ACCURACY_CUTOFF ? "needs_support" :  // < 55%
  cohortAccuracy >= ADVANCED_ACCURACY_CUTOFF ? "strong" :           // >= 80%
  "progressing";                                                      // 55%–79%
```

A class with 61% accuracy gets `"progressing"` → `"הכיתה מתקדמת כסדרה"`.

In `school-report-view-model.js` `classInsightText`, the "progressing" signal produces:
```javascript
return `${health}. יש נתוני תרגול אחרונים — מומלץ להמשיך מעקב שוטף.`;
```
→ "הכיתה מתקדמת כסדרה. יש נתוני תרגול אחרונים — מומלץ להמשיך מעקב שוטף."

This is false reassurance for a class that needs reinforcement at 61%.

---

### Root Cause G: `attentionScore` Threshold for Students Is 50%, Not 60%

**File:** `lib/teacher-server/teacher-class-report.server.js` line 99

```javascript
} else if (accuracy != null && accuracy < 50 && answers >= 5) {
  attentionScore += 2;
  reasons.push("low_accuracy");
}
```

A student with 55%–59% accuracy is **not flagged** in the attention list. Only students below 50% receive an attention score bump for accuracy. This is inconsistent with the 60% threshold used everywhere else.

---

### Root Cause H: Class weaknessTopics Are Subject to the Same Label Gate

**File:** `lib/teacher-server/teacher-guidance-v2.server.js` lines 485–492

```javascript
for (const wt of weaknessTopics) {
  if (!isTeacherRecommendableTopicKey(topic)) continue;
  const topicLabelHe = resolveTopicLabelHe(subject, topic);
  if (!topicLabelHe) continue;
  // ...
}
```

The `weaknessTopics` array is built from raw topic keys in `aggregateClassReportFromStudentPayloads`. If the top weak topics are all `"general"` or unlabeled, `classRecommendationUnits` will be empty even if 40% of the class has wrong answers.

The class-level accuracy summary can show 61% while `classRecommendationUnits.length === 0`, and `classInsightText` then returns the calm "progressing" message.

---

### Root Cause I: Label Dictionary Coverage Gaps

The Hebrew label dictionary in `utils/math-report-generator.js` (lines 131–148):
```javascript
const HEBREW_TOPIC_NAMES = {
  reading, comprehension, reading_comprehension, writing, grammar,
  vocabulary, speaking, mixed, main_idea, sequence, inference,
  fact_vs_opinion, vowels_reading, plurals, verb_forms, sentence_structure
};
```
**17 keys total.** Any Hebrew topic key not in this list returns the raw key and gets dropped by `resolveTopicLabelHe`.

The Moledet/Geography dictionary (lines 154–169):
```javascript
const MOLEDET_GEOGRAPHY_TOPIC_NAMES = {
  homeland, community, citizenship, geography, basic_geography,
  values, maps, map_reading, directions, places, maps_basic, regions, history, mixed
};
```
**14 keys total** (minus "mixed" which is excluded = 13 usable keys).

**If the platform generates topic keys outside these dictionaries, those answers are permanently invisible to the recommendation engine.** There is no audit log, no warning, no fallback.

---

## 4. Case Studies

### Case Study 1: Student with 31% Hebrew Accuracy

**Scenario:** A student has 50+ Hebrew answers, 31% accuracy. Hebrew topic stored as `"comprehension"` in some sessions, `null` (→ `"general"`) in others.

**Trace:**

| Step | Value |
|------|-------|
| `subjects.hebrew.answers` | 50 |
| `subjects.hebrew.accuracy` | 31% |
| `subjects.hebrew.topics["general"].wrong` | 15 (from null-topic sessions) |
| `subjects.hebrew.topics["comprehension"].answers` | 12 |
| `subjects.hebrew.topics["comprehension"].accuracy` | 31% |
| Gate 1: `isTeacherRecommendableTopicKey("general")` | **false → dropped** |
| Gate 1: `isTeacherRecommendableTopicKey("comprehension")` | true → passes |
| Gate 2: `resolveTopicLabelHe("hebrew", "comprehension")` | `"הבנת הנקרא"` ← passes |
| Gate 3: answers ≥ 3 | true |
| Gate 4: accuracy < 60% | true |
| **Unit created?** | **YES for "comprehension" only** |
| What about the "general" answers? | **Silent drop — no fallback** |
| `recommendationUnits.length` | 1 (for comprehension only) |
| `riskLevel` | `"moderate"` → "כדאי לעקוב" |
| **What teacher sees** | 1 unit for comprehension + "כדאי לעקוב" |
| **Missing** | No aggregated "Hebrew is critically weak" headline. The majority of Hebrew wrong answers (from `null`-topic sessions) are invisible. |

**If all Hebrew sessions had `null` topic (stored as "general"):**
- `recommendationUnits = []`
- Teacher sees: `"כדאי לעקוב"` + `"אין נושאים דחופים כרגע — המשך כרגיל."`

---

### Case Study 2: Student with 33% Moledet/Geography Accuracy

**Scenario:** Student has 40 answers in Moledet, 33% accuracy. Sessions use topics `"geography"` and `null` (→ `"general"`).

| Step | Value |
|------|-------|
| `subjects.moledet_geography.accuracy` | 33% |
| Gate 1: `isTeacherRecommendableTopicKey("geography")` | true |
| Gate 2: `resolveTopicLabelHe("moledet_geography", "geography")` | calls `subjectIdForTopicLabels("moledet_geography")` → `"moledet-geography"` |
| `topicBucketLabelHe("moledet-geography", "geography")` | `getMoledetGeographyTopicName("geography")` → `"גאוגרפיה"` |
| Check: label ("גאוגרפיה") ≠ "נושא זה", ≠ baseKey ("geography"), ≠ null | **passes** |
| Gate 3: answers ≥ 3 | depends on count |
| Gate 4: accuracy < 60% | true |
| **"general" topic** | **dropped** |
| **Unit created for "geography"?** | **YES if ≥ 3 answers** |

In this case a recommendation unit SHOULD be created. But the product shows no recommendation. This suggests:
- Either answers per mapped topic are < 3 (e.g., 2 answers per mapped topic, rest in "general")
- Or a different topic key is being used that is not "geography"
- Needs live data inspection to confirm

---

### Case Study 3: Class with 61%–64% Average, No Topics

**Scenario:** A class of 20 students, avg 62% accuracy. Top weak topics are `"general"` (from unlabeled sessions) and `"mixed"` (explicitly excluded).

| Step | Value |
|------|-------|
| `cohortSummary.accuracy` | 62% |
| `weaknessTopics[0].topic` | `"general"` |
| Gate 1: `isTeacherRecommendableTopicKey("general")` | **false → dropped** |
| `classRecommendationUnits.length` | 0 |
| `classHealthSignal` | `"progressing"` (62% is between 55% and 80%) |
| `classInsightText` | `"הכיתה מתקדמת כסדרה. יש נתוני תרגול אחרונים — מומלץ להמשיך מעקב שוטף."` |
| School Report Hub "focus" section | `"לא זוהו נושאים חלשים משמעותיים — המשיכו מעקב."` |

A class at 62% average with no topic labels gets a reassuring "continue as normal" message.

---

### Case Study 4: Class with "לא זוהו נושאים בעייתיים בתקופה זו"

The exact string `"לא זוהו נושאים חלשים משמעותיים — המשיכו מעקב."` is the `empty` string for the "focus" section in `school-report-view-model.js` line 461:
```javascript
focus: {
  title: "נושאים לחיזוק",
  empty: "לא זוהו נושאים חלשים משמעותיים — המשיכו מעקב.",
  items: focusAreas,
},
```
This fires whenever `focusAreas.length === 0`, which happens when:
- `weaknessSource` (= `classRecommendationUnits` for V2) is empty after label filtering
- OR the class has no topic data at all

This is shown regardless of subject-level accuracy.

---

## 5. Drop-Off Table: Where Data Dies

| Stage | Data Available? | Notes |
|-------|----------------|-------|
| Session stored in DB | ✅ Yes | subject + topic (may be null) |
| Topic bucketed in aggregation | ⚠️ Partial | null → "general"; real topic key stored |
| Subject-level accuracy | ✅ Yes | Includes ALL data (general + labeled) |
| Topic-level data in subjects map | ⚠️ Partial | "general" and "mixed" have data but are filtered |
| V2 Gate 1: `isTeacherRecommendableTopicKey` | ❌ Drops "general", "mixed" | No fallback |
| V2 Gate 2: `resolveTopicLabelHe` | ❌ Drops unlabeled keys | No fallback, no log |
| V2 Gate 3: min answers ≥ 3 per topic | ❌ Drops sparse topics | Reasonable guard |
| V2 Gate 4: accuracy < 60% | ✅ Correct gate | Should be the ONLY gate for V2 |
| V2 recommendation unit created | ✅ When all 4 pass | Zero when gates 1–2 fail |
| V2 subject-level fallback | ❌ Does not exist | V1 has it, V2 discards V1's result |
| UI: shows recommendation units | ✅ When length > 0 | |
| UI: focusItems when units = 0 | ❌ Shows "no urgent topics" | Does not consult V1 fallback |
| UI: riskLevel displayed | ✅ Always | But max "moderate" for 31% if only 1 signal |

---

## 6. Per-Subject Readiness Table

| Subject | Label Lookup Function | Fallback Behavior | Usable Keys |
|---------|----------------------|-------------------|-------------|
| `math` | `getMathReportBucketDisplayName` | Returns raw key if not found → **dropped** | Many (math bucket keys are well-defined) |
| `geometry` | `getTopicName` | Returns raw key if not found → **dropped** | Medium |
| `english` | `getEnglishTopicName` | Returns raw key if not found → **dropped** | ~10 keys |
| `science` | `getScienceTopicName` | Returns raw key if not found → **dropped** | ~10 keys |
| `hebrew` | `getHebrewTopicName` | Returns raw key if not found → **dropped** | **17 keys** |
| `moledet_geography` | `getMoledetGeographyTopicName` | Returns raw key if not found → **dropped** | **13 usable keys** (14 minus "mixed") |

**Hebrew and Moledet have the smallest dictionaries relative to likely topic diversity.** Any topic key generated by the content engine that is not in these 17 or 13 entries is invisible to teachers.

---

## 7. All UI Misleading States

| Hebrew String | File | Line | Trigger Condition | Is Trigger Valid? |
|---------------|------|------|-------------------|-------------------|
| `"אין נושאים דחופים כרגע — המשך כרגיל."` | `pages/teacher/student/[studentId].js` | 314 | `focusItems.length === 0` | **NO** — fires regardless of accuracy |
| `"לא זוהו אותות אזהרה בתקופה זו."` | same | 327 | `riskSignals.length === 0` | Partially valid, but "low_overall_accuracy" signal requires ≥ 5 answers |
| `"אין הצעות מיוחדות לתקופה זו."` | same | 353 | `suggestions.length === 0` | **NO** — in V2 path, suggestions are empty when no units exist |
| `"אין מספיק נתונים לניתוח"` | same | 221 | `guidance.insufficientData` | Valid only when totalAnswers < 5 AND sessions < 2 |
| `"לא זוהו נושאים חלשים משמעותיים — המשיכו מעקב."` | `lib/school-portal/school-report-view-model.js` | 461, 881 | `focusAreas.length === 0` | **NO** — fires regardless of class accuracy |
| `"לא זוהו תלמידים בולטים לתשומת לב."` | same | 467, 887 | `attentionStudents.length === 0` | **NO** — attention threshold is 50%, not 60% |
| `"אין המלצות"` (nav badge) | same | 639 | `recommendationItems.length === 0` | **NO** — same root cause |
| `"אין"` (nav badge for focus) | same | 634 | `focusItems.length === 0` | **NO** — fires regardless of accuracy |
| `"הכיתה מתקדמת כסדרה. ... מומלץ להמשיך מעקב שוטף."` | same | 215–216 | `signal === "progressing"` | **NO** — fires for 55%–79% cohort accuracy |
| `"כדאי לעקוב"` (riskLevel) | `lib/teacher-portal/teacher-ui.he.js` | 252 | `level === "moderate"` | **INSUFFICIENT** — 31% triggers same label as 58% |

**Critical:** The strings `"אין נושאים דחופים כרגע — המשך כרגיל."` and `"לא זוהו נושאים חלשים משמעותיים — המשיכו מעקב."` have **no accuracy check** as a safeguard. They will appear even if a student has 10% accuracy, as long as all topic keys happen to be unmapped.

---

## 8. Answers to Critical Questions

### A. What threshold makes 43% visible but 60% hidden?

**The 60% threshold (`LOW_ACCURACY_THRESHOLD`) is correct as a gate.** The issue is not the threshold — it is that topics fail the **label gate before reaching the accuracy gate**. A topic at 43% AND a topic at 63% are equally invisible if their topic key has no Hebrew label.

For a topic to reach Gate 4 (accuracy < 60%), it must first pass:
- Gate 1: not "general" or "mixed"
- Gate 2: has a Hebrew label in the dictionary
- Gate 3: ≥ 3 answers

The 60% threshold itself is defensible. The 55% class-health threshold is **too low** — 56%–64% classes get "progressing" treatment.

### B. Why no recommendations for 31%?

Primary cause: **All or most Hebrew/Moledet sessions have `null` topic → bucketed as "general" → dropped at Gate 1.**

Secondary cause: **Topic keys present in the data are not in the label dictionary → dropped at Gate 2.**

The recommendation engine never fails with an error — it produces `recommendationUnits = []` silently. The teacher sees a calm UI.

### C. What should happen when subject accuracy is low but no reliable topic exists?

The V1 engine already handles this with `nextPracticeFocus` subject-level fallback entries. The problem is that **V2 doesn't expose V1's subject-level fallback** in any UI-visible field.

Product-safe options (not implementing here):
1. **Option A:** Surface V1's `nextPracticeFocus` subject-level entries in the V2 UI path with a different visual treatment ("קשיים ברמת מקצוע — חסרים נתוני נושא ספציפיים"). This is honest about the data quality limitation while surfacing the real weakness.
2. **Option B:** Add a subject-level fallback directly in the V2 loop: when `subjects[sid].accuracy < LOW_ACCURACY_THRESHOLD` and `subjects[sid].answers >= MIN_ANSWERS_FOR_STUDENT_SIGNAL` and no topic units were created for that subject, push a subject-level unit with `topic = null`, `topicLabelHe = subjectLabelHe(sid)`.
3. **Option C:** Show a data-quality warning separately: "אזהרה: קיים קושי בעברית (31%) אך חסרים נתוני נושא לניתוח מדויק — מומלץ לבדוק את סיווג השאלות."
4. **Option D (QA/admin only):** Add a classification-gap indicator visible only to admins showing which subjects have high "general" topic rates.

**Option B is the minimal and safest fix** — it preserves the V2 structure and adds one code path.

### D. Severity Model Comparison

**Current model:**

| Range | Student riskLevel | Class healthSignal | Hebrew |
|-------|-------------------|-------------------|--------|
| 0–54% | moderate (if 1 signal) or high (if 3+ signals) | needs_support | "כדאי לעקוב" or "דורש תשומת לב" |
| 55–59% | moderate (if 1 signal) | progressing | "כדאי לעקוב" |
| 60–79% | low | progressing | "בקצב תקין" |
| 80%+ | low | strong | "בקצב תקין" |

**Proposed professional model (for owner review):**

| Range | Proposed Label | Rationale |
|-------|---------------|-----------|
| 0–49% | Critical intervention required | Immediate action needed |
| 50–64% | Needs reinforcement | Clear performance gap, requires attention |
| 65–74% | Monitor / targeted practice | Below expected mastery |
| 75%+ | On track | Generally acceptable |

**Key changes needed:**
- Add a `"needs_reinforcement"` tier between `"moderate"` and `"low"`
- Change class health threshold from 55% to 65% for the "needs_support" boundary
- Change `"progressing"` range to 65%–74% only (not 55%–79%)
- Add `"needs_support"` for 50%–64%

### E. Mapping and Metadata Coverage

Cannot be fully determined without live database query, but from code analysis:

- Any session with `topic = null` → "general" bucket → **effectively blind**
- Topics not in label dictionaries (17 Hebrew keys, 13 Moledet keys) → **effectively blind**
- If even 30% of sessions lack topic metadata, that accuracy is invisible to recommendations

The safest proxy metric: if `subjects[sid].topics["general"].answers` constitutes > 20% of `subjects[sid].answers`, that subject is likely under-classified.

### F. UI Misleading States — Should They Be Blocked?

**Yes.** The following states must be gated on subject-level accuracy:

- `"אין נושאים דחופים כרגע — המשך כרגיל."` must not appear if any subject has accuracy < 60% with ≥ 5 answers.
- `"לא זוהו נושאים חלשים משמעותיים — המשיכו מעקך."` must not appear if cohort accuracy is < 65%.
- The recommendations section fallback must not be empty when accuracy is critically low — at minimum it should surface the V1 subject-level signal.

### G. Class Report Logic

- **Can a class have 61% accuracy but zero `classRecommendationUnits`?** YES — if all `weaknessTopics` have unmapped labels.
- **Does overall class accuracy come from subject totals while topics are filtered separately?** YES — confirmed. Cohort accuracy includes all answers; topic filtering happens later and is independent.
- **How does `class.subject_focus` affect recommendations?** In `buildTeacherClassReportPayload`, `scopeSubjects = new Set([subjectFocus])` when `subject_focus` is set. This filters both `aggregateClassReportFromStudentPayloads` AND `buildClassTeacherGuidanceV2`. A Hebrew-focused class will only show Hebrew weakness topics.
- **Are School Report Hub and teacher class page using the same logic?** The school Report Hub `parseClassReportViewModel` uses `classRecommendationUnits` from the same payload. Yes, same logic path.

### H. Individual Student Logic

- **Why can 31% / 33% not produce recommendation units?** See Root Causes A-C above.
- **Does "כדאי לעקוב" hide a serious weakness?** YES. It is a static risk-level label with no numeric display and no urgency differentiation between 31% and 58%.
- **Are support suggestions suppressed too aggressively?** YES — in V2, `supportSuggestionsV2` is built only from recommendation units. Zero units → zero suggestions.

---

## 9. Exact Files and Functions Responsible

| Issue | File | Function/Line |
|-------|------|--------------|
| Gate 1 — topic key exclusion | `lib/teacher-portal/teacher-ui.he.js` | `isTeacherRecommendableTopicKey` — line 113 |
| Gate 2 — label resolver | `lib/teacher-portal/teacher-ui.he.js` | `resolveTopicLabelHe` — lines 124–134 |
| Label dictionary — Hebrew | `utils/math-report-generator.js` | `HEBREW_TOPIC_NAMES` — lines 131–148 |
| Label dictionary — Moledet | `utils/math-report-generator.js` | `MOLEDET_GEOGRAPHY_TOPIC_NAMES` — lines 154–169 |
| Label fallback returns raw key | `utils/math-report-generator.js` | `getHebrewTopicName` line 151, `getMoledetGeographyTopicName` line 172 |
| null topic → "general" default | `lib/parent-server/report-data-aggregate.server.js` | line 369 |
| V2 no subject-level fallback | `lib/teacher-server/teacher-guidance-v2.server.js` | `buildStudentTeacherGuidanceV2` — lines 301–412 |
| "no urgent topics" misleading message | `pages/teacher/student/[studentId].js` | line 314 |
| "no support suggestions" | same | line 353 |
| Recommendations section empty fallback | same | lines 269–280 |
| riskLevel too weak (1 signal = moderate) | `lib/teacher-server/teacher-recommendations.server.js` | lines 237–243 |
| classHealthSignal "progressing" at 61% | same | lines 357–362 |
| attentionScore threshold 50% (not 60%) | `lib/teacher-server/teacher-class-report.server.js` | line 99 |
| "no weak topics" school report empty | `lib/school-portal/school-report-view-model.js` | lines 461, 881 |
| "class progressing" for 61% cohort | same | lines 214–216 |
| Class V2 same label gates | `lib/teacher-server/teacher-guidance-v2.server.js` | `buildClassTeacherGuidanceV2` — lines 485–492 |

---

## 10. Product Risks

| Risk | Severity | Description |
|------|---------|-------------|
| Teacher misses critical student (31% accuracy) | **Critical** | Teacher sees "המשך כרגיל" and takes no action |
| Teacher misses class-wide weakness (61% class) | **Critical** | School report shows "מתקדמת כסדרה" |
| Loss of teacher trust | **High** | Product contradicts what teacher sees in student work |
| Silent data loss not logged | **High** | No way to detect how many recommendations were silently dropped |
| Hebrew/Moledet most affected | **High** | Smallest label dictionaries; likely highest null-topic rates |
| Demo data may not expose this | **Medium** | If demo data uses mapped topic keys, the bug is masked in QA |
| Threshold inconsistency | **Medium** | 60% gate for topics, 55% for class health, 50% for attention |

---

## 11. Recommended Implementation Plan

### Priority 1 — Critical Engine Correctness (unblocks 80% of the problem)

**Fix 1A: Add subject-level fallback to V2 student guidance builder**
- File: `lib/teacher-server/teacher-guidance-v2.server.js`
- After the topic loop for each subject, check: if no recommendation units were created for this subject AND `subjects[sid].accuracy < LOW_ACCURACY_THRESHOLD` AND `subjects[sid].answers >= MIN_ANSWERS_FOR_STUDENT_SIGNAL`, push a subject-level fallback unit
- Risk: Low — additive change, no data deleted
- SQL: No
- Owner copy needed: Yes — Hebrew label for subject-level intervention

**Fix 1B: Expose subject-level fallback in UI when V2 units = 0**
- File: `pages/teacher/student/[studentId].js`
- Block the "no urgent topics" message when `guidance.overallStats?.accuracyPct < 60`
- Risk: Low — guard condition only
- SQL: No
- Owner copy needed: Yes — replacement text when accuracy is low but no topic units

**Fix 1C: Fix class health signal threshold**
- File: `lib/teacher-server/teacher-recommendations.server.js`
- Change `STRUGGLING_ACCURACY_CUTOFF` from 55 to 65 (or introduce a new "needs_reinforcement" band at 65%)
- Risk: Medium — affects display for many classes
- SQL: No
- Owner copy needed: Yes — new Hebrew class health label

### Priority 2 — Topic Metadata/Persistence

**Fix 2A: Audit null-topic rate in production database**
- Query: `SELECT subject, COUNT(*) WHERE topic IS NULL GROUP BY subject`
- Purpose: quantify how much data is in "general" bucket
- Risk: None (read-only)
- SQL: Yes — read-only audit query

**Fix 2B: Ensure content delivery sets topic on every session**
- Affects: session creation code, question metadata
- Risk: Medium — requires reviewing question/session creation pipeline
- SQL: Possibly (migration to backfill)

### Priority 3 — Label Mapping

**Fix 3A: Expand Hebrew and Moledet label dictionaries**
- Files: `utils/math-report-generator.js` (`HEBREW_TOPIC_NAMES`, `MOLEDET_GEOGRAPHY_TOPIC_NAMES`)
- Add all topic keys actually used in production data
- Risk: Low
- SQL: No

**Fix 3B: Add a label-gap fallback for unmapped topic keys**
- When `getHebrewTopicName(k)` returns the raw key, consider using `hebrewFromEnglishSlug(k)` as a softer fallback before returning null
- Risk: Low — additive
- SQL: No

### Priority 4 — Threshold Model

**Fix 4A: Introduce severity tiers aligned with product spec**
- Files: `lib/teacher-server/teacher-recommendations.server.js`, `lib/teacher-portal/teacher-ui.he.js`
- Add 4-tier model: critical (< 50%), needs reinforcement (50–64%), monitor (65–74%), on track (75%+)
- Risk: Medium — visual and label changes affect all surfaces
- Owner copy needed: Yes — all Hebrew severity labels must be approved

**Fix 4B: Align `attentionScore` threshold from 50% to 60%**
- File: `lib/teacher-server/teacher-class-report.server.js` line 99
- Change `accuracy < 50` to `accuracy < 60`
- Risk: Low — may increase attention list size
- SQL: No

### Priority 5 — UI States and Messaging

**Fix 5A: Block misleading "no urgent topics" message**
- Files: `pages/teacher/student/[studentId].js:314`, `lib/school-portal/school-report-view-model.js:461,881`
- Add accuracy guard: only show calm message if overall accuracy ≥ 65%
- Owner copy needed: Yes — alternative message when accuracy < 65% but no topic units

**Fix 5B: Surface risk level with numeric context**
- Show accuracy percentage alongside "כדאי לעקוב" — e.g., "כדאי לעקוב (31% הצלחה)"
- Files: `pages/teacher/student/[studentId].js:224`
- Risk: Low
- Owner copy needed: Minimal

### Priority 6 — Simulation/Demo Data Alignment

**Fix 6A: Ensure demo data uses mapped topic keys for Hebrew and Moledet**
- Files: simulation scripts
- Purpose: expose bugs during QA; demo that uses only mapped keys masks the real production problem
- Risk: Low (simulation only)

### Priority 7 — QA Tests

**Test 7A: Unit test — student with 31% accuracy, all topics "general"**
- File: `scripts/tests/teacher-guidance-v2-unit.mjs`
- Assert: `recommendationUnits.length === 0` (documents the gap, or shows fix works)

**Test 7B: Unit test — class with 61% accuracy, all topics "general"**
- Assert: `classRecommendationUnits.length === 0` (documents gap)

**Test 7C: Unit test — subject-level fallback fires when no topic units**
- After fix 1A: assert that a student with 31% hebrew + only null-topic sessions produces a subject-level recommendation unit

---

## 12. QA Plan

1. **Before any fix:** Browser-test current state with demo student at 31% accuracy. Confirm it shows "כדאי לעקוב" and "אין נושאים דחופים" to establish baseline.
2. **After Fix 1A:** Verify subject-level recommendation appears for 31% hebrew student. Verify label is owner-approved Hebrew.
3. **After Fix 1B:** Verify "אין נושאים דחופים — המשך כרגיל" does NOT appear when overall accuracy < 60%.
4. **After Fix 1C:** Verify a 61% class shows "זקוקה לחיזוק" (or new tier label) rather than "מתקדמת כסדרה".
5. **After Fix 3A:** Verify new topic keys produce recommendation units where previously they were silently dropped.
6. **After Fix 4A:** Full sweep of all severity labels across student report, class report, school hub, dashboard.
7. **Regression:** A student at 80%+ accuracy must NOT receive a recommendation for a topic at 80%+.
8. **Regression:** A student with < 5 answers must still show "insufficientData" state correctly.

---

## 13. Confirmation: No Code Changed

No files were modified during this audit. The investigation was read-only.

```
git status --short output:
 M .cursor/plans/full_school_active_daily_simulation_e45efdf0.plan.md
 M .env.local
 M .gitignore
 M package.json
 M scripts/school-portal/reset-demo-school-activities.mjs
 M scripts/school-portal/seed-demo-school.mjs
?? .cursor/plans/teacher_live_discussion_feature_aff010e8.plan.md
?? docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_DELIVERY_REPORT.md
?? docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_PLAN.md
?? docs/qa/OPERATOR_DISABLE_AAA_NIGHTLY.md
?? docs/qa/SCHOOL_SIM_CREDENTIALS.md
?? docs/qa/TEACHER_TOPIC_CLASSIFICATION_PIPELINE_AUDIT.md
?? docs/teacher-live-discussion/
?? docs/qa/TEACHER_GUIDANCE_ENGINE_DEEP_AUDIT.md  (this file)
?? scripts/school-portal/export-demo-student-credentials.mjs
?? scripts/school-portal/run-school-sim-nightly.mjs
?? scripts/school-portal/sim/
?? scripts/school-portal/timeline-school-sim.md
```

All pre-existing modifications (`M`) existed before this audit session. No engine, UI, API, utility, or migration file was touched.

---

*End of audit. No implementation performed. All findings are read-only code analysis.*
