/**
 * Dev/test/legacy — build parent reports from browser localStorage (mleo_*).
 * NOT reachable from official parent-report product pages (Phase 1 server truth).
 */

import { generateParentReportV2 } from "../../utils/parent-report-v2.js";
import { generateDetailedParentReport } from "../../utils/detailed-parent-report.js";
import { resolveParentReportGenerationArgs } from "./parent-report-from-api-payload.js";

/**
 * @param {string} playerName
 * @param {string} period
 * @param {boolean} customDates
 * @param {string} appliedStartDate
 * @param {string} appliedEndDate
 */
export function buildLocalParentReportsForDevTest(
  playerName,
  period,
  customDates,
  appliedStartDate,
  appliedEndDate
) {
  const args = resolveParentReportGenerationArgs(
    period,
    customDates,
    appliedStartDate,
    appliedEndDate
  );
  return {
    data: generateParentReportV2(
      playerName,
      args.period,
      args.customStartDate,
      args.customEndDate
    ),
    detailed: generateDetailedParentReport(
      playerName,
      args.period,
      args.customStartDate,
      args.customEndDate
    ),
  };
}
