# Phase B — English and Science Assigned-Activity Content Expansion Plan

**Status:** Plan only — do not implement content or product code without approval  
**Supersedes:** Previous version of this file  
**Related audit:** [`docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md`](../qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md)  
**Generated from:** Live audit 2026-06-03 + `generateActivityQuestionSetClient` verification + codebase read  
**Target activity size:** count=**5** (default in `AssignActivityModal.js` and teacher assign flows)

---

## 1. Executive Summary

### What is broken

English assigned activities for `grammar`, `sentences`, and `translation` (grades g2–g6) fail at medium and/or hard difficulty with the default UI count of 5.  Science assigned activities for `materials`, `earth_space`, and `environment` (grades g1–g6) fail at one or more difficulty levels at count=5.

Both subjects are shown to parents and teachers in the assigned-activity selector and appear fully selectable.  When a parent selects grammar at medium for a g4 student, the activity silently fails to generate — or generates 0 questions — because the question bank is too thin at that grade/topic/difficulty combination after the MCQ-only filter and dedup fingerprinting are applied.  There is no silent fallback to unrelated questions; the generator returns an error or empty result.

### Why it happens

The English assigned-activity path (`lib/classroom-activities/generate-activity-questions-client.js`) applies two critical filters on top of the generator output:

1. **MCQ filter** (`isEnglishNonMcqMode`) — rejects items where the generator selected `typing` or `writing` mode.  At `medium` and `hard` difficulty the generator (`utils/english-question-generator.js`) switches grammar and sentence items to typing mode for most grades, so nearly all generated items are filtered out.
2. **Dedup filter** (`question|correctAnswer` fingerprint) — rejects duplicate questions in the same activity.  Translation pools at g3–g5 have items but too many share the same surface form, so dedup reduces the usable unique count below 5.

For science the failure is simpler: the static bank `data/science-questions.js` does not have enough items tagged with the correct `grades[]`/`minLevel`/`maxLevel` combination for the failing cells.  For example, g1 `materials` has 11 easy items but only 1 medium and 1 hard.

### Why this is content/bank expansion — not a UI bug

The topics exist in the curriculum, the learning books, and the topic selectors.  The product functions correctly except for depth.  Fixing this does not require changing question display, scoring, routing, or any UI component.  The work is:

- Adding pre-built MCQ items to English pool files at the missing difficulty levels so the MCQ filter finds enough passing items.
- Adding new science bank rows to `data/science-questions.js` (or a new batch file) with correct `grades[]`, `minLevel`, `maxLevel`, `type: "mcq"`.
- One generator/pool-mapping fix for English g6 translation (where the grade-split logic in `grade-gating.js` assigns too few items to g6 at all difficulties).

### What success means

After expansion, running `node scripts/audit-assigned-activity-topic-availability.mjs` reports **supported** at easy, medium, and hard with count=5 for every grade/topic pair listed in sections 4 and 5 of this plan.  No product code (scoring, rewards, display, routing) changes.

**Scope in numbers:**  
- English: **159 new MCQ items** (55 grammar + 40 sentences + 64 translation) + 1 generator/pool-wiring fix for g6 translation.  
- Science: **75 new bank rows** (28 materials + 24 earth_space + 23 environment), no generator change.  
- Total new items: **234** across 13 English grade/topic pairs and 18 science grade/topic/difficulty cells.

---

## 2. Product Rules

The following rules govern all work in this phase.  They must be applied by whoever implements content and verified by QA.

1. **Do not show sendable assigned-activity topics unless they can generate a valid activity at count=5 at easy, medium, and hard.**  (Topic selector visibility is enforced by bank depth, not by hiding.)
2. **Do not silently fall back to unrelated questions.**  The generator must return an explicit error rather than substitute questions from an unrelated topic.
3. **Do not hide core curriculum topics just because the bank is thin.**  Expand the bank instead.
4. **If a topic is core, expand or fix it.**  All topics in this plan are marked must-have in the audit.
5. **If a topic is not suitable for automatic assigned activities, list it separately for owner decision.**  Do not silently block it.
6. **Parent/teacher preview, saved `question_set`, and child play must use the same generated questions.**  The frozen snapshot created at save time is the authoritative source; child play renders the snapshot verbatim.
7. **Do not change scoring, rewards, timing, reports, or answer validation.**
8. **All new MCQ items must have one clearly correct answer and at least 3 plausible distractors unless the existing pool style uses 2.**
9. **Question text and answer options must be consistent with the grade level and subject language conventions already established in each pool file.**
10. **No new item may duplicate an existing item (same `question` + `correctAnswer` fingerprint).**

---

## 3. Current State from Audit

Source: `docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md` (generated 2026-06-03).

Legend:  
- **Usable count** = items that pass grade filter + MCQ filter (English) or level filter (science) in the bank  
- **Required count** = 5 (minimum unique items for assigned activity at count=5)  
- **Gap** = Required − Usable (positive = items to add)  
- **Failure type:** `mcq-filter` = items exist but are rejected as typing mode; `thin-bank` = too few static items; `dedup` = items exist but collide after fingerprinting; `mapping-bug` = generator/pool mapping error

### English current support matrix

| Subject | Grade | Topic | Difficulty | Usable count | Required | Gap | Failure type | Notes |
|---------|-------|-------|------------|:------------:|:--------:|:---:|--------------|-------|
| english | g2 | translation | easy | ~50 | 5 | 0 | — | PASS |
| english | g2 | translation | medium | ~50 | 5 | 0 | — | PASS |
| english | g2 | translation | hard | ~5 | 5 | +4 | thin-bank | `classroom`/`routines` pools have few hard-tagged items for g2 |
| english | g3 | grammar | easy | ~50 | 5 | 0 | — | PASS |
| english | g3 | grammar | medium | ~50 | 5 | 0 | — | PASS |
| english | g3 | grammar | hard | ~0 | 5 | +5 | mcq-filter | Generator returns typing at hard; no MCQ hard items in `present_simple`/`question_frames` |
| english | g3 | sentences | easy | ~50 | 5 | 0 | — | PASS |
| english | g3 | sentences | medium | ~0 | 5 | +5 | mcq-filter | Generator returns typing at medium/hard; `routine`/`descriptive` pools have no pre-built MCQ |
| english | g3 | sentences | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g3 | translation | easy | ~50 | 5 | +5 | dedup | Items exist but too many share stem; 5 unique fingerprints not achievable |
| english | g3 | translation | medium | ~50 | 5 | +5 | dedup | Same |
| english | g3 | translation | hard | ~10 | 5 | +5 | dedup + thin | Few hard items + dedup collisions |
| english | g4 | grammar | easy | ~50 | 5 | 0 | — | PASS |
| english | g4 | grammar | medium | ~0 | 5 | +5 | mcq-filter | `progressive`, `quantifiers` pools — no MCQ medium items |
| english | g4 | grammar | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g4 | sentences | easy | ~50 | 5 | 0 | — | PASS |
| english | g4 | sentences | medium | ~0 | 5 | +5 | mcq-filter | `descriptive`/`narrative` pools — no MCQ medium/hard |
| english | g4 | sentences | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g4 | translation | easy | ~50 | 5 | +5 | dedup | `hobbies`/`community` pool — dedup failures at count=5 |
| english | g4 | translation | medium | ~50 | 5 | +5 | dedup | Same |
| english | g4 | translation | hard | ~38 | 5 | +5 | dedup | Dedup reduces to <5 unique |
| english | g5 | grammar | easy | ~50 | 5 | 0 | — | PASS |
| english | g5 | grammar | medium | ~0 | 5 | +5 | mcq-filter | `past_simple`, `modals` etc. — no MCQ medium |
| english | g5 | grammar | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g5 | sentences | easy | ~50 | 5 | 0 | — | PASS |
| english | g5 | sentences | medium | ~0 | 5 | +5 | mcq-filter | `narrative`/`advanced` — no MCQ medium/hard |
| english | g5 | sentences | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g5 | translation | easy | ~50 | 5 | +5 | dedup | `community`/`technology` — dedup |
| english | g5 | translation | medium | ~12 | 5 | +5 | thin + dedup | Low raw count + dedup |
| english | g5 | translation | hard | ~9 | 5 | +5 | thin + dedup | Same |
| english | g6 | grammar | easy | ~50 | 5 | 0 | — | PASS |
| english | g6 | grammar | medium | ~0 | 5 | +5 | mcq-filter | `complex_tenses`/`conditionals` — no MCQ medium |
| english | g6 | grammar | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g6 | sentences | easy | ~50 | 5 | 0 | — | PASS |
| english | g6 | sentences | medium | ~0 | 5 | +5 | mcq-filter | `advanced` pool — no MCQ medium/hard |
| english | g6 | sentences | hard | ~0 | 5 | +5 | mcq-filter | Same |
| english | g6 | translation | easy | ~7 | 5 | +5 | mapping-bug | Grade-split gives g6 too few items even at easy; generator returns Hebrew error |
| english | g6 | translation | medium | ~7 | 5 | +5 | mapping-bug | Same |
| english | g6 | translation | hard | ~6 | 5 | +5 | mapping-bug + thin | Same |

