# Grade 6 Hebrew / עברית Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר עברית — כיתה ו׳  
**Subject key:** `hebrew`  
**Child-facing subject name:** עברית

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Approved master scope — 29 G6 pages |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 5–6 seven-section template |
| `data/hebrew-g6-content-map.js` | Subtopic weights/modes (scope hints only) |

**Grade 5 Hebrew book:** Separate task — G6 rich 5–6 band pages must not reuse G5 text.  
**Other subjects:** Out of scope.

---

## 1. Grade 6 Hebrew Skills (Complete List)

A skill is **in Grade 6 Hebrew scope** when `subject: "hebrew"` and `minGrade ≤ 6` and `maxGrade ≥ 6` in `skills.json`.

**Spine filter result: 29 rows** (12 content-map + 17 rich 5–6 band)

### 1A. New in Grade 6 (`minGrade === 6`) — 12 map skills

| skill_id | Domain | Focus |
|----------|--------|-------|
| `hebrew:g6:reading:g6.compare_genres` | reading | השוואת סוגות |
| `hebrew:g6:reading:g6.complex_text_analysis` | reading | ניתוח טקסט מורכב |
| `hebrew:g6:comprehension:g6.critical_evaluation_light` | comprehension | הערכה ביקורתית קלה |
| `hebrew:g6:comprehension:g6.evidence_from_text` | comprehension | הבאת ראיה מהטקסט |
| `hebrew:g6:writing:g6.argumentative_full_scaffold` | writing | כתיבה טיעונית מלאה |
| `hebrew:g6:writing:g6.research_literacy_choice` | writing | אוריינות מחקרית |
| `hebrew:g6:grammar:g6.possession_prep` | grammar | שייכות ומילות יחס |
| `hebrew:g6:grammar:g6.subject_verb_advanced` | grammar | התאמת נושא–נשוא מתקדמת |
| `hebrew:g6:grammar:g6.complex_syntax_spot` | grammar | תחביר מורכב |
| `hebrew:g6:vocabulary:g6.academic_vocab` | vocabulary | אוצר מילים אקדמי |
| `hebrew:g6:vocabulary:g6.discipline_words_light` | vocabulary | מילים מקצועיות קלות |
| `hebrew:g6:speaking:g6.debate_scaffold_choice` | speaking | דיבייט / הצגת עמדה |

### 1B. Continuing rich 5–6 band — 17 skills

Separate G6 learning pages mandatory — G6-depth rewrite (evidence, debate, research framing).

| skill_id | Domain |
|----------|--------|
| `hebrew:rich:reading:structural:paragraph_role` | reading |
| `hebrew:rich:comprehension:main_idea:summary` | comprehension |
| `hebrew:rich:comprehension:supporting_detail:evidence` | comprehension |
| `hebrew:rich:comprehension:compare_statements:contrast` | comprehension |
| `hebrew:rich:comprehension:implicit_tone:attitude` | comprehension |
| `hebrew:rich:comprehension:reference:pronoun` | comprehension |
| `hebrew:rich:comprehension:sequence:order` | comprehension |
| `hebrew:rich:grammar:binary_grammar:tf` | grammar |
| `hebrew:rich:grammar:sentence_correction:choose_correct` | grammar |
| `hebrew:rich:grammar:sentence_correction:sv_agreement_plural` | grammar |
| `hebrew:rich:grammar:tense_shift:past_present` | grammar |
| `hebrew:rich:grammar:transform:negation` | grammar |
| `hebrew:rich:grammar:verb_agreement:plural_subject` | grammar |
| `hebrew:rich:vocabulary:category_exclusion:odd_out` | vocabulary |
| `hebrew:rich:vocabulary:collocation:verb_noun_fit` | vocabulary |
| `hebrew:rich:vocabulary:context_fit:register` | vocabulary |
| `hebrew:rich:writing:rephrase:clarity` | writing |

**Total learning pages: 29** (1:1 with spine rows)

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/hebrew/g6/drafts/{pageId}.md`  
`learning_page_id`: `hebrew:g6:{pageId}`  
All pages: `age_band: grades_5_6`, `approval_status: draft`, `subject: hebrew`.

| Batch | # | pageId | Title (draft) |
|-------|---|--------|---------------|
| A | 1–3 | `g6.compare_genres`, `g6.complex_text_analysis`, `paragraph_role` | סוגות; ניתוח; תפקיד פסקה |
| B | 4–11 | map + rich comprehension | ביקורת; ראיה; סיכום; פרטים; הנגדה; טון; כינוי; סדר |
| C | 12–20 | map + rich grammar | תחביר; נושא–נשוא; שייכות; תיקונים |
| D | 21–25 | map + rich vocabulary | אקדמי; מקצועי; רישום; צירופים; קבוצה |
| E | 26–28 | map + rich writing | טיעון; מחקר; ניסוח |
| F | 29 | `g6.debate_scaffold_choice` | דיבייט |

**Page count:** 29.

---

## 3. G6 vs G5 Rich Band — Depth Change

| Dimension | G5 (future) | G6 (this book) |
|-----------|-------------|----------------|
| Passage length | 5–6 sentences | 6–8 sentences |
| Comprehension | Inference, perspectives | Critical evaluation, evidence, tone |
| Writing | Full composition | Argument + research literacy |
| Speaking | Argument scaffold | Debate scaffold |
| Grammar | Syntax, verb patterns | Complex syntax, possession, advanced S–V |

**Rule:** Do not copy G5 page text — G6 pages use `(כיתה ו׳)` titles and `G6 depth` metadata.

---

## 4. Neutral / Age-Appropriate Content Policy

| Strand | Policy |
|--------|--------|
| Debate / argument | Neutral topics only: books vs screens, recycling, library hours |
| Critical evaluation | «האם הטענה מוצדקת?» — no political/religious framing |
| Research literacy | Source author/date/trust — no open web research tasks |
| Evidence | Short quotes from provided text only |
| Terminology | Avoid high-school grammar labels; examples-first |

---

## 5. Strand Boundaries

| Strand | Reading / comprehension pages | Writing pages |
|--------|------------------------------|---------------|
| Focus | Understand, evaluate, cite evidence | Produce argument, cite sources, rephrase |
| Avoid | Writing scaffolds on reading pages | Long comprehension-only drills |

---

## 6. Topics Needing Owner Review

| Topic | Status | Notes |
|-------|--------|-------|
| Debate topics list | Needs review | Confirm neutral set approved |
| Critical evaluation wording | Needs review | «ביקורתית קלה» — exact child-facing phrase |
| Research literacy depth | Needs review | Basic source check only |
| Academic vocab list | Needs review | ניתוח, השוואה, מסקנה — expand/trim |
| Rich 5–6 band vs G5 | Needs review | 17 pages — separate G5 book required |
| `sentence_correction` two subtypes | Needs review | choose_correct vs sv_agreement — separate pages |

---

## 7. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/HEBREW_GRADE_6_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/HEBREW_GRADE_6_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/hebrew/g6/drafts/*.md` | ✅ 29 pages |
| Draft README | `docs/learning-book/hebrew/g6/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-hebrew-g6-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-hebrew-g6-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/hebrew-g6-draft-manifest.mjs` | ✅ |

---

## 8. Verification

```bash
node scripts/build-hebrew-g6-hebrew-review-pack.mjs
node scripts/verify-hebrew-g6-book-content.mjs
```

---

*Content-only package. No registry, routes, practice mappings, SQL, commit, push, or deploy.*
