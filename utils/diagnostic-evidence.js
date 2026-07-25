/**
 * Stage 4A — unified diagnostic evidence contract (engine-only, no parent copy).
 * Every wrong answer counted by the parent-report diagnostic engine should map to one row here.
 */

import { REPORT_TOPIC_GRADE_SEP } from "../lib/learning-supabase/report-data-adapter.js";
import { normalizeGradeLevelToKey } from "../lib/learning-student-defaults.js";
import { parseActivityTimestampMs } from "../lib/learning-supabase/parent-report-activity-time.js";
import { taxonomyIdsForReportBucket } from "./diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { normalizeMistakeEvent } from "./mistake-event.js";
import {
  resolveAnswerLevelFromPayload,
} from "../lib/learning/session-evidence-levels.js";
import { classifyHistoricalAnswerPayloadReadOnly } from "../lib/learning/classifiers/write-time-answer-evidence.js";
import { normalizeAnswerEvidence } from "../lib/learning/answer-evidence-contract.js";

/** Evidence sources allowed for parent-report diagnostic engine. */
export const DIAGNOSTIC_EVIDENCE_SOURCES = Object.freeze({
  SELF_PRACTICE: "self_practice",
  PARENT_ASSIGNED: "parent_assigned",
  TEACHER_ASSIGNED: "teacher_assigned",
});

const SUBJECT_ID_ALIASES = Object.freeze({
  moledet_geography: "moledet-geography",
});

/**
 * @param {string|null|undefined} subject
 */
export function normalizeDiagnosticSubjectId(subject) {
  const s = String(subject || "").trim();
  if (!s) return "";
  return SUBJECT_ID_ALIASES[s] || s;
}

/**
 * @param {string|null|undefined} topic
 * @param {string|null|undefined} contentGradeKey
 */
export function buildNormalizedTopicKey(topic, contentGradeKey) {
  const base = String(topic || "general").trim().slice(0, 120) || "general";
  const g = normalizeGradeLevelToKey(contentGradeKey);
  if (g && !base.includes(REPORT_TOPIC_GRADE_SEP)) {
    return `${base}${REPORT_TOPIC_GRADE_SEP}${g}`;
  }
  return base;
}

/**
 * @param {string|null|undefined} topic
 * @param {string|null|undefined} normalizedTopicKey
 */
export function topicBaseKeyFromNormalized(topic, normalizedTopicKey) {
  const norm = String(normalizedTopicKey || "").trim();
  if (norm.includes(REPORT_TOPIC_GRADE_SEP)) {
    return norm.split(REPORT_TOPIC_GRADE_SEP)[0];
  }
  const raw = String(topic || "").trim();
  if (raw.includes(REPORT_TOPIC_GRADE_SEP)) {
    return raw.split(REPORT_TOPIC_GRADE_SEP)[0];
  }
  return raw || "general";
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {string} subjectId
 */
export function assessMetadataPresence(row, subjectId) {
  const sid = normalizeDiagnosticSubjectId(subjectId);
  const ev = normalizeMistakeEvent(row || {}, sid);
  /** @type {string[]} */
  const reasons = [];

  const hasMetaObject = !!(row?.metadata && typeof row.metadata === "object");
  const hasPatternFamily = !!ev.patternFamily;
  const hasPossiblePatterns =
    !!(row?.possibleErrorPatterns && (Array.isArray(row.possibleErrorPatterns) ? row.possibleErrorPatterns.length : true)) ||
    !!(ev.expectedErrorTags && ev.expectedErrorTags.length);
  const hasDistractor = !!ev.distractorFamily;
  const hasSkill = !!(ev.diagnosticSkillId || row?.skillId || row?.subskillId);

  if (hasMetaObject || hasPatternFamily || hasPossiblePatterns || hasDistractor || hasSkill) {
    return { metadataPresent: true, reasonMissingMetadata: null };
  }

  if (!row?.questionId && !ev.questionLabel) reasons.push("no_question_id");
  if (!ev.exerciseText) reasons.push("no_prompt");
  reasons.push("no_pattern_family_or_engine_metadata");

  return {
    metadataPresent: false,
    reasonMissingMetadata: reasons.join("|") || "missing_engine_metadata",
  };
}

function pickEvidenceStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * Parse pipe-delimited questionId metadata into classifier params (kind, a, b, den1, …).
 * Stored answer payloads often have empty params; questionId retains generator operands.
 * @param {string|null|undefined} questionId
 * @returns {Record<string, unknown>}
 */
export function parseClassifierParamsFromQuestionId(questionId) {
  const qid = pickEvidenceStr(questionId);
  if (!qid) return {};
  const parts = qid.split("|");
  /** @type {Record<string, unknown>} */
  const out = {};
  if (parts[1]) out.kind = parts[1];
  for (let i = 3; i < parts.length; i += 1) {
    const seg = parts[i];
    if (!seg || !seg.includes(":")) continue;
    const colon = seg.indexOf(":");
    const key = seg.slice(0, colon).trim();
    let raw = seg.slice(colon + 1).trim();
    if (!key) continue;
    if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        out[key] = JSON.parse(raw);
        continue;
      } catch {
        /* use raw string */
      }
    }
    const num = Number(raw);
    out[key] = Number.isFinite(num) && String(num) === raw ? num : raw;
  }
  return out;
}

