/**
 * Misconception / error-pattern inference (educational support; suspected, not clinical).
 * @module utils/learning-diagnostics/misconception-engine-v1
 */

import { ERROR_TYPES_BY_SUBJECT_ID } from "./diagnostic-framework-v1.js";
import { buildQuestionSkillMetadataV1 } from "./question-skill-metadata-v1.js";

export const MISCONCEPTION_ENGINE_V1 = "1.0.0";

const FAST_WRONG_MS = 8000;
const SLOW_CORRECT_MS = 45000;

function normStr(x) {
  return String(x ?? "")
    .trim()
    .toLowerCase();
}

/**
 * @param {object} params
 * @param {string} params.subjectId
 * @param {Record<string, unknown>} params.mistakeEvent — normalized mistake row
 * @param {Record<string, unknown>} [params.questionStub] — optional reconstructed question
 */
export function inferMisconceptionFromWrongAnswer(params) {
  const subjectId = String(params.subjectId || "");
  const ev = params.mistakeEvent && typeof params.mistakeEvent === "object" ? params.mistakeEvent : {};
  const allowed = new Set(ERROR_TYPES_BY_SUBJECT_ID[subjectId] || ERROR_TYPES_BY_SUBJECT_ID.math);

  const topicHint = ev.topicOrOperation || ev.bucketKey || "";
  const stub = {
    operation: topicHint,
    topic: topicHint,
    params: {
      kind: ev.kind,
      subtype: ev.subtype,
      patternFamily: ev.patternFamily,
      expectedErrorTags: ev.expectedErrorTags,
      diagnosticSkillId: ev.diagnosticSkillId,
    },
    correctAnswer: ev.correctAnswer,
    answers: undefined,
  };
  const meta = buildQuestionSkillMetadataV1(stub, {
    subjectCanonical: subjectId === "moledet-geography" ? "moledet_geography" : subjectId,
    grade: ev.grade,
    level: ev.level,
    topic: String(topicHint),
  });

  let errorType = "insufficient_evidence";
  let suspectedMisconception = "Unable to distinguish error mechanism from available fields.";
  let confidence = "very_low";
  /** @type {string[]} */
  const basedOn = [];
  /** @type {string[]} */
  const reasoning = [];
  /** @type {string[]} */
  const doNotConclude = [
    "This is a suspected learning pattern, not a confirmed diagnosis.",
    "Do not infer clinical or medical conditions.",
  ];

  const userAns = ev.userAnswer;
  const correctAns = ev.correctAnswer;
  const tags = Array.isArray(ev.expectedErrorTags) ? ev.expectedErrorTags.map(String) : [];
  if (tags.length) {
    const pick = tags.find((t) => allowed.has(t));
    if (pick) {
      errorType = pick;
      suspectedMisconception = `Pattern aligns with tagged error type: ${pick}.`;
      confidence = "medium";
      basedOn.push("expectedErrorTags");
    }
  }

  const respMs = Number(ev.responseMs);
  if (Number.isFinite(respMs) && respMs > 0) {
    basedOn.push(`responseMs:${respMs}`);
    if (!ev.isCorrect && respMs < FAST_WRONG_MS) {
      if (allowed.has("fast_guessing_pattern") || allowed.has("guessing_pattern")) {
        errorType = subjectId === "math" ? "fast_guessing_pattern" : "guessing_pattern";
        suspectedMisconception = "Very fast incorrect response may reflect guessing or pacing strategy.";
        confidence = "low";
        reasoning.push("Speed alone does not prove a specific misconception.");
        doNotConclude.push("Do not treat fast wrong answers as proof of knowledge gaps without further evidence.");
      }
    }
    if (ev.isCorrect && respMs > SLOW_CORRECT_MS) {
      reasoning.push("Slow correct response may reflect careful work-not a weakness signal.");
      doNotConclude.push("Slow correct work should not be interpreted as low mastery by itself.");
    }
  }

  if (userAns != null && correctAns != null && normStr(userAns) !== normStr(correctAns)) {
    basedOn.push("answer_mismatch");
    if (errorType === "insufficient_evidence") {
      if (subjectId === "math") {
        errorType = "calculation_error";
        suspectedMisconception = "Numeric/text answer mismatch-may be calculation slip or conceptual confusion.";
        confidence = "low";
      } else if (subjectId === "english") {
        errorType = "grammar_pattern_error";
        confidence = "low";
      } else if (subjectId === "hebrew") {
        errorType = "missed_explicit_information";
        confidence = "low";
      } else if (subjectId === "science") {
        errorType = "concept_confusion";
        confidence = "low";
      } else if (subjectId === "geometry") {
        errorType = "formula_selection_error";
        confidence = "low";
      } else if (subjectId === "moledet-geography") {
        errorType = "map_reading_error";
        confidence = "low";
      }
    }
  }

  if (!allowed.has(errorType)) errorType = [...allowed][0] || "insufficient_evidence";

  return {
    subjectId,
    topicId: meta.topicId,
    skillId: meta.skillId,
    subskillId: meta.subskillId,
    errorType,
    suspectedMisconception,
    confidence,
    basedOn,
    reasoning,
    doNotConclude,
  };
}

/**
 * @param {string} subjectId
 * @param {unknown[]} wrongEvents
 */
export function aggregateMisconceptionsForSubject(subjectId, wrongEvents) {
  const arr = Array.isArray(wrongEvents) ? wrongEvents : [];
  const out = [];
  const typeCounts = {};
  for (const ev of arr) {
    if (!ev || typeof ev !== "object" || ev.isCorrect) continue;
    const m = inferMisconceptionFromWrongAnswer({ subjectId, mistakeEvent: ev });
    out.push(m);
    typeCounts[m.errorType] = (typeCounts[m.errorType] || 0) + 1;
  }
  /** elevate confidence if same error type repeats */
  const elevated = out.map((m) => {
    const c = typeCounts[m.errorType] || 0;
    let conf = m.confidence;
    if (c >= 3 && conf === "low") conf = "medium";
    if (c >= 6 && conf === "medium") conf = "high";
    if (Object.keys(typeCounts).length > 4) conf = conf === "high" ? "medium" : conf;
    return { ...m, confidence: conf };
  });
  return { items: elevated, typeHistogram: typeCounts, version: MISCONCEPTION_ENGINE_V1 };
}
