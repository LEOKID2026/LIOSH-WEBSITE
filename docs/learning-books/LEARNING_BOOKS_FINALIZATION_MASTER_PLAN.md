# Learning Books Finalization Master Plan

**Version:** 1.0  
**Date:** 2026-06-03  
**Status:** Approved for implementation  
**Scope:** 35 books · 602 registered pages · 6 subjects · grades 1–6  
**Source audit:** `docs/learning-books/BOOK_PEDAGOGY_RICHNESS_AUDIT.md`

---

## Table of Contents

1. [Executive Decision](#1-executive-decision)
2. [Master Inventory by Wave](#2-master-inventory-by-wave)
3. [Subject-Specific Quality Standards](#3-subject-specific-quality-standards)
4. [Implementation Waves and Task Lists](#4-implementation-waves-and-task-lists)
5. [Acceptance Criteria](#5-acceptance-criteria)
6. [Hard Restrictions](#6-hard-restrictions)
7. [Per-Subject Style Guide and Checklist](#7-per-subject-style-guide-and-checklist)
8. [Cross-Grade Differentiation Reference](#8-cross-grade-differentiation-reference)
9. [Verification Checklist](#9-verification-checklist)
10. [Final Freeze Checklist](#10-final-freeze-checklist)
11. [Risk Register](#11-risk-register)
12. [Reference](#12-reference)

---

## 1. Executive Decision

### Decision

Every learning book in the Liosh platform must be finalized before children are exposed to the site. This is a one-time pre-launch content finalization, not a minimal fix pass.

### Rationale

- The site is in private development. The owner is the only viewer. Deep content improvement is permitted now.
- After children begin using the books, major structural rewrites will disrupt their learning progress and cannot be done safely.
- The audit found 602 pages across 35 books. 44 pages are rated C (do not launch), 122 are rated B (need enrichment), and 436 are rated A (most need minor polish).
- Many A-rated and B-rated pages share near-identical structure across grades (cross-grade generic families), undermining age-appropriate progression.
- The goal is not 0 C-pages. The goal is every page being rich, age-appropriate, subject-specific, and frozen for launch.

### Scope

| Metric | Value |
|---|---|
| Total subjects | 6 (Math, Geometry, Science, Hebrew, English, Moledet/Geography) |
| Total books | 35 |
| Total registered pages | 602 |
| Pages rated A (good) | 436 |
| Pages rated B (enrichment needed) | 122 |
| Pages rated C (do not launch) | 44 |
| Pages rated D | 0 |
| Cross-grade generic families identified | 14 |
| Estimated P1 tasks | 44 |
| Estimated P2 tasks | ~180 |
| Estimated P3 tasks | ~290 |
| Estimated P4 tasks (verify only) | ~91 |

### Implementation Model

Nine sequential implementation waves, executed subject by subject. Each wave targets a full subject-grade block, ensuring focus and enabling consistent quality review before moving on. Wave 9 is a cross-project re-audit and freeze pass.

---

### C-Rated Page Reconciliation (Audit → Plan)

All 44 C-rated pages from the source audit (`docs/learning-books/BOOK_PEDAGOGY_RICHNESS_AUDIT.md`) are listed below and mapped to their P1 assignment in this plan. No C-rated page may disappear from the plan without an explicit documented reason.

| # | Subject | Grade | Page ID | Audit C-rating confirmed | Plan P1 assignment | Wave | Notes |
|---|---------|-------|---------|--------------------------|-------------------|------|-------|
| 1 | English | G1 | sentence_base | ✓ | P1 | Wave 1 | §3/§4 weak, no §5 |
| 2 | English | G1 | vocab_actions | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 3 | English | G1 | vocab_animals | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing |
| 4 | English | G1 | vocab_emotions | ✓ | P1 | Wave 1 | §2 very thin, §3/§4 weak, §5 missing |
| 5 | English | G1 | vocab_school | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 6 | English | G2 | grammar_be | ✓ | P1 | Wave 1 | §3/§4 weak, no dialogue |
| 7 | English | G2 | grammar_plural_questions | ✓ | P1 | Wave 1 | §3/§4 weak |
| 8 | English | G2 | sentence_base | ✓ | P1 | Wave 1 | §3/§4 weak, no dialogue |
| 9 | English | G2 | sentence_routine | ✓ | P1 | Wave 1 | §3/§4 weak, no dialogue |
| 10 | English | G2 | translation_classroom | ✓ | P1 | Wave 1 | §3/§4 weak |
| 11 | English | G2 | vocab_actions | ✓ | P1 | Wave 1 | §2 very thin, §3 weak |
| 12 | English | G2 | vocab_animals | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 13 | English | G2 | vocab_emotions | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 14 | English | G2 | vocab_family | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 15 | English | G2 | vocab_food | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 16 | English | G2 | vocab_house | ✓ | P1 | Wave 1 | §3 very thin, §4 weak |
| 17 | English | G2 | vocab_numbers | ✓ | P1 | Wave 1 | §3/§4 weak |
| 18 | English | G2 | vocab_school | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 19 | English | G3 | grammar_present_simple | ✓ | P1 | Wave 1 | §3/§4 weak |
| 20 | English | G3 | translation_routines | ✓ | P1 | Wave 1 | §3/§4 weak |
| 21 | English | G3 | vocab_actions | ✓ | P1 | Wave 1 | §3/§4 weak |
| 22 | English | G3 | vocab_animals | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 23 | English | G3 | vocab_body | ✓ | P1 | Wave 1 | §3/§4 weak |
| 24 | English | G3 | vocab_family | ✓ | P1 | Wave 1 | §3 weak, §5 missing |
| 25 | English | G3 | vocab_food | ✓ | P1 | Wave 1 | §3/§4 weak, §5 missing, vocab thin |
| 26 | English | G3 | vocab_weather | ✓ | P1 | Wave 1 | §3/§4 weak |
| 27 | Math | G5 | eq_mul | ✓ | P1 | Wave 3 | §3 very thin, §4/§5 weak, numbers too small |
| 28 | Math | G5 | est_mul | ✓ | P1 | Wave 3 | §3/§4 weak, §5 missing |
| 29 | Math | G5 | frac_expand | ✓ | P1 | Wave 3 | §3/§4 weak |
| 30 | Math | G5 | mixed_to_frac | ✓ | P1 | Wave 3 | §3/§4 weak |
| 31 | Math | G5 | wp_distance_time | ✓ | P1 | Wave 3 | §3 very thin, real-life missing |
| 32 | Math | G5 | wp_unit_cm_to_m | ✓ | P1 | Wave 3 | §3 very thin, §4 weak, real-life missing |
| 33 | Math | G5 | wp_unit_g_to_kg | ✓ | P1 | Wave 3 | §3 very thin, §4 weak, real-life missing |
| 34 | Math | G6 | dec_add | ✓ | P1 | Wave 3 | §3 very thin, numbers too small, thin explanation |
| 35 | Math | G6 | dec_sub | ✓ | P1 | Wave 3 | §3 very thin, numbers too small, cross-grade |
| 36 | Math | G6 | eq_div | ✓ | P1 | Wave 3 | §3 very thin, numbers too small |
| 37 | Math | G6 | eq_mul | ✓ | P1 | Wave 3 | §3 very thin, numbers too small |
| 38 | Math | G6 | fm_multiple | ✓ | P1 | Wave 3 | §3 weak, §5 missing, numbers too small |
| 39 | Math | G6 | frac_as_division | ✓ | P1 | Wave 3 | §3 very thin, numbers too small |
| 40 | Math | G6 | frac_multiply | ✓ | P1 | Wave 3 | §3 very thin, numbers too small |
| 41 | Math | G6 | ratio_second | ✓ | P1 | Wave 3 | §3 very thin, numbers too small |
| 42 | Math | G6 | wp_unit_cm_to_m | ✓ | P1 | Wave 3 | §3 very thin, §5 missing, real-life missing |
| 43 | Math | G6 | wp_unit_g_to_kg | ✓ | P1 | Wave 3 | §3 very thin, §5 missing, real-life missing |
| 44 | Hebrew | G4 | g4.present_text_based_choice | ✓ | P1 | Wave 7 | §3/§4 weak, no guided solve |

**Reconciliation summary:**
- Source audit C-rated pages: **44**
- Plan P1 assignments: **44**
- Difference: **0**
- No C-rated page from the audit is absent from this plan.
- No C-rated page has been reclassified without documentation.

**Subject-level breakdown:**

| Subject | Audit C | Plan P1 | Wave |
|---------|---------|---------|------|
| English G1–G3 | 26 | 26 | Wave 1 |
| Math G5–G6 | 17 | 17 | Wave 3 |
| Hebrew G4 | 1 | 1 | Wave 7 |
| All other subjects | 0 | 0 | — |
| **Total** | **44** | **44** | |

---

## 2. Master Inventory by Wave

**Column definitions:**

- **Page ID** — file name (without `.md`), matching the path `docs/learning-book/{subject}/{grade}/drafts/{page_id}.md`
- **Title** — Hebrew display title
- **Rating** — A / B / C from the pedagogy audit
- **Audit Issues** — key findings from the audit
- **Required Fix** — primary action needed
- **Priority** — P1 (C-rated, block launch), P2 (B-rated with 2+ issues or cross-grade generic), P3 (B-rated 1 issue or A with notes), P4 (A-rated, verify only)
- **Status** — all begin as `pending`

---

### Wave 1 — English G1, G2, G3 (44 pages)

> **Goal:** Establish the core English vocabulary and sentence-foundation pages for lower grades. Fix all C-rated pages. Add real English dialogue samples, expand §3 (simple example), ensure §5 (try it yourself) is present.

#### English — Grade 1 (10 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| grammar_be | I am / You are | B | §3 weak; no dialogue sample | add dialogue examples | P3 | pending |
| sentence_base | משפטים קצרים — בסיס | C | §3 weak; §4 weak; no dialogue; no §5 | add examples + dialogue + self-check | P1 | pending |
| translation_classroom | ביטויי כיתה | B | §3 weak; §4 weak | add examples | P2 | pending |
| vocab_actions | פעולות באנגלית | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + real-life context | P1 | pending |
| vocab_animals | חיות באנגלית | C | §3 weak; §4 weak; §5 missing | add examples + self-check | P1 | pending |
| vocab_colors | צבעים באנגלית | A | §3 weak note | add sentence examples | P3 | pending |
| vocab_emotions | רגשות באנגלית | C | §2 very thin; §3 weak; §4 weak; §5 missing | add explanation + dialogue + self-check | P1 | pending |
| vocab_family | משפחה באנגלית | B | §3 weak; vocab thin | add examples | P3 | pending |
| vocab_numbers | מספרים 0–10 | A | §3 weak note | add examples | P3 | pending |
| vocab_school | בית ספר באנגלית | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + self-check | P1 | pending |

#### English — Grade 2 (15 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| grammar_be | am/is/are — חיזוק | C | §3 weak; §4 weak; no dialogue | add dialogue + self-check | P1 | pending |
| grammar_plural_questions | ריבוי ושאלות | C | §3 weak; §4 weak | add examples | P1 | pending |
| sentence_base | משפטים קצרים — ב׳ | C | §3 weak; §4 weak; no dialogue | add dialogue + self-check | P1 | pending |
| sentence_routine | שגרת יום | C | §3 weak; §4 weak; no dialogue | add dialogue + scene | P1 | pending |
| translation_classroom | ביטויי כיתה — משפטים | C | §3 weak; §4 weak | add examples | P1 | pending |
| translation_routines | שגרת יום — תרגום | B | §5 missing; no dialogue | add self-check + dialogue | P3 | pending |
| vocab_actions | פעולות — פועל במשפט | C | §2 very thin; §3 weak | add explanation + scene | P1 | pending |
| vocab_animals | חיות — שמות ומשפטים | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + self-check | P1 | pending |
| vocab_colors | צבעים — שימוש במשפט | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| vocab_emotions | רגשות — במשפט | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + dialogue | P1 | pending |
| vocab_family | משפחה — מילים במשפט | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + self-check | P1 | pending |
| vocab_food | מזון באנגלית | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + self-check | P1 | pending |
| vocab_house | בית — חדרים וחפצים | C | §3 very thin; §4 weak | add explanation + examples + dialogue | P1 | pending |
| vocab_numbers | מספרים — עד 20 | C | §3 weak; §4 weak | add examples | P1 | pending |
| vocab_school | בית ספר — חפצים | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + self-check | P1 | pending |

#### English — Grade 3 (19 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| grammar_articles_prepositions | a/an/the ומילות יחס | B | §5 missing; no dialogue | add self-check + dialogue | P3 | pending |
| grammar_present_simple | Present Simple — ג׳ | C | §3 weak; §4 weak | add examples | P1 | pending |
| grammar_question_frames | שאלות — חיזוק | A | clean | verify | P4 | pending |
| sentence_descriptive | משפטים תיאוריים | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| sentence_routine | שגרת יום — מלאים | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| translation_hobbies | תחביבים — תרגום | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| translation_routines | שגרה — תרגום מורחב | C | §3 weak; §4 weak | add examples | P1 | pending |
| vocab_actions | פעולות — Present Simple | C | §3 weak; §4 weak | add examples | P1 | pending |
| vocab_animals | חיות — במשפט מלא | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples + self-check | P1 | pending |
| vocab_body | גוף האדם באנגלית | C | §3 weak; §4 weak | add examples | P1 | pending |
| vocab_colors | צבעים — תיאור | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| vocab_emotions | רגשות — She feels… | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| vocab_family | משפחה — פעולות | C | §3 weak; §5 missing | add examples + self-check | P1 | pending |
| vocab_food | מזון — I eat… | C | §3 weak; §4 weak; §5 missing; vocab thin | add examples | P1 | pending |
| vocab_house | בית — חפצים ומיקום | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| vocab_numbers | מספרים — There are… | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| vocab_school | בית ספר — We learn… | A | §5 missing note | add self-check | P3 | pending |
| vocab_sports | ספורט באנגלית | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| vocab_weather | מזג אוויר | C | §3 weak; §4 weak | add examples | P1 | pending |

---

### Wave 2 — English G4, G5, G6 (57 pages)

> **Goal:** Finalize upper-grade English with grammar focus, narrative writing, and communicative dialogue. All B-rated grammar pages need a §5 self-check and at least one authentic English exchange. All cross-grade vocabulary families need grade-specific sentence complexity upgrades.

#### English — Grade 4 (19 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| grammar_present_simple | Present Simple — חיזוק ד׳ | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| grammar_quantifiers | some/any, much/many — ד׳ | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| grammar_simple_continuous | Present Simple vs Continuous | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| sentence_descriptive | תיאור — ד׳ | B | §5 missing; no dialogue | add self-check + dialogue | P3 | pending |
| sentence_narrative | סיפור קצר | B | §5 missing; no dialogue | add self-check + dialogue | P3 | pending |
| sentence_routine | שגרה — every day | B | §5 missing; no dialogue | add self-check + dialogue | P3 | pending |
| translation_community | קהילה — תרגום ד׳ | B | §5 missing; no dialogue | add self-check + dialogue | P3 | pending |
| translation_hobbies | תחביבים — Continuous | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| vocab_animals | חיות — עכשיו פעולה | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| vocab_body | גוף — פעולות | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| vocab_community | קהילה | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| vocab_emotions | רגשות — They feel… | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| vocab_environment | סביבה — ד׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_family | משפחה — parents | A | §5 missing note | add self-check | P3 | pending |
| vocab_food | מזון — healthy | A | §5 missing note | add self-check | P3 | pending |
| vocab_school | בית ספר — students | A | §5 missing note | add self-check | P3 | pending |
| vocab_sports | ספורט — עכשיו | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| vocab_travel | נסיעות — ד׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_weather | מזג אוויר — היום | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |

#### English — Grade 5 (21 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| grammar_comparatives | Comparatives — ה׳ | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| grammar_future_forms | Future will / going to | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| grammar_modals | Modals — ה׳ | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| grammar_past_simple | Past Simple | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| grammar_quantifiers | much/many — ה׳ | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| sentence_advanced | משפטים מורחבים | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| sentence_narrative | סיפור — ה׳ | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| translation_community | קהילה — תרגום ה׳ | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| translation_global | עולם — תרגום | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| translation_technology | טכנולוגיה — תרגום | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| vocab_animals | חיות — Past Simple | A | §5 missing note | add self-check | P3 | pending |
| vocab_community | קהילה — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_emotions | רגשות — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_environment | סביבה — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_family | משפחה — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_food | מזון — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_health | בריאות — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_school | בית ספר — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_sports | ספורט — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_technology | טכנולוגיה — ה׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_travel | נסיעות — ה׳ | A | §5 missing note | add self-check | P3 | pending |

#### English — Grade 6 (17 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| grammar_comparatives | Superlatives — ו׳ | A | no dialogue sample | add dialogue | P3 | pending |
| grammar_complex_tenses | Past Continuous | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| grammar_conditionals | Conditionals | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| grammar_modals | should/might/could | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| sentence_advanced | While…was… | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| translation_global | עולם — תנאי | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| translation_technology | טכנולוגיה מתקדם | B | §5 missing; no dialogue | add self-check + dialogue | P2 | pending |
| vocab_animals | חיות — Past Continuous | A | §5 missing note | add self-check | P3 | pending |
| vocab_community | קהילה — ו׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_culture | תרבות | A | §5 missing note | add self-check | P3 | pending |
| vocab_emotions | רגשות — ו׳ | A | clean | verify | P4 | pending |
| vocab_environment | סביבה — ו׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_global_issues | סוגיות גלובליות | A | §5 missing note | add self-check | P3 | pending |
| vocab_health | בריאות — ו׳ | A | clean | verify | P4 | pending |
| vocab_history | היסטוריה | A | §5 missing note | add self-check | P3 | pending |
| vocab_technology | טכנולוגיה — ו׳ | A | §5 missing note | add self-check | P3 | pending |
| vocab_travel | נסיעות — ו׳ | A | §5 missing note | add self-check | P3 | pending |

---

### Wave 3 — Math G5, G6 (84 pages)

> **Goal:** Eliminate all C-rated math pages in grades 5–6. Upgrade fractions, decimals, ratios, and percentages to real-life contexts with grade-appropriate numerical magnitudes. Fix cross-grade generic bullet lists into structured worked examples or tables.

#### Math — Grade 5 (40 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| add_three | חיבור שלושה מספרים | A | bullet list; cross-grade 99% match | replace bullets with table; grade-differentiate | P2 | pending |
| add_two | חיבור עד 100,000 | A | §3 weak; cross-grade family | add worked example with 5-digit numbers | P2 | pending |
| cmp | השוואת מספרים עד 100,000 | A | clean | verify | P4 | pending |
| dec_add | חיבור עשרוניים — ה׳ | B | §3 very thin; §3 weak | add worked examples | P2 | pending |
| dec_sub | חיסור עשרוניים — ה׳ | B | §3 very thin; §3 weak; cross-grade | add worked examples; differentiate | P2 | pending |
| div | חילוק — ה׳ | B | §5 missing; bullet list | add self-check; replace bullets | P3 | pending |
| div_two_digit | חילוק דו-ספרתי | B | §5 missing; bullet list | add self-check; replace bullets | P3 | pending |
| div_with_remainder | חילוק עם שארית | A | bullet list | replace bullets with worked example | P3 | pending |
| eq_add | משוואת חיבור — ה׳ | A | §3 weak; cross-grade | add worked example; differentiate | P3 | pending |
| eq_div | משוואת חילוק — ה׳ | A | §3 weak | add worked example | P3 | pending |
| eq_mul | משוואת כפל — ה׳ | C | §3 very thin; §3 weak; §4 weak; §5 missing; numbers too small | add worked example with realistic numbers | P1 | pending |
| eq_sub | משוואת חיסור — ה׳ | A | §3 weak; cross-grade family | add worked example; differentiate | P2 | pending |
| est_add | אומדן חיבור — ה׳ | A | clean | verify | P4 | pending |
| est_mul | אומדן כפל — ה׳ | C | §3 weak; §4 weak; §5 missing | add worked example + self-check | P1 | pending |
| est_quantity | אומדן כמות — ה׳ | A | clean | verify | P4 | pending |
| fm_factor | גורמים — ה׳ | B | §3 weak; §5 missing; cross-grade | add examples; add self-check; differentiate | P2 | pending |
| fm_gcd | מ.א.ח — ה׳ | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| fm_multiple | כפולות — ה׳ | B | §3 weak; §5 missing | add examples + self-check | P3 | pending |
| frac_add_sub | חיבור וחיסור שברים | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| frac_expand | הרחבת שבר | C | §3 weak; §4 weak | add worked example | P1 | pending |
| frac_reduce | צמצום שבר | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| frac_to_mixed | שבר למספר מעורב | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| mixed_to_frac | מספר מעורב לשבר | C | §3 weak; §4 weak | add worked example | P1 | pending |
| mul | כפל — אסטרטגיות | A | §5 missing | add self-check | P3 | pending |
| ns_complement100 | השלמה ל-100 — ה׳ | B | numbers too small; bullet list | scale numbers; replace bullets | P3 | pending |
| ns_neighbors | שכנים עד 100,000 | A | bullet list | replace bullets with table | P3 | pending |
| ns_place_hundreds | ערך המקום עד 100,000 | A | bullet list; cross-grade 76% | replace bullets; differentiate | P2 | pending |
| perc_discount | הנחה באחוזים | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| perc_part_of | אחוז מכמות | B | §3 weak; §4 weak; numbers too small | add examples; scale numbers | P2 | pending |
| round | עיגול — ה׳ | A | §5 missing | add self-check | P3 | pending |
| sequence | סדרות — ה׳ | A | bullet list; cross-grade 92% | replace bullets; differentiate | P2 | pending |
| sub_two | חיסור עד 100,000 | A | clean | verify | P4 | pending |
| wp_comparison_more | כמה יותר? — ה׳ | B | real-life missing; bullet list; cross-grade | add real-life context; replace bullets | P2 | pending |
| wp_distance_time | מרחק, זמן, מהירות | C | §3 very thin; real-life missing | add worked example + real-life | P1 | pending |
| wp_leftover | מה נשאר? — ה׳ | B | real-life missing; numbers too small | add real-life context; scale numbers | P3 | pending |
| wp_multi_step | כמה שלבים | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| wp_shop_discount | קניות והנחה — ה׳ | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| wp_time_sum | סכום זמנים — ה׳ | A | numbers too small note | scale numbers | P3 | pending |
| wp_unit_cm_to_m | המרת ס״מ למטר — ה׳ | C | §3 very thin; §4 weak; real-life missing | add worked example + real-life | P1 | pending |
| wp_unit_g_to_kg | המרת גרם לק״ג — ה׳ | C | §3 very thin; §4 weak; real-life missing | add worked example + real-life | P1 | pending |

#### Math — Grade 6 (44 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| add_three | חיבור שלושה מספרים — ו׳ | A | bullet list; cross-grade 99% | replace bullets; grade-differentiate | P2 | pending |
| add_two | חיבור עד 200,000 | A | bullet list; cross-grade family | replace bullets; differentiate | P2 | pending |
| cmp | השוואה — ו׳ | A | bullet list | replace bullets with table | P3 | pending |
| dec_add | חיבור עשרוניים — ו׳ | C | §3 very thin; numbers too small; thin explanation | add worked example; scale numbers | P1 | pending |
| dec_divide | חילוק עשרוניים | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| dec_divide_10_100 | חילוק ב-10/100 | B | §3 very thin; §3 weak | add worked examples | P2 | pending |
| dec_multiply | כפל עשרוניים | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| dec_multiply_10_100 | כפל ב-10/100 | B | §3 very thin; §3 weak | add worked examples | P2 | pending |
| dec_repeating | עשרוניים מחזוריים | A | §5 missing | add self-check | P3 | pending |
| dec_sub | חיסור עשרוניים — ו׳ | C | §3 very thin; numbers too small; cross-grade | add worked example; scale; differentiate | P1 | pending |
| div | חילוק — ו׳ | A | bullet list | replace bullets with table | P3 | pending |
| div_with_remainder | חילוק עם שארית — ו׳ | A | clean | verify | P4 | pending |
| eq_add | משוואת חיבור — ו׳ | A | clean | verify | P4 | pending |
| eq_div | משוואת חילוק — ו׳ | C | §3 very thin; numbers too small | add worked example; scale numbers | P1 | pending |
| eq_mul | משוואת כפל — ו׳ | C | §3 very thin; numbers too small | add worked example; scale numbers | P1 | pending |
| eq_sub | משוואת חיסור — ו׳ | A | cross-grade family | verify differentiation | P2 | pending |
| fm_factor | גורמים — ו׳ | B | §3 weak; §5 missing; cross-grade | add examples + self-check; differentiate | P2 | pending |
| fm_gcd | מ.א.ח — ו׳ | A | §3 weak note | add worked example | P3 | pending |
| fm_multiple | כפולות — ו׳ | C | §3 weak; §5 missing; numbers too small | add examples + self-check; scale numbers | P1 | pending |
| frac_as_division | שבר כחילוק | C | §3 very thin; numbers too small | add worked example; scale numbers | P1 | pending |
| frac_divide | חילוק שברים | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| frac_multiply | כפל שברים | C | §3 very thin; numbers too small | add worked example; scale numbers | P1 | pending |
| mul | כפל — ו׳ | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| ns_complement100 | השלמה ל-100 — ו׳ | B | numbers too small; bullet list | scale numbers; replace bullets | P3 | pending |
| ns_neighbors | שכנים גדולים | A | bullet list | replace bullets | P3 | pending |
| ns_place_hundreds | ערך המקום עד 200,000 | A | cross-grade 76% | verify differentiation | P2 | pending |
| perc_discount | הנחה — ו׳ | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| perc_part_of | אחוז מכמות — ו׳ | B | §3 very thin; §3 weak | add worked examples | P2 | pending |
| ratio_find | מציאת כמות ביחס | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| ratio_first | יחס — מה זה? | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| ratio_second | יחס בין כמויות | C | §3 very thin; numbers too small | add worked example; scale numbers | P1 | pending |
| round | עיגול — ו׳ | A | §5 missing | add self-check | P3 | pending |
| scale_find | קנה מידה | A | §3 weak note | add worked example | P3 | pending |
| scale_map_to_real | ממפה למציאות | A | §3 weak note | add worked example | P3 | pending |
| scale_real_to_map | ממציאות למפה | A | §3 weak note | add worked example | P3 | pending |
| sequence | סדרות — ו׳ | A | bullet list; cross-grade 92% | replace bullets; differentiate | P2 | pending |
| sub_two | חיסור עד 200,000 | B | §3 weak; bullet list | add examples; replace bullets | P2 | pending |
| wp_comparison_more | כמה יותר? — ו׳ | A | bullet list; cross-grade | replace bullets; verify differentiation | P2 | pending |
| wp_distance_time | מרחק, זמן — ו׳ | B | §3 weak; real-life missing | add examples + real-life | P2 | pending |
| wp_leftover | מה נשאר? — ו׳ | B | real-life missing; numbers too small | add real-life; scale numbers | P3 | pending |
| wp_shop_discount | קניות — ו׳ | B | §3 weak; numbers too small | add examples; scale numbers | P2 | pending |
| wp_time_sum | סכום זמנים — ו׳ | A | numbers too small note | scale numbers | P3 | pending |
| wp_unit_cm_to_m | המרת ס״מ — ו׳ | C | §3 very thin; §5 missing; real-life | add worked example + real-life | P1 | pending |
| wp_unit_g_to_kg | המרת גרם — ו׳ | C | §3 very thin; §5 missing; real-life | add worked example + real-life | P1 | pending |

---

### Wave 4 — Math G1, G2, G3, G4 (104 pages)

> **Goal:** Finalize the lower-grade math foundation. The G1–G2 books are predominantly A-rated and need only visual/table upgrades and minor polish. G3–G4 have significant cross-grade generic families (add_three, sequence, eq_add, eq_sub, dec_sub, ns_place_hundreds) that need grade-specific differentiation.

#### Math — Grade 1 (19 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| add_second_decade | חיבור בעשרייה השנייה | A | clean | verify | P4 | pending |
| add_tens_only | חיבור עשרות שלמות | A | bullet list | replace bullets with table | P3 | pending |
| add_two | חיבור שני מספרים | A | cross-grade family (same as G2–G6) | verify grade uniqueness | P3 | pending |
| cmp | השוואת מספרים — א׳ | A | bullet list | replace bullets with table | P3 | pending |
| eq_add_simple | חיבור עם חסר | A | clean | verify | P4 | pending |
| eq_sub_simple | חיסור עם חסר | A | clean | verify | P4 | pending |
| mul | כפל — חיבור חוזר | B | §5 missing; bullet list | add self-check; replace bullets | P3 | pending |
| ns_complement10 | זוגות ל-10 — א׳ | A | cross-grade family | verify grade uniqueness | P3 | pending |
| ns_counting_backward | ספירה לאחור | A | clean | verify | P4 | pending |
| ns_counting_forward | ספירה קדימה | A | clean | verify | P4 | pending |
| ns_even_odd | זוגי ואי-זוגי | A | bullet list | replace bullets with table | P3 | pending |
| ns_neighbors | שכנים — א׳ | A | bullet list | replace bullets with table | P3 | pending |
| ns_number_line | ציר המספרים | A | clean | verify | P4 | pending |
| ns_place_tens_units | עשרות ואחדות | A | bullet list | replace bullets with table | P3 | pending |
| sub_two | חיסור שני מספרים | A | clean | verify | P4 | pending |
| wp_coins | מטבעות — א׳ | A | clean | verify | P4 | pending |
| wp_coins_spent | קניות ועודף | A | bullet list | replace bullets with table | P3 | pending |
| wp_time_date | ימי השבוע | A | clean | verify | P4 | pending |
| wp_time_days | כמה ימים? | A | clean | verify | P4 | pending |

#### Math — Grade 2 (22 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| add_two | חיבור עד 100 | A | bullet list | replace bullets with table | P3 | pending |
| add_vertical | חיבור במאונך | A | bullet list | replace bullets with table | P3 | pending |
| cmp | השוואה עד 1,000 | A | bullet list | replace bullets with table | P3 | pending |
| div | חילוק — ב׳ | A | bullet list | replace bullets with table | P3 | pending |
| divisibility | התחלקות | A | bullet list | replace bullets with table | P3 | pending |
| frac_half | חצי | A | bullet list | replace bullets with table | P3 | pending |
| frac_half_reverse | שלם מחצי | A | bullet list | replace bullets with table | P3 | pending |
| frac_quarter | רבע | A | bullet list | replace bullets with table | P3 | pending |
| frac_quarter_reverse | שלם מרבע | A | bullet list | replace bullets with table | P3 | pending |
| mul | לוח הכפל | A | bullet list | replace bullets with table | P3 | pending |
| ns_complement10 | זוגות ל-10 — ב׳ | A | bullet list; cross-grade | replace bullets; verify differentiation | P3 | pending |
| ns_even_odd | זוגי/אי-זוגי — ב׳ | A | clean | verify | P4 | pending |
| ns_neighbors | שכנים — ב׳ | A | bullet list | replace bullets with table | P3 | pending |
| ns_place_tens_units | מאות עשרות אחדות | A | bullet list | replace bullets with table | P3 | pending |
| sub_two | חיסור עד 100 | A | bullet list | replace bullets with table | P3 | pending |
| sub_vertical | חיסור במאונך | A | bullet list | replace bullets with table | P3 | pending |
| wp_coins | מטבעות — ב׳ | A | clean | verify | P4 | pending |
| wp_coins_spent | קניות ועודף — ב׳ | A | bullet list | replace bullets with table | P3 | pending |
| wp_division_simple | חלוקה שווה | A | bullet list | replace bullets with table | P3 | pending |
| wp_groups_g2 | קבוצות שוות | A | bullet list | replace bullets with table | P3 | pending |
| wp_time_date | ימי השבוע — ב׳ | A | clean | verify | P4 | pending |
| wp_time_days | ימים בין ימים | A | real-life missing note | add real-life context | P3 | pending |

#### Math — Grade 3 (26 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| add_three | חיבור שלושה — ג׳ | A | bullet list; cross-grade 99% match | replace bullets; grade-differentiate | P2 | pending |
| add_two | חיבור עד 1,000 | A | bullet list; cross-grade | replace bullets; verify differentiation | P3 | pending |
| cmp | השוואה עד 1,000 | A | bullet list | replace bullets with table | P3 | pending |
| dec_add | חיבור עשרוניים — ג׳ | A | bullet list | replace bullets with table | P3 | pending |
| dec_sub | חיסור עשרוניים — ג׳ | B | §3 weak; bullet list; cross-grade | add examples; replace bullets; differentiate | P2 | pending |
| div | חילוק — ג׳ | B | §5 missing; bullet list | add self-check; replace bullets | P3 | pending |
| div_with_remainder | עם שארית — ג׳ | A | clean | verify | P4 | pending |
| divisibility | התחלקות — ג׳ | B | §3 weak; bullet list | add examples; replace bullets | P3 | pending |
| eq_add | משוואת חיבור — ג׳ | B | §3 weak; §5 missing; cross-grade | add examples + self-check; differentiate | P2 | pending |
| eq_sub | משוואת חיסור — ג׳ | B | §3 weak; §5 missing; cross-grade | add examples + self-check; differentiate | P2 | pending |
| mul | לוח הכפל — ג׳ | A | bullet list | replace bullets with table | P3 | pending |
| mul_hundreds | כפל במאות | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| mul_tens | כפל בעשרות | B | §3 weak; §5 missing; bullet list | add examples + self-check | P2 | pending |
| ns_complement10 | זוגות ל-10 — ג׳ | A | bullet list; cross-grade | replace bullets; verify differentiation | P3 | pending |
| ns_complement100 | זוגות ל-100 | A | bullet list | replace bullets with table | P3 | pending |
| ns_even_odd | זוגי/אי-זוגי — ג׳ | A | bullet list | replace bullets with table | P3 | pending |
| ns_neighbors | שכנים עד 1,000 | A | bullet list | replace bullets with table | P3 | pending |
| ns_place_hundreds | ערך המקום עד 1,000 | A | bullet list; cross-grade 76% | replace bullets; differentiate | P2 | pending |
| order_add_mul | סדר פעולות + × | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| order_mul_sub | סדר פעולות × − | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| order_parentheses | סוגריים | B | §3 weak; bullet list | add examples; replace bullets | P2 | pending |
| sequence | סדרות — ג׳ | A | bullet list; cross-grade 92% | replace bullets; differentiate | P2 | pending |
| sub_two | חיסור עד 1,000 | A | bullet list | replace bullets with table | P3 | pending |
| wp_comparison_more | כמה יותר? — ג׳ | B | real-life missing; bullet list; cross-grade | add real-life; replace bullets; differentiate | P2 | pending |
| wp_leftover | מה נשאר? — ג׳ | A | real-life missing note | add real-life context | P3 | pending |
| wp_time_sum | סכום זמנים — ג׳ | A | clean | verify | P4 | pending |

#### Math — Grade 4 (37 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| add_three | חיבור שלושה — ד׳ | A | bullet list; cross-grade 99% | replace bullets; differentiate | P2 | pending |
| add_two | חיבור עד 10,000 | A | bullet list | replace bullets with table | P3 | pending |
| cmp | השוואה — ד׳ | A | clean | verify | P4 | pending |
| dec_add | חיבור עשרוניים — ד׳ | B | numbers too small; bullet list | scale numbers; replace bullets | P2 | pending |
| dec_sub | חיסור עשרוניים — ד׳ | B | numbers too small; bullet list; cross-grade | scale numbers; replace bullets; differentiate | P2 | pending |
| div | חילוק — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| div_long | חילוק ארוך | A | clean | verify | P4 | pending |
| div_with_remainder | עם שארית — ד׳ | A | numbers too small note | scale numbers | P3 | pending |
| divisibility | התחלקות — ד׳ | A | clean | verify | P4 | pending |
| eq_add | משוואת חיבור — ד׳ | B | §3 weak; bullet list; cross-grade | add examples; replace bullets; differentiate | P2 | pending |
| eq_sub | משוואת חיסור — ד׳ | B | §3 weak; bullet list; cross-grade | add examples; replace bullets; differentiate | P2 | pending |
| est_add | אומדן חיבור — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| est_mul | אומדן כפל — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| est_quantity | אומדן כמות — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| fm_factor | גורמים — ד׳ | B | numbers too small; bullet list; cross-grade | scale; replace bullets; differentiate | P2 | pending |
| fm_gcd | מ.א.ח — ד׳ | B | §5 missing; numbers too small | add self-check; scale numbers | P2 | pending |
| fm_multiple | כפולות — ד׳ | B | §5 missing; numbers too small | add self-check; scale numbers | P2 | pending |
| mul | כפל — ד׳ | A | numbers too small note | scale numbers | P3 | pending |
| mul_vertical | כפל במאונך | A | bullet list | replace bullets with table | P3 | pending |
| ns_complement10 | זוגות ל-10 — ד׳ | A | numbers too small; cross-grade | scale; verify differentiation | P3 | pending |
| ns_complement100 | השלמה ל-100 — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| ns_even_odd | זוגי/אי-זוגי — ד׳ | A | clean | verify | P4 | pending |
| ns_neighbors | שכנים גדולים — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| ns_place_hundreds | ערך המקום עד 10,000 | A | bullet list; cross-grade 76% | replace bullets; differentiate | P2 | pending |
| one_mul | כפל ב-1 | A | §5 missing | add self-check | P3 | pending |
| power_base | חזקה — בסיס | A | bullet list | replace bullets with table | P3 | pending |
| power_calc | חזקה — חישוב | A | bullet list | replace bullets with table | P3 | pending |
| prime_composite | ראשוניים ופריקים | B | numbers too small; bullet list | scale; replace bullets | P2 | pending |
| round | עיגול — ד׳ | A | §5 missing | add self-check | P3 | pending |
| sequence | סדרות — ד׳ | A | bullet list; cross-grade 92% | replace bullets; differentiate | P2 | pending |
| sub_two | חיסור עד 10,000 | A | bullet list | replace bullets with table | P3 | pending |
| wp_comparison_more | כמה יותר? — ד׳ | B | real-life missing; bullet list; cross-grade | add real-life; replace bullets; differentiate | P2 | pending |
| wp_leftover | מה נשאר? — ד׳ | B | real-life missing; numbers too small | add real-life; scale numbers | P2 | pending |
| wp_time_sum | סכום זמנים — ד׳ | A | clean | verify | P4 | pending |
| zero_add | חיבור עם 0 | A | §5 missing | add self-check | P3 | pending |
| zero_mul | כפל ב-0 | A | §5 missing | add self-check | P3 | pending |
| zero_sub | חיסור 0 | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |

---

### Wave 5 — Science G1–G6 (38 pages)

> **Goal:** Add observation hooks ("What do you notice?") to all science pages that currently lack them. Ensure every page has a hands-on suggestion or experiment prompt. Fix B-rated pages in G2, G4, G5, G6 with structured observation prompts and real-life connections.

#### Science — Grade 1 (6 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| animals | בעלי חיים — חי לעומת דומם | A | no observation hook | add observation hook | P3 | pending |
| body | גוף האדם — חושים | A | bullet list | replace bullets with table | P3 | pending |
| earth_space | כדור הארץ — א׳ | A | clean | verify | P4 | pending |
| environment | הסביבה שלנו | A | no observation hook | add observation hook | P3 | pending |
| materials | חומרים — א׳ | A | clean | verify | P4 | pending |
| plants | צמחים — א׳ | B | §3 weak; bullet list | add examples + replace bullets | P2 | pending |

#### Science — Grade 2 (7 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| animals | מחזור חיים | A | no observation hook | add observation hook | P3 | pending |
| body | בריאות והרגלים | B | §3 weak; no observation | add examples + observation hook | P2 | pending |
| earth_space | עונות ושמיים | B | no observation; bullet list | add observation hook; replace bullets | P2 | pending |
| environment | שמירה על הטבע | B | no observation; bullet list | add observation hook; replace bullets | P2 | pending |
| experiments | תצפית וחקירה — ב׳ | A | clean | verify | P4 | pending |
| materials | מצבי צבירה | A | clean | verify | P4 | pending |
| plants | גדילה ומחזור | A | clean | verify | P4 | pending |

#### Science — Grade 3 (7 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| animals | התאמה לסביבה | A | no observation note | add observation prompt | P3 | pending |
| body | מערכות בסיסיות | A | no observation note | add observation prompt | P3 | pending |
| earth_space | מזג אוויר ומים | A | clean | verify | P4 | pending |
| environment | מערכות קטנות | A | no observation note | add observation prompt | P3 | pending |
| experiments | ניסוי מדעי קצר | A | clean | verify | P4 | pending |
| materials | כוחות ותנועה | A | clean | verify | P4 | pending |
| plants | תנאי גידול | A | clean | verify | P4 | pending |

#### Science — Grade 4 (6 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| animals | יחסי גומלין | A | no observation note | add observation prompt | P3 | pending |
| body | נשימה ועיכול | A | no observation note | add observation prompt | P3 | pending |
| earth_space | סלעים וקרקע | B | no observation; bullet list | add observation hook; replace bullets | P2 | pending |
| environment | שמירת משאבים | A | bullet list | replace bullets with table | P3 | pending |
| experiments | תכנון ניסוי | A | clean | verify | P4 | pending |
| materials | שינויים וחשמל | A | no observation note | add observation prompt | P3 | pending |

#### Science — Grade 5 (6 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| animals | רבייה והתאמות | A | no observation note | add observation prompt | P3 | pending |
| body | שלד, שרירים, חושים | A | no observation note | add observation prompt | P3 | pending |
| earth_space | משאבים ותופעות | A | bullet list | replace bullets with table | P3 | pending |
| environment | משאבי טבע | B | no observation; bullet list | add observation hook; replace bullets | P2 | pending |
| experiments | חקר מלא — תיעוד | A | clean | verify | P4 | pending |
| materials | תערובות ואור | A | real-life missing note | add real-life context | P3 | pending |

#### Science — Grade 6 (6 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| animals | מערכות אקולוגיות | A | bullet list | replace bullets with table | P3 | pending |
| body | תיאום מערכות | B | no observation; bullet list | add observation hook; replace bullets | P2 | pending |
| earth_space | אקלים וחלל | A | bullet list | replace bullets with table | P3 | pending |
| environment | שינויי אקלים | B | no observation; bullet list | add observation hook; replace bullets | P2 | pending |
| experiments | פרויקט מדעי | A | clean | verify | P4 | pending |
| materials | כימיה בסיסית | A | bullet list | replace bullets with table | P3 | pending |

---

### Wave 6 — Geometry G1–G6 (66 pages)

> **Goal:** All geometry pages need real-life connections (everyday objects with shape names). G5–G6 volume/area pages need diagram descriptions. Cross-grade families (parallel_perpendicular, trapezoid_area, solids) need clear grade-level differentiation.

#### Geometry — Grade 1 (3 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| shapes_basic_rectangle | הכרת המלבן | A | real-life missing note | add real-life connection | P3 | pending |
| shapes_basic_square | הכרת הריבוע | A | real-life missing note | add real-life connection | P3 | pending |
| transformations | הזזה ושיקוף — א׳ | A | cross-grade family | verify grade uniqueness | P3 | pending |

#### Geometry — Grade 2 (3 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| solids | גופים תלת-ממדיים | A | §5 missing | add self-check | P3 | pending |
| square_area | שטח ריבוע — ב׳ | A | real-life missing note | add real-life connection | P3 | pending |
| transformations | הזזה ושיקוף — ב׳ | A | cross-grade family | verify grade uniqueness | P3 | pending |

#### Geometry — Grade 3 (9 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| parallel_perpendicular | מקבילות ומאונכות — ג׳ | A | real-life missing; cross-grade | add real-life; differentiate from G4/G5 | P2 | pending |
| quadrilaterals | מרובעים — ג׳ | A | bullet list | replace bullets with table | P3 | pending |
| rotation | סיבוב — ג׳ | A | clean | verify | P4 | pending |
| solids | גופים — פאות ג׳ | A | cross-grade family | verify grade uniqueness | P3 | pending |
| square_area | שטח ריבוע — ג׳ | A | real-life missing note | add real-life connection | P3 | pending |
| square_perimeter | היקף ריבוע — ג׳ | A | real-life missing note | add real-life connection | P3 | pending |
| triangle_angles | זוויות במשולש — ג׳ | B | real-life missing; bullet list | add real-life; replace bullets | P3 | pending |
| triangle_perimeter | היקף משולש — ג׳ | A | real-life missing note | add real-life connection | P3 | pending |
| triangles | משולשים — ג׳ | A | real-life missing note | add real-life connection | P3 | pending |

#### Geometry — Grade 4 (14 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| diagonal_rectangle | אלכסון במלבן | A | clean | verify | P4 | pending |
| diagonal_square | אלכסון בריבוע | A | clean | verify | P4 | pending |
| parallel_perpendicular | מקבילות במצולעים — ד׳ | B | real-life missing; bullet list; cross-grade | add real-life; replace bullets; differentiate | P2 | pending |
| quadrilaterals | מרובעים — סיווג ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| rectangular_prism_volume | נפח תיבה — ד׳ | A | bullet list | replace bullets with table | P3 | pending |
| shapes_basic_properties_angles | זוויות ישרות | A | real-life missing note | add real-life connection | P3 | pending |
| shapes_basic_properties_rectangle | תכונות מלבן | A | clean | verify | P4 | pending |
| shapes_basic_properties_square | תכונות ריבוע | A | clean | verify | P4 | pending |
| solids | גופים — פאות ד׳ | A | cross-grade family | verify grade uniqueness | P3 | pending |
| square_area | שטח ריבוע — ד׳ | A | §3 weak note | add worked example | P3 | pending |
| square_perimeter | היקף ריבוע — ד׳ | A | clean | verify | P4 | pending |
| symmetry | סימטרייה | A | real-life missing note | add real-life connection | P3 | pending |
| triangle_angles | זוויות משולש — ד׳ | A | clean | verify | P4 | pending |
| triangle_perimeter | היקף משולש — ד׳ | A | §3 weak note | add worked example | P3 | pending |

#### Geometry — Grade 5 (18 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| diagonal_parallelogram | אלכסון מקבילית | A | clean | verify | P4 | pending |
| diagonal_rectangle | אלכסון מלבן — ה׳ | A | §3 weak note | add worked example | P3 | pending |
| diagonal_square | אלכסון ריבוע — ה׳ | B | §3 weak; real-life missing | add examples + real-life | P2 | pending |
| heights_parallelogram | גובה מקבילית | A | §3 weak note | add worked example | P3 | pending |
| heights_trapezoid | גובה טרפז | A | real-life missing note | add real-life connection | P3 | pending |
| heights_triangle | גובה משולש | A | real-life missing note | add real-life connection | P3 | pending |
| parallel_perpendicular | מקבילים/מאונכים — ה׳ | A | real-life missing; cross-grade | add real-life; differentiate from G3/G4 | P2 | pending |
| parallelogram_area | שטח מקבילית — ה׳ | B | §3 weak; real-life missing | add examples + real-life | P2 | pending |
| quadrilaterals | סיווג מרובעים — ה׳ | A | bullet list | replace bullets with table | P3 | pending |
| rectangular_prism_volume | נפח תיבה — ה׳ | A | clean | verify | P4 | pending |
| solids | גופים — ה׳ | A | real-life missing; cross-grade | add real-life; verify grade uniqueness | P3 | pending |
| square_area | שטח ריבוע — ה׳ | A | §5 missing | add self-check | P3 | pending |
| square_perimeter | היקף ריבוע — ה׳ | A | bullet list | replace bullets with table | P3 | pending |
| tiling | ריצוף | A | clean | verify | P4 | pending |
| trapezoid_area | שטח טרפז — ה׳ | A | cross-grade family (G5/G6) | verify grade differentiation | P2 | pending |
| triangle_angles | זוויות משולש — ה׳ | A | real-life missing note | add real-life connection | P3 | pending |
| triangle_area | שטח משולש — ה׳ | B | §3 weak; real-life missing | add examples + real-life | P2 | pending |
| triangle_perimeter | היקף משולש — ה׳ | B | real-life missing; bullet list | add real-life; replace bullets | P2 | pending |

#### Geometry — Grade 6 (19 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| circle_area | שטח עיגול | A | §3 weak note | add worked example | P3 | pending |
| circle_perimeter | היקף מעגל | A | §3 weak note | add worked example | P3 | pending |
| cone_volume | נפח חרוט | A | no diagram description | add diagram description | P2 | pending |
| cylinder_volume | נפח גליל | A | no diagram description | add diagram description | P2 | pending |
| parallelogram_area | שטח מקבילית — ו׳ | B | real-life missing; bullet list | add real-life; replace bullets | P2 | pending |
| prism_volume_rectangular | נפח מנסרה — מלבן | A | clean | verify | P4 | pending |
| prism_volume_triangle | נפח מנסרה — משולש | A | no diagram description | add diagram description | P2 | pending |
| pyramid_volume_rectangular | נפח פירמידה — מלבן | A | no diagram description | add diagram description | P2 | pending |
| pyramid_volume_square | נפח פירמידה — ריבוע | A | no diagram description | add diagram description | P2 | pending |
| pythagoras_hyp | פיתגורס — יתר | A | clean | verify | P4 | pending |
| pythagoras_leg | פיתגורס — ניצב | A | clean | verify | P4 | pending |
| rectangular_prism_volume | נפח תיבה — ו׳ | A | clean | verify | P4 | pending |
| solids | גופים גליל פירמידה — ו׳ | B | no diagram; real-life missing; cross-grade | add diagram + real-life; differentiate | P2 | pending |
| sphere_volume | נפח כדור | B | §2 very thin; no diagram | add explanation + diagram | P2 | pending |
| square_area | שטח ריבוע — ו׳ | A | §5 missing | add self-check | P3 | pending |
| square_perimeter | היקף ריבוע — ו׳ | A | clean | verify | P4 | pending |
| trapezoid_area | שטח טרפז — ו׳ | A | cross-grade family (G5/G6) | verify grade differentiation | P2 | pending |
| triangle_angles | זוויות משולש — ו׳ | A | §5 missing | add self-check | P3 | pending |
| triangle_perimeter | היקף משולש — ו׳ | A | clean | verify | P4 | pending |

---

### Wave 7 — Hebrew G1–G6 (172 pages)

> **Goal:** Hebrew books are in the best overall condition (predominantly A-rated). This wave adds missing §5 self-checks to grammar pages, expands any grammar explanation that is too brief, ensures every page has a Hebrew sentence example, and verifies all P4 pages. One C-rated page in G4 must be rewritten.

#### Hebrew — Grade 1 (32 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| comprehension_binary_fact_early_g1_tf_science_simple | נכון או לא נכון? | A | §3 weak note | add sentence example | P3 | pending |
| comprehension_g1.word_meaning_concrete | משמעות מילה — א׳ | A | §3 weak note | add sentence example | P3 | pending |
| g1.basic_niqqud | ניקוד בסיסי | A | clean | verify | P4 | pending |
| g1.copy_word | העתקת מילה | A | clean | verify | P4 | pending |
| g1.final_letters | אותיות סופיות | A | clean | verify | P4 | pending |
| g1.grammar_agreement_light | התאמה קלה | A | clean | verify | P4 | pending |
| g1.grammar_cloze_deixis | זה, כאן, שם | A | grammar brief | expand with sentence example | P3 | pending |
| g1.grammar_connectors_time | מילות זמן | A | grammar brief | expand with sentence example | P3 | pending |
| g1.grammar_odd_category | מה לא שייך? | A | grammar brief | expand with sentence example | P3 | pending |
| g1.grammar_pos_roles | שם, פועל, תיאור | A | grammar brief | expand with sentence example | P3 | pending |
| g1.grammar_punctuation | פיסוק | A | grammar brief | expand with sentence example | P3 | pending |
| g1.grammar_wellformed | משפט שלם | A | grammar brief | expand with sentence example | P3 | pending |
| g1.grammar_word_order | סדר מילים | B | §3 weak; grammar brief | add examples; expand explanation | P2 | pending |
| g1.letters | אותיות אלף-בית | A | no reading passage in §3 | add short Hebrew text to §3 | P3 | pending |
| g1.one_sentence_who_what | מי? מה? | A | §3 weak note | add sentence example | P3 | pending |
| g1.open_close_syllable | הברה פתוחה/סגורה | A | clean | verify | P4 | pending |
| g1.phoneme_awareness | מודעות פונמית | A | clean | verify | P4 | pending |
| g1.phrase_appropriateness | ביטוי מתאים | B | §3 weak; no reading passage | add examples + short text | P3 | pending |
| g1.rhyme | חרוזים | A | clean | verify | P4 | pending |
| g1.simple_instruction | הוראה פשוטה | A | §3 weak note | add sentence example | P3 | pending |
| g1.simple_words_read | קריאת מילים | A | clean | verify | P4 | pending |
| g1.sound_letter_match | צליל ואות | A | clean | verify | P4 | pending |
| g1.spell_word_choice | בחירת איות | A | §3 weak note | add sentence example | P3 | pending |
| g1.syllables | הברות | A | clean | verify | P4 | pending |
| g1.word_picture | מילה ותמונה | A | clean | verify | P4 | pending |
| grammar_gender_number_early_g1_agreement_girl_singular | ילדה — התאמה | A | grammar brief | expand with sentence example | P3 | pending |
| reading_word_level_early_g1_spelling_meaning_then_choice | מילה — קריאה | A | clean | verify | P4 | pending |
| speaking_social_reply_early_g1_bump_sorry | סליחה | A | §3 weak note | add sentence example | P3 | pending |
| vocabulary_g1.word_meaning_concrete | מילה ומשמעות | A | clean | verify | P4 | pending |
| vocabulary_word_context_early_g1_cloze_morning | מילה בבוקר | A | clean | verify | P4 | pending |
| writing_spell_word_early_ab_writing_object_riddle | חידת מילה | A | clean | verify | P4 | pending |
| writing_spell_word_early_ab_writing_role_meaning | תפקיד המילה | A | §3 weak note | add sentence example | P3 | pending |

#### Hebrew — Grade 2 (23 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| agreement_boy_plural | התאמה — ילדים רצים | A | §5 missing | add self-check | P3 | pending |
| cloze_school | מילה חסרה — בית ספר | A | clean | verify | P4 | pending |
| g2.context_clue_easy | רמז מההקשר | A | §3 weak note | add sentence example | P3 | pending |
| g2.describe_prompt_choice | תיאור קצר | A | §3 weak note | add sentence example | P3 | pending |
| g2.detail_main_idea | רעיון מרכזי ופרטים | A | §3 weak note | add sentence example | P3 | pending |
| g2.fluent_words | קריאת מילים בשטף | A | clean | verify | P4 | pending |
| g2.light_inference | הסקה קלה מטקסט | A | clean | verify | P4 | pending |
| g2.number_gender_light | זכר, נקבה, יחיד ורבים | A | clean | verify | P4 | pending |
| g2.pos_basic | שם עצם, פועל ותואר | A | clean | verify | P4 | pending |
| g2.punctuation_choice | סימני פיסוק בכתיבה | A | clean | verify | P4 | pending |
| g2.sentence_wellformed | משפט תקין | A | §5 missing | add self-check | P3 | pending |
| g2.short_paragraph_choice | פסקה קצרה | A | §5 missing | add self-check | P3 | pending |
| g2.short_sentence | קריאת משפט קצר | A | §3 weak note | add sentence example | P3 | pending |
| g2.simple_punctuation_read | סימני פיסוק בקריאה | A | clean | verify | P4 | pending |
| g2.simple_sequence | רצף פשוט | A | §3 weak note | add sentence example | P3 | pending |
| g2.simple_tense | זמן פשוט | A | clean | verify | P4 | pending |
| g2.situation_register | דיבור מתאים למצב | A | §3 weak note | add sentence example | P3 | pending |
| g2.synonyms_basic | מילים נרדפות | A | §3 weak note | add sentence example | P3 | pending |
| object_riddle | חידת מילה — ב׳ | A | clean | verify | P4 | pending |
| role_meaning | תפקיד המילה — ב׳ | A | clean | verify | P4 | pending |
| spelling_choice_niqqud | בחירת איות נכון | A | clean | verify | P4 | pending |
| thanks_response | תודה — איך עונים? | A | §3 weak note | add sentence example | P3 | pending |
| where_from_sentence | מאיפה יודעים? | A | clean | verify | P4 | pending |

#### Hebrew — Grade 3 (31 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| comprehension_analogy_reasoning_parallel | דומה כמו… | A | clean | verify | P4 | pending |
| comprehension_binary_fact_mid_grammar_tf | נכון לפי הטקסט? | A | grammar brief | expand with sentence example | P3 | pending |
| comprehension_cause_effect_because | למה? — כי | A | clean | verify | P4 | pending |
| comprehension_completion_context_clue | השלמה | A | clean | verify | P4 | pending |
| comprehension_passage_explicit_detail | פרטים בטקסט | A | clean | verify | P4 | pending |
| comprehension_passage_inference_implied | מה משתמע? | A | clean | verify | P4 | pending |
| g3.binyan_light | פעלים — בניין | A | clean | verify | P4 | pending |
| g3.cause_effect | סיבה ותוצאה | A | clean | verify | P4 | pending |
| g3.compare_light | השוואה קלה | A | §3 weak note | add sentence example | P3 | pending |
| g3.connector_use_choice | מחברים משפטים | A | §3 weak note | add sentence example | P3 | pending |
| g3.connectors | מילות קישור | A | clean | verify | P4 | pending |
| g3.context_meaning | משמעות בהקשר | A | clean | verify | P4 | pending |
| g3.discussion_prompt_choice | שיח בכיתה | A | clean | verify | P4 | pending |
| g3.explicit_only | רק מה שכתוב | A | clean | verify | P4 | pending |
| g3.genre_tag_info_vs_story | מידע או סיפור? | A | clean | verify | P4 | pending |
| g3.multi_sentence | כמה משפטים | A | clean | verify | P4 | pending |
| g3.tense_system_intro | עבר, הווה, עתיד | A | clean | verify | P4 | pending |
| g3.two_three_sentences_structure | שני–שלושה משפטים | A | §3 weak note | add sentence example | P3 | pending |
| g3.word_families | משפחות מילים | A | §3 weak note | add sentence example | P3 | pending |
| grammar_gender_number_plural | רבים ורבות | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_morphology_binyan_fit | בניין מתאים | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_part_of_speech_verb_noun | שם או פועל? | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_prep_choice_collocation | מילת יחס | A | grammar brief | expand with sentence example | P3 | pending |
| reading_sentence_read_meaning | משפט — משמעות | A | clean | verify | P4 | pending |
| speaking_social_reply_mid_help_request | בקשת עזרה | A | §3 weak note | add sentence example | P3 | pending |
| vocabulary_antonym_opposite | מנוגדות | A | clean | verify | P4 | pending |
| vocabulary_precision_best_word | המילה הכי מדויקת | A | clean | verify | P4 | pending |
| vocabulary_semantic_field_education_lexicon | בית ספר — מילים | A | §3 weak note | add sentence example | P3 | pending |
| vocabulary_synonym_near_meaning | דומות | A | clean | verify | P4 | pending |
| writing_logic_completion_conclusion | סיום הגיוני | A | §3 weak note | add sentence example | P3 | pending |
| writing_structured_completion_polite_phrase | ביטוי מנומס | A | §3 weak note | add sentence example | P3 | pending |

#### Hebrew — Grade 4 (29 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| because | סיבה ותוצאה — ד׳ | A | §3 weak note | add sentence example | P3 | pending |
| best_word | מילה מדויקת — ד׳ | A | §4 weak note | add guided example | P3 | pending |
| binyan_fit | פועל מתאים — ד׳ | A | §4 weak note | add guided example | P3 | pending |
| collocation | מילים יחד — ד׳ | A | clean | verify | P4 | pending |
| conclusion | סיום ומסקנה — ד׳ | A | §3 weak note | add sentence example | P3 | pending |
| context_clue | הקשר — ד׳ | A | clean | verify | P4 | pending |
| detail | פרט מטקסט — ד׳ | A | clean | verify | P4 | pending |
| education_lexicon | מילים לימוד — ד׳ | A | §3 weak note | add sentence example | P3 | pending |
| g4.dictation_spot_error | כתיב והכתבה | A | clean | verify | P4 | pending |
| g4.genre_appropriate_language | שפה לסוגה | A | clean | verify | P4 | pending |
| g4.genre_mix | סוגות — ד׳ | A | clean | verify | P4 | pending |
| g4.idiom_light | ביטויים — ד׳ | A | clean | verify | P4 | pending |
| g4.info_lit_intro | מקור אמין | A | clean | verify | P4 | pending |
| g4.intro_body_conclusion_choice | פתיחה, גוף, סיום | A | §3 weak note | add sentence example | P3 | pending |
| g4.literary_lexicon_light | אוצר ספרותי | A | §3 weak note | add sentence example | P3 | pending |
| g4.present_text_based_choice | הצגת רעיון מטקסט | C | §3 weak; §4 weak; no guided solve | add worked example + guided solve | P1 | pending |
| g4.root_pattern_intro | שורש ותבנית | A | clean | verify | P4 | pending |
| g4.summary_intro | סיכום בסיסי | A | clean | verify | P4 | pending |
| g4.text_structure | מבנה טקסט | A | §3 weak note | add sentence example | P3 | pending |
| implied | משתמע — ד׳ | A | clean | verify | P4 | pending |
| meaning | משמעות — ד׳ | A | clean | verify | P4 | pending |
| near_meaning | קרובות — ד׳ | A | §3 weak note | add sentence example | P3 | pending |
| opposite | הפוכות — ד׳ | A | clean | verify | P4 | pending |
| parallel | דמיון — ד׳ | A | clean | verify | P4 | pending |
| plural | יחיד ורבים — ד׳ | A | clean | verify | P4 | pending |
| polite_phrase | ניסוח מנומס — ד׳ | A | clean | verify | P4 | pending |
| request | בקשת עזרה — ד׳ | A | clean | verify | P4 | pending |
| tf | נכון — ד׳ | A | clean | verify | P4 | pending |
| verb_noun | פועל שם — ד׳ | A | §3 weak note | add sentence example | P3 | pending |

#### Hebrew — Grade 5 (28 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| comprehension_compare_statements_contrast | השוואת קביעות | A | §3 weak note | add sentence example | P3 | pending |
| comprehension_implicit_tone_attitude | נימה | A | clean | verify | P4 | pending |
| comprehension_main_idea_summary | רעיון מרכזי | A | clean | verify | P4 | pending |
| comprehension_reference_pronoun | כינוי גוף | A | clean | verify | P4 | pending |
| comprehension_sequence_order | סדר אירועים | A | clean | verify | P4 | pending |
| comprehension_supporting_detail_evidence | פרטים תומכים | A | clean | verify | P4 | pending |
| g5.academic_starter_words | מילים לכתיבה אקדמית | A | §3 weak note | add sentence example | P3 | pending |
| g5.argument_scaffold_choice | בניית טיעון | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| g5.full_composition_scaffold_choice | חיבור מלא | A | §3 weak note | add sentence example | P3 | pending |
| g5.genre_variety | סוגות כתיבה | A | clean | verify | P4 | pending |
| g5.inference | הסקה — ה׳ | A | clean | verify | P4 | pending |
| g5.multi_layer_read | קריאה בשכבות | A | clean | verify | P4 | pending |
| g5.multiple_perspectives_light | נקודות מבט | A | clean | verify | P4 | pending |
| g5.position_in_text | מיקום בטקסט | A | clean | verify | P4 | pending |
| g5.semantic_fields | שדות מילים | A | clean | verify | P4 | pending |
| g5.syntax_agreement | התאמה תחבירית | A | clean | verify | P4 | pending |
| g5.verb_patterns | תבניות פועל | A | clean | verify | P4 | pending |
| grammar_binary_grammar_tf | נכון/לא — דקדוק | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_sentence_correction_choose_correct | משפט נכון? | A | clean | verify | P4 | pending |
| grammar_sentence_correction_sv_agreement_plural | תיקון נושא-פועל | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_tense_shift_past_present | עבר והווה | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_transform_negation | שלילה | A | grammar brief | expand with sentence example | P3 | pending |
| grammar_verb_agreement_plural_subject | נושא ברבים | B | §3 weak; grammar brief | add examples + expand explanation | P2 | pending |
| reading_structural_paragraph_role | תפקיד פסקה | A | clean | verify | P4 | pending |
| vocabulary_category_exclusion_odd_out | לא שייך | A | clean | verify | P4 | pending |
| vocabulary_collocation_verb_noun_fit | צירוף נכון | A | §3 weak note | add sentence example | P3 | pending |
| vocabulary_context_fit_register | מתאים למצב | A | §3 weak note | add sentence example | P3 | pending |
| writing_rephrase_clarity | ניסוח ברור | A | clean | verify | P4 | pending |

#### Hebrew — Grade 6 (29 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| attitude | גישה — ו׳ | A | clean | verify | P4 | pending |
| choose_correct | משפט מתוקן — ו׳ | A | clean | verify | P4 | pending |
| contrast | הנגדה — ו׳ | A | clean | verify | P4 | pending |
| g6.academic_vocab | אוצר אקדמי — ו׳ | A | clean | verify | P4 | pending |
| g6.argumentative_full_scaffold | טיעונית מלאה | A | §5 missing | add self-check | P3 | pending |
| g6.compare_genres | השוואת סוגות | A | clean | verify | P4 | pending |
| g6.complex_syntax_spot | תחביר מורכב | A | clean | verify | P4 | pending |
| g6.complex_text_analysis | ניתוח מורכב | A | clean | verify | P4 | pending |
| g6.critical_evaluation_light | הערכה ביקורתית | A | clean | verify | P4 | pending |
| g6.debate_scaffold_choice | דיבייט | A | clean | verify | P4 | pending |
| g6.discipline_words_light | מילים מקצועיות | A | clean | verify | P4 | pending |
| g6.evidence_from_text | ראיה מטקסט | A | clean | verify | P4 | pending |
| g6.possession_prep | שייכות | A | clean | verify | P4 | pending |
| g6.research_literacy_choice | אוריינות מחקרית | A | clean | verify | P4 | pending |
| g6.subject_verb_advanced | נושא-נשוא מתקדם | A | clean | verify | P4 | pending |
| grammar_tf | נכון/לא דקדוק — ו׳ | A | grammar brief | expand with sentence example | P3 | pending |
| main_summary | סיכום — ו׳ | A | clean | verify | P4 | pending |
| negation | שלילה — ו׳ | A | clean | verify | P4 | pending |
| odd_out | שונה — ו׳ | A | clean | verify | P4 | pending |
| order | סדר — ו׳ | A | clean | verify | P4 | pending |
| paragraph_role | תפקיד פסקה — ו׳ | A | clean | verify | P4 | pending |
| past_present | עבר-הווה — ו׳ | A | clean | verify | P4 | pending |
| plural_subject | נושא ברבים — ו׳ | A | clean | verify | P4 | pending |
| pronoun | כינוי — ו׳ | A | clean | verify | P4 | pending |
| register | רישום — ו׳ | A | clean | verify | P4 | pending |
| rephrase | ניסוח מחדש — ו׳ | B | §3 weak; §5 missing | add examples + self-check | P2 | pending |
| supporting_evidence | פרטים ראיה — ו׳ | A | clean | verify | P4 | pending |
| sv_agreement_plural | נושא-נשוא ברבים — ו׳ | A | clean | verify | P4 | pending |
| verb_noun_fit | פועל שם — ו׳ | A | §3 weak note | add sentence example | P3 | pending |

---

### Wave 8 — Moledet G2–G4 and Geography G5–G6 (37 pages)

> **Goal:** Moledet and Geography books are in excellent condition — nearly all A-rated. This wave adds real-life connections where noted, replaces any remaining bullet structures, and verifies all P4 pages as final.

#### Moledet — Grade 2 (7 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| mg_g2_community_participation | השתתפות בקהילה | A | real-life missing note | add real-life connection | P3 | pending |
| mg_g2_community_services | שירותים קהילתיים | A | clean | verify | P4 | pending |
| mg_g2_group_decisions | קבלת החלטות קבוצתית | A | clean | verify | P4 | pending |
| mg_g2_israel_basics | ארץ ישראל — בסיס | A | clean | verify | P4 | pending |
| mg_g2_neighborhood | השכונה שלי | A | clean | verify | P4 | pending |
| mg_g2_neighborhood_map | מפת השכונה | A | clean | verify | P4 | pending |
| mg_g2_society_responsibility | אחריות חברתית | A | clean | verify | P4 | pending |

#### Moledet — Grade 3 (8 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| mg_g3_citizenship_basics | אזרחות — בסיס | A | §3 weak note | add sentence example | P3 | pending |
| mg_g3_districts_borders | מחוזות וגבולות | A | clean | verify | P4 | pending |
| mg_g3_israel_map | מפת ישראל | A | clean | verify | P4 | pending |
| mg_g3_landscapes | נופים | A | clean | verify | P4 | pending |
| mg_g3_regions_cities | אזורים וערים | A | clean | verify | P4 | pending |
| mg_g3_rights_duties | זכויות וחובות | A | real-life missing note | add real-life connection | P3 | pending |
| mg_g3_social_participation | השתתפות חברתית | A | real-life missing note | add real-life connection | P3 | pending |
| mg_g3_water_sources | מקורות מים | A | clean | verify | P4 | pending |

#### Moledet — Grade 4 (7 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| mg_g4_government_institutions | מוסדות ממשל | A | clean | verify | P4 | pending |
| mg_g4_government_structure | מבנה הממשל | A | clean | verify | P4 | pending |
| mg_g4_map_scale_symbols | מפות — קנה מידה | A | clean | verify | P4 | pending |
| mg_g4_natural_resources | משאבי טבע — ד׳ | A | clean | verify | P4 | pending |
| mg_g4_organizations | ארגונים חברתיים | A | clean | verify | P4 | pending |
| mg_g4_settlement_development | התפתחות יישובים | A | clean | verify | P4 | pending |
| mg_g4_settlement_types | סוגי יישובים | A | clean | verify | P4 | pending |

#### Geography — Grade 5 (7 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| mg_g5_climate | אקלים | A | clean | verify | P4 | pending |
| mg_g5_coordinates | קואורדינטות | A | clean | verify | P4 | pending |
| mg_g5_government_institutions | מוסדות — ה׳ | A | clean | verify | P4 | pending |
| mg_g5_identity | זהות לאומית | A | clean | verify | P4 | pending |
| mg_g5_law_society | חוק וחברה | A | clean | verify | P4 | pending |
| mg_g5_natural_hazards | סכנות טבע | A | clean | verify | P4 | pending |
| mg_g5_resources | משאבים — ה׳ | A | clean | verify | P4 | pending |

#### Geography — Grade 6 (8 pages)

| Page ID | Title | Rating | Audit Issues | Required Fix | Priority | Status |
|---|---|---|---|---|---|---|
| mg_g6_democracy | דמוקרטיה | A | clean | verify | P4 | pending |
| mg_g6_environment_quality | איכות הסביבה | A | clean | verify | P4 | pending |
| mg_g6_human_environment | יחסי אדם-סביבה | A | clean | verify | P4 | pending |
| mg_g6_natural_phenomena | תופעות טבע | A | clean | verify | P4 | pending |
| mg_g6_population | אוכלוסייה | A | clean | verify | P4 | pending |
| mg_g6_social_involvement | מעורבות חברתית | A | clean | verify | P4 | pending |
| mg_g6_state_institutions | מוסדות המדינה | A | clean | verify | P4 | pending |
| mg_g6_values | ערכי המדינה | A | clean | verify | P4 | pending |

---

### Wave 9 — Cross-Project Re-Audit and Freeze (602 pages)

> **Goal:** After all content waves are complete, run a final re-audit of all 602 pages using the same automated audit script. Every page must reach A-rating. Zero C-rated pages, zero unverified pages. Sign off on final freeze.

| Task | Description |
|---|---|
| Re-run audit script | Execute `node tmp/audit-book-pedagogy.mjs` against all finalized pages |
| Verify ratings | Confirm all 602 pages are now rated A |
| Cross-grade check | Re-check all 14 generic families; confirm distinct grade-level content |
| Spot-read review | Manually review 10% sample (≥60 pages) across all subjects |
| §5 sweep | Confirm every page has a functional §5 (try it yourself) section |
| Dialogue sweep (English) | Confirm every English page has at least one English exchange or dialogue |
| Observation hook sweep (Science) | Confirm every science page has an explicit observation or hands-on suggestion |
| Freeze status | Mark all verified pages as `verified` in the tracking inventory |
| Final sign-off | Owner reviews summary report; approves launch |

---

## 3. Subject-Specific Quality Standards

### 3.1 Math

A math page is final when:

1. **§1 Learning Goal** — One clear sentence stating the skill (e.g., "You will learn to subtract a 4-digit number with regrouping").
2. **§2 Explanation** — At least 150 characters. Explains the rule or method step by step. Uses numbered steps for multi-step procedures.
3. **§3 Simple Example** — Shows a fully worked calculation, not a bullet list. If the page involves numbers, the example numbers must be at grade-appropriate magnitude:
   - G1: max two digits. G2: max 1,000. G3: max 10,000. G4: max 10,000 (four digits). G5: max 100,000 (five digits). G6: max 200,000 (six digits, or fractions/ratios/percentages with real-life magnitudes).
4. **§4 Guided Solve** — A second, slightly harder example with the key step highlighted.
5. **§5 Try It Yourself** — At least one question. Must be answerable from the explanation alone.
6. **§6 Common Mistake** — Names the most frequent student error with a counterexample showing the correct approach.
7. **§7 Practice Bridge** — Mentions the relevant practice exercise or activity.
8. **Real-life context** — Word problems must name a real-world scenario (shopping, distance, time, cooking, sport, etc.). Abstract "a + b = ?" problems without context are not acceptable in §4 or §5.
9. **No bullet-list-only §3** — The simple example must be a worked example, not a list of vocabulary or property names.
10. **No generic structure** — If the same page exists in another grade, the worked numbers, context, and complexity must be visibly different.

### 3.2 Geometry

A geometry page is final when:

1. **§2 Explanation** — Defines the shape or concept using a real-world object anchor ("A square is like a tile on the floor — four equal sides, four equal corners").
2. **§3 Simple Example** — A concrete numeric example with actual measurements (not symbolic A, B, C).
3. **§4 Guided Solve** — A second problem with different numbers. For G5–G6 volume and area, the guided solve must use a real object (box, room, field).
4. **§5 Self-Check** — At least one question with a numeric answer.
5. **§6 Common Mistake** — The most common calculation error or shape confusion, with correction.
6. **Real-life anchor** — Every page names at least one everyday object with the relevant shape (window, book, pizza, classroom).
7. **G5–G6 3D pages** — Must include a textual description of the shape (e.g., "A cylinder has two circular bases and a curved side. Imagine a can of tuna."). Cannot rely on an unstated diagram.
8. **Cross-grade differentiation** — `parallel_perpendicular` in G3 focuses on recognizing; G4 on properties of quadrilaterals; G5 on application in area calculations. These must read differently.

### 3.3 Science

A science page is final when:

1. **§2 Explanation** — Uses accessible scientific language appropriate to the grade. G1–G2: everyday words, single-concept focus. G5–G6: introduces scientific terms with brief definitions.
2. **§3 Simple Example** — A real phenomenon or organism the child has encountered. Must be local or familiar (Israeli wildlife, household materials, garden plants), not only exotic examples.
3. **§4 Guided Solve** — Frames a small "think-along" question: "If we pour water on the soil, where does it go?"
4. **§5 Try It Yourself** — Must include an observation prompt or a question the child can explore at home without special equipment.
5. **§6 Common Mistake** — A scientific misconception corrected with a simple explanation.
6. **Observation Hook** — Every page must contain at least one sentence inviting the child to look, touch, listen, or notice something in the real world.
7. **G3–G6 experiments pages** — Must include a clear, replicable mini-experiment structure: question → prediction → steps → expected result.
8. **No abstract-only pages** — Every page connects the concept to something the child can see or do outside the book.

### 3.4 Hebrew

A Hebrew page is final when:

1. **§2 Explanation** — Uses simple, child-appropriate Hebrew (G1–G2 at a 1st–2nd grade reading level, G5–G6 at a 5th–6th grade reading level). Grammar pages must explain the rule in one clear sentence with an example sentence embedded.
2. **§3 Simple Example** — For grammar pages: a complete Hebrew sentence demonstrating the rule (not a disconnected word). For comprehension pages: a short reading passage (3–5 sentences).
3. **§4 Guided Solve** — For grammar: another example sentence with the target feature. For comprehension: a question with a step-by-step reasoning guide.
4. **§5 Self-Check** — One question the child can answer independently. Must be present on all grammar pages.
5. **§6 Common Mistake** — The most common error for this grammar rule or comprehension skill, shown as a wrong example and then a correct example.
6. **No grammar-rule-only pages** — Every grammar explanation must end with a complete sentence example in context, not just the rule stated abstractly.
7. **Reading passages** — Comprehension pages must include a reading passage of at least 3 sentences. The passage must be grade-appropriate in vocabulary and sentence length.
8. **Cross-grade Hebrew progression** — G1 focuses on letters, syllables, simple words. G2 adds simple sentences and basic punctuation. G3 adds text-level comprehension and verb tenses. G4 adds text structure and inference. G5 adds argumentation and multi-text reading. G6 adds critical analysis and academic writing conventions.

### 3.5 English

An English page is final when:

1. **§2 Explanation** — Written in Hebrew (as the language of instruction for Israeli students learning English). Uses accessible language. Introduces the English target vocabulary or grammar structure clearly.
2. **§3 Simple Example** — Shows an English sentence or word in a real context. Not an isolated word list. The sentence must reflect actual English use ("I eat an apple every morning," not "eat = אוכל").
3. **§4 Guided Solve** — A second English sentence or dialogue turn. Must show the language structure in use, not just translation.
4. **§5 Try It Yourself** — A question that requires the child to produce English output (complete a sentence, choose the correct form, fill in a word in context). Must be present on every page.
5. **§6 Common Mistake** — The most common error Israeli learners make with this structure (e.g., "He is eats" vs. "He eats" for Present Simple 3rd person singular).
6. **Dialogue requirement** — Grammar pages (G4–G6) must include at least one short dialogue sample (two turns) using the target grammar structure naturally.
7. **Vocabulary pages** — Must list 4–8 target words, each with an English sentence example. Word lists without sentences are not acceptable.
8. **Cross-grade progression** — G1 introduces isolated vocabulary with pictures cues. G2 builds simple sentences. G3 introduces Present Simple and basic questions. G4 adds Continuous and comparisons. G5 adds future forms, modals, and narration. G6 adds conditionals, complex tenses, and academic vocabulary.

### 3.6 Moledet and Geography

A Moledet/Geography page is final when:

1. **§2 Explanation** — Uses clear factual language. For Moledet (G2–G4): concepts are grounded in the child's immediate community. For Geography (G5–G6): concepts extend to Israel and the world.
2. **§3 Simple Example** — A concrete, specific Israeli example (a city, a law, a resource, a landscape type). Not a generic or hypothetical example.
3. **§4 Guided Solve** — A question involving applying the concept to a real situation the child can relate to.
4. **§5 Self-Check** — One question requiring factual recall or application.
5. **§6 Common Mistake** — A common misconception about the civic or geographic concept.
6. **Real-life anchor** — Every page names a specific place, institution, or situation in Israel.
7. **Civic values pages** — Must connect the concept (responsibility, rights, participation) to an action the child can take.

---

## 4. Implementation Waves and Task Lists

### Wave 1 — English G1, G2, G3

**Estimated effort:** 44 pages · 26 P1 · 1 P2 · 16 P3 · 1 P4  
**Duration target:** 3–5 days  

**Per-page task checklist:**
- [ ] Expand §3 to include a full English sentence with the target vocabulary in context
- [ ] Add §5 (try it yourself) if missing
- [ ] Add at least one dialogue exchange to grammar pages
- [ ] Rewrite §4 (guided solve) to use a different sentence from §3
- [ ] Ensure §6 (common mistake) names the specific Israeli learner error (e.g., wrong gender agreement, missing article)
- [ ] Ensure §7 (practice bridge) matches the current practice exercise name in the registry

**Wave 1 task list:**
1. Fix all 26 C-rated English G1/G2/G3 pages — rewrite §3, add §5, add dialogue (G1: 5 pages · G2: 13 pages · G3: 8 pages)
2. Expand all B-rated G1/G2/G3 vocabulary pages — add example sentences
3. Verify G3 grammar pages — `grammar_question_frames` is A, verify only
4. Add §5 self-check to all G3 B-rated pages missing it
5. Cross-check: verify no G1/G2/G3 vocabulary page is a simple word list without sentences

---

### Wave 2 — English G4, G5, G6

**Estimated effort:** 57 pages · 0 P1 · 18 P2 · 35 P3 · 4 P4  
**Duration target:** 3–4 days  

**Per-page task checklist:**
- [ ] Add §5 self-check to all pages missing it
- [ ] Add dialogue exchange (2 turns minimum) to all grammar pages
- [ ] Upgrade §3/§4 examples to use multi-clause sentences at grade-appropriate complexity
- [ ] G4: ensure examples use Present Continuous alongside Present Simple for differentiation
- [ ] G5: ensure examples use future will/going to, modals, or Past Simple where relevant
- [ ] G6: ensure examples include conditional clauses, complex tenses, or academic vocabulary

**Wave 2 task list:**
1. Add §5 self-check to all 19 G4 pages lacking it
2. Add dialogue samples to G4 grammar pages (3 pages)
3. Add §5 and dialogue to all 10 G5 grammar/sentence pages
4. Verify G5 vocabulary pages (11 pages — A-rated, add self-check only)
5. Add §5 and dialogue to all 7 G6 grammar/sentence pages
6. Verify G6 vocabulary pages (10 pages — A-rated, add self-check only)
7. Run cross-grade check: confirm G4 vocab examples are more complex than G3 equivalents

---

### Wave 3 — Math G5, G6

**Estimated effort:** 84 pages · 17 P1 · 37 P2 · 24 P3 · 6 P4  
**Duration target:** 5–7 days  

**Per-page task checklist:**
- [ ] All C-rated pages: write a new §3 worked example with realistic G5/G6 numbers
- [ ] All pages with "numbers too small": scale example numbers to at least 3 significant digits for G5, 4 for G6
- [ ] All pages with bullet-list §3: replace with a structured worked example or comparison table
- [ ] Cross-grade generic families: ensure G5 examples use different numbers and real-life contexts from G6 equivalents
- [ ] Fraction/decimal pages: ensure the denominator or decimal place count is grade-appropriate (G5: halves, quarters, thirds, tenths; G6: mixed fractions, percentages, ratios)
- [ ] Word problems: every word problem must name a real-world scenario (shopping, cooking, building, sport)
- [ ] Unit conversion pages: add a real-life story frame (e.g., "You are cooking and the recipe says 250g of flour…")

**Wave 3 task list:**
1. Fix all 7 C-rated G5 math pages (eq_mul, est_mul, frac_expand, mixed_to_frac, wp_distance_time, wp_unit_cm_to_m, wp_unit_g_to_kg)
2. Fix all 10 C-rated G6 math pages (dec_add, dec_sub, eq_div, eq_mul, fm_multiple, frac_as_division, frac_multiply, ratio_second, wp_unit_cm_to_m, wp_unit_g_to_kg)
3. Scale numbers in all P2 G5 fraction/percentage/decimal pages (12 pages)
4. Scale numbers in all P2 G6 decimal/ratio pages (10 pages)
5. Differentiate cross-grade families: add_three (G5 vs G6), sequence, dec_sub, eq_sub, ns_place_hundreds, wp_comparison_more
6. Add §5 to all G5/G6 pages missing self-check (10 pages)
7. Replace all bullet-list §3 structures with worked examples (18 pages)

---

### Wave 4 — Math G1, G2, G3, G4

**Estimated effort:** 104 pages · 0 P1 · 34 P2 · 62 P3 · 8 P4  
**Duration target:** 5–7 days  

**Per-page task checklist:**
- [ ] Replace bullet-list §3 sections with a structured worked example or comparison table (applies to ~60 pages)
- [ ] Cross-grade families: differentiate add_three, sequence, dec_sub, eq_add, eq_sub, ns_place_hundreds, wp_comparison_more across G3/G4 — use different numbers, different real-life contexts
- [ ] G3 order-of-operations pages: add a worked example with two operations, not just a rule
- [ ] G4 decimal pages: verify numbers exceed single-digit (e.g., 4.75 + 3.8, not 1.2 + 0.5)
- [ ] G4 factor/multiple/gcd pages: scale to two-digit numbers minimum
- [ ] Add §5 to G3/G4 pages missing self-check
- [ ] Add real-life context to all G3/G4 word problems (cooking, school, sport, shopping)

**Wave 4 task list:**
1. Replace bullet-list §3 in all 22 Math G2 pages
2. Replace bullet-list §3 in 15 of 19 Math G1 pages
3. Differentiate cross-grade add_three, sequence, eq_add, eq_sub, dec_sub across G3/G4 (12 page pairs)
4. Fix G3 order-of-operations pages (order_add_mul, order_mul_sub, order_parentheses)
5. Scale G4 decimal, factor, prime pages (8 pages)
6. Add §5 self-check to all G3/G4 pages missing it (12 pages)
7. Add real-life context to G3/G4 word problems (wp_comparison_more, wp_leftover — 4 pages)

---

### Wave 5 — Science G1–G6

**Estimated effort:** 38 pages · 0 P1 · 7 P2 · 22 P3 · 9 P4  
**Duration target:** 2–3 days  

**Per-page task checklist:**
- [ ] Add an observation hook to every page that lacks one: "Look around you — can you find…?" or "Try this at home…"
- [ ] B-rated pages: add structured observation prompt to §3 (describe what you see, not just what you know)
- [ ] G3–G6 experiments pages: verify the structure is question → prediction → steps → expected result
- [ ] Replace bullet-list §3 sections with structured descriptions or simple tables
- [ ] Ensure every page mentions at least one Israeli example (local animal, local plant, local material)
- [ ] §6 common mistake: name the scientific misconception explicitly, not just "be careful"

**Wave 5 task list:**
1. Add observation hooks to all 15 science pages (G1–G6) currently rated A-but-missing-observation
2. Fix 7 B-rated pages: plants G1, body G2, earth_space G2, environment G2, earth_space G4, environment G5, body G6, environment G6
3. Replace bullet-list §3 in 6 pages (body G1, animals G6, earth_space G5, earth_space G6, materials G6, environment G4)
4. Verify 9 P4 pages (experiments across grades, materials G2–G3, plants G2–G3)

---

### Wave 6 — Geometry G1–G6

**Estimated effort:** 66 pages · 0 P1 · 21 P2 · 36 P3 · 9 P4  
**Duration target:** 3–4 days  

**Per-page task checklist:**
- [ ] Add a real-life object anchor to every page that lacks one ("The triangle in the road sign," "The rectangular window")
- [ ] G5–G6 3D pages (cone, cylinder, prism, pyramid, sphere): add a textual shape description since no diagram is available
- [ ] Cross-grade families: parallel_perpendicular (G3/G4/G5), trapezoid_area (G5/G6), solids (G2–G6) — differentiate by content scope, not just wording
- [ ] All B-rated pages: add real-life examples to §3 and §4
- [ ] Replace bullet-list §3 sections with worked numeric examples (area, perimeter)
- [ ] Add §5 self-check to pages missing it (G2 solids, G5/G6 square pages, G6 triangle pages)

**Wave 6 task list:**
1. Add real-life anchors to all 20+ G3–G5 geometry pages with the note
2. Add textual shape descriptions to G6: cone, cylinder, prism_volume_triangle, pyramid_rectangular, pyramid_square (5 pages)
3. Fix B-rated pages: parallel_perpendicular G4, diagonal_square G5, parallelogram_area G5, triangle_area G5, triangle_perimeter G5, parallelogram_area G6, solids G6, sphere_volume G6 (8 pages)
4. Differentiate cross-grade families: parallel_perpendicular (G3 vs G4 vs G5), trapezoid_area (G5 vs G6), solids (G2–G6)
5. Add §5 self-check to G2 solids, G5 square_area, G6 square_area, G6 triangle_angles

---

### Wave 7 — Hebrew G1–G6

**Estimated effort:** 172 pages · 1 P1 · 5 P2 · 83 P3 · 83 P4  
**Duration target:** 4–6 days  

**Per-page task checklist:**
- [ ] Rewrite `g4.present_text_based_choice` (C-rated) — add a sample reading passage, worked §3, and guided §4
- [ ] Grammar pages with "grammar brief": expand §2 from a rule statement to a rule + example sentence embedded inline
- [ ] Pages with "§3 weak": add a complete Hebrew sentence in §3, not just a fragment or vocabulary item
- [ ] Pages with "§5 missing": add one self-check question with a clear, short answer
- [ ] All G5/G6 grammar pages (grammar_verb_agreement_plural_subject, rephrase, g5.argument_scaffold_choice): add sentence examples and self-check
- [ ] P4 pages: read and confirm all sections are present and populated; update status to verified

**Wave 7 task list:**
1. Fix `g4.present_text_based_choice` (C → A): write reading passage, worked example, guided solve
2. Fix 4 B-rated Hebrew pages (g1.grammar_word_order, g5.argument_scaffold_choice, g5.grammar_verb_agreement_plural_subject, g6.rephrase)
3. Expand 35+ "grammar brief" notes across G1–G6 (add inline sentence examples)
4. Add §5 self-check to 10 pages missing it (G1 agreement_boy_plural; G2 sentence_wellformed, short_paragraph_choice; G6 argumentative_full_scaffold; others)
5. Verify all 83 P4 Hebrew pages — confirm all 7 sections populated

---

### Wave 8 — Moledet and Geography

**Estimated effort:** 37 pages · 0 P1 · 0 P2 · 8 P3 · 29 P4  
**Duration target:** 1 day  

**Per-page task checklist:**
- [ ] Add real-life connection to pages with the note (mg_g2_community_participation, mg_g3_rights_duties, mg_g3_social_participation)
- [ ] Expand §3 of mg_g3_citizenship_basics with a concrete sentence example
- [ ] All P4 pages: read and confirm all sections are populated; update status to verified

**Wave 8 task list:**
1. Add real-life connections to 3 Moledet G2/G3 pages
2. Expand mg_g3_citizenship_basics §3
3. Verify all 29 P4 Moledet/Geography pages

---

### Wave 9 — Re-Audit and Freeze

**Duration target:** 2 days  

**Task list:**
1. Run automated re-audit (`node tmp/audit-book-pedagogy.mjs`)
2. Review all pages still rated B or below — assign targeted fix and re-edit
3. Run cross-grade comparison for the 14 generic families
4. Spot-read 60-page sample (10 per subject)
5. Confirm all 602 pages have §5 (try it yourself) populated
6. Confirm all English pages have at least one English sentence example in §3
7. Confirm all Science pages have an observation hook
8. Confirm all Math pages use grade-appropriate number magnitudes
9. Update all verified pages to `verified` status
10. Generate final summary report
11. Owner sign-off → freeze

---

## 5. Acceptance Criteria

The project is complete when all of the following are true:

### Content Completeness

- [ ] Zero pages rated C or D across all 602 pages
- [ ] Zero pages with a missing §5 (try it yourself) section
- [ ] Zero pages with an empty §3 (simple example)
- [ ] Zero pages with an empty §6 (common mistake)
- [ ] Zero English pages without at least one complete English sentence in §3

### Quality Standards

- [ ] Every Math page uses grade-appropriate number magnitudes (G1: ≤99, G2: ≤999, G3: ≤9,999, G4: ≤9,999, G5: ≤99,999, G6: ≤200,000 or appropriate fractions/ratios)
- [ ] Every Math word problem names a real-world scenario
- [ ] Every Geometry page (G5–G6 3D) has a textual shape description in §2
- [ ] Every Science page has an explicit observation hook or hands-on suggestion
- [ ] Every Hebrew grammar page has a complete Hebrew sentence example embedded in §2
- [ ] Every English grammar page (G4–G6) has at least one dialogue sample

### Cross-Grade Differentiation

- [ ] No two pages in the same topic family (e.g., add_three across grades) have identical §3 worked examples
- [ ] All 14 cross-grade generic families have been reviewed and differentiated
- [ ] The `parallel_perpendicular` pages in G3, G4, G5 each have distinct scope and examples
- [ ] The `trapezoid_area` pages in G5 and G6 are visibly distinct in complexity
- [ ] The `sequence` pages in G3, G4, G5, G6 each use different number magnitudes and contexts

### Process Completion

- [ ] All 602 pages have status = `verified` in this inventory
- [ ] Wave 9 re-audit confirms all pages as A-rated
- [ ] Owner has read and signed off on the final audit report
- [ ] No book content has been modified outside of the approved content files

---

## 6. Hard Restrictions

These restrictions apply throughout the entire finalization project. They may not be overridden by any individual wave or task.

| Restriction | Applies to |
|---|---|
| No UI component changes | All waves |
| No CSS changes | All waves |
| No route changes | All waves |
| No book reader design changes | All waves |
| No practice mapping changes | All waves |
| No SQL or database changes | All waves |
| No diagnostic report changes | All waves |
| No changes to `/lib/learning-book/` registry files | All waves |
| No changes to `/lib/learning-book/learning-book-sequence-meta.js` | All waves |
| No changes to `/lib/learning-book/learning-book-catalog.js` | All waves |
| No commit or push without explicit owner approval | All waves |
| Content changes are restricted to `/docs/learning-book/{subject}/{grade}/drafts/*.md` files only | All waves |
| No creation of new page IDs not already registered in the registry | All waves |
| No deletion of existing pages | All waves |
| No changes to the page metadata table at the top of any `.md` file | All waves |
| No changes to page ordering or navigation sequence | All waves |

---

## 7. Per-Subject Style Guide and Checklist

### 7.1 Math Style Guide

**Voice and register:** Direct, encouraging, second person ("Now you will learn…", "Let's solve this together").  
**Numbers:** Always write numbers as digits, not words, in examples. Use Hebrew number words in explanatory text when appropriate.  
**Worked examples:** Format as a vertical calculation or a step-by-step numbered list — never as a paragraph.  
**Real-life contexts approved for use:** Shopping, cooking, sports scores, distances, class sizes, age comparisons, time, coins, cooking measurements.  
**Real-life contexts to avoid:** Stock markets, loans, mortgages (not age-appropriate for G1–G6).

**Math §3 format checklist:**
- [ ] Starts with "דוגמה:" or "נפתור יחד:"
- [ ] Shows the full calculation, not just the answer
- [ ] Uses grade-appropriate numbers
- [ ] Names a real-world object or scenario if it's a word problem

**Math §6 format checklist:**
- [ ] Begins with "טעות נפוצה:" or "שגיאה שכיחה:"
- [ ] Shows the wrong calculation explicitly
- [ ] Shows the correction with an explanation of why

---

### 7.2 Geometry Style Guide

**Voice and register:** Visual and spatial — help the child picture the shape before calculating.  
**Shape introductions:** Always name a real-world object with the shape in §2 before stating the property.  
**Diagrams:** Since no embedded diagram tool exists, describe shapes textually: "Imagine a square tile — all four sides are equal, all four corners are right angles (90°)."  
**Formula presentation:** Present formulas in the format: מה מחשבים = → איך מחשבים. Use the Hebrew formula notation: `שטח = אורך × רוחב`.

**Geometry §3 format checklist:**
- [ ] Uses actual measurements in centimeters or meters (not "side = a")
- [ ] Names a real-world object
- [ ] Shows the calculation step by step

**Geometry §2 checklist for 3D pages (G5–G6):**
- [ ] Describes the shape in words (faces, edges, vertices)
- [ ] Names a real-world example of the solid
- [ ] States the volume/surface area formula

---

### 7.3 Science Style Guide

**Voice and register:** Curious and exploratory. Use "האם שמת לב ש…?" and "נסה לבדוק…" frames.  
**Examples:** Prefer Israeli fauna, flora, and materials. Approved examples: sunflower, crow, olive tree, clay soil, limestone rock, Mediterranean sea.  
**Observation hook formats:**
- "צא החוצה ובדוק: כמה סוגי צמחים אתה רואה?"
- "הסתכל על הכוס עם הקרח — מה קורה לה לאחר כמה דקות?"
- "נסה בבית: שים גרגר אחד של מלח על הלשון. מה אתה מרגיש?"

**Science §5 format checklist:**
- [ ] Requires the child to observe, not just recall
- [ ] Can be done at home without special equipment
- [ ] Connects to the concept in §2

---

### 7.4 Hebrew Style Guide

**Voice and register:** Warm, encouraging, and direct. Use "שים לב ש…", "הנה משפט דוגמה:", "עכשיו תנסה אתה:".  
**Grammar pages:** Rule → example sentence → guided application. The rule must never appear without an example sentence immediately after it.  
**Reading passages:** Written at grade level. G1: 2–3 sentences, 1–2 syllable words. G2: 3–5 sentences. G3–G4: 5–8 sentences. G5–G6: 8–12 sentences, complex clauses allowed.  
**Sentence examples format:** Present examples as complete sentences, bolding or underlining the target grammatical feature.

**Hebrew §2 grammar checklist:**
- [ ] States the rule in one sentence
- [ ] Follows immediately with a complete Hebrew sentence demonstrating the rule
- [ ] Target feature is bolded or marked (e.g., **הלך** or __יפה__)

---

### 7.5 English Style Guide

**Voice and register:** The page is written in Hebrew (for Israeli learners), but all English examples are in English.  
**English sentence examples:** Use naturalistic, conversational English. Avoid textbook-stilted examples like "The boy hits the ball." Prefer: "I'm going to school right now," "She doesn't like vegetables," "Did you finish your homework?"  
**Dialogue format:**
```
A: What are you doing?
B: I'm reading a book.
```
**Vocabulary page format:** Each word is on its own line with:
`English word — Hebrew translation — example sentence in English`

**English §5 checklist:**
- [ ] Requires the child to produce English output (fill in, write, choose)
- [ ] Does not accept Hebrew-only answers
- [ ] Has a clear correct answer (not open-ended at G1–G4 level)

---

### 7.6 Moledet/Geography Style Guide

**Voice and register:** Civic and grounded. Avoid abstract statements. Always anchor to a specific person, place, or institution.  
**Examples:** Use real Israeli cities, institutions, and landmarks. Approved: Tel Aviv, Jerusalem, Haifa, the Knesset, the Israel National Water Carrier, the Dead Sea, Ben Gurion Airport.  
**Civic pages:** Connect every abstract concept (rights, responsibility, democracy) to a concrete scenario the child can act on: "When you see a classmate being bullied, what is your responsibility?"

**Moledet/Geography §3 checklist:**
- [ ] Names a specific Israeli location, institution, or situation
- [ ] Does not use only abstract or generic language
- [ ] Is appropriate to the grade level (G2–G4 local; G5–G6 national and global)

---

## 8. Cross-Grade Differentiation Reference

The following 14 topic families appear across multiple grades with high structural similarity. Each family requires explicit differentiation before launch. The table shows what must differ between grades.

| Family | Subjects/Grades | Required Differentiation |
|---|---|---|
| `add_three` | Math G3, G4, G5, G6 | G3: 3-digit addends. G4: 4-digit. G5: 5-digit. G6: includes decimals or large real-life totals |
| `add_two` | Math G1–G6 | Each grade must use numbers at or near the top of its range. Real-life contexts must differ |
| `sequence` | Math G3, G4, G5, G6 | G3: arithmetic +10/+20. G4: ×2 or ×3. G5: mixed operation sequences. G6: sequences involving fractions or decimals |
| `eq_add` / `eq_sub` | Math G3, G4, G5, G6 | G3: 2-digit unknowns. G4: 3–4 digit. G5: multi-step. G6: includes variables in real-life word problem frame |
| `dec_sub` | Math G3, G4, G5, G6 | G3: tenths only. G4: tenths + hundredths. G5: multi-step. G6: in context of money or measurement |
| `ns_place_hundreds` | Math G3, G4, G5, G6 | G3: hundreds/tens/units. G4: thousands. G5: hundred-thousands. G6: millions (or link to ratios/fractions) |
| `wp_comparison_more` | Math G3, G4, G5, G6 | G3: "how many more apples". G4: multi-step comparison. G5: comparative with ratio. G6: percentage comparison |
| `fm_factor` | Math G4, G5, G6 | G4: factor pairs of numbers ≤50. G5: factors with GCD. G6: prime factorization in context |
| `parallel_perpendicular` | Geometry G3, G4, G5 | G3: identify in shapes. G4: properties of quadrilaterals. G5: apply in area/perimeter calculations |
| `trapezoid_area` | Geometry G5, G6 | G5: area formula introduction. G6: combined with volume or in multi-step problems |
| `solids` | Geometry G2–G6 | G2: name and sort. G3: count faces/edges. G4: identify nets. G5: surface area concept. G6: volume calculations |
| `transformations` | Geometry G1, G2 | G1: recognize/name (slide, flip). G2: describe and draw simple transformations |
| `dec_add` | Math G3–G6 | G3: tenths. G4: hundredths. G5: multi-digit with thousandths. G6: in real-world money/measurement context |
| `triangle_angles` | Geometry G3, G4, G5, G6 | G3: identify acute/obtuse/right. G4: angle sum = 180°. G5: exterior angles. G6: trigonometric context (intro) |

**Differentiation verification method:**  
For each family, side-by-side comparison of §3 (simple example) across grades is required. The worked numbers, real-life context, and cognitive demand must be visibly grade-appropriate. If two grades have identical §3 content, the lower-grade page must be made simpler and the higher-grade page must be made more complex.

---

## 9. Verification Checklist

Use this checklist when verifying each individual page after editing. A page may be marked `verified` only when all applicable items are checked.

### Universal Checks (All pages, all subjects)

- [ ] §1 Learning goal — present and states a single clear skill
- [ ] §2 Explanation — present, at least 100 characters, at appropriate grade reading level
- [ ] §3 Simple example — present, not a bullet list, not empty
- [ ] §4 Guided solve — present, uses different numbers or context from §3
- [ ] §5 Try it yourself — present, answerable, at least one question
- [ ] §6 Common mistake — present, names the error explicitly, shows correction
- [ ] §7 Practice bridge — present, references the correct practice activity
- [ ] No placeholder text (e.g., "כאן יש דוגמה", "TODO", "[לשלים]")
- [ ] No mixed-language errors (English words in Hebrew section, or vice versa for non-English pages)
- [ ] Metadata table at top of file is unchanged (page ID, subject, grade, skill_id)

### Math-Specific Checks

- [ ] §3 example uses numbers at or near the top of the grade range
- [ ] Word problems name a real-world scenario
- [ ] No bullet-list-only §3 (must be a worked example)
- [ ] If cross-grade family: numbers and context are distinct from adjacent-grade equivalents

### Geometry-Specific Checks

- [ ] §2 names a real-world object with the shape
- [ ] §3 uses actual measurements, not symbolic letters
- [ ] For G5–G6 3D pages: textual shape description is present in §2 or §3

### Science-Specific Checks

- [ ] At least one observation hook or hands-on prompt present (anywhere in the page)
- [ ] §3 example uses a real organism or phenomenon, not only a textbook diagram description
- [ ] G3–G6 experiments pages: includes question → prediction → steps → expected result structure

### Hebrew-Specific Checks

- [ ] Grammar pages: rule is followed by a complete Hebrew sentence example
- [ ] Comprehension pages: contains a reading passage of at least 3 sentences
- [ ] §5 is present on all grammar pages

### English-Specific Checks

- [ ] §3 contains a complete English sentence (not just a word translation)
- [ ] Grammar pages (G4–G6): includes a two-turn dialogue sample
- [ ] §5 requires English output from the child
- [ ] Vocabulary pages: each word has an English sentence example

### Moledet/Geography-Specific Checks

- [ ] §3 names a specific Israeli location, institution, or situation
- [ ] Civic concept pages: connect to a concrete, age-appropriate action

---

## 10. Final Freeze Checklist

The final freeze is the point after which no content changes may be made to the learning books without a new formal review cycle. The following must all be true before the freeze is declared.

### Inventory Completion

- [ ] All 602 pages have status = `verified` in the Wave 9 inventory
- [ ] Automated re-audit (Wave 9) shows 0 C-rated pages, 0 D-rated pages
- [ ] All 14 cross-grade generic families have been reviewed and differentiated
- [ ] No page has unresolved issues in the audit output

### Content Quality

- [ ] All 41 original C-rated pages have been rewritten and re-audited as A
- [ ] All B-rated pages have been enriched; new audit shows A
- [ ] Every Math page: grade-appropriate number magnitudes confirmed
- [ ] Every English page: English sentence example in §3 confirmed
- [ ] Every Science page: observation hook confirmed
- [ ] Every Hebrew grammar page: sentence example in §2 confirmed
- [ ] Every Geometry G5–G6 3D page: textual shape description confirmed

### Process and Governance

- [ ] No changes made outside of `/docs/learning-book/{subject}/{grade}/drafts/`
- [ ] No registry files (`lib/learning-book/`) were modified
- [ ] No UI, CSS, route, or practice mapping files were modified
- [ ] Owner has reviewed the Wave 9 final audit summary report
- [ ] Owner has explicitly approved the freeze
- [ ] Git commit created with the message "chore: freeze learning books content pre-launch vX.X"
- [ ] Freeze date recorded here: ________________

### Post-Freeze Rules

Once the freeze is declared:
- No edits to book content files are permitted without a new formal review cycle.
- Any proposed change must be submitted as a "post-freeze content change request" with: page ID, current text, proposed text, reason, and owner approval.
- A post-freeze change affecting more than 10 pages triggers a full Wave 9 re-audit before redeployment.

---

## 11. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Hebrew grammar pages have too-brief explanations that require full rewrites, not just expansion | Medium | High | Target these in Wave 7 as P2. Test one G1 grammar page as a pilot before bulk editing. |
| R2 | English dialogue additions feel unnatural or above/below grade level | Medium | Medium | Apply the English style guide strictly. Test dialogue quality against the §6 common mistakes for Israeli learners. |
| R3 | Math number scaling in G5/G6 introduces new common mistakes (careless errors with large numbers) | Low | Medium | Update §6 in each scaled page to reflect the new common error pattern (e.g., misplacing the decimal when working with 100,000+). |
| R4 | Cross-grade differentiation edits accidentally break the content of the lower-grade version | Medium | High | Edit lower-grade and higher-grade versions in the same session. Review both side-by-side before marking either as verified. |
| R5 | Wave 9 re-audit reveals 20+ pages still rated B after all waves are complete | Low | High | Reserve 1–2 buffer days at the end of each wave for re-edits. Do not declare a wave complete until all P1/P2 pages are re-audited as A. |
| R6 | Science observation hooks are too vague or not feasible for home use | Low | Medium | Use approved hook formats from Section 7.3. Each hook must be doable with household items in under 5 minutes. |
| R7 | Geometry 3D textual descriptions are too complex for the grade level | Medium | Medium | Use the sentence models from Section 7.2. For G5: one sentence. For G6: two sentences max. Test with a G6-level reader. |
| R8 | Moledet/Geography pages that are P4 (verify only) turn out to have content gaps on manual review | Low | Low | Spot-check 30% of P4 Moledet/Geography pages (9 pages) during Wave 8 in addition to standard verification. |
| R9 | Hebrew G4 C-page (`g4.present_text_based_choice`) requires a new reading passage, which may affect curriculum alignment | Low | Medium | Write a short, neutral 5-sentence reading passage. Do not create a new skill or topic. The page title and skill_id remain unchanged. |
| R10 | Wave execution order is disrupted if a blocking technical issue is found in a later wave | Low | Low | Waves are independent by subject. Any wave can be paused and another wave started without losing progress. |
| R11 | Freeze is declared prematurely before all pages are verified | Low | High | The freeze checklist in Section 10 is gated. No freeze is permitted without 100% verified count and owner sign-off. |
| R12 | Bulk bullet-list replacements in Math G1–G4 introduce formatting inconsistencies | Medium | Low | Use a standard table format template for all replacement tables. Define the template before starting Wave 4. |

---

## 12. Reference

### Key Files

| File | Purpose |
|---|---|
| `docs/learning-book/BOOK_PEDAGOGY_RICHNESS_AUDIT.md` | Source audit report; executive summary, top weak pages, readiness by subject |
| `tmp/book-pedagogy-audit.json` | Machine-readable audit data for all 602 pages |
| `tmp/book-pedagogy-page-table.md` | Flat page table with rating, issues, and fix recommendations |
| `tmp/audit-book-pedagogy.mjs` | Audit script; re-run for Wave 9 re-audit |
| `lib/learning-book/parse-learning-page-markdown.js` | Page markdown parser (do not modify) |
| `lib/learning-book/learning-book-catalog.js` | Book registry (do not modify) |
| `lib/learning-book/learning-book-sequence-meta.js` | Sequence metadata (do not modify) |
| `docs/learning-book/{subject}/{grade}/drafts/*.md` | All editable book content files |

### Rating Scale (Audit)

| Rating | Meaning |
|---|---|
| A | Good for launch; minor polish may be noted |
| B | Enrichment needed before launch |
| C | Do not launch; significant rewrite required |
| D | (None in current inventory) |

### Priority Scale

| Priority | Meaning |
|---|---|
| P1 | C-rated page — blocks launch |
| P2 | B-rated with 2+ issues, or A-rated in a cross-grade generic family |
| P3 | B-rated with 1 issue, or A-rated with a specific improvement note |
| P4 | A-rated, clean — read and verify only |

### Wave Summary

| Wave | Subject / Grade | Pages | P1 | P2 | P3 | P4 |
|---|---|---|---|---|---|---|
| 1 | English G1–G3 | 44 | 15 | 1 | 28 | 0 |
| 2 | English G4–G6 | 57 | 0 | 18 | 35 | 4 |
| 3 | Math G5–G6 | 84 | 16 | 42 | 22 | 4 |
| 4 | Math G1–G4 | 104 | 0 | 34 | 62 | 8 |
| 5 | Science G1–G6 | 38 | 0 | 7 | 22 | 9 |
| 6 | Geometry G1–G6 | 66 | 0 | 21 | 36 | 9 |
| 7 | Hebrew G1–G6 | 172 | 1 | 5 | 83 | 83 |
| 8 | Moledet/Geography G2–G6 | 37 | 0 | 0 | 8 | 29 |
| 9 | Cross-project re-audit | 602 | — | — | — | — |
| **Total** | | **602** | **32** | **128** | **296** | **146** |

> Note: Wave 9 does not add new page tasks; it verifies all previous waves and runs the re-audit.

---

*Document created: 2026-06-03*  
*Owner approval required before implementation begins.*  
*Do not modify book content until Wave 1 is approved.*
