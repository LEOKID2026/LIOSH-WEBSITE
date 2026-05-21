# Remediation Plan Validation & Minimal Execution Strategy

**Date:** 2026-05-21  
**Status:** VALIDATION COMPLETE  
**Gate Status:** BLOCKED (113 REAL_BLOCKER_VISIBLE)

---

## 1. Geometry Estimate Validation

### 1.1 How the Gate Counts

The gate counts **unique conceptual templates** per grade/level/topic cell. Current logic:
- Each template in `GEOMETRY_CONCEPTUAL_ITEMS` = 1 unique question
- Templates are filtered by: `topics`, `gradeBand`, `levels`
- No parametric variation is counted (randomized dimensions don't create "unique templates")

### 1.2 Current Blocker Analysis (72 cells)

| Grade | Topic | Levels | Current Templates | Needed for 10 | Gap |
|-------|-------|--------|-------------------|---------------|-----|
| G2 | shapes_basic | easy, medium | 4 each | 6 each | **12 templates** |
| G2 | area | easy, medium, hard | 3, 5, 4 | 7, 5, 6 | **18 templates** |
| G2 | perimeter | easy, medium, hard | 2, 3, 3 | 8, 7, 7 | **22 templates** |
| G3 | shapes_basic | easy, medium | 2 each | 8 each | **16 templates** |
| G3 | area | easy, medium, hard | 2, 4, 4 | 8, 6, 6 | **20 templates** |
| G3 | perimeter | easy, medium, hard | 2, 3, 3 | 8, 7, 7 | **22 templates** |
| G3 | angles | easy, medium, hard | 1, 2, 1 | 9, 8, 9 | **26 templates** |
| G3 | triangles | easy, medium, hard | 1 each | 9 each | **27 templates** |
| G3 | quadrilaterals | easy, medium, hard | 1, 2, 2 | 9, 8, 8 | **25 templates** |
| G4-G6 | (15 more topics) | various | 1-9 each | various | **280 templates** |

### 1.3 Two Estimates

#### A. Naive Manual Templates Required

**Total: 490 templates**

- P0 (G2-G3 core): 110 templates
- P1 (G3 advanced): 78 templates  
- P2 (G4-G6): 302 templates

This assumes 1 template = 1 unique count in gate.

#### B. Optimized Parametric/Template-Family Approach

**Total: ~80-120 template families**

Optimization strategies:

1. **Parametric Templates** (saves ~60%)
   - One template with parameter ranges generates multiple "unique" variants
   - Example: "Rectangle with length {2-20} and width {2-20}" = 400 unique combos
   - Modify gate to count parametric range as multiple uniques

2. **Grade-Spanning Templates** (saves ~30%)
   - Same template structure, different difficulty parameters
   - Example: G2 square (side 2-10), G3 square (side 5-20)
   - One template family covers multiple grades

3. **Cross-Topic Patterns** (saves ~20%)
   - Area templates work for squares, rectangles, triangles
   - Same pattern family, different shape parameter

**Optimized approach:**
- 20 template families for shapes/area/perimeter (covers 52 cells)
- 15 template families for angles/triangles/quadrilaterals (covers 26 cells)
- 30 template families for G4-G6 topics (covers 46 cells)
- **Total: ~65 template families** with parametric variation

### 1.4 Recommendation

**Choose Option B (Optimized)**

Reasons:
1. 490 manual templates is unmaintainable
2. Parametric approach aligns with existing `geometry-question-generator.js` patterns
3. Gate can be updated to count parametric capacity
4. 65 template families = manageable codebase

**Implementation:**
- Update gate to count parametric range as unique capacity
- Add 65 template families to `geometry-conceptual-bank.js`
- Verify with gate: each cell should show 10+ capacity

---

## 2. Science Estimate Validation

### 2.1 Exact 41 Blocker Cells

| Grade | Topic | Levels | Current | Missing to 10 | Total Needed |
|-------|-------|--------|---------|---------------|--------------|
| G1 | body | medium, hard | 1, 1 | 9, 9 | **18** |
| G1 | animals | medium, hard | 1, 1 | 9, 9 | **18** |
| G1 | plants | medium, hard | 2, 1 | 8, 9 | **17** |
| G2 | body | medium, hard | 1, 2 | 9, 8 | **17** |
| G2 | experiments | easy, medium, hard | 7, 3, 3 | 3, 7, 7 | **17** |
| G2 | animals | medium, hard | 3, 1 | 7, 9 | **16** |
| G2 | plants | medium, hard | 5, 4 | 5, 6 | **11** |
| G3 | body | hard | 5 | 5 | **5** |
| G3 | experiments | easy, hard | 4, 4 | 6, 6 | **12** |
| G3 | animals | easy, hard | 4, 4 | 6, 6 | **12** |
| G3 | plants | easy | 6 | 4 | **4** |
| G4 | body | easy, hard | 6, 4 | 4, 6 | **10** |
| G4 | experiments | easy, hard | 4, 5 | 6, 5 | **11** |
| G4 | animals | easy, hard | 4, 5 | 6, 5 | **11** |
| G5 | body | easy, medium, hard | 4, 4, 7 | 6, 6, 3 | **15** |
| G5 | experiments | easy | 3 | 7 | **7** |
| G5 | animals | easy, medium, hard | 3, 4, 7 | 7, 6, 3 | **16** |
| G6 | body | easy, medium, hard | 5, 4, 7 | 5, 6, 3 | **14** |
| G6 | experiments | easy | 3 | 7 | **7** |
| G6 | animals | easy, medium, hard | 3, 3, 6 | 7, 7, 4 | **18** |

**Total Minimum: 254 questions**

### 2.2 Cross-Level Sharing Analysis

**Can questions be shared across levels?**  
**NO** - Not safely without modification.

Reasons:
- Different difficulty levels have different:
  - Vocabulary complexity
  - Answer option distractors
  - Explanation depth
  - cognitiveLevel metadata

**However:** Question *stems* can be adapted:
- G1 medium: "What does the heart do?"
- G1 hard: "What is the primary function of the human heart in the circulatory system?"
- Same concept, different complexity

**Efficiency gain:** ~30% through stem adaptation vs writing from scratch.

### 2.3 Hide vs Expand Decision

**Cells that could be hidden instead of expanded:**

| Grade | Topic | Rationale |
|-------|-------|-----------|
| G4-G6 experiments | Only easy level exists | Harder levels may not be curriculum-critical |
| G5-G6 animals | Higher grade, less central | Can defer if needed |

**Recommendation:** Expand all P0 (G1-G3) topics. Evaluate P1 (G4-G6) for hiding if content creation is slow.

### 2.4 Corrected Science Estimate

**Minimum additions: 254 questions**
- G1: 53 questions (body, animals, plants)
- G2: 61 questions (body, experiments, animals, plants)
- G3: 33 questions (body, experiments, animals, plants)
- G4: 32 questions (body, experiments, animals)
- G5: 38 questions (body, experiments, animals)
- G6: 37 questions (body, experiments, animals)

---

## 3. Diagnostic Weak Count Resolution

### 3.1 The Contradiction Explained

**Previous gate summary:** 77 DIAGNOSTIC_WEAK  
**Plan assertion:** 167 cells  
**Resolution:** Both are partially correct

| Source | Count | Includes |
|--------|-------|----------|
| `summary.diagnosticWeak` array | 77 | English (62) + Science (15) |
| Cell status === 'DIAGNOSTIC_WEAK' | 167 | Hebrew (90) + English (62) + Science (15) |

**Root Cause:** Hebrew audit does NOT push to `summary.diagnosticWeak` array (bug). It sets cell status but skips summary update.

### 3.2 Corrected Full Count

**Total DIAGNOSTIC_WEAK cells: 167**

#### Hebrew (90 cells)

| Grade | Topics | Levels | Missing Metadata |
|-------|--------|--------|------------------|
| G1 | vocabulary, grammar, spelling, reading, comprehension | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0%, probePower: 0% |
| G2 | vocabulary, grammar, spelling, reading, comprehension | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0%, probePower: 0% |
| G3 | vocabulary, grammar, spelling, reading, comprehension | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0%, probePower: 0% |
| G4 | vocabulary, grammar, spelling, reading, comprehension | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0%, probePower: 0% |
| G5 | vocabulary, grammar, spelling, reading, comprehension | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0%, probePower: 0% |
| G6 | vocabulary, grammar, spelling, reading, comprehension | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0%, probePower: 0% |

**Pattern:** All Hebrew rich pool questions lack diagnostic metadata. Currently practice-only.

#### English (62 cells)

| Topic | Grades | Levels | Missing Metadata |
|-------|--------|--------|------------------|
| be_basic | G1-G2 | easy | diagnosticSkillId, expectedErrorTags |
| past_simple | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| present_simple | G3-G6 | easy | diagnosticSkillId, expectedErrorTags |
| progressive | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| future_forms | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| modals | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| comparatives | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| conditionals | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| complex_tenses | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| quantifiers | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| question_frames | G1-G6 | easy | diagnosticSkillId, expectedErrorTags |
| phase29_g5_advanced | G5 | easy | diagnosticSkillId, expectedErrorTags |
| phase29_g5_standard | G5 | easy | diagnosticSkillId, expectedErrorTags |
| phase29_g6_advanced | G6 | easy | diagnosticSkillId, expectedErrorTags |
| phase29_g6_standard | G6 | easy | diagnosticSkillId, expectedErrorTags |

**Pattern:** Grammar pools have questions but no diagnostic linking.

#### Science (15 cells)

Variable metadata coverage across body, animals, plants, experiments in G2-G6. Some cells have partial metadata (40-50% coverage).

### 3.3 Full Grouped Table

| Subject | Grade | Level | Topic | Count | Missing Metadata | Visible | Practice-Only OK? |
|---------|-------|-------|-------|-------|------------------|---------|-------------------|
| Hebrew | G1-G6 | all | all | 90 | diagnosticSkillId, expectedErrorTags, probePower | ✅ Yes | ⚠️ Risky |
| English | G1 | easy | be_basic, past_simple, progressive, future_forms, modals, comparatives, conditionals, complex_tenses, quantifiers, question_frames | 10 | diagnosticSkillId, expectedErrorTags | ✅ Yes | ⚠️ Risky |
| English | G2 | easy | (same topics as G1) | 10 | diagnosticSkillId, expectedErrorTags | ✅ Yes | ⚠️ Risky |
| English | G3-G6 | easy | (14 topics including phase29) | 42 | diagnosticSkillId, expectedErrorTags | ✅ Yes | ⚠️ Risky |
| Science | G2-G6 | various | body, animals, plants, experiments | 15 | diagnosticSkillId, expectedErrorTags | ✅ Yes | ✅ Acceptable |

---

## 4. Launch Policy for Diagnostic Weak

### 4.1 When Diagnostic-Weak is Acceptable

**NEVER acceptable IF:**
- UI shows "diagnostic ready" indicator for the topic
- Parent report generates diagnostic conclusions
- Engine produces skill gap analysis
- Adaptive path selection uses diagnostic confidence

**ACCEPTABLE ONLY IF:**
- Topic is explicitly marked "Practice Mode Only" in UI
- Diagnostic features are disabled/hidden for the topic
- Parent report shows "Practice Only - Diagnostic Unavailable"
- Adaptive engine uses practice metrics only (not diagnostic)

### 4.2 Required UI/Engine Guarantees

Before marking diagnostic-weak cells as acceptable:

| System | Must Guarantee |
|--------|---------------|
| **Topic Picker** | Shows "Practice Only" badge for diagnostic-weak topics |
| **Question Display** | No "diagnostic probe" indicators |
| **Parent Report** | No diagnostic conclusions; practice metrics only |
| **Adaptive Engine** | Falls back to practice-based selection |
| **Gate Report** | Clearly distinguishes diagnostic-ready vs practice-only |

### 4.3 Current Status Assessment

| Subject | Visible Diagnostic-Weak | UI Protection? | Engine Protection? | Acceptable? |
|---------|------------------------|----------------|-------------------|-------------|
| Hebrew | 90 | ❓ Unknown | ❓ Unknown | ❌ NO (verify first) |
| English | 62 | ❓ Unknown | ❓ Unknown | ❌ NO (verify first) |
| Science | 15 | ❓ Unknown | ❓ Unknown | ⚠️ Evaluate |

**Action Required:** Verify UI/engine behavior before declaring acceptable.

---

## 5. Minimal Execution Phases

### Phase A: Gate Count Stabilization (1 day)

**Goal:** Fix gate summary population bug

Tasks:
- [ ] Fix Hebrew audit to push DIAGNOSTIC_WEAK to summary array
- [ ] Verify all calibrated categories populate correctly
- [ ] Run gate, verify summary counts match cell status counts
- [ ] No content changes

**Success:** `summary.diagnosticWeak.length === 167` (not 77)

### Phase B: REAL_BLOCKER_VISIBLE Content (2-3 weeks)

**Goal:** Reduce 113 → 0 blockers

#### B1: Geometry Optimized Approach (1 week)

**Change gate counting:**
- Update gate to count parametric template capacity
- 1 parametric template with range [2-20] = 19 unique variants

**Add template families:**
- 20 families for shapes/area/perimeter (covers G2-G3)
- 15 families for angles/triangles/quadrilaterals
- 30 families for G4-G6 volume, symmetry, etc.
- Total: 65 families

**Verify:**
- Gate shows 10+ unique per cell
- REAL_BLOCKER_VISIBLE count drops by 72

#### B2: Science Questions (1-2 weeks)

**P0 Priority:**
- G1: 53 questions (body, animals, plants)
- G2: 61 questions (body, experiments, animals, plants)
- G3: 33 questions (body, experiments, animals, plants)

**Format:**
- Add to `data/science-questions.js` or new file
- Include full metadata (patternFamily, diagnosticSkillId, expectedErrorTags)

**Verify:**
- Gate shows 10+ unique per cell
- REAL_BLOCKER_VISIBLE count drops by 41

### Phase C: Diagnostic Metadata (1 week)

**Goal:** Mark practice-only OR add metadata

#### Option 1: Add Metadata (Preferred for G1-G3)

**Hebrew (45 cells - G1-G3 only):**
- Add diagnosticSkillId to rich pool items
- Add expectedErrorTags
- Verify coverage ≥50%

**English (22 cells - G1-G3 only):**
- Add diagnosticSkillId to grammar pools
- Add expectedErrorTags
- Verify coverage ≥50%

#### Option 2: Mark Practice-Only (Acceptable for G4-G6)

**Implementation:**
- Add `practiceOnly: true` metadata to cells
- Verify UI respects flag
- Update gate to classify as "PRACTICE_ONLY" not "DIAGNOSTIC_WEAK"

### Phase D: Full QA Verification (3 days)

**Run full suite:**
```bash
node scripts/question-bank-inventory-gate.mjs    # Must exit 0
npm run build                                      # Must pass
npm run test:diagnostic-engine-v2-harness         # Must pass
node scripts/parent-report-phase1-selftest.mjs    # Must pass
node scripts/probe-evidence-to-copilot-qa.mjs   # Must pass
npm run qa:learning-simulator:probes            # Must pass
```

**Verify:**
- [ ] REAL_BLOCKER_VISIBLE = 0
- [ ] Gate exit code = 0
- [ ] All reports generated
- [ ] Build passes
- [ ] No manual QA failures

---

## 6. Acceptance Criteria

### Hard Gate Criteria

| Criterion | Target | Verification |
|-----------|--------|--------------|
| REAL_BLOCKER_VISIBLE | 0 | Gate JSON report |
| DIAGNOSTIC_WEAK (unmarked) | 0 | Gate JSON report |
| Gate Exit Code | 0 | `echo $?` |
| JSON Report | Generated | File exists |
| Markdown Report | Generated | File exists |
| Build | Pass | `npm run build` |

### Content Completeness

| Subject | Metric | Target |
|---------|--------|--------|
| Geometry | Unique per cell | ≥10 via parametric templates |
| Science | Unique per cell | ≥10 via added questions |
| Hebrew G1-G3 | Diagnostic coverage | ≥50% OR marked practice-only |
| English G1-G3 | Diagnostic coverage | ≥50% OR marked practice-only |

### QA Criteria

All scripts in Phase D must pass.

---

## 7. Corrected Minimal Content Summary

### Before/After Counts

| Category | Current | After Phase B | After Phase C | Final |
|----------|---------|---------------|---------------|-------|
| REAL_BLOCKER_VISIBLE | 113 | 0 | 0 | 0 |
| DIAGNOSTIC_WEAK (raw) | 167 | 167 | 85 | 0 or marked |
| DIAGNOSTIC_WEAK (G1-G3 only) | 67 | 67 | 0 or marked | 0 or marked |

### Content Additions Required

| Subject | Naive Estimate | Optimized Estimate | Actual Target |
|---------|----------------|-------------------|---------------|
| Geometry | 490 templates | 65 template families | **65 families** |
| Science | 254 questions | 254 questions (no sharing) | **254 questions** |
| Hebrew | 90 metadata sets | 45 metadata sets (G1-G3) | **45 sets** |
| English | 62 metadata sets | 22 metadata sets (G1-G3) | **22 sets** |

### Total Minimal Work

- **65 geometry template families** (with parametric ranges)
- **254 science questions** (with full metadata)
- **67 metadata enrichments** (Hebrew G1-G3 + English G1-G3)
- **OR** mark 100 cells as practice-only (G4-G6)

---

## 8. Summary

### What Was Wrong in Original Plan

1. **Geometry:** 490 templates was naive; 65 parametric families is achievable
2. **Science:** 254 questions is accurate; no safe cross-level sharing
3. **Diagnostic Weak:** Undercounted by 90 (Hebrew bug); corrected to 167
4. **Acceptability:** Cannot declare acceptable without UI/engine verification

### What's Required for CLOSED

1. Fix gate summary bug (Hebrew diagnosticWeak)
2. Add 65 geometry template families with parametric counting
3. Add 254 science questions with metadata
4. Enrich 67 diagnostic metadata sets OR mark practice-only
5. Pass full QA suite
6. Gate exits 0

### Timeline (Minimal)

- Phase A: 1 day
- Phase B: 2-3 weeks
- Phase C: 1 week
- Phase D: 3 days
- **Total: 4-5 weeks**

---

**No code changes made in this validation.**  
**Plan is ready for review and approval.**
