# English G1/G2 Phonics Content Map — Phase 4A

**Document date:** 2026-06-09  
**Phase:** **4A only** — planning and content mapping  
**Status:** Awaiting owner approval before Phase 4B  
**Master plan:** [`LAUNCH_CORRECTION_MASTER_PLAN.md`](LAUNCH_CORRECTION_MASTER_PLAN.md) §7  
**Progress checkpoint:** [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md)

---

## 1. Current baseline and assumptions

### Phase 1–3C checkpoint

Phases **1**, **2**, **2B**, **3**, **3B**, and **3C** are **complete, verified, and pushed to Git** as recorded in `LAUNCH_CORRECTION_PROGRESS.md`. That work includes:

- Central launch-readiness SSOT and topic registry
- Critical MCQ / integrity blockers closed
- Hebrew G1/G2 literacy path (book-first soft routing, literacy banks, G1 audio verify)
- Hebrew G2 reading easy micro-close (≥50 usable unique at easy)

**English Phase 4 has not started in code.** Existing English G1/G2 product behavior is unchanged by this document.

### Diagnostic flag snapshot (production reality — do not change in Phase 4A)

The owner states that **two diagnostic flags are currently enabled**. This document snapshots authoritative staging values from `DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md` and `LAUNCH_CORRECTION_PROGRESS.md` (2026-06-08 owner decision). **Phase 4A does not enable, disable, or modify any flag.**

| Flag | Current value | Notes |
|------|---------------|-------|
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | **`true` (ON)** | Subskill focus / conflict metadata active in staging QA |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | **`true` (ON)** | Parent-report gating (AAA4 / GATE-LOW suppression) active in staging QA |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | **`false` (OFF)** | Promotion remains off; not approved for production |

**Count:** 2 ON, 1 OFF.

Local `.env*` files do not define these flags; runtime reads `process.env.* === "true"` per `lib/learning/diagnostic-metadata-subskill-flag.js`. Treat the table above as the **documented production-reality baseline** for all Phase 4 planning guard notes.

### Phase 4A scope boundary

| Allowed in Phase 4A | Not allowed in Phase 4A |
|---------------------|---------------------------|
| This content map document | Code changes |
| Owner review and approval | Audio file generation |
| Planning for Phase 4B | English question bank implementation |
| | Registry / manifest edits |
| | Parent report logic changes |
| | SQL / marketing / public UI changes |
| | Diagnostic flag changes |
| | Phase 4B or 4C work |

**No product behavior changes are allowed in Phase 4A.**

### Current English G1/G2 product state (reference)

| Surface | G1 today | G2 today |
|---------|----------|----------|
| Learning book | Vocab + premature grammar/sentence pages (`english-g1-registry.js` batches A–C) | Vocab review + grammar + translation pages (`english-g2-registry.js`) |
| Practice master | Vocabulary only (11 MCQ flashcards) | Vocab 9, translation 1, writing typing |
| Phonics / letters / listening | **None** | **None** |
| Book audio manifest | **None** | **None** |
| Grade rollup (`LAUNCH_READINESS_MATRIX.md`) | **LIMITED** (vocab PRACTICE_ONLY; grammar/sentences HIDE) | **PRACTICE_ONLY** |

See also: [`LOWER_GRADES_LITERACY_AUDIT.md`](LOWER_GRADES_LITERACY_AUDIT.md).

### Phase 4 guard note — diagnostic flags partially ON

While **subskill** and **parent gating** are ON, any future English G1/G2 planning (Phase 4B+) must **not weaken parent-report safety**:

- Do not attach strong diagnostic labels to thin phonics/listening evidence.
- Do not bypass gating thresholds for “launch excitement” on English literacy.
- Require parent-report smoke/regression with flags ON before shipping English behavior changes.
- Keep promotion OFF until a separate owner gate approves it.

Section 9 expands these rules.

---

## 2. Product goal

### What the English G1/G2 path should become

A **foundational English literacy corridor** for Israeli Grade 1–2 learners that:

