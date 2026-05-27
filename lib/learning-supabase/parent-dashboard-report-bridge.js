/**
 * Client-only: rebuild short + detailed parent reports from GET report-data API JSON
 * using the existing generateParentReportV2 pipeline. Temporarily seeds localStorage and restores
 * previous keys so the learner profile on this browser is not permanently overwritten.
 */

import { buildReportInputFromDbData } from "./report-data-adapter.js";
import {
  seedLocalStorageFromDbReportInput,
  SEEDED_MLEO_STORAGE_KEYS,
} from "./seed-db-report-local-storage.js";
import { applyParentReportGamificationOverlay } from "../learning-shared/student-account-state-view.js";
import { generateParentReportV2 } from "../../utils/parent-report-v2.js";
import { buildDetailedParentReportFromBaseReport } from "../../utils/detailed-parent-report.js";

const BACKUP_KEYS = [...SEEDED_MLEO_STORAGE_KEYS, "mleo_player_name"];

function backupMleoReportKeys() {
  const snap = {};
  for (const k of BACKUP_KEYS) {
    try {
      snap[k] = window.localStorage.getItem(k);
    } catch {
      snap[k] = null;
    }
  }
  return snap;
}

function restoreMleoReportKeys(snap) {
  for (const k of BACKUP_KEYS) {
    try {
      const v = snap[k];
      if (v === null || v === undefined) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch {
      /* no-op */
    }
  }
}

/** Align `from`/`to` query params with parent-report-v2 non-custom windows (7 / 30 days). */
export function computeReportRangeForParentApi(period, customDates, appliedStartDate, appliedEndDate) {
  if (customDates && appliedStartDate && appliedEndDate && appliedStartDate <= appliedEndDate) {
    return { from: appliedStartDate, to: appliedEndDate };
  }
  const days = period === "month" ? 30 : 7;
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

/**
 * @param {Record<string, unknown>} reportApiBody — body from aggregateParentReportPayload / report-data API
 * @param {string} uiPeriodLabel — `week` | `month` | `custom` (for detailed meta only)
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

  const seeded = new Map();
  seedLocalStorageFromDbReportInput(seeded, dbInput);

  const snap = backupMleoReportKeys();
  try {
    for (const [k, v] of seeded.entries()) {
      window.localStorage.setItem(k, v);
    }
    window.localStorage.setItem("mleo_player_name", playerName);

    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base || typeof base !== "object") {
      return { ok: false, error: "no_base" };
    }
    applyParentReportGamificationOverlay(base, reportApiBody);
    if (reportApiBody?.parentFacing && typeof reportApiBody.parentFacing === "object") {
      base.parentFacing = reportApiBody.parentFacing;
    }

    const metaPeriod =
      uiPeriodLabel === "week" || uiPeriodLabel === "month" ? uiPeriodLabel : "custom";
    const detailed = buildDetailedParentReportFromBaseReport(base, {
      playerName,
      period: metaPeriod,
    });

    return {
      ok: true,
      base,
      detailed: detailed && typeof detailed === "object" ? detailed : null,
      playerName,
      dbInput,
    };
  } finally {
    restoreMleoReportKeys(snap);
  }
}
