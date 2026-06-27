# Cursor Prompt — Hebrew PASS 1 Exact Cleanup

יש לבצע תיקון מדויק בלבד בספרי עברית.

## Scope מותר
רק קבצי txt תחת:

```text
exports/audio-text/books/hebrew/hebrew-g*/pages/page-*.txt
```

## אסור
- לא לעשות AUDIT כללי.
- לא לשכתב חופשי.
- לא לשנות ניסוחים שלא מופיעים ב-JSON.
- לא לגעת באנגלית / מתמטיקה / גאומטריה / מדעים / מולדת.
- לא לגעת ב-UI / DB / PWA / משחקים / API / קוד אתר.
- לא להריץ export שדורס txt ממקור markdown ישן.

## לבצע
1. להעתיק את הקבצים מהחבילה לשורש הריפו או להריץ עם נתיב JSON מפורש.
2. להריץ:

```bash
node apply-hebrew-pass1-exact-cleanup.mjs hebrew_pass1_exact_replacements.json
```

3. לוודא שהסקריפט מחזיר:

```text
missingCount: 0
applied == expected
```

4. לבנות מחדש artifacts מתוך txt בלבד:

```bash
node scripts/rebuild-audio-book-artifacts-from-txt.mjs
```

אם הסקריפט הזה לא קיים בשם הזה בריפו — לעצור ולדווח. לא להריץ סקריפט export אחר שעלול לדרוס את ה-txt.

## בדיקות חובה אחרי התיקון

```bash
rg -n "→|↔|←|___|____________|/" exports/audio-text/books/hebrew/hebrew-g*/pages || true
rg -n "באחרי|כי ועייף|רצם|זו טיעון|ביום הספר|ולחצים|בו לא כותבים|נשאלו מאה ספרים|סימן שמים בסוף," exports/audio-text/books/hebrew/hebrew-g*/pages || true
```

שתי הבדיקות צריכות לחזור ריקות, למעט אם יש `/` בנתיב בלבד ולא בתוכן. עדיף להריץ על קבצי txt בלבד.

## דוח להחזיר
1. כמה החלפות בוצעו.
2. כמה קבצי txt שונו.
3. רשימת הקבצים ששונו.
4. אישור `missingCount: 0`.
5. אישור rebuild ל-`book-full.md` ו-`index.json`.
6. פלט rg נקי.
7. `hebrew.zip` חדש לבדיקה.