1. **Book-first** — children encounter letters, sounds, words, and listening in sequenced learning-book pages (Hebrew instructional frame, English learning targets).
2. **Audio-supported** — letter names, sounds, words, and listening prompts are hearable; decoding begins with listening, not translation shortcuts.
3. **Practice-backed** — after book exposure, short practice sets reinforce letter ID, sound match, picture-word match, and simple listening — not standalone bilingual flashcards.

### What it is not

- **Not vocabulary flashcards alone** — existing EN↔HE MCQ pools remain supplemental only; they do not constitute literacy.
- **Not a full grammar or translation program** — G1/G2 defer systematic grammar MCQ, sentence translation drills, and “be/plural/questions” mastery until decoding exists (G3+ can revisit grammar depth per master plan).
- **Not pretending fluency** — launch levels stay conservative until book + audio + practice + QA all pass (Section 8).

### Pedagogical sequence (target)

```
Letters (A–Z) → letter names → basic sounds → first sounds →
simple/classroom words → picture-word match → listening commands →
(G2) blending / first-word reading → early sentence exposure (listen/read, not translate)
```

Existing vocab batches (`vocab_colors`, etc.) remain **downstream enrichment** after the phonics foundation batch, not the entry path.

---

## 3. Grade 1 scope

Exact Grade 1 English foundation this map covers:

| Domain | G1 inclusion | Notes |
|--------|--------------|-------|
| Uppercase letters A–Z | **Required** | Recognition + naming; taught in groups (e.g. A–F, G–L …) |
| Lowercase letters a–z | **Required** | Recognition + naming |
| Uppercase ↔ lowercase matching | **Required** | Pairs (A/a, B/b …); no ambiguous fonts |
| Letter names | **Required** | “A says its name: /eɪ/” style — name, not only sound |
| Basic letter sounds | **Required** | Consonant sounds + short vowels a, e, i, o, u at intro level |
| First sounds (initial phoneme) | **Required** | “What is the first sound in **cat**?” — /k/ not letter name |
| Classroom words | **Required** | book, pen, desk, teacher, door, chair, hello, bye — listen + picture |
| First simple words | **Required** | High-frequency concrete words before full decoding (cat, dog, sun, red) |
| CVC exposure | **Limited / if appropriate** | Small closed set only (cat, hat, sit, sun, pen); no long word families yet |
| Listening instructions | **Required** | One-step classroom commands: “Stand up.” “Open your book.” |
| Picture-word matching | **Required** | Image → spoken/written English word |
| Grammar / translation MCQ | **Out of scope for G1 foundation** | Defer `grammar_be`, `translation_classroom` until after phonics batch completion in Phase 4B |
| Sentence writing / typing | **Out of scope for G1 foundation** | Existing pages stay downstream; not launch-critical for literacy |

**G1 practice volume target (Phase 4B, not Phase 4A):** ≥50 easy unique phonics/listening items before reassessing launch level.

---

## 4. Grade 2 scope

Exact Grade 2 English foundation (builds on G1):

| Domain | G2 inclusion | Notes |
|--------|--------------|-------|
| Review letters and sounds | **Required** | Faster review pages; assume G1 exposure |
| Stronger sound–letter matching | **Required** | Medial/final sound intro optional; focus initial + blend |
| First-word reading | **Required** | Decode CVC and high-frequency words with book support |
| Short CVC / simple word families | **Required where appropriate** | -at, -an, -it families; ≤6 patterns |
| Simple classroom vocabulary | **Required** | Expanded set: classroom, playground, friend, read, write |
| Listening comprehension | **Required** | 2-step instructions; short Q&A about heard sentence |
| Early sentence exposure | **Required (exposure only)** | 3–5 word sentences heard and read; **no translation MCQ gate** |
| Picture-word and audio-word matching | **Required** | Hear word → pick picture; see picture → pick word |
| Advanced translation / grammar | **Not in G2 foundation** | Book grammar pages exist today but stay **after** phonics review; master grammar MCQ remains LIMITED/thin until G3 path |

**G2 practice volume target (Phase 4B):** ≥50 easy phonics/blend/listening items; translation pool expansion is a **separate** master-plan track (§8 English G3–G6), not part of G2 phonics foundation.

---

## 5. Proposed book structure

### Conventions