/**
 * @param {string|null|undefined} questionId
 * @param {Record<string, unknown>|null|undefined} params
 */
export function mergeClassifierParamsFromQuestionId(questionId, params) {
  const fromQid = parseClassifierParamsFromQuestionId(questionId);
  const base =
    params && typeof params === "object" && !Array.isArray(params) ? { ...params } : {};
  return { ...fromQid, ...base };
}

function usableMisconceptionTag(v) {
  const t = pickEvidenceStr(v);
  if (!t || t === "unknown" || t === "generic_proximity") return null;
  return t;
}

/**
 * Resolve misconception tag for aggregate-read wrong answers.
 * Re-runs classifyAnswerEvidence when stored payloads lack tags (historical rows).
 * @param {object} p
 */
export function resolveMisconceptionEvidenceAtAggregateRead(p) {
  const payload = p && typeof p === "object" ? p : {};
  const questionEngine =
    payload.questionEngine && typeof payload.questionEngine === "object" ? payload.questionEngine : null;
  let answerEvidence = normalizeAnswerEvidence(payload.answerEvidence ?? questionEngine?.answerEvidence);

  // Prefer write-time persisted tags (already evidence-gated)
  let tag =
    usableMisconceptionTag(payload.misconceptionTag) ||
    usableMisconceptionTag(answerEvidence?.detectedMisconception);

  let classifierRuleId = pickEvidenceStr(payload.classifierRuleId) || null;
  let evidenceReason = pickEvidenceStr(payload.evidenceReason) || null;

  // Historical read-only repair: deterministic only — never topic-alone, never force tags.
  // Also backfill classifierRuleId / answerEvidence when a tag is present without proof fields
  // (needed for same_session_observed proven-tag gating).
  const needsHistorical =
    !tag || !classifierRuleId || !answerEvidence || !answerEvidence?.detectedMisconception;
  if (needsHistorical) {
    const historical = classifyHistoricalAnswerPayloadReadOnly(
      {
        ...payload,
        params: mergeClassifierParamsFromQuestionId(payload.questionId, payload.params),
        questionEngine,
      },
      {
        questionId: payload.questionId,
        subject: pickEvidenceStr(payload.subject) || "unknown",
        isCorrect: false,
      },
    );
    if (historical.canTagSafely && historical.misconceptionTag) {
      const histTag = usableMisconceptionTag(historical.misconceptionTag);
      if (!tag) tag = histTag;
      // Only adopt historical proof when it agrees with an existing tag (or fills a missing tag)
      if (histTag && (!tag || histTag === tag)) {
        answerEvidence = historical.fields?.answerEvidence || answerEvidence;
        classifierRuleId = historical.fields?.classifierRuleId || classifierRuleId;
        evidenceReason = historical.evidenceReason || evidenceReason;
      }
    } else if (!tag) {
      evidenceReason = historical.evidenceReason || "unclassified_no_deterministic_rule";
    }
  }

  const distractorFamily = tag
    ? usableMisconceptionTag(payload.distractorFamily) ||
      usableMisconceptionTag(questionEngine?.distractorFamily) ||
      usableMisconceptionTag(payload.engineFields?.distractorFamily) ||
      tag
    : null;

  return {
    misconceptionTag: tag || null,
    distractorFamily: distractorFamily || null,
    answerEvidence: answerEvidence || null,
    classifierRuleId,
    evidenceReason,
  };
}

