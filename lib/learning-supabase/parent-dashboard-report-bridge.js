/**
 * @deprecated Phase 9 - use `parent-report-from-api-payload.js` (no real localStorage).
 * Kept as a thin re-export for legacy script imports only.
 */

export {
  runParentReportGenerationFromApiBody,
  runWithIsolatedReportStorage,
  computeReportRangeForParentApi,
  resolveParentReportGenerationArgs,
} from "./parent-report-from-api-payload.js";
