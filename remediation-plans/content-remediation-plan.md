# Question Bank Content Remediation Plan

**Date:** 2026-05-21  
**Status:** BLOCKED (113 REAL_BLOCKER_VISIBLE cells)  
**Goal:** Achieve 0 REAL_BLOCKER_VISIBLE, resolve diagnostic metadata gaps, exit gate with code 0

---

## Executive Summary

| Metric | Current | Target |
|--------|---------|--------|
| REAL_BLOCKER_VISIBLE | 113 | 0 |
| DIAGNOSTIC_WEAK | 167* | TBD |
| Gate Exit Code | 1 | 0 |

*Note: 90 Hebrew + 62 English + 15 Science = 167 total DIAGNOSTIC_WEAK cells

---

## A. Geometry Remediation Plan (72 blockers)

### A.1 Source Files

| File | Purpose |
|------|---------|
| `utils/geometry-conceptual-bank.js` | Conceptual templates for all grades/topics |
| `utils/geometry-question-generator.js` | Generator logic and stem randomization |
| `utils/geometry-units.js` | Unit definitions and constraints |

### A.2 Blocker Detail by Grade/Topic

#### P0: G2-G3 Core Topics (Most Critical - Visible Foundation)

| Grade | Topic | Levels | Current Avg | Missing to 10 | Total Needed | Priority |
|-------|-------|--------|-------------|---------------|--------------|----------|
| G2 | shapes_basic | easy, medium | 4.0 | 6 each | 12 templates | P0 |
| G2 | area | easy, medium, hard | 4.0 | 6, 5, 6 | 18 templates | P0 |
| G2 | perimeter | easy, medium, hard | 2.7 | 8, 7, 7 | 22 templates | P0 |
| G3 | shapes_basic | easy, medium | 2.0 | 8 each | 16 templates | P0 |
| G3 | area | easy, medium, hard | 3.3 | 8, 6, 6 | 20 templates | P0 |
| G3 | perimeter | easy, medium, hard | 2.7 | 8, 7, 7 | 22 templates | P0 |

**P0 Subtotal:** 110 templates needed

#### P1: G3 Advanced Topics

| Grade | Topic | Levels | Current Avg | Missing to 10 | Total Needed | Priority |
|-------|-------|--------|-------------|---------------|--------------|----------|
| G3 | angles | easy, medium, hard | 1.3 | 9, 8, 9 | 26 templates | P1 |
| G3 | triangles | easy, medium, hard | 1.0 | 9 each | 27 templates | P1 |
| G3 | quadrilaterals | easy, medium, hard | 1.7 | 9, 8, 8 | 25 templates | P1 |

**P1 Subtotal:** 78 templates needed

#### P2: G4-G6 Topics (Secondary Priority)

| Grade | Topic | Levels | Current Avg | Missing to 10 | Total Needed | Priority |
|-------|-------|--------|-------------|---------------|--------------|----------|
| G4 | shapes_basic | easy, medium | 2.0 | 8 each | 16 templates | P2 |
| G4 | area | easy, medium, hard | 6.7 | 6, 3, 1 | 10 templates | P2 |
| G4 | perimeter | easy, medium, hard | 5.3 | 6, 5, 3 | 14 templates | P2 |
| G4 | volume | easy, medium, hard | 2.0 | 8, 7, 9 | 24 templates | P2 |
| G4 | symmetry | easy, medium, hard | 2.7 | 8, 7, 7 | 22 templates | P2 |
| G5 | area | easy, medium, hard | 4.0 | 8, 6, 4 | 18 templates | P2 |
| G5 | perimeter | easy, medium, hard | 3.3 | 8, 7, 5 | 20 templates | P2 |
| G5 | volume | easy, medium, hard | 1.3 | 9, 8, 9 | 26 templates | P2 |
| G5 | triangles | easy, medium, hard | 1.3 | 9, 9, 8 | 26 templates | P2 |
| G5 | quadrilaterals | easy, medium, hard | 2.0 | 9, 8, 7 | 24 templates | P2 |
| G6 | area | easy, medium, hard | 4.0 | 8, 6, 4 | 18 templates | P2 |
| G6 | perimeter | easy, medium, hard | 3.3 | 8, 7, 5 | 20 templates | P2 |
| G6 | volume | easy, medium, hard | 1.3 | 9, 8, 9 | 26 templates | P2 |
| G6 | angles | easy, medium, hard | 2.3 | 9, 8, 6 | 23 templates | P2 |
| G6 | triangles | easy, medium, hard | 1.3 | 9, 9, 8 | 26 templates | P2 |
| G6 | symmetry | easy, medium, hard | 1.7 | 9, 8, 8 | 25 templates | P2 |

