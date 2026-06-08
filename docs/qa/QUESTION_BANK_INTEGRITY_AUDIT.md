# Question Bank Integrity Audit

**Generated:** 2026-06-08T04:34:12.534Z
**Verdict:** PASS_WITH_WARNINGS

## Scope

- Total questions scanned: **8932**
- Static bank rows: **5530**
- Generated samples: **3402** (6 per matrix cell for math/geometry/hebrew/moledet)
- Subjects: math, geometry, hebrew, english, science, moledet_geography

## Command

```powershell
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
```

## Per-subject totals

| Subject | Total | Structural pass | Structural fail | Leak risk | Missing metadata | Duplicate options | Broken answer |
|---------|------:|----------------:|----------------:|----------:|-----------------:|------------------:|--------------:|
| english | 953 | 953 | 0 | 953 | 0 | 0 | 0 |
| geometry | 792 | 792 | 0 | 583 | 792 | 0 | 0 |
| hebrew | 702 | 702 | 0 | 699 | 0 | 0 | 0 |
| math | 1422 | 1422 | 0 | 1083 | 0 | 0 | 0 |
| moledet_geography | 4046 | 4046 | 0 | 4046 | 0 | 0 | 0 |
| science | 1017 | 1017 | 0 | 1017 | 0 | 0 | 0 |

## Top 20 examples

### LEAK — science g1 body
- **Source:** science_bank (data/science-questions.js)
- **ID:** body_1
- **Stem:** איפה נמצא הלב בגוף האדם?
- **Options:** בחזה, בצד ימין של הגוף | בחזה, מעט משמאל למרכז | בבטן העליונה, באזור הכבד | בגובה הצוואר, מאחורי קנה הנשימה
- **Correct:** בחזה, מעט משמאל למרכז
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g1 body
- **Source:** science_bank (data/science-questions.js)
- **ID:** body_2
- **Stem:** באיזה איבר אנחנו משתמשים כדי לראות?
- **Options:** אוזניים | עיניים | אף | לשון
- **Correct:** עיניים
- **Issue:** answer_leak — Correct answer appears in explanation
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g3 body
- **Source:** science_bank (data/science-questions.js)
- **ID:** body_3
- **Stem:** מה תפקידה העיקרי של מערכת הנשימה?
- **Options:** להוביל דם לרקמות עם חמצן ומזון | להחליף חמצן ופחמן דו־חמצני מול האוויר | לפרק מזון לחומרים קטנים במעיים | לתת שלד, להגין על איברים ולסייע בתנועה
- **Correct:** להחליף חמצן ופחמן דו־חמצני מול האוויר
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g3 body
- **Source:** science_bank (data/science-questions.js)
- **ID:** body_4
- **Stem:** השרירים והשלד עובדים יחד כדי לאפשר לנו תנועה.
- **Options:** נכון | לא נכון
- **Correct:** נכון
- **Issue:** answer_leak — Correct answer in option 0 label prefix
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g5 body
- **Source:** science_bank (data/science-questions.js)
- **ID:** body_5
- **Stem:** איזה משפט מתאר בצורה הטובה ביותר את תפקיד מערכת הדם?
- **Options:** המערכת שמעכלת מזון ומפרקת אותו לחומרים פשוטים. | המערכת שמובילה אותות עצביים בין המוח לשרירים. | המערכת שמזרימה דם עם חמצן ומזון ומפנה פסולת. | המערכת שמגינה בעיקר דרך העור ולא דרך מחזור הדם.
- **Correct:** המערכת שמזרימה דם עם חמצן ומזון ומפנה פסולת.
- **Issue:** answer_leak — Correct answer in option 2 label prefix

### LEAK — science g6 body
- **Source:** science_bank (data/science-questions.js)
- **ID:** body_6
- **Stem:** מהו תפקידה העיקרי של מערכת העצבים?
- **Options:** לסנן פסולת מהדם באופן שונה | לתאם ולהעביר מידע בין חלקי הגוף והסביבה | להוביל מזון מהמעיים לדם באופן שונה | לאחסן אנרגיה כשומן באופן שונה
- **Correct:** לתאם ולהעביר מידע בין חלקי הגוף והסביבה
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g1 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_1
- **Stem:** איזה בעל חיים הוא יונק?
- **Options:** צפרדע | תנין | חתול | תרנגול
- **Correct:** חתול
- **Issue:** answer_leak — Correct answer appears in explanation
- **Issue:** answer_leak — Correct answer in option 2 label prefix

### LEAK — science g3 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_2
- **Stem:** מהי תכונה שמתאימה דג לחיים במים?
- **Options:** כנפיים גדולות באופן שונה | פרווה עבה באופן שונה | סנפירים וגוף בצורת טורפדו | רגליים ארוכות באופן שונה
- **Correct:** סנפירים וגוף בצורת טורפדו
- **Issue:** answer_leak — Correct answer in option 2 label prefix