**Summary:** 6 of 28 English grade/topic pairs pass assigned activities (all 5 are vocabulary + easy-only pairs). 22 fail.

### Science current support matrix

| Subject | Grade | Topic | Difficulty | Usable count | Required | Gap | Failure type | Notes |
|---------|-------|-------|------------|:------------:|:--------:|:---:|--------------|-------|
| science | g1 | materials | easy | 11 | 5 | 0 | — | PASS |
| science | g1 | materials | medium | 1 | 5 | +4 | thin-bank | Only 1 item tagged medium |
| science | g1 | materials | hard | 1 | 5 | +4 | thin-bank | Only 1 item tagged hard |
| science | g1 | earth_space | easy | 10 | 5 | 0 | — | PASS |
| science | g1 | earth_space | medium | 1 | 5 | +4 | thin-bank | Same |
| science | g1 | earth_space | hard | 1 | 5 | +4 | thin-bank | Same |
| science | g1 | environment | easy | 9 | 5 | 0 | — | PASS |
| science | g1 | environment | medium | 1 | 5 | +4 | thin-bank | Same |
| science | g1 | environment | hard | 1 | 5 | +4 | thin-bank | Same |
| science | g2 | materials | easy | 12 | 5 | 0 | — | PASS |
| science | g2 | materials | medium | 6 | 5 | 0 | — | PASS |
| science | g2 | materials | hard | 1 | 5 | +4 | thin-bank | Only 1 hard item |
| science | g2 | earth_space | easy | 8 | 5 | 0 | — | PASS |
| science | g2 | earth_space | medium | 3 | 5 | +2 | thin-bank | 3 items, need 5 |
| science | g2 | earth_space | hard | 1 | 5 | +4 | thin-bank | Only 1 hard item |
| science | g2 | environment | easy | 10 | 5 | 0 | — | PASS |
| science | g2 | environment | medium | 4 | 5 | +1 | thin-bank | 4 items, need 5 |
| science | g2 | environment | hard | 1 | 5 | +4 | thin-bank | Only 1 hard item |
| science | g3 | materials | easy | 4 | 5 | +2 | thin-bank | 4 items but dedup fails @5; add ≥2 |
| science | g3 | materials | medium | 21 | 5 | 0 | — | PASS |
| science | g3 | materials | hard | 4 | 5 | +2 | thin-bank | Same as easy — dedup risk |
| science | g3 | earth_space | easy | 4 | 5 | +2 | thin-bank | Same pattern |
| science | g3 | earth_space | medium | 18 | 5 | 0 | — | PASS |
| science | g3 | earth_space | hard | 4 | 5 | +2 | thin-bank | Same |
| science | g3 | environment | easy | 4 | 5 | +2 | thin-bank | Same pattern |
| science | g3 | environment | medium | 17 | 5 | 0 | — | PASS |
| science | g3 | environment | hard | 4 | 5 | +2 | thin-bank | Same |
| science | g4 | materials | easy | 4 | 5 | +2 | thin-bank | Dedup risk at 4 items |
| science | g4 | materials | medium | 21 | 5 | 0 | — | PASS |
| science | g4 | materials | hard | 5 | 5 | 0 | — | PASS (marginal) |
| science | g4 | earth_space | easy | 4 | 5 | +2 | thin-bank | Same |
| science | g4 | earth_space | medium | 15 | 5 | 0 | — | PASS |
| science | g4 | earth_space | hard | 10 | 5 | 0 | — | PASS |
| science | g4 | environment | easy | 4 | 5 | +2 | thin-bank | Same |
| science | g4 | environment | medium | 15 | 5 | 0 | — | PASS |
| science | g4 | environment | hard | 9 | 5 | 0 | — | PASS |
| science | g5 | materials | easy | 2 | 5 | +3 | thin-bank | Only 2 easy items |
| science | g5 | materials | medium | 3 | 5 | +2 | thin-bank | Only 3 medium items |
| science | g5 | materials | hard | 7 | 5 | 0 | — | PASS |
| science | g5 | earth_space | easy | 3 | 5 | +2 | thin-bank | Same |
| science | g5 | earth_space | medium | 11 | 5 | 0 | — | PASS |
| science | g5 | earth_space | hard | 18 | 5 | 0 | — | PASS |
| science | g5 | environment | easy | 3 | 5 | +2 | thin-bank | Same |
| science | g5 | environment | medium | 10 | 5 | 0 | — | PASS |
| science | g5 | environment | hard | 24 | 5 | 0 | — | PASS |
| science | g6 | materials | easy | 2 | 5 | +3 | thin-bank | Only 2 easy items |
| science | g6 | materials | medium | 3 | 5 | +2 | thin-bank | Only 3 medium items |
| science | g6 | materials | hard | 13 | 5 | 0 | — | PASS |
| science | g6 | earth_space | easy | 3 | 5 | +2 | thin-bank | Same pattern |
| science | g6 | earth_space | medium | 18 | 5 | 0 | — | PASS |
| science | g6 | earth_space | hard | 17 | 5 | 0 | — | PASS |
| science | g6 | environment | easy | 4 | 5 | +2 | thin-bank | Dedup risk |
| science | g6 | environment | medium | 10 | 5 | 0 | — | PASS |
| science | g6 | environment | hard | 29 | 5 | 0 | — | PASS |

**Summary:** 20 of 38 science grade/topic pairs pass. 18 fail. All failures are thin-bank (not generator bugs).

---

## 4. English Detailed Plan

### Architecture reminder

The assigned English path (`lib/classroom-activities/generate-activity-questions-client.js`):

1. Calls `generateQuestion(level, topic, gradeKey)` from `utils/english-question-generator.js` up to `n×40` times.
2. Filters out items where `isEnglishNonMcqMode()` returns true (typing, writing, speaking modes).
3. Deduplicates by `question|correctAnswer` fingerprint.
4. Requires ≥ `count` (default 5) unique MCQ items or throws.

The generator uses `GRADE_PROFILES` to select pool keys per grade, then `resolveEnglishQType()` to decide question type.  At medium/hard difficulty `resolveEnglishQType()` returns `typing` for grammar and sentence patterns — those items are then rejected by step 2.

**The fix for grammar and sentences:** Add items directly to pool files with explicit `options[]` / `correct` / `difficulty` fields and a non-typing `patternFamily`.  The assigned path's `frozenEnglishItemFromGenerated()` requires `answers[]` with ≥2 choices; pre-built MCQ items must match that shape.  No change to `resolveEnglishQType()` is required — the generator returns the pre-built item as-is when the pool item already has options.

**The fix for translation dedup:** Add more unique sentence pairs per pool/grade.  New items must have distinct `en` and `he` values that produce unique fingerprints after normalization.

**The fix for g6 translation (mapping bug):** See §4.6.

---

### 4.1 English `grammar`

**Grade profiles for grammar:**

| Grade | Pool keys used | Current MCQ easy | Current MCQ medium | Current MCQ hard |
|-------|---------------|-----------------|-------------------|-----------------|
| g2 | `be_basic`, `question_frames` | ✓ | ✓ | not in scope (g2 has no grammar topic) |
| g3 | `present_simple`, `question_frames` | ✓ | ✓ | ✗ |
| g4 | `present_simple`, `progressive`, `quantifiers` | ✓ | ✗ | ✗ |
| g5 | `past_simple`, `modals`, `comparatives`, `future_forms` | ✓ | ✗ | ✗ |
| g6 | `complex_tenses`, `conditionals`, `modals`, `comparatives` | ✓ | ✗ | ✗ |

**g2:** No grammar topic in curriculum; out of scope.

**g3 grammar:**
- What currently works: easy and medium pass @5.
- What fails: hard.
- New questions needed: **5 hard** MCQ items across `present_simple` / `question_frames`.
- Question type: MCQ, fill-in-the-blank with 4 choices.  Example: "She _____ to school every day. (a) go (b) goes (c) going (d) gone" — at hard, use more complex structures (negatives, questions, tag questions).
- MCQ-compatible: Yes — pre-build with `options[]`, `correct`, `difficulty: "hard"`, `patternFamily: "present_simple_hard_mcq"`.
- Generator fix: None needed — adding pre-built items with correct structure bypasses typing mode selection.
- Remains visible after expansion: Yes.

