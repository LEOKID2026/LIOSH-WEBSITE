# English G1/G2 Phase 4B — Implementation Plan

**Document date:** 2026-06-09  
**Phase:** **4B planning only** — no implementation in this deliverable  
**Status:** Awaiting owner approval before Phase 4B **execution**  
**Upstream artifact (approved):** [`ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md`](ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md) (Phase 4A)  
**Master plan:** [`LAUNCH_CORRECTION_MASTER_PLAN.md`](LAUNCH_CORRECTION_MASTER_PLAN.md) §7

---

## Planning vs execution — read first

| | **Phase 4B planning (this document)** | **Phase 4B execution (future — not started)** |
|---|--------------------------------------|-----------------------------------------------|
| **Purpose** | Translate approved 4A content map into an ordered, file-level blueprint | Apply code, content, audio, banks, registry changes |
| **Owner gate** | Approve **this plan** to unlock execution planning review | Separate **execution approval** required before any code/audio/bank work |
| **Allowed now** | Write and review this `.md` file only | — |
| **Forbidden now** | Code, drafts, registries, manifest, audio, banks, product behavior, parent report, diagnostic flags | — |
| **Outcome** | Signed-off sequence for a future implementer | Shippable English G1/G2 phonics path |

**This task creates only this document.** Nothing in the “execution” column is performed by writing this plan.

---

## 1. Baseline and constraints

### Phase 4A approved

The owner approved [`ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md`](ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md), which defines:

- G1/G2 phonics scope
- 12 G1 + 11 G2 proposed book pages (`pageId`, batches, practice types, audio requirements)
- Launch-readiness policy (conservative LIMITED; FULL only with book + audio + practice + QA)
- Diagnostic safety rules while flags are partially ON

Phases **1–3C** remain complete and pushed per [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md).

### Diagnostic flag baseline (unchanged — do not modify in planning or execution without owner gate)

| Flag | Value |
|------|-------|
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | **`true` (ON)** |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | **`true` (ON)** |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | **`false` (OFF)** |

Runtime: `lib/learning/diagnostic-metadata-subskill-flag.js` (`process.env.* === "true"`).

### What Phase 4B planning does and does not do

**Does (now):**

- Document exact future file touch list, sequences, QA gates, rollback, and stop conditions

**Does not (now or implied by this doc alone):**

- Implement code, English question banks, curriculum edits, registry/manifest edits
- Generate audio or add MP3 assets
- Change parent report logic or diagnostic flag behavior
- Commit, push, or start Phase 4C

**Phase 4B planning does not start implementation.** Owner must explicitly approve **execution** as a separate step after reviewing this plan.

---

## 2. Exact implementation scope for later execution

The following describes what **future execution** would add or change. **None of this is performed by creating this plan.**

### English G1 phonics book pages (12 pages, 4 batches)

Insert **before** existing vocab batches in `english-g1-registry.js`:

| Batch | pageIds |
|-------|---------|
| `phonics-a` | `letters_upper`, `letters_lower`, `letters_match`, `letter_names` |
| `phonics-b` | `phonics_sounds`, `phonics_first_sound` |
| `phonics-c` | `classroom_words`, `first_words_simple`, `first_words_cvc` |
| `phonics-d` | `picture_word_match`, `listening_classroom`, `listening_commands` |

Existing batches A–C (vocab, grammar) remain; batch C stays **last** (enrichment only until phonics complete).

### English G2 phonics-review book pages (11 pages, 1 batch)

Insert batch **`phonics-review`** before existing batch A:

`letters_review`, `letters_order`, `phonics_sounds_review`, `phonics_blending`, `sound_letter_match`, `first_word_reading`, `word_families_cvc`, `classroom_vocab_g2`, `listening_comprehension`, `picture_audio_word_match`, `early_sentences_exposure`

Existing batches A–D (vocab, grammar, translation) shift downstream.

### Book registry ordering

- Prepend phonics batches in `lib/learning-book/english-g1-registry.js` and `english-g2-registry.js`
- Regenerate/update `lib/learning-book/english-page-skill-index.js` entries for all 23 new pages
- Extend `lib/learning-book/english-book-practice-map.js` for phonics skill IDs and optional book→practice links

