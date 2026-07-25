/**
 * Shared server rebuild of the production parent-report base from aggregated report-data.
 * Same builders as the client remote path / detailed rebuild — no parallel demo logic.
 */

import { buildReportInputFromDbData } from "../learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../learning-supabase/seed-db-report-local-storage.js";
import { applyBridgeProvenanceToGeneratedReport } from "../learning-supabase/bridge-report-provenance.js";
import { applyParentReportGamificationOverlay } from "../learning-shared/student-account-state-view.js";
import { syncReportVisiblePracticeFromServer } from "../learning/report-visible-practice-sync.js";
import {
  applyServerParentFacingAuthorityToClientReport,
  cloneParentFacingBlock,
} from "./parent-facing-report-authority.js";
import { applyTopicEngineParentFacingInsights } from "../../utils/parent-report-engine-insights-he.js";
import { generateParentReportV2 } from "../../utils/parent-report-v2.js";

function makeStorageShim(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/**
 * Rebuild the canonical V2 base report (DE2/LPD/EDC/ADC + topic-engine parentFacing).
 * @param {Record<string, unknown>} reportApiBody
 * @param {string} [periodLabel]
 * @returns {{ ok: true, base: Record<string, unknown>, parentFacing: Record<string, unknown>|null, dbInput: object, playerName: string } | { ok: false, error: string }}
 */
export function rebuildParentReportBaseFromAggregatedBody(reportApiBody, periodLabel = "custom") {
  if (!reportApiBody || typeof reportApiBody !== "object") {
    return { ok: false, error: "missing_payload" };
  }

  const dbInput = buildReportInputFromDbData(reportApiBody, {
    period: periodLabel || "custom",
    timezone: "UTC",
  });
  const student = dbInput.student && typeof dbInput.student === "object" ? dbInput.student : {};
  const playerName = String(student.name || "").trim() || "Student";

  const from = String(dbInput.range?.from || "").slice(0, 10);
  const to = String(dbInput.range?.to || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { ok: false, error: "bad_range" };
  }

  const priorLs = globalThis.localStorage;
  const priorWin = globalThis.window;
  const store = new Map();
  globalThis.localStorage = makeStorageShim(store);
  globalThis.window = globalThis;

  try {
    store.set("mleo_player_name", playerName);
    seedLocalStorageFromDbReportInput(store, dbInput);

    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base || typeof base !== "object") {
      return { ok: false, error: "generate_failed" };
    }

    applyParentReportGamificationOverlay(base, reportApiBody);
    applyServerParentFacingAuthorityToClientReport(base, reportApiBody);
    applyTopicEngineParentFacingInsights(base, reportApiBody);
    base._reportApiPayload = reportApiBody;
    applyBridgeProvenanceToGeneratedReport(base, dbInput, reportApiBody);
    syncReportVisiblePracticeFromServer(base, {
      apiPayload: reportApiBody,
      dbInput,
    });

    const parentFacing =
      base.parentFacing && typeof base.parentFacing === "object"
        ? cloneParentFacingBlock(base.parentFacing)
        : null;

    return { ok: true, base, parentFacing, dbInput, playerName };
  } finally {
    if (priorLs === undefined) {
      try {
        delete globalThis.localStorage;
      } catch {
        /* ignore */
      }
    } else {
      globalThis.localStorage = priorLs;
    }
    if (priorWin === undefined) {
      try {
        delete globalThis.window;
      } catch {
        /* ignore */
      }
    } else {
      globalThis.window = priorWin;
    }
  }
}
