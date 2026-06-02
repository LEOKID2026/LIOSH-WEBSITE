# Product Quality Phase 20 — Hebrew Subject Structural Cleanup Plan

**Last updated:** 2026-05-05  
**Status:** Planning only — **no bank edits, no runtime changes, no Hebrew wording changes** in this phase. **Audit allowlist (section 9)** implemented separately in [**Phase 21**](product-quality-phase-21-hebrew-spiral-allowlist.md) (audit artifacts only). **Unresolved structural inspection + minimal safe dedupe:** [**Phase 22**](product-quality-phase-22-hebrew-unresolved-structural-fixes.md).  
**Scope:** Hebrew **subject / question bank** metadata and audit signals only — not Hebrew UI copywriting.

**Sources:** [`reports/question-audit/items.json`](../reports/question-audit/items.json), [`reports/question-audit/findings.json`](../reports/question-audit/findings.json) (`hebrewLegacySameStemThreeLevels`), [`reports/question-audit/stage2.json`](../reports/question-audit/stage2.json) (`withinBandClassPairOverlaps`, Hebrew rows), [`docs/product-quality-phase-3-hebrew-owner-review.md`](product-quality-phase-3-hebrew-owner-review.md), [`docs/product-quality-phase-8-subject-coverage-content-plan.md`](product-quality-phase-8-subject-coverage-content-plan.md). Hebrew sources for **ID resolution only:** [`utils/hebrew-question-generator.js`](../utils/hebrew-question-generator.js), [`utils/hebrew-rich-question-bank.js`](../utils/hebrew-rich-question-bank.js).

---

## 1. Purpose

Convert Hebrew duplicate / overlap **signals** into a **structural** cleanup plan that separates:

- **Product-structural** fixes (metadata, pool routing, disabling duplicate rows, grade/difficulty bands, `patternFamily`, audit exclusions) — **without** changing visible Hebrew stems, answers, or correct answers.
- **Wording-required** fixes — only where no structural resolution preserves product intent (reserved for **owner exact wording** in a later phase).

**Explicit non-goals for Phase 20:** implement cleanup; rewrite or generate Hebrew; change answers; merge/delete rows; touch reports runtime, Parent AI, Copilot, UI, APIs, security, coins, overnight QA.

---

## 2. Classification legend (every row maps to exactly one primary class)

| ID | Label | Meaning |
|----|--------|---------|
| **C1** | **keep — acceptable spiral repetition** | Same `stemHash` across adjacent grades by **design** (`rich#N_gX` vs `rich#N_gY` style parallelism). Structural action: confirm in spot-check, then **mark intentional spiral** / exclude from overlap warnings in audit tooling later. |
| **C2** | **true structural duplicate** | Same visible stem reused in a way that **does not** require Hebrew edits to dedupe — e.g. identical stem across **easy / medium / hard** legacy buckets for the same skill intent; removal/disable of redundant rows or collapse of pool membership is sufficient **after** owner policy. |
| **C3** | **grade / difficulty placement issue** | Collision is primarily **bucket / band / pool assignment** (including legacy `G5_HARD` vs `G6_MEDIUM` style mismatches). Fix path: **retag** difficulty, grade band, or pool routing **without** stem edits — pending validation against `items.json`. |
| **C4** | **same stem but different skill** | Identical normalized stem; **`patternFamily` / subtype / spine skill** differ. Fix path: **retag taxonomy** (`patternFamily`, subtype metadata) or split analytics keys **without** visible Hebrew change **if** taxonomies are wrong; otherwise falls through to **C5**. |
| **C5** | **requires owner exact wording** | No acceptable structural-only fix **without** changing visible Hebrew (or owner mandates differentiated prompts). No alternative wording generated in Phase 20. |

---

## 3. Scope inventory

| Bucket | Count | IDs / notes |
|--------|-------|-------------|
| Hebrew audit rows (`subject === hebrew`) | **927** | Baseline population — Phase 20 does **not** re-review all 927 row-by-row; it classifies **flagged** subsets below. |
| Legacy same-stem **three-level** groups (`findings.json`) | **2** | **H-L1**, **H-L2** |
| Adjacent-band overlap rows (`stage2.json`, Hebrew only) | **37** | **H-O01** … **H-O37** (order matches Hebrew-only filter sequence in `withinBandClassPairOverlaps`) |

