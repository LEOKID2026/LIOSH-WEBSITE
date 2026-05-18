/**
 * Trace one logical row through parent-report pipeline stages (debug + invariant tests).
 */

import { buildRowIdentityV1, buildRowSourceId } from "./row-identity-v1.js";
import { SUBJECT_ORDER } from "../parent-copilot/contract-reader.js";

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

/**
 * @param {unknown} baseReport
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
function mapRowFromBase(baseReport, subjectId, topicRowKey) {
  const mk = REPORT_MAP_KEY[subjectId];
  if (!mk || !baseReport?.[mk]) return null;
  const row = baseReport[mk][topicRowKey];
  return row && typeof row === "object" ? row : null;
}

/**
 * @param {unknown} baseReport
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
function v2UnitFromBase(baseReport, subjectId, topicRowKey) {
  const units = baseReport?.diagnosticEngineV2?.units;
  if (!Array.isArray(units)) return null;
  return (
    units.find(
      (u) => String(u?.subjectId || "") === subjectId && String(u?.topicRowKey || "") === topicRowKey,
    ) || null
  );
}

/**
 * @param {unknown} detailedReport
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
function detailedTopicRec(detailedReport, subjectId, topicRowKey) {
  const sp = (detailedReport?.subjectProfiles || []).find((s) => String(s?.subject) === subjectId);
  if (!sp) return null;
  return (sp.topicRecommendations || []).find((t) => String(t?.topicRowKey || t?.topicKey) === topicRowKey) || null;
}

/**
 * @param {unknown} detailedReport
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
function detailedStrengthWeak(detailedReport, subjectId, topicRowKey) {
  const sp = (detailedReport?.subjectProfiles || []).find((s) => String(s?.subject) === subjectId);
  if (!sp) return { strength: null, weakness: null };
  const strength = (sp.topStrengths || []).find((r) => String(r?.topicRowKey || "") === topicRowKey) || null;
  const weakness = (sp.topWeaknesses || []).find((r) => String(r?.topicRowKey || "") === topicRowKey) || null;
  return { strength, weakness };
}

/**
 * @param {unknown} payload
 * @param {string} subjectId
 * @param {string} topicRowKey
 */
function copilotTopicRow(payload, subjectId, topicRowKey) {
  const sp = (payload?.subjectProfiles || []).find((s) => String(s?.subject) === subjectId);
  if (!sp) return null;
  return (sp.topicRecommendations || []).find((t) => String(t?.topicRowKey || t?.topicKey) === topicRowKey) || null;
}

/**
 * @param {{
 *   baseReport?: unknown;
 *   detailedReport?: unknown;
 *   copilotPayload?: unknown;
 *   subjectId: string;
 *   topicRowKey: string;
 * }} args
 */
