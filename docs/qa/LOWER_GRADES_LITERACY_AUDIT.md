# Lower Grades Literacy Audit

**Generated:** 2026-06-08  
**Scope:** Hebrew G1–G2, English G1–G2  
**Purpose:** Pedagogical launch readiness (not technical bank audit pass)

## Executive summary

| Grade | Teaches letters/sounds/early reading? | Audio required? | Age-appropriate MCQ? | Grade launch level | Minimum fixes to launch |
|-------|--------------------------------------|-----------------|----------------------|-------------------|-------------------------|
| **Hebrew G1** | **Yes — in learning book** (phoneme, syllables, letters, niqqud, simple words). **No — in practice master** (jumps to word/grammar MCQ). | **Yes** | Partial — MCQs exist but skip foundational sequence; thin banks | **PRACTICE_ONLY** (book+audio path); not FULL | Wire practice entry to book literacy sequence; expand G1 reading bank to ≥50/40/30; keep audio manifest live |
| **Hebrew G2** | **Partial** — book covers fluent words, short sentences, niqqud spelling; practice MCQ thin | Recommended (not shipped) | Thin — reading/comprehension 8–14 items per level | **LIMITED** | Expand banks; add G2 book audio pilot; align practice topics to book pages |
| **English G1** | **No** — vocabulary flashcards only (EN↔HE MCQ). Book has color/number/family pages, no letters/sounds. | **Yes** | **No** — not valid as grammar/translation literacy | **PRACTICE_ONLY** (vocab exposure only) | Add letters, letter sounds, upper/lowercase, listening items + audio; or HIDE grade from marketing |
| **English G2** | **No** — vocabulary + 1 translation item + typing writing. Book has vocab/grammar pages, no phonics. | **Yes** | **No** — translation/grammar MCQ premature without phonics | **PRACTICE_ONLY** | Same foundational path as G1 plus listening; expand translation pool; defer grammar MCQ until G3 |

---

## Hebrew Grade 1

### Does the product currently teach letters/sounds/early reading?

| Surface | Status | Evidence |
|---------|--------|----------|
| **Learning book** | **Yes — strong path** | Registry batch A: `g1.phoneme_awareness`, `g1.open_close_syllable`, `g1.rhyme`, `g1.syllables`, `g1.letters`, `g1.final_letters`, `g1.basic_niqqud`, `g1.sound_letter_match`, `g1.simple_words_read` (`lib/learning-book/hebrew-g1-registry.js`) |
| **Self-practice master** | **No — skips foundation** | Topics: reading, comprehension, grammar, vocabulary, writing, speaking — all MCQ/typing at word/sentence level without enforced phonics progression |
| **Assigned activities** | Same generator path as master | All G1 Hebrew topics pass assigned MCQ generation per `ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md` |

### Does it require audio?

**Yes.** G1 Hebrew literacy is not pedagogically valid without hear-and-repeat for:
- Letter names and sounds
- Niqqud vowel discrimination
- Syllable blending
- Early word reading

**Current state:** Section-level audio manifest exists for **all Hebrew G1 book pages × 7 sections** (`lib/learning-book/audio/learning-book-audio-manifest.js`). Practice questions do **not** require or play audio.

### Are current questions age-appropriate?

| Topic | Count (e/m/h) | Assessment |
|-------|---------------|------------|
| reading | 49/25/23 (97 total) | Below professional minimum; items assume word literacy without book sequence |
| comprehension | 30/13/9 | Short passages OK in isolation; thin volume |
| grammar | 24/27/11 | Light grammar acceptable for G1 but not substitute for decoding |
| vocabulary | 33/7/9 | Concrete words OK; thin |
| writing/speaking | typing/speaking | Appropriate modality but thin; better in book |

**Verdict:** Technically usable MCQs; **pedagogically incomplete** as standalone literacy product.

### Recommended launch level

**Grade rollup: PRACTICE_ONLY**

| Topic | Level | Rationale |
|-------|-------|-----------|
| reading, grammar, comprehension | LIMITED | Book+audio is primary; MCQ supplemental |
| vocabulary, writing, speaking | PRACTICE_ONLY | Thin + wrong entry path for novices |
| mixed | PRACTICE_ONLY | Intentional mix; weak diagnostic signal |

**Parent diagnostics:** `thin` — evidence may accumulate but conclusions unreliable until ≥8 weighted answers per topic (metadata flags remain OFF).

### Minimum fixes to make launchable

1. **Product routing (no UI redesign required for audit):** Default G1 Hebrew new learners to learning book batch A before unlocking master topics.
2. **Content:** Expand reading/comprehension banks to professional minimums (50/40/30 per level).
3. **Audio:** Verify `LEARNING_BOOK_AUDIO_ENABLED` production path for Hebrew G1; add question-level `requiresAudio` for letter/sound items when practice path added.
4. **Diagnostics:** Do not promote G1 Hebrew topic conclusions in parent report until volume thresholds met (current engine behavior — no flag change needed).
5. **Marketing:** Position as "ספר לימוד + תרגול משלים", not full autonomous literacy app.

