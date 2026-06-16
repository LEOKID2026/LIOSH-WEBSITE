/**
 * Admin Analytics Hebrew copy guard — visible labels must not leak English enum keys.
 * Run: node scripts/admin-analytics-hebrew-copy-guard.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  formatAnalyticsLabelHe,
  formatAnalyticsTopicHe,
  formatAnalyticsGradeHe,
  formatAnalyticsFeatureHe,
  formatAnalyticsEventNameHe,
  formatAnalyticsPersonaHe,
  findAdminAnalyticsEnglishEnumLeaks,
  ADMIN_ANALYTICS_FORBIDDEN_ENGLISH_ENUMS,
} = await import(u("lib/admin-portal/admin-analytics-labels.he.js"));

/** Realistic aggregation keys / fixtures from Admin Analytics tables. */
const FIXTURE_RAW_LABELS = Object.freeze([
  "body",
  "reading",
  "unknown",
  "multiplication",
  "matter",
  "angles",
  "addition : g1",
  "vocabulary : g4",
  "area : g3",
  "addition · g1",
  "vocabulary · g4",
  "area · g3",
  "grade_2",
  "grade_3",
  "grade_4",
  "grade_5",
  "חשבון · grade_2",
  "חשבון · addition",
  "reading · grade_2",
  "multiplication · unknown",
  "practice",
  "learning_book",
  "worksheet",
  "parent_assigned_activity",
  "teacher_dashboard_opened",
  "private_teacher",
]);

const EXPECTED_SAMPLES = Object.freeze([
  ["body", "גוף האדם"],
  ["reading", "קריאה"],
  ["multiplication", "כפל"],
  ["addition : g1", "חיבור · כיתה א׳"],
  ["vocabulary : g4", "אוצר מילים · כיתה ד׳"],
  ["grade_2", "כיתה ב׳"],
  ["teacher_dashboard_opened", "פתיחת דשבורד מורה"],
  ["private_teacher", "מורה פרטי"],
]);

function assertNoEnglishLeaks(label, context) {
  const leaks = findAdminAnalyticsEnglishEnumLeaks(label);
  assert.equal(
    leaks.length,
    0,
    `${context}: "${label}" still leaks English enums: ${leaks.join(", ")}`
  );
}

for (const raw of FIXTURE_RAW_LABELS) {
  const formatted = formatAnalyticsLabelHe(raw);
  assertNoEnglishLeaks(formatted, `formatAnalyticsLabelHe(${JSON.stringify(raw)})`);
}

for (const [raw, expected] of EXPECTED_SAMPLES) {
  assert.equal(formatAnalyticsLabelHe(raw), expected, `expected mapping for ${raw}`);
}

assert.equal(formatAnalyticsTopicHe("unknown"), "ללא נושא");
assert.equal(formatAnalyticsGradeHe("g1"), "כיתה א׳");
assert.equal(formatAnalyticsFeatureHe("practice"), "תרגול");
assert.equal(formatAnalyticsEventNameHe("teacher_dashboard_opened"), "פתיחת דשבורד מורה");
assert.equal(formatAnalyticsPersonaHe("private_teacher"), "מורה פרטי");

assert.ok(ADMIN_ANALYTICS_FORBIDDEN_ENGLISH_ENUMS.includes("body"));
assert.ok(ADMIN_ANALYTICS_FORBIDDEN_ENGLISH_ENUMS.includes("addition"));

console.log("PASS admin analytics Hebrew copy guard");
