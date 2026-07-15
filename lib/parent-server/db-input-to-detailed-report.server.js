/**
 * Server-only: rebuild `generateDetailedParentReport`-shaped payload from Supabase report-data JSON
 * by seeding a minimal browser-like localStorage + calling existing report builders (no product logic changes).
 */

import { buildReportInputFromDbData } from "../learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../learning-supabase/seed-db-report-local-storage.js";
import { applyBridgeProvenanceToGeneratedReport } from "../learning-supabase/bridge-report-provenance.js";
import { applyParentReportGamificationOverlay } from "../learning-shared/student-account-state-view.js";
import { syncReportVisiblePracticeFromServer } from "../learning/report-visible-practice-sync.js";
import { applyServerParentFacingAuthorityToClientReport } from "./parent-facing-report-authority.js";
import { applyTopicEngineParentFacingInsights } from "../../utils/parent-report-engine-insights-he.js";
import { buildRegularReportViewModel } from "../parent-ui/parent-report-regular-display.js";

/** @type {Promise<void>} */
let rebuildMutexTail = Promise.resolve();

/**
 * Serialize rebuilds - `generateParentReportV2` mutates `globalThis.localStorage`.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function runWithParentReportRebuildLock(fn) {
  const run = rebuildMutexTail.then(() => fn());
  rebuildMutexTail = run.then(
    () => {},
    () => {}
  );
  return run;
}

function makeStorageShim(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/**
 * @param {Record<string, unknown>} reportApiBody — output of {@link aggregateParentReportPayload}
 * @param {string} periodLabel original UI period (`week`|`month`|`custom`)
 * @returns {Promise<object|null>}
 */
export async function buildDetailedPayloadFromAggregatedReportBody(reportApiBody, periodLabel) {
  return runWithParentReportRebuildLock(async () => {
    const dbInput = buildReportInputFromDbData(reportApiBody, {
      period: periodLabel || "custom",
      timezone: "UTC",
    });
    const student = dbInput.student && typeof dbInput.student === "object" ? dbInput.student : {};
    const playerName = String(student.name || "").trim() || "Student";

    const store = new Map();
    globalThis.localStorage = makeStorageShim(store);
    globalThis.window = globalThis;

    store.set("mleo_player_name", playerName);
    seedLocalStorageFromDbReportInput(store, dbInput);

    const [{ generateParentReportV2 }, detailedModule] = await Promise.all([
      import("../../utils/parent-report-v2.js"),
      import("../../utils/detailed-parent-report.js"),
    ]);
    const { attachOutOfGradeTransparencyFromRawBase, buildDetailedParentReportFromBaseReport } =
      detailedModule;

    const from = String(dbInput.range?.from || "").slice(0, 10);
    const to = String(dbInput.range?.to || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return null;
    }

    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base || typeof base !== "object") return null;

    const { attachDiagnosticEngineV3 } = await import("../../utils/diagnostic-engine-v3/attach-diagnostic-engine-v3.js");
    attachDiagnosticEngineV3(base, {
      probeEvidence: reportApiBody?.probeEvidence ?? null,
      startMs: dbInput.range?.startMs,
      endMs: dbInput.range?.endMs,
    });

    applyParentReportGamificationOverlay(base, reportApiBody);
    applyServerParentFacingAuthorityToClientReport(base, reportApiBody);
    applyTopicEngineParentFacingInsights(base, reportApiBody);
    base._reportApiPayload = reportApiBody;
    applyBridgeProvenanceToGeneratedReport(base, dbInput, reportApiBody);
    syncReportVisiblePracticeFromServer(base, {
      apiPayload: reportApiBody,
      dbInput,
    });

    const rawBaseReport = base;
    const gradeFilteredBase = buildRegularReportViewModel(rawBaseReport)?.report ?? rawBaseReport;

    const metaPeriod = periodLabel === "week" || periodLabel === "month" ? periodLabel : "custom";
    const detailed = attachOutOfGradeTransparencyFromRawBase(
      buildDetailedParentReportFromBaseReport(gradeFilteredBase, {
        playerName,
        period: metaPeriod,
      }),
      rawBaseReport,
    );
    return detailed && typeof detailed === "object" ? detailed : null;
  });
}
