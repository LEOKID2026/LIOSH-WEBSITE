# SUBTOPIC DIAGNOSTIC LAYER — FINAL PLANNING SIGNOFF

**Document type:** Planning closure / implementation blueprint  
**Status: PLANNING COMPLETE — IMPLEMENTATION NOT APPROVED**  
**Consolidates:**
- `docs/subtopics/SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md`
- `docs/subtopics/SUBTOPIC_PHASE_0_COVERAGE_AUDIT.md`

**Date:** 2026-05-26  
**Prepared by:** Phase 0 discovery audit + architectural review

---

## 1. Executive Decision

### 1.1 What This Document Is

This is the final planning package for the Subtopic Diagnostic Layer project. It consolidates the Master
Plan (architecture, pedagogy, data model, subject-by-subject strategy) and the Phase 0 Coverage Audit
(actual question counts, metadata coverage, classroom activity wiring, and curriculum alignment) into a
single approved future blueprint.

### 1.2 What Is Not Approved Yet

**Implementation is NOT approved by this document.**

This document does not authorize:
- Creating new content-map JS files
- Tagging questions with subtopicId
- Modifying the diagnostic engine
- Changing parent reports or Parent Copilot
- Changing any UI
- Changing Hebrew copy or labels
- Running SQL migrations
- Changing the DB schema
- Committing or pushing any code changes

### 1.3 Authorization Model

Every future implementation phase defined in Section 4 requires a separate, explicit owner approval
before work begins. Approval for one phase does not imply approval for any subsequent phase.

This document is complete when the owner reviews Section 13 (Owner Decisions) and provides decisions on
each open item. Incomplete owner decisions are blocking for their respective phases.

---

## 2. Final Architecture Decision

### 2.1 Canonical Registry: `data/curriculum-spine/v1/skills.json`

**Decision: The curriculum spine is the canonical planning and analytics registry for subtopics.**

Evidence for this decision:
- Already contains 423 skills across all six subjects with a required `subtopic` field
- JSON schema (`schema.json`) enforces `additionalProperties: false` — no drift
- Has `gaps.json` and `conflicts.json` for automated integrity checks (both currently 0)
- Has `linked_skill_ids` for cross-referencing
- Is the only registry with complete cross-subject, cross-grade coverage
- Is a pure planning artifact with no runtime side effects

The spine is used for: question tagging, coverage auditing, Phase 1 status classification, and eventually
as the source of truth for diagnostic report labels.

### 2.2 Runtime Layer: Content-Map JS Files

**Decision: Content-map JS files remain the runtime and UX layer. They are NOT replaced by the spine.**

Current state: Hebrew content maps exist for all grades (`data/hebrew-g*-content-map.js`). No content
maps exist for Math, Geography, Geometry, English, or Science.

Content maps define: `weight` (pool selection probability), `order` (display order), `modesAllowed`
(which practice modes can use this subtopic), `flags` (grade/curriculum flags). These are runtime
rendering decisions that do not belong in a static JSON schema.

Relationship: Every subtopic ID defined in a content map must also appear as a spine `skill_id`. The
spine is the registry; the content map is the operator.

### 2.3 DB Schema: Deferred

**Decision: No new DB columns or tables are added during Phases A–D.**

The `classroom_activities` table already has `subtopic` and `skill_key` columns (migration 024). These
are sufficient for Phase D (classroom activity wiring). No additional migrations are needed until
Phase I (parent report integration), at which point a separate schema review and SQL migration must be
explicitly approved.

### 2.4 The Four Namespaces and Their Relationships

Four distinct identifier namespaces currently exist in the codebase. They are NOT interchangeable.
A bridge table is required before any cross-namespace query can work reliably.

```
Namespace A: Curriculum spine skill_id
  Format:   "hebrew:g1:reading:g1.phoneme_awareness"  (subject:grade:topic:subtopicId)
            "math:kind:add_two"
  Lives in: data/curriculum-spine/v1/skills.json
  Role:     Planning canonical; tagging; analytics; Phase 1 status

Namespace B: Runtime subtopicId
  Format:   "g1.phoneme_awareness"  (used in Hebrew content maps and inference utils)
  Lives in: data/hebrew-g*-content-map.js, utils/hebrew-g*-subtopic.js
  Role:     Pool narrowing at question-generation time; question params

Namespace C: Diagnostic taxonomy row ID
  Format:   "H-01", "M-04", "G-08", "S-03", "E-02", "MG-05"
  Lives in: utils/diagnostic-engine-v2/taxonomy-*.js
  Role:     Diagnostic conclusions; intervention recommendations

Namespace D: Official curriculum audit section key
  Format:   "g1_decoding", "g3_grammar_morphology", "g1_add_sub_facts"
  Lives in: utils/curriculum-audit/*-official-subsection-catalog.js
  Role:     MoE alignment audit; planning verification only
```

**Spine to runtime bridge (Namespace A → B):** Already exists for Hebrew (spine rows link to content-map
IDs). Must be built for Math, Geography, Geometry.

**Runtime to diagnostic bridge (Namespace B → C):** Does NOT exist for any subject. This is the
"subtopic-taxonomy bridge" — the single highest-priority missing component. Must be built in Phase C
(Hebrew) and extended in later phases.

**Spine to audit bridge (Namespace A → D):** Partial mappings exist in content description fields.
A formal bridge table is a Phase A deliverable (planning only, not code).

---

## 3. Final Subject Readiness Matrix

### 3.1 Hebrew

| Dimension | Status |
|-----------|--------|
| Current state | Content maps complete (88 subtopics, g1–g6); inference utils complete; spine has 135 entries aligned with content maps |
| What exists | `data/hebrew-g*-content-map.js` (all 6 grades); `utils/hebrew-g*-subtopic.js` (all grades); `data/curriculum-spine/v1/skills.json` (135 Hebrew entries) |
| What is missing | (1) Subtopic → taxonomy row bridge; (2) Live question pool is thin — only g3.multi_sentence meets N_MIN on all levels; (3) Hebrew display labels (`labelHe`) for teacher/parent exposure not approved; (4) Archive bank (1,080 questions) not wired to live generator |
| Approved for future implementation | YES — Phase C (diagnostic bridge pilot) and archive bank backfill |
| Must happen before implementation | Owner approves Hebrew subtopic display labels; bridge design reviewed; N_MIN regression gate defined |
| Must NOT happen yet | No Hebrew subtopic IDs may appear in parent reports; no Hebrew copy changes; no UI changes; no live-pool changes that alter existing report behavior |