### Future audio manifest entries

- Add `ENGLISH_G1_SECTION_AUDIO` and `ENGLISH_G2_SECTION_AUDIO` scopes to `lib/learning-book/audio/learning-book-audio-manifest.js`
- **84** G1 section slots (12 pages × 7) + **77** G2 slots (11 × 7)
- Keys: `english:g1:{pageId}:section:{NN}`; paths: `/audio/learning-books/english/g1/{pageId}/section-{NN}.mp3`

### Future phonics/audio assets

- Book section MP3 under `public/audio/learning-books/english/{g1|g2}/{pageId}/`
- Optional practice clips under `/audio/english/phonics/{grade}/…` (see 4A §7)
- Generated only after **script approval** and **execution approval** via `scripts/generate-learning-book-audio.mjs`

### Future practice bank pools

- `data/english-questions/phonics-g1.js` — ≥50 easy unique items
- `data/english-questions/phonics-g2.js` — ≥50 easy unique items
- Export via `data/english-questions/index.js`; wire `phonics` topic in curriculum + generator

### Future generator / metadata hooks

- Route `topic === "phonics"` in `utils/english-question-generator.js`
- Nine item types from 4A §6 (letter match, listen-and-choose, picture-word, etc.)
- Metadata via `lib/learning/english-canonical-metadata.js`: `requiresAudio`, `bookPageRef`, `manual_only` / thin-safe contribution

### Launch-readiness registry updates

- New rows: `english:g1:phonics`, `english:g2:phonics`
- Update `lib/launch-readiness/compute-launch-row.js` English G1/G2 rules
- Rebuild `data/launch-readiness/topic-launch-registry.json` and matrix docs

### QA scripts and tests

- Extend `scripts/verify-english-final-sync.mjs`, `scripts/verify-learning-book-audio.mjs`
- New pool coverage test; extend integrity/MCQ audits
- Parent-report smoke with flags ON + English phonics-only fixture

### Optional (recommended at execution — not required for book-only internal checkpoint)

- `lib/learning-book/english-g1-literacy-progress.js` — soft book-first gate mirroring `hebrew-g1-literacy-progress.js`
- Minimal `phonics` topic surface in `pages/learning/english-master.js` (no UI redesign)

---

## 3. Proposed file-by-file change plan

Legend: **Risk** = low / medium / high. **Copy** = Hebrew/user-facing copy approval. **Audio** = audio script/recording approval before generation.

### Book registries

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `lib/learning-book/english-g1-registry.js` | Modify | Prepend phonics-a–d batches | Medium | No | No |
| `lib/learning-book/english-g2-registry.js` | Modify | Prepend phonics-review batch | Medium | No | No |
| `lib/learning-book/english-page-skill-index.js` | Modify | Skill metadata for 23 new pageIds | Medium | Yes (titles/scope) | No |
| `lib/learning-book/english-book-practice-map.js` | Modify | Phonics skill-id parsing; practice targets | Medium | No | No |
| `lib/learning-book/english-g1-literacy-progress.js` | Create (optional) | Soft gate before grammar/vocab master topics | Medium | Yes | No |

### Book page content / drafts

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `docs/learning-book/english/g1/drafts/{12 pageIds}.md` | Create | G1 phonics book content (7 sections each) | Medium | **Yes** | No (text only) |
| `docs/learning-book/english/g2/drafts/{11 pageIds}.md` | Create | G2 phonics-review content | Medium | **Yes** | No (text only) |

Draft convention: match existing `vocab_colors.md` metadata + sections 1–7.

### English question pools

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `data/english-questions/phonics-g1.js` | Create | G1 phonics practice pool | **High** | Yes (stems) | **Yes** (listen items) |
| `data/english-questions/phonics-g2.js` | Create | G2 phonics practice pool | **High** | Yes | **Yes** |
| `data/english-questions/index.js` | Modify | Export `PHONICS_POOLS` | Medium | No | No |
| `data/english-curriculum.js` | Modify | Add `phonics` to G1/G2 `topics[]` | Medium | Yes (summary text) | No |