**g4 grammar:**
- What currently works: easy only.
- What fails: medium and hard.
- New questions needed: **5 medium + 5 hard** MCQ items across `progressive`, `quantifiers`, `present_simple`.
- Medium: "I _____ (play/playing/played/plays) football right now." — present continuous fill-in.  Quantifiers: "There is _____ milk in the glass. (a lot of / many / few / a few)" — choose correct quantifier.
- Hard: Complex present continuous vs present simple; quantifier precision (much/many/a lot of/a few/few/little).
- MCQ-compatible: Yes (pre-built items only).
- Generator fix: None.
- Remains visible after expansion: Yes.

**g5 grammar:**
- What currently works: easy only.
- What fails: medium and hard.
- New questions needed: **10 medium + 10 hard**, spread across the 4 pool keys (`past_simple`, `modals`, `comparatives`, `future_forms`) with ≥2 items per pool key per difficulty.  **Total: 20 new items** for g5 grammar.  Rationale: the minimum to pass count=5 is 5 per difficulty (10 total), but with 4 pool keys the 20-item target ensures ≥2 items per key per difficulty, providing quality variety and avoiding over-reliance on a single pattern.
- Medium: Past simple regular/irregular; modal choice (can/could/should/must); comparative (taller/more intelligent); going to vs will.
- Hard: Irregular past forms in context; double modal use; superlatives; mixed future forms in dialogue.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**g6 grammar:**
- What currently works: easy only.
- What fails: medium and hard.
- New questions needed: **10 medium + 10 hard**, spread across the 4 pool keys (`complex_tenses`, `conditionals`, `modals`, `comparatives`) with ≥2 items per pool key per difficulty.  **Total: 20 new items** for g6 grammar.  Same rationale as g5: 4 pool keys make 20 the quality target (≥2 per key per difficulty), even though the bare count=5 minimum is 10.
- Medium: Present perfect vs past simple; zero/first conditional; modals of obligation (must/have to/should); comparative/superlative irregular forms.
- Hard: Second conditional; perfect modals (should have/could have); mixed tense in paragraph; inversion after negatives.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**Grammar total new items: 55** (5 g3 hard + 10 g4 + 20 g5 + 20 g6).  Check: 5 + 10 + 20 + 20 = 55.

---

### 4.2 English `sentences`

**Grade profiles for sentences:**

| Grade | Pool keys used | Current MCQ easy | medium | hard |
|-------|---------------|-----------------|--------|------|
| g3 | `routine`, `descriptive` | ✓ | ✗ | ✗ |
| g4 | `descriptive`, `narrative` | ✓ | ✗ | ✗ |
| g5 | `narrative`, `advanced` | ✓ | ✗ | ✗ |
| g6 | `advanced` | ✓ | ✗ | ✗ |

**g2 sentences:** Not in curriculum for assigned activities; out of scope.

**g3 sentences:**
- What currently works: easy only.
- What fails: medium, hard.
- New questions needed: **5 medium + 5 hard** MCQ items for `routine`/`descriptive` pools.
- Medium: Choose the correct word order / complete a routine sentence with the right word.  "After school, she always _____ her homework. (a) do (b) does (c) doing (d) done"
- Hard: Identify the grammatically correct complete sentence from 4 options; complex routine description with time clause.
- MCQ-compatible: Yes (pre-built items).
- Generator fix: None.
- Remains visible after expansion: Yes.

**g4 sentences:**
- What currently works: easy only.
- What fails: medium, hard.
- New questions needed: **5 medium + 5 hard** for `descriptive`/`narrative`.
- Medium: Fill-in connector/adjective in descriptive sentence; choose correct tense in narrative context.
- Hard: Identify correct sentence from 4 structurally similar options; narrative with embedded time clause.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**g5 sentences:**
- What currently works: easy only.
- What fails: medium, hard.
- New questions needed: **5 medium + 5 hard** for `narrative`/`advanced`.
- Medium: Choose the correct connector (however/therefore/although); narrative past simple vs past continuous.
- Hard: Choose the sentence that correctly uses reported speech or relative clause; advanced academic vocabulary in context.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**g6 sentences:**
- What currently works: easy only.
- What fails: medium, hard.
- New questions needed: **5 medium + 5 hard** for `advanced` pool.
- Medium: Conditional clause completion; abstract connector use (consequently/in contrast/furthermore).
- Hard: Identify the only grammatically and semantically correct option among 4 near-identical academic sentences.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**Sentences total new items: ~40** (10 g3 + 10 g4 + 10 g5 + 10 g6).

---

### 4.3 English `translation`

**Grade profiles for translation:**

| Grade | Pool keys | Current MCQ easy | medium | hard |
|-------|----------|-----------------|--------|------|
| g2 | `classroom`, `routines` | ✓ | ✓ | ✗ |
| g3 | `routines`, `hobbies` | ✗ (dedup) | ✗ (dedup) | ✗ |
| g4 | `hobbies`, `community` | ✗ (dedup) | ✗ (dedup) | ✗ |
| g5 | `community`, `technology` | ✗ (dedup) | ✗ (thin+dedup) | ✗ (thin+dedup) |
| g6 | `technology`, `global` | ✗ (mapping bug) | ✗ (mapping bug) | ✗ (mapping bug) |

**g2 translation:**
- What currently works: easy, medium.
- What fails: hard.
- New questions needed: **+4 hard** unique items in `classroom`/`routines` pools with `difficulty: "hard"` and `minGrade: 2`, `maxGrade: 2`.
- Hard direction for g2: Hebrew → English or choose English translation from 4 options (one correct, three plausible distractors using similar vocabulary).
- MCQ-compatible: Yes — translation items are pre-built MCQ pairs.
- Generator fix: None.
- Remains visible after expansion: Yes.

**g3 translation:**
- What currently works: Nothing reliably (dedup failure at all difficulties).
- What fails: easy, medium, hard.
- Root cause: `routines` and `hobbies` pool items share too many similar surface forms; dedup fingerprint removes duplicates until < 5 remain.
- New questions needed: **+5 unique** items per difficulty level across `routines`/`hobbies` for g3 (total **+15** new items, ensuring each has a unique `en` value after normalization).  Items must have clearly distinct sentence stems.
- Concepts: Daily routines, after-school activities, hobbies (drawing, reading, playing sport), simple family activities.
- MCQ-compatible: Yes — translate from Hebrew prompt, choose English sentence from 4 options.
- Generator fix: Dedup fix is content only (add more distinct items); no code change needed.
- Remains visible after expansion: Yes.

**g4 translation:**
- What currently works: Nothing (dedup failure).
- What fails: easy, medium, hard.
- New questions needed: **+5 unique** per difficulty in `hobbies`/`community` (total **+15**).
- Concepts: Community places (library, post office), community helpers, hobbies in context of community participation.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**g5 translation:**
- What currently works: Nothing.
- What fails: easy (dedup), medium (thin+dedup), hard (thin+dedup).
- New questions needed: **+5** easy (dedup fix via new distinct items), **+5** medium, **+5** hard in `community`/`technology` (total **+15**).
- Concepts: Technology use, digital communication, community projects, environmental actions.
- MCQ-compatible: Yes.
- Generator fix: None.
- Remains visible after expansion: Yes.

**g6 translation (special focus — generator/mapping bug):**

**Diagnosis:**  
The audit error message is: "אין מספיק שאלות אנגלית עבור כיתה ו׳ — נושא: תרגום — רמה: קל" — the generator itself reports not enough questions even at easy.  The g6 translation pools are `technology` and `global`.  

In `utils/grade-gating.js` the function `englishPoolItemAllowedWithClassSplit()` uses FNV hash on the class/student identifier to split overlapping pools between adjacent grades.  The `global` pool has `minGrade`/`maxGrade` spanning g5–g6.  If the hash splits g5 into the majority of `global` items, and the `technology` pool also serves g5, then the items available to g6 fall below 5 even before difficulty filtering.

This is confirmed by the usable count of ~7 at easy — the pool physically contains more items, but the grade-split leaves only 7 accessible to g6 instances.

**Recommended fix (two-part):**

Part A — Content: Add at least **15 new translation items** explicitly marked `minGrade: 6`, `maxGrade: 6` in `translation-pools.js`.  These are not subject to the class split (items with exact grade match are not split between adjacent grades).  Target 5 per difficulty.  Topics: advanced technology vocabulary, global issues (climate, media, communication), cultural exchange.