### 3.2 Math

| Dimension | Status |
|-----------|--------|
| Current state | 91 generator kinds documented in curriculum spine; procedural generator covers all kinds with unlimited questions; no content-map files exist |
| What exists | `utils/math-question-generator.js` (~115 distinct kind variants); `utils/math-constants.js` (GRADES × operations); `data/curriculum-spine/v1/skills.json` (91 math entries); `utils/diagnostic-engine-v2/taxonomy-math.js` (10 taxonomy rows M-01–M-10) |
| What is missing | (1) `data/math-g*-content-map.js` files (the Phase B deliverable); (2) Teacher-facing grouping of 91 kinds into ~20 subtopics (Section 6 of this document proposes a plan); (3) Hebrew display labels for each group; (4) Subtopic → taxonomy bridge for math |
| Approved for future implementation | YES — Phase B (math content-map creation only) |
| Must happen before implementation | Owner approves Math subtopic groupings from Section 6; owner approves Hebrew display labels for teacher-facing groups; classroom activity wiring decision made (Phase D) |
| Must NOT happen yet | No changes to math question generator; no changes to diagnostic engine; no parent-facing math subtopic output |

### 3.3 Geometry

| Dimension | Status |
|-----------|--------|
| Current state | 38 skills in curriculum spine; procedural generator + 48-item conceptual bank; 8 taxonomy rows (G-01–G-08); strong patternFamily coverage on conceptual bank (100%) |
| What exists | `utils/geometry-question-generator.js`; `utils/geometry-conceptual-bank.js` (48 items, 31/48 with diagnosticSkillId); `data/curriculum-spine/v1/skills.json` (38 geometry entries) |
| What is missing | (1) Content-map files; (2) Resolution of 38-entry vs 8-taxonomy-row gap (fragmentation risk); (3) 17 conceptual bank items missing diagnosticSkillId; (4) Explicit owner approval to re-open geometry QA |
| Approved for future implementation | Planning only (Phase F) — full implementation BLOCKED until QA re-opening is explicitly approved |
| Must happen before implementation | Owner explicitly approves geometry QA reopening; consolidation plan for 38 → ~10 parent-facing geometry subtopics; diagnosticSkillId gap on conceptual bank must be closed |
| Must NOT happen yet | No geometry subtopics added to any user-facing surface; geometry QA must not be reopened without a dedicated approval decision |

### 3.4 English

| Dimension | Status |
|-----------|--------|
| Current state | 584 static pool rows (grammar 178, sentences 229, translation 177) + ~722 vocabulary lemmas; patternFamily 100%; diagnosticSkillId only 4/584 (~0.7%); reading bank = 0 questions |
| What exists | `data/english-questions/grammar-pools.js`, `sentence-pools.js`, `translation-pools.js`, `word-lists.js`; `utils/english-question-generator.js`; spine has 81 entries |
| What is missing | (1) English reading question bank (zero questions); (2) Grammar medium/hard pools (only 80 standard + 48 advanced rows across ALL grades); (3) diagnosticSkillId on grammar/sentence/translation pools; (4) Curriculum-aligned Hebrew labels for grammar subtopics; (5) Reading subtopic design |
| Approved for future implementation | NO — Phase G (question bank expansion) must precede Phase 1 for English |
| Must happen before implementation | Reading bank built to N_MIN; grammar difficulty skew corrected; diagnosticSkillId added to pools; owner review of grammar subtopic names |
| Must NOT happen yet | No English subtopics added to catalog, teacher assignment, or any report |

### 3.5 Science

| Dimension | Status |
|-----------|--------|
| Current state | ~1,618 merged questions (11 source files); 7 topics; NO grade-specific question separation; patternFamily ~100%; diagnosticSkillId ~35–40%; spine has 7 placeholder entries (`subtopic: "question_bank"`) |
| What exists | `data/science-questions.js` + 10 satellite files; `data/science-curriculum.js`; `utils/diagnostic-engine-v2/taxonomy-science.js` (8 rows); per-topic counts: body=338, animals=296, experiments=264, earth_space=198, environment=195, materials=176, plants=120 |
| What is missing | (1) Grade-specific question separation (each item has `grades[]` array, not single-grade); (2) Subtopic-level question depth — each proposed subtopic at grade level has ~5–8 questions vs N_MIN of 24–36; (3) Production augment (675 questions) uses generic `sci_pb1_auto_*` patterns not suitable for diagnosis; (4) Content-map files |
| Approved for future implementation | NO — Phase H (question bank expansion) must precede any Science Phase 1 |
| Must happen before implementation | ~3× question bank expansion with grade-specific tagging; production augment questions must be excluded from diagnostic scoring; subtopic design must be MoE-reviewed per grade |
| Must NOT happen yet | No science subtopics in catalog, teacher assignment, or reports; production augment must not drive diagnostic conclusions |

### 3.6 Geography (Moledet)

| Dimension | Status |
|-----------|--------|
| Current state | 3,506 questions across 6 grades (best-stocked non-procedural bank); ~90–112 questions per grade×topic cell; ~30 per difficulty band; skillId 100%; patternFamily = 0%; diagnosticSkillId = 0% |
| What exists | `data/geography-questions/g1.js`–`g6.js`; `data/moledet-geography-curriculum.js`; `utils/moledet-geography-constants.js`; spine has 71 entries; taxonomy has 8 rows (MG-01–MG-08) |
| What is missing | (1) patternFamily on all 3,506 questions (diagnostic trigger impossible without this); (2) diagnosticSkillId on all questions; (3) Content-map files; (4) Sub-topic definitions within each of 6 topics; (5) Curriculum alignment review for subtopic grain |
| Approved for future implementation | YES — Phase E (metadata pass and catalog), after Phase B (Math) establishes the content-map pattern |
| Must happen before implementation | patternFamily metadata pass completed; owner reviews proposed geography subtopic names and Hebrew labels; curriculum alignment for subtopic grain confirmed |
| Must NOT happen yet | No geography subtopics surfaced in reports or teacher assignment UI until metadata pass is complete |

---

## 4. Final Phased Roadmap