### English generator

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `utils/english-question-generator.js` | Modify | `phonics` topic routing + 9 item types | **High** | Yes | **Yes** |
| `lib/learning/english-canonical-metadata.js` | Modify | Phonics question types + metadata contract | **High** | No | No |
| `lib/learning/question-metadata-validator.js` | Modify | Validate phonics pool rows | Medium | No | No |
| `pages/learning/english-master.js` | Modify | Expose `phonics` topic for G1/G2 | Medium | Yes | No |

### Metadata / normalizer hooks

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `utils/diagnostic-question-contract.js` | Modify (if needed) | Ensure phonics items stay manual_only/thin | Medium | No | No |
| `utils/grade-gating.js` | Modify (if needed) | Grade-gate phonics pools | Low | No | No |

No changes to `lib/parent-server/` or diagnostic flag modules.

### Audio manifest and prep

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `lib/learning-book/audio/learning-book-audio-manifest.js` | Modify | English G1/G2 section scopes | Medium | No | **Yes** (before edit) |
| `lib/learning-book/audio/prepare-english-book-audio-text.js` | Create | Section TTS script extraction | Medium | **Yes** | **Yes** |
| `lib/learning-book/audio/prepare-learning-book-audio-text.js` | Modify | Dispatch English prep | Low | No | No |
| `scripts/generate-learning-book-audio.mjs` | Modify | Generate English MP3 | Medium | No | **Yes** |
| `scripts/verify-learning-book-audio.mjs` | Modify | Verify English scopes | Low | No | No |
| `data/english-audio/phonics-manifest.json` | Create (optional) | Practice-item audio index | Low | No | **Yes** |
| `public/audio/learning-books/english/**` | Create | Section MP3 files | Low | No | **Yes** |

**Gate:** No manifest edit until execution approval. No generation until script approval.

### Launch readiness registry

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `lib/launch-readiness/compute-launch-row.js` | Modify | `phonics` topic launch rules | Medium | No | No |
| `data/launch-readiness/topic-launch-registry.json` | Modify | New phonics rows | Medium | No | No |
| `scripts/launch-readiness/build-topic-launch-registry.mjs` | Run | Rebuild registry | Low | No | No |
| `docs/qa/LAUNCH_READINESS_MATRIX.md` | Regenerate | Published matrix | Low | No | No |

### Tests

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `tests/learning/english-phonics-g1-registry.test.mjs` | Create | Registry order + draft existence | Low | No | No |
| `tests/learning/english-phonics-pool-coverage.test.mjs` | Create | ≥50 easy per grade | Low | No | No |
| `tests/learning/learning-book-audio.test.mjs` | Modify | English manifest keys | Low | No | No |
| `tests/learning/launch-readiness-policy.test.mjs` | Modify | Phonics row policy | Low | No | No |
| `tests/learning/english-canonical-metadata.test.mjs` | Modify | Phonics metadata contract | Low | No | No |
| `tests/learning/mcq-four-options-integrity.test.mjs` | Modify (if needed) | Phonics MCQ 4-option rule | Low | No | No |

### QA scripts

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `scripts/verify-english-final-sync.mjs` | Modify | New page/batch counts | Low | No | No |
| `scripts/qa/system-health-question-bank-integrity-audit.mjs` | Modify | Include phonics pools | Medium | No | No |
| `scripts/qa/system-health-mcq-option-count-audit.mjs` | Modify | Phonics option counts | Low | No | No |
| `scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs` | Modify | Obvious-answer scan | Low | No | No |
| `scripts/qa/english-phonics-parent-report-fixture.mjs` | Create | Phonics-only session fixture | Medium | No | No |
| `scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs` | Run (gate) | Pre-ship smoke with flags ON | Medium | No | No |
| `scripts/audit-assigned-activity-topic-availability.mjs` | Run | Assign surface check | Low | No | No |

### Documentation (post-execution updates)