**P2 Subtotal:** 302 templates needed

### A.3 Remediation Strategy

**Option 1: Add Templates (Preferred)**
- Add new template objects to `geometry-conceptual-bank.js`
- Each template should use parameter randomization to generate unique stems
- Target: 110 templates for P0 (achievable in 1-2 days)

**Option 2: Generator Logic Enhancement**
- If adding templates is insufficient, enhance `geometry-question-generator.js`
- Increase parameter variation range for existing templates
- Add shape rotation, dimension variation, unit switching

**Option 3: Visibility Reduction (Last Resort)**
- Hide specific grade/topic/level combinations in `pages/learning/geometry-master.js`
- Only if content addition is not feasible

### A.4 Template Specification

Each new template must include:
```javascript
{
  topic: "area", // or shapes_basic, perimeter, etc.
  subtopic: "rectangle_area",
  difficulty: "easy", // easy | medium | hard
  gradeRange: [2, 3], // [min, max]
  stemTemplate: "Find the area of a rectangle with length {L}cm and width {W}cm.",
  parameters: {
    L: { min: 2, max: 20, integer: true },
    W: { min: 2, max: 20, integer: true }
  },
  answerFormula: "L * W",
  units: "cm²",
  // Metadata for diagnostic capability
  patternFamily: "area_rectangle",
  conceptTag: "area_basic",
  diagnosticSkillId: "geom_area_001",
  expectedErrorTags: ["multiplication_error", "unit_confusion"],
  probePower: 0.7
}
```

### A.5 Implementation Order

1. **Week 1:** P0 (G2 shapes_basic, area, perimeter) - 52 templates
2. **Week 1:** P0 (G3 shapes_basic, area, perimeter) - 58 templates
3. **Week 2:** P1 (G3 angles, triangles, quadrilaterals) - 78 templates
4. **Week 3-4:** P2 (G4-G6 remaining) - 302 templates (can be parallelized)

---

## B. Science Remediation Plan (41 blockers)

### B.1 Source Files

| File | Purpose |
|------|---------|
| `data/science-questions.js` | Core static question bank |
| `data/science-questions-production-batch1.js` | Production batch |
| `data/science-questions-phase3.js` | Phase 3 content |
| `data/science-questions-phase4b1.js` | Phase 4b content |
| `data/science-questions-closure-fill.js` | Closure/fill content |
| `data/science-curriculum.js` | Curriculum definitions |

### B.2 Blocker Detail by Grade/Topic

#### P0: G1-G3 Core Life Science (Most Critical)

| Grade | Topic | Levels | Current | Missing to 10 | Total Needed | Priority |
|-------|-------|--------|---------|---------------|--------------|----------|
| G1 | body | medium, hard | 1, 1 | 9 each | 18 questions | P0 |
| G1 | animals | medium, hard | 1, 1 | 9 each | 18 questions | P0 |
| G1 | plants | medium, hard | 2, 1 | 8, 9 | 17 questions | P0 |
| G2 | body | medium, hard | 1, 2 | 9, 8 | 17 questions | P0 |
| G2 | experiments | easy, medium, hard | 7, 3, 3 | 3, 7, 7 | 17 questions | P0 |
| G2 | animals | medium, hard | 3, 1 | 7, 9 | 16 questions | P0 |
| G2 | plants | medium, hard | 5, 4 | 5, 6 | 11 questions | P0 |
| G3 | body | hard | 5 | 5 | 5 questions | P0 |
| G3 | experiments | easy, hard | 4, 4 | 6, 6 | 12 questions | P0 |
| G3 | animals | easy, hard | 4, 4 | 6, 6 | 12 questions | P0 |
| G3 | plants | easy | 6 | 4 | 4 questions | P0 |

**P0 Subtotal:** 145 questions needed

#### P1: G4-G6 Intermediate Topics

| Grade | Topic | Levels | Current | Missing to 10 | Total Needed | Priority |
|-------|-------|--------|---------|---------------|--------------|----------|
| G4 | body | easy, hard | 6, 4 | 4, 6 | 10 questions | P1 |
| G4 | experiments | easy, hard | 4, 5 | 6, 5 | 11 questions | P1 |
| G4 | animals | easy, hard | 4, 5 | 6, 5 | 11 questions | P1 |
| G5 | body | easy, medium, hard | 4, 4, 7 | 6, 6, 3 | 15 questions | P1 |
| G5 | experiments | easy | 3 | 7 | 7 questions | P1 |
| G5 | animals | easy, medium, hard | 3, 4, 7 | 7, 6, 3 | 16 questions | P1 |
| G6 | body | easy, medium, hard | 5, 4, 7 | 5, 6, 3 | 14 questions | P1 |
| G6 | experiments | easy | 3 | 7 | 7 questions | P1 |
| G6 | animals | easy, medium, hard | 3, 3, 6 | 7, 7, 4 | 18 questions | P1 |