/**
 * Build unified diagnostic evidence row from aggregate wrong-answer capture.
 * @param {object} p
 */
export function buildDiagnosticEvidenceRow(p) {
  const subject = String(p?.subject || p?.subjectId || "").trim();
  const topic = String(p?.topic || "general").trim().slice(0, 120) || "general";
  const contentGradeKey =
    normalizeGradeLevelToKey(p?.contentGradeLevel) ||
    normalizeGradeLevelToKey(p?.contentGrade) ||
    normalizeGradeLevelToKey(p?.grade) ||
    null;
  const registeredGradeKey =
    normalizeGradeLevelToKey(p?.registeredGradeLevel) ||
    normalizeGradeLevelToKey(p?.registeredGrade) ||
    null;
  const normalizedTopicKey = buildNormalizedTopicKey(topic, contentGradeKey);
  const topicBaseKey = topicBaseKeyFromNormalized(topic, normalizedTopicKey);
  const sid = normalizeDiagnosticSubjectId(subject);

  const engineFields =
    p?.engineFields && typeof p.engineFields === "object" ? p.engineFields : {};
  const diagnosticMeta =
    p?.diagnosticMetadata && typeof p.diagnosticMetadata === "object"
      ? p.diagnosticMetadata
      : p?._canonicalMeta && typeof p._canonicalMeta === "object"
        ? p._canonicalMeta
        : null;

  /** @type {Record<string, unknown>} */
  const metadata = {};
  const misconceptionResolved = resolveMisconceptionEvidenceAtAggregateRead(p);

  for (const key of [
    "patternFamily",
    "subtype",
    "conceptTag",
    "distractorFamily",
    "misconceptionTag",
    "skillId",
    "subSkill",
    "subskillId",
    "questionType",
    "problemClass",
    "difficultyDepth",
    "metadataConfidence",
    "possibleErrorPatterns",
    "diagnosticSkillId",
    "expectedErrorTags",
    "taxonomyId",
    "answerType",
    "expectedAnswerType",
    "metadataSource",
    "metadataPresent",
    "reasonMissingMetadata",
  ]) {
    const v = engineFields[key] ?? diagnosticMeta?.[key];
    if (v != null && v !== "") metadata[key] = v;
  }
  if (misconceptionResolved.misconceptionTag && !metadata.misconceptionTag) {
    metadata.misconceptionTag = misconceptionResolved.misconceptionTag;
  }
  if (misconceptionResolved.distractorFamily && !metadata.distractorFamily) {
    metadata.distractorFamily = misconceptionResolved.distractorFamily;
  }
  if (Array.isArray(diagnosticMeta?.taxonomyIds) && diagnosticMeta.taxonomyIds.length) {
    metadata.taxonomyIds = diagnosticMeta.taxonomyIds;
  }

  const metaAssessment =
    p?.metadataPresent === true || p?.metadataPresent === false
      ? {
          metadataPresent: p.metadataPresent === true,
          reasonMissingMetadata: p.metadataPresent === true ? null : p.reasonMissingMetadata || "missing_metadata",
        }
      : assessMetadataPresence(
          {
            metadata: Object.keys(metadata).length ? metadata : null,
            patternFamily: metadata.patternFamily,
            possibleErrorPatterns: metadata.possibleErrorPatterns,
            skillId: metadata.skillId,
            subskillId: metadata.subskillId ?? metadata.subSkill,
            questionId: p?.questionId,
          },
          sid,
        );

  const taxonomyCandidateIds =
    Array.isArray(diagnosticMeta?.taxonomyIds) && diagnosticMeta.taxonomyIds.length
      ? diagnosticMeta.taxonomyIds
      : taxonomyIdsForReportBucket(sid, normalizedTopicKey);

  const levelEvidence = resolveAnswerLevelFromPayload(
    {
      displayLevel: p?.displayLevel,
      sourceDifficulty: p?.sourceDifficulty,
      level: p?.level,
      regularInternalState: p?.regularInternalState,
      scienceInternalState: p?.scienceInternalState,
      clientMeta: p?.clientMeta,
      questionEngine: p?.questionEngine,
      params: p?.params,
    },
    {},
    sid
  );
  const sourceDifficulty = levelEvidence.sourceDifficulty;
  const displayLevel = levelEvidence.displayLevel;

  return {
    studentId: p?.studentId ?? null,
    subject,
    subjectId: sid,
    topic,
    topicKey: topic,
    topicBaseKey,
    normalizedTopicKey,
    grade: contentGradeKey,
    registeredGrade: registeredGradeKey,
    gradeRelation: p?.gradeRelation ?? null,
    questionId: p?.questionId ?? null,
    sessionId: p?.sessionId ?? null,
    answerId: p?.answerId ?? null,
    evidenceSource: p?.evidenceSource ?? null,
    evidenceCategory: p?.evidenceCategory ?? null,
    mode: p?.mode ?? null,
    level: sourceDifficulty,
    displayLevel,
    sourceDifficulty,
    answeredAt: p?.answeredAt ?? null,
    isCorrect: false,
    selectedAnswer: p?.userAnswer ?? p?.selectedAnswer ?? null,
    correctAnswer: p?.expectedAnswer ?? p?.correctAnswer ?? null,
    answerType: engineFields.questionType ?? metadata.questionType ?? null,
    responseMs: p?.timeSpentMs != null ? Math.round(Number(p.timeSpentMs)) : null,
    sessionElapsedMs: p?.sessionElapsedMs ?? null,
    hintUsed: p?.hintsUsed != null ? Number(p.hintsUsed) > 0 : null,
    retryCount: p?.retryCount ?? null,
    firstTryMiss: p?.firstTryMiss ?? null,
    changedAnswer: p?.changedAnswer ?? null,
    questionLevel: sourceDifficulty,
    skillId: metadata.skillId ?? metadata.diagnosticSkillId ?? null,
    subskillId: metadata.subskillId ?? metadata.subSkill ?? null,
    taxonomyCandidateIds,
    possibleErrorPatterns: metadata.possibleErrorPatterns ?? null,
    patternFamily: metadata.patternFamily ?? null,
    misconceptionTag: misconceptionResolved.misconceptionTag ?? metadata.misconceptionTag ?? null,
    distractorFamily:
      misconceptionResolved.distractorFamily ?? metadata.distractorFamily ?? null,
    answerEvidence: misconceptionResolved.answerEvidence ?? p?.answerEvidence ?? null,
    classifierRuleId: misconceptionResolved.classifierRuleId || p?.classifierRuleId || null,
    evidenceReason: misconceptionResolved.evidenceReason || p?.evidenceReason || null,
    params: mergeClassifierParamsFromQuestionId(p?.questionId, p?.params),
    metadataPresent: metaAssessment.metadataPresent,
    reasonMissingMetadata: metaAssessment.reasonMissingMetadata,
    metadata: Object.keys(metadata).length
      ? {
          ...metadata,
          ...(misconceptionResolved.classifierRuleId
            ? { classifierRuleId: misconceptionResolved.classifierRuleId }
            : {}),
          ...(misconceptionResolved.misconceptionTag
            ? { misconceptionTag: misconceptionResolved.misconceptionTag }
            : {}),
        }
      : null,
    diagnosticMetadata: diagnosticMeta,
    prompt: p?.prompt ?? null,
  };
}

