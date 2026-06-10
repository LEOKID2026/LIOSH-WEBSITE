# English G1/G2 Phonics Integration — Phase 4B

## Approach

**B — Runtime filter:** `requiresAudio: true` bank rows remain in static pools but are **excluded** from `getRuntimeEligiblePhonicsPool()` until practice-item audio exists. Book-section MP3s are not used for practice MCQs.

## Wiring summary

| Layer | Change |
|-------|--------|
| `data/english-questions/index.js` | Export `PHONICS_POOLS`, `getRuntimeEligiblePhonicsPool`, runtime counts |
| `data/english-curriculum.js` | G1/G2 `topics` prepend `"phonics"` |
| `utils/english-question-generator.js` | `phonics` topic branch + MCQ from pool options |
| `lib/learning-book/english-book-practice-map.js` | Parse `english:phonics:*`; practice targets only when runtime pool non-empty |
| `lib/learning/english-canonical-metadata.js` | Phonics question types; thin diagnostics; no promotion |

## Runtime-eligible items

| Grade | Bank total | Audio excluded | Runtime eligible |
|-------|------------|----------------|------------------|
| G1 | 53 | 20 | **33** |
| G2 | 54 | 27 | **27** |
| **Total** | **107** | **47** | **60** |

## Book practice targets (23 phonics pages)

Practice button appears **only** on pages with ≥1 runtime-eligible item. Audio-only pages (listening / hear-* types only) have **no** practice target.

## Launch status

Internal preview wiring only — **not** external launch-ready / FULL.

## Verification

Run integration checkpoint commands listed in Phase 4B integration spec.
