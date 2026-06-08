# Launch Correction Master Plan

**Version:** 1.1  
**Generated:** 2026-06-08  
**Status:** **SAFE PAUSE** — Phases 1–3C complete and verified (see [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md)). Phase 4 not started.  
**Purpose:** Turn the product into launch-ready content through real authoring and a centralized launch policy — not patchwork hiding.

---

## Input reports (baseline)

| Report | Path |
|--------|------|
| **Progress checkpoint (Phases 1–3C)** | `docs/qa/LAUNCH_CORRECTION_PROGRESS.md` |
| Launch Readiness Matrix | `docs/qa/LAUNCH_READINESS_MATRIX.md` |
| Launch matrix JSON | `docs/qa/_artifacts/launch-readiness/launch-readiness-matrix.json` |
| Lower Grades Literacy Audit | `docs/qa/LOWER_GRADES_LITERACY_AUDIT.md` |
| System Health Closure | `docs/qa/LAUNCH_SYSTEM_HEALTH_CLOSURE.md` |
| Question Inventory Matrix | `reports/question-audit/QUESTION_INVENTORY_MATRIX.json` |

**Technical baseline (confirmed 2026-06-08, updated post–Phase 3C):**

- MCQ obvious-answer audit: **PASS** (0 WARN)
- Question-bank integrity audit: **PASS** (0 `leakRisk`)
- `CRITICAL_BLOCKING`: **0** (was 5 pre–Phase 2)
- Hebrew G1/G2 scoped literacy targets (reading/comprehension/grammar per-level): **closed**
- Inventory decision: `NOT_READY_INVENTORY_INSUFFICIENT` (382 `NEEDS_AUTHORING_BEFORE_LAUNCH` cells remain globally; no hard blockers)
- Build: **passes**

---

# 1. Executive decision

## Frozen constraints (entire program)

| Constraint | Status |
|------------|--------|
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | **OFF** — no change |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | **OFF** — no change |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | **OFF** — no change |
| Diagnostic metadata in product | **Internal/shadow only** (`lib/learning/diagnostic-metadata-subskill-flag.js`) |
| SQL / migrations | **No changes** |
| Parent report behavior | **No changes** (aggregation, copy, API shape) |
| UI redesign | **No changes** (layout, homepage, landing, public marketing) |
| Scattered topic hiding | **Forbidden** — all visibility via central launch policy |

## What this phase is

**Content, pedagogy, inventory, audio, and centralized launch-readiness policy** — not diagnostic engine scoring changes, not parent report logic changes, not marketing surface changes in early phases.

## Why diagnostic metadata flags stay OFF

1. **Thin inventory:** 382 matrix cells still `NEEDS_AUTHORING_BEFORE_LAUNCH`. Hebrew G1–G6 and English G1–G2 are pedagogically incomplete despite technical audit pass.
2. **Misleading granularity risk:** Enabling subskill/gating/promotion on thin banks could produce over-specific weakness labels or empty-looking reports before content exists.
3. **Existing safeguards are sufficient for now:** Parent topic conclusions require ≥8 weighted answers (`utils/parent-report-topic-evidence.js`). Learning book and guided modes carry weight 0 (`lib/learning/activity-classification.js`). Only `free_practice` and `assigned_parent` count in parent context (`lib/learning/diagnostic-evidence-contract.js`).
4. **Revisit flags only after:** (a) topic meets professional thresholds 50/40/30 per level and ≥100 topic total where applicable (`scripts/lib/qa-inventory-professional.mjs`), (b) launch registry marks topic `FULL` or `LIMITED` with `diagnosticContribution: normal`, (c) parent-report smoke passes with seeded realistic usage.

## Registry vs runtime (clarification)

Phase 1 **may** store `diagnosticContribution` metadata in the launch registry (`normal` | `thin` | `manual_only` | `excluded`). This is **documentation for future wiring and QA alignment only**.

**Parent report aggregation must not consume launch-registry `diagnosticContribution` in any phase until explicitly approved.** No imports from `lib/launch-readiness/` into `lib/parent-server/` without a separate owner sign-off.

---

# 2. Product launch model

## Design principle

One **single source of truth (SSOT)** classifies every `subject × grade × topic` cell. All surfaces read the policy — no scattered `if (grade === "g1")` in masters, pickers, or audits.

Future alignment: draft curriculum governance plan (`.cursor/plans/curriculum_governance_layer_7ed5f683.plan.md`) maps `FULL` → `OFFICIAL_CORE`, `PRACTICE_ONLY` → `OFFICIAL_EARLY_EXPOSURE`, `HIDE` → `SHOULD_HIDE`.

## Recommended module layout (not implemented yet)

| File | Role |
|------|------|
| `lib/launch-readiness/topic-launch-policy.js` | SSOT API: `getTopicLaunchRow()`, `isTopicAllowedOnSurface()`, `getDiagnosticContributionMetadata()` |
| `lib/launch-readiness/launch-surfaces.js` | Surface enum and gate matrix |
| `data/launch-readiness/topic-launch-registry.json` | Curated rows per cell |
| `scripts/qa/verify-topic-launch-policy.mjs` | CI: registry ⊆ curriculum, HIDE not visible, inventory blockers reflected |
| `tests/learning/launch-readiness-policy.test.mjs` | Unit tests for policy resolution |

