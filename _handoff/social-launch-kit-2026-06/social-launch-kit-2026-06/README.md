# Social Launch Kit — Summer Pilot 2026

ערכת השקה אורגנית להורים (כיתות א׳–ו׳) לפיילוט קיץ חינמי, **לפני 30/06/2026**.

## מה כלול

| קובץ | תוכן |
|------|------|
| `SOCIAL_LAUNCH_STRATEGY_HE.md` | אסטרטגיה, סדר פרסום, תוכנית שבועית, מדדי הצלחה |
| `FACEBOOK_PAGE_SETUP_HE.md` | הקמת עמוד פייסבוק |
| `FACEBOOK_POSTS_HE.md` | 8 פוסטים מוכנים + קישור לתמונה |
| `PERSONAL_PROFILE_POST_HE.md` | פוסט אישי ממייסד/ת |
| `PARENT_GROUP_POSTS_HE.md` | 5 גרסאות לקבוצות הורים |
| `INSTAGRAM_STORIES_HE.md` | סטוריז + כיתובים |
| `FAQ_FOR_PARENTS_HE.md` | שאלות נפוצות להורים |
| `VISUAL_ASSET_INVENTORY.md` | מלאי ויזואלי, בדיקות בטיחות |
| `ASSET_GENERATION_REPORT.md` | דוח ייצור ואימות |
| `assets/final/` | תמונות PNG סופיות לפרסום |
| `assets/source/` | צילומי מסך ומקורות (ללא נתונים רגישים) |

## שימוש מהיר

1. קראו `SOCIAL_LAUNCH_STRATEGY_HE.md` — סדר ההשקה המומלץ.
2. הקימו עמוד לפי `FACEBOOK_PAGE_SETUP_HE.md` והעלו `fb-profile-1024.png` + `fb-cover-summer-pilot.png`.
3. פרסמו לפי `FACEBOOK_POSTS_HE.md` — כל פוסט מציין איזו תמונה לצרף.
4. שתפו בקבוצות הורים לפי `PARENT_GROUP_POSTS_HE.md` (בנימוס, עם אישור מנהל/ת הקבוצה).
5. העלו סטוריז מ-`assets/final/story-*.png` עם טקסט מ-`INSTAGRAM_STORIES_HE.md`.

## מיתוג

- **שם מוצר:** LEO KIDS (ליאו)
- **צבעים:** רקע כהה `#050816` / `#0b1020`, דגשים `#fbbf24` (ענבר), ורוד/ירוק רך
- **כתובת אתר (production):** https://liosh-website.vercel.app

## מה לא בערכה

- אין חומר שיווק לבתי ספר, מורים פרטיים, מנהל בית ספר, פורטל מורים או יכולות מוסדיות.
- אין הבטחות לשיפור ציונים, אישור משרד החינוך, או המלצות מזויפות.

## ייצור מחדש של תמונות (אופציונלי)

```bash
node _handoff/social-launch-kit-2026-06/scripts/generate-kit.mjs
```

משתנה אופציונלי: `SOCIAL_KIT_BASE_URL` (ברירת מחדל: production).

## ZIP

`_handoff/social-launch-kit-2026-06.zip` — ארכיון מלא של התיקייה.