| File | Action | Purpose | Risk | Copy | Audio |
|------|--------|---------|------|------|-------|
| `docs/qa/LAUNCH_CORRECTION_PROGRESS.md` | Modify | Record 4B execution status | Low | No | No |
| `docs/qa/LOWER_GRADES_LITERACY_AUDIT.md` | Modify | Refresh English G1/G2 assessment | Low | No | No |

Proposed script artifact (execution): `docs/qa/_artifacts/english-phonics-audio-scripts/` — owner-approved TTS text before generation.

---

## 4. Book implementation sequence

**Execution order only — not performed in this planning phase.**

```text
A. Author G1 phonics drafts (12 × 7 sections) under docs/learning-book/english/g1/drafts/
B. Author G2 phonics-review drafts (11 × 7 sections) under docs/learning-book/english/g2/drafts/
C. Update english-g1-registry.js — prepend phonics-a, phonics-b, phonics-c, phonics-d
D. Update english-g2-registry.js — prepend phonics-review; preserve existing A–D pageIds
E. Update english-page-skill-index.js (+ optional english-g1-literacy-progress.js)
F. Run scripts/verify-english-final-sync.mjs — must PASS
G. Run verify-learning-book-sequence-lib checks (via verify-english-final-sync)
H. Manual spot-check: existing vocab drafts still load; no pageId collisions
```

**Rules:**

- Do **not** delete or rename existing vocab/grammar pageIds — reorder batches only
- G1 batch C (`grammar_be`, `sentence_base`, `translation_classroom`) stays **after** all phonics + vocab
- G2 grammar/translation batches stay **after** phonics-review + vocab
- Hebrew instructional frame; English learning targets spoken/written in English on page

**Verification (execution):**

```powershell
node scripts/verify-english-final-sync.mjs
npm run build
```

---

## 5. Audio implementation sequence

**Plan only — no audio generation or manifest edits in this planning phase.**

### Gates (strict order at execution)

| Step | Gate | Owner action |
|------|------|--------------|
| 1 | Book drafts finalized | — |
| 2 | Extract section scripts (§1–§7 per page) | Review Hebrew narration + English targets |
| 3 | **Script text approval** | Sign off artifact in `docs/qa/_artifacts/english-phonics-audio-scripts/` |
| 4 | **Execution approval** | Approve manifest + generation run |
| 5 | Edit `learning-book-audio-manifest.js` — add English scopes | — |
| 6 | Implement `prepare-english-book-audio-text.js` | — |
| 7 | Run `scripts/generate-learning-book-audio.mjs` | — |
| 8 | Run `scripts/verify-learning-book-audio.mjs` — must PASS | — |

**No audio generation until owner approves scripts.**  
**No manifest edit until execution approval.**

### Manifest structure (future)

| Field | G1 | G2 |
|-------|----|----|
| Scope constant | `ENGLISH_G1_SECTION_AUDIO` | `ENGLISH_G2_SECTION_AUDIO` |
| `sectionsPerPage` | 7 | 7 |
| `pageIds` | Phonics 12 + (optional later: vocab pages) | Phonics 11 + (optional later) |
| Manifest key | `english:g1:{pageId}:section:{NN}` | `english:g2:{pageId}:section:{NN}` |
| Public path | `/audio/learning-books/english/g1/{pageId}/section-{NN}.mp3` | same pattern for g2 |
| `cacheVersion` | `YYYYMMDD-english-g1-section-v1` | `YYYYMMDD-english-g2-section-v1` |

Phase 4B execution should add **phonics pages only** to the audio manifest scope first; extend to vocab pages in a later sub-phase if desired. English G1/G2 **external launch** remains book-first + audio-supported + practice-backed — draft pages alone are an **internal checkpoint**, not a launch milestone.

### Practice audio naming (future, optional)

```text
/audio/english/phonics/{grade}/letter-{letter}-name.mp3
/audio/english/phonics/{grade}/letter-{letter}-sound.mp3
/audio/english/phonics/{grade}/word-{slug}.mp3
/audio/english/phonics/{grade}/prompt-{id}.mp3
/audio/english/phonics/{grade}/command-{slug}.mp3
```