### Registry row shape (proposed)

```json
{
  "subject": "hebrew",
  "grade": "g1",
  "topic": "reading",
  "launchLevel": "LIMITED",
  "surfaces": {
    "selfPractice": true,
    "parentAssign": true,
    "teacherAssign": true,
    "learningBookEntry": true
  },
  "diagnosticContribution": "thin",
  "bookFirstRecommended": true,
  "bookFirstSoftGateTopics": ["grammar", "comprehension"],
  "audioRequired": true,
  "marketingEligible": false,
  "marketingNoteInternal": "book-primary literacy; not standalone practice-first",
  "inventoryTarget": { "easy": 50, "medium": 40, "hard": 30, "topicTotal": 100 },
  "notes": "Supplemental to book batch A"
}
```

**`marketingEligible` / `marketingNoteInternal`:** Internal metadata only. Phase 1 must **not** change homepage, landing pages, curriculum transparency pages, public marketing copy, or public UI labels. Marketing consumption is a **future phase** with separate approval.

## Launch levels

| Level | Self-practice | Parent/teacher assign | Parent diagnostics (current engine) | `diagnosticContribution` (registry only) | Marketing metadata (internal) | Book-first / audio |
|-------|---------------|----------------------|-------------------------------------|------------------------------------------|----------------------------|-------------------|
| **FULL** | Visible | Visible | Normal; ≥8Q thresholds apply | `normal` | `marketingEligible: true` | Optional |
| **LIMITED** | Visible | Visible if inventory ≥ session min | Contributes; conclusions volume-gated | `thin` | `marketingEligible: true` + internal caveat | Recommended for literacy grades |
| **PRACTICE_ONLY** | Visible (may be book-recommended) | Blocked for typing/speaking/literacy-prep | Thin/manual; no strong weakness promotion | `manual_only` | `marketingEligible: false` | Required G1 Hebrew, G1–G2 English |
| **HIDE** | Not visible | Not visible | No evidence path | `excluded` | `marketingEligible: false` | N/A |

**Writing/speaking (all grades):** Default `PRACTICE_ONLY` + `diagnosticContribution: manual_only` unless validated automated grading exists.

## Policy consumers (when implemented)

| Consumer | Reads |
|----------|-------|
| `lib/teacher-portal/teacher-class-topic-options.js` | `surfaces.teacherAssign`, `launchLevel` |
| `lib/classroom-activities/assigned-activity-topic-options.js` | `surfaces.parentAssign` |
| Learning masters (`hebrew-master.js`, `english-master.js`, etc.) | `surfaces.selfPractice`, `bookFirstRecommended` |
| `scripts/qa/launch-readiness-matrix.mjs` | Registry instead of inline heuristics |
| **Not in scope until approved:** `lib/parent-server/report-data-aggregate.server.js` |

## Surface gate diagram

```
LaunchLevel ──► topic-launch-policy.js ──► surface gates
                    │
                    ├── self_practice (masters)
                    ├── parent_assign / teacher_assign (pickers)
                    ├── learning_book_entry (catalog)
                    ├── diagnostics metadata (registry only; NOT parent aggregate)
                    └── marketing metadata (registry only; NOT public UI in Phase 1)
```

---

# 3. Critical inventory blockers

**Source:** `reports/question-audit/QUESTION_INVENTORY_MATRIX.json` — exactly **5** `CRITICAL_BLOCKING` cells. No others.

| Cell | Count (e/m/h) | Root cause | Decision |
|------|---------------|------------|----------|
| `math:g4:prime_composite` | 0 / 0 / 0 | Generator emits **2-option** MCQ only (`utils/math-question-generator.js` ~3785); all 800 probe samples fail `auditMcqQuality` | **Author real content now** |
| `geometry:g1:transformations` | — / — / 0 hard | Hard band: 0 usable MCQs; topic total 2 | **Author real content now** |
| `geometry:g2:transformations` | — / — / 0 hard | Same | **Author real content now** |

**No temporary HIDE** for these topics — we have time; authoring is preferred.

## math:g4:prime_composite

| Field | Detail |
|-------|--------|
| **Problem** | Zero usable questions at all three levels |
| **Affected surfaces** | Self-practice, parent/teacher assign, diagnostics (if visible) |
| **Likely files** | `utils/math-question-generator.js`, `utils/math-animations.js`, `utils/math-question-metadata.js` |
| **Fix** | 4 distinct MCQ options; variant kinds: prime vs composite identification, factor count, smallest prime factor; use `finalizeMathMcqAnswerBundle` patterns from other ops |
| **Parent diagnostics** | Registry `diagnosticContribution: excluded` until inventory PASS, then `normal` — **parent aggregate unchanged until approved** |
| **Acceptance** | easy ≥50, medium ≥40, hard ≥30 usable; inventory matrix no `CRITICAL_BLOCKING` for cell |
| **Tests/audits** | `npm run qa:question-inventory-matrix`, `npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs`, `node --test tests/learning/math-mcq-answer-integrity.test.mjs` |

## geometry:g1:transformations and geometry:g2:transformations

