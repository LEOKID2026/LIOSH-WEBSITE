# PASS 13 — English Exact Cleanup

לבצע תיקון מדויק בלבד לפי `pass13_exact_english_replacements.json`.

אין לבצע AUDIT.
אין לבצע שיפור חופשי.
אין לשנות מקצועות אחרים.
אין לשנות UI / DB / PWA / משחקים / קוד אתר.

## Scope

מותר לשנות רק:
- `exports/audio-text/books/english/english-g1`
- `exports/audio-text/books/english/english-g2`
- `exports/audio-text/books/english/english-g3`
- `exports/audio-text/books/english/english-g4`
- `exports/audio-text/books/english/english-g5`
- `exports/audio-text/books/english/english-g6`

אם המבנה אצלך בלי תיקיית `english`, הסקריפט יודע גם לעבוד מול:
- `exports/audio-text/books/english-g1` וכו'

## למה PASS 13 נדרש

בדוח PASS 12 נכתב שחיפוש החיצים חזר ריק, אבל בזיפ עצמו עדיין נמצאו חיצים `→` ב-English G4–G6, ועוד כמה ניסוחי slash כמו `חבר/ה`, `שמח/ה`, `עייף/ה`, `was/were`.

PASS 13 לא משנה תוכן לימודי. הוא רק מנקה טקסטים שנקראים/נשמעים רע בשמע.

## הרצה

להעתיק אל `scripts/`:
- `apply-pass13-exact-english-cleanup.mjs`
- `pass13_exact_english_replacements.json`

ואז להריץ:

```bash
node scripts/apply-pass13-exact-english-cleanup.mjs
```

אחרי זה:

```bash
node scripts/rebuild-audio-book-artifacts-from-txt.mjs
node scripts/validate-book-content-cleanup.mjs
```

בדיקת חיפוש:

```bash
rg -n "→|↔|≈|חבר/ה|שמח/ה|עייף/ה|גאה/ים|she/he/it|בתוך/ב-|לשמור/להגן|slowly/quickly|was/were|must / have to|כדאי / מומלץ|the most / the best" exports/audio-text/books/english
```

אם המבנה אצלך בלי תיקיית `english`, להריץ על:
```bash
rg -n "→|↔|≈|חבר/ה|שמח/ה|עייף/ה|גאה/ים|she/he/it|בתוך/ב-|לשמור/להגן|slowly/quickly|was/were|must / have to|כדאי / מומלץ|the most / the best" exports/audio-text/books/english-g1 exports/audio-text/books/english-g2 exports/audio-text/books/english-g3 exports/audio-text/books/english-g4 exports/audio-text/books/english-g5 exports/audio-text/books/english-g6
```

החיפוש צריך לחזור ריק.

## דוח חזרה

להחזיר:
1. כמה החלפות בוצעו.
2. כמה קבצי txt שונו.
3. רשימת הקבצים ששונו.
4. תוצאת validate.
5. תוצאת rg.
6. אישור ש-book-full.md ו-index.json נבנו מחדש.
7. אישור שלא שונו מקצועות אחרים.
8. העלאת english.zip חדש.

לא להתחיל ElevenLabs.
לא לאשר סופי.
