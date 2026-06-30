/**
 * Stage 4B — canonical diagnostic metadata at answer time and aggregate read time.
 * Does not override activity-classification eligibility; only enriches diagnostic evidence.
 */

import { normalizeQuestionMetadata } from "./question-metadata-normalizer.js";
import { normalizeQuestionEnginePayload } from "./question-engine-metadata.js";
import { enrichMetadataFromTaxonomy } from "../../utils/diagnostic-engine-v2/topic-taxonomy-metadata-enrichment.js";
import { normalizeDiagnosticSubjectId, buildNormalizedTopicKey } from "../../utils/diagnostic-evidence.js";
import { normalizePracticeGradeKey } from "../learning-supabase/practice-grade-resolution.js";

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {Record<string, unknown>|null|undefined} canonical
 */
export function exportEngineFieldsFromCanonical(canonical) {
  if (!canonical || typeof canonical !== "object") return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of [
    "skillId",
    "subSkill",
    "subskillId",
    "questionType",
    "problemClass",
    "difficultyDepth",
    "metadataConfidence",
    "patternFamily",
    "possibleErrorPatterns",
    "taxonomyIds",
    "taxonomyId",
    "distractorFamily",
    "diagnosticSkillId",
  ]) {
    if (canonical[key] != null && canonical[key] !== "") out[key] = canonical[key];
  }
  if (canonical.subskillId && !out.subSkill) out.subSkill = canonical.subskillId;
  if (canonical.skillId && !out.diagnosticSkillId) out.diagnosticSkillId = canonical.skillId;
  return out;
}

/**
 * Merge normalized question metadata + taxonomy enrichment into canonical diagnostic metadata.
 * @param {object} ctx
 * @param {string} ctx.subject
 * @param {string|null|undefined} ctx.topic
 * @param {string|null|undefined} ctx.contentGradeKey
 * @param {string|null|undefined} ctx.questionId
 * @param {boolean} ctx.isDiagnosticEligible
 * @param {Record<string, unknown>|null|undefined} [ctx.source]
 * @param {Record<string, unknown>|null|undefined} [ctx.questionEngine]
 * @param {Record<string, unknown>|null|undefined} [ctx.existingDiagnosticMetadata]
 */