All phases are **NOT STARTED**. No phase may begin without a separate explicit owner approval.

---

### Phase A — Planning Closure and Owner Signoff

**Status: IN PROGRESS (this document)**

**Goal:** Complete all planning documentation; get owner decisions on Section 13 items; formally close
the planning phase before any implementation begins.

**Allowed scope:**
- Documentation updates only
- Owner decision collection
- Namespace bridge mapping (paper/markdown only, no code)

**Forbidden scope:** Any code, SQL, UI, Hebrew copy changes.

**Files involved:** `docs/subtopics/*.md` only

**Exit criteria:**
- Owner has reviewed and signed off on Section 13 decisions
- Subject prioritization is confirmed
- Math subtopic groupings (Section 6) are approved or amended
- Hebrew display label review is scheduled

---

### Phase B — Math Content-Map and Subtopic Grouping

**Status: NOT STARTED — requires Phase A completion and owner approval**

**Goal:** Create `data/math-g*-content-map.js` files (one per grade, g1–g6) that group the 91 generator
kinds into ~20 teacher-facing subtopics. Wire pool-narrowing functions for math.

**Allowed scope:**
- Create `data/math-g1-content-map.js` through `data/math-g6-content-map.js`
- Create `utils/math-g*-subtopic.js` pool-narrowing utilities
- Update `data/curriculum-spine/v1/skills.json` `linked_skill_ids` to reference new content-map subtopics
- Internal QA script to validate coverage

**Forbidden scope:**
- No changes to math question generator
- No changes to diagnostic engine
- No parent-facing math subtopics in any report or Copilot
- No classroom activity UI changes (that is Phase D)
- No Hebrew copy changes

**Files likely involved:**
- `data/math-g[1-6]-content-map.js` (create)
- `utils/math-subtopic.js` or per-grade files (create)
- `data/curriculum-spine/v1/skills.json` (update `linked_skill_ids`)
- `scripts/qa-math-subtopic-coverage.mjs` (create for validation)

**Tests/gates required:**
- Each grade's content map covers all operations allowed for that grade
- No kind appears in more than one subtopic group
- Every kind used by generator is mapped (orphan check)
- Coverage script passes for all 6 grades

**Owner approval required before starting:** YES
- Math subtopic groupings from Section 6 of this document must be approved
- Hebrew display labels for teacher-facing groups must be approved
- Decision on which kinds are `engine_internal_only` (not exposed to teacher UI) confirmed

**Exit criteria:**
- All 6 grade content maps created and passing QA script
- Pool-narrowing functions tested in local environment
- Spine updated with links
- Classroom activity wiring (Phase D) is next — it CANNOT be done without Phase B completing first

---

### Phase C — Hebrew Diagnostic Bridge Pilot

**Status: NOT STARTED — requires Phase A completion and owner approval**

**Goal:** Build the subtopicId → taxonomy row bridge for Hebrew. Pilot with g3 (the only grade where
g3.multi_sentence already meets full N_MIN). Do NOT surface subtopics in parent reports yet.

**Allowed scope:**
- Create `utils/subtopic-taxonomy-bridge.js` (bridge mapping Hebrew subtopicId → H-0* row ID)
- Add bridge lookup to diagnostic engine for Hebrew only
- Internal diagnostic logging only — no UI output
- Validate bridge against existing diagnostic tests

**Forbidden scope:**
- No parent report changes
- No Copilot changes
- No teacher UI changes
- No Hebrew label changes
- No new Hebrew subtopicIds added (use existing 88 only)

**Files likely involved:**
- `utils/subtopic-taxonomy-bridge.js` (create)
- `utils/diagnostic-engine-v2/diagnostic-engine-v2.js` (add bridge lookup, Hebrew-only, internal)
- Existing diagnostic tests

**Tests/gates required:**
- Bridge correctly maps all 88 content-map subtopicIds to at least one taxonomy row (or `null` if no row)
- Existing diagnostic engine tests all pass unchanged
- No subtopicId appears in any parent-facing API response (grep check)
- `validateParentReportAIText()` test suite passes

**Owner approval required before starting:** YES
- Hebrew diagnostic bridge design must be reviewed
- Confirmation that subtopicId will NOT appear in parent text until Phase I gate

**Exit criteria:**
- Bridge file created and tested
- Engine lookup wired for Hebrew only
- No regression on existing diagnostic outputs
- No parent-facing output changed

---

### Phase D — Classroom Activity Subtopic Wiring

**Status: NOT STARTED — requires Phase B completion and owner approval**

**Goal:** Wire the teacher's `subtopic` choice in classroom activity creation so that question generation
actually filters by subtopic. Fix the gap in `generate-activity-questions-client.js`.

**Allowed scope:**
- Modify `lib/classroom-activities/generate-activity-questions-client.js` to accept and use `subtopic`
- Call Hebrew pool-narrowing functions when subtopic is provided and subject is Hebrew
- Call Math pool-narrowing functions when subtopic is provided and subject is Math (requires Phase B)
- Define fallback rules (Section 8 of this document)
- Internal validation of subtopic against content-map catalog

**Forbidden scope:**
- No teacher UI changes (free-text input remains; dropdown is a future Phase)
- No new DB columns
- No parent report changes
- No Copilot changes
- Must not break any existing classroom activity that has `subtopic: null`

**Files likely involved:**
- `lib/classroom-activities/generate-activity-questions-client.js`
- `lib/teacher-server/teacher-activities.server.js`
- `utils/hebrew-g*-subtopic.js` (already exists, wire it)
- `utils/math-subtopic.js` (created in Phase B, wire it)

**Tests/gates required:**
- Null subtopic → identical behavior to current (no regression)
- Invalid subtopic → falls back to topic-level behavior
- Unsupported subject → current behavior unchanged
- Pool too small after narrowing → widen to topic level
- Existing classroom activity integration tests pass

**Owner approval required before starting:** YES
- Phase B must be complete (math content maps) 
- Fallback rules (Section 8) must be approved

**Exit criteria:**
- Subtopic wiring works for Hebrew and Math
- All fallback rules tested
- No change in behavior for existing activities with null subtopic
- Integration tests pass

---

### Phase E — Geography Metadata Pass and Catalog

**Status: NOT STARTED — requires Phase B complete (as pattern reference) and owner approval**

