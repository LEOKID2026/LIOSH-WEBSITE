# Book Pedagogy & Richness Audit

**Generated:** 2026-06-03  
**Scope:** All 35 learning books, 602 registered pages (Math, Geometry, Science, Hebrew, English, Moledet, Geography)  
**Phase:** Audit/report only — no content, UI, CSS, route, or practice-mapping changes  
**Method:** Automated structural scoring of all pages (7-section template) + manual review of representative pages + cross-reference to `LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md`

---

## 1. Executive Summary

The learning books are **technically complete** (602 pages registered, 7-section template present on every page) and **language-risk cleanup is largely done**, but **pedagogical richness is uneven**. Most subjects follow the template well; the main launch risk is **generic, thin English vocabulary pages** and **upper-grade Math pages with compressed examples**.

| Metric | Value |
|--------|------:|
| Total books | 35 |
| Total pages audited | 602 |
| Pages rated **A** (good for launch) | 436 (72%) |
| Pages rated **B** (minor enrichment) | 122 (20%) |
| Pages rated **C** (generic/thin — improve before launch) | 44 (7%) |
| Pages rated **D** (do not launch) | 0 registered |
| Books fully launch-ready (book rating A, no C/D pages) | 18 |
| Books needing enrichment before launch | 17 |

### Key findings

1. **English (G1–G3) is the weakest subject** — avg score 77/100; 26 pages rated C. Vocabulary pages repeat a word-list + single-word answer pattern without mini-dialogue, contextual sentences, or meaningful self-check.
2. **Hebrew, Moledet, and Geography are strongest** — rich reading passages, comprehension, and civic context; 97%+ pages rated A.
3. **Math G5–G6 has structural richness but generic cross-grade overlap** — 22 topic families flagged in the cross-grade audit as NEEDS_POLISH (e.g. `add_three`, `sequence`, `eq_sub` at 72–99% similarity across grades).
4. **Science pages pass the template check** but many lack explicit mini-experiment/observation steps; books are thin (6–7 pages/grade covering entire topic umbrellas).
5. **Geometry is strong** — diagrams mapped for 54/65 visual pages; `sphere_volume` (G6) and `transformations` (G1–G2) need visual enrichment.
6. **No placeholder pages are registered** in the catalog (orphan `book_placeholder.md` files exist on disk for Math G3–G6 and Geometry G1–G6 but are not in `PAGE_ORDER`).

### Launch recommendation

**Safe to launch now (with minor polish backlog):** Hebrew G1–G6, Moledet G2–G4, Geography G5–G6, Math G1–G2, Geometry G3–G4, Science G3.

**Improve before launch:** English G1–G3 (priority), Math G5–G6 upper-grade enrichment, English G4 vocabulary pages.

**Do not launch without rewrite:** The 44 C-rated pages listed in Section 9 — predominantly English vocabulary and early grammar/sentence pages.

---

## 2. Audit Methodology

Each page was evaluated against the 7-section template:

| § | Expected content |
|---|------------------|
| 1 | Learning goal — child-facing |
| 2 | Explanation |
| 3 | Simple worked example |
| 4 | Guided solve (step-by-step) |
| 5 | Try yourself / self-check |
| 6 | Common mistake / pay attention |
| 7 | Practice bridge |

**Rating scale:** A = launch-ready | B = minor enrichment | C = generic/thin | D = block launch

Subject-specific checks were applied (geometry diagrams, science observation hooks, English dialogue, map context for Moledet/Geography). Scores were calibrated against manual reads of 30+ representative pages including `science:g5/experiments`, `english:g2/vocab_house`, `math:g6/eq_mul`, `hebrew:g4/g4.present_text_based_choice`, and `geometry:g6/sphere_volume`.

---

## 3. Overall Readiness by Subject

| Subject | Pages | Avg score | A | B | C | D | Readiness |
|---------|------:|----------:|--:|--:|--:|--:|-----------|
| חשבון (math) | 188 | 91 | 115 | 56 | 17 | 0 | Strong |
| גאומטריה (geometry) | 66 | 97 | 57 | 9 | 0 | 0 | Launch-ready |
| מדעים (science) | 38 | 96 | 30 | 8 | 0 | 0 | Launch-ready |
| עברית (hebrew) | 172 | 96 | 166 | 5 | 1 | 0 | Launch-ready |
| אנגלית (english) | 101 | 77 | 31 | 44 | 26 | 0 | Needs work |
| מולדת (moledet) | 22 | 99 | 22 | 0 | 0 | 0 | Launch-ready |
| גאוגרפיה (geography) | 15 | 100 | 15 | 0 | 0 | 0 | Launch-ready |

### Subject notes

#### Math (188 pages) — Good, upper grades need depth
- **Strengths:** Full 7-section template on virtually all pages; strong word problems in G1–G2; numeric progression across grades on core operations.
- **Weaknesses:** 17 C-rated pages (mostly G5–G6); §3 examples often one-line formulas; 22 cross-grade families feel generic (prior audit).
- **Grade fit:** G5–G6 numbers sometimes too small for grade level (`perc_discount`, `wp_unit_g_to_kg`, `fm_factor`).

#### Geometry (66 pages) — Strong
- **Strengths:** Visual diagram coverage for most shape/area/perimeter pages; real-life anchoring (e.g. G1 transformations uses toy/mirror).
- **Weaknesses:** G1–G2 books are very small (3 pages each); `transformations` has no diagram; G6 `sphere_volume` lacks visual; repeated `solids`/`parallel_perpendicular` pages across grades.

#### Science (38 pages) — Structurally sound, scope-thin
- **Strengths:** Clear phenomenon → explanation → Q&A flow; good child tone; real-life examples (ice melting, garden animals).
- **Weaknesses:** Only 6–7 pages per grade for entire science curriculum; many pages lack explicit hands-on observation step; G5 `experiments` metadata notes missing graph illustration.

#### Hebrew (172 pages) — Launch-ready
- **Strengths:** Reading passages, comprehension, grammar with sentence examples; natural child tone.
- **Weaknesses:** 1 C page (`g4.present_text_based_choice` — heuristic false alarm; manual read confirms solid content); 5 B pages in upper grades.

#### English (101 pages) — Primary launch blocker
- **Strengths:** G5–G6 grammar/translation pages richer; colors/numbers pages in G1 acceptable.
- **Weaknesses:** 26 C pages; vocabulary pages are word-list translations without sentences in context, mini-dialogue, or guided examples; G1–G3 books rated C at book level.

#### Moledet (22 pages) + Geography (15 pages) — Launch-ready
- **Strengths:** Map/place context, civic reflection, real Israeli geography; all pages A-rated.
- **Weaknesses:** Small book size; could add more map visuals in content (authoring note for future phase).

---

## 4. Overall Readiness by Grade

| Grade | Pages | Avg score | A | B | C | Readiness |
|-------|------:|----------:|--:|--:|--:|-----------|
| G1 | 70 | 93 | 58 | 7 | 5 | Mostly ready |
| G2 | 77 | 90 | 59 | 5 | 13 | Polish needed |
| G3 | 100 | 91 | 71 | 21 | 8 | Mostly ready |
| G4 | 112 | 94 | 84 | 27 | 1 | Ready |
| G5 | 120 | 91 | 79 | 34 | 7 | Mostly ready |
| G6 | 123 | 91 | 85 | 28 | 10 | Mostly ready |

**G2** has the most C pages (13) — almost all English vocabulary. **G5–G6** C pages are concentrated in Math upper-grade compression.

---

## 5. Book-Level Summary (35 books)

| Book | Pages | A | B | C | Book rating | Verdict |
|------|------:|--:|--:|--:|-------------|--------|
| אנגלית G2 | 15 | 0 | 2 | 13 | **C** | Enrich before launch |
| אנגלית G1 | 10 | 2 | 3 | 5 | **C** | Enrich before launch |
| אנגלית G3 | 19 | 2 | 9 | 8 | **C** | Enrich before launch |
| אנגלית G4 | 19 | 5 | 14 | 0 | **B** | Minor enrichment |
| חשבון G6 | 44 | 18 | 16 | 10 | **B** | Minor enrichment |
| חשבון G5 | 40 | 16 | 17 | 7 | **B** | Minor enrichment |
| אנגלית G5 | 21 | 11 | 10 | 0 | **B** | Minor enrichment |
| אנגלית G6 | 17 | 11 | 6 | 0 | **B** | Minor enrichment |
| חשבון G3 | 26 | 15 | 11 | 0 | **B** | Minor enrichment |
| גאומטריה G6 | 19 | 16 | 3 | 0 | **B** | Minor enrichment |
| מדעים G2 | 7 | 4 | 3 | 0 | **B** | Minor enrichment |
| עברית G2 | 23 | 23 | 0 | 0 | **A** | Launch-ready |
| עברית G4 | 29 | 28 | 0 | 1 | **A** | Launch-ready |
| מדעים G4 | 6 | 5 | 1 | 0 | **B** | Minor enrichment |
| מדעים G1 | 6 | 5 | 1 | 0 | **B** | Minor enrichment |
| גאומטריה G5 | 18 | 14 | 4 | 0 | **B** | Minor enrichment |
| עברית G1 | 32 | 30 | 2 | 0 | **A** | Launch-ready |
| מדעים G5 | 6 | 5 | 1 | 0 | **B** | Minor enrichment |
| עברית G5 | 28 | 26 | 2 | 0 | **A** | Launch-ready |
| גאומטריה G2 | 3 | 3 | 0 | 0 | **A** | Launch-ready |
| מולדת G3 | 8 | 8 | 0 | 0 | **A** | Launch-ready |
| חשבון G4 | 37 | 26 | 11 | 0 | **B** | Minor enrichment |
| עברית G3 | 31 | 31 | 0 | 0 | **A** | Launch-ready |
| מדעים G3 | 7 | 7 | 0 | 0 | **A** | Launch-ready |
| מדעים G6 | 6 | 4 | 2 | 0 | **B** | Minor enrichment |
| גאומטריה G4 | 14 | 13 | 1 | 0 | **A** | Launch-ready |
| עברית G6 | 29 | 28 | 1 | 0 | **A** | Launch-ready |
| מולדת G2 | 7 | 7 | 0 | 0 | **A** | Launch-ready |
| חשבון G1 | 19 | 18 | 1 | 0 | **A** | Launch-ready |
| חשבון G2 | 22 | 22 | 0 | 0 | **A** | Launch-ready |
| גאוגרפיה G5 | 7 | 7 | 0 | 0 | **A** | Launch-ready |
| גאוגרפיה G6 | 8 | 8 | 0 | 0 | **A** | Launch-ready |
| גאומטריה G1 | 3 | 3 | 0 | 0 | **A** | Launch-ready |
| גאומטריה G3 | 9 | 8 | 1 | 0 | **A** | Launch-ready |
| מולדת G4 | 7 | 7 | 0 | 0 | **A** | Launch-ready |