**Reviewed for Phase 20:** **39** structural units (**2** legacy groups + **37** overlap rows).

---

## 4. Aggregate classification (primary class per unit)

| Primary class | Count | Units |
|---------------|-------|-------|
| **C1** keep / intentional spiral | **28** | **H-O02–H-O14**, **H-O21–H-O33**, **H-O36–H-O37** |
| **C2** true structural duplicate (legacy triple stem) | **2** | **H-L1**, **H-L2** |
| **C3** placement / bucket / legacy band clash | **7** | **H-O01**, **H-O15–H-O20** |
| **C4** same stem, different skill tagging | **2** | **H-O34**, **H-O35** (same `stemHash`, different `patternFamily` row in stage2) |

**C5 overlap:** Any of **H-O01**, **H-O15–H-O20**, **H-O34**, **H-O35**, **H-L1**, **H-L2** may **escalate** to **C5** after structural attempts — **11** overlap-derived rows + **2** legacy groups are **owner-touch** candidates (see Phase 3). Phase 20 records **primary** class above; secondary “may need owner wording” is flagged per row in the register.

**Spiral vs true duplicate (intent):**

- **28** overlap rows are **accepted spiral repetition** (C1) — parallel rich pools across grade bands; risk **low** unless spot-check finds unintended identical distractor sets.
- **2** legacy groups (**H-L1**, **H-L2**) are **true duplicate stems across difficulty labels** (C2) — pedagogically distinct distractors may exist, but **stem text is identical** across easy/medium/hard per findings.
- **H-O01** is **not** spiral by pool naming — it is a **G1 hard vs G2 easy** collision on the **same** comprehension stem (C3; **high** risk; owner may still require C5).
- **H-O15–H-O20** are **late-band legacy** collisions (C3; **high/medium** risk); structural dedupe/disable may apply **without** Hebrew if owner confirms redundancy.
- **H-O34 / H-O35** share one `stemHash` but stage2 lists **two** rows (`sentence_correction` vs `verb_agreement`) — **C4**; if taxonomy correction is insufficient, **C5**.

---

## 5. Structural vs wording-required separation

### 5.1 Structural-only pathways (no visible Hebrew change)