Part B — Pool wiring: Verify that `GRADE_PROFILES.g6.translationPools` in `utils/english-question-generator.js` includes the pools containing the new g6-specific items.  If a new pool key is introduced (e.g. `global_advanced`), add it to the g6 profile and to `ENGLISH_TRANSLATION_POOL_RANGE` in `grade-gating.js` with `minGrade: 6, maxGrade: 6` (no split needed).

**This fix requires one small generator change** (adding a pool key to g6 profile) and one `grade-gating.js` change (registering the new pool range) — both are minimal, non-scoring, non-display changes.

- MCQ-compatible: Yes.
- Remains visible after expansion: Yes.

**Translation total new items: 64** (4 g2 + 15 g3 + 15 g4 + 15 g5 + 15 g6 including generator fix).  Check: 4 + 15 + 15 + 15 + 15 = 64.

---

### 4.4 English summary table: new items needed

Notes on column values:
- Counts are **recommended authoring targets**, not bare minimums.  Bare minimum per failing difficulty cell is always 5 (gap to reach count=5).
- Grammar g5 and g6 use 20 items each because they each have 4 active pool keys — the target is ≥2 items per pool key per difficulty to ensure variety.  Grammar g3 (2 pool keys) and g4 (3 pool keys) use the bare minimum since ≥1–2 items per key is sufficient at those grades.
- Translation counts include items for all three difficulties (easy + medium + hard) per grade.

| Grade | Topic | Pool keys | medium to add | hard to add | easy to add | Generator fix | Total |
|-------|-------|:---------:|:-------------:|:-----------:|:-----------:|:-------------:|------:|
| g2 | translation | 2 | 0 | +4 | 0 | no | **4** |
| g3 | grammar | 2 | 0 | +5 | 0 | no | **5** |
| g3 | sentences | 2 | +5 | +5 | 0 | no | **10** |
| g3 | translation | 2 | +5 | +5 | +5 | no (dedup content fix) | **15** |
| g4 | grammar | 3 | +5 | +5 | 0 | no | **10** |
| g4 | sentences | 2 | +5 | +5 | 0 | no | **10** |
| g4 | translation | 2 | +5 | +5 | +5 | no | **15** |
| g5 | grammar | 4 | +10 | +10 | 0 | no | **20** |
| g5 | sentences | 2 | +5 | +5 | 0 | no | **10** |
| g5 | translation | 2 | +5 | +5 | +5 | no | **15** |
| g6 | grammar | 4 | +10 | +10 | 0 | no | **20** |
| g6 | sentences | 1 | +5 | +5 | 0 | no | **10** |
| g6 | translation | 2 | +5 | +5 | +5 | **yes (pool wiring)** | **15** |
| **Total** | | | **65** | **74** | **20** | | **159** |

**By topic:** Grammar 55 + Sentences 40 + Translation 64 = **159**
**By difficulty:** easy 20 + medium 65 + hard 74 = **159**
**Row-by-row check:** 4+5+10+15+10+10+15+20+10+15+20+10+15 = 159 ✓

---

## 5. Science Detailed Plan

### Architecture reminder

Science assigned activities draw from the static array `SCIENCE_QUESTIONS` exported by `data/science-questions.js`.  The generator filters by:

- `item.grades.includes(grade)` — grade match
- `scienceLevelAllowed(item.minLevel, item.maxLevel, selectedLevel)` — level match: `easy ≤ minLevel ≤ maxLevel` with `easy < medium < hard`
- `item.type === "mcq"` — already enforced in bank items

No dynamic generation; adding items to the bank immediately makes them available.

New items must be added to a new batch file `data/science-questions-phase-b.js` (following the existing naming pattern) and imported/concatenated in `data/science-questions.js`.

---

### 5.1 Science `materials`

**g1 materials:**
- What currently works: easy (11 items).
- What fails: medium (1 item), hard (1 item).
- How many new items: **+4 medium, +4 hard** = 8 new.
- Concepts for new items:
  - Medium: Properties of materials (hard vs soft, rough vs smooth, transparent vs opaque, flexible vs rigid).  "Which material lets light through? (a) wood (b) glass (c) metal (d) stone" — in Hebrew.
  - Hard: Why we use specific materials for specific uses (window is glass because transparent; spoon is metal because hard and not breakable; raincoat is plastic because waterproof).  Compare two materials for a purpose.
- Age-appropriate for g1: short Hebrew stem, 4 simple one-word or short-phrase options, no reading passages.
- Book source: `docs/learning-book/science/g1/drafts/materials.md`.
- Generator/filter issue: No — bank only.
- Remains visible after expansion: Yes.

**g2 materials:**
- What currently works: easy (12), medium (6).
- What fails: hard (1 item).
- New items: **+4 hard** = 4.
- Concepts: Compare material properties for a specific use (building a house, making clothing, carrying water); change of state (ice → water → steam at a basic level for g2); recycling of materials.
- Simple wording; Hebrew stems; 4-option MCQ.
- Generator/filter issue: No.
- Remains visible after expansion: Yes.

**g3 materials:**
- What currently works: medium (21).
- What fails: easy (4 items — dedup at @5), hard (4 items — dedup at @5).
- New items: **+2 easy, +2 hard** (add buffer above minimum).
- Concepts: 
  - Easy: Basic material identification; natural vs synthetic materials; everyday examples.
  - Hard: Multi-step reasoning (a material is good for X because it has property Y which causes Z); changes to materials (heating, cooling, mixing).
- Generator/filter issue: No.
- Remains visible after expansion: Yes.

**g4 materials:**
- What currently works: medium (21), hard (5 — marginal pass).
- What fails: easy (4 items).
- New items: **+2 easy** (add buffer).
- Concepts: Basic identification of natural vs man-made; material classification by use.
- Generator/filter issue: No.
- Remains visible after expansion: Yes.

**g5 materials:**
- What currently works: hard (7).
- What fails: easy (2 items), medium (3 items).
- New items: **+3 easy, +2 medium** = 5.
- Concepts:
  - Easy: Physical vs chemical properties; conductors/insulators (heat and electricity) at a basic level; natural vs synthetic at g5 depth.
  - Medium: Applications of material properties in technology (why we use copper wire, why glass is used for lenses); mixtures and solutions; states of matter changes.
- Generator/filter issue: No.
- Remains visible after expansion: Yes.

**g6 materials:**
- What currently works: hard (13).
- What fails: easy (2 items), medium (3 items).
- New items: **+3 easy, +2 medium** = 5.
- Concepts:
  - Easy: Basic review of material types; identification questions on common industrial materials.
  - Medium: Chemical changes vs physical changes; polymers; materials in construction (concrete, steel, glass); environmental impact of material choices.
- Generator/filter issue: No.
- Remains visible after expansion: Yes.

---

### 5.2 Science `earth_space`

**g1 earth_space:**
- What currently works: easy (10).
- What fails: medium (1), hard (1).
- New items: **+4 medium, +4 hard** = 8.
- Concepts:
  - Medium: Day and night cycle (Earth rotates); seasons and their causes (simple); the moon's appearance; simple planet identification (Earth is the planet where we live; the sun is a star).
  - Hard: Why we have seasons (Earth tilts); phases of the moon (new/full/crescent); differences between the sun, moon, and stars; day and night on different parts of Earth.
- Simple vocabulary for g1; Hebrew stems; one-image-style questions ("Which shows the Earth at night?") are acceptable if diagram support is confirmed, otherwise text-only.
- Book source: `docs/learning-book/science/g1/drafts/earth_space.md`.
- Remains visible after expansion: Yes.

**g2 earth_space:**
- What currently works: easy (8).
- What fails: medium (3 items — need 5), hard (1 item).
- New items: **+2 medium, +4 hard** = 6.
- Concepts:
  - Medium: Weather types (rain, sun, snow, wind) and their seasons; the water cycle (rain → evaporation at simple level); how clouds form.
  - Hard: Water cycle steps in order; comparing climates of different places; why the moon looks different each night; basic solar system (8 planets, in order or count).
- Remains visible after expansion: Yes.

**g3 earth_space:**
- What currently works: medium (18).
- What fails: easy (4 — dedup), hard (4 — dedup).
- New items: **+2 easy, +2 hard**.
- Concepts:
  - Easy: Simple review — day/night, seasons, moon; identifying parts of the solar system.
  - Hard: Earth structure (crust, mantle, core); tectonic plates and earthquakes at intro level; eclipses (solar/lunar); comparing planets.
- Remains visible after expansion: Yes.

**g4 earth_space:**
- What currently works: medium (15), hard (10).
- What fails: easy (4 — dedup).
- New items: **+2 easy**.
- Concepts: Simple review of Earth structure; basic atmosphere layers; gravity concept.
- Remains visible after expansion: Yes.