### Verification script

- `node scripts/verify-learning-book-audio.mjs` — checks manifest keys, MP3 on disk, script hygiene (no raw equations, no bad Hebrew hyphens)
- `node --test tests/learning/learning-book-audio.test.mjs`

### Failure behavior when audio missing

| Surface | Behavior |
|---------|----------|
| Book page | `resolveLearningBookAudio()` returns `null`; player hides or shows inactive control (existing Hebrew G1 pattern) |
| Practice item with `requiresAudio: true` | Do not ship item until clip exists; generator should not emit broken listen MCQs |
| Feature flags | `LEARNING_BOOK_AUDIO_ENABLED` / client flag default **OFF** until owner enables after verify PASS |
| Launch level | Missing audio **blocks** move beyond LIMITED for phonics topic |

Accent policy: pick **one** English accent (US or UK) for all phonics clips; document in script artifact.

---

## 6. Practice bank implementation sequence

**Plan only — no banks created in this planning phase.**

### Sequence (execution)

```text
1. Complete book pages + registry (Section 4)
2. Define phonics item schema in generator + canonical metadata
3. Author data/english-questions/phonics-g1.js (≥50 easy unique)
4. Author data/english-questions/phonics-g2.js (≥50 easy unique)
5. Wire data/english-questions/index.js + data/english-curriculum.js (phonics topic)
6. Run integrity + MCQ audits — leakRisk must stay 0
7. Add launch registry rows with diagnosticContribution: manual_only (default)
8. Parent-report fixture + smoke (Section 9) before enabling self-practice assign
```

### G1 phonics pool

| Attribute | Target |
|-----------|--------|
| Min easy unique | **≥50** |
| Item types | `choose_matching_letter`, `match_uppercase_lowercase`, `hear_sound_choose_letter`, `first_sound_recognition`, `picture_word_matching`, `hear_word_choose_picture_word`, `simple_listening_instruction` |
| Medium/hard | Defer or minimal; G1 focus is easy |
| `bookPageRef` | Link to `english:g1:{pageId}` where applicable |

### G2 phonics pool

| Attribute | Target |
|-----------|--------|
| Min easy unique | **≥50** |
| Additional types | `early_word_reading`, `simple_sentence_exposure` |
| Word families | Items tied to `word_families_cvc` page vocabulary only |

### MCQ option rules

- **4 options** per MCQ (project standard; `tests/learning/mcq-four-options-integrity.test.mjs`)
- Distractors: same category (letters from same group; words from same semantic set)
- No Hebrew answers on phonics listen items (English/picture only)
- Run `system-health-mcq-option-count-audit.mjs` and `system-health-mcq-obvious-answer-risk-audit.mjs`

### Audio-required items

- `hear_sound_choose_letter`, `hear_word_choose_picture_word`, `simple_listening_instruction`, `simple_sentence_exposure`: **`requiresAudio: true`**
- Block merge until practice audio manifest + files exist OR item uses book-shared clip with stable path

### Duplicate / leak risk checks

- Unique `id` per pool row
- No answer leaked in stem (`system-health-question-bank-integrity-audit.mjs`)
- No internal metadata in student stem (`student-question-stem-sanitizer.js`)
- Picture-word items: one obvious image match; distractors plausibly wrong

### Answer integrity

- Single correct answer per MCQ
- First-sound items: accept phoneme letter mapping documented in pool (e.g. cat → C/c for /k/ — pick one convention and stay consistent)
- Sentence exposure: picture match only; no translation to Hebrew

**Out of scope for Phase 4B execution:** translation pool expansion, grammar pool changes (master plan §8).

---

## 7. Generator and metadata plan

### Routing (future execution)

```text
generateQuestion({ topic: "phonics", grade, level, ... })
  → load PHONICS_POOLS[grade][level]
  → filter by bookPageRef when launched from learning book
  → select item by patternFamily / item type
  → attachCanonicalMetadata (requiresAudio, bookPageRef, manual_only)
  → sanitizeQuestionForStudentDisplay
  → return question (no grammar/translation classification)
```

