/**
 * Diagnostic Engine V3 — unified evidence contract per answer event.
 * Never invents missing fields; uses null / "unknown" safely.
 */

import { normalizeMistakeEvent } from "../mistake-event.js";
import { normalizeDiagnosticSubjectId } from "../diagnostic-evidence.js";
import { buildQuestionSkillMetadataV1 } from "../learning-diagnostics/question-skill-metadata-v1.js";
import { classifyErrorTypeV3, ERROR_TYPE_V3 } from "./error-types-v3.js";
import { resolveGradeContextV3 } from "./grade-relation-v3.js";

const REPORT_AGG_FLUENCY_SLOW_MS = 60_000;
const REPORT_AGG_FLUENCY_FAST_MS = 6_000;

/**
 * @param {unknown} v
 * @returns {string|null}
 */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {unknown} v
 * @returns {number|null}
 */
function pickMs(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Build contract from a normalized mistake event or aggregate row.
 * @param {object} input
 * @param {string} input.subjectId
 * @param {Record<string, unknown>} [input.event]
 * @param {Record<string, unknown>} [input.aggregateRow]
 * @param {Record<string, unknown>|null} [input.probeEvidence]
 * @param {string|null} [input.evidenceSource]
 * @param {string|null} [input.activityMode]
 * @param {boolean} [input.isCorrect]
 */
export function buildDiagnosticEvidenceContractV3(input) {
  const subjectId = normalizeDiagnosticSubjectId(input?.subjectId || input?.event?.subject);
  const ev =
    input?.event && typeof input.event === "object"
      ? input.event
      : input?.aggregateRow && typeof input.aggregateRow === "object"
        ? normalizeMistakeEvent(
            {
              ...input.aggregateRow,
              isCorrect: input.isCorrect === true,
            },
            subjectId,
          )
        : {};

  const isCorrect = input?.isCorrect === true ? true : ev.isCorrect === true ? true : false;
  const topic =
    pickStr(ev.topicOrOperation) ||
    pickStr(ev.bucketKey) ||
    pickStr(input?.aggregateRow?.topic) ||
    "general";
  const grade =
    pickStr(ev.contentGrade) ||
    pickStr(ev.grade) ||
    pickStr(input?.aggregateRow?.contentGradeKey) ||
    pickStr(input?.aggregateRow?.gradeKey);
  const registeredGrade =
    pickStr(ev.registeredGrade) ||
    pickStr(input?.registeredGrade) ||
    pickStr(input?.aggregateRow?.registeredGradeKey) ||
    null;

  const stub = {
    operation: topic,
    topic,
    params: {
      kind: ev.kind,
      subtype: ev.subtype,
      patternFamily: ev.patternFamily,
      expectedErrorTags: ev.expectedErrorTags,
      diagnosticSkillId: ev.diagnosticSkillId,
      distractorFamily: ev.distractorFamily,
    },
    correctAnswer: ev.correctAnswer,
  };
  const meta = buildQuestionSkillMetadataV1(stub, {
    subjectCanonical: subjectId === "moledet-geography" ? "moledet_geography" : subjectId,
    grade,
    level: ev.level,
    topic,
  });

  const skill = pickStr(ev.diagnosticSkillId) || pickStr(ev.skillId) || pickStr(meta.skillId) || null;
  const subskill =
    pickStr(ev.subskillId) ||
    pickStr(ev.subtype) ||
    pickStr(meta.subskillId) ||
    null;

  const responseTimeMs = pickMs(ev.responseMs) || pickMs(input?.aggregateRow?.timeSpentMs);
  const difficulty = pickStr(meta.difficulty) || pickStr(ev.level) || null;
  const prerequisiteSkill =
    Array.isArray(meta.prerequisiteSkillIds) && meta.prerequisiteSkillIds[0]
      ? String(meta.prerequisiteSkillIds[0])
      : null;

  let errorType = ERROR_TYPE_V3.UNKNOWN;
  let errorTypeConfidence = "very_low";
  /** @type {string[]} */
  let errorBasedOn = [];
  if (!isCorrect) {
    const cls = classifyErrorTypeV3(subjectId, ev);
    errorType = cls.errorType;
    errorTypeConfidence = cls.confidence;
    errorBasedOn = cls.basedOn;
  }

  const misconceptionTarget =
    pickStr(ev.distractorFamily) ||
    (Array.isArray(ev.expectedErrorTags) && ev.expectedErrorTags[0]
      ? String(ev.expectedErrorTags[0])
      : null);

  const metadataPresent = ev.metadataPresent === true || !!(ev.patternFamily || ev.diagnosticSkillId);
  let diagnosticWeight = 0.35;
  if (metadataPresent) diagnosticWeight = 0.7;
  if (errorType !== ERROR_TYPE_V3.UNKNOWN && errorTypeConfidence === "medium") diagnosticWeight = 0.85;
  if (!isCorrect && errorType === ERROR_TYPE_V3.UNKNOWN) diagnosticWeight = 0.25;

  let readingLoad = null;
  const cog = String(meta.cognitiveLevel || "").toLowerCase();
  if (cog.includes("multi") || topic.includes("word") || topic.includes("comprehension")) {
    readingLoad = "high";
  } else if (cog.includes("application") || cog.includes("reasoning")) {
    readingLoad = "medium";
  } else if (cog) {
    readingLoad = "low";
  }

  const expectedTimeMs =
    difficulty === "hard" ? 45000 : difficulty === "medium" ? 30000 : difficulty === "easy" ? 20000 : null;

  const probeEvidence =
    input?.probeEvidence && typeof input.probeEvidence === "object" ? input.probeEvidence : null;

  let confidenceContribution = 0;
  if (isCorrect && responseTimeMs != null && responseTimeMs < REPORT_AGG_FLUENCY_FAST_MS) {
    confidenceContribution += 0.05;
  }
  if (!isCorrect && errorType !== ERROR_TYPE_V3.UNKNOWN && errorTypeConfidence === "medium") {
    confidenceContribution += 0.15;
  }
  if (probeEvidence?.outcomeStatus === "supported") confidenceContribution += 0.2;
  if (probeEvidence?.outcomeStatus === "weakened") confidenceContribution -= 0.15;
  if (probeEvidence?.outcomeStatus === "uncertain") confidenceContribution -= 0.05;
  if (errorType === ERROR_TYPE_V3.UNKNOWN) confidenceContribution -= 0.1;
  confidenceContribution = Math.max(-0.3, Math.min(0.35, confidenceContribution));

  const gradeContext = resolveGradeContextV3({
    registeredGrade,
    contentGrade: grade,
    legacyGradeRelation: pickStr(ev.gradeRelation) || pickStr(input?.aggregateRow?.gradeRelation),
    legacyGradeDelta:
      ev.gradeDelta != null
        ? Number(ev.gradeDelta)
        : input?.aggregateRow?.gradeDelta != null
          ? Number(input.aggregateRow.gradeDelta)
          : null,
    isCorrect,
    wrongCount: isCorrect ? 0 : 1,
    attempts: 1,
  });

  if (gradeContext.relation === "above_registered_grade" && !isCorrect) {
    confidenceContribution = Math.min(confidenceContribution, 0.05);
  }
  if (gradeContext.foundationRisk && !isCorrect) {
    confidenceContribution = Math.max(confidenceContribution, 0.08);
  }

  return {
    contractVersion: "3.1.0",
    subject: subjectId || "unknown",
    grade: grade || null,
    registeredGrade,
    contentGrade: grade || null,
    contentGradeBand: gradeContext.contentGradeBand,
    gradeDelta: gradeContext.gradeDelta,
    gradeRelation: gradeContext.relation,
    gradeContext,
    topic,
    skill,
    subskill,
    isCorrect,
    responseTimeMs,
    difficulty,
    prerequisiteSkill,
    misconceptionTarget,
    errorType: isCorrect ? null : errorType,
    errorTypeConfidence: isCorrect ? null : errorTypeConfidence,
    errorBasedOn: isCorrect ? [] : errorBasedOn,
    distractorMeaning: pickStr(ev.distractorFamily),
    readingLoad,
    expectedTimeMs,
    diagnosticWeight,
    evidenceSource: pickStr(input?.evidenceSource) || pickStr(ev.evidenceSource) || null,
    activityMode: pickStr(input?.activityMode) || pickStr(ev.mode) || null,
    probeEvidence,
    confidenceContribution,
    metadataPresent,
    patternFamily: pickStr(ev.patternFamily),
    questionId: pickStr(ev.questionLabel) || null,
  };
}

/**
 * Build contracts from wrong-answer stream for a subject.
 * @param {string} subjectId
 * @param {unknown[]} rawMistakes
 * @param {number} startMs
 * @param {number} endMs
 * @param {unknown[]} [probeEvidenceList]
 */
export function buildEvidenceContractsFromMistakes(
  subjectId,
  rawMistakes,
  startMs,
  endMs,
  probeEvidenceList = [],
) {
  const sid = normalizeDiagnosticSubjectId(subjectId);
  const probesBySkill = indexProbesBySkill(probeEvidenceList, sid);
  /** @type {ReturnType<typeof buildDiagnosticEvidenceContractV3>[]} */
  const out = [];
  for (const m of rawMistakes || []) {
    const raw = m && typeof m === "object" ? m : {};
    const ev = normalizeMistakeEvent(m, sid);
    const t = Number(ev.timestamp);
    if (Number.isFinite(t) && (t < startMs || t > endMs)) continue;
    if (ev.isCorrect) continue;
    const skillKey = ev.diagnosticSkillId || ev.skillId || ev.subskillId || "";
    const probe = probesBySkill.get(String(skillKey)) || null;
    const registeredGrade =
      pickStr(raw.registeredGrade) ||
      pickStr(raw.registeredGradeKey) ||
      pickStr(raw.registeredGradeLevel) ||
      pickStr(ev.registeredGrade) ||
      null;
    out.push(
      buildDiagnosticEvidenceContractV3({
        subjectId: sid,
        event: ev,
        isCorrect: false,
        probeEvidence: probe,
        evidenceSource: ev.evidenceSource || null,
        activityMode: ev.mode || null,
        registeredGrade,
      }),
    );
  }
  return out;
}

/**
 * @param {unknown[]} probeList
 * @param {string} subjectId
 */
function indexProbesBySkill(probeList, subjectId) {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const p of probeList || []) {
    if (!p || typeof p !== "object") continue;
    const sid = normalizeDiagnosticSubjectId(p.subjectId);
    if (sid !== subjectId) continue;
    const sk = String(p.diagnosticSkillId || p.topicId || "");
    if (sk) map.set(sk, p);
  }
  return map;
}

export { ERROR_TYPE_V3 };
