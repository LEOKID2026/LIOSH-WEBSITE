# PASS 14 — English Audio Symbol Cleanup

מטרה: ניקוי אחרון באנגלית לפני סגירה, בלי AUDIT ובלי שכתוב חופשי.

התיקון הוא מדויק בלבד:
- להסיר 47 סימני `✓` שנשארו באנגלית G1/G2 ולהחליף אותם במשפטים טבעיים.
- לתקן מופע אחד של `יכול/מותר` ל־`אפשר או מותר`.

לא לשנות שום דבר מעבר למה שמופיע ב־JSON/CSV.

## קבצים בחבילה
- `apply-pass14-english-audio-symbol-cleanup.mjs`
- `pass14_exact_english_replacements.json`
- `pass14_exact_english_replacements.csv`

## הרצה
להעתיק ל־`scripts/`:
- `apply-pass14-english-audio-symbol-cleanup.mjs`
- `pass14_exact_english_replacements.json`

להריץ:

```bash
node scripts/apply-pass14-english-audio-symbol-cleanup.mjs
```

אחרי זה:

```bash
node scripts/rebuild-audio-book-artifacts-from-txt.mjs
node scripts/validate-book-content-cleanup.mjs
```

בדיקת חיפוש:

```bash
rg -n "✓|יכול/מותר|→|↔|≈|חבר/ה|שמח/ה|עייף/ה|גאה/ים|she/he/it|was/were|must / have to|כדאי / מומלץ|the most / the best|CVC|sight|עיצורים|תנועות קצרות|עקלתון|בטן|ראש גדול|ראש קטן|משמע|נקראת בי|נקראת די|נקראת דיי|נקראת טי|נקראת פי|נקראת אף|נקראת אס|נקראת אם|נקראת אר|נקראת ג׳י|נקראת זד" exports/audio-text/books/english
```

אם המבנה בלי תיקיית `english`, להריץ על `exports/audio-text/books/english-g1 ... english-g6`.

## Scope
מותר לשנות רק ספרי אנגלית.

אסור לגעת:
- עברית
- מתמטיקה
- גאומטריה
- מדעים
- מולדת
- גאוגרפיה
- UI / DB / PWA / משחקים / קוד אתר

## דוח חזרה
להחזיר:
1. כמה החלפות בוצעו.
2. כמה קבצים שונו.
3. רשימת קבצים.
4. validate נקי.
5. חיפוש rg ריק.
6. book-full.md ו-index.json נבנו מחדש.
7. english.zip חדש.
