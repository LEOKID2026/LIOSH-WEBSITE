# Grade 4 Hebrew / עברית Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר עברית — כיתה ד׳  
**Subject key:** `hebrew`  
**Child-facing subject name:** עברית

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Approved master scope — 29 G4 pages |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 3–4 seven-section template |
| `data/hebrew-g4-content-map.js` | Subtopic weights/modes (scope hints only) |

**Grade 3 Hebrew book:** Separate task — G4 rich 3–4 band pages must not reuse G3 text.  
**Other subjects:** Out of scope.

---

## 1. Grade 4 Hebrew Skills (Complete List)

A skill is **in Grade 4 Hebrew scope** when `subject: "hebrew"` and `minGrade ≤ 4` and `maxGrade ≥ 4` in `skills.json`.

**Spine filter result: 29 rows** (11 content-map + 18 rich 3–4 band)

### 1A. New in Grade 4 (`minGrade === 4`) — 11 map skills

| skill_id | Domain | Focus |
|----------|--------|-------|
| `hebrew:g4:reading:g4.genre_mix` | reading | סוגות — סיפור מול מידע |
| `hebrew:g4:reading:g4.info_lit_intro` | reading | אוריינות מידע — מקור אמין |
| `hebrew:g4:comprehension:g4.summary_intro` | comprehension | סיכום בסיסי |
| `hebrew:g4:comprehension:g4.text_structure` | comprehension | מבנה טקסט |
| `hebrew:g4:writing:g4.intro_body_conclusion_choice` | writing | פתיחה, גוף, סיום |
| `hebrew:g4:writing:g4.genre_appropriate_language` | writing | שפה מתאימה לסוגה |
| `hebrew:g4:grammar:g4.dictation_spot_error` | grammar | שגיאת כתיב/הכתבה |
| `hebrew:g4:grammar:g4.root_pattern_intro` | grammar | שורש ותבנית |
| `hebrew:g4:vocabulary:g4.literary_lexicon_light` | vocabulary | אוצר מילים ספרותי קל |
| `hebrew:g4:vocabulary:g4.idiom_light` | vocabulary | מילים וביטויים |
| `hebrew:g4:speaking:g4.present_text_based_choice` | speaking | הצגת רעיון מתוך טקסט |

### 1B. Continuing rich 3–4 band — 18 skills

Same `skill_id` as Grade 3 spine rows (`minGrade: 3, maxGrade: 4`) — **separate G4 learning pages mandatory** with G4-depth rewrite (longer passages, summary/structure framing).

| skill_id | Domain |
|----------|--------|
| `hebrew:rich:reading:sentence_read:meaning` | reading |
| `hebrew:rich:comprehension:passage_explicit:detail` | comprehension |
| `hebrew:rich:comprehension:passage_inference:implied` | comprehension |
| `hebrew:rich:comprehension:cause_effect:because` | comprehension |
| `hebrew:rich:comprehension:analogy_reasoning:parallel` | comprehension |
| `hebrew:rich:comprehension:binary_fact_mid_grammar:tf` | comprehension |
| `hebrew:rich:comprehension:completion:context_clue` | comprehension |
| `hebrew:rich:grammar:gender_number:plural` | grammar |
| `hebrew:rich:grammar:morphology:binyan_fit` | grammar |
| `hebrew:rich:grammar:part_of_speech:verb_noun` | grammar |
| `hebrew:rich:grammar:prep_choice:collocation` | grammar |
| `hebrew:rich:vocabulary:synonym:near_meaning` | vocabulary |
| `hebrew:rich:vocabulary:antonym:opposite` | vocabulary |
| `hebrew:rich:vocabulary:precision:best_word` | vocabulary |
| `hebrew:rich:vocabulary:semantic_field:education_lexicon` | vocabulary |
| `hebrew:rich:writing:logic_completion:conclusion` | writing |
| `hebrew:rich:writing:structured_completion:polite_phrase` | writing |
| `hebrew:rich:speaking:social_reply_mid_help:request` | speaking |