**Goal:** Add `patternFamily` and `diagnosticSkillId` to all 3,506 geography questions. Create geography
content-map files. Define geography subtopics (2–3 per topic per grade).

**Allowed scope:**
- Metadata pass on `data/geography-questions/g*.js` (add patternFamily, diagnosticSkillId)
- Create `data/geography-g*-content-map.js`
- Create `utils/geography-subtopic.js` pool-narrowing functions
- Curriculum alignment check against `moledet-geography-official-subsection-catalog.js`

**Forbidden scope:**
- No teacher UI changes
- No parent report changes
- No changes to existing `skillId` values (backward compatibility)
- Proposed subtopic IDs must not conflict with existing `skillId` values

**Tests/gates required:**
- All 3,506 geography questions have patternFamily after pass
- No existing `skillId` broken
- Content map coverage check passes for all 36 grade×topic cells
- MoE alignment reviewed per proposed subtopic

**Owner approval required before starting:** YES
- Owner reviews proposed geography subtopic names and Hebrew labels
- Metadata pass approach reviewed (automated vs manual)

**Exit criteria:**
- Metadata pass complete and reviewed
- Content maps created
- Geography subtopics available for teacher assignment (Phase D extension)

---

### Phase F — Geometry Subtopic Planning (QA Reopening Explicitly Required)

**Status: NOT STARTED — BLOCKED on explicit geometry QA reopening approval**

**Goal:** Plan and implement geometry subtopic grouping, reducing 38 spine entries to ~10 teacher-facing
subtopics. Close the 17-item diagnosticSkillId gap in the conceptual bank.

**IMPORTANT:** Geometry QA was previously declared closed. This phase cannot begin without an
explicit owner decision to reopen geometry QA. This is not implied by any other approval.

**Allowed scope (after QA reopening approved):**
- Create geometry content-map files
- Add diagnosticSkillId to 17 conceptual bank items missing it
- Create geometry subtopic bridge to taxonomy rows G-01–G-08
- Update spine with linked_skill_ids

**Forbidden scope:**
- No geometry subtopics in parent reports without a dedicated parent-report gate
- No UI changes
- Fragmentation: geometry subtopics must stay at ~10 parent-facing groups, not 38

**Tests/gates required:**
- Geometry QA reopening explicitly approved
- All 17 conceptual bank items tagged
- No regression on existing geometry diagnostic outputs

**Owner approval required before starting:** YES — explicit geometry QA reopening, separate from all
other approvals.

**Exit criteria:** Geometry content maps complete; bridge to taxonomy; existing geometry tests pass.

---

### Phase G — English Question Bank Expansion

**Status: NOT STARTED — prerequisite phase, must happen before English Phase 1**

**Goal:** Expand English question banks to meet N_MIN for subtopic use. Specifically:
1. Build English reading question bank (currently 0 questions)
2. Expand grammar medium/hard pools (currently only 80 standard + 48 advanced across all grades)
3. Add diagnosticSkillId to all existing grammar/sentence/translation pool rows

**Allowed scope:**
- Add questions to `data/english-questions/` files
- Add diagnosticSkillId to existing pool rows
- Design reading subtopic structure and create initial bank

**Forbidden scope:**
- No English subtopics in teacher UI or reports until pool counts meet N_MIN
- No English subtopic catalog created until reading bank is ready

**Gate:** N_MIN (g3–g4: 10 medium + 10 hard per subtopic; g5–g6: 8 medium + 8 hard) for each English
subtopic before it is added to the catalog.

**Owner approval required:** YES — bank expansion approach (AI-generated vs manually authored)

---

### Phase H — Science Question Bank Expansion

**Status: NOT STARTED — prerequisite phase, must happen before Science Phase 1**

**Goal:** Expand science question banks to meet N_MIN for subtopic use. Science requires the most
significant expansion of any subject.

**Specific requirements:**
- Grade-specific question tagging (each question must declare single grade, not grades[])
- subtopicId added to questions once subtopics are designed
- Production augment questions (`sci_pb1_auto_*`) excluded from diagnostic scoring
- diagnosticSkillId added to all production augment questions or they are excluded from diagnosis
- plants g4–g6 must NOT be created (not in MoE curriculum)

**Estimated scale:** To support 4 subtopics per topic per grade for g3–g4 at N_MIN (10 per level), science
needs ~10 × 4 subtopics × 4 grades × 30 questions = ~4,800 subtopic-tagged questions. Current bank has
~1,618, most not grade-specific or subtopic-tagged.

**Owner approval required:** YES — bank expansion method, budget, and timeline must be decided before
any science subtopic design begins.

---

### Phase I — Parent Report and Copilot Subtopic Support

**Status: NOT STARTED — requires Phases B, C, D complete; separate owner approval for each subject**

**Goal:** Surface subtopic insights in parent-facing reports and Parent Copilot, subject by subject,
starting with Hebrew, then Math.

**See Section 9 for full parent report planning rules.**

**Allowed scope:**
- Add subtopic-level insights to parent detailed report (max 2 per subject per report)
- Add subtopic context to Parent Copilot truth packet
- Only for subjects where READY_FOR_PARENT_REPORT status is confirmed

**Forbidden scope:**
- Raw subtopicId IDs must NEVER appear in parent text
- No subtopic output before N_MIN + diagnostic evidence + approved Hebrew labels are all confirmed
- No parent-facing output until `validateParentReportAIText()` regression passes

**Gate:** Thin-data suppression must be confirmed working before any parent-facing subtopic output is
enabled. See Section 11 (QA gates).

---

### Phase J — Student and Parent Practice by Subtopic

**Status: NOT STARTED — requires Phase I complete**

**Goal:** Allow students to practice by specific subtopic from the student practice UI. Allow parents
to request "practice this subtopic" from the parent portal.

**See Section 10 for full student/parent practice planning rules.**

---

### Phase K — Full QA and Release Gate

**Status: NOT STARTED — all preceding phases must complete**

**Goal:** Final launch-readiness validation before the Subtopic Diagnostic Layer is considered
production-complete.

**See Section 11 for full QA gate checklist.**

---

## 5. Final Deferred Items

The following items are explicitly NOT approved for any near-term implementation. They are deferred
until their stated prerequisite phases complete.