- **7 sections per page** (matches Hebrew G1 / Math G1 audio pilot):  
  `1. מה לומדים?` · `2. הסבר` · `3. דוגמה` · `4. בואו נפתור` · `5. נסו בעצמכם` · `6. שימו לב!` · `7. סיכום`
- New phonics batches insert **before** existing vocab batches in registry (Phase 4B).
- `pageId` values below are **proposed** — owner may rename before 4B.

---

### English G1 — proposed batches and pages

#### Batch `phonics-a` — אותיות (Letters)

| page id | Hebrew title | English learning target | Page sections (summary) | Audio required | Linked practice types | Acceptance notes |
|---------|--------------|-------------------------|-------------------------|----------------|----------------------|------------------|
| `letters_upper` | אותיות גדולות A–Z | Recognize and name uppercase A–Z in groups | Intro → letter grid A–F,G–L,M–R,S–X,Y–Z → examples → guided ID → self-check → confusables (I/l not yet) → summary | **Yes** — letter names per group | `choose_matching_letter`, `match_uppercase_lowercase` | All 26 uppercase shown; no Hebrew letter confusion |
| `letters_lower` | אותיות קטנות a–z | Recognize and name lowercase a–z | Same 7-section pattern for lowercase | **Yes** | `choose_matching_letter` | Distinguish b/d, p/q called out in §6 |
| `letters_match` | התאמת אות גדולה וקטנה | Match A↔a, B↔b … | Pairs intro → explain → demo pairs → guided match → self match → exceptions (same shape) → summary | **Yes** — “A, a” pairs | `match_uppercase_lowercase` | 26 pairs; no trick fonts |
| `letter_names` | שמות האותיות | Letter **names** (not only sounds) | Name vs sound distinction → alphabet names → hear & repeat → quiz names → practice → “name ≠ first sound” note → summary | **Yes** — full alphabet names | `hear_sound_choose_letter` (name mode), `choose_matching_letter` | Child hears name, picks letter |

#### Batch `phonics-b` — צלילים (Sounds)

| page id | Hebrew title | English learning target | Page sections | Audio required | Linked practice types | Acceptance notes |
|---------|--------------|-------------------------|---------------|----------------|----------------------|------------------|
| `phonics_sounds` | צלילי אותיות | Basic consonant + short vowel sounds | Sound intro → consonant chart → vowel a,e,i → examples → guided → practice → “short vowel” note → summary | **Yes** — each sound isolated | `hear_sound_choose_letter`, `first_sound_recognition` | IPA not shown to child; audio canonical |
| `phonics_first_sound` | הצליל הראשון במילה | Initial phoneme in simple words | First sound concept → cat/dog/sun → guided → self → contrast name vs sound → summary | **Yes** — words + isolated first sound | `first_sound_recognition`, `hear_word_choose_picture_word` | No spelling test yet |

#### Batch `phonics-c` — מילים ראשונות (First words)

| page id | Hebrew title | English learning target | Page sections | Audio required | Linked practice types | Acceptance notes |
|---------|--------------|-------------------------|---------------|----------------|----------------------|------------------|
| `classroom_words` | מילים בכיתה | book, pen, desk, chair, door, teacher, hello, bye | Classroom context → word list → picture examples → listen & point → match → safety note (listen first) → summary | **Yes** — each word + example phrase | `picture_word_matching`, `hear_word_choose_picture_word`, `simple_listening_instruction` | 8–10 words max on page |
| `first_words_simple` | מילים פשוטות ראשונות | cat, dog, sun, red, blue, mom, dad | Concrete nouns/adjectives → pictures → hear word → match → read with support → summary | **Yes** | `picture_word_matching`, `early_word_reading` (supported) | No CVC drill yet |
| `first_words_cvc` | מילים עם שלוש אותיות (CVC) | **Limited** CVC: cat, hat, sit, sun, pen, bed | CVC pattern explain → 6 words → blend demo → guided read → practice → “not all English words are CVC” → summary | **Yes** — slow blend audio | `early_word_reading`, `first_sound_recognition` | **Optional depth** — owner may shorten list in 4B |