### Item type → generator behavior

| Type | Generator behavior |
|------|-------------------|
| `choose_matching_letter` | Show letter; 4 letter options |
| `match_uppercase_lowercase` | Show upper; pick lower (or pair MCQ) |
| `hear_sound_choose_letter` | Play phoneme clip; pick letter |
| `hear_word_choose_picture_word` | Play word; pick picture or word card |
| `first_sound_recognition` | Play word; pick first sound letter/icon |
| `picture_word_matching` | Show picture; pick English word |
| `simple_listening_instruction` | Play command; pick action picture |
| `early_word_reading` | Show CVC/sight word; pick matching picture |
| `simple_sentence_exposure` | Play sentence (G2); pick supporting picture |

### Metadata safety (flags ON)

| Field | Rule |
|-------|------|
| `requiresAudio` | `true` on all listen types; blocks ship without clip |
| `bookPageRef` | `english:g1:{pageId}` or `english:g2:{pageId}` |
| `diagnosticContribution` | Default **`manual_only`** for listening; **`thin`** only for letter ID after volume proof — never `normal` at launch |
| `questionType` | New phonics-specific values; **`inferEnglishQuestionType` must not return `grammar` or `translation`** |
| Subskill tags | Map to `english:phonics:*` taxonomy only |
| Promotion | **`PARENT_PROMOTION=false`** — no promotion-eligible metadata on phonics items |
| Parent report | No changes to `lib/parent-server/`; rely on existing gating + thin/manual registry |

### Misclassification prevention

- Phonics sessions must not increment grammar/translation topic counters in a way that triggers strong grammar insights
- `english-book-practice-map.js`: phonics pages map to `topic: "phonics"`, not `grammar` or `vocabulary` flashcard paths
- G2 `early_sentences_exposure`: exposure only — not routed to `translation` topic

---

## 8. Launch-readiness update plan

Conservative policy aligned with 4A §8. **FULL is not the default target.**

### Current state (unchanged until execution)

| Grade | Topic | Level | diagnosticContribution |
|-------|-------|-------|------------------------|
| G1 | vocabulary | PRACTICE_ONLY | manual_only |
| G1 | grammar, sentences | HIDE | excluded |
| G2 | vocabulary, grammar, sentences, translation | LIMITED | thin |
| G2 | writing | PRACTICE_ONLY | manual_only |
| G1/G2 | **phonics** | *(row absent)* | — |

### Proposed transitions (execution milestones)

| Milestone | `english:g1:phonics` | `english:g2:phonics` | Grade rollup |
|-----------|----------------------|----------------------|--------------|
| **After book drafts (internal checkpoint only)** | *(no registry bump yet)* | *(no registry bump yet)* | Unchanged — **not launch-ready** without audio + banks |
| **After book pages + registry** | LIMITED; `bookFirstRecommended: true`; assign **off** | LIMITED; assign **off** | Unchanged (G1 LIMITED / G2 PRACTICE_ONLY) — still **not** external launch |
| **After audio verified** | LIMITED; self-practice **on** (book) | LIMITED | Still not FULL |
| **After practice banks ≥50 + audits PASS** | LIMITED; self-practice phonics **on** | LIMITED | Reassess rollup text only; stay LIMITED unless owner signs FULL |
| **After QA + parent-report smoke PASS** | LIMITED (**default hold**) | LIMITED (**default hold**) | Do **not** auto-promote vocab/grammar rows |
| **FULL (exceptional)** | Owner sign-off only | Owner sign-off only | Requires book + audio + practice + QA + smoke; all criteria met |

### Conditions for LIMITED (phonics topic)

- All approved phonics drafts exist and registry verifies
- `diagnosticContribution: manual_only` until sustained volume evidence
- Assign surfaces remain **off** until smoke PASS
- Existing vocab/grammar rows **not** auto-upgraded to FULL

### Conditions for FULL