**P1 Subtotal:** 109 questions needed

### B.3 Question Specification

Each new question must include full metadata:

```javascript
{
  id: "sci_g1_body_001",
  stem: "What is the main function of the heart?",
  options: ["Pump blood", "Digest food", "Breathe air", "Think thoughts"],
  correct: 0,
  explanation: "The heart pumps blood throughout the body...",
  // Required Metadata
  patternFamily: "body_systems",
  conceptTag: "heart_function",
  diagnosticSkillId: "sci_body_001",
  expectedErrorTags: ["organ_confusion", "function_misattribution"],
  expectedErrorTypes: ["misconception", "prior_knowledge_gap"],
  // Probe capability
  probePower: 0.8,
  probeType: "diagnostic",
  // Curriculum alignment
  grade: "g1",
  topic: "body",
  level: "medium",
  difficulty: 2
}
```

### B.4 Metadata Requirements

| Field | Required | Purpose |
|-------|----------|---------|
| `patternFamily` | ✅ | Groups related questions for pattern analysis |
| `conceptTag` | ✅ | Specific concept being tested |
| `diagnosticSkillId` | ✅ | Links to diagnostic taxonomy |
| `expectedErrorTags` | ✅ | Anticipated student error types |
| `expectedErrorTypes` | ✅ | Error categorization |
| `probePower` | Optional | Diagnostic confidence weight |

### B.5 Implementation Order

1. **Week 1:** P0 G1 (body, animals, plants) - 53 questions
2. **Week 1:** P0 G2 (body, experiments, animals, plants) - 61 questions
3. **Week 2:** P0 G3 (body, experiments, animals, plants) - 31 questions
4. **Week 2-3:** P1 G4-G6 - 109 questions

---

## C. Diagnostic Weak Cells Analysis (167 cells)

### C.1 By Subject

| Subject | Count | Primary Issue |
|---------|-------|---------------|
| Hebrew | 90 | Missing `diagnosticSkillId`, `expectedErrorTags` |
| English | 62 | Missing `diagnosticSkillId`, `expectedErrorTags` |
| Science | 15 | Variable metadata coverage |

### C.2 Hebrew Rich Pool (90 cells)

**All G1-G6, all topics (vocabulary, grammar, spelling, reading, comprehension)**

| Grade | Topics | Levels | Missing Metadata |
|-------|--------|--------|------------------|
| G1-G6 | All 5 topics | easy, medium, hard | diagnosticSkillId: 0%, expectedErrorTags: 0% |

**Status:** Practice-ready (questions exist, sufficient count)
**Gap:** No diagnostic capability

### C.3 English Grammar Pools (62 cells)

| Topic | Grades | Levels | Missing Metadata |
|-------|--------|--------|------------------|
| be_basic | G1-G2 | easy | Low diagnostic coverage |
| past_simple | G1-G6 | easy | Low diagnostic coverage |
| present_simple | G3-G6 | easy | Low diagnostic coverage |
| progressive | G1-G6 | easy | Low diagnostic coverage |
| future_forms | G1-G6 | easy | Low diagnostic coverage |
| modals | G1-G6 | easy | Low diagnostic coverage |
| comparatives | G1-G6 | easy | Low diagnostic coverage |
| conditionals | G1-G6 | easy | Low diagnostic coverage |
| complex_tenses | G1-G6 | easy | Low diagnostic coverage |
| quantifiers | G1-G6 | easy | Low diagnostic coverage |
| question_frames | G1-G6 | easy | Low diagnostic coverage |

### C.4 Classification Decision Matrix

| Cell Type | Practice-Only Acceptable | Must be Diagnostic-Ready | Post-Launch |
|-----------|-------------------------|--------------------------|-------------|
| Hebrew (90) | ⚠️ Risky | ✅ Yes | Alternative |
| English Grammar (62) | ⚠️ Risky | ✅ Yes | Alternative |
| Science (15) | ✅ Yes | No | Can wait |

**Risk Assessment:**
- Hebrew/English diagnostic-weak cells will produce limited diagnostic conclusions
- UI may show "diagnostic unavailable" for these cells
- Post-launch remediation acceptable if clearly communicated to users

### C.5 Recommendation

