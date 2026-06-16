import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import { flattenMixedHebrewMathVisibleText } from "../../lib/learning-book/book-visible-text-render.js";
import { flattenTemplateRuns, parseTemplateRuns } from "../../lib/learning-book/learning-math-line-templates.js";

const cases = [
  "איזה מספר נמצא 3 צעדים ימינה מ-2?",
  "**שאלה:** 20 + 10 = ?",
  "**ציר מספרים — 12 ו-18:**",
  "**שלב 1:** 20 = 2 מקלי עשרת",
  "**שלב 3:** 7 + 3 = 10, ואז 10 + 3 = **13**",
  "12 < 18 — 12 קטן מ-18",
  "18 > 12 — 18 גדול מ-12",
  "15 = 15 — 15 שווה ל-15",
  "10 + 20 = ?",
  "2 מקלי עשרת ועוד מקל עשרת אחד = 3 מקלי עשרת",
  "**תשובה:** 7 + 6 = **13**",
  '- 15 **=** 15 — "15 שווה ל-15"',
  "**שלב 2:** מ-6 נשארו **3** (6 = 3 + 3)",
  "**שלב 3:** 2 מקלי עשרת ועוד מקל עשרת אחד = 3 מקלי עשרת → **30**",
];

for (const c of cases) {
  const runs = splitMixedHebrewMathRuns(c);
  const flat = flattenMixedHebrewMathVisibleText(c);
  const tpl = parseTemplateRuns(c);
  console.log("---");
  console.log("IN:", c);
  console.log(
    "runs:",
    runs.map((r) => `${r.type}:${JSON.stringify(r.value)}`).join(" | ")
  );
  console.log("flat:", flat);
  console.log("tpl:", tpl ? flattenTemplateRuns(tpl) : null);
}