export function buildDiagnosticCanonicalMetadata(ctx) {
  if (ctx.isDiagnosticEligible !== true) {
    return {
      diagnosticMetadata: null,
      enrichedQuestionEngine: ctx.questionEngine || null,
      metadataPresent: false,
      reasonMissingMetadata: "not_diagnostic_eligible",
    };
  }

  const subject = pickStr(ctx.subject) || "unknown";
  const sid = normalizeDiagnosticSubjectId(subject);
  const topic = pickStr(ctx.topic) || "general";
  const contentGradeKey = normalizePracticeGradeKey(ctx.contentGradeKey) || null;
  const source = ctx.source && typeof ctx.source === "object" ? ctx.source : {};
  const mergedSource = {
    ...source,
    subject,
    topic,
    grade: contentGradeKey,
    questionId: pickStr(ctx.questionId) || pickStr(source.questionId),
    questionEngine:
      ctx.questionEngine && typeof ctx.questionEngine === "object" ? ctx.questionEngine : source.questionEngine,
  };

  const normalized = normalizeQuestionMetadata(mergedSource);
  const existing =
    ctx.existingDiagnosticMetadata && typeof ctx.existingDiagnosticMetadata === "object"
      ? ctx.existingDiagnosticMetadata
      : source.diagnosticMetadata && typeof source.diagnosticMetadata === "object"
        ? source.diagnosticMetadata
        : {};

  /** @type {Record<string, unknown>} */
  const baseMeta = {
    subject,
    topicKey: topic,
    normalizedTopicKey: null,
    grade: contentGradeKey,
    questionId: pickStr(ctx.questionId) || pickStr(source.questionId) || pickStr(normalized.questionId) || null,
    skillId: pickStr(existing.skillId) || pickStr(normalized.skillId),
    subskillId:
      pickStr(existing.subskillId) ||
      pickStr(existing.subSkill) ||
      pickStr(normalized.subSkill),
    subSkill: pickStr(existing.subSkill) || pickStr(normalized.subSkill),
    questionType: pickStr(existing.questionType) || pickStr(normalized.questionType),
    answerType: pickStr(normalized.answerFormat),
    expectedAnswerType: pickStr(normalized.answerFormat),
    difficulty: pickStr(existing.difficulty) || pickStr(normalized.difficulty),
    displayLevel:
      pickStr(existing.displayLevel) ||
      pickStr(source.displayLevel) ||
      pickStr(source.clientMeta?.displayLevel),
    sourceDifficulty:
      pickStr(existing.sourceDifficulty) ||
      pickStr(source.sourceDifficulty) ||
      pickStr(source.clientMeta?.sourceDifficulty) ||
      pickStr(existing.difficulty) ||
      pickStr(normalized.difficulty),
    difficultyDepth: pickStr(existing.difficultyDepth) || pickStr(normalized.difficultyDepth),
    patternFamily:
      pickStr(existing.patternFamily) ||
      pickStr(source.patternFamily) ||
      pickStr(source.params?.patternFamily),
    possibleErrorPatterns:
      existing.possibleErrorPatterns ||
      normalized.possibleErrorPatterns ||
      null,
    metadataConfidence: pickStr(existing.metadataConfidence) || pickStr(normalized.metadataConfidence) || "medium",
    metadataSource: pickStr(existing.metadataSource) || "question_metadata_normalizer",
    conceptTags: existing.conceptTags || null,
    prerequisiteIds: existing.prerequisiteIds || null,
    errorTypeHints: existing.errorTypeHints || null,
  };

  const enriched = enrichMetadataFromTaxonomy({
    subjectId: sid,
    topic,
    contentGradeKey,
    source: mergedSource,
    baseMeta,
  });

  enriched.normalizedTopicKey = buildNormalizedTopicKey(topic, contentGradeKey);

  const hasCore =
    !!enriched.skillId ||
    !!enriched.subskillId ||
    !!enriched.patternFamily ||
    (Array.isArray(enriched.possibleErrorPatterns) && enriched.possibleErrorPatterns.length > 0) ||
    (Array.isArray(enriched.taxonomyIds) && enriched.taxonomyIds.length > 0);

  enriched.metadataPresent = hasCore;
  enriched.reasonMissingMetadata = hasCore
    ? null
    : enriched.taxonomyMissing
      ? "taxonomy_missing_for_topic"
      : "insufficient_question_and_taxonomy_metadata";

  const engineBase =
    ctx.questionEngine && typeof ctx.questionEngine === "object" ? { ...ctx.questionEngine } : {};
  const enrichedQuestionEngine = normalizeQuestionEnginePayload({
    ...engineBase,
    skillId: enriched.skillId || engineBase.skillId,
    subtopic: enriched.subSkill || engineBase.subtopic,
    metadataConfidence: enriched.metadataConfidence || engineBase.metadataConfidence,
    patternFamily: enriched.patternFamily || engineBase.patternFamily,
    possibleErrorPatterns: enriched.possibleErrorPatterns || engineBase.possibleErrorPatterns,
  });

  return {
    diagnosticMetadata: enriched,
    enrichedQuestionEngine,
    metadataPresent: enriched.metadataPresent === true,
    reasonMissingMetadata: enriched.reasonMissingMetadata,
  };
}

/**
 * Build canonical metadata from aggregate wrong-answer capture fragments.
 * @param {object} capture
 */
export function buildDiagnosticCanonicalMetadataFromCapture(capture) {
  const payload = capture && typeof capture === "object" ? capture : {};
  const eligible =
    payload.isDiagnosticEligible === true ||
    (payload.evidenceCategory &&
      payload.isDiagnosticEligible !== false &&
      !String(payload.evidenceCategory).startsWith("learning_") &&
      payload.evidenceCategory !== "diagnostic_competitive");
  return buildDiagnosticCanonicalMetadata({
    subject: payload.subject,
    topic: payload.topic,
    contentGradeKey: payload.contentGradeLevel,
    questionId: payload.questionId,
    isDiagnosticEligible: eligible,
    source: {
      ...payload,
      params: payload.params,
      prompt: payload.prompt,
      patternFamily: payload.patternFamily,
      diagnosticMetadata: payload.diagnosticMetadata,
    },
    questionEngine: payload.questionEngine,
    existingDiagnosticMetadata: payload.diagnosticMetadata,
  });
}