| Deferred item | Blocked by | Earliest phase |
|---------------|-----------|---------------|
| Science subtopics (any level) | Phase H (bank expansion) | Phase H+ |
| English reading subtopics | Phase G (reading bank creation) | Phase G+ |
| English grammar diagnostic subtopics | Phase G (medium/hard expansion) | Phase G+ |
| Geometry diagnostic subtopics | Phase F (explicit QA reopening approval) | Phase F+ |
| Parent report subtopic output (any subject) | Phase I gate + N_MIN + approved labels | Phase I+ |
| Parent Copilot subtopic output | Phase I complete | Phase I+ |
| DB schema changes beyond existing columns | Phase I or later; separate SQL review | Phase I+ |
| Hebrew display label changes (any labelHe) | Owner approval + Phase A signoff | After Phase A |
| Teacher UI dropdown for subtopics | After Phase D wiring proves correct | After Phase D |
| Student subtopic-specific practice mode | Phase J | Phase J+ |
| Production augment science questions driving diagnosis | Never, until metadata is audited and approved | Requires explicit re-approval |

---

## 6. Math Subtopic Grouping — Planning Proposal

This section proposes how to group the 91 generator kinds into teacher-facing subtopics. This is a
planning proposal only. Owner must approve or amend before Phase B begins. Hebrew display labels are
NOT included — they require separate owner review.

### 6.1 Proposed Teacher-Facing Groups

**Group 1: Addition and Subtraction** `[teacher_facing]`

Kinds included: `add_two`, `sub_two`, `add_tens_only`, `add_second_decade`, `add_three`, `add_vertical`,
`sub_vertical`, `ns_complement10`, `ns_complement100`

Grade band: g1–g6 (all grades have some variation)  
Diagnostic row: M-02 (carry errors), M-05 (takeoff errors), M-09 (complement confusion)  
Note: `add_second_decade` and `add_tens_only` are sub-variants of addition; they should NOT be
exposed as separate teacher subtopics — they are engine-internal complexity controls.

**Group 2: Number Sense and Place Value** `[teacher_facing]`

Kinds included: `cmp`, `ns_neighbors`, `ns_place_tens_units`, `ns_place_hundreds`, `ns_even_odd`,
`ns_number_line`  
Grade band: g1–g4 (foundational; g5–g6 have place value via decimals)  
Diagnostic row: M-01 (representation), M-06 (rounding/comparison)  
Note: `ns_counting_forward`, `ns_counting_backward` → ENGINE_INTERNAL_ONLY (sub-skills of number sense,
not useful as standalone teacher assignment topics)

**Group 3: Multiplication** `[teacher_facing]`

Kinds included: `mul`, `mul_tens`, `mul_hundreds`, `mul_vertical`  
Grade band: g1–g6 (grows in complexity)  
Diagnostic row: M-03 (multiplication facts)  
Note: `zero_mul`, `one_mul` → ENGINE_INTERNAL_ONLY (identity property drills, not a practice topic)

**Group 4: Division** `[teacher_facing]`

Kinds included: `div`, `div_long`, `div_two_digit`, `div_with_remainder`  
Grade band: g2–g6  
Diagnostic row: M-10 (inverse confusion)

**Group 5: Fractions** `[teacher_facing]`

Kinds included: `frac_half`, `frac_half_reverse`, `frac_quarter`, `frac_quarter_reverse`, `frac_to_mixed`,
`mixed_to_frac`, `frac_expand`, `frac_reduce`, `frac_add_sub`, `frac_as_division`, `frac_multiply`,
`frac_divide`  
Grade band: g2–g6 (grows significantly)  
Diagnostic row: M-04 (part-whole), plus fractions probe families  
Note: The 5 diagnostic probe kinds (`frac_probe_*`) → ENGINE_INTERNAL_ONLY; they are session-driven
diagnostic instruments, not teacher assignment topics.

**Group 6: Equations and Missing Numbers** `[teacher_facing]`

Kinds included: `eq_add_simple`, `eq_sub_simple`, `eq_add`, `eq_sub`, `eq_mul`, `eq_div`  
Grade band: g1–g6  
Diagnostic row: M-02, M-09 (missing addend connects to complement)  
Note: This is the "missing number / open sentence" category that teachers use most for homework.

**Group 7: Order of Operations** `[teacher_facing]`

Kinds included: `order_add_mul`, `order_mul_sub`, `order_parentheses`  
Grade band: g3 only  
Diagnostic row: M-05  
Note: Small group; may be folded into "Multiplication" at teacher-facing level pending owner decision.

**Group 8: Decimals** `[teacher_facing]`

Kinds included: `dec_add`, `dec_sub`, `dec_multiply`, `dec_divide`, `dec_multiply_10_100`,
`dec_divide_10_100`, `dec_repeating`, `round`  
Grade band: g3–g6  
Diagnostic row: M-06

**Group 9: Word Problems** `[teacher_facing]`

Kinds included: All `wp_*` kinds (22 semantic variants: `wp_coins`, `wp_time_date`, `wp_time_days`,
`wp_groups_g2`, `wp_division_simple`, `wp_coins_spent`, `wp_comparison_more`, `wp_leftover`,
`wp_time_sum`, `wp_multi_step`, `wp_distance_time`, `wp_shop_discount`, `wp_unit_cm_to_m`,
`wp_unit_g_to_kg`)  
Grade band: g1–g6  
Diagnostic row: M-07 (units), M-08 (multi-step)  
Note: Word problems are a single teacher-facing group. The 22 `semanticFamily` values are
ENGINE_INTERNAL routing, not sub-subtopics. Owner decision needed on whether to expose a
"real-world problems" vs "pure computation" split or keep as one group.

**Group 10: Percentages** `[teacher_facing]`

Kinds included: `perc_part_of`, `perc_discount`  
Grade band: g5–g6  
Diagnostic row: M-04 (part-whole, extends to percent)

**Group 11: Ratio and Scale** `[teacher_facing]`

Kinds included: `ratio_find`, `ratio_first`, `ratio_second`, `scale_find`, `scale_map_to_real`,
`scale_real_to_map`  
Grade band: g6 only  
Diagnostic row: None in current taxonomy → NEEDS_CURRICULUM_REVIEW for diagnostic use

**Group 12: Number Theory (Divisibility, Factors, Primes)** `[teacher_facing]`