| Path | Applies to | Recommended structural action (later phase) |
|------|------------|-----------------------------------------------|
| Audit / CI hygiene | C1 (28 rows) | **Mark intentional spiral**; exclude `stemHash` from overlap warning list **or** add `intentionalCrossGrade: true` in neutral metadata when schema exists — **no stem edits**. |
| Duplicate removal / disable | C2 (**H-L1**, **H-L2**); possibly redundant rows in **H-O15–H-O20** after review | **Remove duplicate row later** or **disable duplicate from active bank later** (single canonical row per stem+skill intent) — **after** owner policy; **no** automatic merge in Phase 20. |
| Retag only | **H-O01**; **H-O15–H-O20**; **H-O34**/**H-O35** | **Retag difficulty**, **retag grade/band**, **retag patternFamily** / subtype so analytics and routing match intent — **only** if validated against full row pairs in `items.json`. |
| Taxonomy clarity | **H-O34** vs **H-O35** | If both rows are valid skills, ensure **`patternFamily` / subtype** reflect distinct skills (C4); if stem must diverge for learners, that becomes **C5** (owner). |

### 5.2 Wording-required (owner exact Hebrew)

Reserved when:

- Structural routes would **misrepresent** skill intent, **or**
- Pedagogy requires **different prompts** per grade/band, **or**
- Deduplication would remove a **distinct** assessment construct.

**Phase 20 does not propose Hebrew strings.** All **C5** work references [`docs/product-quality-phase-3-hebrew-owner-review.md`](product-quality-phase-3-hebrew-owner-review.md).

---

## 6. Legacy triple-level groups (full rows)

### H-L1 — `grammar::איזה משפט לא תקין?`

| Field | Value |
|-------|--------|
| **Group ID** | H-L1 |
| **Source** | [`utils/hebrew-question-generator.js`](../utils/hebrew-question-generator.js) — pools **`G1_EASY_QUESTIONS`**, **`G1_MEDIUM_QUESTIONS`**, **`G1_HARD_QUESTIONS`** (grammar sections containing this stem). |
| **Source array key** | Per audit: entries tagged with pool keys mapping to the three G1 legacy pools (see `items.json` rows with this `stemText`). |
| **Grades** | Legacy G1 paths (audit: `hebrew_legacy`). |
| **Difficulty** | **easy**, **medium**, **hard** (all three present for same stem per `findings.json`). |
| **patternFamily** | **`grammar_morphology`** (typical on legacy grammar MCQ rows). |
| **stemHash** | Multiple audit rows share the same normalized stem; use `items.json` / audit filter on `stemText` prefix **איזה משפט לא תקין** (note: variant stems may exist for specialized prompts — exclude those from “triple” scope per owner). |
| **Why flagged** | `hebrewLegacySameStemThreeLevels` — identical stem across three difficulty levels. |
| **Primary classification** | **C2** — true structural duplicate (same stem across buckets). |
| **Recommended structural action** | **Disable duplicate from active bank later** (keep one level per owner policy) **or** **remove duplicate row later** after confirming distractors do not justify three tiers. |
| **Visible Hebrew text change** | **No** for structural path; **yes** only if owner chooses differentiated prompts (**C5**). |
| **Owner approval** | **Yes** before any bank change. |
| **Risk** | **High** — learners may encounter the same stem repeatedly in one journey. |

### H-L2 — `grammar::בחרו משפט תקין:`

| Field | Value |
|-------|--------|
| **Group ID** | H-L2 |
| **Source** | [`utils/hebrew-question-generator.js`](../utils/hebrew-question-generator.js) — same three **G1** legacy pools pattern as H-L1. |
| **Grades** | Legacy G1. |
| **Difficulty** | **easy**, **medium**, **hard**. |
| **patternFamily** | **`grammar_morphology`** (typical). |
| **stemHash** | Align via `items.json` rows with `stemText` **בחרו משפט תקין:**. |
| **Why flagged** | Same as H-L1 — `hebrewLegacySameStemThreeLevels`. |
| **Primary classification** | **C2**. |
| **Recommended structural action** | Same as **H-L1**. |
| **Visible Hebrew text change** | **No** for structural path; **yes** only under **C5**. |
| **Owner approval** | **Yes**. |
| **Risk** | **High**. |

---

## 7. Adjacent-band overlaps — full register (H-O01–H-O37)

**Why flagged (global):** Each row appears in **`stage2.withinBandClassPairOverlaps`** for `subject === hebrew` — same **`stemHash`** on **both** sides of a **`bandPair`** (e.g. `g1_vs_g2_early_band`, `g3_vs_g4_mid_band`, `g5_vs_g6_late_band`).

**Columns:** “May need C5” indicates escalation if structural fixes are insufficient (**owner exact wording**).

| ID | bandPair | stemHash (full) | patternFamily (stage2 row) | Sample poolKey | Source file | Grade/difficulty (sample) | Primary class | Recommended structural action | May need C5 | Visible Hebrew change | Owner approval | Risk |
|----|----------|-----------------|----------------------------|----------------|-------------|---------------------------|---------------|------------------------------|-------------|----------------------|----------------|------|
| H-O01 | g1_vs_g2_early_band | `de0354911b95de9ad44cc026` | comprehension_typed_band_early_g1_g2 | G1_HARD_QUESTIONS | utils/hebrew-question-generator.js | G1 hard vs G2 easy (Phase 3 paths) | C3 | **Retag difficulty** / band alignment **or** **disable duplicate** after policy | Yes | Only if retag insufficient | Yes | High |
| H-O02 | g1_vs_g2_early_band | `79e4f72cad1d20cee05e3bbf` | spell_word_early_ab_writing | rich#36_g1 | utils/hebrew-rich-question-bank.js | rich g1 vs g2 parallel | C1 | **mark intentional spiral and exclude from warning later** | No | No | No | Low |
| H-O03 | g1_vs_g2_early_band | `9ad685219c7ad324c02010b9` | spell_word_early_ab_writing | rich#37_g1 | utils/hebrew-rich-question-bank.js | rich g1 vs g2 parallel | C1 | same | No | No | No | Low |
| H-O04 | g3_vs_g4_mid_band | `6a2ad9857e86dff48e858111` | part_of_speech | rich#25_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 mid band | C1 | same | No | No | No | Low |
| H-O05 | g3_vs_g4_mid_band | `da37a5314178ed76542fda0b` | synonym | rich#27_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O06 | g3_vs_g4_mid_band | `0ec045a82811fa8a310f7927` | antonym | rich#28_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O07 | g3_vs_g4_mid_band | `826be299e3b427c278a74f00` | precision | rich#33_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O08 | g3_vs_g4_mid_band | `cdf008e5d4f15b5cd67a6c71` | sentence_read | rich#38_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O09 | g3_vs_g4_mid_band | `c04754a184986189a40939e8` | structured_completion | rich#39_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O10 | g3_vs_g4_mid_band | `52dc1d2cd2c01bbbd6c60d66` | logic_completion | rich#41_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O11 | g3_vs_g4_mid_band | `66b9c746ea637db24013c7ed` | social_reply_mid_help | rich#44_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O12 | g3_vs_g4_mid_band | `fc28241b872907c379e234da` | analogy_reasoning | rich#47_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O13 | g3_vs_g4_mid_band | `8883e640b6f4ce786f35c7d3` | morphology | rich#49_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O14 | g3_vs_g4_mid_band | `d4661209298d073b68d1745a` | semantic_field | rich#52_g3 | utils/hebrew-rich-question-bank.js | G3 vs G4 | C1 | same | No | No | No | Low |
| H-O15 | g5_vs_g6_late_band | `67896186392d1f45166a2066` | vocabulary_typed | G5_MEDIUM_QUESTIONS | utils/hebrew-question-generator.js | Legacy late band G5/G6 | C3 | **Retag** / **dedupe** duplicate row later / **disable** redundant pool member | Yes | Only if dedupe needs different stem | Yes | High |
| H-O16 | g5_vs_g6_late_band | `68a9da2f2c17757224d1811c` | comprehension_infer | G5_HARD_QUESTIONS | utils/hebrew-question-generator.js | Legacy late band | C3 | same | Yes | Same | Yes | High |
| H-O17 | g5_vs_g6_late_band | `1464d31153471210d8d526a5` | comprehension_typed_band_late_g5_g6 | G5_HARD_QUESTIONS | utils/hebrew-question-generator.js | Legacy late band | C3 | same | Yes | Same | Yes | High |
| H-O18 | g5_vs_g6_late_band | `ac17ef3c224d5be5d7d1e881` | writing_spelling_band_late_g5_g6 | G5_HARD_QUESTIONS | utils/hebrew-question-generator.js | Legacy late band | C3 | same | Yes | Same | Yes | Medium |
| H-O19 | g5_vs_g6_late_band | `2f364c7a884f52a5d42b5fda` | speaking_phrase_band_late_g5_g6 | G5_HARD_QUESTIONS | utils/hebrew-question-generator.js | Legacy late band | C3 | same | Yes | Same | Yes | Medium |
| H-O20 | g5_vs_g6_late_band | `71d28944b66247a8ba283ae8` | speaking_phrase_band_late_g5_g6 | G5_HARD_QUESTIONS | utils/hebrew-question-generator.js | Legacy late band | C3 | same | Yes | Same | Yes | Medium |
| H-O21 | g5_vs_g6_late_band | `84e223a5922743f1d11d7a80` | sequence | rich#4_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | **mark intentional spiral** | No | No | No | Low |
| H-O22 | g5_vs_g6_late_band | `da6619e7587165fc79840b03` | reference | rich#5_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O23 | g5_vs_g6_late_band | `453ec8757b98350c03136d3c` | main_idea | rich#6_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O24 | g5_vs_g6_late_band | `8bbed894472c308de3622b3e` | compare_statements | rich#9_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O25 | g5_vs_g6_late_band | `37e7037da668504ff33543d6` | tense_shift | rich#20_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O26 | g5_vs_g6_late_band | `6cbab1e1865511d21807383f` | sentence_correction | rich#21_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O27 | g5_vs_g6_late_band | `783dff40552f725071ae8482` | transform | rich#24_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O28 | g5_vs_g6_late_band | `2ba0538b85ed2a5ec5cb13d3` | binary_grammar | rich#26_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O29 | g5_vs_g6_late_band | `b5b0f104f36af44a37800ab7` | context_fit | rich#29_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O30 | g5_vs_g6_late_band | `a25f1e14e63cd06340950f6a` | category_exclusion | rich#30_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O31 | g5_vs_g6_late_band | `9bb273f6e0ee68a816efbccd` | rephrase | rich#40_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O32 | g5_vs_g6_late_band | `1e818e598517ea5380f83953` | implicit_tone | rich#45_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O33 | g5_vs_g6_late_band | `71a97fec43ae213bc60e9805` | supporting_detail | rich#46_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |
| H-O34 | g5_vs_g6_late_band | `42682abfc4af20a01f81d36a` | sentence_correction | rich#48_g5 | utils/hebrew-rich-question-bank.js | rich **#48** G5/G6 | C4 | **Retag patternFamily** / subtype if misclassified; else owner | Yes | If taxonomy OK but UX ambiguous | Yes | High |
| H-O35 | g5_vs_g6_late_band | `42682abfc4af20a01f81d36a` | verb_agreement | rich#50_g5 | utils/hebrew-rich-question-bank.js | rich **#50** G5/G6 (distinct pools from **#48**) | C4 | same | Yes | Same | Yes | High |
| H-O36 | g5_vs_g6_late_band | `ad4b531737604021084585a5` | collocation | rich#51_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | **mark intentional spiral** | No | No | No | Low |
| H-O37 | g5_vs_g6_late_band | `0755dab1d0b6bbdaa7561382` | structural | rich#53_g5 | utils/hebrew-rich-question-bank.js | rich G5 vs G6 | C1 | same | No | No | No | Low |

**Note:** Hashes above match **`reports/question-audit/stage2.json`** (`withinBandClassPairOverlaps`, Hebrew rows, stable audit snapshot).

---

## 8. Verification command (full hashes)

After **Phase 21**, Hebrew overlaps are split: **`withinBandClassPairOverlaps`** = unresolved only (**9**); **`hebrewIntentionalSpiralOverlaps`** = intentional C1 (**28**). Run from repo root:

```bash
node -e "const s=require('./reports/question-audit/stage2.json'); const u=s.withinBandClassPairOverlaps.filter(x=>x.subject==='hebrew'); const i=s.hebrewIntentionalSpiralOverlaps||[]; console.log('unresolved',u.length); u.forEach((o,x)=>console.log('H-unresolved',x+1,o.stemHash,o.patternFamily,o.bandPair)); console.log('intentional',i.length); i.forEach((o,x)=>console.log('H-spiral',x+1,o.stemHash,o.patternFamily,o.bandPair));"
```

Cross-check **`items.json`** for both sides of each band pair using `stemHash` + `patternFamily` as filters.

---

## 9. First recommended Hebrew structural patch (audit allowlist — executed in Phase 21)

**Implemented:** [`docs/product-quality-phase-21-hebrew-spiral-allowlist.md`](product-quality-phase-21-hebrew-spiral-allowlist.md) — [`scripts/question-audit-hebrew-spiral-allowlist.json`](../scripts/question-audit-hebrew-spiral-allowlist.json) + partitioning in [`scripts/audit-question-banks.mjs`](../scripts/audit-question-banks.mjs). Suppresses **unresolved** overlap noise for **28** **C1** rows only; **no** bank JSON or Hebrew string edits.

**Rationale (historical):** Zero content risk; unblocks triage toward **C2–C5** items (**H-L1**, **H-L2**, **H-O01**, **H-O15–H-O20**, **H-O34–H-O35**).

---

## 10. Phase 20 confirmations

| Confirmation | Status |
|--------------|--------|
| No Hebrew wording changed in Phase 20 | **Yes** — documentation only. |
| No question content, answers, or correct answers changed | **Yes** — planning only. |
| No runtime / product logic changed | **Yes**. |

---

## 11. Recommended next action

1. Owner / PM reviews **C2** (**H-L1**, **H-L2**) and **C3/C4 high-risk** rows (**H-O01**, **H-O15–H-O20**, **H-O34–H-O35**) against [`docs/product-quality-phase-3-hebrew-owner-review.md`](product-quality-phase-3-hebrew-owner-review.md).  
2. ~~Implement the audit allowlist~~ → **Done** — [**Phase 21**](product-quality-phase-21-hebrew-spiral-allowlist.md).  
3. Schedule **structural** bank work (retag / disable / dedupe) **after** written owner decisions — **no** Hebrew edits until owner approves **C5** cases.

---

## 12. References

- Phase 3 decision map: [`docs/product-quality-phase-3-hebrew-owner-review.md`](product-quality-phase-3-hebrew-owner-review.md)  
- Coverage plan: [`docs/product-quality-phase-8-subject-coverage-content-plan.md`](product-quality-phase-8-subject-coverage-content-plan.md)  
- Audit artifacts: [`reports/question-audit/`](../reports/question-audit/)

---

## 13. דוח סיכום (Phase 20) — מנקודת מבט מוצר

1. **קבצים:** נוצר [`docs/product-quality-phase-20-hebrew-structural-cleanup-plan.md`](product-quality-phase-20-hebrew-structural-cleanup-plan.md); עודכנו [`docs/product-quality-phase-3-hebrew-owner-review.md`](product-quality-phase-3-hebrew-owner-review.md) ו-[`docs/product-quality-phase-8-subject-coverage-content-plan.md`](product-quality-phase-8-subject-coverage-content-plan.md) (קישורים ל-Phase 20 בלבד).
2. **נפח סקירה:** סווגו **39** יחידות מבניות — **2** קבוצות legacy (**H-L1**, **H-L2**) + **37** שורות חפיפה (**H-O01–H-O37**). בסיס כללי: **927** שורות עברית ב־`items.json` (לא נסרקו כולן מחדש).
3. **שמירה / ספירלה מכוונת:** **28** שורות (**H-O02–H-O14**, **H-O21–H-O33**, **H-O36–H-O37**) — סיווג **C1** (ספירלה תקינה).
4. **כפילות מבנית אמיתית:** **2** קבוצות (**H-L1**, **H-L2**) — אותו גזע בשלוש רמות קושי בבריכות legacy.
5. **תיקון רק עם ריטוג (ללא שינוי ניסוח):** **7** שורות חפיפה (**H-O01**, **H-O15–H-O20**) כמועמדות עיקריות ל־**C3**; **H-O34**/**H-O35** כמועמדות **C4** לריטוג טקסונומי אם יואמת מול הזוגות המלאים ב־`items.json`.
6. **דורש ניסוח מדויק של הבעלים (אם אין פתרון מבני):** עד **11** ישויות בסיכון (**H-O01**, **H-O15–H-O20**, **H-O34**, **H-O35**, **H-L1**, **H-L2**) — רק אחרי ניסיון מסלול מבני.
7. **תיקון מבני עברי ראשון מומלץ:** הוספת **רשימת היתרים לאודיט** (או מניפסט `intentionalSpiralStemHashes`) ל־**28** ערכי `stemHash` של **C1** — ללא שינוי בנק או בעברית.
8. **אישור:** לא שינינו ניסוח עברי גלוי במסמכים או בבנק.
9. **אישור:** לא שינינו תוכן שאלות, תשובות או תשובות נכונות — תכנון בלבד.
10. **המלצה להמשך:** אישור בעלים על סדר עדיפויות ל־**H-L1**/**H-L2** ולשורות **High** (**H-O01**, **H-O15–H-O17**, **H-O34–H-O35**), ואז יישום רשימת ההיתרים לאודיט בשלב גאומטריה נפרד.
