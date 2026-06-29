import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const H = {
  italy: "\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4",
  yehuda: "\u05D9\u05D4\u05D5\u05D3\u05D4",
  yehudim: "\u05D9\u05D4\u05D5\u05D3\u05D9\u05DD",
  yehudit: "\u05D9\u05D4\u05D5\u05D3\u05D9\u05EA",
  yavne: "\u05D9\u05D1\u05E0\u05D4",
  barKokhba: "\u05D1\u05E8 \u05DB\u05D5\u05DA\u05D1\u05D0",
  churban: "\u05D7\u05D5\u05E8\u05D1\u05DF",
  mikdash: "\u05DE\u05E7\u05D3\u05E9",
  deadSea: "\u05D9\u05DD \u05D4\u05DE\u05DC\u05D7",
  judeanDesert: "\u05DE\u05D3\u05D1\u05E8 \u05D9\u05D4\u05D5\u05D3\u05D4",
};

const meta = `# רומא והיהודים — מאימפריה ל${H.churban} ולהמשך

## Metadata

| Field | Value |
|-------|-------|
| **learning_page_id** | \`history:g6:rome_jews\` |
| **skill_id** | \`history:topic:rome_jews\` |
| **subject** | history |
| **grade** | g6 |
| **age_band** | grades_5_6 |
| **page_type** | concept_foundation |
| **approval_status** | draft |
| **title_hebrew** | רומא והיהודים — מאימפריה ל${H.churban} ולהמשך \`[DRAFT — not owner-approved]\` |

**Content scope:** עליית רומא, ${H.yehuda} תחת רומא, הורדוס, המרד הגדול, ${H.churban}, ${H.yavne}, ${H.barKokhba}, בבל

---

## 1. מה לומדים?

נעקוב אחרי עליית רומא, שלטונה ב${H.yehuda}, ${H.churban} בית ה${H.mikdash}, ויצירת מרכזים ${H.yehudim} חדשים.

---

## 2. הסבר

**עליית רומא:** מעיר ב${H.italy} לאימפריה — צבא חזק, דרכים, חוק ותרבות רומיים.

**אובדן עצמאות החשמונאים:** כיבושים ומלחמות, שליטה רומית — הורדוס ממונה כמלך.

**${H.yehuda} כפרובינציה:** מגבלות, מיסים, מתחים — המרד הגדול (66–73), ${H.churban} ה${H.mikdash} (70).

**אחרי ה${H.churban}:** ${H.yavne} — מרכז ללימוד ותפילה; מרד ${H.barKokhba} (132–135); גלות ומרכז בבבל.

---

## 3. דוגמה

מגילות ${H.deadSea} — מגילות ${H.judeanDesert}: עדות ישירה לחיי ${H.yehudim} לפני המרד.

---

## 4. בואו נפתור

למה חשובה ${H.yavne} אחרי ה${H.churban}?
כי נוצר מרכז רוחני ולימודי חלופי — המשכיות של עם ישראל בלי ${H.mikdash}.

---

## 5. נסו בעצמכם

מה ההבדל בין «עצמאות מדינית» ל«המשכיות תרבותית»? תנו דוגמה מהפרק.

---

## 6. סיכום

- רומא שינתה את גורל ${H.yehuda}
- ה${H.churban} — נקודת מפנה
- ${H.yavne}, ${H.barKokhba} ובבל — שלבי המשך בהיסטוריה ה${H.yehudit}

---

## 7. בואו נתרגל!

תרגלו רומא, ${H.churban}, ${H.yavne} ו${H.barKokhba} בנושא «רומא וה${H.yehudim}».
`;

const childStart = meta.indexOf("\n## 1.");
const child = childStart >= 0 ? meta.slice(childStart) : "";
if (/[a-zA-Z]/.test(child)) {
  console.error("latin leak in child body");
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs/learning-book/history/g6/drafts");
writeFileSync(join(dir, "rome_jews.md"), meta, "utf8");
console.log("OK: rome_jews.md");