### LEAK — science g3 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_3
- **Stem:** זוחלים הם בעלי חיים שמכוסים בדרך כלל קשקשים ומטילים ביצים.
- **Options:** נכון | לא נכון
- **Correct:** נכון
- **Issue:** answer_leak — Correct answer in option 0 label prefix
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g5 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_4
- **Stem:** מהי 'שרשרת מזון'?
- **Options:** כל היצורים באזור שאוכלים מאותו מקור מים בלי יחס טורף-טרף (בלי מזון) | רצף של יצורים חיים שבו כל יצור משמש מזון ליצור הבא אחריו | רצף שלבים שבו כל יצור מייצר את מזונו מפוטוסינתזה בלבד (בלי מזון) | קבוצה שבה כל בעל חיים נמצא באותה רמת אנרגיה לאורך זמן
- **Correct:** רצף של יצורים חיים שבו כל יצור משמש מזון ליצור הבא אחריו
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g6 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_5
- **Stem:** מה נכון לגבי התאמות התנהגותיות אצל בעלי חיים?
- **Options:** הן תמיד קשורות רק לצבע הגוף. באופן שונה במקרה אחר | הן כוללות שינויי התנהגות שעוזרים לשרוד, כמו נדידה או תרדמת חורף. | הן קורות רק אצל חיות מחמד. באופן שונה במקרה אחר | הן תלויות רק במזג האוויר. באופן שונה במקרה אחר
- **Correct:** הן כוללות שינויי התנהגות שעוזרים לשרוד, כמו נדידה או תרדמת חורף.
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g1 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_gapfix_hard_g12
- **Stem:** מה נכון בהשוואה בין דג לדולפין?
- **Options:** שניהם סוגי דגים כי שניהם חיים במים באופן שונה | דולפין נושם אוויר דרך ריאות כמו יונק, ודג נושם במים בעזרת זימים | דולפין ודג שייכים לאותה קבוצה ביולוגית בדיוק | לדולפין יש נוצות כמו לעוף באופן שונה במקרה אחר
- **Correct:** דולפין נושם אוויר דרך ריאות כמו יונק, ודג נושם במים בעזרת זימים
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g4 animals
- **Source:** science_bank (data/science-questions.js)
- **ID:** animals_gapfix_easy_g456
- **Stem:** איזה משפט נכון לגבי צרכים בסיסיים של בעלי חיים?
- **Options:** בעלי חיים צריכים רק מזון באופן שונה | בעלי חיים צריכים מזון, מים ותנאים מתאימים לסוג שלהם | בעלי חיים צריכים רק מים באופן שונה | אם יש מזון, בעלי חיים לא צריכים מים
- **Correct:** בעלי חיים צריכים מזון, מים ותנאים מתאימים לסוג שלהם
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g1 plants
- **Source:** science_bank (data/science-questions.js)
- **ID:** plants_1
- **Stem:** מה הצמח צריך כדי לגדול?
- **Options:** מים בלבד, בלי אור שמש וקרקע | אור שמש, מים ואדמה | אור שמש בלבד, בלי מים מהקרקע | קרקע יבשה בלי מים ואור
- **Correct:** אור שמש, מים ואדמה
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **ID:** plants_2
- **Stem:** איזה חלק בצמח אחראי על הכנסת מים מהאדמה?
- **Options:** העלים, שסופגים את רוב המים מגשם ומהאוויר | הגבעול, שמעביר מים מהשורש אך לא בולע אותם ישירות מהאדמה | השורשים, שסופגים מים ומינרלים מהאדמה | הגבעול שבולט באדמה, שסופג מים ישירות דרך קליפתו
- **Correct:** השורשים, שסופגים מים ומינרלים מהאדמה
- **Issue:** answer_leak — Correct answer in option 2 label prefix

### LEAK — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **ID:** plants_3
- **Stem:** מהי פוטוסינתזה?
- **Options:** תהליך שבו הצמח מפרק סוכר לקבלת אנרגיה מחמצן | תהליך שבו הצמח מייצר מזון מאור, מים ופחמן דו־חמצני | תהליך שבו הצמח מאבד מים דרך פיוניות ביום בהיר | תהליך שבו רוב הפוטוסינתזה מתבצעת בגזע מתחת לאדמה
- **Correct:** תהליך שבו הצמח מייצר מזון מאור, מים ופחמן דו־חמצני
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g1 plants
- **Source:** science_bank (data/science-questions.js)
- **ID:** plants_4
- **Stem:** הצמח נושם רק ביום, כאשר יש אור שמש.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **Issue:** answer_leak — Correct answer in option 1 label prefix

### LEAK — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **ID:** plants_5
- **Stem:** מה תפקיד פיוניות בעלה?
- **Options:** הובלת מים ומינרלים מהשורש אל קצה העלה | סגירה מוחלטת של פני העלה מכל מגע עם האוויר בכל שעות היממה | ויסות כניסת פחמן דו־חמצני ויציאת גזים ואדים | אגירת עמילן לטווח ארוך בעיקר בפקעות השורש
- **Correct:** ויסות כניסת פחמן דו־חמצני ויציאת גזים ואדים
- **Issue:** answer_leak — Correct answer in option 2 label prefix

### LEAK — science g3 materials
- **Source:** science_bank (data/science-questions.js)
- **ID:** materials_1
- **Stem:** מהו מצב הצבירה של קרח?
- **Options:** מוצק | נוזל | גז | תערובת
- **Correct:** מוצק
- **Issue:** answer_leak — Correct answer appears in explanation
- **Issue:** answer_leak — Correct answer in option 0 label prefix

### LEAK — science g3 materials
- **Source:** science_bank (data/science-questions.js)
- **ID:** materials_2
- **Stem:** מה נכון לגבי חומרים מתכתיים?
- **Options:** הם מבודדים חשמל טוב יותר מפלסטיק ומעץ | הם מוליכים חום וחשמל יחסית טוב | הם שקופים לאור בדומה לזכוכית דקה | הם נשברים בקלות בלי כפיפה או ריקוע
- **Correct:** הם מוליכים חום וחשמל יחסית טוב
- **Issue:** answer_leak — Correct answer in option 1 label prefix

## Notes

- Generator subjects are sampled, not exhaustively enumerated.
- Static banks (science, english, moledet, hebrew rich) are scanned in full where loaded.
- Metadata validation uses Q2-D `validateCanonicalMetadataBlock` (100% coverage expected per Q2-D validator).
- No product files modified by this audit.