**Total learning pages: 29** (1:1 with spine rows)

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/hebrew/g4/drafts/{pageId}.md`  
`learning_page_id`: `hebrew:g4:{pageId}`  
All pages: `age_band: grades_3_4`, `approval_status: draft`, `subject: hebrew`.

| Batch | Order | pageId | skill_id | Title (draft) |
|-------|-------|--------|----------|---------------|
| A | 1 | `g4.genre_mix` | `hebrew:g4:reading:g4.genre_mix` | סוגות שונות |
| A | 2 | `g4.info_lit_intro` | `hebrew:g4:reading:g4.info_lit_intro` | אוריינות מידע |
| A | 3 | `meaning` | `hebrew:rich:reading:sentence_read:meaning` | קריאת משפט — משמעות (ד׳) |
| B | 4 | `g4.summary_intro` | `hebrew:g4:comprehension:g4.summary_intro` | סיכום בסיסי |
| B | 5 | `g4.text_structure` | `hebrew:g4:comprehension:g4.text_structure` | מבנה טקסט |
| B | 6 | `detail` | `hebrew:rich:comprehension:passage_explicit:detail` | פרט מתוך הטקסט (ד׳) |
| B | 7 | `implied` | `hebrew:rich:comprehension:passage_inference:implied` | מה משתמע (ד׳) |
| B | 8 | `because` | `hebrew:rich:comprehension:cause_effect:because` | סיבה ותוצאה (ד׳) |
| B | 9 | `parallel` | `hebrew:rich:comprehension:analogy_reasoning:parallel` | השוואה ודמיון (ד׳) |
| B | 10 | `tf` | `hebrew:rich:comprehension:binary_fact_mid_grammar:tf` | נכון או לא (ד׳) |
| B | 11 | `context_clue` | `hebrew:rich:comprehension:completion:context_clue` | השלמה לפי הקשר (ד׳) |
| C | 12 | `g4.root_pattern_intro` | `hebrew:g4:grammar:g4.root_pattern_intro` | שורש ותבנית |
| C | 13 | `g4.dictation_spot_error` | `hebrew:g4:grammar:g4.dictation_spot_error` | שגיאת כתיב |
| C | 14 | `plural` | `hebrew:rich:grammar:gender_number:plural` | יחיד ורבים (ד׳) |
| C | 15 | `binyan_fit` | `hebrew:rich:grammar:morphology:binyan_fit` | פועל מתאים (ד׳) |
| C | 16 | `verb_noun` | `hebrew:rich:grammar:part_of_speech:verb_noun` | פועל ושם (ד׳) |
| C | 17 | `collocation` | `hebrew:rich:grammar:prep_choice:collocation` | צירופי מילים (ד׳) |
| D | 18 | `g4.literary_lexicon_light` | `hebrew:g4:vocabulary:g4.literary_lexicon_light` | אוצר מילים ספרותי |
| D | 19 | `g4.idiom_light` | `hebrew:g4:vocabulary:g4.idiom_light` | מילים וביטויים |
| D | 20 | `near_meaning` | `hebrew:rich:vocabulary:synonym:near_meaning` | מילים קרובות (ד׳) |
| D | 21 | `opposite` | `hebrew:rich:vocabulary:antonym:opposite` | מילים הפוכות (ד׳) |
| D | 22 | `best_word` | `hebrew:rich:vocabulary:precision:best_word` | המילה המדויקת (ד׳) |
| D | 23 | `education_lexicon` | `hebrew:rich:vocabulary:semantic_field:education_lexicon` | מילים מעולם הלימוד (ד׳) |
| E | 24 | `g4.intro_body_conclusion_choice` | `hebrew:g4:writing:g4.intro_body_conclusion_choice` | פתיחה, גוף וסיום |
| E | 25 | `g4.genre_appropriate_language` | `hebrew:g4:writing:g4.genre_appropriate_language` | שפה מתאימה לסוגה |
| E | 26 | `conclusion` | `hebrew:rich:writing:logic_completion:conclusion` | סיום ומסקנה (ד׳) |
| E | 27 | `polite_phrase` | `hebrew:rich:writing:structured_completion:polite_phrase` | ניסוח מנומס (ד׳) |
| F | 28 | `g4.present_text_based_choice` | `hebrew:g4:speaking:g4.present_text_based_choice` | הצגת רעיון מתוך טקסט |
| F | 29 | `request` | `hebrew:rich:speaking:social_reply_mid_help:request` | בקשת עזרה (ד׳) |

**Page count:** 29.

---

## 3. Batch Grouping

| Batch | Title | Pages | Focus |
|-------|-------|-------|-------|
| **A** | קריאה — סוגות ואוריינות | 3 | genre mix; info literacy; sentence meaning (rich) |
| **B** | הבנת הנקרא | 8 | summary; structure; rich comprehension band |
| **C** | דקדוק | 6 | root/pattern; dictation; rich grammar band |
| **D** | אוצר מילים | 6 | literary lexicon; idioms; rich vocabulary band |
| **E** | כתיבה | 4 | intro/body/conclusion; genre language; rich writing band |
| **F** | דיבור | 2 | present from text; request help (rich) |

---

## 4. G4 vs G3 Rich Band — Depth Change

| Dimension | G3 (future) | G4 (this book) |
|-----------|-------------|----------------|
| Passage length | 2–3 sentences typical | 4–6 sentences |
| Topics | School, daily life | Library, museum, nature reserve, newspaper |
| Comprehension | Explicit / light inference | Summary, structure, longer inference |
| Writing | 2–3 sentences | Intro–body–conclusion scaffold |
| Grammar | Binyan light intro | Root/pattern + dictation spot errors |

**Rule:** Do not copy G3 page text when G3 book is authored — G4 pages stand alone with `(כיתה ד׳)` titles and G4 depth metadata.

---

## 5. Strand Boundaries (G4)

| Strand | Reading pages | Writing pages |
|--------|---------------|---------------|
| Focus | Understand texts — genre, structure, summary | Produce texts — structure, genre language |
| Avoid | Writing scaffolds on reading pages | Long comprehension drills on writing pages |

---

## 6. Topics Needing Owner Review

| Topic | Status | Notes |
|-------|--------|-------|
| **שורש** terminology | Needs review | G4 `root_pattern_intro` — confirm child-facing «שורש» approved (master scope Q3) |
| Info literacy depth | Needs review | `info_lit_intro` — source trust only; no full research unit |
| Literary lexicon | Needs review | Light terms (דמות, עלילה) — confirm list |
| Idioms | Needs review | «ראש גדול» etc. — cultural appropriateness |
| Rich band G4 vs G3 | Needs review | 18 pages — confirm separate G3 book will use different §5/§6 |
| Speaking oral vs written | Needs review | Master scope Q5 |

---

## 7. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/HEBREW_GRADE_4_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/HEBREW_GRADE_4_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/hebrew/g4/drafts/*.md` | ✅ 29 pages |
| Draft README | `docs/learning-book/hebrew/g4/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-hebrew-g4-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-hebrew-g4-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/hebrew-g4-draft-manifest.mjs` | ✅ |

---

## 8. Verification

```bash
node scripts/build-hebrew-g4-hebrew-review-pack.mjs
node scripts/verify-hebrew-g4-book-content.mjs
```

---

*Content-only package. No registry, routes, practice mappings, SQL, commit, push, or deploy.*
