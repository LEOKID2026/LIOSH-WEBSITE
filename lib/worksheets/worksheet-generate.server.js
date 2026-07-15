/**
 * Shared worksheet generation for parent hub APIs — Wave E.
 * @module lib/worksheets/worksheet-generate.server
 */

import {
  buildWorksheetPayload,
  buildAnswerKeyPayload,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "./worksheet-payload-build.server.js";
import { buildWorksheetPayloadMeta } from "./worksheet-meta-labels.server.js";
import { selectWorksheetQuestions } from "./worksheet-question-selector.server.js";
import { validateWorksheetPublicGenerationParams } from "./worksheet-level-map.server.js";
import {
  buildWorksheetSessionFingerprint,
  worksheetFingerprintsMatch,
} from "./worksheet-fingerprint.js";
import { ANSWER_KEY_PAYLOAD_KIND, WORKSHEET_PAYLOAD_KIND } from "./worksheet-question-types.js";

/**
 * @typedef {import("./worksheet-question-types.js").WorksheetPayload} WorksheetPayload
 * @typedef {import("./worksheet-question-types.js").AnswerKeyPayload} AnswerKeyPayload
 */

/**
 * @param {Record<string, unknown> & { inkSave?: boolean, titleHe?: string }} input
 * @returns {Promise<
 *   | { ok: true, worksheetPayload: WorksheetPayload, seed: number, generation: Record<string, unknown> }
 *   | { ok: false, status: number, code: string, message?: string }
 * >}
 */
export async function generateWorksheetForParent(input) {
  const validated = validateWorksheetPublicGenerationParams(input);
  if (!validated.ok) {
    return { ok: false, status: 400, code: validated.error };
  }

  const { selectorParams, publicLevelKey } = validated;
  let questions;
  let seed;
  let mathPracticeFormat;
  try {
    const selected = await selectWorksheetQuestions(selectorParams);
    questions = selected.questions;
    seed = selected.seed;
    mathPracticeFormat = selected.mathPracticeFormat;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("WORKSHEET_")) {
      return { ok: false, status: 422, code: "insufficient_questions", message: msg };
    }
    return { ok: false, status: 500, code: "generation_failed", message: msg };
  }

  if (!questions?.length) {
    return { ok: false, status: 422, code: "insufficient_questions" };
  }

  const meta = buildWorksheetPayloadMeta({
    subjectId: selectorParams.subjectId,
    gradeKey: selectorParams.gradeKey,
    topicKey: selectorParams.topicKey,
    levelKey: publicLevelKey,
    inkSave: input.inkSave === true,
    titleHe: typeof input.titleHe === "string" ? input.titleHe : undefined,
    mathPracticeFormat: mathPracticeFormat || selectorParams.mathPracticeFormat,
  });

  const worksheetPayload = buildWorksheetPayload(questions, meta, {
    subjectId: selectorParams.subjectId,
    mathPracticeFormat: mathPracticeFormat || selectorParams.mathPracticeFormat,
    ...(selectorParams.preferMcq !== undefined
      ? { preferMcq: selectorParams.preferMcq }
      : {}),
  });

  if (!worksheetPayload.questions.length) {
    return { ok: false, status: 422, code: "no_printable_questions" };
  }

  const answerAudit = auditWorksheetPayloadForAnswerLeaks(worksheetPayload);
  if (!answerAudit.pass) {
    return {
      ok: false,
      status: 500,
      code: "answer_leak_detected",
      message: answerAudit.hits.join(", "),
    };
  }

  const metaAudit = auditWorksheetPayloadForMetadataLeaks(worksheetPayload);
  if (!metaAudit.pass) {
    return {
      ok: false,
      status: 500,
      code: "metadata_leak_detected",
      message: metaAudit.hits.join(", "),
    };
  }

  return {
    ok: true,
    worksheetPayload,
    seed,
    generation: {
      subjectId: selectorParams.subjectId,
      gradeKey: selectorParams.gradeKey,
      topicKey: selectorParams.topicKey,
      levelKey: publicLevelKey,
      count: selectorParams.count,
      seed,
      inkSave: meta.inkSave,
      mathPracticeFormat: mathPracticeFormat || selectorParams.mathPracticeFormat,
      ...(selectorParams.preferMcq !== undefined
        ? { preferMcq: selectorParams.preferMcq }
        : {}),
      ...(selectorParams.topicKey === "mixed" && Array.isArray(selectorParams.mixedTopicKeys)
        ? { mixedTopicKeys: selectorParams.mixedTopicKeys }
        : {}),
    },
  };
}