| Field | Detail |
|-------|--------|
| **Problem** | Hard level 0 usable; easy/medium extremely thin (2 variants) |
| **Affected surfaces** | Self-practice, assign (requires diagram spec per assigned-activity audit) |
| **Likely files** | `utils/geometry-question-generator.js` (~1702), `utils/geometry-conceptual-bank.js`, `lib/learning-book/geometry-g1-registry.js` |
| **Fix** | 4-option MCQs (הזזה / שיקוף / סיבוב / ללא תנועה); diagram spec for assigned path; expand all bands to 50/40/30 |
| **Parent diagnostics** | `thin` until FULL thresholds |
| **Acceptance** | Usable per level; `scripts/audit-assigned-activity-topic-availability.mjs` PASS for cell |
| **Tests/audits** | Inventory matrix, assigned-activity audit, generated geometry samples with diagram check |

---

# 4. Hebrew G1 correction plan

## Current state

| Asset | Status |
|-------|--------|
| Learning book batch A | Strong: phoneme → letters → niqqud → simple words (`lib/learning-book/hebrew-g1-registry.js`) |
| Book audio | Pilot complete (32 pages × 7 sections); owner manual review pending |
| Practice master | Skips foundational sequence; jumps to word/grammar MCQ |
| Inventory | reading 49/25/23, comprehension 30/13/9, grammar 24/27/11 — below 50/40/30 |
| Grade rollup | PRACTICE_ONLY |

## Target

Coherent **soft book-first literacy path** — not a hard trap. Grade reaches **LIMITED** (book-primary) then **FULL** on supplemental MCQ topics after banks ship.

## Soft book-first model (clarification)

**Default and recommend** the book path for new learners. **Do not block all practice.**

| Behavior | Implementation intent |
|----------|----------------------|
| Default landing | Hebrew G1 master opens with book batch A recommended (banner/card, not forced redirect) |
| Always available | Vocabulary, writing, speaking remain accessible — marked supplemental |
| Soft gate | Grammar and comprehension topics show gentle prompt: "מומלץ להשלים קודם את פרקי האותיות בספר" with **Continue anyway** |
| No hard lock | Parent/student can choose practice-first; registry `bookFirstSoftGateTopics` not `bookFirstHardBlock` |
| Progress tracking | `lib/learning-book/hebrew-g1-literacy-progress.js` — tracks completed pages; informs recommendations only |

```
New learner ──► [Recommended] Book Batch A + audio
                    │
                    ├──► (optional) supplemental vocab/writing
                    │
                    └──► [soft prompt] grammar/comprehension ──► continue anyway OK
```

## Content plan by stage

| Stage | Book pages (existing) | New practice content | Modality | Target counts |
|-------|----------------------|----------------------|----------|---------------|
| 1 Phonemic | `g1.phoneme_awareness`, `g1.rhyme` | Sound match MCQ + audio items | book + practice | 15+ per kind |
| 2 Letters | `g1.syllables`, `g1.letters`, `g1.final_letters` | Letter ID, sound-letter | book + practice | 20+ |
| 3 Niqqud | `g1.basic_niqqud`, `g1.sound_letter_match` | Vowel discrimination | book + practice + audio | 20+ |
| 4 Words | `g1.simple_words_read`, `reading_word_level_early_*` | Reading MCQ | both | **50/40/30** |
| 5 Comprehension | comprehension book pages | Passage MCQ | both | **50/40/30** |
| 6 Grammar | grammar book batch | Light grammar MCQ | supplemental | **50/40/30** |
| Vocab/writing/speaking | existing | expand | PRACTICE_ONLY until ≥50 easy | 50+ easy |

## Files to author/update

- `lib/learning-book/hebrew-g1-literacy-progress.js` (new)
- `lib/learning-book/hebrew-g1-registry.js` (sequence links)
- `pages/learning/hebrew-master.js` (soft recommendation UI only — no layout redesign)
- `utils/hebrew-rich-question-bank.js`, `data/hebrew-literacy-g1/` (new pools)
- `utils/hebrew-question-generator.js` (literacy `patternFamily` routing)
- `data/launch-readiness/topic-launch-registry.json` (G1 rows)

## Diagnostics

- Registry: `diagnosticContribution: thin` for reading/grammar/comprehension until topic total ≥100
- **No parent aggregate changes** — rely on existing ≥8Q gate
- Writing/speaking: `manual_only` permanently

## Acceptance criteria

- [ ] G1 reading easy ≥50 usable unique MCQs
- [ ] Book batch A completable with audio playback verified
- [ ] Soft gate shows recommendation + continue; no full practice block
- [ ] Manual walkthrough: parent can choose book or practice without dead ends
- [ ] Inventory matrix: G1 reading/comprehension/grammar not `NEEDS_AUTHORING` at easy

---

# 5. Hebrew G2 correction plan

## Current state

| Topic | Count (e/m/h) | Total |
|-------|---------------|-------|
| reading | 12/11/8 | 31 |
| comprehension | 14/7/6 | 27 |
| grammar | 19/5/5 | 29 |
| vocabulary | 13/7/6 | 26 |
| writing/speaking | typing | PRACTICE_ONLY |

Book exists (`hebrew-g2-registry.js`); **no audio pilot**.

## Plan

