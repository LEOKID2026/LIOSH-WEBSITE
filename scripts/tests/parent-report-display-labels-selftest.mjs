/**
 * Parent report display labels — ensures enums never leak English to parents.
 * Run: node scripts/tests/parent-report-display-labels-selftest.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const u = (rel) => new URL(`file:///${path.join(root, rel).replace(/\\/g, "/")}`).href;

const {
  formatParentReportModeHe,
  formatParentReportActivitySourceHe,
  formatParentReportSubjectHe,
  formatParentReportSourceHe,
  formatParentReportLevelHe,
  formatParentReportStatusHe,
  formatParentReportEvidenceHe,
  findParentReportEnglishEnumLeaks,
} = await import(u("utils/parent-report-language/parent-report-display-labels.he.js"));

const modeCases = [
  ["practice", "תרגול"],
  ["guided_practice", "תרגול"],
  ["learning_book", "ספר לימוד"],
  ["worksheet", "דף עבודה"],
  ["quiz", "בוחן"],
  ["marathon", "תרגול ארוך"],
  ["diagnostic", "תרגול"],
  ["unknown", "לא ידוע"],
];

for (const [raw, he] of modeCases) {
  assert.equal(formatParentReportModeHe(raw), he, `mode ${raw}`);
  assert.equal(findParentReportEnglishEnumLeaks(formatParentReportModeHe(raw)).length, 0);
}

assert.equal(formatParentReportSubjectHe("math"), "מתמטיקה");
assert.equal(formatParentReportSubjectHe("geometry"), "גאומטריה");
assert.equal(formatParentReportSubjectHe("english"), "אנגלית");
assert.equal(formatParentReportSubjectHe("science"), "מדעים");
assert.equal(formatParentReportSubjectHe("hebrew"), "עברית");
assert.equal(formatParentReportSubjectHe("moledet_geography"), "מולדת וגאוגרפיה");

assert.equal(formatParentReportSourceHe("self_practice"), "תרגול עצמי");
assert.equal(formatParentReportSourceHe("parent_assigned_activity"), "פעילות אישית מהורה");
assert.equal(formatParentReportSourceHe("learning_book"), "ספר לימוד");

assert.equal(
  formatParentReportActivitySourceHe({ primaryEvidenceSource: "parent_assigned_activity", mode: "guided_practice" }),
  "פעילות אישית מהורה"
);
assert.equal(
  formatParentReportActivitySourceHe({ primaryEvidenceSource: "self_practice", mode: "guided_practice" }),
  "תרגול עצמי"
);
assert.equal(formatParentReportActivitySourceHe({ mode: "guided_practice" }), "תרגול");
assert.equal(formatParentReportActivitySourceHe(null), "תרגול");

assert.equal(formatParentReportLevelHe("easy"), "רגיל");
assert.equal(formatParentReportLevelHe("medium"), "רגיל");
assert.equal(formatParentReportLevelHe("mixed"), "רגיל");
assert.equal(formatParentReportLevelHe("hard"), "מתקדם");
assert.equal(formatParentReportLevelHe("hard", "science"), "רגיל");

assert.equal(formatParentReportStatusHe("completed"), "הושלם");
assert.equal(formatParentReportStatusHe("partial"), "חלקי");
assert.equal(formatParentReportStatusHe("unavailable"), "לא זמין");

assert.equal(formatParentReportEvidenceHe("insufficient"), "לא מספיק");
assert.equal(formatParentReportEvidenceHe("high"), "גבוה");

const page = readFileSync(path.join(root, "pages/learning/parent-report.js"), "utf8");
assert.match(page, /formatParentReportActivitySourceHe/, "parent-report page must use formatParentReportActivitySourceHe");
assert.doesNotMatch(
  page,
  /return mode\.toLowerCase\(\) === "marathon"/,
  "parent-report must not return raw English modes"
);

const v2 = readFileSync(path.join(root, "utils/parent-report-v2.js"), "utf8");
assert.match(v2, /formatParentReportModeHe/, "parent-report-v2 must use formatParentReportModeHe");
assert.doesNotMatch(v2, /MODE_LABELS\[m\] \|\| String\(m\)/, "parent-report-v2 must not fall back to raw mode string");
assert.doesNotMatch(v2, /LEVEL_LABELS\[/, "parent-report-v2 must not leak raw level keys");

console.log("PASS parent-report-display-labels-selftest");