/**
 * Convert aggregate diagnostic evidence → localStorage mistake event shape.
 * @param {ReturnType<typeof buildDiagnosticEvidenceRow>|Record<string, unknown>} evidence
 * @param {string} aggregateSubjectId math|geometry|…|moledet_geography
 */
export function diagnosticEvidenceToStorageMistake(evidence, aggregateSubjectId) {
  const ev = evidence && typeof evidence === "object" ? evidence : {};
  const sid = normalizeDiagnosticSubjectId(aggregateSubjectId || ev.subject);
  const ts = parseActivityTimestampMs(ev.answeredAt);
  const contentGrade = normalizeGradeLevelToKey(ev.grade) || null;
  const normalizedTopicKey = String(ev.normalizedTopicKey || ev.topic || "general");
  const topicBase = topicBaseKeyFromNormalized(ev.topic, normalizedTopicKey);

  /** @type {Record<string, unknown>} */
  const row = {
    ...(Number.isFinite(ts) ? { timestamp: ts } : {}),
    topic: normalizedTopicKey,
    topicOrOperation: topicBase,
    bucketKey: normalizedTopicKey,
    isCorrect: false,
    grade: contentGrade || undefined,
    registeredGrade: normalizeGradeLevelToKey(ev.registeredGrade) || undefined,
    contentGrade: contentGrade || undefined,
    gradeRelation: ev.gradeRelation || undefined,
    level: ev.level || ev.sourceDifficulty || undefined,
    displayLevel: ev.displayLevel || undefined,
    sourceDifficulty: ev.sourceDifficulty || undefined,
    mode: ev.mode || undefined,
    exerciseText: ev.prompt || undefined,
    questionLabel: ev.questionId || undefined,
    correctAnswer: ev.correctAnswer ?? undefined,
    userAnswer: ev.selectedAnswer ?? undefined,
    responseMs: ev.responseMs ?? undefined,
    hintUsed: typeof ev.hintUsed === "boolean" ? ev.hintUsed : undefined,
    retryCount: ev.retryCount ?? undefined,
    changedAnswer: ev.changedAnswer ?? undefined,
    firstTryCorrect: ev.firstTryMiss === true ? false : undefined,
    patternFamily: ev.patternFamily ?? undefined,
    misconceptionTag: ev.misconceptionTag ?? undefined,
    distractorFamily: ev.distractorFamily ?? undefined,
    answerEvidence: ev.answerEvidence ?? undefined,
    classifierRuleId: ev.classifierRuleId ?? undefined,
    params: ev.params && typeof ev.params === "object" ? ev.params : undefined,
    diagnosticSkillId: ev.skillId ?? undefined,
    possibleErrorPatterns: ev.possibleErrorPatterns ?? undefined,
    expectedErrorTags: Array.isArray(ev.possibleErrorPatterns) ? ev.possibleErrorPatterns : undefined,
    evidenceSource: ev.evidenceSource ?? undefined,
    sessionId: ev.sessionId ?? undefined,
    answerId: ev.answerId ?? undefined,
    metadataPresent: ev.metadataPresent === true,
    reasonMissingMetadata: ev.reasonMissingMetadata ?? undefined,
  };

  if (sid === "math") {
    row.operation = topicBase;
  }

  /** @type {Record<string, unknown>} */
  const metaObj = {};
  if (ev.diagnosticMetadata && typeof ev.diagnosticMetadata === "object") {
    Object.assign(metaObj, ev.diagnosticMetadata);
  }
  if (ev.metadata && typeof ev.metadata === "object") {
    Object.assign(metaObj, ev.metadata);
  }
  if (ev.patternFamily && !metaObj.patternFamily) metaObj.patternFamily = ev.patternFamily;
  if (ev.misconceptionTag && !metaObj.misconceptionTag) metaObj.misconceptionTag = ev.misconceptionTag;
  if (ev.distractorFamily && !metaObj.distractorFamily) metaObj.distractorFamily = ev.distractorFamily;
  if (ev.answerEvidence && !metaObj.answerEvidence) metaObj.answerEvidence = ev.answerEvidence;
  if (ev.skillId && !metaObj.skillId) metaObj.skillId = ev.skillId;
  if (ev.subskillId && !metaObj.subskillId) metaObj.subskillId = ev.subskillId;
  if (ev.possibleErrorPatterns && !metaObj.possibleErrorPatterns) {
    metaObj.possibleErrorPatterns = ev.possibleErrorPatterns;
  }
  if (Array.isArray(ev.taxonomyCandidateIds) && ev.taxonomyCandidateIds.length && !metaObj.taxonomyIds) {
    metaObj.taxonomyIds = ev.taxonomyCandidateIds;
  }
  if (ev.metadataPresent === true) metaObj.metadataPresent = true;
  if (ev.reasonMissingMetadata) metaObj.reasonMissingMetadata = ev.reasonMissingMetadata;
  if (Object.keys(metaObj).length) row.metadata = metaObj;

  return row;
}