| Action | Detail |
|--------|--------|
| Expand banks | All four MCQ topics → 50/40/30 |
| Book alignment | Map topics to registry batches A–E |
| Audio (Phase 3+) | Plan `HEBREW_G2_SECTION_AUDIO` after G1 owner review; follow section model |
| Writing/speaking | Remain PRACTICE_ONLY; `manual_only` |
| Launch target | Grade LIMITED → FULL on reading/comprehension/grammar |

## Files

`utils/hebrew-rich-question-bank.js`, `utils/hebrew-question-generator.js`, `docs/learning-book/hebrew/g2/drafts/`, `lib/learning-book/hebrew-g2-registry.js`

## Acceptance

- [ ] reading, comprehension, grammar each ≥50 easy
- [ ] Assigned activity audit PASS for all G2 Hebrew topics
- [ ] Registry: G2 `launchLevel: LIMITED` minimum; path to FULL documented

---

# 6. Hebrew G3–G6 correction plan

## Current state

Grade rollup **PRACTICE_ONLY** (thin banks + writing/speaking). Writing/speaking already blocked from assign (`assigned-activity-topic-options.js`).

## Priority order

1. **comprehension**
2. **reading**
3. **grammar**
4. **vocabulary**

## Per-grade weak topics and targets

| Grade | Weakest (total unique) | Target | Item type |
|-------|------------------------|--------|-----------|
| G3 | grammar 18, comprehension 24, vocabulary 21 | 100+ topic total, 50/40/30 | MCQ + book-linked passages |
| G4 | reading 12, grammar 21 | same | MCQ |
| G5 | reading 11, comprehension 24 | same | MCQ |
| G6 | reading 11, comprehension 24 | same | MCQ |

## Writing/speaking

- **PRACTICE_ONLY** all grades
- `diagnosticContribution: manual_only`
- No automated parent weakness conclusions
- Assign remains blocked G3+

## Authoring batch order

G3 comprehension → G3 reading → G4 reading → G5/G6 reading (parallel) → grammar/vocabulary backfill per grade

## Files

`utils/hebrew-rich-question-bank.js`, `utils/hebrew-question-generator.js`, `data/hebrew-curriculum.js`, book registries g3–g6

## QA artifacts

`docs/qa/_artifacts/hebrew-bank-g{3-6}/` sample JSON per grade; `npm run qa:hebrew:topic-visibility` (if exists); inventory matrix

## Tests to add

- Per-grade pool count test: `tests/learning/hebrew-bank-coverage-g3.test.mjs` (and g4–g6)
- Inventory cell status regression for core Hebrew topics

---

# 7. English G1–G2 correction plan

## Current state

- G1: vocabulary only (11 MCQ items); no letters/sounds/phonics/listening
- G2: vocab 9, translation **1**, writing typing — no phonics path
- No English G1/G2 audio
- Grade rollup: **PRACTICE_ONLY**
- Vocabulary flashcards are **not** full literacy

## Target path

**Book first, then practice banks** — both required for launch-ready literacy. Grades stay **PRACTICE_ONLY** in registry until phonics path + approved audio ship.

**Do not HIDE** grades from selector — book path has value. **Do** set `marketingEligible: false` internally until phonics verified (no public marketing changes until approved).

## Phase 4a — Content map approval (before any audio generation)

**English G1/G2 audio must not be generated until this package is owner-approved.**

### Required approval artifacts

Create `docs/qa/ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md` containing:

| Section | Must define |
|---------|-------------|
| **Letters/sounds scope** | A–Z coverage, upper/lowercase, letter names, consonant/vowel sounds, CVC scope for G2 |
| **Book page list** | Final `pageId` list per grade with batch order (inserted **before** existing vocab batches) |
| **Question types** | MCQ letter ID, audio listen-and-choose, picture-word match, `questionType: audio` listening tasks |
| **Audio script text** | Hebrew/English script per book section (7 sections/page convention) |
| **Audio manifest structure** | Scope entries in `learning-book-audio-manifest.js`; cache version; file naming |

### Proposed book pages (draft — requires owner approval)

| Unit | G1 pageIds (proposed) | G2 additions (proposed) |
|------|----------------------|-------------------------|
| Letters | `letters_upper`, `letters_lower`, `letters_match` | review + `letters_order` |
| Sounds | `phonics_sounds`, `phonics_first_sound` | `phonics_blending` |
| First words | `first_words_cvc`, `picture_word_match` | `first_words_phrases` |
| Listening | `listening_classroom`, `listening_commands` | `listening_dialogue_short` |

### Proposed practice banks (after book approval)

| Pool file | Min items | Audio |
|-----------|-----------|-------|
| `data/english-questions/phonics-g1.js` | 50 easy letter/sound | `requiresAudio: true` on listen items |
| `data/english-questions/phonics-g2.js` | 50 easy + blend | same |
| Existing vocab pools | expand | optional |

## Phase 4b — Implementation (after content map approved)

- Update `lib/learning-book/english-g1-registry.js`, `english-g2-registry.js`
- Author drafts under `docs/learning-book/english/g1/drafts/`, `g2/drafts/`
- Extend `utils/english-question-generator.js`
- **Only then:** add manifest scopes + run `scripts/generate-learning-book-audio.mjs`

## Acceptance criteria

- [ ] Content map owner-approved
- [ ] Book pages authored for approved list
- [ ] Phonics practice ≥50 easy G1, ≥50 easy G2
- [ ] `scripts/verify-learning-book-audio.mjs` PASS for English G1/G2
- [ ] Registry: G1/G2 remain PRACTICE_ONLY until all above PASS; then reassess LIMITED
- [ ] Translation G2 blocked from assign until pool ≥50

