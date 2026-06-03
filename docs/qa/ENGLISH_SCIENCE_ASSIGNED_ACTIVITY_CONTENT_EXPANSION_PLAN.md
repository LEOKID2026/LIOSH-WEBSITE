# English & Science Assigned-Activity Content Expansion Plan

**Status:** Plan only — do not implement content without approval  
**Related audit:** `docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md`  
**Product decision:** Do **not** hide `grammar`, `sentences`, `translation`, `materials`, `earth_space`, `environment` — expand banks / fix generators instead.

**Target activity size:** count=**5** (default UI in `AssignActivityModal.js`)  
**Minimum usable bank depth:** **5 unique** activity-ready questions per grade/topic/difficulty (after dedup fingerprinting)

Generated: 2026-06-03 from live bank probes + `generateActivityQuestionSetClient` verification.

---

## 1. English — grammar, sentences, translation (g2–g6)

### Root cause summary

| Issue type | Topics affected |
|------------|-----------------|
| **Empty medium/hard pools** (grade gating) | `grammar`, `sentences` g4–g6 — generator returns `english_empty_pool` at medium/hard |
| **Thin hard pool** | `grammar` g3, `translation` g2 |
| **Dedup / uniqueness at count=5** | `translation` g3–g5 — samples exist but assigned path cannot collect 5 unique fingerprints |
| **Pool + mapping bug** | `translation` **g6** — fails at **all** difficulties including easy |

Writing is **out of scope** here (hidden from assigned UI per product decision).

### Detailed matrix

Legend: **Bank** = approximate MCQ yield in 50 generator samples; **Assigned @5** = pass/fail for `generateActivityQuestionSetClient` count=5.

#### g2

| Topic | easy bank | medium bank | hard bank | easy @5 | medium @5 | hard @5 | Questions to add (to reach 5/level) |
|-------|----------:|------------:|----------:|:-------:|:---------:|:-------:|-------------------------------------|
| translation | ~50 | ~50 | ~5 | pass | pass | **fail** | hard: **+4** minimum |

#### g3

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | To add |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|--------|
| grammar | ~50 | ~50 | ~0 | pass | pass | **fail** | hard: **+5** |
| sentences | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| translation | ~50 | ~50 | ~10 | **fail** | **fail** | **fail** | fix dedup + **+5** usable unique per level |

#### g4

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | To add |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|--------|
| grammar | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| sentences | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| translation | ~50 | ~50 | ~38 | **fail** | **fail** | **fail** | dedup/uniqueness fix + verify **5** unique |

#### g5

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | To add |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|--------|
| grammar | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| sentences | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| translation | ~50 | ~12 | ~9 | **fail** | **fail** | **fail** | medium: **+5**, hard: **+5**, fix easy dedup |

#### g6

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | To add |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|--------|
| grammar | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| sentences | ~50 | ~0 | ~0 | pass | **fail** | **fail** | medium: **+5**, hard: **+5** |
| translation | ~7 | ~7 | ~6 | **fail** | **fail** | **fail** | **generator/mapping fix** + **+5** per level |

### English pattern: easy works, medium/hard fail

**Yes** for `grammar` and `sentences` g4–g6 — assigned activities pass at **easy** only with current UI default **medium**.

**Partial** for `translation` — pool depth varies; g6 broken at all levels.

### Recommended content minimum before launch

| Priority | Work item | Est. new questions |
|----------|-----------|-------------------|
| P0 | **g6 translation** — fix grade pool mapping / empty pool bug | fix + 15 |
| P0 | **grammar + sentences** medium/hard pools g4–g6 | ~60 (5×2 levels×6 grade-topic pairs) |
| P1 | **sentences** medium/hard g3 | 10 |
| P1 | **grammar** hard g3 | 5 |
| P1 | **translation** dedup — ensure 5 unique stems per g3–g5 level | audit + 15–30 |
| P2 | **translation** hard g2 | 4 |

**Rough total:** ~110–130 new English MCQ items + 1 generator fix.

### Temporary UI gating (optional — owner decision)

| Option | Pros | Cons |
|--------|------|------|
| **None (recommended)** | Keeps curriculum visible; parents see preview errors until content lands | Failed preview at default medium |
| Cap default difficulty to **easy** for English non-vocabulary | Immediate relief at count=5 | Hides medium/hard curriculum until banks ready |
| Show warning badge on grammar/sentences/translation | Transparent | Requires UI work |

**Recommendation:** Do **not** hide topics. Consider defaulting English assigned difficulty to **easy** temporarily OR show inline “רמה בינונית — בקרוב” until P0/P1 content lands.

### Files for English expansion

- `data/english-questions/index.js` — `GRAMMAR_POOLS`, `SENTENCE_POOLS`, `TRANSLATION_POOLS`
- `utils/grade-gating.js` — `englishPoolItemAllowedWithClassSplit`, writing gates
- `utils/english-question-generator.js` — pool selection per grade/level
- `lib/classroom-activities/generate-activity-questions-client.js` — MCQ filter + dedup fingerprint

