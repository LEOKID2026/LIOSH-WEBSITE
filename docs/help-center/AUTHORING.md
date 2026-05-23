# מדריך עריכת מרכז העזרה

## מבנה מאמר

כל מאמר ב־`data/help-center/content/` (או קובץ ייעודי לפי מקטע) משתמש ב־`baseArticle` מ־`articleHelpers.js`.

## בלוקים נתמכים

- `paragraph`, `heading`, `list`, `callout`
- `screenshot` — חובה `alt` בעברית; נתיב תחת `/help-center/screenshots/`
- `video` — אם `src` הוא `null`, הרכיב לא מוצג
- `relatedLinks`, `disclaimerQuote` (למאמר ההבהרה בדוח)

## צילומי מסך

1. הרצת `npm run help:capture` (localhost או preview בלבד)
2. בדיקת קבצים ב־`qa-evidence-audit/help-center/`
3. עדכון `screenshots-manifest.json` אם נוספו מסגרות
4. `npm run help:publish-screenshots` ואז `npm run help:verify`

## סרטונים (עתידי)

קבצים ב־`public/help-center/videos/` + כתוביות `.he.vtt`. מומלץ עד 120 שניות ו־25MB.