---

# 8. English G3–G6 correction plan

## Current state

| Grade | FULL today | Critical gap |
|-------|-----------|--------------|
| G3 | grammar | translation **1**, sentences 34, vocab 35 |
| G4 | grammar, sentences | translation **1**, vocab 30 |
| G5 | grammar | translation **1**, sentences 35, vocab 36 |
| G6 | grammar, sentences, vocab | translation **1** |

**Cross-grade blocker:** `TRANSLATION_POOLS` in `data/english-questions/index.js` — essentially one item reused per grade UI level.

## Plan

| Priority | Action |
|----------|--------|
| P0 | Expand translation pools: ≥50 easy per grade G2–G6 (grade-gated via `utils/grade-gating.js`) |
| P1 | Sentences/vocab → 50/40/30 where below threshold |
| P2 | Grammar maintenance (already strong G3–G6) |

## Writing

PRACTICE_ONLY all grades; assign blocked; `manual_only`

## Files

`data/english-questions/index.js`, `data/english-questions/translation-*.js` (new band files), `utils/english-question-generator.js`, `utils/grade-gating.js`

## QA gates

- Translation count test per grade in `tests/learning/english-translation-pool-coverage.test.mjs`
- Assigned-activity audit: translation medium/hard count=5 PASS
- Inventory matrix: translation cells not `NEEDS_AUTHORING` at easy

---

# 9. Geometry correction plan

## Current state

All grades **LIMITED**. Strong: area, perimeter, volume, angles (G5–G6). Weak: transformations, parallel_perpendicular, triangles, quadrilaterals, symmetry, rotation, circles, solids (varies by grade).

## Topic tiering

| Tier | Topics | Action |
|------|--------|--------|
| **Maintain FULL** | area, perimeter, volume (G4–G6), angles (G5–G6) | Regression tests only |
| **Author now** | transformations (G1–G2), parallel_perpendicular, triangles, quadrilaterals, symmetry, rotation, circles, solids, pythagoras (if thin) | 50/40/30 + ≥100 topic total |
| **LIMITED floor** | tiling, heights | 30+ per level until diagram variants rich |

## Diagram requirement

Assigned activities require `getGeometryDiagramSpec()` — every authored topic must pass `scripts/audit-assigned-activity-topic-availability.mjs`.

## Files

`utils/geometry-question-generator.js`, `utils/geometry-conceptual-bank.js`, `lib/learning-book/geometry-book-practice-map.js`, geometry registries g1–g6

## Acceptance

- [ ] 0 `CRITICAL_BLOCKING` geometry cells
- [ ] Conceptual topics ≥3 variant kinds per inventory cell notes
- [ ] Diagram audit 100% for assigned surfaces on authored topics
- [ ] Visual diagram manual check for 10 samples per thin topic

---

# 10. Science correction plan

## Current state

All grades **LIMITED**. Technical audit clean; volume thin especially G1–G4 easy bands.

## Priority: G1–G4 first

| Grade | Topics | Current easy | Target |
|-------|--------|--------------|--------|
| G1 | body, animals, plants, materials, earth_space, environment | 8–17 | 50 each |
| G2 | + experiments | 8–19 | 50 each |
| G3 | body (uneven bands), animals, plants, environment | 6–58 | balanced 50/40/30 |
| G4 | body, animals, materials, earth_space, environment | 5–14 | 50/40/30 |

## Content quality rule

Each batch must include **conceptual** stems (cause/effect, compare, apply) — not trivia only. Tag `cognitiveLevel` in `data/science-questions.js` params.

## Practice-only consideration

No HIDE. materials/earth_space/environment G1–G2 stay **LIMITED** (not FULL) until assign count=5 reliable at medium/hard.

## Files

`data/science-questions.js`, batch import scripts as needed

## QA

Per-grade sample JSON; assigned-activity audit for G1–G2 thin topics; inventory matrix science section

---

# 11. Moledet / Geography correction plan

## Current state

- **G1:** Empty curriculum → **HIDE** (confirm in registry; no spine leak)
- **G2–G6:** LIMITED; generator variant pools often <100 per cell (e.g. g3 homeland 44 easy)

## Plan

| Action | Detail |
|--------|--------|
| G1 | Registry `HIDE`; no topics on any surface |
| G2–G4 | Expand `moledet-geography-question-generator.js` variant **kinds** (not paraphrase-only) |
| G5–G6 | Align to `geography-g5-registry.js`, `geography-g6-registry.js` |
| Static enrichment | `data/geography-questions/` where generator thin |
| Diagnostics | Civic topics `thin` until FULL; values/maps PRACTICE_ONLY if depth low |

## Acceptance

- [ ] Procedural pool ≥100 variants per cell OR static bank 50/40/30
- [ ] G1 moledet absent from all pickers and masters
- [ ] Inventory: no `CRITICAL_BLOCKING` moledet cells

---

# 12. Parent diagnostics safety plan

## No engine changes in this program

Parent report aggregation, copy, and API shape remain unchanged. Launch registry `diagnosticContribution` is **metadata only** — not consumed by `lib/parent-server/` until separate approval.