Kinds included: `divisibility`, `prime_composite`, `fm_factor`, `fm_gcd`, `fm_multiple`, `div_with_remainder`  
Grade band: g2–g6 (grows)  
Diagnostic row: M-10  
Note: `div_with_remainder` appears here AND in Group 4 (Division). Owner decision needed on placement.

**Group 13: Estimation** `[parent_facing_candidate]`

Kinds included: `est_add`, `est_mul`, `est_quantity`  
Grade band: g4–g5  
Diagnostic row: None → parent-facing only as positive skill, not failure diagnosis

**Group 14: Sequences and Patterns** `[needs_owner_review]`

Kinds included: `sequence` (4 seq_* kinds)  
Grade band: g3–g6  
Diagnostic row: None  
Note: Patterns/sequences is in MoE curriculum but has no diagnostic taxonomy row. May be
`engine_internal_only` until a taxonomy row is designed.

**Group 15: Powers** `[engine_internal_only]`

Kinds included: `power_base`, `power_calc`  
Grade band: g4 only  
Rationale: Highly specialized, used by only a small fraction of g4 students. Not worth teacher-facing
exposure as a standalone subtopic. Included as part of "Number Theory" if needed.

**Group 16: Identity Properties (Zero / One)** `[engine_internal_only]`

Kinds included: `zero_add`, `zero_sub`, `zero_mul`, `one_mul`, `order_add_mul` (zero/one path)  
Grade band: g4  
Rationale: These are drill-focused and conceptually embedded in other operations. Should not appear
as a distinct teacher-assignable subtopic. The diagnostic engine can note identity property errors
internally via M-01.

### 6.2 Anti-Fragmentation Rules for Math

- Maximum 10–12 teacher-facing math subtopics per grade (not 91)
- `semanticFamily` values within word problems are NOT separate subtopics
- Probe kinds (`frac_probe_*`, `math_probe_*`) are NEVER teacher-facing
- The 5 diagnostic probe kinds fire automatically from the engine — they are not in any content map
- A kind is `engine_internal_only` if: (a) it represents a sub-variant of another kind, (b) a teacher
  cannot meaningfully distinguish it from its parent group, or (c) it has fewer than 2 other kinds in
  the same grade band

### 6.3 Owner Review Decisions Needed for Math Grouping

1. Should "Word Problems" be one group or split (e.g. "Money and Measurement" vs "Logic Problems")?
2. Should `div_with_remainder` belong to "Division" or "Number Theory"?
3. Should `order_of_operations` (g3 only) be its own group or fold into "Multiplication"?
4. Should "Sequences and Patterns" be teacher-facing or engine-internal?
5. Should "Ratio and Scale" (g6 only) be distinct from "Percentages" at teacher level?

---

## 7. Hebrew Diagnostic Bridge — Planning Details

### 7.1 Current Hebrew Subtopic State

Hebrew is architecturally the most complete subject. What exists:
- 88 subtopicIds defined in content maps (g1–g6, all 6 topics)
- Inference functions for all grades assign subtopicId from question stem text
- Curriculum spine has 135 aligned entries
- `data/hebrew-g3-reading-bank.js` (46 questions, all with patternFamily — the best-tagged Hebrew bank)
- Only g3.multi_sentence meets full N_MIN on all difficulty levels in the live pool

### 7.2 What Is Missing: The Bridge

The diagnostic engine (`utils/diagnostic-engine-v2/`) has zero references to subtopicId. Taxonomy rows
H-01 through H-08 fire based on `patternFamily` accumulation — they have no concept of subtopicId.

The bridge must answer: "If a student's errors cluster in subtopic X, which taxonomy row should fire?"

This is a many-to-one relationship: multiple subtopicIds may map to the same taxonomy row, and one
subtopicId may contribute evidence to multiple rows.

### 7.3 Bridge Design (Phase C deliverable, do not implement now)

The bridge file (`utils/subtopic-taxonomy-bridge.js`) will contain:

```javascript
// Structure (do not implement — planning only)
// subtopicId → list of relevant taxonomy row IDs
export const HEBREW_SUBTOPIC_TO_TAXONOMY = {
  "g1.phoneme_awareness": ["H-01", "H-02"],
  "g1.letters":           ["H-01"],
  "g2.pos_basic":         ["H-06"],
  "g3.binyan_light":      ["H-07", "H-08"],
  // ... all 88 subtopics mapped
};
```

### 7.4 Safety Rules for Hebrew Subtopic Exposure

Hebrew subtopics must NOT appear in parent reports until ALL of the following are confirmed:
1. Bridge is tested and stable (Phase C exit criteria met)
2. Minimum evidence gate: at least 3 sessions with subtopic-tagged questions, and N_MIN met
3. Hebrew display labels (`labelHe`) approved by owner for each subtopic
4. `validateParentReportAIText()` regression passes — subtopicId values added to internal leak regex
5. Parent report regression test suite passes for all existing test cases
6. Parent Copilot response validation updated to block subtopicId patterns

---

## 8. Classroom Activity Subtopic Wiring — Planning Details

### 8.1 Current Gap

`classroom_activities.subtopic` is stored in the DB (migration 024, column exists). The teacher can
enter a subtopic in the new-activity form. The server (`teacher-activities.server.js`) parses and stores
it. **But** `generate-activity-questions-client.js` does not accept a `subtopic` parameter and does not
call pool-narrowing functions.

The result: teacher subtopic input is silently ignored. Every activity generates questions at the full
topic level, regardless of subtopic selection.

### 8.2 Wiring Plan (Phase D deliverable, do not implement now)

`generateActivityQuestionSetClient` must be updated to accept `subtopic` and call the appropriate
pool-narrowing function:

- `subject: "hebrew"` + valid subtopicId → call `narrowHebrewG*Pool(subtopic, questions)`
- `subject: "math"` + valid subtopic group → call `mathOperationFromSubtopic(subtopic, grade)`
- Other subjects → topic-level behavior (after Phase E/F/G complete for those subjects)

### 8.3 Fallback Rules (required before Phase D begins)

| Scenario | Behavior |
|----------|----------|
| `subtopic: null` | Identical to current behavior — no change |
| `subtopic: ""` (empty string) | Treat as null — no change |
| `subtopic` not found in content map for this subject+grade | Log warning internally; fall back to topic-level behavior |
| `subtopic` valid but pool after narrowing has < N_MIN questions | Call `widen*PoolIfSmall()` to expand back to topic level; log warning |
| Subject not yet wired (Science, English, Geometry) | Ignore subtopic; use topic-level behavior |
| `question_count` request exceeds narrowed pool size | Widen pool first; then fill |