**g5 earth_space:**
- What currently works: medium (11), hard (18).
- What fails: easy (3).
- New items: **+2 easy**.
- Concepts: Basic identification questions on solar system components; simple gravity questions; review of water cycle.
- Remains visible after expansion: Yes.

**g6 earth_space:**
- What currently works: medium (18), hard (17).
- What fails: easy (3).
- New items: **+2 easy**.
- Concepts: Basic planet identification; simple atmosphere layer naming; introductory space exploration concepts.
- Remains visible after expansion: Yes.

---

### 5.3 Science `environment`

**g1 environment:**
- What currently works: easy (9).
- What fails: medium (1), hard (1).
- New items: **+4 medium, +4 hard** = 8.
- Concepts:
  - Medium: What harms the environment (pollution, littering, cutting trees); what helps the environment (planting trees, not littering, recycling); clean water importance; animals' natural habitats.
  - Hard: Food chain at a simple level (plant → herbivore → carnivore); what happens if we cut all trees; why we recycle; connection between a clean environment and health.
- Simple language for g1; Hebrew stems; no long passages.
- Book source: `docs/learning-book/science/g1/drafts/environment.md`.
- Remains visible after expansion: Yes.

**g2 environment:**
- What currently works: easy (10).
- What fails: medium (4 items — need 5), hard (1 item).
- New items: **+1 medium, +4 hard** = 5.
- Concepts:
  - Medium: Types of pollution (air, water, noise); recycling symbols and what they mean; actions that protect the environment; role of plants in the environment.
  - Hard: Compare polluted vs clean environments; long-term consequences of deforestation; how individual actions affect the environment; ecosystem interdependence at g2 level.
- Remains visible after expansion: Yes.

**g3 environment:**
- What currently works: medium (17).
- What fails: easy (4 — dedup), hard (4 — dedup).
- New items: **+2 easy, +2 hard**.
- Concepts:
  - Easy: Basic identification of environment types (forest, desert, ocean); what plants and animals need to survive.
  - Hard: Food web concept; energy flow in ecosystems; human impact on biodiversity; conservation methods.
- Remains visible after expansion: Yes.

**g4 environment:**
- What currently works: medium (15), hard (9).
- What fails: easy (4 — dedup).
- New items: **+2 easy**.
- Concepts: Simple biome identification; basic pollution questions; introductory ecology concept.
- Remains visible after expansion: Yes.

**g5 environment:**
- What currently works: medium (10), hard (24).
- What fails: easy (3).
- New items: **+2 easy**.
- Concepts: Basic ecosystem vocabulary; introductory environmental issue identification.
- Remains visible after expansion: Yes.

**g6 environment:**
- What currently works: medium (10), hard (29).
- What fails: easy (4 — dedup risk).
- New items: **+2 easy** (buffer above 4 to prevent dedup failure).
- Concepts: Simple identification questions on environmental topics; global environment overview.
- Remains visible after expansion: Yes.

---

### 5.4 Science summary table: new items needed

| Grade | Topic | easy to add | medium to add | hard to add | Total |
|-------|-------|:-----------:|:-------------:|:-----------:|------:|
| g1 | materials | 0 | +4 | +4 | 8 |
| g1 | earth_space | 0 | +4 | +4 | 8 |
| g1 | environment | 0 | +4 | +4 | 8 |
| g2 | materials | 0 | 0 | +4 | 4 |
| g2 | earth_space | 0 | +2 | +4 | 6 |
| g2 | environment | 0 | +1 | +4 | 5 |
| g3 | materials | +2 | 0 | +2 | 4 |
| g3 | earth_space | +2 | 0 | +2 | 4 |
| g3 | environment | +2 | 0 | +2 | 4 |
| g4 | materials | +2 | 0 | 0 | 2 |
| g4 | earth_space | +2 | 0 | 0 | 2 |
| g4 | environment | +2 | 0 | 0 | 2 |
| g5 | materials | +3 | +2 | 0 | 5 |
| g5 | earth_space | +2 | 0 | 0 | 2 |
| g5 | environment | +2 | 0 | 0 | 2 |
| g6 | materials | +3 | +2 | 0 | 5 |
| g6 | earth_space | +2 | 0 | 0 | 2 |
| g6 | environment | +2 | 0 | 0 | 2 |
| **Total** | | **+26** | **+19** | **+30** | **75** |

**By topic:** materials 28 + earth_space 24 + environment 23 = **75**
**By grade:** g1 24 + g2 15 + g3 12 + g4 6 + g5 9 + g6 9 = **75**
**By difficulty:** easy 26 + medium 19 + hard 30 = **75**
**Row-by-row check:** 8+8+8+4+6+5+4+4+4+2+2+2+5+2+2+5+2+2 = 75 ✓

Note: No science rows cover multiple difficulties in a single item — every item is authored with a specific `minLevel` and `maxLevel` (e.g. `minLevel: "medium", maxLevel: "medium"` for a medium-only item).  Counts above are distinct bank rows.

---

## 6. Content Authoring Rules

### English rules

- **Keep questions short and age-appropriate.**  Maximum 2 lines of question text.  No reading passages.
- **Question language:** The question stem may be in English or Hebrew (matching existing pool style per pool file — inspect each pool before authoring).  Answer choices are always in English.
- **Hebrew instructions** may be used only if the existing items in the same pool already use Hebrew instructions (e.g. "בחר את התשובה הנכונה" is acceptable if the pool already uses it).
- **MCQ answers:** Exactly one clearly correct answer.  Distractor options must be plausible (same part of speech, same approximate meaning category) but unambiguously wrong to a student who knows the material.
- **No ambiguous grammar.**  Avoid sentences where multiple options could be argued correct by a native speaker — all test items must have a single defensible correct answer.
- **Translation questions must be deterministic and appropriate for the grade:**
  - g2–g3: Translate simple routine sentences (classroom, school, daily activities).
  - g4: Add community and hobby vocabulary.
  - g5–g6: Add technology and global topic vocabulary.
  - The Hebrew prompt must map to exactly one natural English answer (the correct option).  Avoid Hebrew sentences that have multiple valid English renderings unless the distinction between them is itself the teaching point.
- **Difficulty level assignment (grammar/sentences):**
  - easy: single clause, common vocabulary, present tense only.
  - medium: two-clause sentence, common irregular forms, connected text.
  - hard: embedded clauses, abstract or academic vocabulary, mixed tenses, exceptions to rules.
- **Difficulty level assignment (translation):**
  - easy: concrete, common vocabulary, simple present.
  - medium: multi-clause, one less-common word, present/past mix.
  - hard: abstract topic vocabulary, g5–g6 thematic vocabulary, complex sentence structure.