- All LIMITED criteria plus verified audio + ≥50 easy phonics items per grade
- `verify-learning-book-audio.mjs` PASS
- Integrity + MCQ audits PASS
- Parent-report smoke PASS with flags ON
- **Explicit owner sign-off** — inventory volume alone is insufficient

### Registry rebuild (execution)

```powershell
node scripts/launch-readiness/build-topic-launch-registry.mjs
node scripts/qa/verify-topic-launch-policy.mjs
node --test tests/learning/launch-readiness-policy.test.mjs
```

Update `lib/launch-readiness/compute-launch-row.js` to add `phonics` branch under English G1/G2 without weakening existing HIDE/PRACTICE_ONLY rules for out-of-curriculum topics.

---

## 9. Parent-report and diagnostic safety gates

Because **subskill** and **parent gating** are ON and **promotion** is OFF, the following are **hard prerequisites before any Phase 4B behavior change ships to users.**

### Required before behavior change

1. **Parent-report diagnostic flags smoke** with env:
   - `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true`
   - `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true`
   - `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false`
   - Command: `node scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs` (with `QA_BASE_URL` as applicable)

2. **English phonics-only fixture** (proposed: `scripts/qa/english-phonics-parent-report-fixture.mjs`):
   - Synthetic student sessions: G1 phonics-only (letter/sound/listen items)
   - Synthetic student sessions: G2 phonics-only (blend/listen/sentence exposure)
   - Feed into parent report API / PDF export path

3. **Assertions on fixture output:**
   - **No strong diagnosis** from thin phonics/listening evidence (patterns like `כדאי לשים לב ל`, `נראה שיש קושי` suppressed or absent when evidence below threshold)
   - **Soft/thin copy only** where data exists (`מעט נתוני תרגול`, etc.)
   - **No internal metadata leaks** in public HTML/PDF: `_evidenceQuality`, `bySubSkill`, `gatingDecisions`, `promotionDecisions`, `skillId`, `subSkill`, raw taxonomy ids
   - **Gating remains active** — AAA4/GATE-LOW-like windows still suppress over-strong lines
   - **Promotion remains OFF** — no promoted strong lines

### Explicit non-goals

- No edits to `lib/parent-server/` report engine
- No diagnostic flag toggles as part of English rollout
- No bypass of gating for “launch visibility”

### When to run

| Execution stage | Smoke required? |
|-----------------|-----------------|
| Book + registry only (no practice) | Recommended; no strong lines expected (no new practice data) |
| Practice banks wired | **Required** before enabling phonics self-practice |
| Audio flags enabled in production | **Required** before flag enable |

---

## 10. QA and test plan

### Automated gates (run at execution; all must PASS before ship)

| Command | Purpose |
|---------|---------|
| `node scripts/verify-english-final-sync.mjs` | Registry ↔ drafts ↔ catalog sync |
| `node scripts/verify-learning-book-audio.mjs` | English MP3 + scripts (post-audio) |
| `node scripts/qa/verify-topic-launch-policy.mjs` | Launch registry policy |
| `node --test tests/learning/launch-readiness-policy.test.mjs` | Phonics row levels |
| `node --test tests/learning/learning-book-audio.test.mjs` | Audio resolver + manifest |
| `node --test tests/learning/english-canonical-metadata.test.mjs` | Metadata contract |
| `node --test tests/learning/english-phonics-g1-registry.test.mjs` | *(new)* Registry order |
| `node --test tests/learning/english-phonics-pool-coverage.test.mjs` | *(new)* ≥50 easy/grade |
| `node --test tests/learning/mcq-four-options-integrity.test.mjs` | 4-option MCQ |
| `node scripts/qa/system-health-mcq-option-count-audit.mjs` | Option counts |
| `node scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs` | Obvious answers |
| `node scripts/qa/system-health-question-bank-integrity-audit.mjs` | leakRisk = 0 |
| `node scripts/audit-assigned-activity-topic-availability.mjs` | Assign surfaces |
| `node scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs` | Flags ON smoke |
| `npm run build` | Build / lint / types |

### Existing tests to extend (not replace)

