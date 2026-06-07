/**
 * Regression: custom parent-report calendar ranges stay YYYY-MM-DD in Asia/Jerusalem.
 * Run: npx tsx scripts/parent-report-v2-custom-range-calendar-selftest.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

process.env.TZ = "Asia/Jerusalem";

const { resolveCustomReportCalendarRange } = await import(
  pathToFileURL(join(ROOT, "utils/parent-report-v2.js")).href
);

function formatDateLabelHe(isoDateStr) {
  const p = String(isoDateStr || "").split("T")[0].split("-");
  if (p.length !== 3) return isoDateStr;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

/** Old buggy path: local midnight + toISOString().split("T")[0] */
function legacyBuggyStoredStart(customStartDate) {
  const startDate = new Date(customStartDate);
  startDate.setHours(0, 0, 0, 0);
  return startDate.toISOString().split("T")[0];
}

{
  const now = new Date("2026-06-01T12:00:00.000Z");
  const resolved = resolveCustomReportCalendarRange("2026-04-01", "2026-04-30", now);
  assert.equal(resolved.startCalendar, "2026-04-01");
  assert.equal(resolved.endCalendar, "2026-04-30");
  assert.equal(formatDateLabelHe(resolved.startCalendar), "01/04/2026");
  assert.equal(formatDateLabelHe(resolved.endCalendar), "30/04/2026");
  assert.equal(legacyBuggyStoredStart("2026-04-01"), "2026-03-31", "legacy path must show the bug we fixed");
  console.log("PASS: Asia/Jerusalem custom range 2026-04-01..2026-04-30");
}

{
  const now = new Date("2026-04-15T12:00:00.000Z");
  const resolved = resolveCustomReportCalendarRange("2026-04-01", "2026-04-30", now);
  assert.equal(resolved.endCalendar, "2026-04-30");
  assert.equal(resolved.endMs, now.getTime(), "end capped to now when range extends into future");
  console.log("PASS: end range capped to now without shifting calendar label");
}

console.log("parent-report-v2-custom-range-calendar-selftest: ALL PASS");