1. **P0 (Pre-Launch):** Add metadata to at least 50% of Hebrew G1-G3 and English G1-G3 cells
2. **P1 (Post-Launch):** Complete metadata for remaining Hebrew/English cells
3. **P2 (Post-Launch):** Science diagnostic metadata as needed

---

## D. Gate Acceptance Criteria

Before Question Bank can be marked CLOSED, the following must be true:

### D.1 Hard Requirements

| Criterion | Target | Verification |
|-----------|--------|--------------|
| REAL_BLOCKER_VISIBLE | 0 | `node scripts/question-bank-inventory-gate.mjs` |
| Gate Exit Code | 0 | Exit code check |
| Build Status | Pass | `npm run build` |
| JSON Report | Updated | `reports/question-bank-inventory/question-bank-inventory.json` |
| Markdown Report | Updated | `reports/question-bank-inventory/question-bank-inventory.md` |

### D.2 Diagnostic Requirements

| Criterion | Target | Notes |
|-----------|--------|-------|
| Hebrew Diagnostic-Ready | ≥50% G1-G3 | Or marked practice-only in UI |
| English Diagnostic-Ready | ≥50% G1-G3 | Or marked practice-only in UI |
| Science Diagnostic-Ready | ≥70% all grades | Current acceptable for launch |

### D.3 Content Completeness

| Criterion | Target |
|-----------|--------|
| Geometry Templates | ≥10 unique per cell |
| Science Questions | ≥10 unique per cell |
| English Translation | ≥10 unique per cell (✅ Currently 177) |

---

## E. QA Plan

After content remediation, execute full QA suite:

### E.1 Gate Verification

```bash
# 1. Run inventory gate
node scripts/question-bank-inventory-gate.mjs

# Verify:
# - Exit code 0
# - REAL_BLOCKER_VISIBLE = 0
# - Reports updated
```

### E.2 Build Verification

```bash
# 2. Build application
npm run build

# Verify:
# - No compilation errors
# - Warnings acceptable (not blockers)
```

### E.3 Diagnostic Engine Testing

```bash
# 3. Run diagnostic engine harness
npm run test:diagnostic-engine-v2-harness

# Verify:
# - All diagnostic paths functional
# - No crashes on Hebrew/English/Science topics
```

### E.4 Parent Report Testing

```bash
# 4. Parent report self-test
node scripts/parent-report-phase1-selftest.mjs

# Verify:
# - Reports generate correctly
# - No missing data errors
```

### E.5 Probe Evidence QA

```bash
# 5. Probe evidence validation
node scripts/probe-evidence-to-copilot-qa.mjs

# Verify:
# - Probe metadata valid
# - Evidence chains complete
```

### E.6 Learning Simulator

```bash
# 6. Learning simulator probes
npm run qa:learning-simulator:probes

# Verify:
# - Simulated student interactions succeed
# - No topic/level failures
```

### E.7 Manual QA Checklist

- [ ] G2 Geometry shapes_basic generates 10+ unique questions
- [ ] G2 Geometry area generates 10+ unique questions
- [ ] G2 Geometry perimeter generates 10+ unique questions
- [ ] G1 Science body questions display correctly
- [ ] G1 Science animals questions display correctly
- [ ] Hebrew rich pool diagnostic metadata present (sample check)
- [ ] English grammar pools diagnostic metadata present (sample check)
- [ ] No console errors during topic selection
- [ ] No console errors during question generation

---

## F. Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Geometry P0 | 1 week | G2-G3 core topics remediated |
| Geometry P1-P2 | 2 weeks | All geometry blockers resolved |
| Science P0 | 1 week | G1-G3 life science remediated |
| Science P1 | 1 week | G4-G6 topics remediated |
| Diagnostic Metadata | 1 week | 50% Hebrew/English coverage |
| QA & Verification | 3 days | All tests pass, gate exits 0 |
| **Total** | **~6 weeks** | **Question Bank CLOSED** |

---

## G. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Content creation too slow | Parallel workstreams, prioritize P0 |
| Template complexity high | Use existing templates as reference |
| Metadata expertise needed | Document patternFamily/conceptTag taxonomy |
| QA failures | Run partial gates after each content batch |
| Scope creep | Strict adherence to P0/P1/P2 priorities |

---

## H. Success Metrics

At remediation completion:

- ✅ `REAL_BLOCKER_VISIBLE === 0`
- ✅ Gate exit code === 0
- ✅ Build passes
- ✅ All QA scripts pass
- ✅ Manual QA checklist complete
- ✅ 50%+ Hebrew/English diagnostic-ready

---

**Do not begin implementation until this plan is reviewed and approved.**