## Existing safeguards (verify in Phase 8)

| Safeguard | Location |
|-----------|----------|
| Source filter | `lib/learning/diagnostic-evidence-contract.js` — only `free_practice`, `assigned_parent` |
| Topic conclusion gate | `utils/parent-report-topic-evidence.js` — ≥8 questions |
| Mode weights | `lib/learning/activity-classification.js` — book/guided = 0 |
| Metadata flags | `lib/learning/diagnostic-metadata-subskill-flag.js` — all OFF |

## Launch level → expected behavior (verification matrix)

| Launch level | Registry `diagnosticContribution` | What to verify (no code change) |
|--------------|-----------------------------------|--------------------------------|
| FULL | `normal` | Evidence accumulates; conclusions appear only at ≥8Q |
| LIMITED | `thin` | Evidence accumulates; band stays low until 12–40Q |
| PRACTICE_ONLY | `manual_only` | Few answers → topic row stays thin; no false weakness |
| HIDE | `excluded` | No questions → no evidence |

## Phase 8 verification

Re-run `node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs` with seeded G1 Hebrew + G1 English practice sessions. Confirm no topic conclusions below threshold. Document results in `docs/qa/_artifacts/parent-report-launch-safety/`.

## Risks if registry metadata were consumed prematurely

- Downweighting valid practice evidence without owner approval
- Empty or contradictory parent report sections
- **Mitigation:** Explicit import ban from launch-readiness into parent-server until Phase 9+ approval

---

# 13. Audio plan

## Mandatory before full launch

| Scope | Status | Generation allowed? |
|-------|--------|-------------------|
| Hebrew G1 book | Pilot complete (224 MP3s); owner review pending | Already generated |
| English G1 book | Not started | **Only after content map approved (§7)** |
| English G2 book | Not started | **Only after content map approved (§7)** |

## Recommended

| Scope | Notes |
|-------|-------|
| Hebrew G2 book | After G1 owner sign-off on audio quality |
| Early reading book sections | Hebrew G1 practice listen items |

## Technical conventions (existing)

- Key format: `{subject}:{grade}:{pageId}:section:{NN}`
- Manifest: `lib/learning-book/audio/learning-book-audio-manifest.js`
- Generation: `scripts/generate-learning-book-audio.mjs` (`LEARNING_BOOK_AUDIO_ENABLED=true`)
- Verification: `scripts/verify-learning-book-audio.mjs`, `tests/learning/learning-book-audio.test.mjs`
- Question-level: `requiresAudio: true` in canonical metadata for phonics/listening practice items

## English G1/G2 audio gate (mandatory sequence)

```
1. Owner approves ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md
2. Book draft pages written
3. Audio script text finalized per section
4. Manifest structure added (scopes only, no MP3 gen)
5. Owner approves scripts
6. Run generate-learning-book-audio.mjs
7. Run verify-learning-book-audio.mjs
```

**Do not skip steps 1–5.**

## Fallback behavior

- If audio missing for mandatory scope: item blocked from FULL/assign; book player shows existing "נדרש שמע" pattern
- Do not silently degrade mandatory grades to text-only

---

# 14. Implementation phases

## Phase 0 — Baseline freeze

| Item | Detail |
|------|--------|
| Actions | `git status`, `git diff --stat`; confirm input reports dated 2026-06-08 |
| Product changes | **None** |
| Acceptance | This document approved |
| Rollback | N/A |

## Phase 1 — Central launch-readiness model ✓ COMPLETE

| Item | Detail |
|------|--------|
| Actions | Create `lib/launch-readiness/*`, seed `topic-launch-registry.json` from matrix JSON, wire topic pickers, add verify script + unit tests |
| Registry fields | Include `diagnosticContribution`, `marketingEligible` (internal only) |
| Must NOT change | Parent aggregate, SQL, diagnostic flags, homepage/landing/curriculum/marketing copy, public UI labels |
| Files likely to change | See §16 |
| Tests | `node --test tests/learning/launch-readiness-policy.test.mjs`, `npx tsx scripts/qa/verify-topic-launch-policy.mjs` |
| Acceptance | All curriculum cells have registry row; HIDE topics absent from pickers; no parent-server imports |
| Rollback | Remove launch-readiness module; pickers revert to curriculum-only |
| **Verified** | 2026-06-08 — policy verify PASS; no parent-server launch-readiness imports; flags OFF |

## Phase 2 + 2B — Critical blockers + verification cleanup ✓ COMPLETE

| Item | Detail |
|------|--------|
| Actions | Fix `prime_composite` 4-option MCQ; fix geometry G1/G2 transformations all bands; close MCQ/integrity audit tails |
| Files | `utils/math-question-generator.js`, `utils/geometry-question-generator.js`, `utils/geometry-conceptual-bank.js` |
| Tests | Inventory matrix, MCQ option-count, math MCQ integrity, assigned-activity audit |
| Acceptance | 0 `CRITICAL_BLOCKING` cells; MCQ obvious-answer PASS; integrity PASS |
| Rollback | Revert generator commits; registry marks topics LIMITED until fixed |
| **Verified** | 2026-06-08 — `CRITICAL_BLOCKING: 0`; audits PASS; build passes |

## Phase 3 + 3B + 3C — Hebrew G1/G2 literacy path ✓ COMPLETE

