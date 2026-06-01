import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const controlSrc = readFileSync(
  path.join(root, "components/reporting/ReportDateRangeControl.jsx"),
  "utf8"
);
const parentSrc = readFileSync(path.join(root, "pages/learning/parent-report.js"), "utf8");

assert.match(controlSrc, /customRangeLabel = "תאריכים מותאמים"/);
assert.match(controlSrc, /flex flex-nowrap/);
assert.match(controlSrc, /data-testid="report-date-range-preset-row"/);
assert.match(controlSrc, /showDayPreset/);
assert.match(controlSrc, /data-testid="report-range-preset-day"/);
assert.match(controlSrc, />\s*יום\s*</);

assert.match(parentSrc, /customRangeLabel="בחירה"/);
assert.match(parentSrc, /showDayPreset/);
assert.match(parentSrc, /showSchoolYearPreset/);
assert.doesNotMatch(parentSrc, /customRangeLabel="תאריכים מותאמים"/);

console.log("report-date-range-control-ui: ok");
