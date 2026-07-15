/**
 * Phase 9 — Build parent report views from GET report-data API JSON using an isolated
 * in-memory storage shim. Does not read or write the browser's real localStorage.
 */

import { buildReportInputFromDbData } from "./report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "./seed-db-report-local-storage.js";
import { applyParentReportGamificationOverlay } from "../learning-shared/student-account-state-view.js";
import { generateParentReportV2 } from "../../utils/parent-report-v2.js";
import {
  attachOutOfGradeTransparencyFromRawBase,
  buildDetailedParentReportFromBaseReport,
} from "../../utils/detailed-parent-report.js";
import { applyServerParentFacingAuthorityToClientReport } from "../parent-server/parent-facing-report-authority.js";
import { applyTopicEngineParentFacingInsights } from "../../utils/parent-report-engine-insights-he.js";
import { applyBridgeProvenanceToGeneratedReport } from "./bridge-report-provenance.js";
import { syncReportVisiblePracticeFromServer } from "../learning/report-visible-practice-sync.js";
import { buildRegularReportViewModel } from "../parent-ui/parent-report-regular-display.js";

export {
  computeReportRangeForParentApi,
  resolveParentReportGenerationArgs,
} from "../reporting/parent-report-date-range.js";

/**
 * @param {Map<string, string>} store
 */
function makeStorageShim(store) {
  return {
    get length() {
      return store.size;
    },
    key: (index) => [...store.keys()][index] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

/**
 * Run `fn` while `window.localStorage` points at an isolated shim (browser only).
 * @param {Map<string, string>} store
 * @param {() => T} fn
 * @returns {T}
 * @template T
 */
export function runWithIsolatedReportStorage(store, fn) {
  if (typeof window === "undefined") {
    throw new Error("browser_only");
  }
  const prior = window.localStorage;
  const shim = makeStorageShim(store);
  try {
    Object.defineProperty(window, "localStorage", {
      value: shim,
      configurable: true,
      writable: true,
    });
    return fn();
  } finally {
    try {
      Object.defineProperty(window, "localStorage", {
        value: prior,
        configurable: true,
        writable: true,
      });
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {Record<string, unknown>} reportApiBody — body from aggregateParentReportPayload / report-data API
 * @param {string} uiPeriodLabel - `week` | `month` | `custom` (for detailed meta only)
 * @returns {{ ok: true, base: object, detailed: object | null, playerName: string, dbInput: object } | { ok: false, error: string }}
 */
export function runParentReportGenerationFromApiBody(reportApiBody, uiPeriodLabel) {
  if (typeof window === "undefined") {
    return { ok: false, error: "server" };
  }

  const dbInput = buildReportInputFromDbData(reportApiBody, {
    period: uiPeriodLabel || "custom",
    timezone: "UTC",
  });
  const playerName = String(dbInput.student?.name || "").trim() || "Student";

  const from = String(dbInput.range?.from || "").slice(0, 10);
  const to = String(dbInput.range?.to || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { ok: false, error: "bad_range" };
  }

  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  store.set("mleo_player_name", playerName);

  try {
    const { base, detailed } = runWithIsolatedReportStorage(store, () => {
      const generated = generateParentReportV2(playerName, "custom", from, to);
      if (!generated || typeof generated !== "object") {
        return { base: null, detailed: null };
      }
      applyParentReportGamificationOverlay(generated, reportApiBody);
      applyServerParentFacingAuthorityToClientReport(generated, reportApiBody);
      applyTopicEngineParentFacingInsights(generated, reportApiBody);
      generated._reportApiPayload = reportApiBody;
      applyBridgeProvenanceToGeneratedReport(generated, dbInput, reportApiBody);
      if (Array.isArray(reportApiBody?.parentAssignedActivitiesInPeriod)) {
        generated.parentAssignedActivitiesInPeriod = reportApiBody.parentAssignedActivitiesInPeriod;
      }
      syncReportVisiblePracticeFromServer(generated, {
        apiPayload: reportApiBody,
        dbInput,
      });

      const rawBaseReport = generated;
      const gradeFilteredBase = buildRegularReportViewModel(rawBaseReport)?.report ?? rawBaseReport;

      const metaPeriod =
        uiPeriodLabel === "week" || uiPeriodLabel === "month" ? uiPeriodLabel : "custom";
      const detailedReport = attachOutOfGradeTransparencyFromRawBase(
        buildDetailedParentReportFromBaseReport(gradeFilteredBase, {
          playerName,
          period: metaPeriod,
        }),
        rawBaseReport,
      );

      return {
        base: gradeFilteredBase,
        detailed: detailedReport && typeof detailedReport === "object" ? detailedReport : null,
      };
    });

    if (!base) {
      return { ok: false, error: "no_base" };
    }

    return {
      ok: true,
      base,
      detailed,
      playerName,
      dbInput,
    };
  } catch (err) {
    if (typeof window !== "undefined") {
      try {
        window.__parentReportGenerationLastError = String(err?.stack || err?.message || err);
      } catch {
        /* ignore */
      }
    }
    return { ok: false, error: "generation_failed" };
  }
}