#### Batch `phonics-d` — האזנה (Listening)

| page id | Hebrew title | English learning target | Page sections | Audio required | Linked practice types | Acceptance notes |
|---------|--------------|-------------------------|---------------|----------------|----------------------|------------------|
| `picture_word_match` | תמונה ומילה | Match picture ↔ spoken/written word (review pool) | Review → demo → guided → self → mixed nouns → summary | **Yes** | `picture_word_matching`, `hear_word_choose_picture_word` | Reuses words from prior pages only |
| `listening_classroom` | הוראות בכיתה | One-step commands: Stand up. Sit down. Open your book. Close your book. | Command intro → model → listen & do (conceptual) → choose picture of action → practice → summary | **Yes** — imperative audio | `simple_listening_instruction` | 4–6 commands |
| `listening_commands` | עוד הוראות קצרות | Listen & choose: Point to the door. Show me your pen. | Slightly varied commands → 2-option picture choice → summary | **Yes** | `simple_listening_instruction`, `hear_word_choose_picture_word` | Max 2-step instruction |

**G1 page count (new phonics):** 12 pages × 7 sections = **84 section audio slots** (future manifest).

**Existing batches (unchanged in Phase 4A; reorder in 4B):**  
Batch A vocab (colors, numbers, family) · Batch B vocab (animals, emotions, actions, school) · Batch C (`grammar_be`, `sentence_base`, `translation_classroom`) — **C stays last** and marked “enrichment only until G1 phonics complete.”

---

### English G2 — proposed batches and pages

Insert new batch **`phonics-review`** before existing batch A.

#### Batch `phonics-review` — יסודות קריאה (Foundations review)

| page id | Hebrew title | English learning target | Page sections | Audio required | Linked practice types | Acceptance notes |
|---------|--------------|-------------------------|---------------|----------------|----------------------|------------------|
| `letters_review` | חזרה: אותיות ושמות | Fast A–Z upper+lower review | Quick grid → name drill → match pairs → summary | **Yes** | `choose_matching_letter`, `match_uppercase_lowercase` | Assumes G1 path |
| `letters_order` | סדר האלף בית | Alphabet order (A→Z) | Order song concept → segments → “what comes after M?” → practice → summary | **Yes** — ordered chant | `choose_matching_letter` (sequence prompts) | No writing requirement |
| `phonics_sounds_review` | חזרה: צלילים | Consonants + short vowels refresh | Sound chart → contrast pairs (b/p, d/t) → practice → summary | **Yes** | `hear_sound_choose_letter`, `first_sound_recognition` | |
| `phonics_blending` | חיבור צלילים | Blend CVC: c-a-t → cat | Blend steps → 8 CVC words → guided → self → summary | **Yes** — segmented + blended | `early_word_reading`, `first_sound_recognition` | Core G2 skill |
| `sound_letter_match` | צליל ↔ אות | Stronger mapping: hear /m/ → M | Sound-to-letter and letter-to-sound → mixed drill → summary | **Yes** | `hear_sound_choose_letter`, `choose_matching_letter` | |
| `first_word_reading` | קריאת מילים ראשונה | Read CVC + sight words: the, I, a, is | Supported reading → fade support → summary | **Yes** — word read aloud | `early_word_reading` | No comprehension MCQ |
| `word_families_cvc` | משפחות מילים | -at, -an, -it, -og families (4 families × 3 words) | Pattern intro → family examples → swap onset → practice → summary | **Yes** | `early_word_reading`, `first_sound_recognition` | ≤12 new words |
| `classroom_vocab_g2` | אוצר מילים בכיתה | classroom, playground, friend, read, write, listen | Thematic vocab → sentences in book only → summary | **Yes** | `picture_word_matching`, `hear_word_choose_picture_word` | |
| `listening_comprehension` | הבנת הנשמע | Hear short sentence → choose correct picture | 4 mini dialogues (1–2 sentences) → Q: Who? What? → summary | **Yes** | `simple_listening_instruction`, `hear_word_choose_picture_word` | No translation |
| `picture_audio_word_match` | תמונה, שמע ומילה | Triple match: audio ↔ picture ↔ written word | Integrated review → summary | **Yes** | All G2 match types | Capstone of phonics batch |
| `early_sentences_exposure` | משפטים קצרים | Hear/read: I see a cat. It is red. | Sentence cards → listen → repeat → match picture → **no grammar quiz** → summary | **Yes** | `simple_sentence_exposure` (G2 only) | Exposure only; grammar MCQ deferred |