| Item | Detail |
|------|--------|
| Actions | Soft book-first progress; G1/G2 literacy banks; integrity cleanup; G2 reading easy micro-close (55/50) |
| Must NOT | Hard-block all practice; parent report changes; English work; G2/English audio generation |
| Acceptance | §4 + §5 criteria; scoped 50/40/30 per-level targets closed; writing/speaking `PRACTICE_ONLY` |
| Rollback | Disable progress module; banks remain but gating off |
| **Verified** | 2026-06-08 — see [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md) |

## Phase 4 — English G1/G2 foundational path ⏸ PAUSED (not started)

| Item | Detail |
|------|--------|
| Phase 4a | Content map doc + owner approval — **no audio generation** — **NEXT STEP when approved** |
| Phase 4b | Book pages, practice banks, manifest, **then** audio generation — **blocked until 4a approved** |
| Acceptance | §7 criteria |
| Rollback | Remove phonics pages from registry; vocab-only path unchanged |
| **Status** | **Not started.** Requires `ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md` before any implementation or audio generation. |

## Phase 5 — Hebrew G3–G6 bank expansion

| Item | Detail |
|------|--------|
| Actions | Batch author comprehension → reading → grammar → vocabulary |
| Acceptance | Each grade ≥4 topics at 50/40/30 |
| Rollback | Per-batch git revert |

## Phase 6 — English G3–G6 bank expansion

| Item | Detail |
|------|--------|
| Actions | Translation pool overhaul; sentences/vocab top-up |
| Acceptance | Translation ≥50 easy per grade G2–G6 |
| Rollback | Per-pool revert |

## Phase 7 — Geometry / Science / Moledet depth

| Item | Detail |
|------|--------|
| Actions | §9–§11 authoring by priority |
| Acceptance | `NEEDS_AUTHORING` count ↓50%+ from baseline 382 |
| Rollback | Per-subject revert |

## Phase 8 — Final launch QA

| Item | Detail |
|------|--------|
| Audits | Launch matrix, inventory matrix, MCQ obvious-answer, bank integrity, metadata validator |
| Smoke | Parent Q1 simulation, assigned-activity audit, `npm run build` |
| Manual | Mobile literacy paths, audio, RTL checklist |
| Acceptance | 0 `CRITICAL_BLOCKING`; 0 MCQ WARN; 0 leakRisk; inventory `READY` or documented LIMITED-only grades |
| Rollback | Phase-specific |

---

# 15. Approvals, file lists, and gates

## A. Documentation approval

| Item | Status |
|------|--------|
| Launch readiness reports accepted as baseline | Approved 2026-06-08 |
| This master plan direction | **Approved** |
| Phases 1–3C implementation | **Complete and verified** 2026-06-08 |
| `ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md` | **Not yet written** — required before Phase 4a/4b |
| Hebrew G1 soft-gate UX wording | Implemented (Phase 3); owner copy review optional |

## B. Implementation approval

**Phases 1–3C:** Implemented and verified (2026-06-08). Working tree uncommitted.

**Phases 4–8:** Not granted. Pause at safe checkpoint before English work.

Completed implementation checklist:

- [x] Phase 1 module location confirmed (`lib/launch-readiness/*`)
- [x] No parent-server consumption of launch registry (verified by test)
- [x] No public marketing UI changes in Phases 1–3C
- [x] Phase 2 authoring complete (no HIDE for blockers; `CRITICAL_BLOCKING: 0`)
- [x] Hebrew G1/G2 scoped literacy targets closed (Phase 3B/3C)
- [ ] English content map approved before Phase 4a/4b
- [ ] Phase 4 implementation approval (separate step)

## C. Owner approval required before each phase

| Phase | Owner must approve |
|-------|-------------------|
| **0** | Baseline reports fresh |
| **1** | SSOT module paths; picker wiring scope; no parent/marketing consumption |
| **2** | prime_composite + transformations authoring approach |
| **3** | Hebrew G1 soft book-first UX; G1 literacy bank scope |
| **4a** | English phonics content map (no audio yet) |
| **4b** | Audio scripts + manifest structure; then generation |
| **5** | Hebrew G3–G6 batch priority order |
| **6** | English translation expansion scope |
| **7** | Geometry/Science/Moledet priority tiers |
| **8** | Launch gate sign-off |

---

## Recommended next step (post–Phase 3C pause)

**Phase 4A — English G1/G2 phonics content map** (planning only; no implementation, no audio generation).

Phases 1–3C are complete. Do not open Phase 4B until the content map is written and owner-approved.

---

## Exact files to inspect before coding (Phase 1)

| File | Why |
|------|-----|
| `lib/teacher-portal/teacher-class-topic-options.js` | Topic picker wiring |
| `lib/classroom-activities/assigned-activity-topic-options.js` | Assign picker wiring |
| `scripts/lib/qa-curriculum-matrix.mjs` | Curriculum cell enumeration |
| `docs/qa/_artifacts/launch-readiness/launch-readiness-matrix.json` | Seed data |
| `lib/learning/diagnostic-evidence-contract.js` | Confirm no coupling |
| `lib/parent-server/report-data-aggregate.server.js` | Confirm no imports added |
| `scripts/lib/qa-inventory-professional.mjs` | Threshold constants |

