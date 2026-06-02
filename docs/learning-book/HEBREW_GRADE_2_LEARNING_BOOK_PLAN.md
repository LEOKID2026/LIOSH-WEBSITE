# Grade 2 Hebrew / עברית Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר עברית — כיתה ב׳  
**Subject key:** `hebrew`  
**Child-facing subject name:** עברית

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Approved master scope — 23 G2 pages |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `data/hebrew-g2-content-map.js` | Subtopic weights/modes (scope hints only) |

**Other subjects:** Out of scope.  
**Grade 1 Hebrew book:** Separate task — G2 continuing writing pages must not reuse G1 text.

---

## 1. Grade 2 Hebrew Skills (Complete List)

A skill is **in Grade 2 Hebrew scope** when `subject: "hebrew"` and `minGrade ≤ 2` and `maxGrade ≥ 2` in `skills.json`.

**Spine filter result: 23 rows** (16 content-map + 7 rich)

| # | skill_id | Domain | New / Continuing |
|---|----------|--------|------------------|
| 1 | `hebrew:g2:reading:g2.fluent_words` | reading | New |
| 2 | `hebrew:g2:reading:g2.short_sentence` | reading | New |
| 3 | `hebrew:g2:reading:g2.simple_punctuation_read` | reading | New |
| 4 | `hebrew:rich:reading:word_level_early_g2:spelling_choice_niqqud` | reading | New |
| 5 | `hebrew:g2:grammar:g2.pos_basic` | grammar | New |
| 6 | `hebrew:g2:grammar:g2.simple_tense` | grammar | New |
| 7 | `hebrew:g2:grammar:g2.number_gender_light` | grammar | New |
| 8 | `hebrew:rich:grammar:gender_number_early_g2:agreement_boy_plural` | grammar | New |
| 9 | `hebrew:g2:comprehension:g2.detail_main_idea` | comprehension | New |
| 10 | `hebrew:g2:comprehension:g2.light_inference` | comprehension | New |
| 11 | `hebrew:g2:comprehension:g2.simple_sequence` | comprehension | New |
| 12 | `hebrew:rich:comprehension:binary_fact_early_g2:where_from_sentence` | comprehension | New |
| 13 | `hebrew:g2:vocabulary:g2.synonyms_basic` | vocabulary | New |
| 14 | `hebrew:g2:vocabulary:g2.context_clue_easy` | vocabulary | New |
| 15 | `hebrew:rich:vocabulary:word_context_early_g2:cloze_school` | vocabulary | New |
| 16 | `hebrew:g2:writing:g2.sentence_wellformed` | writing | New |
| 17 | `hebrew:g2:writing:g2.punctuation_choice` | writing | New |
| 18 | `hebrew:g2:writing:g2.short_paragraph_choice` | writing | New |
| 19 | `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle` | writing | Continuing (G1–2) |
| 20 | `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning` | writing | Continuing (G1–2) |
| 21 | `hebrew:g2:speaking:g2.describe_prompt_choice` | speaking | New |
| 22 | `hebrew:g2:speaking:g2.situation_register` | speaking | New |
| 23 | `hebrew:rich:speaking:social_reply_early_g2:thanks_response` | speaking | New |

**Total learning pages: 23** (1:1 with spine rows)

### 1A. Continuing from Grade 1 — 2 rich writing skills

| skill_id | G1 page (future) | G2 upgrade | Clearly G2? |
|----------|------------------|------------|-------------|
| `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle` | G1 object_riddle | Longer clues; less picture reliance; כיס/מפתחות riddle | Yes |
| `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning` | G1 role_meaning | Longer sentences; POS in context | Yes |

**Rule:** Do not copy G1 riddles or examples — separate §5/§6 contexts.

### 1B. Excluded from Grade 2 book