**G2 page count (new phonics):** 11 pages × 7 sections = **77 section audio slots** (future manifest).

**Existing batches (4B reorder):** A vocab review · B food/house · C grammar · D sentences/translation — **C/D after phonics-review**, translation pages not launch-critical for G2 literacy.

---

## 6. Question / practice type map

Future practice item types for Phase 4B+ (**not implemented in Phase 4A**). Each type should carry metadata: `requiresAudio`, `diagnosticContribution: manual_only or thin`, `bookPageRef`.

| Type id | Description | G1 | G2 | Audio | Parent-report note |
|---------|-------------|:--:|:--:|:-----:|-------------------|
| `choose_matching_letter` | Show letter (or hear name) → choose matching letter from 3–4 options | ✓ | ✓ | Optional / name mode yes | thin-safe; no strong conclusions |
| `match_uppercase_lowercase` | Match A↔a (drag or MCQ pairs) | ✓ | ✓ | Optional | thin-safe |
| `hear_sound_choose_letter` | Play phoneme → pick letter | ✓ | ✓ | **Required** | thin-safe; gating may suppress strong lines |
| `hear_word_choose_picture_word` | Play English word → pick picture or word card | ✓ | ✓ | **Required** | thin-safe |
| `first_sound_recognition` | Play word → pick first sound (letter or sound icon) | ✓ | ✓ | **Required** | thin-safe |
| `picture_word_matching` | Picture ↔ written English word | ✓ | ✓ | Optional hear | thin-safe |
| `simple_listening_instruction` | Hear command → pick action picture | ✓ | ✓ | **Required** | manual_only until pool ≥50 |
| `early_word_reading` | Show CVC/sight word → child picks matching picture or reads aloud (self-check) | Light | ✓ | Recommended | thin-safe |
| `simple_sentence_exposure` | Hear short sentence → pick supporting picture (no translate-to-Hebrew) | — | ✓ | **Required** | manual_only; not for strong diagnosis |

### Proposed pool files (Phase 4B — reference only)

| Pool | Grade | Min easy items | Primary types |
|------|-------|----------------|---------------|
| `data/english-questions/phonics-g1.js` | G1 | 50 | letter, sound, first-sound, picture-word, listening |
| `data/english-questions/phonics-g2.js` | G2 | 50 | blend, word read, families, listening, sentence exposure |
| Existing `vocabulary` pools | G1/G2 | expand later | supplemental only |

### Generator / metadata requirements (4B planning hook)

- `questionType: "audio"` for listen items
- `requiresAudio: true` where audio is required
- Link to `learning_page_id` e.g. `english:g1:letters_upper`
- **Do not** wire phonics pools to `translation` or `grammar` topics until launch policy explicitly allows

---

## 7. Audio script planning

**Phase 4A defines scripts and naming only. No audio files. No manifest entries added.**

### Categories of recorded / generated speech (future)

| Category | Content | Example | Used on |
|----------|---------|---------|---------|
| Section narration | Hebrew section text (§1–§7) read aloud for accessibility | “היום נלמד אותיות גדולות…” | Every book page, sections 1–7 |
| Letter names | A, B, C … Z | “A”, “B”, “C” | `letters_*`, `letter_names`, reviews |
| Letter sounds | /b/, /k/, short /a/ | isolated phoneme clips | `phonics_sounds*`, practice |
| Words | cat, book, classroom | full word | word + listening pages |
| Listening instructions | Stand up. Open your book. | imperative / question | listening_* pages |
| Short practice prompts | “Which letter?” “What is the first sound?” | EN prompt | practice UI (future) |

### Book section audio — future manifest structure

Follow Hebrew G1 pilot pattern in `lib/learning-book/audio/learning-book-audio-manifest.js`:

