/**
 * מדיניות ביטחון — תואם stage1 §9 + אותות שורה קיימים (diagnostics).
 * @typedef {"high"|"moderate"|"low"|"early_signal_only"|"insufficient_data"|"contradictory"} ConfidenceLevel
 */

/**
 * @param {object} p
 * @param {import("../mistake-event.js").MistakeEventV1[]} p.events
 * @param {import("../mistake-event.js").MistakeEventV1[]} p.wrongs
 * @param {Record<string, unknown>} p.row
 * @param {boolean} p.recurrenceFull
 * @param {boolean} p.hintInvalidates
 * @returns {ConfidenceLevel}
 */
export function resolveConfidenceLevel({ events, wrongs, row, recurrenceFull, hintInvalidates }) {
  const q = Number(row?.questions) || 0;
  const w = Math.max(wrongs.length, Number(row?.wrong) || 0);

  const dom = row?.behaviorProfile && typeof row.behaviorProfile === "object" ? row.behaviorProfile.dominantType : null;
  const needsPractice = !!row?.needsPractice;
  if (needsPractice && dom === "stable_mastery") return "contradictory";

  if (q >= 40) return "high";
  if (q >= 12 && w >= 2 && recurrenceFull) return "moderate";
  if (q < 2 && w === 0) return "insufficient_data";
  if (q < 4 && w < 2) return "insufficient_data";

  if (hintInvalidates) return "early_signal_only";

  // Overclaim guard: small samples must not reach moderate (q=3/w=2 fix)
  if (q < 5 && w >= 2) return "early_signal_only";

  const earlyOnly = row?.isEarlySignalOnly === true;
  const suff = row?.dataSufficiencyLevel != null ? String(row.dataSufficiencyLevel) : "";
  if (earlyOnly || suff === "weak" || suff === "thin") {
    if (!recurrenceFull && w < 4) return "early_signal_only";
  }

  if (!recurrenceFull) {
    if (w >= 2 && q >= 5) return "moderate";
    if (w >= 2) return "early_signal_only";
    return "low";
  }

  const c01 = Number(row?.confidence01);
  if (Number.isFinite(c01) && c01 >= 0.72 && suff === "strong") return "high";
  if (Number.isFinite(c01) && c01 >= 0.45) return "moderate";
  return "moderate";
}