---

## 6. Top 20 Weakest Pages

| Rank | Page | Title | Rating | Score | Primary fix | Why it ranks low |
|-----:|------|-------|--------|------:|-------------|------------------|
| 1 | `english:g1/vocab_emotions` | רגשות באנגלית | **C** | 38 | add examples | Section 2 very thin (36 chars); Missing or weak simple example (§3); Missing or weak guided example (§4) |
| 2 | `english:g2/vocab_actions` | פעולות — פועל במשפט | **C** | 38 | add examples | Section 2 very thin (34 chars); Missing or weak simple example (§3); Missing or weak guided example (§4) |
| 3 | `english:g2/vocab_house` | בית — חדרים וחפצים | **C** | 38 | add examples | Section 3 very thin (24 chars); Missing or weak simple example (§3); Missing or weak guided example (§4) |
| 4 | `math:g5/eq_mul` | משוואת כפל | **C** | 48 | add examples | Section 3 very thin (22 chars); Missing or weak simple example (§3); Missing or weak guided example (§4) |
| 5 | `math:g6/frac_as_division` | שבר כחילוק | **C** | 50 | add examples | Section 3 very thin (18 chars); Missing or weak simple example (§3); Missing self-check question (§5) |
| 6 | `math:g6/wp_unit_cm_to_m` | המרת יחידות — ס״מ ומטר | **C** | 53 | add examples | Section 3 very thin (20 chars); Missing or weak simple example (§3); Missing self-check question (§5) |
| 7 | `english:g1/vocab_actions` | פעולות באנגלית | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 8 | `english:g1/vocab_school` | בית ספר באנגלית | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 9 | `english:g2/vocab_family` | משפחה — מילים במשפט | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 10 | `english:g2/vocab_animals` | חיות — שמות ומשפטים | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 11 | `english:g2/vocab_emotions` | רגשות — במשפט | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 12 | `english:g2/vocab_school` | בית ספר — חפצים במשפט | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 13 | `english:g2/vocab_food` | מזון באנגלית | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 14 | `english:g3/vocab_animals` | חיות — במשפט מלא | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 15 | `english:g3/vocab_food` | מזון — I eat… | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 16 | `english:g3/vocab_weather` | מזג אוויר באנגלית | **C** | 56 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 17 | `english:g1/sentence_base` | משפטים קצרים — בסיס | **C** | 59 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 18 | `english:g2/grammar_be` | am / is / are — חיזוק | **C** | 59 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 19 | `english:g2/sentence_base` | משפטים קצרים — כיתה ב׳ | **C** | 59 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |
| 20 | `english:g2/sentence_routine` | שגרת יום — משפטים | **C** | 59 | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4); Missing self-check question (§5) |

---

## 7. Books Safe for Launch

These 18 books have book rating **A**, zero C/D pages, and avg score ≥ 95:

- **גאוגרפיה G5** — 7 pages, 7 rated A (avg 100)
- **גאוגרפיה G6** — 8 pages, 8 rated A (avg 100)
- **גאומטריה G1** — 3 pages, 3 rated A (avg 100)
- **גאומטריה G3** — 9 pages, 8 rated A (avg 100)
- **מולדת G4** — 7 pages, 7 rated A (avg 100)
- **חשבון G2** — 22 pages, 22 rated A (avg 100)
- **חשבון G1** — 19 pages, 18 rated A (avg 99)
- **מולדת G2** — 7 pages, 7 rated A (avg 99)
- **עברית G6** — 29 pages, 28 rated A (avg 98)
- **גאומטריה G4** — 14 pages, 13 rated A (avg 98)
- **מדעים G3** — 7 pages, 7 rated A (avg 97)
- **עברית G3** — 31 pages, 31 rated A (avg 97)
- **מולדת G3** — 8 pages, 8 rated A (avg 97)
- **גאומטריה G2** — 3 pages, 3 rated A (avg 97)
- **עברית G5** — 28 pages, 26 rated A (avg 97)
- **עברית G1** — 32 pages, 30 rated A (avg 96)
- **עברית G2** — 23 pages, 23 rated A (avg 95)

---

## 8. Books Needing Enrichment

### אנגלית G2 (book rating **C**, avg 59)

Priority pages: `vocab_actions` (C), `vocab_house` (C), `vocab_family` (C), `vocab_animals` (C), `vocab_emotions` (C), `vocab_school` (C), `vocab_food` (C), `grammar_be` (C)

### אנגלית G1 (book rating **C**, avg 69)

Priority pages: `vocab_emotions` (C), `vocab_actions` (C), `vocab_school` (C), `sentence_base` (C), `vocab_animals` (C), `translation_classroom` (B), `vocab_family` (B), `grammar_be` (B)

### אנגלית G3 (book rating **C**, avg 72)

Priority pages: `vocab_animals` (C), `vocab_food` (C), `vocab_weather` (C), `grammar_present_simple` (C), `translation_routines` (C), `vocab_actions` (C), `vocab_body` (C), `vocab_family` (C)

### אנגלית G4 (book rating **B**, avg 81)

Priority pages: `grammar_present_simple` (B), `grammar_quantifiers` (B), `translation_hobbies` (B), `vocab_animals` (B), `vocab_body` (B), `vocab_emotions` (B), `vocab_sports` (B), `vocab_weather` (B)

### חשבון G6 (book rating **B**, avg 84)

Priority pages: `frac_as_division` (C), `wp_unit_cm_to_m` (C), `eq_mul` (C), `eq_div` (C), `dec_add` (C), `dec_sub` (C), `frac_multiply` (C), `ratio_second` (C)

### חשבון G5 (book rating **B**, avg 85)

Priority pages: `eq_mul` (C), `wp_distance_time` (C), `frac_expand` (C), `mixed_to_frac` (C), `est_mul` (C), `wp_unit_cm_to_m` (C), `wp_unit_g_to_kg` (C), `dec_add` (B)

### אנגלית G5 (book rating **B**, avg 87)

Priority pages: `grammar_past_simple` (B), `grammar_future_forms` (B), `grammar_modals` (B), `grammar_comparatives` (B), `grammar_quantifiers` (B), `sentence_narrative` (B), `sentence_advanced` (B), `translation_community` (B)

### אנגלית G6 (book rating **B**, avg 89)

Priority pages: `grammar_complex_tenses` (B), `grammar_conditionals` (B), `grammar_modals` (B), `sentence_advanced` (B), `translation_technology` (B), `translation_global` (B)

### חשבון G3 (book rating **B**, avg 93)

Priority pages: `mul_tens` (B), `mul_hundreds` (B), `eq_add` (B), `eq_sub` (B), `order_add_mul` (B), `order_mul_sub` (B), `divisibility` (B), `dec_sub` (B)

### גאומטריה G6 (book rating **B**, avg 94)

Priority pages: `sphere_volume` (B), `solids` (B), `parallelogram_area` (B)

### מדעים G2 (book rating **B**, avg 94)

Priority pages: `body` (B), `earth_space` (B), `environment` (B)

### עברית G4 (book rating **A**, avg 95)

Priority pages: `g4.present_text_based_choice` (C)

### מדעים G4 (book rating **B**, avg 95)

Priority pages: `earth_space` (B)

### מדעים G1 (book rating **B**, avg 96)

Priority pages: `plants` (B)

### גאומטריה G5 (book rating **B**, avg 96)

Priority pages: `triangle_area` (B), `parallelogram_area` (B), `diagonal_square` (B), `triangle_perimeter` (B)

### מדעים G5 (book rating **B**, avg 97)

Priority pages: `environment` (B)

### חשבון G4 (book rating **B**, avg 97)

Priority pages: `zero_sub` (B), `eq_add` (B), `eq_sub` (B), `fm_multiple` (B), `fm_gcd` (B), `wp_comparison_more` (B), `wp_leftover` (B), `prime_composite` (B)

### מדעים G6 (book rating **B**, avg 98)

Priority pages: `body` (B), `environment` (B)

---

## 9. Pages That Should Not Launch Before Improvement (44 C-rated)

All 44 pages rated **C**. Grouped by subject:

### אנגלית (26 pages)