| Field | Proposed value |
|-------|----------------|
| Scope objects | `ENGLISH_G1_SECTION_AUDIO`, `ENGLISH_G2_SECTION_AUDIO` |
| `sectionsPerPage` | `7` |
| Manifest key | `{subject}:{grade}:{pageId}:section:{NN}` e.g. `english:g1:letters_upper:section:01` |
| Public path | `/audio/learning-books/english/{grade}/{pageId}/section-{NN}.mp3` |
| `cacheVersion` (G1) | `YYYYMMDD-english-g1-section-v1` (set at 4B implementation) |
| `cacheVersion` (G2) | `YYYYMMDD-english-g2-section-v1` |
| Verification | `scripts/verify-learning-book-audio.mjs` must PASS before launch level bump |

**Slot counts (future):** G1 phonics 12 pages × 7 = 84; G2 phonics 11 × 7 = 77 (plus optional existing vocab pages if audio extended later).

### Practice audio — future naming convention (not in manifest yet)

Separate from book sections for MCQ/listen items:

```
/audio/english/phonics/{grade}/letter-{letter}-name.mp3
/audio/english/phonics/{grade}/letter-{letter}-sound.mp3
/audio/english/phonics/{grade}/word-{word-slug}.mp3
/audio/english/phonics/{grade}/prompt-{prompt-id}.mp3
/audio/english/phonics/{grade}/command-{command-slug}.mp3
```

- `{word-slug}`: lowercase hyphenated (`cat`, `stand-up`)
- `{prompt-id}`: stable ids (`choose-letter`, `first-sound`, `listen-command-01`)
- Practice manifest file (4B): `data/english-audio/phonics-manifest.json` — **proposed only**

### Script authoring rules

1. Section narration may be Hebrew; **English learning targets must be spoken in clear child-directed English** (native or high-quality TTS).
2. Letter sounds: use consistent accent (document choice in 4B — recommend single US or UK, not mixed).
3. Blending clips: provide segmented then blended (`/k/ … /æ/ … /t/ … cat`).
4. No background music on phoneme clips.
5. Align each script line to section number for traceability in QA.

---

## 8. Launch-readiness policy proposal

Conservative policy for English G1/G2 phonics path. **Do not mark FULL unless book + audio + practice + QA all pass.**

### Recommended level definitions

| Level | Meaning for English G1/G2 |
|-------|---------------------------|
| **PRACTICE_ONLY** | Vocab flashcards or thin pools only; no defensible phonics path; book optional |
| **LIMITED** | Book phonics path exists **or** partial audio/practice; assigned activities restricted; diagnostics thin/manual |
| **FULL** | Complete phonics book batches + verified section audio + ≥50 easy phonics practice per grade + QA PASS + parent-report smoke with flags ON |

### Stage gates

| Stage | G1 proposed level | G2 proposed level | Criteria |
|-------|-------------------|---------------------|----------|
| **Before implementation (now)** | PRACTICE_ONLY (vocab) / grade rollup LIMITED | PRACTICE_ONLY | Current registry; this map approved |
| **After book pages exist** | LIMITED | LIMITED | Phonics drafts authored; registry updated; **no audio yet** |
| **After audio exists** | LIMITED | LIMITED | `verify-learning-book-audio` PASS for phonics pages; practice may still be thin |
| **After practice banks exist** | LIMITED → reassess | LIMITED → reassess | ≥50 easy phonics items/grade; integrity audit PASS |
| **After QA passes** | LIMITED (conservative) | LIMITED (conservative) | Manual literacy QA + parent-report smoke (flags ON) + no leakRisk |
| **FULL (exceptional)** | Only if all above + assigned policy signed off | Same | Owner explicit sign-off; still **not** default target for G1 |

### Topic-level diagnostic contribution (proposal for 4B registry)

| Topic / pool | Proposed `diagnosticContribution` | Rationale |
|--------------|-----------------------------------|-----------|
| New `phonics` topic (G1/G2) | `manual_only` until ≥8 weighted answers/topic proven | Thin literacy evidence |
| Existing `vocabulary` | `manual_only` (G1), `thin` (G2) | Flashcard nature unchanged |
| `translation`, `grammar` (G2) | stay `thin` / blocked for assign | Premature without decoding |
| `writing` | `manual_only` | unchanged |