---

## 2. Science — materials, earth_space, environment (g1–g6)

### Root cause

Static bank `data/science-questions.js` with level filtering via `minLevel`/`maxLevel` and `scienceLevelAllowed()`. Topics exist in curriculum and learning books — **bank depth** insufficient for count=5 at specific grade/level combinations.

### Detailed matrix (static bank counts → assigned @5)

#### g1 — critical launch gap

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | Need (+to reach 5) |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|-------------------|
| materials | 11 | **1** | **1** | pass | **fail** | **fail** | medium **+4**, hard **+4** |
| earth_space | 10 | **1** | **1** | pass | **fail** | **fail** | medium **+4**, hard **+4** |
| environment | 9 | **1** | **1** | pass | **fail** | **fail** | medium **+4**, hard **+4** |

**g1 subtotal:** **24** new questions minimum (8 per topic × 3 topics at medium+hard).

#### g2

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | Need |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|------|
| materials | 12 | 6 | **1** | pass | pass | **fail** | hard **+4** |
| earth_space | 8 | 3 | **1** | pass | **fail** | **fail** | medium **+2**, hard **+4** |
| environment | 10 | 4 | **1** | pass | **fail** | **fail** | medium **+1**, hard **+4** |

**g2 subtotal:** ~15 new questions.

#### g3 — inverted easy gap

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | Need |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|------|
| materials | **4** | 21 | 4 | **fail** | pass | **fail** | easy **+1**, hard **+1** |
| earth_space | **4** | 18 | 4 | **fail** | pass | **fail** | easy **+1**, hard **+1** |
| environment | **4** | 17 | 4 | **fail** | pass | **fail** | easy **+1**, hard **+1** |

Note: easy has 4 bank rows but assigned fails — likely **dedup/fingerprint** after shuffle; add **≥2** more easy items per topic for safety.

#### g4

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | Need |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|------|
| materials | **4** | 21 | 5 | **fail** | pass | pass | easy **+1** |
| earth_space | **4** | 15 | 10 | **fail** | pass | pass | easy **+1** |
| environment | **4** | 15 | 9 | **fail** | pass | pass | easy **+1** |

#### g5

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | Need |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|------|
| materials | **2** | 3 | 7 | **fail** | **fail** | pass | easy **+3**, medium **+2** |
| earth_space | **3** | 11 | 18 | **fail** | pass | pass | easy **+2** |
| environment | **3** | 10 | 24 | **fail** | pass | pass | easy **+2** |

#### g6

| Topic | easy | medium | hard | easy @5 | medium @5 | hard @5 | Need |
|-------|-----:|-------:|-----:|:-------:|:---------:|:-------:|------|
| materials | **2** | 3 | 13 | **fail** | **fail** | pass | easy **+3**, medium **+2** |
| earth_space | **3** | 18 | 17 | **fail** | pass | pass | easy **+2** |
| environment | **4** | 10 | 29 | **fail** | pass | pass | easy **+1** |

### Science pattern summary

| Grade band | Pattern |
|------------|---------|
| **g1–g2** | easy OK; **medium/hard thin** (especially g1) |
| **g3–g4** | medium/hard OK; **easy thin** (4 items, dedup fails @5) |
| **g5–g6** | medium/hard mostly OK; **easy thin**; materials medium thin at g5–g6 |

### Recommended minimum content before launch

| Priority | Scope | Est. new MCQs |
|----------|-------|---------------|
| **P0** | g1 materials/earth_space/environment medium+hard | **24** |
| **P0** | g2 same topics medium/hard gaps | **~15** |
| **P1** | g3–g4 easy (+1 each topic) | **6** |
| **P1** | g5–g6 materials easy+medium | **~10** |
| **P2** | g3 hard +1 each | **3** |

**Rough total:** ~**58–65** new science bank rows with correct `grades[]`, `topic`, `minLevel`, `maxLevel`, MCQ options.

### Temporary UI gating (optional)

| Option | When |
|--------|------|
| Default science assigned difficulty **easy** for g1–g2 | Until P0 g1/g2 medium/hard banks filled |
| No topic hiding | Always (product rule) |

### Files for science expansion

- `data/science-questions.js` (+ batch import files)
- `data/science-curriculum.js` — topic registry (unchanged)
- `lib/learning-book/science-g1-registry.js` etc. — books already list these pages
- `scripts/fix-science-grades-metadata.mjs` — metadata alignment after adds

---

## 3. Verification after expansion

Re-run:

```bash
node scripts/audit-assigned-activity-topic-availability.mjs
```

Acceptance: all listed grade/topic pairs → **supported** at easy, medium, hard with count=5.

---

## 4. Approval checklist

- [ ] Content owner prioritizes P0 g1 science + g6 English translation  
- [ ] Confirm whether temporary **easy-only default** is acceptable for English/science until banks filled  
- [ ] Mixed topic decision still pending (separate track)  