export function traceRowThroughPipeline(args) {
  const subjectId = String(args?.subjectId || "");
  const topicRowKey = String(args?.topicRowKey || "");
  const base = args?.baseReport;
  const detailed = args?.detailedReport;
  const copilot = args?.copilotPayload || detailed;

  const mapRow = base ? mapRowFromBase(base, subjectId, topicRowKey) : null;
  const unit = base ? v2UnitFromBase(base, subjectId, topicRowKey) : null;
  const tr = detailed ? detailedTopicRec(detailed, subjectId, topicRowKey) : null;
  const { strength, weakness } = detailed ? detailedStrengthWeak(detailed, subjectId, topicRowKey) : { strength: null, weakness: null };
  const cop = copilot ? copilotTopicRow(copilot, subjectId, topicRowKey) : null;

  const registeredGradeKey = base?.registeredGradeKey ?? detailed?.registeredGradeKey ?? null;

  const sourceIdentity = buildRowIdentityV1({
    subjectId,
    topicRowKey,
    displayName: mapRow?.displayName || unit?.displayName || tr?.displayName,
    contentGradeKey: mapRow?.gradeKey,
    registeredGradeKey,
    questions: mapRow?.questions ?? unit?.evidenceTrace?.[0]?.value?.questions,
    accuracy: mapRow?.accuracy ?? unit?.evidenceTrace?.[0]?.value?.accuracy,
    correct: mapRow?.correct,
    timeSpentMinutes: mapRow?.timeMinutes,
    latestActivityAt: mapRow?.latestActivityAt || mapRow?.lastAnswerAt,
    dataSufficiencyLevel: tr?.dataSufficiencyLevel,
    thinEvidenceDowngraded: tr?.thinEvidenceDowngraded,
    hasSubskillMetadata: tr?.hasSubskillMetadata,
    recommendedStepLabelHe: tr?.recommendedStepLabelHe,
    diagnosticPatternHe: unit?.taxonomy?.patternHe,
  });

  const narrativeUnc = String(tr?.contractsV1?.narrative?.textSlots?.uncertainty || "");

  return {
    topicRowKey,
    subjectId,
    sourceId: sourceIdentity.sourceId,
    stages: {
      mapRow: mapRow
        ? {
            questions: mapRow.questions,
            accuracy: mapRow.accuracy,
            timeMinutes: mapRow.timeMinutes,
            gradeKey: mapRow.gradeKey,
          }
        : null,
      v2Unit: unit
        ? {
            questions: unit.evidenceTrace?.[0]?.value?.questions,
            accuracy: unit.evidenceTrace?.[0]?.value?.accuracy,
            patternHe: unit.taxonomy?.patternHe || null,
            actionState: unit.canonicalState?.actionState,
          }
        : null,
      detailedTopicRec: tr
        ? {
            questions: tr.questions,
            accuracy: tr.accuracy,
            thinEvidenceDowngraded: tr.thinEvidenceDowngraded,
            recommendedStepLabelHe: tr.recommendedStepLabelHe,
            rowIdentityV1: tr.rowIdentityV1 || null,
          }
        : null,
      detailedStrength: strength
        ? {
            questions: strength.questions,
            accuracy: strength.accuracy,
            labelHe: strength.labelHe,
            rowIdentityV1: strength.rowIdentityV1 || null,
          }
        : null,
      detailedWeakness: weakness
        ? {
            questions: weakness.questions,
            accuracy: weakness.accuracy,
            labelHe: weakness.labelHe,
            rowIdentityV1: weakness.rowIdentityV1 || null,
          }
        : null,
      narrativeUncertainty: narrativeUnc || null,
      copilotAnchored: cop
        ? {
            questions: cop.questions,
            accuracy: cop.accuracy,
            observation: cop.contractsV1?.narrative?.textSlots?.observation?.slice(0, 80),
          }
        : null,
    },
    identity: sourceIdentity,
  };
}

/**
 * List all topic row keys present in a base report (all subjects).
 * @param {unknown} baseReport
 */
export function listTopicRowKeysFromBaseReport(baseReport) {
  const out = [];
  for (const sid of SUBJECT_ORDER) {
    const mk = REPORT_MAP_KEY[sid];
    const tm = baseReport?.[mk];
    if (!tm || typeof tm !== "object") continue;
    for (const topicRowKey of Object.keys(tm)) {
      out.push({ subjectId: sid, topicRowKey });
    }
  }
  return out;
}

/**
 * @param {unknown} detailedReport
 */
export function detailedReportToCopilotPayload(detailedReport) {
  if (!detailedReport || typeof detailedReport !== "object") return null;
  return {
    registeredGradeKey: detailedReport.registeredGradeKey,
    gradePracticeMeta: detailedReport.gradePracticeMeta,
    executiveSummary: detailedReport.executiveSummary,
    subjectProfiles: detailedReport.subjectProfiles,
  };
}

export default {
  traceRowThroughPipeline,
  listTopicRowKeysFromBaseReport,
  detailedReportToCopilotPayload,
};