**Grade rollup rule:** Stay **PRACTICE_ONLY or LIMITED** until phonics book + audio + practice trinity complete. **Never auto-promote to FULL** from inventory volume alone.

---

## 9. Diagnostic safety

### Phase 4A commitments

- **No diagnostic flag changes** in this phase.
- **No parent report code changes** in this phase.
- Document assumes **subskill ON + gating ON + promotion OFF**.

### Safety rules for future G1/G2 English work (4B+)

1. **No strong parent-report conclusions from thin literacy data**  
   Phonics/listening items accumulate low diagnostic weight until pool depth and session counts meet existing sufficiency rules (`PARENT_REPORT_NUMERIC_SUFFICIENCY_SANITY_BLOCKER.md`).

2. **Early item types default to `manual_only` or thin-safe**  
   Letter ID and single-step listening should not trigger promotion-eligible strong lines while promotion flag is OFF — and should still pass gating checks when gating is ON.

3. **Subskill focus must not over-narrow English literacy**  
   With `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true`, ensure subskill tags for phonics do not produce misleading “weak in grammar” style insights when the child has only done letter-sound items.

4. **Gating must remain active for AAA4-like cases**  
   With `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true`, do not add English copy that bypasses suppression thresholds or reintroduces numeric leak patterns.

5. **Promotion stays off**  
   Do not enable `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` as part of English rollout.

6. **Required QA before any 4B/4C behavior ship**  
   - `scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs` (or successor) with flags ON  
   - Parent report matrix / PDF comparison with English phonics sessions fixture  
   - Confirm no new strong lines from G1/G2 phonics-only sessions

7. **English planning must not weaken parent-report safety**  
   Content richness (more pages) is not a substitute for evidence quality. Prefer more **manual_only** coverage over premature “normal” diagnostic contribution.

---

## 10. Acceptance criteria for Phase 4A

This phase is **complete** when:

- [x] G1 scope explicit (Section 3)
- [x] G2 scope explicit (Section 4)
- [x] Book pages mapped with page ids, titles, sections, audio, practice links (Section 5)
- [x] Practice types mapped (Section 6)
- [x] Audio requirements and future manifest structure mapped (Section 7)
- [x] Launch-readiness proposal written (Section 8)
- [x] Diagnostic safety with current flags ON documented (Sections 1, 9)
- [x] No code / product / audio files changed in Phase 4A
- [x] Phase 4B not started

**Owner approval** of this document is the gate to open **Phase 4B planning** (implementation plan), not automatic implementation.

---

## 11. Next step after owner approval

After the owner reviews and approves this content map:

1. **Phase 4B — implementation planning only** (separate doc or checklist): registry order, draft authoring sequence, generator hooks, manifest addition order, QA script list, registry level updates.
2. **No automatic implementation** — owner must explicitly approve Phase 4B execution (book authoring, banks, manifest, audio generation) per `LAUNCH_CORRECTION_MASTER_PLAN.md` §7.
3. **No English audio generation** until Phase 4B is approved and content map revisions (if any) are merged.
4. **Parent-report smoke with diagnostic flags ON** remains a hard prerequisite immediately before any production-facing English behavior change.

---

## Related artifacts

- [`LAUNCH_CORRECTION_MASTER_PLAN.md`](LAUNCH_CORRECTION_MASTER_PLAN.md) — §7 English G1/G2
- [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md) — Phases 1–3C checkpoint
- [`LOWER_GRADES_LITERACY_AUDIT.md`](LOWER_GRADES_LITERACY_AUDIT.md) — current English gaps
- [`LAUNCH_READINESS_MATRIX.md`](LAUNCH_READINESS_MATRIX.md) — current levels
- [`DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md`](DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md) — flag snapshot source
- `lib/learning-book/english-g1-registry.js`, `english-g2-registry.js` — current TOC
- `lib/learning-book/audio/learning-book-audio-manifest.js` — audio pilot pattern

---

*Phase 4A deliverable only. No implementation. No audio. No diagnostic flag changes.*