| Category | Reason |
|----------|--------|
| Hebrew skills with `minGrade > 2` | G3+ books only |
| Hebrew skills with `maxGrade < 2` | G1-only (e.g. letters, niqqud foundations) |
| All non-`hebrew` subjects | By definition |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/hebrew/g2/drafts/{pageId}.md`  
`learning_page_id`: `hebrew:g2:{pageId}`  
All pages: `age_band: grades_1_2`, `approval_status: draft`, `subject: hebrew`.

| Batch | Order | learning_page_id | skill_id | Draft file | Hebrew title | Clearly G2? |
|-------|-------|------------------|----------|------------|--------------|-------------|
| A | 1 | `hebrew:g2:g2.fluent_words` | `hebrew:g2:reading:g2.fluent_words` | `g2.fluent_words.md` | קריאת מילים בשטף | Yes |
| A | 2 | `hebrew:g2:g2.short_sentence` | `hebrew:g2:reading:g2.short_sentence` | `g2.short_sentence.md` | קריאת משפט קצר | Yes |
| A | 3 | `hebrew:g2:g2.simple_punctuation_read` | `hebrew:g2:reading:g2.simple_punctuation_read` | `g2.simple_punctuation_read.md` | סימני פיסוק בקריאה | Yes |
| A | 4 | `hebrew:g2:spelling_choice_niqqud` | `hebrew:rich:reading:word_level_early_g2:spelling_choice_niqqud` | `spelling_choice_niqqud.md` | בחירת איות נכון | Yes |
| B | 5 | `hebrew:g2:g2.pos_basic` | `hebrew:g2:grammar:g2.pos_basic` | `g2.pos_basic.md` | שם עצם, פועל ותואר | Yes |
| B | 6 | `hebrew:g2:g2.simple_tense` | `hebrew:g2:grammar:g2.simple_tense` | `g2.simple_tense.md` | זמן פשוט | Yes |
| B | 7 | `hebrew:g2:g2.number_gender_light` | `hebrew:g2:grammar:g2.number_gender_light` | `g2.number_gender_light.md` | זכר, נקבה, יחיד ורבים | Yes |
| B | 8 | `hebrew:g2:agreement_boy_plural` | `hebrew:rich:grammar:gender_number_early_g2:agreement_boy_plural` | `agreement_boy_plural.md` | התאמה — ילדים רצים | Yes |
| C | 9 | `hebrew:g2:g2.detail_main_idea` | `hebrew:g2:comprehension:g2.detail_main_idea` | `g2.detail_main_idea.md` | רעיון מרכזי ופרטים | Yes |
| C | 10 | `hebrew:g2:g2.light_inference` | `hebrew:g2:comprehension:g2.light_inference` | `g2.light_inference.md` | הסקה קלה | Yes |
| C | 11 | `hebrew:g2:g2.simple_sequence` | `hebrew:g2:comprehension:g2.simple_sequence` | `g2.simple_sequence.md` | רצף פשוט | Yes |
| C | 12 | `hebrew:g2:where_from_sentence` | `hebrew:rich:comprehension:binary_fact_early_g2:where_from_sentence` | `where_from_sentence.md` | מאיפה יודעים? | Yes |
| D | 13 | `hebrew:g2:g2.synonyms_basic` | `hebrew:g2:vocabulary:g2.synonyms_basic` | `g2.synonyms_basic.md` | מילים נרדפות | Yes |
| D | 14 | `hebrew:g2:g2.context_clue_easy` | `hebrew:g2:vocabulary:g2.context_clue_easy` | `g2.context_clue_easy.md` | רמז מההקשר | Yes |
| D | 15 | `hebrew:g2:cloze_school` | `hebrew:rich:vocabulary:word_context_early_g2:cloze_school` | `cloze_school.md` | מילה חסרה — בית ספר | Yes |
| E | 16 | `hebrew:g2:g2.sentence_wellformed` | `hebrew:g2:writing:g2.sentence_wellformed` | `g2.sentence_wellformed.md` | משפט תקין | Yes |
| E | 17 | `hebrew:g2:g2.punctuation_choice` | `hebrew:g2:writing:g2.punctuation_choice` | `g2.punctuation_choice.md` | סימני פיסוק בכתיבה | Yes |
| E | 18 | `hebrew:g2:g2.short_paragraph_choice` | `hebrew:g2:writing:g2.short_paragraph_choice` | `g2.short_paragraph_choice.md` | פסקה קצרה | Yes |
| E | 19 | `hebrew:g2:object_riddle` | `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle` | `object_riddle.md` | חידת מילה — חפץ (כיתה ב׳) | Yes — G2 depth |
| E | 20 | `hebrew:g2:role_meaning` | `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning` | `role_meaning.md` | תפקיד המילה | Yes — G2 depth |
| F | 21 | `hebrew:g2:g2.describe_prompt_choice` | `hebrew:g2:speaking:g2.describe_prompt_choice` | `g2.describe_prompt_choice.md` | תיאור קצר | Yes |
| F | 22 | `hebrew:g2:g2.situation_register` | `hebrew:g2:speaking:g2.situation_register` | `g2.situation_register.md` | דיבור מתאים למצב | Yes |
| F | 23 | `hebrew:g2:thanks_response` | `hebrew:rich:speaking:social_reply_early_g2:thanks_response` | `thanks_response.md` | תודה — איך עונים? | Yes |

**Page count:** 23.

---

## 3. Batch Grouping

| Batch | Title | Pages | Focus |
|-------|-------|-------|-------|
| **A** | קריאה — מילים, משפטים ופיסוק | 4 | Fluent words; short sentence; punctuation in reading; spelling choice |
| **B** | דקדוק — סוגי מילים, זמן ומין/מספר | 4 | POS; tense; gender/number; plural agreement |
| **C** | הבנת הנקרא — רעיון, הסקה ורצף | 4 | Main idea; inference; sequence; answer from sentence |
| **D** | אוצר מילים — נרדפות והקשר | 3 | Synonyms; context clue; school cloze |
| **E** | כתיבה — משפט, פיסוק ופסקה | 5 | Wellformed sentence; punctuation; paragraph; continuing riddles |
| **F** | דיבור — תיאור, מצב ותגובה | 3 | Describe; register; thanks response |

---

## 4. Content Scope Notes (Draft Boundaries)

| Strand | In scope (G2 draft) | Out of scope |
|--------|---------------------|--------------|
| Reading | Short sentences; partial niqqud; punctuation awareness | Full chapter books; formal phonics drill |
| Comprehension | One–three sentences; light inference | Multi-paragraph passages (→ G3) |
| Grammar | POS by example; simple tense labels; gender/number | Binyan, formal syntax (→ G3+) |
| Vocabulary | Synonyms; context; school cloze | Antonyms, word families (→ G3) |
| Writing | 1 sentence; 2–3 sentence paragraph | Full composition (→ G5+) |
| Speaking | Oral strategy; choice scaffolds | Debate, argument (→ G5+) |

---

## 5. Section 5 / Section 6 Alignment Plan

Each page uses the same example/context in §5 (נסו בעצמכם) and §6 (שימו לב!). Anchors defined in `scripts/lib/hebrew-g2-draft-manifest.mjs` → `HEBREW_G2_ALIGNMENT_ANCHORS`.

---

## 6. Topics Needing Owner Review

| Topic | Status | Notes |
|-------|--------|-------|
| Niqqud visibility in G2 examples | Needs review | Draft uses mixed niqqud; align with `hebrew-g2-content-map.js` niqqud flags |
| `object_riddle` / `role_meaning` G2 depth | Needs review | Continuing skills — confirm distinct enough from future G1 pages |
| Speaking pages — oral vs written rehearsal | Needs review | Master scope Q5 — drafts explain strategy in prose only |
| Book title branding | Needs review | **ספר עברית** vs **לשון** on future tiles |
| Formal grammar tone | Needs review | Avoid metalabels beyond POS/tense; examples-first |
| `short_paragraph_choice` length | Needs review | Draft teaches 2–3 sentences; confirm ministry alignment |

---

## 7. Owner-Review Questions Before Runtime

1. Approve **23 pages** as full G2 Hebrew book for current spine.
2. Confirm continuing writing pages (`object_riddle`, `role_meaning`) G2 text is sufficiently distinct from G1.
3. Confirm niqqud policy for G2 book display (inherit vs partial vs none).
4. Practice CTA — separate task after approval.

---

## 8. Deliverables Checklist (This Task)

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/HEBREW_GRADE_2_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/HEBREW_GRADE_2_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/hebrew/g2/drafts/*.md` | ✅ 23 pages |
| Draft README | `docs/learning-book/hebrew/g2/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-hebrew-g2-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-hebrew-g2-book-content.mjs` | ✅ |
| Draft manifest (scripts only) | `scripts/lib/hebrew-g2-draft-manifest.mjs` | ✅ |

---

## 9. Verification

```bash
node scripts/build-hebrew-g2-hebrew-review-pack.mjs
node scripts/verify-hebrew-g2-book-content.mjs
```

---

*Content-only package. No registry, routes, practice mappings, SQL, commit, push, or deploy.*