/**
 * @param {Record<string, unknown> & { inkSave?: boolean, titleHe?: string }} input
 * @returns {Promise<
 *   | { ok: true, answerKeyPayload: AnswerKeyPayload }
 *   | { ok: false, status: number, code: string, message?: string }
 * >}
 */
export async function generateAnswerKeyForParent(input) {
  const validated = validateWorksheetPublicGenerationParams(input);
  if (!validated.ok) {
    return { ok: false, status: 400, code: validated.error };
  }

  const { selectorParams, publicLevelKey } = validated;
  let questions;
  let seed;
  let mathPracticeFormat;
  try {
    const selected = await selectWorksheetQuestions(selectorParams);
    questions = selected.questions;
    seed = selected.seed;
    mathPracticeFormat = selected.mathPracticeFormat;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("WORKSHEET_")) {
      return { ok: false, status: 422, code: "insufficient_questions", message: msg };
    }
    return { ok: false, status: 500, code: "generation_failed", message: msg };
  }

  if (!questions?.length) {
    return { ok: false, status: 422, code: "insufficient_questions" };
  }

  const meta = buildWorksheetPayloadMeta({
    subjectId: selectorParams.subjectId,
    gradeKey: selectorParams.gradeKey,
    topicKey: selectorParams.topicKey,
    levelKey: publicLevelKey,
    inkSave: input.inkSave === true,
    titleHe: typeof input.titleHe === "string" ? input.titleHe : undefined,
    mathPracticeFormat: mathPracticeFormat || selectorParams.mathPracticeFormat,
  });

  const buildOpts = {
    subjectId: selectorParams.subjectId,
    mathPracticeFormat: mathPracticeFormat || selectorParams.mathPracticeFormat,
    ...(selectorParams.preferMcq !== undefined
      ? { preferMcq: selectorParams.preferMcq }
      : {}),
  };

  const worksheetPayload = buildWorksheetPayload(questions, meta, buildOpts);
  const answerKeyPayload = buildAnswerKeyPayload(questions, meta, buildOpts);

  if (worksheetPayload.questions.length !== answerKeyPayload.answers.length) {
    return { ok: false, status: 500, code: "answer_key_count_mismatch" };
  }

  const generation = {
    subjectId: selectorParams.subjectId,
    gradeKey: selectorParams.gradeKey,
    topicKey: selectorParams.topicKey,
    levelKey: publicLevelKey,
    count: selectorParams.count,
    seed,
    inkSave: meta.inkSave,
    mathPracticeFormat: mathPracticeFormat || selectorParams.mathPracticeFormat,
    ...(selectorParams.preferMcq !== undefined
      ? { preferMcq: selectorParams.preferMcq }
      : {}),
  };

  const worksheetFingerprint = buildWorksheetSessionFingerprint(
    worksheetPayload,
    generation
  );
  answerKeyPayload.worksheetFingerprint = worksheetFingerprint;

  const expectedFp = input.expectedWorksheetFingerprint;
  if (expectedFp && !worksheetFingerprintsMatch(expectedFp, worksheetFingerprint)) {
    return {
      ok: false,
      status: 409,
      code: "worksheet_fingerprint_mismatch",
      message:
        "דף התשובות עודכן לפי השאלות הנוכחיות. נסו לפתוח שוב את דף התשובות.",
    };
  }

  if (answerKeyPayload.payloadKind !== ANSWER_KEY_PAYLOAD_KIND) {
    return { ok: false, status: 500, code: "invalid_answer_key_kind" };
  }

  return { ok: true, answerKeyPayload };
}

/**
 * Strip internal keys before sending worksheet payload to client.
 * @param {WorksheetPayload} payload
 * @returns {WorksheetPayload}
 */
export function publicWorksheetPayload(payload) {
  const meta = { ...payload.meta };
  delete meta.gradeKey;
  delete meta.topicKey;
  delete meta.levelKey;
  delete meta.mathPracticeFormat;
  return {
    payloadKind: WORKSHEET_PAYLOAD_KIND,
    meta,
    questions: payload.questions,
  };
}

/**
 * @param {AnswerKeyPayload} payload
 * @returns {AnswerKeyPayload}
 */
export function publicAnswerKeyPayload(payload) {
  const meta = { ...payload.meta };
  delete meta.gradeKey;
  delete meta.topicKey;
  delete meta.levelKey;
  delete meta.mathPracticeFormat;
  return {
    payloadKind: ANSWER_KEY_PAYLOAD_KIND,
    meta,
    answers: payload.answers,
    ...(payload.worksheetFingerprint
      ? { worksheetFingerprint: payload.worksheetFingerprint }
      : {}),
  };
}