/**
 * @param {Record<string, unknown>|null|undefined} aggregateRow
 * @param {string} aggregateSubjectId
 * @param {string|null|undefined} registeredGrade
 */
export function aggregateMistakeRowToStorageEvent(aggregateRow, aggregateSubjectId, registeredGrade) {
  if (!aggregateRow || typeof aggregateRow !== "object") return null;
  const engineFields =
    aggregateRow.engineFields && typeof aggregateRow.engineFields === "object"
      ? {
          ...aggregateRow.engineFields,
          ...(aggregateRow.misconceptionTag && !aggregateRow.engineFields.misconceptionTag
            ? { misconceptionTag: aggregateRow.misconceptionTag }
            : {}),
          ...(aggregateRow.distractorFamily && !aggregateRow.engineFields.distractorFamily
            ? { distractorFamily: aggregateRow.distractorFamily }
            : {}),
          ...(aggregateRow.classifierRuleId && !aggregateRow.engineFields.classifierRuleId
            ? { classifierRuleId: aggregateRow.classifierRuleId }
            : {}),
        }
      : {
          patternFamily: aggregateRow.patternFamily,
          distractorFamily: aggregateRow.distractorFamily,
          misconceptionTag: aggregateRow.misconceptionTag,
          classifierRuleId: aggregateRow.classifierRuleId,
          skillId: aggregateRow.skillId,
          subSkill: aggregateRow.subSkill,
          subskillId: aggregateRow.subskillId,
          questionType: aggregateRow.questionType,
          possibleErrorPatterns: aggregateRow.possibleErrorPatterns,
          diagnosticSkillId: aggregateRow.diagnosticSkillId,
        };
  const evidence = buildDiagnosticEvidenceRow({
    ...aggregateRow,
    subject: aggregateRow.subject || aggregateRow.subjectId,
    registeredGradeLevel: aggregateRow.registeredGradeLevel || aggregateRow.registeredGrade || registeredGrade,
    userAnswer: aggregateRow.userAnswer ?? aggregateRow.selectedAnswer,
    expectedAnswer: aggregateRow.expectedAnswer ?? aggregateRow.correctAnswer,
    hintsUsed: aggregateRow.hintsUsed,
    timeSpentMs: aggregateRow.timeSpentMs,
    diagnosticMetadata: aggregateRow.diagnosticMetadata,
    misconceptionTag: aggregateRow.misconceptionTag,
    answerEvidence: aggregateRow.answerEvidence,
    classifierRuleId: aggregateRow.classifierRuleId,
    evidenceReason: aggregateRow.evidenceReason,
    params: aggregateRow.params,
    engineFields,
  });
  return diagnosticEvidenceToStorageMistake(evidence, aggregateSubjectId);
}
