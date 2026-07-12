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
assert.match(controlSrc, /grid grid-cols-5/);
assert.match(controlSrc, /min-h-\[40px\]/);
assert.match(controlSrc, /data-testid="report-date-range-preset-row"/);
assert.match(controlSrc, /showDayPreset/);
assert.match(controlSrc, /data-testid="report-range-preset-day"/);
assert.match(controlSrc, />\s*יום\s*</);
assert.match(controlSrc, /idlePresetClassName/);
assert.match(controlSrc, /activePresetClassName/);
assert.match(controlSrc, /focus-visible:ring-2/);
// Default idle remains for non-parent consumers
assert.match(controlSrc, /bg-white\/10 text-white\/70 hover:bg-white\/20/);

assert.match(parentSrc, /customRangeLabel="בחירה"/);
assert.match(parentSrc, /showDayPreset/);
assert.match(parentSrc, /showSchoolYearPreset/);
assert.doesNotMatch(parentSrc, /customRangeLabel="תאריכים מותאמים"/);
assert.match(
  parentSrc,
  /idlePresetClassName="bg-white\/30 text-white border border-white\/40 hover:bg-white\/45"/
);
assert.match(
  parentSrc,
  /activePresetClassName="bg-blue-500\/80 text-white border border-blue-400\/50"/
);

// Empty-state layout parity with populated report shell (not vertically centered state shell)
assert.match(parentSrc, /data-testid="parent-report-empty-period"/);
assert.match(parentSrc, /layoutLockViewport=\{!reportImmersive\}/);
assert.match(parentSrc, /reportShellOpts/);
assert.match(parentSrc, /getParentReportNoScrollPageShellClass\(isBright, reportShellOpts\)/);
assert.match(parentSrc, /getParentReportNoScrollPageContentStyle\(isBright, reportShellOpts\)/);
assert.match(parentSrc, /reportImmersive \? \(/);
const emptyBlock = parentSrc.slice(
  parentSrc.indexOf("data-testid=\"parent-report-empty-period\""),
  parentSrc.indexOf("data-testid=\"parent-report-empty-period\"") + 1800
);
assert.match(emptyBlock, /ParentReportExitNav className="mb-0"[^>]*showShortReportLink=\{false\}/);
assert.equal(
  (parentSrc.match(/ParentReportExitNav className="mb-0" isBright=\{isBright\} showShortReportLink=\{false\}/g) || [])
    .length,
  2,
  "regular report hides short-report link in empty + populated shells"
);
const detailedSrc = readFileSync(
  path.join(root, "pages/learning/parent-report-detailed.js"),
  "utf8"
);
assert.match(detailedSrc, /getParentReportNoScrollDetailedShellClass/);
assert.match(detailedSrc, /getParentReportNoScrollDetailedContentStyle/);
assert.match(detailedSrc, /<ParentReportExitNav isBright=\{isBright\} \/>/);
assert.doesNotMatch(detailedSrc, /showShortReportLink=\{false\}/);
assert.match(parentSrc, /StudentFixedBottomAdChrome/);
assert.match(parentSrc, /reportImmersive \? \(\s*<StudentFixedBottomAdChrome/);
assert.match(detailedSrc, /StudentFixedBottomAdChrome/);
assert.match(detailedSrc, /getParentReportNoScrollDetailedShellClass\(isBright, reportShellOpts\)/);
assert.match(detailedSrc, /layoutLockViewport=\{!reportImmersive && !\(payload && periodHasPracticeEvidence\)\}/);
const fixedAdSrc = readFileSync(
  path.join(root, "components/student/StudentFixedBottomAdChrome.jsx"),
  "utf8"
);
assert.match(fixedAdSrc, /StudentAdSlot/);
assert.match(fixedAdSrc, /variant="layout"/);
assert.match(fixedAdSrc, /fixed inset-x-0 bottom-0/);
assert.match(fixedAdSrc, /className = "no-pdf"/);
const siteNavSrc = readFileSync(path.join(root, "lib/site-nav.js"), "utf8");
assert.match(siteNavSrc, /\/parent\/parent-report/);
assert.match(siteNavSrc, /\/parent\/parent-report-detailed/);
const layoutSrc = readFileSync(path.join(root, "components/Layout.js"), "utf8");
assert.match(layoutSrc, /layoutLockViewport/);
assert.doesNotMatch(parentSrc, /StudentImmersiveAdPage/);
assert.doesNotMatch(detailedSrc, /StudentImmersiveAdPage/);
assert.match(emptyBlock, /📊 דוח להורים/);
assert.match(emptyBlock, /parentReportDatePresets/);
assert.match(emptyBlock, /PARENT_REPORT_PERIOD_EMPTY_STATE_HE/);
assert.doesNotMatch(emptyBlock, /getParentReportStateShellClass/);
assert.doesNotMatch(emptyBlock, /justify-center/);
assert.doesNotMatch(emptyBlock, /בחר תקופה:/);
// Empty copy must appear after period presets in the empty branch
const presetsIdx = emptyBlock.indexOf("parentReportDatePresets");
const emptyCopyIdx = emptyBlock.indexOf("PARENT_REPORT_PERIOD_EMPTY_STATE_HE");
assert.ok(presetsIdx >= 0 && emptyCopyIdx > presetsIdx, "empty message after period control");

console.log("report-date-range-control-ui: ok");
