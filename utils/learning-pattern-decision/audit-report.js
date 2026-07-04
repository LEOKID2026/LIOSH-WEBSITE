/**
 * P7/P8 — inclusion/exclusion audit across all subjects in a base report.
 */
import { SUBJECT_IDS } from "../diagnostic-engine-v2/subject-ids.js";
import { partitionPatternEligibleMistakes } from "./resolve-excluded-evidence.js";
import { traceRowConflictReport } from "./trace-row-conflict-report.js";
import { findForbiddenParentWords } from "./build-parent-visible-finding.js";

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
 * @param {Record<string, unknown[]>} [rawMistakesBySubject]
 * @param {number} [startMs]
 * @param {number} [endMs]
 */
export function auditLearningPatternDecisionReport(baseReport, rawMistakesBySubject = {}, startMs = 0, endMs = Date.now()) {
  /** @type {object[]} */
  const rows = [];
  /** @type {object[]} */
  const conflicts = [];
  /** @type {object[]} */
  const forbiddenHits = [];
  /** @type {object[]} */
  const missingLpd = [];
  /** @type {object[]} */
  const learningLeaks = [];

  for (const subjectId of SUBJECT_IDS) {
    const mk = REPORT_MAP_KEY[subjectId];
    const topicMap = mk && baseReport?.[mk];
    if (!topicMap || typeof topicMap !== "object") continue;

    const subjectQ = Object.values(topicMap).reduce(
      (acc, r) => acc + (Number(r?.questions) || 0),
      0,
    );
    if (subjectQ <= 0) continue;

    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;

      const lpd = row.learningPatternDecision;
      if (!lpd) {
        missingLpd.push({ subjectId, topicRowKey });
        continue;
      }

      const conflict = traceRowConflictReport(lpd);
      if (conflict.conflict) {
        conflicts.push({ subjectId, topicRowKey, reasons: conflict.reasons });
      }

      const forbidden = findForbiddenParentWords(lpd.parentVisibleFinding);
      if (forbidden.length) {
        forbiddenHits.push({ subjectId, topicRowKey, forbidden, text: lpd.parentVisibleFinding });
      }

      const raw = Array.isArray(rawMistakesBySubject[subjectId]) ? rawMistakesBySubject[subjectId] : [];
      const part = partitionPatternEligibleMistakes(raw, subjectId, topicRowKey, startMs, endMs);
      const learningExcluded = part.excludedEvidence.some((e) =>
        /learning|book|guided/.test(String(e.reason)),
      );
      if (part.included.some((e) => String(e.mode) === "learning")) {
        learningLeaks.push({ subjectId, topicRowKey, mode: "learning_included" });
      }

      rows.push({
        subjectId,
        topicRowKey,
        topicStatus: lpd.topicStatus,
        findingType: lpd.findingType,
        parentWordingLevel: lpd.parentWordingLevel,
        competitiveBucketOnly: lpd.competitiveBucketOnly,
        excludedEvidence: lpd.excludedEvidence,
        enrichmentMissing: lpd.enrichmentMissing,
        learningExcluded,
      });
    }
  }

  /** @type {object[]} */
  const missingSubtopicLpd = [];

  const historySubtopics = baseReport?.historySubtopics;
  if (historySubtopics && typeof historySubtopics === "object") {
    for (const [topicRowKey, row] of Object.entries(historySubtopics)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;
      const lpd = row.learningPatternDecision;
      if (!lpd) {
        missingSubtopicLpd.push({ subjectId: "history", topicRowKey, kind: "history_subtopic" });
        continue;
      }
      if (!lpd.projectedFrom && !lpd.subtopicBreakdown) {
        conflicts.push({
          subjectId: "history",
          topicRowKey,
          reasons: ["history_subtopic_missing_projection"],
        });
      }
      rows.push({
        subjectId: "history",
        topicRowKey,
        rowKind: "history_subtopic",
        topicStatus: lpd.topicStatus,
        projectedFrom: lpd.projectedFrom || null,
      });
    }
  }

  return {
    ok:
      conflicts.length === 0 &&
      forbiddenHits.length === 0 &&
      missingLpd.length === 0 &&
      missingSubtopicLpd.length === 0 &&
      learningLeaks.length === 0,
    rowCount: rows.length,
    rows,
    conflicts,
    forbiddenHits,
    missingLpd,
    missingSubtopicLpd,
    learningLeaks,
  };
}

export default { auditLearningPatternDecisionReport };
