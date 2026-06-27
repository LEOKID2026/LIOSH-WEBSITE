# PASS 12 — English Final Exact Cleanup

מטרה: לסגור את מקצוע אנגלית בצורה נקודתית ומדויקת, בלי AUDIT חדש ובלי שיקול דעת חופשי.

## חובה

לעבוד רק לפי:
- `pass12_exact_english_replacements.json`
- `apply-pass12-exact-english-fixes.mjs`

הסקריפט מבצע החלפת עמוד מלאה רק בקבצי English:
- `english-g1`
- `english-g2`
- `english-g3`
- `english-g4`
- `english-g5`
- `english-g6`

אסור לגעת:
- עברית
- מתמטיקה
- גאומטריה
- מדעים
- מולדת
- גאוגרפיה
- UI
- DB
- PWA
- משחקים
- קוד אתר

## הרצה

לחלץ את החבילה בתיקיית הפרויקט.

להעתיק את הסקריפט ל:
`scripts/apply-pass12-exact-english-fixes.mjs`

לוודא שה-JSON נמצא באחד המקומות:
- `pass12_exact_english_final_fix/pass12_exact_english_replacements.json`
- או `pass12_exact_english_replacements.json`
- או `scripts/pass12_exact_english_replacements.json`

להריץ:

```bash
node scripts/apply-pass12-exact-english-fixes.mjs
```

אחרי זה:

```bash
node scripts/rebuild-audio-book-artifacts-from-txt.mjs
node scripts/validate-book-content-cleanup.mjs
```

לבנות מחדש את:
`exports/audio-text.zip`

## בדיקות חיפוש

להריץ:

```bash
rg -n "עקלתון|בטן|ראש גדול|ראש קטן|משמע|CVC|sight|עיצורים|תנועות קצרות|נקראת בי|נקראת די|נקראת דיי|נקראת טי|נקראת פי|נקראת אף|נקראת אס|נקראת אם|נקראת אר|נקראת ג׳י|נקראת זד|הולך/ת|קם/ת|אוהב/ת|עוזר/ת|מרגישים/ות|נרגשים/ות|עצובים/ות|ריקדו|האינטרנט נפסק|won the project|ניצחה בפרויקט|כפול y|יינצלו|playing guitar|גולשים באינטרנט לשיעורים|הכניס שני שערים" exports/audio-text/books/english-g1 exports/audio-text/books/english-g2 exports/audio-text/books/english-g3 exports/audio-text/books/english-g4 exports/audio-text/books/english-g5 exports/audio-text/books/english-g6
```

צריך לחזור ריק או רק מופע שמדווחים עליו עם נימוק ברור.

## דוח חזרה

להחזיר PASS 12 עם:
1. כמה קבצי txt שונו.
2. רשימת הספרים/עמודים ששונו.
3. תוצאת validate.
4. אישור ש-book-full.md ו-index.json נבנו מחדש.
5. תוצאת חיפוש ה-rg.
6. אישור שלא שונו מקצועות אחרים.
7. אישור שלא שונה UI / DB / PWA / משחקים / קוד אתר.
8. לצרף/להעלות את `exports/audio-text.zip` החדש.

לא להתחיל ElevenLabs.