- **No duplicate fingerprints** (`question|correctAnswer`): verify before submitting new items.
- **Pool file placement:** Add to the appropriate pool file (`grammar-pools.js`, `sentence-pools.js`, `translation-pools.js`).  Items must include `minGrade`, `maxGrade`, `difficulty` (matching the pool file's existing schema), and pre-built `options[]`/`correct` fields.

### Science rules

- **Hebrew-first question text** consistent with existing `SCIENCE_QUESTIONS` items (inspect the existing bank items for language convention before authoring).
- **Age-appropriate concepts:**
  - g1: concrete, observable, single-step reasoning.
  - g2: slightly more abstract but still concrete examples; two-step reasoning allowed.
  - g3–g4: introduce classification and comparison.
  - g5–g6: introduce cause-effect chains, systems thinking at curriculum-appropriate depth.
- **One clearly correct answer.**  Do not author trick questions.
- **Avoid diagram-dependent questions** unless diagram support in the assigned-activity path is verified.  All g1–g2 items must be text-only.
- **Avoid long reading passages** for g1–g2.  Maximum 15 Hebrew words in stem for g1; 20 for g2.
- **Simple vocabulary for g1–g2:** Use words a grade-1 student reading at curriculum level would know.
- **Factual accuracy:** All science statements must be factually correct, aligned with Israeli Ministry of Education science curriculum at the relevant grade.  Verify against `data/science-curriculum.js` and book draft content in `docs/learning-book/science/g{n}/drafts/`.
- **Item schema:** Every new item must have: `id` (unique, e.g. `sci_g1_materials_med_001`), `topic`, `grades: [n]` (array with the exact grades applicable), `minLevel`, `maxLevel`, `type: "mcq"`, `stem`, `options: [4 strings]`, `correctIndex`, `explanation`.
- **Difficulty assignment:**
  - easy: identification, naming, simple yes/no classification.
  - medium: comparison, application ("which material is best for X because…"), one-step cause-effect.
  - hard: multi-step reasoning, ordering, embedded cause-effect chains, exception handling.

---

## 7. Data/Source Files to Inspect Before Implementation

### English files

| File | What to inspect |
|------|----------------|
| [`data/english-questions/grammar-pools.js`](../../data/english-questions/grammar-pools.js) | Pool item schema; difficulty field values; `minGrade`/`maxGrade` per pool key; `patternFamily` naming convention; existing MCQ item structure (`options[]`, `correct`) |
| [`data/english-questions/sentence-pools.js`](../../data/english-questions/sentence-pools.js) | Same as grammar-pools for sentence items; `template` vs direct `question` field difference |
| [`data/english-questions/translation-pools.js`](../../data/english-questions/translation-pools.js) | Pool key → grade mapping; `en`/`he` pair structure; `minGrade`/`maxGrade`; `difficulty` field; MCQ option shape for translation items |
| [`data/english-questions/index.js`](../../data/english-questions/index.js) | Export structure; confirms which arrays are merged and how the pools are imported |
| [`utils/english-question-generator.js`](../../utils/english-question-generator.js) | `GRADE_PROFILES` — pool keys per grade; `resolveEnglishQType()` — understand exactly when typing mode is selected so new items can avoid it; `ENGLISH_LEVELS` difficulty labels |
| [`utils/grade-gating.js`](../../utils/grade-gating.js) | `ENGLISH_TRANSLATION_POOL_RANGE` — confirm which pool keys are split between g5/g6; `englishPoolItemAllowedWithClassSplit()` — understand the split logic for g6 translation fix |
| [`lib/classroom-activities/generate-activity-questions-client.js`](../../lib/classroom-activities/generate-activity-questions-client.js) | `isEnglishNonMcqMode()` — exact conditions that reject items; `frozenEnglishItemFromGenerated()` — required item shape; dedup fingerprint logic |

### Science files

| File | What to inspect |
|------|----------------|
| [`data/science-questions.js`](../../data/science-questions.js) | Import list of batch files; concatenation order; confirm where to add the new batch import |
| [`data/science-questions-p0-g123-fill.js`](../../data/science-questions-p0-g123-fill.js) | Item schema for g1–g3 items; id naming conventions; array name convention |
| [`data/science-questions-p1-g456-fill.js`](../../data/science-questions-p1-g456-fill.js) | Item schema for g4–g6 items |
| [`data/science-curriculum.js`](../../data/science-curriculum.js) | Confirm `materials`, `earth_space`, `environment` are listed for each grade; topic key spelling |
| [`utils/science-grade-topic-policy.js`](../../utils/science-grade-topic-policy.js) | `SCIENCE_TOPIC_TO_REP_NORM` — confirm topic norm values for new item alignment |
| [`docs/learning-book/science/g1/drafts/materials.md`](../learning-book/science/g1/drafts/materials.md) | Pedagogical source for g1 materials concepts (repeat for g1 earth_space and g1 environment, and other failing grades) |
| [`scripts/science-pool-matrix.mjs`](../../scripts/science-pool-matrix.mjs) | Run after adding items to verify new counts |

### Assigned activity pipeline files (read before any change)

| File | What to inspect |
|------|----------------|
| [`lib/classroom-activities/assigned-activity-topic-options.js`](../../lib/classroom-activities/assigned-activity-topic-options.js) | Confirm no science/English topics are hidden; understand the filter function signature |
| [`lib/classroom-activities/classroom-activities-preview.js`](../../lib/classroom-activities/classroom-activities-preview.js) | Confirm English and science are in `ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS` |
| [`lib/teacher-portal/teacher-class-topic-options.js`](../../lib/teacher-portal/teacher-class-topic-options.js) | `scienceTopicOptionsForGrade()` and `englishTopicOptionsForGrade()` — confirm topic label consistency |

### Audit/test scripts

| File | Purpose |
|------|---------|
| [`scripts/audit-assigned-activity-topic-availability.mjs`](../../scripts/audit-assigned-activity-topic-availability.mjs) | Re-run after expansion to confirm all cells pass |
| [`scripts/science-pool-matrix.mjs`](../../scripts/science-pool-matrix.mjs) | Science bank count verification by grade/topic/level |
| [`scripts/question-bank-inventory-gate.mjs`](../../scripts/question-bank-inventory-gate.mjs) | English bank gate — should still pass after additions |
| [`tests/classroom-activities/generate-english-activity-questions.test.mjs`](../../tests/classroom-activities/generate-english-activity-questions.test.mjs) | Add new test cases here |

---

## 8. Implementation Phases

### Phase B1 — Audit script finalization and exact count confirmation

**Goal:** Produce authoritative before-expansion counts and confirm each failing cell's exact gap.

Tasks:
- Run `node scripts/audit-assigned-activity-topic-availability.mjs` and save output to a dated file for baseline comparison.
- Run `node scripts/science-pool-matrix.mjs` to confirm science counts per grade/topic/level.
- For English, run the audit script's English generation checks at count=5, all difficulties, grades g2–g6, topics grammar/sentences/translation.
- Record exact usable counts in a pre-expansion snapshot.
- Confirm the g6 translation pool-split behavior by inspecting `grade-gating.js` `ENGLISH_TRANSLATION_POOL_RANGE` and running a targeted probe: generate 200 g6 translation items and count how many pass the assigned filter at each difficulty.
- Output: confirmed gap table (may differ slightly from section 3 due to pool additions since last audit run).
- No production files changed in this phase.

Acceptance: Gap table matches or supersedes section 3 of this plan.

---

### Phase B2 — English content expansion

**Goal:** Add all missing English MCQ items; fix g6 translation pool wiring.

Tasks (in order):

B2.1 Grammar medium/hard expansion (g3–g6):
- Add ~55 new MCQ items to `data/english-questions/grammar-pools.js` across pool keys `present_simple`, `question_frames` (g3 hard), `progressive`, `quantifiers` (g4 medium/hard), `past_simple`, `modals`, `comparatives`, `future_forms` (g5 medium/hard), `complex_tenses`, `conditionals` (g6 medium/hard).
- Each item: `question` (string), `options: []` (4 strings), `correct` (string), `difficulty`, `minGrade`, `maxGrade`, `patternFamily` (new MCQ-specific family name to prevent typing mode fallback).

B2.2 Sentences medium/hard expansion (g3–g6):
- Add ~40 new MCQ items to `data/english-questions/sentence-pools.js` across pool keys `routine`, `descriptive` (g3 medium/hard), `descriptive`, `narrative` (g4 medium/hard), `narrative`, `advanced` (g5 medium/hard), `advanced` (g6 medium/hard).

B2.3 Translation dedup fix (g2–g5):
- Add ~50 new unique translation pairs to `data/english-questions/translation-pools.js` in pools `classroom`/`routines` (g2 hard), `routines`/`hobbies` (g3 all difficulties), `hobbies`/`community` (g4 all difficulties), `community`/`technology` (g5 all difficulties).
- Each new pair must have a unique `en` value not already present in the pool.

B2.4 g6 translation fix:
- Add 15 new g6-specific translation items: `minGrade: 6`, `maxGrade: 6`, 5 easy / 5 medium / 5 hard.
- Option A (preferred): Add to `translation-pools.js` in the existing `global` pool or a new `global_advanced` pool key, with explicit `minGrade: 6`, `maxGrade: 6`.
- Add the new pool key to `GRADE_PROFILES.g6.translationPools` in `utils/english-question-generator.js`.
- Register the new pool key in `ENGLISH_TRANSLATION_POOL_RANGE` in `utils/grade-gating.js` with `minGrade: 6, maxGrade: 6` (no class split since it is grade-exclusive).
- Verify: run targeted generation for g6 translation at easy/medium/hard × count=5 — all must pass.

B2.5 Add tests for Phase B2 (see section 9).

B2.6 Verify: run `node scripts/question-bank-inventory-gate.mjs` — must pass.  Run `node scripts/audit-assigned-activity-topic-availability.mjs` — all English grammar/sentences/translation rows must show `supported` at easy, medium, hard.

Acceptance: All English grammar/sentences/translation pairs pass audit at count=5 × easy/medium/hard.

---

### Phase B3 — Science content expansion

**Goal:** Add all missing science bank items for materials, earth_space, environment across g1–g6.

Tasks:

B3.1 Create new batch file `data/science-questions-phase-b.js`:
- Follow the naming and export conventions of `data/science-questions-p0-g123-fill.js`.
- Total ~75 new items (see §5.4 summary table).
- Group items by grade for readability; use id prefix `sci_phb_` followed by grade/topic/difficulty abbreviation.

B3.2 Import the new batch in `data/science-questions.js`:
- Follow the existing concatenation pattern (import array, spread into `SCIENCE_QUESTIONS`).

B3.3 Add tests for Phase B3 (see section 9).

B3.4 Verify: run `node scripts/science-pool-matrix.mjs` — all target cells must show ≥5.  Run `node scripts/audit-assigned-activity-topic-availability.mjs` — all 18 failing science pairs must show `supported`.

Acceptance: All science materials/earth_space/environment pairs pass audit at count=5 × easy/medium/hard.

---

### Phase B4 — Assigned activity validation (end-to-end)

**Goal:** Confirm preview, save, and child-play flows all work correctly with the new content.

Tasks:
- Parent assign flow: select each expanded topic/difficulty, preview, confirm question count = 5, save, open activity as student.
- Teacher class flow: same for a class assignment.
- Teacher per-student flow: same for a per-student assignment.
- Verify frozen `question_set` in the database matches what the child sees during play.
- Verify activity review/details shows the same 5 questions that were in the activity.
- Confirm no unrelated topics appear in the question list.
- Run B4 tests (see section 9).

---

### Phase B5 — Final QA and cleanup

**Goal:** Close the phase with a clean, verified state.

Tasks:
- Re-run `node scripts/audit-assigned-activity-topic-availability.mjs` — produce final audit report.
- Confirm no topic was accidentally hidden from the selector.
- Run full test suite: `npm test` or equivalent — all tests must pass.
- Run build: `npm run build` — must complete without error.
- Write final report listing: all items added by subject/grade/topic/difficulty, g6 translation fix details, remaining open owner decisions (from section 13).
- Archive final audit to `docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT_POST_PHASE_B.md`.

---

## 9. Testing Plan

All tests belong in `tests/classroom-activities/`.

### New test file: `generate-english-activity-questions-phase-b.test.mjs`

Test matrix (English):

| Test name | What it asserts |
|-----------|----------------|
| `english-grammar-g3-hard-count5` | Grammar g3 hard generates exactly 5 unique MCQ items |
| `english-grammar-g4-medium-count5` | Grammar g4 medium @5 |
| `english-grammar-g4-hard-count5` | Grammar g4 hard @5 |
| `english-grammar-g5-medium-count5` | Grammar g5 medium @5 |
| `english-grammar-g5-hard-count5` | Grammar g5 hard @5 |
| `english-grammar-g6-medium-count5` | Grammar g6 medium @5 |
| `english-grammar-g6-hard-count5` | Grammar g6 hard @5 |
| `english-sentences-g3-medium-count5` | Sentences g3 medium @5 |
| `english-sentences-g3-hard-count5` | Sentences g3 hard @5 |
| `english-sentences-g4-medium-count5` | Sentences g4 medium @5 |
| `english-sentences-g4-hard-count5` | Sentences g4 hard @5 |
| `english-sentences-g5-medium-count5` | Sentences g5 medium @5 |
| `english-sentences-g5-hard-count5` | Sentences g5 hard @5 |
| `english-sentences-g6-medium-count5` | Sentences g6 medium @5 |
| `english-sentences-g6-hard-count5` | Sentences g6 hard @5 |
| `english-translation-g2-hard-count5` | Translation g2 hard @5 |
| `english-translation-g3-easy-count5` | Translation g3 easy @5 (was dedup-failing) |
| `english-translation-g3-medium-count5` | Translation g3 medium @5 |
| `english-translation-g3-hard-count5` | Translation g3 hard @5 |
| `english-translation-g4-easy-count5` | Translation g4 easy @5 |
| `english-translation-g4-medium-count5` | Translation g4 medium @5 |
| `english-translation-g4-hard-count5` | Translation g4 hard @5 |
| `english-translation-g5-easy-count5` | Translation g5 easy @5 |
| `english-translation-g5-medium-count5` | Translation g5 medium @5 |
| `english-translation-g5-hard-count5` | Translation g5 hard @5 |
| `english-translation-g6-easy-count5` | Translation g6 easy @5 (was mapping-bug-failing) |
| `english-translation-g6-medium-count5` | Translation g6 medium @5 |
| `english-translation-g6-hard-count5` | Translation g6 hard @5 |
| `english-all-items-are-mcq` | All generated items have `answers[]` with ≥2 choices |
| `english-no-duplicate-fingerprints` | All 5 items in each activity have unique `question\|correctAnswer` fingerprint |
| `english-invalid-topic-throws` | `generateActivityQuestionSetClient` with topic `"invalid_xyz"` throws, not silently returns |
| `english-topic-fidelity-grammar` | All 5 items in a grammar activity have `topic === "grammar"` |
| `english-topic-fidelity-sentences` | Same for sentences |
| `english-topic-fidelity-translation` | Same for translation |

### New test file: `generate-science-activity-questions-phase-b.test.mjs`

Test matrix (Science):

| Test name | What it asserts |
|-----------|----------------|
| `science-materials-g1-medium-count5` | materials g1 medium @5 |
| `science-materials-g1-hard-count5` | materials g1 hard @5 |
| `science-earth_space-g1-medium-count5` | earth_space g1 medium @5 |
| `science-earth_space-g1-hard-count5` | earth_space g1 hard @5 |
| `science-environment-g1-medium-count5` | environment g1 medium @5 |
| `science-environment-g1-hard-count5` | environment g1 hard @5 |
| `science-materials-g2-hard-count5` | materials g2 hard @5 |
| `science-earth_space-g2-medium-count5` | earth_space g2 medium @5 |
| `science-earth_space-g2-hard-count5` | earth_space g2 hard @5 |
| `science-environment-g2-medium-count5` | environment g2 medium @5 |
| `science-environment-g2-hard-count5` | environment g2 hard @5 |
| `science-materials-g3-easy-count5` | materials g3 easy @5 (was dedup-failing) |
| `science-materials-g3-hard-count5` | materials g3 hard @5 |
| `science-earth_space-g3-easy-count5` | earth_space g3 easy @5 |
| `science-earth_space-g3-hard-count5` | earth_space g3 hard @5 |
| `science-environment-g3-easy-count5` | environment g3 easy @5 |
| `science-environment-g3-hard-count5` | environment g3 hard @5 |
| `science-materials-g4-easy-count5` | materials g4 easy @5 |
| `science-earth_space-g4-easy-count5` | earth_space g4 easy @5 |
| `science-environment-g4-easy-count5` | environment g4 easy @5 |
| `science-materials-g5-easy-count5` | materials g5 easy @5 |
| `science-materials-g5-medium-count5` | materials g5 medium @5 |
| `science-earth_space-g5-easy-count5` | earth_space g5 easy @5 |
| `science-environment-g5-easy-count5` | environment g5 easy @5 |
| `science-materials-g6-easy-count5` | materials g6 easy @5 |
| `science-materials-g6-medium-count5` | materials g6 medium @5 |
| `science-earth_space-g6-easy-count5` | earth_space g6 easy @5 |
| `science-environment-g6-easy-count5` | environment g6 easy @5 |
| `science-all-items-are-mcq` | All generated items have `type: "mcq"` |
| `science-no-duplicate-fingerprints` | No duplicate `stem\|correctIndex` or `stem\|options[correctIndex]` in same activity |
| `science-invalid-topic-throws` | Invalid topic throws |
| `science-topic-fidelity-materials` | All 5 items in materials activity have `topic === "materials"` |
| `science-topic-fidelity-earth_space` | Same for earth_space |
| `science-topic-fidelity-environment` | Same for environment |

### Extend `assigned-activity-topic-options.test.mjs`

Add assertions:
- Science `materials`, `earth_space`, `environment` remain visible for g1–g6 after expansion.
- English `grammar`, `sentences`, `translation` remain visible for g2–g6 after expansion.

### End-to-end / integration tests

Extend or add to `tests/e2e/helpers/`:
- `generate-english-activity-preview-phase-b.mjs` — verify preview returns 5 questions for grammar/sentences/translation at all difficulties.
- `generate-science-activity-preview-phase-b.mjs` — same for science.

### Test commands (add to `package.json` scripts if not present)

```
npm run test:english-activity         # generate-english-activity-questions*.test.mjs
npm run test:science-activity         # generate-science-activity-questions*.test.mjs
npm run test:assigned-topic-options   # assigned-activity-topic-options.test.mjs
npm run test:assigned-all             # all three of the above
```

---

## 10. Manual QA Checklist

Run this checklist after Phase B4 and before closing Phase B5.

### Parent assign flow

- [ ] Open `AssignActivityModal` as parent for a g1 student.
- [ ] Select Science → materials → easy → start activity.  Confirm 5 questions display.
- [ ] Select Science → materials → medium → start activity.  Confirm 5 questions display.
- [ ] Select Science → materials → hard → start activity.  Confirm 5 questions display.
- [ ] Repeat for earth_space and environment.
- [ ] Open modal for g2 student → repeat Science g2 cells that were failing.
- [ ] Select English → grammar → medium (g4).  Confirm 5 questions display.
- [ ] Select English → grammar → hard (g4).  Confirm 5 questions display.
- [ ] Select English → sentences → medium (g5).  Confirm 5 questions display.
- [ ] Select English → translation → hard (g2).  Confirm 5 questions display.
- [ ] Select English → translation → easy (g6).  Confirm 5 questions display.  **This was the mapping bug — verify fix.**

### Teacher class assign flow

- [ ] Open teacher class activity creation for a g1 class.
- [ ] Select Science → earth_space → hard.  Confirm preview shows 5 questions.
- [ ] Save the activity.  Confirm saved activity shows the same 5 questions.
- [ ] Open teacher class activity creation for a g6 class.
- [ ] Select English → translation → medium.  Confirm preview shows 5 questions (was totally broken).
- [ ] Save.  Confirm.

### Teacher per-student assign flow

- [ ] Open teacher per-student activity for a g3 student.
- [ ] Select English → sentences → medium.  Confirm 5 questions.
- [ ] Select Science → environment → easy (was dedup-failing @g3).  Confirm 5 questions.

### Child activity screen

- [ ] Child opens the saved activity.  Confirm the questions shown are identical to what was previewed.
- [ ] Complete the activity.  Confirm scoring is unchanged.
- [ ] Open review/details.  Confirm the same 5 questions appear in the review.

### Topic selector visibility

- [ ] Confirm English `grammar`, `sentences`, `translation` remain visible in assigned UI for g3–g6.
- [ ] Confirm English `writing` remains hidden for assigned activities (not part of this phase — verify no regression).
- [ ] Confirm Science `materials`, `earth_space`, `environment` remain visible for g1–g6.

### Science readability (g1/g2)

- [ ] Read each new g1 science question aloud.  Confirm it is understandable by a grade-1 Hebrew-speaking child.
- [ ] Confirm question stems are ≤15 Hebrew words for g1, ≤20 for g2.
- [ ] Confirm no question requires diagram interpretation for g1–g2.

### Device/screen

- [ ] Test on mobile (iOS or Android) for parent assign flow.
- [ ] Test on desktop browser for teacher assign flow.
- [ ] Confirm no layout break with the 5-question activity display.

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Adding too many questions too quickly — review quality drops | Bad UX from poor distractors or wrong answers | Implement in stages; content review of each batch before import; run audit after each stage |
| Bad distractors — students choose wrong answer for right reasons | Unfair assessments | All items reviewed by at least one person not the original author; distractor must differ meaningfully from correct answer |
| Duplicate questions in same activity | Poor experience; apparent bug | Dedup test `english-no-duplicate-fingerprints` / `science-no-duplicate-fingerprints` run before merge |
| Grade-inappropriate difficulty — g5 hard feels like g6, confusing g5 students | Drops engagement | Grade band review: each item tested by person familiar with the grade level; use existing pool items as style guides |
| Translation ambiguity — Hebrew sentence maps to two valid English translations | Student marked wrong for a correct answer | Only add translation pairs where the target English answer is the only natural one; have a native English speaker review g5–g6 items |
| Science factual ambiguity — question text could be read two ways | Incorrect answers accepted | Every science item must have exactly one factually correct answer; verify against Israeli curriculum source |
| Failing only at `hard` difficulty after expansion — medium and easy fixed but hard still empty | Partial success; audit still shows failures at hard | Run audit after each phase; address hard-difficulty items explicitly in B2 and B3 before declaring complete |
| count=5 vs count=3 mismatch — some owners test at count=3 and believe it passes | Missing real failures | All audit checks in this plan explicitly use count=5; all tests use count=5; document requirement |
| Accidentally hiding topics — a code path branches on topic name and new pool keys change routing | Regression | Run `assigned-activity-topic-options.test.mjs` after B2/B3; no topic keys are renamed in this phase |
| Unrelated fallback returning — a code change elsewhere introduces fallback | Silent wrong-topic questions | Topic-fidelity tests confirm every item carries the correct topic key; run after B4 |
| g6 translation pool wiring change breaks g5 — sharing a pool key across grades | g5 translation breaks | Use `minGrade: 6, maxGrade: 6` for new items so they never appear in g5; run g5 translation tests after B2.4 |
| New batch file not imported in `data/science-questions.js` | Zero new items visible | Import verification test; also confirmed by running `science-pool-matrix.mjs` immediately after Phase B3.2 |

---

## 12. Definition of Done

Phase B is complete only when **all** of the following are true:

- [ ] All English `grammar`, `sentences`, `translation` grade/topic pairs from section 4 generate count=5 at easy, medium, and hard in `generateActivityQuestionSetClient`.
- [ ] All Science `materials`, `earth_space`, `environment` grade/topic pairs from section 5 generate count=5 at easy, medium, and hard.
- [ ] `node scripts/audit-assigned-activity-topic-availability.mjs` shows 0 failing English/Science pairs for the in-scope topics.
- [ ] No unrelated topic questions appear in any generated activity (topic-fidelity tests pass).
- [ ] English `writing` remains hidden from assigned activities (no regression).
- [ ] No other previously-passing topics have regressed.
- [ ] All tests in `generate-english-activity-questions-phase-b.test.mjs` pass.
- [ ] All tests in `generate-science-activity-questions-phase-b.test.mjs` pass.
- [ ] All tests in `assigned-activity-topic-options.test.mjs` pass.
- [ ] Parent/teacher/student manual QA checklist (section 10) is completed and signed off.
- [ ] `npm run build` completes without error.
- [ ] Final audit report saved as `docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT_POST_PHASE_B.md`.
- [ ] Final implementation report lists: (a) every file modified, (b) total new items by subject/grade/topic/difficulty, (c) g6 translation fix description, (d) open owner decisions that remain outstanding.

---

## 13. Open Owner Decisions

The following decisions require product owner input before or during implementation.

| # | Decision | Options | Impact if deferred |
|---|----------|---------|-------------------|
| 1 | Should **all** topics support hard difficulty before launch, or is easy+medium sufficient for a first release? | (A) Require easy/medium/hard all pass before launch.  (B) Accept easy+medium as go-live threshold; hard deferred. | If (B): Phase B3 hard items for g1 can be deferred; hard for g1 science materials/earth_space/environment is ~12 items less work. |
| 2 | Should hard difficulty be hidden from the assigned-activity selector for lower grades (g1–g2) until the bank is deep enough? | (A) Hide hard for g1–g2 science temporarily.  (B) Expand and keep visible. | If (A): UX change required (hide logic in `assigned-activity-topic-options.js`); not just content.  If (B): follow Phase B3 plan. |
| 3 | Should some topics temporarily support easy+medium only with a visible label ("Hard not yet available" or similar)? | (A) Yes — add label/badge.  (B) No — fix all difficulties before showing selector. | If (A): Requires UI change; deferred to a UI sprint.  If (B): All difficulties must be bank-complete before launch. |
| 4 | Minimum bank depth threshold: should there be a hard rule (e.g. ≥8 items per cell instead of ≥5) to give dedup headroom? | (A) Keep ≥5 minimum.  (B) Set to ≥8 or ≥10 as a quality bar. | If (B): Some cells currently at ≥5 (marginal pass) would need additional items; adds ~20–30 extra items total. |
| 5 | English g6 translation pool wiring fix — which approach? | (A) Add `global_advanced` pool key (new pool, minimal code change).  (B) Fix the class-split logic in `grade-gating.js` to guarantee g6 gets enough items from existing `global` pool (code change in gating logic). | Approach A is safer but adds a new pool key.  Approach B fixes the root cause but changes gating logic that affects other grades. |
| 6 | Should the `mixed` topic for English (g3–g6) be kept, relabeled, or hidden for assigned activities? | (A) Keep as-is.  (B) Relabel to "תרגול מעורב".  (C) Hide from assigned UI. | This is tracked separately; noted here as a parallel open decision that affects the final assigned-activity topic selector. |
| 7 | Content authorship ownership: who authors the new questions (content team, AI-assisted, third party)? | Internal / external / AI-draft + human review | Affects timeline for Phase B2 and B3; must be decided before implementation begins. |

---

*End of Phase B plan. Do not implement without approval. All counts and file paths confirmed from live codebase read on 2026-06-03.*
