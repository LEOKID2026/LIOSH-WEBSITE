/**
 * P6 — short report ≡ detailed report per topic (learningPatternDecision fields).
 */
import { SUBJECT_IDS } from "../diagnostic-engine-v2/subject-ids.js";

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historyTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

/**
 * @param {unknown} baseReport
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
export function shortLearningPatternDecisionFromBase(baseReport, subjectId, topicRowKey) {
  const mk = REPORT_MAP_KEY[subjectId];
  if (!mk) return null;
  const row = baseReport?.[mk]?.[topicRowKey];
  return row?.learningPatternDecision || null;
}

/**
 * @param {unknown} detailedReport
 * @param {string} subjectId
 * @param {string} topicRowKey
 * @param {unknown} [baseReport]
 */
export function detailedLearningPatternDecisionFromReport(
  detailedReport,
  subjectId,
  topicRowKey,
  baseReport = null,
) {
  const sp = (detailedReport?.subjectProfiles || []).find((s) => String(s?.subject) === subjectId);
  if (sp) {
    const fromOverview = (sp.topicOverviewRows || []).find(
      (r) => String(r?.topicRowKey || "") === topicRowKey,
    );
    if (fromOverview?.learningPatternDecision) return fromOverview.learningPatternDecision;
    const fromRec = (sp.topicRecommendations || []).find(
      (r) => String(r?.topicRowKey || r?.topicKey || "") === topicRowKey,
    );
    if (fromRec?.learningPatternDecision) return fromRec.learningPatternDecision;
  }

  if (baseReport) {
    const units = baseReport?.diagnosticEngineV2?.units;
    if (Array.isArray(units)) {
      const unit = units.find(
        (u) =>
          String(u?.subjectId || "") === subjectId &&
          String(u?.topicRowKey || "") === topicRowKey,
      );
      if (unit?.learningPatternDecision) return unit.learningPatternDecision;
    }
    const mk = REPORT_MAP_KEY[subjectId];
    const row = mk && baseReport?.[mk]?.[topicRowKey];
    if (row?.learningPatternDecision) return row.learningPatternDecision;
  }

  return null;
}

/**
 * @param {unknown} shortLpd
 * @param {unknown} detailedLpd
 */
export function learningPatternDecisionsMatch(shortLpd, detailedLpd) {
  if (!shortLpd && !detailedLpd) return true;
  if (!shortLpd || !detailedLpd) return false;
  const fields = [
    "topicStatus",
    "findingType",
    "parentWordingLevel",
    "parentVisibleFinding",
    "evidenceStrength",
    "observedPatternLevel",
  ];
  for (const f of fields) {
    if (String(shortLpd[f] || "") !== String(detailedLpd[f] || "")) return false;
  }
  return true;
}

/**
 * @param {unknown} baseReport
 * @param {unknown} detailedReport
 * @returns {{ ok: boolean, mismatches: object[], compared: number }}
 */
export function compareShortDetailedLearningPatternFindings(baseReport, detailedReport) {
  /** @type {object[]} */
  const mismatches = [];
  let compared = 0;

  for (const subjectId of SUBJECT_IDS) {
    const mk = REPORT_MAP_KEY[subjectId];
    const topicMap = mk && baseReport?.[mk];
    if (!topicMap || typeof topicMap !== "object") continue;

    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;

      const shortLpd = row.learningPatternDecision || null;
      const detailedLpd = detailedLearningPatternDecisionFromReport(
        detailedReport,
        subjectId,
        topicRowKey,
        baseReport,
      );
      compared += 1;

      if (!learningPatternDecisionsMatch(shortLpd, detailedLpd)) {
        mismatches.push({
          subjectId,
          topicRowKey,
          short: {
            topicStatus: shortLpd?.topicStatus,
            parentVisibleFinding: shortLpd?.parentVisibleFinding,
          },
          detailed: {
            topicStatus: detailedLpd?.topicStatus,
            parentVisibleFinding: detailedLpd?.parentVisibleFinding,
          },
        });
      }
    }
  }

  return { ok: mismatches.length === 0, mismatches, compared };
}

export default {
  shortLearningPatternDecisionFromBase,
  detailedLearningPatternDecisionFromReport,
  learningPatternDecisionsMatch,
  compareShortDetailedLearningPatternFindings,
};
