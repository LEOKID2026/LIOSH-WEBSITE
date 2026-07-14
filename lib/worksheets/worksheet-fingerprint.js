/**
 * Worksheet ↔ answer-key session fingerprint — no answers, display-safe keys only.
 * @module lib/worksheets/worksheet-fingerprint
 */

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} q
 * @returns {string}
 */
export function worksheetQuestionStemKey(q) {
  return [
    q.displayIndex,
    q.questionType || "",
    q.stemHe || "",
    q.mathExpressionLtr || "",
    q.verticalLayoutLtr || "",
    (q.optionsHe || []).join("|"),
  ].join("::");
}

/**
 * @param {import("./worksheet-question-types.js").WorksheetPayload} worksheetPayload
 * @returns {{ questionCount: number, questionKeys: string[] }}
 */
export function buildWorksheetContentFingerprint(worksheetPayload) {
  const questions = worksheetPayload?.questions || [];
  return {
    questionCount: questions.length,
    questionKeys: questions.map(worksheetQuestionStemKey),
  };
}

/**
 * @param {Record<string, unknown>} [generation]
 * @returns {Record<string, unknown>}
 */
export function buildWorksheetGenerationFingerprint(generation) {
  const preferMcq =
    generation?.preferMcq === true
      ? true
      : generation?.preferMcq === false
        ? false
        : null;
  return {
    subjectId: generation?.subjectId ?? null,
    gradeKey: generation?.gradeKey ?? null,
    topicKey: generation?.topicKey ?? null,
    levelKey: generation?.levelKey ?? null,
    count: generation?.count ?? null,
    seed: generation?.seed ?? null,
    inkSave: generation?.inkSave === true,
    mathPracticeFormat:
      typeof generation?.mathPracticeFormat === "string"
        ? generation.mathPracticeFormat
        : null,
    preferMcq,
  };
}

/**
 * @param {import("./worksheet-question-types.js").WorksheetPayload} worksheetPayload
 * @param {Record<string, unknown>} generation
 * @returns {{ generation: Record<string, unknown>, content: { questionCount: number, questionKeys: string[] } }}
 */
export function buildWorksheetSessionFingerprint(worksheetPayload, generation) {
  return {
    generation: buildWorksheetGenerationFingerprint(generation),
    content: buildWorksheetContentFingerprint(worksheetPayload),
  };
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function worksheetFingerprintsMatch(a, b) {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const fa = /** @type {{ generation?: Record<string, unknown>, content?: { questionCount?: number, questionKeys?: string[] } }} */ (a);
  const fb = /** @type {{ generation?: Record<string, unknown>, content?: { questionCount?: number, questionKeys?: string[] } }} */ (b);
  const ca = fa.content;
  const cb = fb.content;
  if (!ca || !cb) return false;
  if (ca.questionCount !== cb.questionCount) return false;
  const keysA = ca.questionKeys || [];
  const keysB = cb.questionKeys || [];
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    if (keysA[i] !== keysB[i]) return false;
  }
  const ga = fa.generation || {};
  const gb = fb.generation || {};
  const genKeys = new Set([...Object.keys(ga), ...Object.keys(gb)]);
  for (const key of genKeys) {
    if (ga[key] !== gb[key]) return false;
  }
  return true;
}

/**
 * @param {import("./worksheet-question-types.js").WorksheetPayload} worksheetPayload
 * @param {Record<string, unknown>} generation
 * @param {import("./worksheet-question-types.js").AnswerKeyPayload | null | undefined} answerKeyPayload
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateStoredAnswerKeyForWorksheet(
  worksheetPayload,
  generation,
  answerKeyPayload
) {
  if (!answerKeyPayload?.answers?.length || !worksheetPayload?.questions?.length) {
    return { ok: false, reason: "missing_data" };
  }
  const currentFp = buildWorksheetSessionFingerprint(worksheetPayload, generation);
  if (!worksheetFingerprintsMatch(currentFp, answerKeyPayload.worksheetFingerprint)) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (answerKeyPayload.answers.length !== worksheetPayload.questions.length) {
    return { ok: false, reason: "count_mismatch" };
  }
  for (let i = 0; i < worksheetPayload.questions.length; i += 1) {
    if (
      answerKeyPayload.answers[i].displayIndex !==
      worksheetPayload.questions[i].displayIndex
    ) {
      return { ok: false, reason: "order_mismatch" };
    }
  }
  return { ok: true };
}
