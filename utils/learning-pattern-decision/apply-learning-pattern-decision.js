/**
 * Apply learningPatternDecision to DE2 units + map rows (all subjects).
 */
import { SUBJECT_IDS } from "../diagnostic-engine-v2/subject-ids.js";
import { buildLearningPatternDecision } from "./build-learning-pattern-decision.js";
import { normalizeParentVisibleMetrics } from "./normalize-parent-practice-metrics.js";
import { projectHistorySubtopicLearningPatternDecisions } from "./project-history-subtopic-lpd.js";

/**
 * @param {object|null} professionalEngineV1
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
function professionalSliceForUnit(professionalEngineV1, subjectId, topicRowKey) {
  if (!professionalEngineV1 || typeof professionalEngineV1 !== "object") return null;
  const skills = professionalEngineV1.skillFindings;
  if (!Array.isArray(skills) || !skills.length) return null;
  const bucket = String(topicRowKey).split("\u0001")[0];
  const match =
    skills.find(
      (s) =>
        String(s?.subjectId || "") === subjectId &&
        (String(s?.topicRowKey || "") === topicRowKey ||
          String(s?.topicKey || "") === bucket ||
          String(s?.skillId || "").includes(bucket)),
    ) || null;
  if (!match) return null;
  return {
    reliabilitySoftened: match.reliabilityBand === "low" || match.guessingLikely === true,
    masterySignal: match.masteryLevel || null,
    trend: match.trend || null,
    raw: match,
  };
}

/**
 * @param {object} p
 * @param {object|null} p.diagnosticEngineV2
 * @param {Record<string, Record<string, Record<string, unknown>>>} p.maps
 * @param {object|null} [p.diagnosticEngineV3]
 * @param {Record<string, unknown[]>} [p.rawMistakesBySubject]
 * @param {number} [p.startMs]
 * @param {number} [p.endMs]
 */
export function applyLearningPatternDecisionToUnitsAndRows({
  diagnosticEngineV2,
  maps,
  diagnosticEngineV3 = null,
  rawMistakesBySubject = {},
  startMs = 0,
  endMs = Date.now(),
}) {
  const units = Array.isArray(diagnosticEngineV2?.units) ? diagnosticEngineV2.units : [];
  const v3Enrichments = Array.isArray(diagnosticEngineV3?.unitEnrichments)
    ? diagnosticEngineV3.unitEnrichments
    : [];
  const professionalEngineV1 = diagnosticEngineV2?.professionalEngineV1 || null;

  /** @type {Record<string, Record<string, import("./schema.js").LearningPatternDecisionShape>>} */
  const bySubject = {};

  for (const subjectId of SUBJECT_IDS) {
    const topicMap = maps?.[subjectId];
    if (!topicMap || typeof topicMap !== "object") continue;
    bySubject[subjectId] = bySubject[subjectId] || {};

    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;

      const metrics = normalizeParentVisibleMetrics(row);
      row.parentVisibleMetrics = metrics;
      row.questions = metrics.questions;
      row.correct = metrics.correct;
      row.wrong = metrics.wrong;
      row.accuracy = metrics.accuracy;

      const unit =
        units.find(
          (u) =>
            String(u?.subjectId || "") === subjectId &&
            String(u?.topicRowKey || "") === topicRowKey,
        ) || null;

      const v3Enrichment =
        v3Enrichments.find(
          (e) =>
            String(e?.subjectId || "") === subjectId &&
            String(e?.topicRowKey || "") === topicRowKey,
        ) || null;

      const rawMistakes = Array.isArray(rawMistakesBySubject[subjectId])
        ? rawMistakesBySubject[subjectId]
        : [];

      const lpd = buildLearningPatternDecision({
        subjectId,
        topicRowKey,
        row,
        unit,
        v3Enrichment,
        professionalSlice: professionalSliceForUnit(professionalEngineV1, subjectId, topicRowKey),
        rawMistakes,
        startMs,
        endMs,
      });

      row.learningPatternDecision = lpd;
      row.engineDecisionContract = lpd.engineDecisionContract || null;
      bySubject[subjectId][topicRowKey] = lpd;

      if (unit) {
        unit.learningPatternDecision = lpd;
        unit.engineDecisionContract = lpd.engineDecisionContract || null;
      }
    }
  }

  if (diagnosticEngineV2 && typeof diagnosticEngineV2 === "object") {
    diagnosticEngineV2.learningPatternDecisionBySubject = bySubject;
  }

  const historySubtopicProjection = projectHistorySubtopicLearningPatternDecisions(
    maps?.history,
    maps?.historySubtopics,
  );

  return {
    bySubject,
    unitsUpdated: units.filter((u) => u.learningPatternDecision).length,
    historySubtopicProjection,
  };
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape|null|undefined} lpd
 */
export function isPracticedTopicWithParentFinding(lpd) {
  if (!lpd || typeof lpd !== "object") return false;
  if (lpd.topicStatus === "not_practiced" || (lpd.practicedQuestions || 0) <= 0) return false;
  if (String(lpd.parentVisibleFinding || "").trim()) return true;
  if (lpd.topicStatus === "initial_data" || lpd.findingType === "initial_topic_data") return true;
  if (lpd.parentWordingLevel === "no_parent_text" && !lpd.parentVisibleFinding) {
    return lpd.topicStatus !== "no_clear_pattern" ? true : false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} row
 */
export function rowNeedsPracticeFromLpd(row) {
  const lpd = row?.learningPatternDecision;
  if (!lpd) return false;
  const ft = String(lpd.findingType || "");
  const ts = String(lpd.topicStatus || "");
  if (ts === "initial_data" || ft === "initial_topic_data") return false;
  if ((lpd.practicedQuestions || 0) <= 2) return false;
  return (
    ft === "difficulty_pattern" ||
    ft === "practice_focus" ||
    ts === "difficulty_observed" ||
    ts === "difficulty_repeated" ||
    ts === "practice_focus" ||
    ts === "mixed"
  );
}

/**
 * @param {Record<string, unknown>} row
 */
export function rowIsPositiveFromLpd(row) {
  const lpd = row?.learningPatternDecision;
  if (!lpd) return false;
  if ((lpd.practicedQuestions || 0) <= 2) return false;
  if (lpd.topicStatus === "initial_data" || lpd.findingType === "initial_topic_data") return false;
  return (
    lpd.findingType === "success_pattern" ||
    String(lpd.topicStatus || "").startsWith("positive")
  );
}