### 8.4 Free-Text Subtopic Input: Trust Model

The current teacher UI has a free-text field for subtopic (no dropdown, no validation). This is
intentional for Phase D — no UI redesign occurs in Phase D.

However: the free-text value is NOT trusted by the question generator without validation. Phase D
must add a validation step: check the free-text value against the content map catalog for the given
subject/grade/topic before using it for pool narrowing. Unrecognized values fall back to topic level.

A dropdown-driven subtopic UI (replacing free-text) is a future phase, after the content maps are
proven in Phase B and validated in Phase D.

---

## 9. Parent Report and Copilot Future Plan

### 9.1 When Subtopic Data May Appear

Subtopic insights may appear in parent-facing surfaces (reports, Copilot) only when ALL of the
following conditions are met simultaneously for that specific subject:

| Condition | Threshold |
|-----------|-----------|
| Evidence sufficiency | ≥ 3 sessions with subtopic-tagged questions; ≥ N_MIN questions answered at that subtopic |
| Diagnostic confidence | Taxonomy row has fired (minWrong met) for a subtopicId-aligned patternFamily |
| Label approval | Hebrew `labelHe` for the subtopic is approved by owner |
| Validation | `validateParentReportAIText()` passes with subtopicId in the internal-leak regex list |
| Regression | Existing parent report regression tests still pass |
| Copilot safety | Copilot response validation updated; `truthPacket` enriched safely |

### 9.2 Volume and Noise Rules

- Maximum **2 subtopic insights** per subject per parent report
- Subtopics showing strength (not just weakness) may be mentioned once per session summary
- Thin-data suppression: if fewer than N_MIN questions are answered at subtopic level in the current
  period, no subtopic-level claim is made (only topic-level)
- Raw subtopicIds (`g3.multi_sentence`, `add_vertical`, `sci_body_systems`) must NEVER appear in any
  parent-facing text — they must be replaced by approved Hebrew labels

### 9.3 Copilot Safety

When Parent Copilot answers questions using subtopic context:
- The `truthPacket` must include approved `labelHe` for any subtopic referenced
- The Copilot prompt must include an instruction: "Do not use internal IDs; use only the provided
  Hebrew display names"
- All Copilot responses pass `validateParentReportAIText()` before being delivered

---

## 10. Teacher, Student, and Parent Practice Future Plan

### 10.1 Teacher Subtopic Assignment

Future behavior (Phase D and beyond):
- Teacher selects: Subject → Grade → Topic → optional Subtopic
- Subtopic is optional at every step — topic-level assignment remains the default
- If subtopic pool is insufficient, teacher sees a warning and the system widens to topic level
- Teachers must not see engine-internal subtopic IDs; only teacher-facing groups are shown

### 10.2 Parent "Practice This" Flow

Future behavior (Phase J):
- Parent sees a report with a subtopic weakness highlighted
- Parent can tap "Practice this area" to launch a focused practice session
- The session uses the pool-narrowing functions to serve questions in that subtopic
- This is a recommendation, not a requirement — the child can decline or switch topics

### 10.3 Student Focused Practice

Future behavior (Phase J):
- Students may see a "suggested focus area" badge on the topic card
- Students are never forced through all subtopics before advancing to the next topic
- Consistency and habit are the primary product goals — subtopics are a precision tool, not a
  mandatory curriculum path
- No "you must complete all subtopics before unlocking this topic" gate

### 10.4 Progression Model

Subtopic mastery does not replace topic mastery. A student who is "strong at addition" according to
the topic-level diagnostic should remain marked strong, even if one addition subtopic (e.g.
`add_second_decade`) shows a weaker pattern. Topic-level conclusions take precedence; subtopic
conclusions are additive context, not overrides.

---

## 11. Final QA and Release Gate Checklist

All items must pass before the Subtopic Diagnostic Layer is considered production-complete (Phase K).

### Catalog Completeness
- [ ] Every teacher-facing subtopic has a Hebrew `labelHe` approved by owner
- [ ] Every subtopic in the catalog is linked to a spine `skill_id`
- [ ] Every spine `skill_id` maps to at least one question or generator kind
- [ ] No orphan subtopicIds (referenced in inference/content maps but not in spine)

### Coverage / N_MIN
- [ ] Every subtopic exposed to teachers meets N_MIN at the requested difficulty level
- [ ] Every subtopic in parent reports meets N_MIN on all three difficulty levels
- [ ] Science and English subtopics may not be added to catalog until N_MIN is met

### Internal Label Leak Prevention
- [ ] All subtopicId values added to `PARENT_REPORT_AI_INTERNAL_LEAK_RES` regex list
- [ ] `validateParentReportAIText()` test suite passes with subtopic-enriched reports
- [ ] Manual spot-check: send 20 sample reports through validation; zero leaks

### Diagnostic Evidence
- [ ] Minimum evidence gate tested: subtopic conclusion only fires after ≥ N_MIN questions
- [ ] Thin-data suppression tested: < N_MIN → no subtopic-level claim in report
- [ ] Taxonomy row / bridge mapping tested: all 88 Hebrew subtopicIds map correctly

### Regression Tests
- [ ] All existing parent report test cases pass unchanged
- [ ] All existing Parent Copilot test cases pass unchanged
- [ ] All existing teacher assignment tests pass (null subtopic = current behavior)
- [ ] All existing student practice tests pass
- [ ] Geometry QA (if reopened) passes all previously passing tests

### Classroom Activity Wiring
- [ ] Null subtopic → exact same output as before wiring change
- [ ] Invalid subtopic → fallback behavior confirmed
- [ ] Insufficient pool → widen behavior confirmed

### Mobile and Desktop UI
- [ ] UI QA is deferred until Phase D teacher UI update; not required for Phases B–D

### Full Launch Readiness Gate
- [ ] All of the above pass
- [ ] Owner signs off on parent report copy for at least 10 sample subtopics
- [ ] Teacher user testing (internal) confirms subtopic assignment is usable
- [ ] No open CRITICAL bugs in subtopic-related paths

---

