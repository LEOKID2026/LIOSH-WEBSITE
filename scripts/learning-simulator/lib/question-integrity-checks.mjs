/**
 * Normalize generator/bank payloads and run structural integrity checks (Phase 4).
 */

function normTxt(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {object|null} raw
 * @returns {object|null}
 */
export function normalizeQuestionPayload(raw) {
  if (!raw || typeof raw !== "object") return null;

  const stem =
    raw.question ??
    raw.exerciseText ??
    raw.stem ??
    raw.template ??
    raw.questionLabel ??
    "";

  let answers = raw.answers ?? raw.options ?? null;
  if (!Array.isArray(answers) && answers != null) answers = null;

  let correctAnswer = raw.correctAnswer ?? raw.correct ?? null;
  const correctIndex = Number.isFinite(Number(raw.correctIndex)) ? Number(raw.correctIndex) : null;

  const singleDigitLabelOptions =
    Array.isArray(answers) &&
    answers.length >= 2 &&
    answers.length <= 9 &&
    answers.every((x) => /^[1-9]$/.test(String(x ?? "").trim()));

  if (
    typeof correctAnswer === "number" &&
    answers &&
    answers.length &&
    correctAnswer < answers.length &&
    !singleDigitLabelOptions
  ) {
    /* likely index — treat as index when all answers are strings */
    const allStr = answers.every((x) => typeof x === "string" || typeof x === "number");
    if (allStr && correctAnswer >= 0 && correctAnswer <= 9) {
      const byIndex = answers[correctAnswer];
      if (byIndex !== undefined) {
        correctAnswer = byIndex;
      }
    }
  }

  return {
    stem: String(stem),
    answers,
    correctAnswer,
    correctIndex,
    params: raw.params && typeof raw.params === "object" ? raw.params : {},
    explanation: raw.explanation ?? null,
    hint: raw.hint ?? null,
    _rawKind: raw.params?.kind,
  };
}

function uniqueStrings(arr) {
  const seen = new Set();
  let dups = 0;
  for (const x of arr) {
    const k = normTxt(x);
    if (seen.has(k)) dups += 1;
    seen.add(k);
  }
  return { uniqueCount: seen.size, duplicateCount: dups };
}

/**
 * @param {object} normalized — from normalizeQuestionPayload
 * @param {{ requestedTopic?: string, resolvedTopic?: string, grade?: string, level?: string, subject?: string }} ctx
 */
export function runIntegrityChecks(normalized, ctx = {}) {
  const failures = [];
  const warnings = [];

  if (!normalized) {
    failures.push({ code: "null_payload", message: "normalized question is null" });
    return { pass: false, failures, warnings };
  }

  const params = normalized.params || {};
  const kind = String(params.kind || "");

  if (kind === "no_question") {
    failures.push({
      code: "no_question_kind",
      message: "generator returned params.kind === no_question",
      kind,
    });
    return { pass: false, failures, warnings };
  }

  if (!normalized.stem || normalized.stem.trim().length < 2) {
    failures.push({ code: "missing_stem", message: "question stem/text missing or too short" });
  }

  const hasCorrect =
    normalized.correctAnswer != null &&
    normalized.correctAnswer !== "" &&
    !(typeof normalized.correctAnswer === "number" && Number.isNaN(normalized.correctAnswer));

  const answers = normalized.answers;
  const isMcq = Array.isArray(answers) && answers.length > 0;

  if (!hasCorrect && !isMcq) {
    failures.push({ code: "missing_answer", message: "no correctAnswer and no MCQ answers array" });
  }

  if (isMcq) {
    const nonempty = answers.every((a) => String(a ?? "").trim().length > 0);
    if (!nonempty) failures.push({ code: "empty_choice", message: "one or more MCQ choices are empty" });

    const { duplicateCount } = uniqueStrings(answers.map((x) => String(x)));
    if (duplicateCount > 0) {
      failures.push({ code: "duplicate_choices", message: `${duplicateCount} duplicate distractors detected` });
    }

    if (hasCorrect) {
      const ca = normalized.correctAnswer;
      const strMatch = answers.some((a) => normTxt(a) === normTxt(ca));
      const looseMatch = answers.some((a) => String(a) === String(ca));
      const numMatch =
        Number.isFinite(Number(ca)) &&
        answers.some((a) => Number.isFinite(Number(a)) && Number(a) === Number(ca));
      if (!strMatch && !looseMatch && !numMatch) {
        failures.push({
          code: "correct_not_in_options",
          message: "correctAnswer not found among MCQ options",
        });
      }
    }

    if (typeof normalized.correctIndex === "number" && normalized.correctIndex >= 0 && normalized.correctIndex < answers.length) {
      const at = answers[normalized.correctIndex];
      if (hasCorrect && normTxt(at) !== normTxt(normalized.correctAnswer)) {
        warnings.push({
          code: "correct_index_mismatch",
          message: "correctIndex points to different text than correctAnswer",
        });
      }
    }

  } else if (!hasCorrect) {
    /* numeric / open answer */
    warnings.push({ code: "non_mcq_shape", message: "no answers array — assuming numeric/free response" });
  }

  if (typeof params !== "object" || params === null) {
    failures.push({ code: "params_invalid", message: "params must be a plain object when present" });
  }

  const rt = ctx.requestedTopic ? String(ctx.requestedTopic) : "";
  const rv = ctx.resolvedTopic ? String(ctx.resolvedTopic) : "";
  if (rt && rv && rt !== rv) {
    warnings.push({
      code: "topic_fallback",
      message: `resolved topic "${rv}" differs from requested "${rt}" (documented generator fallback)`,
    });
  }

  if (ctx.meta?.levelNote) {
    warnings.push({ code: "level_encoding", message: String(ctx.meta.levelNote) });
  }

  const pass = failures.length === 0;
  return { pass, failures, warnings };
}
