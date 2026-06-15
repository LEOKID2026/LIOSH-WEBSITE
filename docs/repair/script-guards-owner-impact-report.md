# Production Script Guards — סיכום Owner

מסמך קצר ל-owner: מה המשמעות של guards על סימולציות, בלי פרטים טכניים מיותרים.

> מדריך הרצה מלא: [SIMULATION_RUNBOOK.md](../qa/SIMULATION_RUNBOOK.md)

---

## מה זה אומר בפועל

1. **רוב הסקריפטים שכותבים ל-DB** — ברירת המחדל היא **dry-run** (לא כותב).
2. **כדי לכתוב באמת** — צריך `--write` או פקודת npm עם `:write`.
3. **אם Supabase הוא remote ולא סומן staging** — המערכת עלולה לחשוב שזה **production** ולחסום כתיבה.
4. **כתיבה ל-production** — דורשת אישור מפורש (3 משתני env + `--write`).

---

## מה owner צריך לדעת

| שאלה | תשובה |
|------|--------|
| "תריץ סימולציה" | Cursor צריך להריץ **write**, לא dry-run |
| "תבדוק בלי לשנות DB" | dry-run או preflight |
| האם dry-run מסוכן? | לא — לא כותב DB |
| האם write מסוכן על staging? | כן — משנה נתונים; צריך staging מסומן |
| האם write על production? | **חסום** אלא באישור מפורש |

---

## הגדרת staging (מומלץ)

ב-`.env.local`:

```env
LEARNING_STAGING_PROJECT_REFS=<ref-של-פרויקט-staging>
```

או:

```env
SCRIPT_TARGET=staging
```

**לא לשתף** את ה-ref או keys בצ'אט — רק לוודא שהם מוגדרים במכונה.

---

## אישור production (רק owner)

רק אם owner אישר **במפורש**:

```env
ALLOW_PRODUCTION_WRITE=true
CONFIRM_PROJECT_REF=<ref>
CONFIRM_OPERATION=<שם-הפעולה>
```

+ `--write` על הסקריפט.

---

## סימולציה שרצה עכשיו

- process שכבר רץ **לא** מושפע משינויי guards באמצע
- **לא עוצרים** בלי אישור owner
- אחרי סיום — בודקים artifacts ו-DB

---

## קישורים

- [SIMULATION_RUNBOOK.md](../qa/SIMULATION_RUNBOOK.md) — טבלת כל הסימולציות
- [production-script-guards-report.md](./production-script-guards-report.md) — פירוט טכני מלא