- `tests/learning/english-canonical-metadata.test.mjs`
- `tests/learning/english-generator-extraction.test.mjs`
- `tests/classroom-activities/generate-english-activity-questions.test.mjs` — confirm phonics not assignable until policy allows

### Manual browser checks (post-execution)

- [ ] G1 book entry lands on `letters_upper` (first phonics page)
- [ ] Page navigation prev/next follows new batch order
- [ ] Section audio player appears on phonics pages when flags enabled
- [ ] Existing vocab pages still render after phonics batches
- [ ] Phonics practice topic (when enabled) plays audio on listen items
- [ ] Parent report after phonics-only session shows soft/thin copy only
- [ ] No console leaks of internal diagnostic fields

---

## 11. Rollback plan

Safe revert layers for **future execution** (reverse order of merge):

| Layer | Rollback action | Partial rollback OK? |
|-------|-----------------|----------------------|
| **Book drafts** | Delete 23 new `.md` files under `docs/learning-book/english/g1|g2/drafts/` | Yes |
| **Registries** | `git checkout` — `english-g1-registry.js`, `english-g2-registry.js` | Yes |
| **Skill index / practice map** | Revert phonics entries in `english-page-skill-index.js`, `english-book-practice-map.js` | Yes |
| **Literacy progress** | Remove `english-g1-literacy-progress.js` + master hook | Yes |
| **Practice banks** | Delete `phonics-g1.js`, `phonics-g2.js`; revert `index.js`, `english-curriculum.js` | Yes |
| **Generator / metadata** | Revert `english-question-generator.js`, `english-canonical-metadata.js` | Yes |
| **English master UI** | Revert `phonics` topic exposure in `english-master.js` | Yes |
| **Audio manifest** | Remove English scopes from `learning-book-audio-manifest.js` | Yes |
| **MP3 assets** | Delete `public/audio/learning-books/english/g1|g2/{phonics-pageIds}/` | Yes |
| **Launch registry** | Rebuild from pre-4B snapshot or revert `topic-launch-registry.json` + `compute-launch-row.js` | Yes |
| **Tests / artifacts** | Revert new tests; regenerate `LAUNCH_READINESS_MATRIX.md` | Yes |

**Partial rollback strategy:** Revert to pre-phonics book state. A **book-only internal preview** (drafts without audio/banks) is **not** an external launch state — English G1/G2 launch requires book + verified audio + practice banks + QA.

**Do not rollback:** diagnostic flags (separate owner process); parent report engine (unchanged by design).

---

## 12. Stop condition

### What this planning task completed

- [x] Phase 4B implementation plan document written
- [x] Approved 4A content map translated into execution sequence
- [x] File-by-file plan, audio/bank/generator/registry/QA/rollback documented
- [x] Diagnostic safety gates documented for flags ON
- [x] Clear separation: **planning now** vs **execution later**

### What was not performed

- [ ] No implementation (code, drafts, registries, manifest, audio, banks)
- [ ] No product behavior changes
- [ ] No parent report or diagnostic flag changes
- [ ] No commit or push
- [ ] Phase 4C not started

### Owner approval required before execution

The next step after reviewing this plan is **Phase 4B execution** — a separate owner approval to:

1. Author book drafts and update registries (Section 4)
2. Add practice banks and generator hooks (Sections 6–7)
3. Approve audio scripts → manifest → generation (Section 5)
4. Update launch registry and run full QA + parent-report smoke (Sections 8–10)

**Phase 4B execution is not automatic upon plan approval.**  
**Phase 4C is out of scope** — do not start English G3–G6 or translation expansion under this plan.

---

## Related artifacts

- [`ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md`](ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md) — Phase 4A (approved)
- [`LAUNCH_CORRECTION_MASTER_PLAN.md`](LAUNCH_CORRECTION_MASTER_PLAN.md) — §7 English G1/G2
- [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md)
- [`LOWER_GRADES_LITERACY_AUDIT.md`](LOWER_GRADES_LITERACY_AUDIT.md)
- [`DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md`](DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md)

---

*Phase 4B planning deliverable only. No implementation. No audio. No diagnostic flag changes.*
