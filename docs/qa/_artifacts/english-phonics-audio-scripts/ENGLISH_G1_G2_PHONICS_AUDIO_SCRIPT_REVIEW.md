# English G1/G2 Phonics — Audio Script Review (Phase 4B Step 3A)

> **Status:** Owner-review artifact · Step 3A cleanup + decision lock · Generated 2026-06-09  
> **Generator:** `node scripts/qa/extract-english-phonics-audio-scripts.mjs`  
> **Baseline registry:** Phase 4B Step 2 complete (registry + skill index + sequence meta)

---

## 1. Baseline

| Item | Value |
|------|-------|
| G1 phonics pages | **12** |
| G2 phonics-review pages | **11** |
| Total phonics pages | **23** |
| Sections per page | **7** (§01–§07) |
| G1 section audio slots (future) | **84** (12 × 7) |
| G2 section audio slots (future) | **77** (11 × 7) |
| **Total section audio slots** | **161** |
| Slots represented in this artifact | **161** |
| Audio files generated | **None** |
| Manifest entries added | **None** |
| Step 3A draft fixes | `letters_lower` typo fixed; `phonics_blending` mat removed |

Future manifest key pattern (not created yet): `english:{grade}:{pageId}:section:{NN}`  
Future public path pattern: `/audio/learning-books/english/{grade}/{pageId}/section-{NN}.mp3`

---

## 2. Locked owner decisions (Step 3A)

### 2.1 Accent — **LOCKED: US English only**

| Decision | Locked value |
|----------|--------------|
| Accent | **US English only** — no UK clips anywhere in G1/G2 phonics |
| Letter Z | **zee** (not zed) |
| Letter H | **aitch** (not haitch) |
| Vowels | **US vowel quality** throughout (e.g. cat, hot, run) — do not mix US/UK |
| Pace | Child-directed, slow, clear |
| Hebrew narration | Natural, simple Hebrew for section framing |
| English tokens | Spoken in English — not transliterated into Hebrew in recordings |

### 2.2 Letter name vs letter sound — **separate clip types**

| Rule | Detail |
|------|--------|
| Letter names | Spoken as alphabet names (A, B, C…) in `letter-name` clips only |
| Letter sounds | Spoken as isolated phoneme sounds in `letter-sound` clips only |
| **C letter name** | **"see"** — US letter name |
| **C in cat** | Hard **c/k** sound — not "see" |
| Child-facing text | No IPA symbols; owner-review notes may describe sounds in plain English |
| Do not blur | Narration must not mix name clips and sound clips in one undifferentiated take |

### 2.3 CVC blending pacing — **locked format**

| Rule | Detail |
|------|--------|
| Format | `c … a … t → cat` (slow segmented sounds, short clear pauses, then whole word) |
| Pages | `first_words_cvc`, `phonics_blending`, `word_families_cvc` |
| Child-facing text | No phonetic notation beyond dots and arrow |
| Recording | Owner confirms pause length at session — format is locked |

### 2.4 Sight word **I**

| Context | Rule |
|---------|------|
| Child-facing text | **I — אני** (simple) |
| Owner note | Uppercase **I** is both the letter name and the pronoun in sentence context (`I see a cat.`) |
| Recording | Same US pronunciation; context (word list vs sentence) makes meaning clear |

### 2.5 Classroom commands — **friendly delivery**

| Rule | Detail |
|------|--------|
| Pages | `listening_classroom`, `listening_commands` |
| Tone | Slow, clear, **friendly** — not quiz-like or harsh |
| Examples | Stand up. · Sit down. · Open your book. · Point to the door. |

### 2.6 Sentence exposure — **exposure only**

| Rule | Detail |
|------|--------|
| Pages | `early_sentences_exposure`, `listening_comprehension` |
| Examples | I see a cat. · It is red. |
| Delivery | Slow, neutral — **not** grammar quiz or translation drill |
| Purpose | Hear, repeat, match picture — no rule testing |

---

## 3. Per-page script tables

Each row is one future book-section audio slot. **Proposed spoken text** is derived from draft §1–§7 body copy (markdown stripped). Owner may edit phrasing before recording; locked decisions in §2 are canonical.

