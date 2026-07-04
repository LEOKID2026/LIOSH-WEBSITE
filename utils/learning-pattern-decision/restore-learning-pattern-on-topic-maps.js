/**
 * Restore learningPatternDecision + engineDecisionContract on topic map rows
 * after server practice sync replaces map objects.
 */
import { REPORT_TOPIC_MAP_KEYS } from "../../lib/learning/normalized-subject-practice.js";

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
export function restoreLearningPatternDecisionsFromUnits(report) {
  const units = report?.diagnosticEngineV2?.units;
  if (!Array.isArray(units) || !units.length || !report || typeof report !== "object") {
    return report;
  }

  for (const unit of units) {
    if (!unit || typeof unit !== "object") continue;
    const sid = String(unit.subjectId || "").trim();
    const mapKey = REPORT_TOPIC_MAP_KEYS[sid];
    if (!mapKey) continue;
    const topicMap = report[mapKey];
    if (!topicMap || typeof topicMap !== "object") continue;

    const trk = String(unit.topicRowKey || "").trim();
    if (!trk) continue;
    const row = topicMap[trk];
    if (!row || typeof row !== "object") continue;

    const lpd = unit.learningPatternDecision;
    if (lpd && typeof lpd === "object") {
      row.learningPatternDecision = lpd;
    }

    const contract = unit.engineDecisionContract || lpd?.engineDecisionContract;
    if (contract && typeof contract === "object") {
      row.engineDecisionContract = contract;
      unit.engineDecisionContract = contract;
    }

    if (lpd?.parentVisibleMetrics && typeof lpd.parentVisibleMetrics === "object") {
      row.parentVisibleMetrics = lpd.parentVisibleMetrics;
    }
  }

  return report;
}
