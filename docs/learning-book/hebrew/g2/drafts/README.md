# Grade 2 Hebrew / עברית Learning Book — Drafts

**Status:** All batches authored — **23 / 23** draft pages complete. Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/hebrew/g2/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/HEBREW_GRADE_2_LEARNING_BOOK_PLAN.md` |
| Master scope | ✅ `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` |
| Draft markdown pages | ✅ **23 / 23** (Batches A–F) |
| Review pack | ✅ `docs/learning-book/HEBREW_GRADE_2_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-hebrew-g2-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/hebrew-g2-draft-manifest.mjs` |
| Runtime registry / routes | ❌ not created (out of scope) |

---

## Naming

- Child-facing book: **ספר עברית — כיתה ב׳**
- Subject key: `hebrew`
- Internal IDs: `hebrew:g2:{pageId}`, `subject: hebrew`

---

## Batch A — קריאה (4)

| File | Draft title |
|------|-------------|
| `g2.fluent_words.md` | קריאת מילים בשטף |
| `g2.short_sentence.md` | קריאת משפט קצר |
| `g2.simple_punctuation_read.md` | סימני פיסוק בקריאה |
| `spelling_choice_niqqud.md` | בחירת איות נכון |

---

## Batch B — דקדוק (4)

| File | Draft title |
|------|-------------|
| `g2.pos_basic.md` | שם עצם, פועל ותואר |
| `g2.simple_tense.md` | זמן פשוט — עבר, הווה ועתיד |
| `g2.number_gender_light.md` | זכר, נקבה, יחיד ורבים |
| `agreement_boy_plural.md` | התאמה — ילדים רצים |

---

## Batch C — הבנת הנקרא (4)

| File | Draft title |
|------|-------------|
| `g2.detail_main_idea.md` | רעיון מרכזי ופרטים |
| `g2.light_inference.md` | הסקה קלה מטקסט |
| `g2.simple_sequence.md` | רצף פשוט — קודם ואחר כך |
| `where_from_sentence.md` | מאיפה יודעים? — מהמשפט |

---

## Batch D — אוצר מילים (3)

| File | Draft title |
|------|-------------|
| `g2.synonyms_basic.md` | מילים נרדפות |
| `g2.context_clue_easy.md` | רמז מההקשר |
| `cloze_school.md` | מילה חסרה — בית ספר |

---

## Batch E — כתיבה (5)

| File | Draft title | Note |
|------|-------------|------|
| `g2.sentence_wellformed.md` | משפט תקין | |
| `g2.punctuation_choice.md` | סימני פיסוק בכתיבה | |
| `g2.short_paragraph_choice.md` | פסקה קצרה — שלושה משפטים | |
| `object_riddle.md` | חידת מילה — חפץ (כיתה ב׳) | Continuing G1–2 — not G1 text |
| `role_meaning.md` | תפקיד המילה — מה היא עושה במשפט? | Continuing G1–2 — not G1 text |

---

## Batch F — דיבור (3)

| File | Draft title |
|------|-------------|
| `g2.describe_prompt_choice.md` | תיאור קצר |
| `g2.situation_register.md` | דיבור מתאים למצב |
| `thanks_response.md` | תודה — איך עונים? |

---

## Section Template

Every page has exactly 7 sections:

1. מה לומדים?
2. הסבר
3. דוגמה
4. בואו נפתור
5. נסו בעצמכם
6. שימו לב!
7. בואו נתרגל!

All pages: `age_band: grades_1_2`, `approval_status: draft`, `grade: g2`.

---

## Regenerate review pack

```bash
node scripts/build-hebrew-g2-hebrew-review-pack.mjs
node scripts/verify-hebrew-g2-book-content.mjs
```

---

## Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, SQL, commit, push, or deploy
- ❌ No practice mappings or runtime wiring
- ✅ Documentation and draft markdown only