### G1 · `letters_upper` · אותיות גדולות A–Z

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד אותיות גדולות באנגלית — A, B, C ועד Z. אות גדולה היא כמו "ראש גדול" של האות. זה הצעד הראשון לקריאה באנגלית. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_upper:section:01` |
| 02 | הסבר | באנגלית יש 26 אותיות גדולות. נלמד אותן בקבוצות קטנות: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z לכל אות יש שם — למשל האות A נקראת "A". -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_upper:section:02` |
| 03 | דוגמה | רואים את האות B — אומרים: B. רואים את האות M — אומרים: M. B ו-M — שתי אותיות גדולות שונות. -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g1:letters_upper:section:03` |
| 04 | בואו נפתור | שאלה: איזו אות גדולה זו? K שלב 1: מסתכלים על הצורה — קו אחד למטה, קווים למעלה. שלב 2: זוכרים את השם — K. תשובה: K -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g1:letters_upper:section:04` |
| 05 | נסו בעצמכם | איזו אות גדולה זו? S (רמז: נראית כמו נחש קטן.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:letters_upper:section:05` |
| 06 | שימו לב! | קל לבלבל בין אותיות שנראות דומה. האות O (עיגול) — לא זהה ל-Q (עם זנב). כל אות גדולה יש לה צורה ושם משלה. זכרו: אנגלית — לא עברית. אות A באנגלית היא לא אָלֶף. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:letters_upper:section:06` |
| 07 | בואו נתרגל! | עכשיו התחלתם להכיר אותיות גדולות באנגלית. בעמודים הבאים נלמד אותיות קטנות ונשמע את השמות. | Hebrew | narration | — | `english:g1:letters_upper:section:07` |

### G1 · `letters_lower` · אותיות קטנות a–z

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד אותיות קטנות באנגלית — a, b, c ועד z. לכל אות גדולה יש גם גרסה קטנה: A → a, B → b. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_lower:section:01` |
| 02 | הסבר | אותיות קטנות נמצאות במילים שאנחנו קוראים. a b c d e f g h i j k l m n o p q r s t u v w x y z האות a קטנה — נראית כמו "ראש קטן". -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_lower:section:02` |
| 03 | דוגמה | רואים d — אומרים: d. רואים t — אומרים: t. d ו-t — שתי אותיות קטנות. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_lower:section:03` |
| 04 | בואו נפתור | שאלה: איזו אות קטנה זו? p שלב 1: יש "בטן" למטה — כך נראית האות p. שלב 2: השם — p. תשובה: p -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_lower:section:04` |
| 05 | נסו בעצמכם | איזו אות קטנה זו? b (רמז: לא d — הבטן מצד אחר.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:letters_lower:section:05` |
| 06 | שימו לב! | קל לבלבל: b ו-d — נראות דומה. p ו-q — מראה כמו מראה. מסתכלים בקפידה על הצד של ה"בטן". -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:letters_lower:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים גם אותיות קטנות. בעמוד הבא נתאים בין גדולות לקטנות — A עם a. | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_lower:section:07` |

### G1 · `letters_match` · התאמת אות גדולה וקטנה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד לחבר בין אות גדולה לאות קטנה של אותה אות. A ו-a — אותה אות, רק בגודל שונה. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:letters_match:section:01` |
| 02 | הסבר | לכל אות יש זוג: A — a B — b C — c D — d … וכך עד Z — z. 26 זוגות בסך הכל. -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g1:letters_match:section:02` |
| 03 | דוגמה | רואים M גדולה — הזוג שלה: m קטנה. M ↔ m רואים f קטנה — הזוג שלה: F גדולה. F ↔ f -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g1:letters_match:section:03` |
| 04 | בואו נפתור | שאלה: מה הזוג של H? שלב 1: H גדולה — מחפשים h קטנה. שלב 2: h — אותה אות. תשובה: h -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g1:letters_match:section:04` |
| 05 | נסו בעצמכם | מה הזוג של k קטנה? (רמז: האות הגדולה היא K.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:letters_match:section:05` |
| 06 | שימו לב! | G לא מתאים ל-g? — כן מתאים! G ↔ g. רק אותה אות — לא אות אחרת. S לא מתאים ל-z. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:letters_match:section:06` |
| 07 | בואו נתרגל! | עכשיו יודעים לחבר גדולות וקטנות. בעמוד הבא נשמע את שמות האותיות — לא רק נראה אותן. | Hebrew | narration | — | `english:g1:letters_match:section:07` |

### G1 · `letter_names` · שמות האותיות

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד את שמות האותיות באנגלית. יש הבדל בין שם האות לבין צליל שהאות עושה במילה — נלמד את שניהם בהמשך. -- | Hebrew | narration | — | `english:g1:letter_names:section:01` |
| 02 | הסבר | כשאומרים את שם האות: A — "A" (איי) B — "B" (בי) C — "see" (סי) זה לא תמיד הצליל הראשון במילה! למשל: ב-cat האות c עושה צליל k קצר — לא "see" (שם האות C). -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:letter_names:section:02` |
| 03 | דוגמה | שומעים: "A" — זה שם האות A. שומעים: "M" — זה שם האות M. עכשיו אפשר לחזור על A, B, C, D, E… -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:letter_names:section:03` |
| 04 | בואו נפתור | שאלה: מה שם האות? F שלב 1: מזהים את הצורה F. שלב 2: השם — F. תשובה: F -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:letter_names:section:04` |
| 05 | נסו בעצמכם | מה שם האות J? (רמז: "ג'יי" באנגלית.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:letter_names:section:05` |
| 06 | שימו לב! | שם האות W — לא "ו" בעברית. שם האות ≠ תמיד הצליל הראשון במילה. קודם לומדים שמות — אחר כך צלילים במילים. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:letter_names:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים שמות אותיות. בעמוד הבא נלמד צלילי אותיות — הקול שהן עושות. | Hebrew | narration | — | `english:g1:letter_names:section:07` |

### G1 · `phonics_sounds` · צלילי אותיות

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד צלילים — הקול שהאות עושה. לא שם האות — צליל כמו ב-start של מילה. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:phonics_sounds:section:01` |
| 02 | הסבר | צלילי עיצורים (דוגמאות): b — כמו ב-bat m — כמו ב-mom s — כמו ב-sun תנועות קצרות: a — כמו ב-cat e — כמו ב-bed i — כמו ב-sit -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:phonics_sounds:section:02` |
| 03 | דוגמה | האות m — צליל כמו בהתחלה של mom. האות t — צליל כמו בהתחלה של top. שומעים את הצליל — מחברים לאות. -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:phonics_sounds:section:03` |
| 04 | בואו נפתור | שאלה: איזה צליל עושה האות s? שלב 1: חושבים על sun — צליל sss. שלב 2: s — צליל ססס. תשובה: s -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:phonics_sounds:section:04` |
| 05 | נסו בעצמכם | איזה צליל עושה b? (רמז: כמו ב-ball.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:phonics_sounds:section:05` |
| 06 | שימו לב! | שם האות C ("סי") — לא הצליל ב-cat. כאן לומדים צליל — לא שם. לא כל מילה באנגלית נשמעת כמו בעברית. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:phonics_sounds:section:06` |
| 07 | בואו נתרגל! | עכשיו התחלתם לשמוע צלילי אותיות. בעמוד הבא נשמע את הצליל הראשון במילה. | Hebrew | narration | — | `english:g1:phonics_sounds:section:07` |

### G1 · `phonics_first_sound` · הצליל הראשון במילה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד מה הצליל הראשון במילה באנגלית. שומעים מילה — מוצאים את הצליל שמתחיל אותה. -- | Hebrew | narration | — | `english:g1:phonics_first_sound:section:01` |
| 02 | הסבר | cat — הצליל הראשון כמו c (cat). dog — הצליל הראשון כמו d (dog). sun — הצליל הראשון כמו s (sun). לא כותבים עדיין — רק שומעים. -- | mixed | word | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:phonics_first_sound:section:02` |
| 03 | דוגמה | מילה: mom הצליל הראשון — mmm — כמו m. מילה: pen הצליל הראשון — ppp — כמו p. -- | mixed | word | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:phonics_first_sound:section:03` |
| 04 | בואו נפתור | שאלה: מה הצליל הראשון ב-cat? שלב 1: אומרים לאט: cat… שלב 2: הצליל הראשון — כמו c — האות c. תשובה: c -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Separate clips: letter-name vs letter-sound (C name = see; c in cat = hard c/k sound); Hebrew narration + embedded English clips | `english:g1:phonics_first_sound:section:04` |
| 05 | נסו בעצמכם | מה הצליל הראשון ב-sun? (רמז: sss…) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:phonics_first_sound:section:05` |
| 06 | שימו לב! | הצליל הראשון ב-cat — לא "סי" (שם האות C). שומעים את המילה — לא מנחשים מהעברית. dog לא מתחיל כמו "ד" בעברית — שומעים d באנגלית. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:phonics_first_sound:section:06` |
| 07 | בואו נתרגל! | עכשיו יודעים למצוא צליל ראשון. בעמודים הבאים נלמד מילים מהכיתה — עם תמונות והאזנה. | Hebrew | narration | — | `english:g1:phonics_first_sound:section:07` |

### G1 · `classroom_words` · מילים בכיתה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד מילים מהכיתה באנגלית. נשמע, נראה, ונחבר מילה לתמונה — קודם שומעים. -- | Hebrew | narration | — | `english:g1:classroom_words:section:01` |
| 02 | הסבר | מילים שימושיות: book — ספר pen — עט desk — שולחן כתיבה chair — כיסא door — דלת teacher — מורה hello — שלום bye — להתראות -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:classroom_words:section:02` |
| 03 | דוגמה | מורה מחזיקה book — ספר. תלמיד יושב על chair — כיסא. שומעים: "hello" — אומרים hello בחזרה. -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:classroom_words:section:03` |
| 04 | בואו נפתור | שאלה: מה זה pen? שלב 1: חושבים — כלי כתיבה. שלב 2: pen — עט. תשובה: pen (עט) -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:classroom_words:section:04` |
| 05 | נסו בעצמכם | מה זה desk? (רמז: יושבים לידו בכיתה.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:classroom_words:section:05` |
| 06 | שימו לב! | book ו-pen — לא אותו דבר. teacher — המורה, לא הדלת. כרגע — מילה אחת בכל פעם. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:classroom_words:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים מילים מהכיתה. בעמוד הבא — מילים פשוטות נוספות: cat, dog, sun. | mixed | narration | Hebrew narration + embedded English clips | `english:g1:classroom_words:section:07` |

### G1 · `first_words_simple` · מילים פשוטות ראשונות

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד מילים פשוטות באנגלית — חיות, שמש, צבעים, משפחה. נשמע את המילה ונחבר לתמונה. -- | Hebrew | narration | — | `english:g1:first_words_simple:section:01` |
| 02 | הסבר | cat — חתול dog — כלב sun — שמש red — אדום blue — כחול mom — אמא dad — אבא -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:first_words_simple:section:02` |
| 03 | דוגמה | תמונה של חתול — cat. שמש בחלון — sun. הכדור red — אדום. -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:first_words_simple:section:03` |
| 04 | בואו נפתור | שאלה: איזו מילה מתאימה לכלב? שלב 1: חושבים — כלב באנגלית. שלב 2: dog. תשובה: dog -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:first_words_simple:section:04` |
| 05 | נסו בעצמכם | איזו מילה — אמא? (רמז: mom.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:first_words_simple:section:05` |
| 06 | שימו לב! | cat — לא dog. red ו-blue — צבעים, לא חיות. עדיין לא קוראים משפטים — מילה אחת בכל פעם. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:first_words_simple:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים מילים פשוטות. בעמוד הבא — מילים קצרות עם שלוש אותיות (CVC). | mixed | narration | Hebrew narration + embedded English clips | `english:g1:first_words_simple:section:07` |

### G1 · `first_words_cvc` · מילים עם שלוש אותיות (CVC)

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד מילים קצרות — שלוש אותיות: עיצור, תנועה, עיצור. למשל: c + a + t → cat. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:first_words_cvc:section:01` |
| 02 | הסבר | cat — c + a + t hat — h + a + t sit — s + i + t sun — s + u + n pen — p + e + n bed — b + e + d לא כל מילה באנגלית ככה — רק התחלה. -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c …  | mixed | word | Slow blend clips in §2–§4; Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g1:first_words_cvc:section:02` |
| 03 | דוגמה | cat — שומעים לאט: c … a … t → cat. sit — שומעים לאט: s … i … t → sit. מחברים צלילים — יוצאת מילה. -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Slow blend clips in §2–§4; Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g1:first_words_cvc:section:03` |
| 04 | בואו נפתור | שאלה: איזו מילה — שומעים לאט: p … e … n? שלב 1: מחברים צלילים. שלב 2: pen. תשובה: pen -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g1:first_words_cvc:section:04` |
| 05 | נסו בעצמכם | איזו מילה — c + a + t? (רמז: cat.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:first_words_cvc:section:05` |
| 06 | שימו לב! | sun — לא sit (תנועה שונה). hat ו-cat — סוף דומה (-at). בדף הזה — רק 6 מילים לדוגמה. עוד נלמד בהמשך. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:first_words_cvc:section:06` |
| 07 | בואו נתרגל! | עכשיו שמעתם מילים CVC קצרות. בעמוד הבא — נחבר תמונה למילה. | mixed | narration | Hebrew narration + embedded English clips | `english:g1:first_words_cvc:section:07` |

### G1 · `picture_word_match` · תמונה ומילה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נחבר תמונה למילה באנגלית. רק מילים שלמדנו — cat, book, sun, pen ועוד. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:picture_word_match:section:01` |
| 02 | הסבר | רואים תמונה — בוחרים את המילה הנכונה. תמונה של חתול → cat תמונה של ספר → book תמונה של שמש → sun שומעים מילה — מוצאים את התמונה. -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a  | mixed | word | Hebrew narration + embedded English clips | `english:g1:picture_word_match:section:02` |
| 03 | דוגמה | תמונה: עט. המילה: pen. תמונה: כיסא. המילה: chair. -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:picture_word_match:section:03` |
| 04 | בואו נפתור | שאלה: איזו מילה מתאימה לתמונה של dog? שלב 1: מזהים — כלב. שלב 2: dog. תשובה: dog -- | mixed | word | Hebrew narration + embedded English clips | `english:g1:picture_word_match:section:04` |
| 05 | נסו בעצמכם | איזו מילה — תמונה של hat? (רמז: כובע — hat.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:picture_word_match:section:05` |
| 06 | שימו לב! | cat על תמונה של dog — לא נכון. משתמשים רק במילים מהעמודים הקודמים. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:picture_word_match:section:06` |
| 07 | בואו נתרגל! | עכשיו יודעים לחבר תמונה ומילה. בעמוד הבא — הוראות קצרות באנגלית. | Hebrew | narration | — | `english:g1:picture_word_match:section:07` |

### G1 · `listening_classroom` · הוראות בכיתה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד להקשיב להוראות קצרות באנגלית בכיתה. שלב אחד בכל פעם — קודם שומעים. -- | Hebrew | narration | — | `english:g1:listening_classroom:section:01` |
| 02 | הסבר | [Hebrew intro from narration] «Stand up.» · «Sit down.» · «Open your book.» · «Close your book.» [Slow, clear, friendly — not quiz-like] | mixed | command | Commands: slow, clear, friendly — not quiz-like or harsh; Hebrew narration + embedded English clips | `english:g1:listening_classroom:section:02` |
| 03 | דוגמה | [Hebrew intro from narration] «Stand up.» · «Sit down.» [Slow, clear, friendly — not quiz-like] | mixed | command | Commands: slow, clear, friendly — not quiz-like or harsh; Hebrew narration + embedded English clips | `english:g1:listening_classroom:section:03` |
| 04 | בואו נפתור | שאלה: מה עושים כששומעים "Open your book"? שלב 1: open = פתיחה. שלב 2: book = ספר. שלב 3: פותחים את הספר. תשובה: פותחים את הספר -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:listening_classroom:section:04` |
| 05 | נסו בעצמכם | מה עושים אחרי "Sit down"? (רמז: יושבים.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:listening_classroom:section:05` |
| 06 | שימו לב! | Stand up — לא Sit down. שומעים קודם — לא מנחשים מהעברית. כל הוראה קצרה — עושים לאט וביחד. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:listening_classroom:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים הוראות כיתה. בעמוד הבא — עוד הוראות קצרות. | Hebrew | narration | — | `english:g1:listening_classroom:section:07` |

### G1 · `listening_commands` · עוד הוראות קצרות

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד עוד הוראות — עם מילים שלמדנו. שומעים — בוחרים תמונה של הפעולה או החפץ. -- | Hebrew | narration | — | `english:g1:listening_commands:section:01` |
| 02 | הסבר | [Hebrew intro from narration] «Point to the door.» · «Show me your pen.» · «Listen.» · «Look.» [Slow, clear, friendly — not quiz-like] | mixed | command | Commands: slow, clear, friendly — not quiz-like or harsh; Hebrew narration + embedded English clips | `english:g1:listening_commands:section:02` |
| 03 | דוגמה | [Hebrew intro from narration] «Show me your pen.» · «Point to the door.» [Slow, clear, friendly — not quiz-like] | mixed | command | Commands: slow, clear, friendly — not quiz-like or harsh; Hebrew narration + embedded English clips | `english:g1:listening_commands:section:03` |
| 04 | בואו נפתור | שאלה: איזו תמונה מתאימה ל-"Point to the door"? שלב 1: door — דלת. שלב 2: בוחרים תמונה של דלת. תשובה: תמונה של door -- | mixed | narration | Hebrew narration + embedded English clips | `english:g1:listening_commands:section:04` |
| 05 | נסו בעצמכם | מה מראים ב-"Show me your pen"? (רמז: pen — עט.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g1:listening_commands:section:05` |
| 06 | שימו לב! | pen — לא book. הוראה אחת בכל פעם — לא שני שלבים מורכבים. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g1:listening_commands:section:06` |
| 07 | בואו נתרגל! | סיימתם את יסודות האותיות, הצלילים, המילים וההאזנה בכיתה א׳. כל הכבוד! בעמודים הבאים נפגוש עוד מילים ונחזור על מה שלמדנו. | Hebrew | narration | — | `english:g1:listening_commands:section:07` |

### G2 · `letters_review` · חזרה: אותיות ושמות

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום חוזרים על אותיות באנגלית — גדולות, קטנות ושמות. מניחים שעברתם על יסודות כיתה א׳. -- | Hebrew | narration | — | `english:g2:letters_review:section:01` |
| 02 | הסבר | A a — B b — C c … Z z שם האות A — "A". שם האות Z — "Z". זוגות: M ↔ m, S ↔ s. -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g2:letters_review:section:02` |
| 03 | דוגמה | G גדולה — g קטנה — שם: G. r קטנה — R גדולה — שם: R. -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g2:letters_review:section:03` |
| 04 | בואו נפתור | שאלה: מה הזוג של N? שלב 1: N גדולה. שלב 2: n קטנה. תשובה: n -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g2:letters_review:section:04` |
| 05 | נסו בעצמכם | מה שם האות L? (רמז: L.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:letters_review:section:05` |
| 06 | שימו לב! | b ו-d — עדיין קל לבלבל. חזרה מהירה — לא מבחן. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:letters_review:section:06` |
| 07 | בואו נתרגל! | חזרתם על אותיות. בעמוד הבא — סדר האלף בית. | Hebrew | narration | — | `english:g2:letters_review:section:07` |

### G2 · `letters_order` · סדר האלף בית

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד את סדר האותיות — A, B, C … עד Z. כמו "אלף בית" — אבל באנגלית. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:letters_order:section:01` |
| 02 | הסבר | A — B — C — D — E — F — G H — I — J — K — L — M — N O — P — Q — R — S — T U — V — W — X — Y — Z אחרי M באה N. אחרי S באה T. -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g2:letters_order:section:02` |
| 03 | דוגמה | מה בא אחרי C? D מה בא לפני F? E -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g2:letters_order:section:03` |
| 04 | בואו נפתור | שאלה: מה בא אחרי K? שלב 1: … H I J K … שלב 2: L. תשובה: L -- [Pause between letter-name clips where letters appear in bold.] | mixed | letter-name | Hebrew narration + embedded English clips | `english:g2:letters_order:section:04` |
| 05 | נסו בעצמכם | מה בא אחרי M? (רמז: N.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:letters_order:section:05` |
| 06 | שימו לב! | W לא אחרי V? — כן, V — W. לא צריך לכתוב — רק לזכור סדר. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:letters_order:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים סדר האותיות. בעמוד הבא — חזרה על צלילים. | Hebrew | narration | — | `english:g2:letters_order:section:07` |

### G2 · `phonics_sounds_review` · חזרה: צלילים

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום חוזרים על צלילי אותיות — עיצורים ותנועות קצרות. גם נשמיע הבדלים: b ו-p, d ו-t. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:phonics_sounds_review:section:01` |
| 02 | הסבר | b — bat (עם "ב") p — pen (עם "פ") d — dog t — top תנועות: a cat, e bed, i sit, o hot, u sun. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:phonics_sounds_review:section:02` |
| 03 | דוגמה | שומעים צליל b — זה b, לא p. שומעים צליל t — זה t, לא d. -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Hebrew narration + embedded English clips | `english:g2:phonics_sounds_review:section:03` |
| 04 | בואו נפתור | שאלה: איזה צליל — p או b? שומעים: pen — צליל ppp בתחילת המילה. תשובה: p -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Hebrew narration + embedded English clips | `english:g2:phonics_sounds_review:section:04` |
| 05 | נסו בעצמכם | איזה צליל — dog — d או t? (רמז: d.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:phonics_sounds_review:section:05` |
| 06 | שימו לב! | b ו-p — נשמעים דומה — שומעים בקפידה. שם האות ≠ צליל. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:phonics_sounds_review:section:06` |
| 07 | בואו נתרגל! | חזרתם על צלילים. בעמוד הבא — חיבור צלילים למילה. | Hebrew | narration | — | `english:g2:phonics_sounds_review:section:07` |

### G2 · `phonics_blending` · חיבור צלילים

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד לחבר צלילים — c-a-t → cat. זו מיומנות מרכזית בכיתה ב׳. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:phonics_blending:section:01` |
| 02 | הסבר | cat — שומעים לאט: c … a … t → cat hat — שומעים לאט: h … a … t → hat sit — שומעים לאט: s … i … t → sit run — שומעים לאט: r … u … n → run big — שומעים לאט: b … i … g → big red — שומעים לאט: r … e … d → red hot — שומעים לאט | mixed | word | Segmented + blended CVC; Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g2:phonics_blending:section:02` |
| 03 | דוגמה | cat — מפרידים: c … a … t → cat שומעים לאט: c … a … t … cat! -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Segmented + blended CVC; Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g2:phonics_blending:section:03` |
| 04 | בואו נפתור | שאלה: חברו — שומעים לאט: s … u … n שלב 1: מחברים. שלב 2: sun. תשובה: sun -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g2:phonics_blending:section:04` |
| 05 | נסו בעצמכם | חברו — שומעים לאט: r … e … d (רמז: red.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:phonics_blending:section:05` |
| 06 | שימו לב! | לא מדלגים על תנועה באמצע. שומעים כל צליל — אחר כך מילה שלמה. עדיין לא כל מילה באנגלית — רק CVC לדוגמה. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:phonics_blending:section:06` |
| 07 | בואו נתרגל! | עכשיו יודעים לחבר צלילים. בעמוד הבא — צליל ↔ אות חזק יותר. | Hebrew | narration | — | `english:g2:phonics_blending:section:07` |

### G2 · `sound_letter_match` · צליל ↔ אות

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נחזק חיבור בין צליל לאות — בשני הכיוונים. שומעים צליל mmm — בוחרים M. רואים S — אומרים צליל sss. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:sound_letter_match:section:01` |
| 02 | הסבר | צליל → אות: צליל mmm → M צליל sss → S צליל כמו ב-cat → C אות → צליל: B → bbb T → ttt -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Hebrew narration + embedded English clips | `english:g2:sound_letter_match:section:02` |
| 03 | דוגמה | שומעים mmm — M. רואים F — fff. -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Hebrew narration + embedded English clips | `english:g2:sound_letter_match:section:03` |
| 04 | בואו נפתור | שאלה: איזו אות — צליל כמו ב-cat? שלב 1: cat מתחיל ב-c. שלב 2: C. תשובה: C -- [Isolate each consonant/vowel sound with a short pause.] | mixed | letter-sound | Hebrew narration + embedded English clips | `english:g2:sound_letter_match:section:04` |
| 05 | נסו בעצמכם | איזה צליל — H? (רמז: hhh — hat.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:sound_letter_match:section:05` |
| 06 | שימו לב! | צליל cat לא תמיד K — לפעמים C (cat). משתמשים במילים שלמדנו. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:sound_letter_match:section:06` |
| 07 | בואו נתרגל! | עכשיו מחברים צליל ואות בביטחון. בעמוד הבא — קריאת מילים ראשונה. | Hebrew | narration | — | `english:g2:sound_letter_match:section:07` |

### G2 · `first_word_reading` · קריאת מילים ראשונה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום קוראים מילים — CVC ומילים קצרות מיוחדות. the, I, a, is — רואים הרבה באנגלית. -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:first_word_reading:section:01` |
| 02 | הסבר | CVC: cat, sit, run מילים קצרות (sight): the — מילה קטנה לפני שם, למשל: the cat I — אני a — מילה קטנה לפני שם עצם, למשל: a cat is — מילה קצרה במשפט, למשל: it is red -- | mixed | word | Includes sight words the, I, a, is; Hebrew narration + embedded English clips | `english:g2:first_word_reading:section:02` |
| 03 | דוגמה | קוראים: cat. קוראים: I — אני. I am — לא עכשיו — רק I ו-is בנפרד. -- | mixed | word | Includes sight words the, I, a, is; Hebrew narration + embedded English clips | `english:g2:first_word_reading:section:03` |
| 04 | בואו נפתור | שאלה: קראו sit שלב 1: שומעים לאט: s … i … t שלב 2: sit תשובה: sit -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Hebrew narration + embedded English clips | `english:g2:first_word_reading:section:04` |
| 05 | נסו בעצמכם | קראו the (רמז: "דה" — the.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:first_word_reading:section:05` |
| 06 | שימו לב! | I — אות גדולה קטנה — כאן I = אני. is — מילה קצרה — קוראים אותה במשפטים קצרים. בדף הזה — רק מילים מהרשימה. -- | mixed | narration | Owner: uppercase I = letter name and pronoun in sentence context; child text: I — אני; Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:first_word_reading:section:06` |
| 07 | בואו נתרגל! | התחלתם לקרוא מילים. בעמוד הבא — משפחות מילים (-at, -an…). | mixed | narration | Hebrew narration + embedded English clips | `english:g2:first_word_reading:section:07` |

### G2 · `word_families_cvc` · משפחות מילים

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום נלמד משפחות מילים — סוף דומה, התחלה משתנה. at: cat, hat, bat an: man, can, fan -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:word_families_cvc:section:01` |
| 02 | הסבר | at — cat, hat, bat an — man, can, fan it — sit, hit, bit og — dog, log, fog משנים רק ההתחלה — הסוף נשאר. -- | mixed | word | Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g2:word_families_cvc:section:02` |
| 03 | דוגמה | cat → hat (c→h) sit → hit (s→h) dog → log (d→l) -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | English | word | Blend format locked: c … a … t → cat — short clear pauses | `english:g2:word_families_cvc:section:03` |
| 04 | בואו נפתור | שאלה: איזו מילה ב--at — לא cat? hat — גם -at. תשובה: hat (או bat) -- | mixed | word | Blend format locked: c … a … t → cat — short clear pauses; Hebrew narration + embedded English clips | `english:g2:word_families_cvc:section:04` |
| 05 | נסו בעצמכם | איזו מילה ב--og — לא dog? (רמז: log או fog.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:word_families_cvc:section:05` |
| 06 | שימו לב! | man — לא -at — זה -an. רק 4 משפחות — לא כל האנגלית. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:word_families_cvc:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים משפחות מילים. בעמוד הבא — אוצר מילים חדש מהכיתה. | Hebrew | narration | — | `english:g2:word_families_cvc:section:07` |

### G2 · `classroom_vocab_g2` · אוצר מילים בכיתה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום מילים חדשות על כיתה וחברים — באנגלית. נשמע, נראה, נחבר — מילה אחר מילה. -- | Hebrew | narration | — | `english:g2:classroom_vocab_g2:section:01` |
| 02 | הסבר | classroom — כיתה (החדר) playground — מגרש משחקים friend — חבר/ה read — לקרוא write — לכתוב listen — להקשיב -- | mixed | word | Hebrew narration + embedded English clips | `english:g2:classroom_vocab_g2:section:02` |
| 03 | דוגמה | ב-classroom — לומדים. ב-playground — משחקים. friend — חבר טוב. -- | mixed | word | Hebrew narration + embedded English clips | `english:g2:classroom_vocab_g2:section:03` |
| 04 | בואו נפתור | שאלה: מה זה listen? שלב 1: פעולה — אוזניים. שלב 2: listen — להקשיב. תשובה: listen (להקשיב) -- | mixed | word | Hebrew narration + embedded English clips | `english:g2:classroom_vocab_g2:section:04` |
| 05 | נסו בעצמכם | מה זה friend? (רמז: חבר — friend.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:classroom_vocab_g2:section:05` |
| 06 | שימו לב! | read ו-write — לא אותו דבר. playground — מילה ארוכה — שומעים לאט. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:classroom_vocab_g2:section:06` |
| 07 | בואו נתרגל! | עכשיו מכירים מילים חדשות. בעמוד הבא — הבנת הנשמע. | Hebrew | narration | — | `english:g2:classroom_vocab_g2:section:07` |

### G2 · `listening_comprehension` · הבנת הנשמע

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום שומעים משפט קצר — ובוחרים תמונה נכונה. לא מתרגמים לעברית — מבינים ממה ששומעים. -- | Hebrew | narration | — | `english:g2:listening_comprehension:section:01` |
| 02 | הסבר | דוגמה 1: "I see a cat." — רואה חתול → תמונה של cat. דוגמה 2: "My friend is happy." — חבר שמח. דוגמה 3: "We read in the classroom." — קוראים בכיתה. דוגמה 4: "Listen to the teacher." — מקשיבים למורה. -- [Exposure only: slo | mixed | sentence | Hebrew narration + embedded English clips | `english:g2:listening_comprehension:section:02` |
| 03 | דוגמה | שומעים: "I see a dog." שאלה: מה רואים? dog — כלב — תמונה של dog. -- [Exposure only: slow, neutral tone — not grammar quiz or translation] | mixed | sentence | Hebrew narration + embedded English clips | `english:g2:listening_comprehension:section:03` |
| 04 | בואו נפתור | שאלה: שומעים "We play in the playground." איפה משחקים? שלב 1: playground — מגרש. שלב 2: תמונה של playground. תשובה: playground -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:listening_comprehension:section:04` |
| 05 | נסו בעצמכם | שומעים: "My friend is here." מי כאן? (רמז: friend — חבר.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:listening_comprehension:section:05` |
| 06 | שימו לב! | בוחרים תמונה — לא כותבים בעברית. משפט קצר — מילה או שתיים חשובות. -- | Hebrew | narration | Contrast pairs — keep calm, not punitive tone | `english:g2:listening_comprehension:section:06` |
| 07 | בואו נתרגל! | עכשיו מתרגלים הבנת הנשמע. בעמוד הבא — תמונה, שמע ומילה יחד. | Hebrew | narration | — | `english:g2:listening_comprehension:section:07` |

### G2 · `picture_audio_word_match` · תמונה, שמע ומילה

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום מחברים שלושה דברים: שומעים מילה, רואים תמונה, רואים את המילה בכתב. סיכום של מה שלמדנו ביסודות. -- | Hebrew | narration | — | `english:g2:picture_audio_word_match:section:01` |
| 02 | הסבר | שומעים: "cat" תמונה: חתול כתוב: cat שלושתם — אותו דבר. -- | mixed | word | Hebrew narration + embedded English clips | `english:g2:picture_audio_word_match:section:02` |
| 03 | דוגמה | sun — שומעים לאט: s … u … n — תמונה של שמש — sun. book — ספר — book. -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Hebrew narration + embedded English clips | `english:g2:picture_audio_word_match:section:03` |
| 04 | בואו נפתור | שאלה: שומעים "pen" — איזו תמונה? איזו מילה? שלב 1: pen — עט. שלב 2: תמונה של עט + pen. תשובה: pen + תמונת pen -- [Blend pacing locked: slow segmented sounds, short pauses, then whole word — e.g. c … a … t → cat] | mixed | word | Hebrew narration + embedded English clips | `english:g2:picture_audio_word_match:section:04` |
| 05 | נסו בעצמכם | שומעים "friend" — מה המילה? (רמז: friend.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:picture_audio_word_match:section:05` |
| 06 | שימו לב! | cat ≠ dog — גם בשמיעה. רק מילים מהיחידה — לא מילים חדשות. -- | mixed | narration | Hebrew narration + embedded English clips; Contrast pairs — keep calm, not punitive tone | `english:g2:picture_audio_word_match:section:06` |
| 07 | בואו נתרגל! | עכשיו מחברים שמע, תמונה ומילה. בעמוד הבא — משפטים קצרים — חשיפה בלבד. | Hebrew | narration | — | `english:g2:picture_audio_word_match:section:07` |

### G2 · `early_sentences_exposure` · משפטים קצרים

| Sec | Heading | Proposed spoken text | Lang | Audio type | Owner notes | Future manifest key |
|-----|---------|----------------------|------|------------|-------------|---------------------|
| 01 | מה לומדים? | היום שומעים וקוראים משפטים קצרים — 3–5 מילים. שומעים — חוזרים — בוחרים תמונה. -- | Hebrew | narration | — | `english:g2:early_sentences_exposure:section:01` |
| 02 | הסבר | I see a cat. — אני רואה חתול. It is red. — זה אדום. I am happy. — אני שמח/ה. We listen. — אנחנו מקשיבים. שומעים — חוזרים — בוחרים תמונה. -- [Exposure only: slow, neutral tone — not grammar quiz or translation] | mixed | sentence | Exposure only — I see a cat / It is red: slow, neutral, no grammar quiz; Hebrew narration + embedded English clips | `english:g2:early_sentences_exposure:section:02` |
| 03 | דוגמה | I see a cat. תמונה: חתול. לא כותבים עברית — מבינים מ cat ו-see. -- [Exposure only: slow, neutral tone — not grammar quiz or translation] | mixed | sentence | Hebrew narration + embedded English clips | `english:g2:early_sentences_exposure:section:03` |
| 04 | בואו נפתור | שאלה: איזו תמונה ל-"It is red"? שלב 1: red — אדום. שלב 2: תמונה אדומה (תפוח, כדור…). תשובה: תמונה של משהו red -- | mixed | narration | Hebrew narration + embedded English clips | `english:g2:early_sentences_exposure:section:04` |
| 05 | נסו בעצמכם | We listen. — מה עושים? (רמז: listen — מקשיבים.) -- | mixed | narration | Hebrew narration + embedded English clips; Self-check — optional shorter narration | `english:g2:early_sentences_exposure:section:05` |
| 06 | שימו לב! | חשיפה — שומעים ומבינים עם תמונה. משפט קצר — מילה או שתיים חשובות. לא צריך לזכור כללים — רק להקשיב ולחזור. -- | Hebrew | narration | Contrast pairs — keep calm, not punitive tone | `english:g2:early_sentences_exposure:section:06` |
| 07 | בואו נתרגל! | סיימתם את יסודות הקריאה וההאזנה בכיתה ב׳. כל הכבוד! בעמודים הבאים נפגוש עוד מילים ונחזור על מה שלמדנו. | Hebrew | narration | — | `english:g2:early_sentences_exposure:section:07` |


---

## 4. Consolidated English pronunciation list

All English tokens extracted from draft §1–§7 (bold and quoted). Pronunciation notes reflect **locked US accent** and **separate name/sound rules**.

| Token | Page(s) | Kind | Proposed pronunciation note |
|-------|---------|------|---------------------------|
| -an | g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| -at | g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| -it | g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| -og | g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| A | g2/first_word_reading; g2/letters_review; g2/phonics_sounds_review | letter name, letter sound | US letter name (A) — US English only (LOCKED) |
| b | g2/phonics_sounds_review; g2/sound_letter_match | letter name, letter sound | Short consonant/vowel sound as in example word on page (US accent) |
| bed | g1/first_words_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| big | g2/phonics_blending | word | Speak as whole English word; child-friendly pace (US accent) |
| blue | g1/first_words_simple | word | Speak as whole English word; child-friendly pace (US accent) |
| book | g2/picture_audio_word_match | word | Speak as whole English word; child-friendly pace (US accent) |
| bye | g1/classroom_words | word | Speak as whole English word; child-friendly pace (US accent) |
| C | g2/sound_letter_match | letter name | US letter name (C) — US English only (LOCKED) |
| cat | g2/first_word_reading; g2/phonics_blending; g2/picture_audio_word_match | word | Speak as whole English word; child-friendly pace (US accent) |
| chair | g1/classroom_words; g1/picture_word_match | word | Speak as whole English word; child-friendly pace (US accent) |
| classroom | g2/classroom_vocab_g2 | word | Speak as whole English word; child-friendly pace (US accent) |
| Close your book. | g1/listening_classroom | command | Classroom command — slow, clear, friendly imperative |
| D | g2/letters_order; g2/phonics_sounds_review | letter name, letter sound | US letter name (D) — US English only (LOCKED) |
| dad | g1/first_words_simple | word | Speak as whole English word; child-friendly pace (US accent) |
| desk | g1/classroom_words | word | Speak as whole English word; child-friendly pace (US accent) |
| dog | g2/listening_comprehension | word | Speak as whole English word; child-friendly pace (US accent) |
| door | g1/classroom_words; g1/listening_commands | word | Speak as whole English word; child-friendly pace (US accent) |
| E | g2/letters_order; g2/phonics_sounds_review | letter name, letter sound | US letter name (E) — US English only (LOCKED) |
| F | g2/sound_letter_match | letter name | US letter name (F) — US English only (LOCKED) |
| fog | g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| friend | g2/classroom_vocab_g2; g2/listening_comprehension; g2/picture_audio_word_match | word | Speak as whole English word; child-friendly pace (US accent) |
| G | g2/letters_review | letter name, letter sound | US letter name (G) — US English only (LOCKED) |
| H | g2/sound_letter_match | letter name | US letter name locked: aitch (not haitch) |
| hat | g2/phonics_blending; g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| hello | g1/classroom_words | word | Speak as whole English word; child-friendly pace (US accent) |
| hot | g2/phonics_blending | word | Speak as whole English word; child-friendly pace (US accent) |
| i | g2/first_word_reading; g2/phonics_sounds_review | letter name, letter sound | Short consonant/vowel sound as in example word on page (US accent) |
| I am | g2/first_word_reading | word | Speak as whole English word; child-friendly pace (US accent) |
| I am happy. | g2/early_sentences_exposure | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| I see a cat. | g2/early_sentences_exposure; g2/listening_comprehension | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| I see a dog. | g2/listening_comprehension | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| is | g2/first_word_reading | word | Speak as whole English word; child-friendly pace (US accent) |
| It is red | g2/early_sentences_exposure | word | Speak as whole English word; child-friendly pace (US accent) |
| It is red. | g2/early_sentences_exposure | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| J | g1/letter_names | letter name | US letter name (J) — US English only (LOCKED) |
| K | g2/letters_order | letter name | US letter name (K) — US English only (LOCKED) |
| L | g2/letters_order; g2/letters_review | letter name | US letter name (L) — US English only (LOCKED) |
| listen | g2/classroom_vocab_g2; g2/early_sentences_exposure | command | Speak as whole English word; child-friendly pace (US accent) |
| Listen to the teacher. | g2/listening_comprehension | command | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| Listen. | g1/listening_commands | command | Speak as whole English word; child-friendly pace (US accent) |
| log | g2/word_families_cvc | word | Speak as whole English word; child-friendly pace (US accent) |
| Look. | g1/listening_commands | command | Speak as whole English word; child-friendly pace (US accent) |
| M | g2/letters_order; g2/sound_letter_match | letter name | US letter name (M) — US English only (LOCKED) |
| mom | g1/first_words_simple; g1/phonics_first_sound; g1/phonics_sounds | letter sound, word | Isolated phoneme or example word stem (US accent) |
| My friend is happy. | g2/listening_comprehension | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| My friend is here. | g2/listening_comprehension | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| N | g2/letters_order; g2/letters_review | letter name, letter sound | US letter name (N) — US English only (LOCKED) |
| o | g2/phonics_sounds_review | letter sound | Short consonant/vowel sound as in example word on page (US accent) |
| Open your book | g1/listening_classroom | command | Classroom command — slow, clear, friendly imperative |
| Open your book. | g1/listening_classroom | command | Classroom command — slow, clear, friendly imperative |
| p | g2/phonics_sounds_review | letter sound | Short consonant/vowel sound as in example word on page (US accent) |
| pen | g2/picture_audio_word_match | word | Speak as whole English word; child-friendly pace (US accent) |
| playground | g2/classroom_vocab_g2; g2/listening_comprehension | word | Speak as whole English word; child-friendly pace (US accent) |
| Point to the door | g1/listening_commands | command | Short instruction — slow, clear, friendly tone |
| Point to the door. | g1/listening_commands | command | Short instruction — slow, clear, friendly tone |
| Q | g1/letters_lower; g1/letters_upper | letter name, letter sound | US letter name (Q) — US English only (LOCKED) |
| r | g2/letters_review | letter name, letter sound | Short consonant/vowel sound as in example word on page (US accent) |
| read | g2/classroom_vocab_g2 | word | Speak as whole English word; child-friendly pace (US accent) |
| red | g2/phonics_blending | word | Speak as whole English word; child-friendly pace (US accent) |
| run | g2/first_word_reading; g2/phonics_blending | word | Speak as whole English word; child-friendly pace (US accent) |
| S | g2/sound_letter_match | letter name | US letter name (S) — US English only (LOCKED) |
| see | g1/letter_names | word | Speak as whole English word; child-friendly pace (US accent) |
| Show me your pen | g1/listening_commands | command | Short instruction — slow, clear, friendly tone |
| Show me your pen. | g1/listening_commands | command | Short instruction — slow, clear, friendly tone |
| sit | g2/first_word_reading; g2/phonics_blending | word | Speak as whole English word; child-friendly pace (US accent) |
| Sit down | g1/listening_classroom | command | Classroom command — slow, clear, friendly imperative |
| Sit down. | g1/listening_classroom | command | Classroom command — slow, clear, friendly imperative |
| Stand up. | g1/listening_classroom | command | Classroom command — slow, clear, friendly imperative |
| sun | g2/phonics_blending; g2/picture_audio_word_match | word | Speak as whole English word; child-friendly pace (US accent) |
| T | g2/letters_order; g2/phonics_sounds_review; g2/sound_letter_match | letter name, letter sound | US letter name (T) — US English only (LOCKED) |
| teacher | g1/classroom_words | word | Speak as whole English word; child-friendly pace (US accent) |
| the | g2/first_word_reading | word | Speak as whole English word; child-friendly pace (US accent) |
| top | g1/phonics_sounds | letter sound | Isolated phoneme or example word stem (US accent) |
| u | g2/phonics_sounds_review | letter sound | Short consonant/vowel sound as in example word on page (US accent) |
| W | g1/letter_names | letter name | US letter name (W) — US English only (LOCKED) |
| We listen. | g2/early_sentences_exposure | word | Speak as whole English word; child-friendly pace (US accent) |
| We play in the playground. | g2/listening_comprehension | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| We read in the classroom. | g2/listening_comprehension | sentence | Exposure sentence — slow, neutral tone; not grammar quiz or translation |
| write | g2/classroom_vocab_g2 | word | Speak as whole English word; child-friendly pace (US accent) |
| Z | g2/letters_review | letter name | US letter name locked: zee (not zed) |

---

## 5. Remaining owner-review risks (post–Step 3A)

| Risk | Detail | Action |
|------|--------|--------|
| CVC blend pause length | `first_words_cvc`, `phonics_blending`, `word_families_cvc` — locked format `c … a … t → cat`; owner confirms pause timing at recording | Approve timing in recording session |
| b/d and p/q confusables | `letters_lower`, `letters_review`, `phonics_sounds_review` | Extra-clear consonant clips; no whispered audio |
| Hebrew narration phrasing | Long §4–§5 Hebrew scaffolding on some pages | Read aloud before recording; shorten if TTS sounds unnatural |
| Word inventory scope | G1 CVC (6 words) vs G2 blends (8 words) vs families (-at/-an/-it/-og) — intentional progression | Confirm full token list still matches curriculum intent before recording |

### Resolved in Step 3A

- Cyrillic typo in `letters_lower` §4 — fixed
- `mat` inventory drift in `phonics_blending` — removed; §3 uses `cat` from page word list only
- US accent policy — locked (zee, aitch, US vowels)
- Letter name vs sound — separate clip types; C letter name = see, C sound in cat = hard c/k
- Sight word I — child text uses `I — אני`; owner notes cover letter-name vs pronoun context
- Classroom commands — slow, clear, friendly tone (no quiz/harsh delivery)
- Sentence exposure — slow neutral delivery; no grammar quiz or translation

---

## 6. No-product-change guarantee

This artifact is **approval documentation only**. It does **not**:

- Generate audio or MP3 files
- Add or edit entries in `learning-book-audio-manifest.js`
- Change book runtime, catalog, registry, or page rendering
- Enable audio playback in the learning book UI
- Modify English question banks, generator, or curriculum
- Update launch-readiness registry or parent-report logic
- Change diagnostic flags or SQL

Recording and manifest wiring remain **post–Step 3A / post-recording approval** work.

---

## Appendix — slot coverage summary

| Grade | Pages | Sections | Slots |
|-------|-------|----------|-------|
| G1 | 12 | 7 | 84 |
| G2 | 11 | 7 | 77 |
| **Total** | **23** | — | **161** |

Validation: `node scripts/qa/extract-english-phonics-audio-scripts.mjs --validate-only`