## 12. Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Over-fragmentation — too many subtopics overwhelm teachers and parents | HIGH | MEDIUM | Anti-fragmentation rules in Section 6.2; max 10–12 teacher-facing groups per subject; max 2 parent-facing subtopics per report |
| Too few questions per subtopic (especially Hebrew live pool) | HIGH | HIGH | N_MIN gate enforced before any subtopic is added to catalog or report; archive backfill in Phase B |
| Breaking existing reports — subtopic additions introduce regression | HIGH | MEDIUM | Regression gate in Section 11; null subtopic fallback rule; validateParentReportAIText mandatory |
| Parent report noise — too much subtopic detail overwhelms parents | MEDIUM | HIGH | Max 2 subtopic insights per report; thin-data suppression; approved Hebrew labels only |
| Teacher UI complexity — subtopic dropdown becomes confusing | MEDIUM | MEDIUM | Free-text remains until Phase D is proven; dropdown deferred |
| Curriculum mismatch — subtopics don't align with MoE expectations | MEDIUM | LOW | Each subject has a `*-official-subsection-catalog.js`; alignment check required before label approval |
| Geometry QA reopening accident — unintentional regression | HIGH | LOW | Phase F is explicitly blocked on separate QA-reopening approval; no geometry changes until then |
| DB migration too early — schema changes before sufficient testing | MEDIUM | LOW | DB schema changes deferred to Phase I+; no new columns until then |
| Raw internal labels leaking to parents | HIGH | MEDIUM | `validateParentReportAIText()` + internal-leak regex; subtopicId added to block list in Phase C |
| Production augment science questions driving diagnosis incorrectly | HIGH | MEDIUM | Science diagnosis blocked until metadata is audited; `sci_pb1_auto_*` patterns excluded from diagnostic scoring by policy |
| English reading bank never built — subtopics permanently deferred | MEDIUM | MEDIUM | Reading bank creation is a Phase G deliverable; block English subtopics until complete |
| Parent Copilot hallucinating subtopic labels | HIGH | LOW | Copilot validation updated; truthPacket must carry approved labelHe; no raw ID in context |

---

## 13. Owner Decisions Required

The following decisions are outstanding. No implementation begins until these are resolved. Decisions
marked BLOCKING cannot be bypassed.

| # | Decision | Recommended Default | Why | Required Before Phase | Blocking |
|---|----------|--------------------|----|----------------------|---------|
| 1 | Approve Math subtopic groupings from Section 6 (15 groups → ~10 teacher-facing) | Approve with amendments | Prevents Phase B from starting incorrectly | Phase B | YES |
| 2 | Approve Hebrew display labels (`labelHe`) for all 88 content-map subtopics | Schedule dedicated review session | Hebrew copy requires owner approval; cannot be generated automatically | Phase B (for math labels), Phase C (for Hebrew labels) | YES |
| 3 | Confirm that classroom activity subtopic wiring (Phase D) is in scope | YES — include in Phase D | Without wiring, teacher subtopic input is permanently ignored | Phase D | YES |
| 4 | Explicit approval to reopen geometry QA | Require explicit decision; do not assume | Geometry QA was closed; reopening has risk | Phase F | YES |
| 5 | Science question bank expansion approach (AI-generated, manually authored, or both) | Mixed: manual for g1–g3, AI-assisted for g4–g6 with review | Scale (need ~3× expansion) makes manual-only impractical | Phase H | YES |
| 6 | English reading bank: should reading be added to English subtopics? | YES, but after Phase G | Reading is in MoE curriculum and master plan; bank must be built | Phase G | YES |
| 7 | Should "Word Problems" (math) remain one group or be split? | One group for now; revisit in Phase B | Splitting adds teacher-facing complexity without pedagogical benefit at this stage | Phase B | YES |
| 8 | Should `div_with_remainder` be in "Division" or "Number Theory"? | "Division" (more intuitive for teachers) | Teachers think of remainder as a division property, not number theory | Phase B | YES |
| 9 | Should "Sequences and Patterns" (math) be teacher-facing or engine-internal? | Engine-internal for now | No diagnostic taxonomy row; teacher demand unclear | Phase B | YES |
| 10 | Confirm max subtopic insights per parent report (recommended: 2 per subject) | 2 | More than 2 makes the report feel like a diagnostic dump, not a summary | Phase I | YES |
| 11 | Confirm thin-data suppression threshold (recommended: N_MIN questions answered in the period) | N_MIN threshold | Prevents false conclusions from 1–2 correct/incorrect answers | Phase C (bridge design) | YES |
| 12 | Production augment science questions — exclude from diagnosis or tag? | Exclude from diagnostic scoring; use for practice only | `sci_pb1_auto_*` patterns are not specific enough for reliable diagnosis | Any phase that touches science | YES |
| 13 | Who reviews Hebrew labels for teacher-facing subtopics before publication? | Designated product owner or Hebrew curriculum reviewer | Hebrew display names are part of the product; they affect teacher trust | Before any user-facing label is shipped | YES |
| 14 | Should Geography subtopic design follow the spine's 71-entry structure or be redesigned? | Use spine as starting point; group into 2–3 subtopics per topic per grade | 71 entries is the right audit grain; teacher-facing should be ~18 subtopics across 6 topics | Phase E | NON-BLOCKING |

---

## 14. Final Stop Condition

**Planning is complete after the owner reviews and resolves the 14 decisions in Section 13.**

This document — together with the Master Plan and Phase 0 Coverage Audit — constitutes the complete
planning package for the Subtopic Diagnostic Layer. No further planning documents are required before
implementation begins.

**No implementation begins from this document alone.**

Future implementation work starts only when:
1. The owner has reviewed this signoff document
2. The owner has resolved the decisions in Section 13
3. A separate, explicit implementation instruction is issued for the specific phase to begin
4. The exit criteria for the preceding phase have been confirmed as met

Until those conditions are met, the following is the definitive state of this project:

> **Planning phase: COMPLETE**  
> **Implementation phase: NOT STARTED**  
> **Next action required: Owner review of Section 13 decisions**  
> **First implementation phase when approved: Phase B (Math content-map creation)**

---

*This document is a planning artifact. It does not modify any source code, database schema, UI, Hebrew
copy, parent reports, or diagnostic engine. All proposed structures, groupings, and file names in this
document are planning proposals subject to owner amendment before implementation begins.*