---

## Hebrew Grade 2

### Does the product currently teach letters/sounds/early reading?

| Surface | Status | Evidence |
|---------|--------|----------|
| **Learning book** | **Yes — transitional** | Batch A: `g2.fluent_words`, `g2.short_sentence`, `g2.simple_punctuation_read`, `spelling_choice_niqqud` |
| **Self-practice** | **Partial** | All topics visible; banks thin (reading 12/11/8 per level) |
| **Audio** | **No** | No G2 audio scope in manifest |

### Does it require audio?

**Recommended but not blocking** — G2 assumes emerging readers; audio helps niqqud/spelling and fluency but less critical than G1.

### Are current questions age-appropriate?

Thin inventory (25–44 items per topic total) forces repetition. Question types (comprehension, light grammar) are **age-aligned** when present.

### Recommended launch level

**LIMITED** — book path is usable; practice and assigned activities work but banks below professional thresholds.

### Minimum fixes

1. Expand reading/comprehension/grammar pools (target ≥50/40/30 per level).
2. Add Hebrew G2 book audio pilot (mirror G1 section model).
3. Link master topic pickers to book batch completion (optional soft gate).

---

## English Grade 1

### Does the product currently teach letters/sounds/early reading?

| Surface | Status | Evidence |
|---------|--------|----------|
| **Curriculum** | **Vocabulary only** | `ENGLISH_GRADES.g1.topics = ["vocabulary"]` |
| **Learning book** | **Vocab themes only** | `vocab_colors`, `vocab_numbers`, `vocab_family`, `vocab_animals`, etc. — no `letters_*` or `phonics_*` pages |
| **Practice** | **Bilingual flashcard MCQ** | 11 items (shared across e/m/h levels) — Hebrew↔English word match |

**No** letters, letter sounds, uppercase/lowercase, or listening comprehension in product.

### Does it require audio?

**Yes.** Israeli G1 English expects listening + pronunciation before abstract translation MCQ.

**Current state:** No English G1 audio in manifest.

### Are current questions age-appropriate?

**No** for claimed "English literacy" — MCQ translation is a **recognition shortcut**, not reading instruction. Acceptable only as **pre-literacy exposure** with adult context.

### Recommended launch level

**PRACTICE_ONLY** — vocabulary exposure and book reading with parent; not FULL or LIMITED for literacy claims.

### Minimum fixes

1. Add foundational book pages: letters A–Z, letter sounds, upper/lowercase matching, first CVC words.
2. Add listening items (`questionType: audio`) with TTS or recorded prompts.
3. Ship English G1 audio manifest (section-level minimum).
4. Expand vocabulary pool beyond 11 items OR gate session length to pool size.
5. **Alternative:** HIDE English G1 from grade selector until phonics path exists; keep book as beta.

---

## English Grade 2

### Does the product currently teach letters/sounds/early reading?

| Surface | Status |
|---------|--------|
| **Curriculum topics** | vocabulary, translation, writing |
| **Learning book** | Vocab review + `grammar_be`, `grammar_plural_questions`, short sentences — **no phonics** |
| **Practice** | 9 vocabulary, **1 translation**, 9 writing (typing) |

**No** systematic letters/sounds/listening path.

### Does it require audio?

**Yes** — same rationale as G1; G2 adds sentence listening and pronunciation checks.

### Are current questions age-appropriate?

| Topic | Issue |
|-------|-------|
| vocabulary | Thin (9 items); flashcard style OK |
| translation | **1 item** — not a curriculum |
| writing | Typing English words — OK with support; not assignable |
| grammar (in book, not master G2) | Book has grammar; master does not expose grammar tab until G3 |

Translation and grammar-style MCQ are **premature** without decoding foundation.

### Recommended launch level

**PRACTICE_ONLY** (grade rollup) — vocabulary LIMITED at topic level but grade lacks literacy foundation.

### Minimum fixes

1. Complete English G1 phonics path first (G2 builds on it).
2. Expand translation pool to ≥50 per direction at easy level.
3. Add listening comprehension (classroom commands, short dialogs).
4. English G2 audio manifest.
5. Keep writing as practice-only; do not enable assigned until MCQ alternatives exist or policy accepts typing activities.

---

## Cross-cutting constraints (confirmed)

| Constraint | Status |
|------------|--------|
| Diagnostic metadata flags OFF | ✓ No change |
| Parent report behavior | ✓ No change |
| SQL / UI redesign | ✓ Not in scope |
| Technical audits | ✓ PASS (0 MCQ WARN, 0 leakRisk) — **does not override literacy gaps above** |

## Related artifacts

- `docs/qa/LAUNCH_READINESS_MATRIX.md`
- `docs/qa/_artifacts/launch-readiness/launch-readiness-matrix.json`
- `lib/learning-book/hebrew-g1-registry.js`, `hebrew-g2-registry.js`
- `lib/learning-book/english-g1-registry.js`, `english-g2-registry.js`
- `reports/question-audit/QUESTION_INVENTORY_MATRIX.json`