- **`english:g1/vocab_emotions`** — רגשות באנגלית → **add examples** (Section 2 very thin (36 chars); Missing or weak simple example (§3))
- **`english:g2/vocab_actions`** — פעולות — פועל במשפט → **add examples** (Section 2 very thin (34 chars); Missing or weak simple example (§3))
- **`english:g2/vocab_house`** — בית — חדרים וחפצים → **add examples** (Section 3 very thin (24 chars); Missing or weak simple example (§3))
- **`english:g1/vocab_actions`** — פעולות באנגלית → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g1/vocab_school`** — בית ספר באנגלית → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/vocab_family`** — משפחה — מילים במשפט → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/vocab_animals`** — חיות — שמות ומשפטים → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/vocab_emotions`** — רגשות — במשפט → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/vocab_school`** — בית ספר — חפצים במשפט → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/vocab_food`** — מזון באנגלית → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/vocab_animals`** — חיות — במשפט מלא → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/vocab_food`** — מזון — I eat… → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/vocab_weather`** — מזג אוויר באנגלית → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g1/sentence_base`** — משפטים קצרים — בסיס → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/grammar_be`** — am / is / are — חיזוק → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/sentence_base`** — משפטים קצרים — כיתה ב׳ → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/sentence_routine`** — שגרת יום — משפטים → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/grammar_present_simple`** — Present Simple — חיובי, שלילי ושאלה → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/translation_routines`** — שגרה — תרגום מורחב → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g1/vocab_animals`** — חיות באנגלית → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/vocab_numbers`** — מספרים — עד 20 → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/grammar_plural_questions`** — ריבוי ושאלות פשוטות → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g2/translation_classroom`** — ביטויי כיתה — משפטים → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/vocab_actions`** — פעולות — Present Simple → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/vocab_body`** — גוף האדם באנגלית → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`english:g3/vocab_family`** — משפחה — פעולות במשפחה → **add examples** (Missing or weak simple example (§3); Missing self-check question (§5))

### חשבון (17 pages)

- **`math:g5/eq_mul`** — משוואת כפל → **add examples** (Section 3 very thin (22 chars); Missing or weak simple example (§3))
- **`math:g6/frac_as_division`** — שבר כחילוק → **add examples** (Section 3 very thin (18 chars); Missing or weak simple example (§3))
- **`math:g6/wp_unit_cm_to_m`** — המרת יחידות — ס״מ ומטר → **add examples** (Section 3 very thin (20 chars); Missing or weak simple example (§3))
- **`math:g6/eq_mul`** — משוואת כפל — מספר חסר → **add examples** (Section 3 very thin (20 chars); Missing or weak simple example (§3))
- **`math:g6/eq_div`** — משוואת חילוק — מספר חסר → **add examples** (Section 3 very thin (17 chars); Missing or weak simple example (§3))
- **`math:g6/dec_add`** — חיבור מספרים עשרוניים → **add examples** (Section 3 very thin (21 chars); Missing or weak simple example (§3))
- **`math:g6/dec_sub`** — חיסור מספרים עשרוניים → **add examples** (Section 3 very thin (22 chars); Missing or weak simple example (§3))
- **`math:g6/frac_multiply`** — כפל שברים → **add examples** (Section 3 very thin (18 chars); Missing or weak simple example (§3))
- **`math:g6/ratio_second`** — יחס בין שתי כמויות → **add examples** (Section 3 very thin (16 chars); Missing or weak simple example (§3))
- **`math:g5/wp_distance_time`** — מרחק, זמן ומהירות → **add examples** (Section 3 very thin (22 chars); Missing or weak simple example (§3))
- **`math:g6/wp_unit_g_to_kg`** — המרת יחידות — גרם וקילוגרם → **add examples** (Section 3 very thin (20 chars); Missing or weak simple example (§3))
- **`math:g5/frac_expand`** — הרחבת שבר → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`math:g5/mixed_to_frac`** — מספר מעורב לשבר → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`math:g5/est_mul`** — אומדן כפל → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`math:g5/wp_unit_cm_to_m`** — המרת יחידות — ס״מ ומטר → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`math:g5/wp_unit_g_to_kg`** — המרת יחידות — גרם וקילוגרם → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))
- **`math:g6/fm_multiple`** — כפולות של מספר → **add examples** (Missing or weak simple example (§3); Missing self-check question (§5))

### עברית (1 pages)

- **`hebrew:g4/g4.present_text_based_choice`** — הצגת רעיון מתוך טקסט → **add examples** (Missing or weak simple example (§3); Missing or weak guided example (§4))

### Qualitative D candidates (borderline C→D)

- Orphan `book_placeholder.md` files: Math G3–G6, Geometry G1–G6 (not in PAGE_ORDER — not user-visible)
- `english:g2/vocab_house` — §3 is 3 words; no sentence context
- `english:g1/vocab_emotions` — §2 is 36 chars; no emotional context or dialogue

---

## 10. Cross-Grade Generic Content Risk (Math + Geometry)

From `LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md` (2026-06-02), 22 topic families rated **NEEDS_POLISH** due to high structural similarity across grades. These pages often score A/B on template compliance but **feel generic** to children repeating the same strategy year after year:

| Family | Grades | Similarity | Action |
|--------|--------|------------|--------|
| add_three | g3–g6 | ~99% | Tighten grade-specific numbers/strategy |
| sequence | g3–g6 | ~92% | Add grade-appropriate complexity |
| add_two | g1–g6 | ~81% | Stronger upper-grade methods |
| eq_sub | g3–g6 | ~78% | Differentiate explanation depth |
| wp_comparison_more | g3–g6 | ~77% | Richer word-problem contexts |
| ns_place_hundreds | g3–g6 | ~76% | Scale magnitudes per grade |
| eq_add | g3–g6 | ~72% | Add grade-specific strategy notes |
| ns_complement10 | g1–g4 | ~63% | Update G4 magnitudes |
| fm_factor | g4–g6 | ~59% | G6 needs larger numbers |
| dec_sub | g3–g6 | ~59% | Scale decimal complexity |
| trapezoid_area | g5–g6 | ~59% | G6 magnitude depth |
| transformations | g1–g2 | ~25% | Add visual examples per grade |
| solids | g2–g6 | ~15% | Differentiate depth; avoid copy-paste |
| parallel_perpendicular | g3–g5 | ~15% | Add grade-specific applications |

---

## 11. Recommended 4-Week Improvement Plan

### Week 1 — English G1–G2 vocabulary rewrite (highest impact)
- Rewrite 15 C-rated vocabulary pages: add 2-sentence mini-scene, guided fill-in, self-check question with choices
- Target pages: `vocab_house`, `vocab_emotions`, `vocab_actions`, `vocab_family`, `vocab_school`, `vocab_food`, `vocab_animals`
- Template: word list → scene sentence → mini-dialogue (2 lines) → guided example → self-check

### Week 2 — English G3 + sentence/grammar foundations
- Rewrite 8 C-rated G3 vocab pages + `sentence_base`, `grammar_be`, `sentence_routine` across G1–G3
- Add mini-dialogue to every grammar page (Hello / I am pattern)

### Week 3 — Math G5–G6 enrichment
- Expand §3 worked examples on 17 C/B math pages (one-line → full step-by-step)
- Cross-grade polish: `add_three`, `sequence`, `eq_sub`, `eq_mul`, `eq_div` — unique G5/G6 numbers and strategy callouts
- Add real-life framing to `wp_unit_cm_to_m`, `wp_unit_g_to_kg`, `wp_distance_time`

### Week 4 — Science visual notes + Geometry polish + QA pass
- Science: add explicit observation step to 8 pages flagged for missing experiment hook
- Science G5 `experiments`: add graph/table structure in content
- Geometry G6 `sphere_volume`: add real-world anchor (ball, planet) + step diagram description
- Full re-audit of English G1–G3 + Math G5–G6; spot-check Hebrew/Moledet unchanged

---

## 12. Suggested First 3 Sample Pages to Rewrite (Next Phase)

Pick pages that are **representative**, **high-traffic**, and **fixable without design changes**:

1. **`english:g2/vocab_house`** — Worst-scoring page (score 38). Rewrite from word-list to home scene with bed/room/door in full sentences. Add 2-line dialogue and guided fill-in. Fix: add short text/dialogue + add guided example.

2. **`math:g6/add_three`** — Cross-grade generic family (99% similarity G3–G6). Rewrite with G6-specific magnitudes (100,000+), real shopping/receipt context, and a distinct strategy tip. Fix: add real-life context + rewrite explanation.

3. **`science:g5/experiments`** — Strong structure but metadata flags missing graph illustration; content is abstract without visual scaffold. Add simple table of journal entries + describe graph axes in §3. Fix: add table/diagram/visual structure + add mini experiment/observation.

---

## 13. Per-Page Section Evaluation Criteria (Reference)

For each page, evaluators checked:

1. **Subject fit** — Does §2–§6 match subject pedagogy?
2. **Grade fit** — Language depth, number magnitude, concept level
3. **Richness** — Simple example, guided example, mistake moment, self-check
4. **Child-facing tone** — engagement vs dry report language
5. **Real-life connection** — Everyday scenarios where appropriate
6. **Visual support** — Diagram/table needs (geometry, science, long lists)
7. **Launch readiness** — A/B/C/D rating
8. **Fix recommendation** — One primary action for C/D pages

---

## Appendix A — Full Page Inventory (602 pages)

| Subject | Grade | Page ID | Title | Rating | Primary fix | Key issues |
|---------|-------|---------|-------|--------|-------------|------------|
| english | g1 | grammar_be | I am / You are — היכרות | B | add examples | Missing or weak simple example (§3); English page lacks mini dialogue or sentence in context |
| english | g1 | sentence_base | משפטים קצרים — בסיס | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g1 | translation_classroom | ביטויי כיתה | B | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g1 | vocab_actions | פעולות באנגלית | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g1 | vocab_animals | חיות באנגלית | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g1 | vocab_colors | צבעים באנגלית | A | add examples | Missing or weak simple example (§3) |
| english | g1 | vocab_emotions | רגשות באנגלית | C | add examples | Section 2 very thin (36 chars); Missing or weak simple example (§3) |
| english | g1 | vocab_family | משפחה באנגלית | B | add examples | Missing or weak simple example (§3); Vocabulary list thin — needs more contextual sentences |
| english | g1 | vocab_numbers | מספרים 0–10 באנגלית | A | add examples | Missing or weak simple example (§3) |
| english | g1 | vocab_school | בית ספר באנגלית | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | grammar_be | am / is / are — חיזוק | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | grammar_plural_questions | ריבוי ושאלות פשוטות | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | sentence_base | משפטים קצרים — כיתה ב׳ | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | sentence_routine | שגרת יום — משפטים | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | translation_classroom | ביטויי כיתה — משפטים | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | translation_routines | שגרת יום — תרגום | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g2 | vocab_actions | פעולות — פועל במשפט | C | add examples | Section 2 very thin (34 chars); Missing or weak simple example (§3) |
| english | g2 | vocab_animals | חיות — שמות ומשפטים | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | vocab_colors | צבעים — שימוש במשפט | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g2 | vocab_emotions | רגשות — במשפט | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | vocab_family | משפחה — מילים במשפט | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | vocab_food | מזון באנגלית | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | vocab_house | בית — חדרים וחפצים | C | add examples | Section 3 very thin (24 chars); Missing or weak simple example (§3) |
| english | g2 | vocab_numbers | מספרים — עד 20 | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g2 | vocab_school | בית ספר — חפצים במשפט | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | grammar_articles_prepositions | a / an / the ו-in / on / under | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g3 | grammar_present_simple | Present Simple — חיובי, שלילי ושאלה | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | grammar_question_frames | שאלות — חיזוק כיתה ג׳ | A | — | — |
| english | g3 | sentence_descriptive | משפטים תיאוריים | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | sentence_routine | שגרת יום — משפטים מלאים | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | translation_hobbies | תחביבים — תרגום | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | translation_routines | שגרה — תרגום מורחב | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | vocab_actions | פעולות — Present Simple | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | vocab_animals | חיות — במשפט מלא | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | vocab_body | גוף האדם באנגלית | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | vocab_colors | צבעים — תיאור | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | vocab_emotions | רגשות — She feels… | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | vocab_family | משפחה — פעולות במשפחה | C | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | vocab_food | מזון — I eat… | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g3 | vocab_house | בית — חפצים ומיקום | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | vocab_numbers | מספרים — There are… | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | vocab_school | בית ספר — We learn… | A | add examples | Missing self-check question (§5) |
| english | g3 | vocab_sports | ספורט באנגלית | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g3 | vocab_weather | מזג אוויר באנגלית | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| english | g4 | grammar_present_simple | Present Simple — חיזוק | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | grammar_quantifiers | some/any, much/many, my, slowly | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | grammar_simple_continuous | Present Simple לעומת Continuous | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g4 | sentence_descriptive | תיאור — תאר + תואר פועל | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g4 | sentence_narrative | סיפור קצר — First… Then… | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g4 | sentence_routine | שגרה — every day | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g4 | translation_community | קהילה — תרגום | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g4 | translation_hobbies | תחביבים — תרגום עם Continuous | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | vocab_animals | חיות — פעולה עכשיו | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | vocab_body | גוף — פעולות יומיומיות | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | vocab_community | קהילה — park, town, library | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | vocab_emotions | רגשות — They feel… | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | vocab_environment | סביבה — trees, protect | A | add examples | Missing self-check question (§5) |
| english | g4 | vocab_family | משפחה — parents, work | A | add examples | Missing self-check question (§5) |
| english | g4 | vocab_food | מזון — healthy food | A | add examples | Missing self-check question (§5) |
| english | g4 | vocab_school | בית ספר — students, read | A | add examples | Missing self-check question (§5) |
| english | g4 | vocab_sports | ספורט — עכשיו במגרש | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g4 | vocab_travel | נסיעות — bus, travel | A | add examples | Missing self-check question (§5) |
| english | g4 | vocab_weather | מזג אוויר — היום | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| english | g5 | grammar_comparatives | Comparatives — bigger, more interesting | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | grammar_future_forms | Future — will / going to | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | grammar_modals | Modals — can, must, have to | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | grammar_past_simple | Past Simple — עבר פשוט | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | grammar_quantifiers | much/many — חיזוק כיתה ה׳ | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | sentence_advanced | משפטים מורחבים | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | sentence_narrative | סיפור — Then we arrived | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | translation_community | קהילה — תרגום מורחב | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | translation_global | עולם — תרגום | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | translation_technology | טכנולוגיה — תרגום | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g5 | vocab_animals | חיות — Past Simple | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_community | קהילה — visited, museum | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_emotions | רגשות — felt proud | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_environment | סביבה — planted trees | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_family | משפחה — grandparents | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_food | מזון — cooked healthy food | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_health | בריאות באנגלית | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_school | בית ספר — class project | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_sports | ספורט — scored a goal | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_technology | טכנולוגיה באנגלית | A | add examples | Missing self-check question (§5) |
| english | g5 | vocab_travel | נסיעות — will travel | A | add examples | Missing self-check question (§5) |
| english | g6 | grammar_comparatives | Superlatives — the most interesting | A | add short text/dialogue | English page lacks mini dialogue or sentence in context |
| english | g6 | grammar_complex_tenses | Past Continuous + Past Simple + היכרות P | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g6 | grammar_conditionals | Conditionals — type 0 ו-1 | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g6 | grammar_modals | should / might / could | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g6 | sentence_advanced | משפטים מורכבים — While… was… | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g6 | translation_global | עולם — תרגום עם תנאי | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g6 | translation_technology | טכנולוגיה — תרגום מתקדם | B | add examples | Missing self-check question (§5); English page lacks mini dialogue or sentence in context |
| english | g6 | vocab_animals | חיות — Past Continuous | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_community | קהילה — festival, celebrate | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_culture | תרבות באנגלית | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_emotions | רגשות — might feel | A | — | — |
| english | g6 | vocab_environment | סביבה — climate, protect | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_global_issues | סוגיות גלובליות | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_health | בריאות — should rest | A | — | — |
| english | g6 | vocab_history | היסטוריה באנגלית | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_technology | טכנולוגיה — if / could | A | add examples | Missing self-check question (§5) |
| english | g6 | vocab_travel | נסיעות — Present Perfect intro | A | add examples | Missing self-check question (§5) |
| geography | g5 | mg_g5_climate | אקלים ישראל | A | — | — |
| geography | g5 | mg_g5_coordinates | קואורדינטות במפה | A | — | — |
| geography | g5 | mg_g5_government_institutions | מוסדות שלטון | A | — | — |
| geography | g5 | mg_g5_identity | זהות אישית וקהילתית | A | — | — |
| geography | g5 | mg_g5_law_society | חוק וכללי חברה | A | — | — |
| geography | g5 | mg_g5_natural_hazards | סכנות טבע | A | — | — |
| geography | g5 | mg_g5_resources | משאבים וניהולם | A | — | — |
| geography | g6 | mg_g6_democracy | דמוקרטיה בישראל | A | — | — |
| geography | g6 | mg_g6_environment_quality | איכות הסביבה | A | — | — |
| geography | g6 | mg_g6_human_environment | יחסי אדם–סביבה | A | — | — |
| geography | g6 | mg_g6_natural_phenomena | תופעות טבע | A | — | — |
| geography | g6 | mg_g6_population | מגוון האוכלוסייה בישראל | A | — | — |
| geography | g6 | mg_g6_social_involvement | קבלת החלטות ומעורבות חברתית | A | — | — |
| geography | g6 | mg_g6_state_institutions | מוסדות המדינה | A | — | — |
| geography | g6 | mg_g6_values | ערכי המדינה | A | — | — |
| geometry | g1 | shapes_basic_rectangle | הכרת המלבן | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g1 | shapes_basic_square | הכרת הריבוע | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g1 | transformations | הזזה ושיקוף — היכרות | A | — | — |
| geometry | g2 | solids | גופים תלת־ממדיים — שמות והיכרות | A | add examples | Missing self-check question (§5) |
| geometry | g2 | square_area | שטח של ריבוע | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g2 | transformations | הזזה ושיקוף — המשך | A | — | — |
| geometry | g3 | parallel_perpendicular | מקבילות ומאונכות | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g3 | quadrilaterals | סוגי מרובעים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| geometry | g3 | rotation | סיבוב במישור | A | — | — |
| geometry | g3 | solids | גופים — פאות, קדקודים ומקצועות | A | — | — |
| geometry | g3 | square_area | שטח ריבוע — כיתה ג׳ | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g3 | square_perimeter | היקף ריבוע | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g3 | triangle_angles | זוויות במשולש | B | add real-life context | Limited spatial/real-world anchoring; Long bullet list in §2 — may need table/visual structure |
| geometry | g3 | triangle_perimeter | היקף משולש | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g3 | triangles | סוגי משולשים | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g4 | diagonal_rectangle | אלכסון במלבן | A | — | — |
| geometry | g4 | diagonal_square | אלכסון בריבוע | A | — | — |
| geometry | g4 | parallel_perpendicular | מקבילות ומאונכות — במצולעים | B | add real-life context | Limited spatial/real-world anchoring; Long bullet list in §2 — may need table/visual structure |
| geometry | g4 | quadrilaterals | מרובעים — תכונות וסיווג | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| geometry | g4 | rectangular_prism_volume | נפח תיבה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| geometry | g4 | shapes_basic_properties_angles | זוויות ישרות במרובע | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g4 | shapes_basic_properties_rectangle | תכונות המלבן — זוגות צלעות | A | — | — |
| geometry | g4 | shapes_basic_properties_square | תכונות הריבוע — צלעות | A | — | — |
| geometry | g4 | solids | גופים — פאות במישור | A | — | — |
| geometry | g4 | square_area | שטח ריבוע — כיתה ד׳ | A | add examples | Missing or weak simple example (§3) |
| geometry | g4 | square_perimeter | היקף ריבוע — כיתה ד׳ | A | — | — |
| geometry | g4 | symmetry | סימטרייה במישור | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g4 | triangle_angles | זוויות במשולש — כיתה ד׳ | A | — | — |
| geometry | g4 | triangle_perimeter | היקף משולש — כיתה ד׳ | A | add examples | Missing or weak simple example (§3) |
| geometry | g5 | diagonal_parallelogram | אלכסון במקבילית | A | — | — |
| geometry | g5 | diagonal_rectangle | אלכסון במלבן | A | add examples | Missing or weak simple example (§3) |
| geometry | g5 | diagonal_square | אלכסון בריבוע | B | add examples | Missing or weak simple example (§3); Limited spatial/real-world anchoring |
| geometry | g5 | heights_parallelogram | גובה במקבילית | A | add examples | Missing or weak simple example (§3) |
| geometry | g5 | heights_trapezoid | גובה בטרפז | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g5 | heights_triangle | גובה במשולש | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g5 | parallel_perpendicular | קווים מקבילים ומאונכים | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g5 | parallelogram_area | שטח מקבילית | B | add examples | Missing or weak simple example (§3); Limited spatial/real-world anchoring |
| geometry | g5 | quadrilaterals | סיווג מרובעים — כיתה ה׳ | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| geometry | g5 | rectangular_prism_volume | נפח תיבה | A | — | — |
| geometry | g5 | solids | גופים תלת-ממדיים — חזרה | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g5 | square_area | שטח ריבוע | A | add examples | Missing self-check question (§5) |
| geometry | g5 | square_perimeter | היקף ריבוע | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| geometry | g5 | tiling | ריצוף במישור | A | — | — |
| geometry | g5 | trapezoid_area | שטח טרפז | A | — | — |
| geometry | g5 | triangle_angles | זוויות במשולש | A | add real-life context | Limited spatial/real-world anchoring |
| geometry | g5 | triangle_area | שטח משולש | B | add examples | Missing or weak simple example (§3); Limited spatial/real-world anchoring |
| geometry | g5 | triangle_perimeter | היקף משולש | B | add real-life context | Limited spatial/real-world anchoring; Long bullet list in §2 — may need table/visual structure |
| geometry | g6 | circle_area | שטח עיגול | A | add examples | Missing or weak simple example (§3) |
| geometry | g6 | circle_perimeter | היקף מעגל | A | add examples | Missing or weak simple example (§3) |
| geometry | g6 | cone_volume | נפח חרוט | A | add table/diagram/visual structure | Geometry concept page lacks diagram/visual aid |
| geometry | g6 | cylinder_volume | נפח גליל | A | add table/diagram/visual structure | Geometry concept page lacks diagram/visual aid |
| geometry | g6 | parallelogram_area | שטח מקבילית — כיתה ו׳ | B | add real-life context | Limited spatial/real-world anchoring; Long bullet list in §2 — may need table/visual structure |
| geometry | g6 | prism_volume_rectangular | נפח מנסרה — בסיס מלבן | A | — | — |
| geometry | g6 | prism_volume_triangle | נפח מנסרה — בסיס משולש | A | add table/diagram/visual structure | Geometry concept page lacks diagram/visual aid |
| geometry | g6 | pyramid_volume_rectangular | נפח פירמידה — בסיס מלבן | A | add table/diagram/visual structure | Geometry concept page lacks diagram/visual aid |
| geometry | g6 | pyramid_volume_square | נפח פירמידה — בסיס ריבוע | A | add table/diagram/visual structure | Geometry concept page lacks diagram/visual aid |
| geometry | g6 | pythagoras_hyp | משפט פיתגורס — מציאת יתר | A | — | — |
| geometry | g6 | pythagoras_leg | משפט פיתגורס — מציאת ניצב | A | — | — |
| geometry | g6 | rectangular_prism_volume | נפח תיבה — כיתה ו׳ | A | — | — |
| geometry | g6 | solids | גופים — גליל, פירמידה, חרוט, כדור | B | add table/diagram/visual structure | Geometry concept page lacks diagram/visual aid; Limited spatial/real-world anchoring |
| geometry | g6 | sphere_volume | נפח כדור | B | add table/diagram/visual structure | Section 2 very thin (34 chars); Geometry concept page lacks diagram/visual aid |
| geometry | g6 | square_area | שטח ריבוע — כיתה ו׳ | A | add examples | Missing self-check question (§5) |
| geometry | g6 | square_perimeter | היקף ריבוע — כיתה ו׳ | A | — | — |
| geometry | g6 | trapezoid_area | שטח טרפז — כיתה ו׳ | A | — | — |
| geometry | g6 | triangle_angles | זוויות במשולש — כיתה ו׳ | A | add examples | Missing self-check question (§5) |
| geometry | g6 | triangle_perimeter | היקף משולש — כיתה ו׳ | A | — | — |
| hebrew | g1 | comprehension_binary_fact_early_g1_tf_science_simple | נכון או לא נכון | A | add examples | Missing or weak simple example (§3) |
| hebrew | g1 | comprehension_g1.word_meaning_concrete | משמעות מילה בטקסט | A | add examples | Missing or weak simple example (§3) |
| hebrew | g1 | g1.basic_niqqud | ניקוד בסיסי | A | — | — |
| hebrew | g1 | g1.copy_word | העתקת מילה | A | — | — |
| hebrew | g1 | g1.final_letters | אותיות סופיות | A | — | — |
| hebrew | g1 | g1.grammar_agreement_light | התאמה קלה | A | — | — |
| hebrew | g1 | g1.grammar_cloze_deixis | זה, כאן, שם | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | g1.grammar_connectors_time | מילות זמן פשוטות | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | g1.grammar_odd_category | מה לא שייך? | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | g1.grammar_pos_roles | שם, פועל ותיאור — בקטנה | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | g1.grammar_punctuation | סימני פיסוק בסיסיים | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | g1.grammar_wellformed | משפט שלם | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | g1.grammar_word_order | סדר מילים במשפט | B | add examples | Missing or weak simple example (§3); Grammar page explanation may be too brief |
| hebrew | g1 | g1.letters | אותיות האלף־בית | A | add short text/dialogue | Hebrew page lacks reading passage or comprehension element |
| hebrew | g1 | g1.one_sentence_who_what | מי? מה? במשפט אחד | A | add examples | Missing or weak simple example (§3) |
| hebrew | g1 | g1.open_close_syllable | הברה פתוחה וסגורה | A | — | — |
| hebrew | g1 | g1.phoneme_awareness | צלילים בשפה | A | — | — |
| hebrew | g1 | g1.phrase_appropriateness | ביטוי מתאים | B | add examples | Missing or weak simple example (§3); Hebrew page lacks reading passage or comprehension element |
| hebrew | g1 | g1.rhyme | חרוזים | A | — | — |
| hebrew | g1 | g1.simple_instruction | הוראה פשוטה | A | add examples | Missing or weak simple example (§3) |
| hebrew | g1 | g1.simple_words_read | קריאת מילים פשוטות | A | — | — |
| hebrew | g1 | g1.sound_letter_match | צליל ואות | A | — | — |
| hebrew | g1 | g1.spell_word_choice | בחירת איות | A | add examples | Missing or weak simple example (§3) |
| hebrew | g1 | g1.syllables | הברות | A | — | — |
| hebrew | g1 | g1.word_picture | מילה ותמונה | A | — | — |
| hebrew | g1 | grammar_gender_number_early_g1_agreement_girl_singular | ילדה אחת — התאמה | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g1 | reading_word_level_early_g1_spelling_meaning_then_choice | מילה — משמעות וקריאה | A | — | — |
| hebrew | g1 | speaking_social_reply_early_g1_bump_sorry | סליחה כשנתקלים | A | add examples | Missing or weak simple example (§3) |
| hebrew | g1 | vocabulary_g1.word_meaning_concrete | מילה ומשמעות | A | — | — |
| hebrew | g1 | vocabulary_word_context_early_g1_cloze_morning | מילה בבוקר | A | — | — |
| hebrew | g1 | writing_spell_word_early_ab_writing_object_riddle | חידת מילה — חפץ | A | — | — |
| hebrew | g1 | writing_spell_word_early_ab_writing_role_meaning | מה תפקיד המילה? | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | agreement_boy_plural | התאמה — ילדים רצים | A | add examples | Missing self-check question (§5) |
| hebrew | g2 | cloze_school | מילה חסרה — בית ספר | A | — | — |
| hebrew | g2 | g2.context_clue_easy | רמז מההקשר | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | g2.describe_prompt_choice | תיאור קצר | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | g2.detail_main_idea | רעיון מרכזי ופרטים | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | g2.fluent_words | קריאת מילים בשטף | A | — | — |
| hebrew | g2 | g2.light_inference | הסקה קלה מטקסט | A | — | — |
| hebrew | g2 | g2.number_gender_light | זכר, נקבה, יחיד ורבים | A | — | — |
| hebrew | g2 | g2.pos_basic | שם עצם, פועל ותואר | A | — | — |
| hebrew | g2 | g2.punctuation_choice | סימני פיסוק בכתיבה | A | — | — |
| hebrew | g2 | g2.sentence_wellformed | משפט תקין | A | add examples | Missing self-check question (§5) |
| hebrew | g2 | g2.short_paragraph_choice | פסקה קצרה — שלושה משפטים | A | add examples | Missing self-check question (§5) |
| hebrew | g2 | g2.short_sentence | קריאת משפט קצר | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | g2.simple_punctuation_read | סימני פיסוק בקריאה | A | — | — |
| hebrew | g2 | g2.simple_sequence | רצף פשוט — קודם ואחר כך | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | g2.simple_tense | זמן פשוט — עבר, הווה ועתיד | A | — | — |
| hebrew | g2 | g2.situation_register | דיבור מתאים למצב | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | g2.synonyms_basic | מילים נרדפות | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | object_riddle | חידת מילה — חפץ (כיתה ב׳) | A | — | — |
| hebrew | g2 | role_meaning | תפקיד המילה — מה היא עושה במשפט? | A | — | — |
| hebrew | g2 | spelling_choice_niqqud | בחירת איות נכון | A | — | — |
| hebrew | g2 | thanks_response | תודה — איך עונים? | A | add examples | Missing or weak simple example (§3) |
| hebrew | g2 | where_from_sentence | מאיפה יודעים? — מהמשפט | A | — | — |
| hebrew | g3 | comprehension_analogy_reasoning_parallel | דומה כמו... | A | — | — |
| hebrew | g3 | comprehension_binary_fact_mid_grammar_tf | נכון לפי הטקסט? | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g3 | comprehension_cause_effect_because | למה? — כי ובגלל | A | — | — |
| hebrew | g3 | comprehension_completion_context_clue | השלמת משפט לפי הקשר | A | — | — |
| hebrew | g3 | comprehension_passage_explicit_detail | פרטים בטקסט | A | — | — |
| hebrew | g3 | comprehension_passage_inference_implied | מה משתמע מהטקסט? | A | — | — |
| hebrew | g3 | g3.binyan_light | משפחת פעלים — היכרות קלה | A | — | — |
| hebrew | g3 | g3.cause_effect | סיבה ותוצאה — היכרות | A | — | — |
| hebrew | g3 | g3.compare_light | השוואה קלה | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | g3.connector_use_choice | מחברים משפטים בכתיבה | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | g3.connectors | מילות קישור | A | — | — |
| hebrew | g3 | g3.context_meaning | משמעות לפי ההקשר | A | — | — |
| hebrew | g3 | g3.discussion_prompt_choice | שיח בכיתה | A | — | — |
| hebrew | g3 | g3.explicit_only | רק מה שכתוב בטקסט | A | — | — |
| hebrew | g3 | g3.genre_tag_info_vs_story | מידע או סיפור? | A | — | — |
| hebrew | g3 | g3.multi_sentence | קריאה של כמה משפטים | A | — | — |
| hebrew | g3 | g3.tense_system_intro | עבר, הווה ועתיד — היכרות | A | — | — |
| hebrew | g3 | g3.two_three_sentences_structure | כותבים שני–שלושה משפטים | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | g3.word_families | משפחות מילים | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | grammar_gender_number_plural | רבים ורבות | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g3 | grammar_morphology_binyan_fit | איזו צורת פועל מתאימה? | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g3 | grammar_part_of_speech_verb_noun | שם או פועל? | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g3 | grammar_prep_choice_collocation | מילת יחס מתאימה | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g3 | reading_sentence_read_meaning | משפט שלם — מה המשמעות? | A | — | — |
| hebrew | g3 | speaking_social_reply_mid_help_request | בקשת עזרה בנימוס | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | vocabulary_antonym_opposite | מילים מנוגדות | A | — | — |
| hebrew | g3 | vocabulary_precision_best_word | המילה הכי מתאימה | A | — | — |
| hebrew | g3 | vocabulary_semantic_field_education_lexicon | מילים מעולם הבית ספר | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | vocabulary_synonym_near_meaning | מילים דומות במשמעות | A | — | — |
| hebrew | g3 | writing_logic_completion_conclusion | סיום הגיוני | A | add examples | Missing or weak simple example (§3) |
| hebrew | g3 | writing_structured_completion_polite_phrase | ביטוי מנומס בכתיבה | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | because | סיבה ותוצאה — כי (כיתה ד׳) | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | best_word | המילה המדויקת ביותר (כיתה ד׳) | A | add guided example | Missing or weak guided example (§4) |
| hebrew | g4 | binyan_fit | בחירת פועל מתאים (כיתה ד׳) | A | add guided example | Missing or weak guided example (§4) |
| hebrew | g4 | collocation | מילים שיוצאות יחד (כיתה ד׳) | A | — | — |
| hebrew | g4 | conclusion | סיום ומסקנה (כיתה ד׳) | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | context_clue | השלמה לפי הקשר (כיתה ד׳) | A | — | — |
| hebrew | g4 | detail | פרט מתוך הטקסט (כיתה ד׳) | A | — | — |
| hebrew | g4 | education_lexicon | מילים מעולם הלימוד (כיתה ד׳) | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | g4.dictation_spot_error | זיהוי שגיאת כתיב והכתבה | A | — | — |
| hebrew | g4 | g4.genre_appropriate_language | שפה מתאימה לסוגה | A | — | — |
| hebrew | g4 | g4.genre_mix | סוגות שונות — סיפור ומידע | A | — | — |
| hebrew | g4 | g4.idiom_light | מילים וביטויים | A | — | — |
| hebrew | g4 | g4.info_lit_intro | אוריינות מידע — מקור אמין | A | — | — |
| hebrew | g4 | g4.intro_body_conclusion_choice | פתיחה, גוף וסיום | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | g4.literary_lexicon_light | אוצר מילים ספרותי קל | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | g4.present_text_based_choice | הצגת רעיון מתוך טקסט | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| hebrew | g4 | g4.root_pattern_intro | שורש ותבנית — היכרות | A | — | — |
| hebrew | g4 | g4.summary_intro | סיכום בסיסי | A | — | — |
| hebrew | g4 | g4.text_structure | מבנה טקסט — פתיחה, גוף וסיום | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | implied | מה משתמע מהטקסט? (כיתה ד׳) | A | — | — |
| hebrew | g4 | meaning | קריאת משפט — משמעות (כיתה ד׳) | A | — | — |
| hebrew | g4 | near_meaning | מילים קרובות במשמעות (כיתה ד׳) | A | add examples | Missing or weak simple example (§3) |
| hebrew | g4 | opposite | מילים הפוכות (כיתה ד׳) | A | — | — |
| hebrew | g4 | parallel | השוואה ודמיון (כיתה ד׳) | A | — | — |
| hebrew | g4 | plural | יחיד ורבים — התאמה (כיתה ד׳) | A | — | — |
| hebrew | g4 | polite_phrase | ניסוח מנומס (כיתה ד׳) | A | — | — |
| hebrew | g4 | request | בקשת עזרה — ניסוח (כיתה ד׳) | A | — | — |
| hebrew | g4 | tf | נכון או לא — לפי הטקסט (כיתה ד׳) | A | — | — |
| hebrew | g4 | verb_noun | פועל ושם עצם — הבחנה (כיתה ד׳) | A | add examples | Missing or weak simple example (§3) |
| hebrew | g5 | comprehension_compare_statements_contrast | השוואה בין קביעות | A | add examples | Missing or weak simple example (§3) |
| hebrew | g5 | comprehension_implicit_tone_attitude | נימה ויחס | A | — | — |
| hebrew | g5 | comprehension_main_idea_summary | רעיון מרכזי | A | — | — |
| hebrew | g5 | comprehension_reference_pronoun | כינוי גוף — למי זה מתייחס? | A | — | — |
| hebrew | g5 | comprehension_sequence_order | סדר אירועים | A | — | — |
| hebrew | g5 | comprehension_supporting_detail_evidence | פרטים תומכים | A | — | — |
| hebrew | g5 | g5.academic_starter_words | מילים לכתיבה ולטקסט | A | add examples | Missing or weak simple example (§3) |
| hebrew | g5 | g5.argument_scaffold_choice | בניית טיעון | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| hebrew | g5 | g5.full_composition_scaffold_choice | כתיבת חיבור מלא | A | add examples | Missing or weak simple example (§3) |
| hebrew | g5 | g5.genre_variety | סוגות כתיבה | A | — | — |
| hebrew | g5 | g5.inference | הסקה מהטקסט | A | — | — |
| hebrew | g5 | g5.multi_layer_read | קריאה בשכבות | A | — | — |
| hebrew | g5 | g5.multiple_perspectives_light | נקודות מבט שונות | A | — | — |
| hebrew | g5 | g5.position_in_text | מיקום בטקסט | A | — | — |
| hebrew | g5 | g5.semantic_fields | שדות מילים | A | — | — |
| hebrew | g5 | g5.syntax_agreement | התאמה תחבירית | A | — | — |
| hebrew | g5 | g5.verb_patterns | תבניות פועל | A | — | — |
| hebrew | g5 | grammar_binary_grammar_tf | נכון או לא נכון — דקדוק | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g5 | grammar_sentence_correction_choose_correct | איזה משפט נכון? | A | — | — |
| hebrew | g5 | grammar_sentence_correction_sv_agreement_plural | תיקון: נושא ופועל ברבים | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g5 | grammar_tense_shift_past_present | עבר והווה — מעבר נכון | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g5 | grammar_transform_negation | הפיכה לשלילה | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g5 | grammar_verb_agreement_plural_subject | נושא ברבים — איזה פועל? | B | add examples | Missing or weak simple example (§3); Grammar page explanation may be too brief |
| hebrew | g5 | reading_structural_paragraph_role | תפקיד הפסקה | A | — | — |
| hebrew | g5 | vocabulary_category_exclusion_odd_out | מה לא שייך לקבוצה? | A | — | — |
| hebrew | g5 | vocabulary_collocation_verb_noun_fit | צירוף נכון | A | add examples | Missing or weak simple example (§3) |
| hebrew | g5 | vocabulary_context_fit_register | מילה מתאימה למצב | A | add examples | Missing or weak simple example (§3) |
| hebrew | g5 | writing_rephrase_clarity | ניסוח ברור יותר | A | — | — |
| hebrew | g6 | attitude | גישה וטון (כיתה ו׳) | A | — | — |
| hebrew | g6 | choose_correct | בחירת משפט מתוקן (כיתה ו׳) | A | — | — |
| hebrew | g6 | contrast | השוואה והנגדה (כיתה ו׳) | A | — | — |
| hebrew | g6 | g6.academic_vocab | אוצר מילים אקדמי | A | — | — |
| hebrew | g6 | g6.argumentative_full_scaffold | כתיבה טיעונית מלאה | A | add examples | Missing self-check question (§5) |
| hebrew | g6 | g6.compare_genres | השוואת סוגות | A | — | — |
| hebrew | g6 | g6.complex_syntax_spot | תחביר מורכב — זיהוי | A | — | — |
| hebrew | g6 | g6.complex_text_analysis | ניתוח טקסט מורכב | A | — | — |
| hebrew | g6 | g6.critical_evaluation_light | הערכה ביקורתית קלה | A | — | — |
| hebrew | g6 | g6.debate_scaffold_choice | דיבייט — הצגת עמדה | A | — | — |
| hebrew | g6 | g6.discipline_words_light | מילים מקצועיות קלות | A | — | — |
| hebrew | g6 | g6.evidence_from_text | הבאת ראיה מהטקסט | A | — | — |
| hebrew | g6 | g6.possession_prep | שייכות ומילות יחס | A | — | — |
| hebrew | g6 | g6.research_literacy_choice | אוריינות מחקרית — מקורות | A | — | — |
| hebrew | g6 | g6.subject_verb_advanced | התאמת נושא ונשוא — מתקדם | A | — | — |
| hebrew | g6 | grammar_tf | נכון או לא — דקדוק (כיתה ו׳) | A | add sentence examples | Grammar page explanation may be too brief |
| hebrew | g6 | main_summary | רעיון מרכזי וסיכום (כיתה ו׳) | A | — | — |
| hebrew | g6 | negation | שלילה במשפט (כיתה ו׳) | A | — | — |
| hebrew | g6 | odd_out | מי שונה בקבוצה? (כיתה ו׳) | A | — | — |
| hebrew | g6 | order | סדר אירועים (כיתה ו׳) | A | — | — |
| hebrew | g6 | paragraph_role | תפקיד הפסקה (כיתה ו׳) | A | — | — |
| hebrew | g6 | past_present | מעבר בין עבר להווה (כיתה ו׳) | A | — | — |
| hebrew | g6 | plural_subject | נושא ברבים ופועל (כיתה ו׳) | A | — | — |
| hebrew | g6 | pronoun | למי מתייחסים? — כינוי (כיתה ו׳) | A | — | — |
| hebrew | g6 | register | רישום ושפה מתאימה (כיתה ו׳) | A | — | — |
| hebrew | g6 | rephrase | ניסוח מחדש לבהירות (כיתה ו׳) | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| hebrew | g6 | supporting_evidence | פרטים כראיה (כיתה ו׳) | A | — | — |
| hebrew | g6 | sv_agreement_plural | התאמת נושא–נשוא ברבים (כיתה ו׳) | A | — | — |
| hebrew | g6 | verb_noun_fit | פועל ושם — צירוף נכון (כיתה ו׳) | A | add examples | Missing or weak simple example (§3) |
| math | g1 | add_second_decade | חיבור בעשרייה השנייה — מספרים בין 11 ל־1 | A | — | — |
| math | g1 | add_tens_only | חיבור עשרות שלמות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g1 | add_two | חיבור של שני מספרים | A | — | — |
| math | g1 | cmp | השוואת מספרים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g1 | eq_add_simple | חיבור עם מספר חסר | A | — | — |
| math | g1 | eq_sub_simple | חיסור עם מספר חסר | A | — | — |
| math | g1 | mul | כפל — חיבור חוזר | B | add examples | Missing self-check question (§5); Long bullet list in §2 — may need table/visual structure |
| math | g1 | ns_complement10 | זוגות שמרכיבים 10 | A | — | — |
| math | g1 | ns_counting_backward | ספירה לאחור על ציר המספרים | A | — | — |
| math | g1 | ns_counting_forward | ספירה קדימה על ציר המספרים | A | — | — |
| math | g1 | ns_even_odd | זוגי ואי-זוגי | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g1 | ns_neighbors | שכנים של מספר | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g1 | ns_number_line | ציר המספרים | A | — | — |
| math | g1 | ns_place_tens_units | עשרות ואחדות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g1 | sub_two | חיסור של שני מספרים | A | — | — |
| math | g1 | wp_coins | שאלות מילוליות — ערך מטבעות | A | — | — |
| math | g1 | wp_coins_spent | שאלות מילוליות — כמה נשאר? | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g1 | wp_time_date | שאלות מילוליות — ימי השבוע | A | — | — |
| math | g1 | wp_time_days | שאלות מילוליות — כמה ימים בין יום ליום | A | — | — |
| math | g2 | add_two | חיבור של שני מספרים — עד 100 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | add_vertical | חיבור במאונך | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | cmp | השוואת מספרים עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | div | חילוק — חלוקה שווה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | divisibility | מתי מספר מתחלק ב־2, ב־5 וב־10? | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | frac_half | חצי מהשלם | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | frac_half_reverse | מציאת השלם כשיש חצי | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | frac_quarter | רבע מהשלם | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | frac_quarter_reverse | מציאת השלם כשיש רבע | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | mul | לוח הכפל — קבוצות שוות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | ns_complement10 | זוגות שמרכיבים 10 — עזר לחיבור | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | ns_even_odd | זוגי ואי-זוגי — חזרה ותרגול | A | — | — |
| math | g2 | ns_neighbors | שכנים של מספר — מספרים גדולים יותר | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | ns_place_tens_units | מאות, עשרות ואחדות — עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | sub_two | חיסור של שני מספרים — עד 100 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | sub_vertical | חיסור במאונך | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | wp_coins | שאלות מילוליות — מטבעות | A | — | — |
| math | g2 | wp_coins_spent | שאלות מילוליות — קניות ועודף | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | wp_division_simple | שאלות מילוליות — חלוקה שווה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | wp_groups_g2 | שאלות מילוליות — קבוצות שוות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g2 | wp_time_date | שאלות מילוליות — ימי השבוע | A | — | — |
| math | g2 | wp_time_days | שאלות מילוליות — כמה ימים בין יום ליום | A | add real-life context | Word-problem page lacks real-life framing |
| math | g3 | add_three | חיבור שלושה מספרים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | add_two | חיבור שני מספרים — עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | cmp | השוואת מספרים עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | dec_add | חיבור עשרוניים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | dec_sub | חיסור עשרוניים | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| math | g3 | div | חילוק — חלוקה שווה | B | add examples | Missing self-check question (§5); Long bullet list in §2 — may need table/visual structure |
| math | g3 | div_with_remainder | חילוק עם שארית | A | — | — |
| math | g3 | divisibility | התחלקות ב-2, ב-5 וב-10 | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| math | g3 | eq_add | משוואת חיבור — מספר חסר | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g3 | eq_sub | משוואת חיסור — מספר חסר | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g3 | mul | כפל — לוח הכפל | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | mul_hundreds | כפל במאות | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g3 | mul_tens | כפל בעשרות | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g3 | ns_complement10 | זוגות שמרכיבים 10 — חזרה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | ns_complement100 | זוגות שמרכיבים 100 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | ns_even_odd | זוגי ואי-זוגי — מספרים גדולים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | ns_neighbors | שכנים של מספר — עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | ns_place_hundreds | מאות, עשרות ואחדות — עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | order_add_mul | סדר פעולות — חיבור וכפל | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g3 | order_mul_sub | סדר פעולות — כפל וחיסור | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g3 | order_parentheses | סוגריים בחישוב | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| math | g3 | sequence | סדרות מספרים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | sub_two | חיסור שני מספרים — עד 1,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g3 | wp_comparison_more | שאלה מילולית — כמה יותר? | B | add real-life context | Word-problem page lacks real-life framing; Long bullet list in §2 — may need table/visual structure |
| math | g3 | wp_leftover | שאלה מילולית — מה נשאר? | A | add real-life context | Word-problem page lacks real-life framing |
| math | g3 | wp_time_sum | שאלה מילולית — סכום זמנים | A | — | — |
| math | g4 | add_three | חיבור שלושה מספרים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | add_two | חיבור שני מספרים — עד 10,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | cmp | השוואת מספרים גדולים | A | — | — |
| math | g4 | dec_add | חיבור עשרוניים — שתי ספרות אחרי הנקודה | B | simplify for age level | Numbers may be too small for g4 (max 77); Long bullet list in §2 — may need table/visual structure |
| math | g4 | dec_sub | חיסור עשרוניים — שתי ספרות אחרי הנקודה | B | simplify for age level | Numbers may be too small for g4 (max 80); Long bullet list in §2 — may need table/visual structure |
| math | g4 | div | חילוק — חלוקה שווה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | div_long | חילוק ארוך | A | — | — |
| math | g4 | div_with_remainder | חילוק עם שארית | A | simplify for age level | Numbers may be too small for g4 (max 65) |
| math | g4 | divisibility | התחלקות — כללי 2, 3, 5, 6, 9 ו-10 | A | — | — |
| math | g4 | eq_add | משוואת חיבור — מספר חסר (מאות) | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| math | g4 | eq_sub | משוואת חיסור — מספר חסר (מאות) | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| math | g4 | est_add | הערכת תוצאה — חיבור | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | est_mul | הערכת תוצאה — כפל | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | est_quantity | הערכת כמות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | fm_factor | גורמים של מספר | B | simplify for age level | Numbers may be too small for g4 (max 30); Long bullet list in §2 — may need table/visual structure |
| math | g4 | fm_gcd | המחלק המשותף הגדול ביותר (מ.א.ח) | B | add examples | Missing self-check question (§5); Numbers may be too small for g4 (max 25) |
| math | g4 | fm_multiple | כפולות של מספר | B | add examples | Missing self-check question (§5); Numbers may be too small for g4 (max 35) |
| math | g4 | mul | כפל — לוח הכפל ואסטרטגיות | A | simplify for age level | Numbers may be too small for g4 (max 96) |
| math | g4 | mul_vertical | כפל במאונך | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | ns_complement10 | זוגות ל-10 — חזרה | A | simplify for age level | Numbers may be too small for g4 (max 75) |
| math | g4 | ns_complement100 | השלמה ל-100 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | ns_even_odd | זוגי/אי-זוגי — מספרים גדולים | A | — | — |
| math | g4 | ns_neighbors | שכנים — מספרים גדולים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | ns_place_hundreds | ערך המקום — אלפים ועד 10,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | one_mul | כפל ב-1 | A | add examples | Missing self-check question (§5) |
| math | g4 | power_base | חזקה — בסיס ומעריך | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | power_calc | חזקה — חישוב | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | prime_composite | מספרים ראשוניים ופריקים | B | simplify for age level | Numbers may be too small for g4 (max 29); Long bullet list in §2 — may need table/visual structure |
| math | g4 | round | עיגול לעשרות/מאות/אלפים | A | add examples | Missing self-check question (§5) |
| math | g4 | sequence | סדרות — קפיצות גדולות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | sub_two | חיסור שני מספרים — עד 10,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g4 | wp_comparison_more | שאלה מילולית — כמה יותר? | B | add real-life context | Word-problem page lacks real-life framing; Long bullet list in §2 — may need table/visual structure |
| math | g4 | wp_leftover | שאלה מילולית — מה נשאר? | B | add real-life context | Word-problem page lacks real-life framing; Numbers may be too small for g4 (max 72) |
| math | g4 | wp_time_sum | שאלה מילולית — סכום זמנים | A | — | — |
| math | g4 | zero_add | חיבור עם 0 | A | add examples | Missing self-check question (§5) |
| math | g4 | zero_mul | כפל ב-0 | A | add examples | Missing self-check question (§5) |
| math | g4 | zero_sub | חיסור 0 | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g5 | add_three | חיבור שלושה מספרים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g5 | add_two | חיבור שני מספרים — עד 100,000 | A | add examples | Missing or weak simple example (§3) |
| math | g5 | cmp | השוואת מספרים — עד 100,000 | A | — | — |
| math | g5 | dec_add | חיבור עשרוניים | B | add examples | Section 3 very thin (17 chars); Missing or weak simple example (§3) |
| math | g5 | dec_sub | חיסור עשרוניים | B | add examples | Section 3 very thin (19 chars); Missing or weak simple example (§3) |
| math | g5 | div | חילוק — חלוקה שווה | B | add examples | Missing self-check question (§5); Long bullet list in §2 — may need table/visual structure |
| math | g5 | div_two_digit | חילוק במחלק דו-ספרתי | B | add examples | Missing self-check question (§5); Long bullet list in §2 — may need table/visual structure |
| math | g5 | div_with_remainder | חילוק עם שארית — מספרים גדולים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g5 | eq_add | משוואת חיבור | A | add examples | Missing or weak simple example (§3) |
| math | g5 | eq_div | משוואת חילוק | A | add examples | Missing or weak simple example (§3) |
| math | g5 | eq_mul | משוואת כפל | C | add examples | Section 3 very thin (22 chars); Missing or weak simple example (§3) |
| math | g5 | eq_sub | משוואת חיסור | A | add examples | Missing or weak simple example (§3) |
| math | g5 | est_add | אומדן חיבור — כיתה ה׳ | A | — | — |
| math | g5 | est_mul | אומדן כפל | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| math | g5 | est_quantity | אומדן כמות | A | — | — |
| math | g5 | fm_factor | גורמים של מספר | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g5 | fm_gcd | המחלק המשותף הגדול ביותר (מ.א.ח) | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g5 | fm_multiple | כפולות של מספר | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g5 | frac_add_sub | חיבור וחיסור שברים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g5 (max 8) |
| math | g5 | frac_expand | הרחבת שבר | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| math | g5 | frac_reduce | צמצום שבר | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g5 | frac_to_mixed | שבר למספר מעורב | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g5 | mixed_to_frac | מספר מעורב לשבר | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| math | g5 | mul | כפל — אסטרטגיות ומספרים גדולים | A | add examples | Missing self-check question (§5) |
| math | g5 | ns_complement100 | השלמה ל-100 | B | simplify for age level | Numbers may be too small for g5 (max 101); Long bullet list in §2 — may need table/visual structure |
| math | g5 | ns_neighbors | שכנים של מספר — עד 100,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g5 | ns_place_hundreds | ערך המקום — עד 100,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g5 | perc_discount | הנחה באחוזים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g5 (max 200) |
| math | g5 | perc_part_of | אחוז מכמות | B | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| math | g5 | round | עיגול — עשרות, מאות, אלפים ועשרות אלפים | A | add examples | Missing self-check question (§5) |
| math | g5 | sequence | סדרות מספרים — קפיצות גדולות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g5 | sub_two | חיסור שני מספרים — עד 100,000 | A | — | — |
| math | g5 | wp_comparison_more | שאלה מילולית — כמה יותר? | B | add real-life context | Word-problem page lacks real-life framing; Long bullet list in §2 — may need table/visual structure |
| math | g5 | wp_distance_time | מרחק, זמן ומהירות | C | add examples | Section 3 very thin (22 chars); Missing or weak simple example (§3) |
| math | g5 | wp_leftover | שאלה מילולית — מה נשאר? | B | add real-life context | Word-problem page lacks real-life framing; Numbers may be too small for g5 (max 340) |
| math | g5 | wp_multi_step | שאלה מילולית — כמה שלבים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g5 (max 450) |
| math | g5 | wp_shop_discount | קניות והנחה | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g5 (max 350) |
| math | g5 | wp_time_sum | שאלה מילולית — סכום זמנים | A | simplify for age level | Numbers may be too small for g5 (max 75) |
| math | g5 | wp_unit_cm_to_m | המרת יחידות — ס״מ ומטר | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| math | g5 | wp_unit_g_to_kg | המרת יחידות — גרם וקילוגרם | C | add examples | Missing or weak simple example (§3); Missing or weak guided example (§4) |
| math | g6 | add_three | חיבור שלושה מספרים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | add_two | חיבור שני מספרים — עד 200,000 | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | cmp | השוואת מספרים גדולים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | dec_add | חיבור מספרים עשרוניים | C | add examples | Section 3 very thin (21 chars); Missing or weak simple example (§3) |
| math | g6 | dec_divide | חילוק מספרים עשרוניים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 63) |
| math | g6 | dec_divide_10_100 | חילוק עשרוני ב-10 או ב-100 | B | add examples | Section 3 very thin (18 chars); Missing or weak simple example (§3) |
| math | g6 | dec_multiply | כפל מספרים עשרוניים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 360) |
| math | g6 | dec_multiply_10_100 | כפל עשרוני ב-10 או ב-100 | B | add examples | Section 3 very thin (18 chars); Missing or weak simple example (§3) |
| math | g6 | dec_repeating | עשרוניים מחזוריים | A | add examples | Missing self-check question (§5) |
| math | g6 | dec_sub | חיסור מספרים עשרוניים | C | add examples | Section 3 very thin (22 chars); Missing or weak simple example (§3) |
| math | g6 | div | חילוק — חלוקה שווה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | div_with_remainder | חילוק עם שארית | A | — | — |
| math | g6 | eq_add | משוואת חיבור — מספר חסר | A | — | — |
| math | g6 | eq_div | משוואת חילוק — מספר חסר | C | add examples | Section 3 very thin (17 chars); Missing or weak simple example (§3) |
| math | g6 | eq_mul | משוואת כפל — מספר חסר | C | add examples | Section 3 very thin (20 chars); Missing or weak simple example (§3) |
| math | g6 | eq_sub | משוואת חיסור — מספר חסר | A | — | — |
| math | g6 | fm_factor | גורמים של מספר | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g6 | fm_gcd | המחלק המשותף הגדול ביותר (מ.א.ח) | A | add examples | Missing or weak simple example (§3) |
| math | g6 | fm_multiple | כפולות של מספר | C | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g6 | frac_as_division | שבר כחילוק | C | add examples | Section 3 very thin (18 chars); Missing or weak simple example (§3) |
| math | g6 | frac_divide | חילוק שברים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 6) |
| math | g6 | frac_multiply | כפל שברים | C | add examples | Section 3 very thin (18 chars); Missing or weak simple example (§3) |
| math | g6 | mul | כפל — אסטרטגיות ומספרים גדולים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 420) |
| math | g6 | ns_complement100 | השלמה ל-100 | B | simplify for age level | Numbers may be too small for g6 (max 100); Long bullet list in §2 — may need table/visual structure |
| math | g6 | ns_neighbors | שכנים — מספרים גדולים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | ns_place_hundreds | ערך המקום — עד 200,000 | A | — | — |
| math | g6 | perc_discount | הנחה באחוזים | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 200) |
| math | g6 | perc_part_of | אחוז מכמות | B | add examples | Section 3 very thin (17 chars); Missing or weak simple example (§3) |
| math | g6 | ratio_find | מציאת כמות חסרה ביחס | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 35) |
| math | g6 | ratio_first | יחס — מה זה אומר? | B | add examples | Missing or weak simple example (§3); Missing self-check question (§5) |
| math | g6 | ratio_second | יחס בין שתי כמויות | C | add examples | Section 3 very thin (16 chars); Missing or weak simple example (§3) |
| math | g6 | round | עיגול — עשרות, מאות, אלפים | A | add examples | Missing self-check question (§5) |
| math | g6 | scale_find | קנה מידה — מציאת מרחק | A | add examples | Missing or weak simple example (§3) |
| math | g6 | scale_map_to_real | ממפה למציאות | A | add examples | Missing or weak simple example (§3) |
| math | g6 | scale_real_to_map | ממציאות למפה | A | add examples | Missing or weak simple example (§3) |
| math | g6 | sequence | סדרות מספרים — קפיצות גדולות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | sub_two | חיסור שני מספרים — עד 200,000 | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| math | g6 | wp_comparison_more | שאלה מילולית — כמה יותר? | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| math | g6 | wp_distance_time | מרחק, זמן ומהירות | B | add examples | Missing or weak simple example (§3); Word-problem page lacks real-life framing |
| math | g6 | wp_leftover | שאלה מילולית — מה נשאר? | B | add real-life context | Word-problem page lacks real-life framing; Numbers may be too small for g6 (max 850) |
| math | g6 | wp_shop_discount | שאלה מילולית — מבצע בחנות | B | add examples | Missing or weak simple example (§3); Numbers may be too small for g6 (max 150) |
| math | g6 | wp_time_sum | שאלה מילולית — סכום זמנים | A | simplify for age level | Numbers may be too small for g6 (max 85) |
| math | g6 | wp_unit_cm_to_m | המרת יחידות — ס״מ ומטר | C | add examples | Section 3 very thin (20 chars); Missing or weak simple example (§3) |
| math | g6 | wp_unit_g_to_kg | המרת יחידות — גרם וקילוגרם | C | add examples | Section 3 very thin (20 chars); Missing or weak simple example (§3) |
| moledet | g2 | mg_g2_community_participation | השתתפות בקהילה | A | add real-life context | Moledet/Geography page lacks place/map/location framing |
| moledet | g2 | mg_g2_community_services | שירותים בקהילה | A | — | — |
| moledet | g2 | mg_g2_group_decisions | קבלת החלטות בקבוצה | A | — | — |
| moledet | g2 | mg_g2_israel_basics | ארץ ישראל — מושגים בסיסיים | A | — | — |
| moledet | g2 | mg_g2_neighborhood | השכונה ומבניה | A | — | — |
| moledet | g2 | mg_g2_neighborhood_map | מפת השכונה | A | — | — |
| moledet | g2 | mg_g2_society_responsibility | חברה ואחריות | A | — | — |
| moledet | g3 | mg_g3_citizenship_basics | כללי אזרחות בסיסיים | A | add examples | Missing or weak simple example (§3) |
| moledet | g3 | mg_g3_districts_borders | מחוזות וגבולות | A | — | — |
| moledet | g3 | mg_g3_israel_map | מפת ישראל | A | — | — |
| moledet | g3 | mg_g3_landscapes | סוגי נופים | A | — | — |
| moledet | g3 | mg_g3_regions_cities | אזורים וערים גדולות | A | — | — |
| moledet | g3 | mg_g3_rights_duties | זכויות וחובות | A | add real-life context | Moledet/Geography page lacks place/map/location framing |
| moledet | g3 | mg_g3_social_participation | השתתפות חברתית | A | add real-life context | Moledet/Geography page lacks place/map/location framing |
| moledet | g3 | mg_g3_water_sources | מקורות מים | A | — | — |
| moledet | g4 | mg_g4_government_institutions | מוסדות שלטון | A | — | — |
| moledet | g4 | mg_g4_government_structure | מבנה הממשל | A | — | — |
| moledet | g4 | mg_g4_map_scale_symbols | מפות — קנה מידה וסימנים | A | — | — |
| moledet | g4 | mg_g4_natural_resources | משאבי טבע | A | — | — |
| moledet | g4 | mg_g4_organizations | ארגונים בקהילה | A | — | — |
| moledet | g4 | mg_g4_settlement_development | התפתחות היישובים בישראל | A | — | — |
| moledet | g4 | mg_g4_settlement_types | סוגי יישובים | A | — | — |
| science | g1 | animals | בעלי חיים — חי לעומת דומם | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g1 | body | גוף האדם — חושים ותנועה | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| science | g1 | earth_space | כדור הארץ ומזג אוויר | A | — | — |
| science | g1 | environment | הסביבה שלנו | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g1 | materials | חומרים — תכונות יומיומיות | A | — | — |
| science | g1 | plants | צמחים — מה צמחים צריכים | B | add examples | Missing or weak simple example (§3); Long bullet list in §2 — may need table/visual structure |
| science | g2 | animals | בעלי חיים — מחזור חיים | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g2 | body | גוף האדם — בריאות והרגלים | B | add examples | Missing or weak simple example (§3); Science page lacks observation/experiment/question hook |
| science | g2 | earth_space | כדור הארץ — עונות ושמיים | B | add mini experiment/observation | Science page lacks observation/experiment/question hook; Long bullet list in §2 — may need table/visual structure |
| science | g2 | environment | סביבה — שמירה על הטבע | B | add mini experiment/observation | Science page lacks observation/experiment/question hook; Long bullet list in §2 — may need table/visual structure |
| science | g2 | experiments | תצפית וחקירה | A | — | — |
| science | g2 | materials | חומרים — מצבי צבירה | A | — | — |
| science | g2 | plants | צמחים — גדילה ומחזור | A | — | — |
| science | g3 | animals | בעלי חיים — התאמה לסביבה | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g3 | body | גוף האדם — מערכות בסיסיות | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g3 | earth_space | כדור הארץ — מזג אוויר ומים | A | — | — |
| science | g3 | environment | סביבה — מערכות קטנות | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g3 | experiments | ניסוי מדעי קצר | A | — | — |
| science | g3 | materials | חומרים — כוחות ותנועה | A | — | — |
| science | g3 | plants | צמחים — תנאי גידול (סיכום) | A | — | — |
| science | g4 | animals | בעלי חיים — יחסי גומלין | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g4 | body | גוף האדם — נשימה ועיכול | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g4 | earth_space | כדור הארץ — סלעים, קרקע ועונות | B | add mini experiment/observation | Science page lacks observation/experiment/question hook; Long bullet list in §2 — may need table/visual structure |
| science | g4 | environment | סביבה — שמירת משאבים | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| science | g4 | experiments | תכנון ניסוי | A | — | — |
| science | g4 | materials | חומרים — שינויים וחשמל (מושגי) | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g5 | animals | בעלי חיים — רבייה והתאמות | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g5 | body | גוף האדם — שלד, שרירים וחושים | A | add mini experiment/observation | Science page lacks observation/experiment/question hook |
| science | g5 | earth_space | כדור הארץ — משאבים ותופעות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| science | g5 | environment | סביבה — משאבי טבע | B | add mini experiment/observation | Science page lacks observation/experiment/question hook; Long bullet list in §2 — may need table/visual structure |
| science | g5 | experiments | חקר מלא — תיעוד | A | — | — |
| science | g5 | materials | חומרים — תערובות ואור | A | add real-life context | Limited real-life phenomenon connection |
| science | g6 | animals | בעלי חיים — מערכות אקולוגיות | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| science | g6 | body | גוף האדם — תיאום בין מערכות | B | add mini experiment/observation | Science page lacks observation/experiment/question hook; Long bullet list in §2 — may need table/visual structure |
| science | g6 | earth_space | כדור הארץ — אקלים וחלל | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |
| science | g6 | environment | סביבה — שינויי אקלים ופעולה | B | add mini experiment/observation | Science page lacks observation/experiment/question hook; Long bullet list in §2 — may need table/visual structure |
| science | g6 | experiments | פרויקט מדעי | A | — | — |
| science | g6 | materials | חומרים — כימיה בסיסית | A | add table/diagram/visual structure | Long bullet list in §2 — may need table/visual structure |

---

*Audit tooling: `tmp/audit-book-pedagogy.mjs` (read-only runner). Raw scores: `tmp/book-pedagogy-audit.json`.*