---

## Exact files likely to change in Phase 1

| File | Change |
|------|--------|
| `lib/launch-readiness/topic-launch-policy.js` | **New** — SSOT |
| `lib/launch-readiness/launch-surfaces.js` | **New** — surface enum |
| `data/launch-readiness/topic-launch-registry.json` | **New** — curated rows |
| `lib/teacher-portal/teacher-class-topic-options.js` | Read policy for HIDE/filter |
| `lib/classroom-activities/assigned-activity-topic-options.js` | Read policy |
| `scripts/qa/verify-topic-launch-policy.mjs` | **New** — CI gate |
| `scripts/qa/launch-readiness-matrix.mjs` | Read registry vs heuristics |
| `tests/learning/launch-readiness-policy.test.mjs` | **New** — unit tests |

**Phase 1 must NOT change:** `lib/parent-server/*`, homepage/landing/curriculum pages, SQL, `diagnostic-metadata-subskill-flag.js` consumption, public marketing strings.

---

## Exact tests to run (Phase 1)

```powershell
node --test tests/learning/launch-readiness-policy.test.mjs
npx tsx scripts/qa/verify-topic-launch-policy.mjs
npx tsx scripts/qa/launch-readiness-matrix.mjs
node --test tests/learning/activity-classification.test.mjs
npm run build
```

**Phase 1 acceptance:** All tests PASS; verify script reports 0 HIDE leaks on pickers; `grep` confirms no `launch-readiness` imports in `lib/parent-server/`.

---

## Do-not-touch list (all phases)

- `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED`, `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED`, `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED`
- `lib/learning/diagnostic-metadata-subskill-flag.js` consumption paths
- `lib/parent-server/report-data-aggregate.server.js` and Q2E PDF pipelines (unless separate Phase 9+ approval)
- SQL migrations / Supabase schema
- Homepage, landing pages, curriculum transparency pages, public marketing copy (Phase 1 explicitly)
- UI layout/CSS redesign
- Scattered per-topic HIDE outside `topic-launch-policy.js`

---

## Open decisions (owner input needed)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Hebrew G1 soft-gate copy | Hebrew prompt text for grammar/comprehension | Short recommendation + "המשך בכל זאת" |
| 2 | English G1/G2 phonics page list | Proposed pageIds in §7 | Owner edit before Phase 4a |
| 3 | Hebrew G2 audio timing | With Phase 3 vs after G1 audio review | After G1 owner audio review |
| 4 | Science G1–G2 FULL vs LIMITED | Promote to FULL when 50/40/30 met | LIMITED until medium/hard assign reliable |
| 5 | Moledet G5–G6 book-only topics | Practice generator vs book-only | Author generator variants first |
| 6 | When to wire `diagnosticContribution` to parent aggregate | Phase 9+ separate program | Defer until flags + content ready |

---

## Appendix: Grade rollup summary (launch targets)

| Subject | G1 | G2 | G3 | G4 | G5 | G6 | Target end state |
|---------|----|----|----|----|----|----|------------------|
| Math | FULL | FULL | FULL | FULL* | FULL | FULL | *fix prime_composite |
| Geometry | LIMITED | LIMITED | LIMITED→FULL core | LIMITED→FULL | LIMITED→FULL | LIMITED→FULL | Author conceptual topics |
| Hebrew | PRACTICE_ONLY→LIMITED | LIMITED→FULL | PRACTICE_ONLY→LIMITED | PRACTICE_ONLY→LIMITED | PRACTICE_ONLY→LIMITED | PRACTICE_ONLY→LIMITED | Banks + soft book G1 |
| English | PRACTICE_ONLY | PRACTICE_ONLY→LIMITED | LIMITED→FULL | LIMITED→FULL | LIMITED→FULL | LIMITED→FULL | Phonics G1/G2 first |
| Science | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | G1–G4 depth first |
| Moledet/Geo | HIDE | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | Variant expansion |

---

## Diagnostic Visible Impact Addendum — 2026-06-08

**Scope boundary:** This addendum does not rewrite or supersede the Launch Correction content/inventory plan above. It records a **separate, approved track** for diagnostic parent-report flags.

| Track | Status |
| --- | --- |
| Launch Correction (content / inventory / topic policy) | **Unchanged** — Phases 1–3C remain as documented; English Phase 4 **not started** |
| Diagnostic Flags Visible Impact (parent report B/C/D) | **Phases 1–3 complete** — see `docs/qa/DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md` |

**Gate results (visible-impact track):**

- Build — **PASS**
- Regression — **PASS**
- Browser QA — **PASS**
- PDF QA — **PASS**
- Leak scan — **PASS**

**Activation (owner-approved 2026-06-08):**

```env
DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true          # staging only
DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true     # staging only
DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false # remains OFF
```

- **B+C:** approved for **staging only** (not production).
- **D (promotion):** remains **OFF** — no promotion activation.
- **Production** activation of B or C requires **additional explicit owner approval**.
- No school/classroom scope; no new Hebrew copy; no production deploy in this decision.

The do-not-touch list (§ above) still applies to **Launch Correction phases**; the visible-impact work was executed and gated on a separate approval path and does not change content/inventory phase status.

---

*End of Launch Correction Master Plan. Implementation begins only after per-phase owner approval (§15.C).*
