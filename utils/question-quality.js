/**
 * Cross-subject MCQ / stem quality checks for audits and runtime polish.
 */

const NIQQUD_RE = /[\u0591-\u05C7]/g;
const PUNCT_EDGE_RE = /^[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+|[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+$/g;

/** @param {string} text */
export function normalizeOptionForCompare(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(NIQQUD_RE, "")
    .replace(/[“”״]/g, '"')
    .replace(/[‘’׳]/g, "'")
    .replace(PUNCT_EDGE_RE, "")
    .replace(/\s+/g, " ");
}

/** @param {string} text */
export function normalizeStemForFingerprint(text) {
  return String(text ?? "")
    .trim()
    .replace(NIQQUD_RE, "")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

/** @param {string} a @param {string} b */
export function optionsAreNearDuplicate(a, b) {
  const x = normalizeOptionForCompare(a);
  const y = normalizeOptionForCompare(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 4 && y.length >= 4) {
    if (x.includes(y) || y.includes(x)) return true;
    const shorter = x.length < y.length ? x : y;
    const longer = x.length < y.length ? y : x;
    if (longer.startsWith(shorter) && shorter.length / longer.length >= 0.72) return true;
  }
  return false;
}

const BANNED_MCQ_OPTIONS_RE =
  /כל\s*התשובות|שניהם\s*נכון|שנייהם\s*נכון|גם\s*וגם|^אף\s+אחת\s+לא$|אין\s+תשובה\s+נכונה/i;

const GENERIC_HEBREW_READING_DISTRACTORS = new Set([
  normalizeOptionForCompare("ילד משחק"),
  normalizeOptionForCompare("ילד כותב"),
  normalizeOptionForCompare("ילד אוכל"),
]);

const READING_DISTRACTOR_REPLACEMENTS = [
  ["ילד מדבר בטלפון", "ילד הולך לחנות", "ילד צופה בטלוויזיה"],
  ["ילד רץ בחצר", "ילד ישן בבית", "ילד שוחה בים"],
  ["ילד מכין ארוחת בוקר", "ילד מסדר את החדר", "ילד מחכה לאוטובוס"],
  ["ילד בונה מגדל מקוביות", "ילד שומע מוזיקה", "ילד מחפש צעצוע"],
];

/**
 * @param {unknown} q
 * @returns {{ answers: string[], correctIndex: number, correctAnswer: string|null }}
 */
export function extractMcqFields(q) {
  const answers = Array.isArray(q?.answers)
    ? q.answers.map((a) => String(a ?? "").trim()).filter(Boolean)
    : Array.isArray(q?.options)
      ? q.options.map((a) => String(a ?? "").trim()).filter(Boolean)
      : [];

  let correctIndex =
    Number.isFinite(Number(q?.correctIndex)) ? Number(q.correctIndex) : null;
  if (correctIndex == null && Number.isFinite(Number(q?.correct))) {
    const c = Number(q.correct);
    if (c >= 0 && c < answers.length) correctIndex = c;
  }

  let correctAnswer =
    q?.correctAnswer != null && q.correctAnswer !== ""
      ? String(q.correctAnswer).trim()
      : null;
  if (correctAnswer == null && correctIndex != null && answers[correctIndex] != null) {
    correctAnswer = answers[correctIndex];
  }
  if (correctIndex == null && correctAnswer && answers.length) {
    const idx = answers.findIndex(
      (a) => normalizeOptionForCompare(a) === normalizeOptionForCompare(correctAnswer)
    );
    if (idx >= 0) correctIndex = idx;
  }

  return {
    answers,
    correctIndex: correctIndex ?? 0,
    correctAnswer,
  };
}

/**
 * @param {unknown} q
 * @param {{ subject?: string, topic?: string }} [ctx]
 */
export function auditMcqQuality(q, ctx = {}) {
  const failures = [];
  const warnings = [];
  const { answers, correctIndex, correctAnswer } = extractMcqFields(q);

  if (answers.length < 2) {
    return { failures, warnings, isMcq: false };
  }

  const stem = String(q?.question ?? q?.exerciseText ?? q?.stem ?? "").trim();

  for (let i = 0; i < answers.length; i++) {
    for (let j = i + 1; j < answers.length; j++) {
      if (normalizeOptionForCompare(answers[i]) === normalizeOptionForCompare(answers[j])) {
        failures.push({
          code: "duplicate_options",
          message: `Duplicate options at ${i} and ${j}`,
          options: [answers[i], answers[j]],
        });
      } else if (optionsAreNearDuplicate(answers[i], answers[j])) {
        failures.push({
          code: "near_duplicate_options",
          message: `Near-duplicate options at ${i} and ${j}`,
          options: [answers[i], answers[j]],
        });
      }
    }
  }

  const correctNorm = normalizeOptionForCompare(correctAnswer);
  let multiCorrect = 0;
  for (let i = 0; i < answers.length; i++) {
    if (i === correctIndex) continue;
    if (
      normalizeOptionForCompare(answers[i]) === correctNorm ||
      optionsAreNearDuplicate(answers[i], correctAnswer)
    ) {
      multiCorrect += 1;
    }
  }
  if (multiCorrect > 0) {
    failures.push({
      code: "multiple_correct_options",
      message: `${multiCorrect} distractor(s) match the correct answer`,
    });
  }

  for (const opt of answers) {
    if (BANNED_MCQ_OPTIONS_RE.test(String(opt).trim())) {
      failures.push({
        code: "banned_option_phrase",
        message: `Banned option phrase: ${opt}`,
      });
    }
  }

  const distractors = answers.filter((_, i) => i !== correctIndex);
  const correctLen = String(correctAnswer || answers[correctIndex] || "").trim().length;
  const distractorLens = distractors.map((d) => d.length).filter((n) => n > 0);
  const avgDistractor =
    distractorLens.length > 0
      ? distractorLens.reduce((a, b) => a + b, 0) / distractorLens.length
      : 0;

  if (correctLen > 0 && avgDistractor > 0 && correctLen > avgDistractor * 1.8) {
    warnings.push({
      code: "correct_answer_length_bias",
      message: `Correct answer length ${correctLen} vs avg distractor ${avgDistractor.toFixed(1)}`,
      ratio: correctLen / avgDistractor,
    });
  }

  const correctSentences = (String(correctAnswer || "").match(/[.!?]/g) || []).length;
  const distractorSentences = distractors.map(
    (d) => (String(d).match(/[.!?]/g) || []).length
  );
  if (
    correctSentences >= 1 &&
    distractorSentences.every((n) => n === 0) &&
    correctLen > 24
  ) {
    warnings.push({
      code: "correct_only_full_sentence",
      message: "Correct answer is the only full sentence among options",
    });
  }

  const genericWrong = distractors.filter((d) =>
    GENERIC_HEBREW_READING_DISTRACTORS.has(normalizeOptionForCompare(d))
  ).length;
  if (
    genericWrong >= 2 &&
    (ctx.topic === "reading" || /קרא את הטקסט|קרא את המשפט/i.test(stem))
  ) {
    warnings.push({
      code: "generic_reading_distractors",
      message: "Uses generic 'ילד משחק/כותב/אוכל' distractors",
      count: genericWrong,
    });
  }

  const wordCounts = answers.map((a) => String(a).trim().split(/\s+/).filter(Boolean).length);
  const correctWords = wordCounts[correctIndex] || 0;
  const wrongWords = wordCounts.filter((_, i) => i !== correctIndex);
  if (
    correctWords >= 5 &&
    wrongWords.length >= 2 &&
    wrongWords.every((w) => w <= 3) &&
    correctWords >= Math.max(...wrongWords) + 3
  ) {
    warnings.push({
      code: "word_count_style_mismatch",
      message: "Correct option is much longer than all distractors",
    });
  }

  return { failures, warnings, isMcq: true };
}

/**
 * Stable fingerprint: stem + options + correct answer.
 * @param {unknown} q
 * @param {{ subject?: string, topic?: string, level?: string, grade?: string }} [ctx]
 */
export function buildQuestionFingerprint(q, ctx = {}) {
  const subject = ctx.subject || "unknown";
  const topic = ctx.topic || q?.topic || q?.operation || "";
  const grade = ctx.grade || q?.params?.gradeKey || q?.params?.grade || "";
  const level = ctx.level || q?.params?.levelKey || "";
  const stem = normalizeStemForFingerprint(
    q?.question ?? q?.exerciseText ?? q?.stem ?? ""
  );
  const { answers, correctAnswer } = extractMcqFields(q);
  const opts = answers.map(normalizeOptionForCompare).sort().join("\t");
  const ca = normalizeOptionForCompare(correctAnswer);
  if (q?.id) return `${subject}|id:${q.id}`;
  return `${subject}|${grade}|${level}|${topic}|${stem}|${ca}|${opts}`;
}

/**
 * Near-duplicate stem key (first words).
 * @param {unknown} q
 */
export function buildNearDuplicateStemKey(q) {
  const topic = q?.topic || q?.operation || "";
  const stem = normalizeStemForFingerprint(
    q?.question ?? q?.exerciseText ?? q?.stem ?? ""
  );
  const head = stem.split(" ").slice(0, 12).join(" ");
  return `${topic}|${head}`;
}

/**
 * Replace generic Hebrew reading distractors with varied plausible wrong answers.
 * @param {{ answers: string[], correct: number }} q
 */
export function rebalanceGenericHebrewReadingDistractors(q) {
  if (!Array.isArray(q.answers) || q.answers.length < 4) return q;
  const ci = Number(q.correct) || 0;
  const wrongIdx = q.answers
    .map((_, i) => i)
    .filter((i) => i !== ci);
  const genericCount = wrongIdx.filter((i) =>
    GENERIC_HEBREW_READING_DISTRACTORS.has(normalizeOptionForCompare(q.answers[i]))
  ).length;
  if (genericCount < 2) return q;

  const seed =
    normalizeStemForFingerprint(q.question || "").length +
    normalizeOptionForCompare(q.answers[ci]).length;
  const pack =
    READING_DISTRACTOR_REPLACEMENTS[seed % READING_DISTRACTOR_REPLACEMENTS.length];
  let pi = 0;
  for (const i of wrongIdx) {
    if (
      GENERIC_HEBREW_READING_DISTRACTORS.has(normalizeOptionForCompare(q.answers[i])) &&
      pack[pi]
    ) {
      q.answers[i] = pack[pi];
      pi += 1;
    }
  }
  return q;
}

/**
 * Dedupe MCQ options in-place (keeps correct).
 * @param {{ answers: string[], correct: number }} q
 */
/**
 * Lighter key for MCQ deduplication: strips niqqud and collapses whitespace but
 * intentionally does NOT strip punctuation from the edges of the string.
 * This prevents distinct MCQ options such as "היום חם." and "היום חם?" from being
 * collapsed into one another when the punctuation is the entire point of the question.
 * @param {string} t
 */
function mcqDedupKey(t) {
  const light = String(t ?? "")
    .trim()
    .toLowerCase()
    .replace(NIQQUD_RE, "")
    .replace(/\s+/g, " ");
  return light || t.toLowerCase().trim();
}

export function dedupeMcqOptionsInPlace(q) {
  if (!Array.isArray(q.answers) || q.answers.length < 2) return q;
  let correctIdx = Number(q.correct);
  if (!Number.isFinite(correctIdx) || correctIdx < 0 || correctIdx >= q.answers.length) {
    correctIdx = 0;
  }
  const correctText = q.answers[correctIdx];
  const banned = (t) => BANNED_MCQ_OPTIONS_RE.test(String(t).trim());
  if (banned(correctText)) return q;

  const entries = q.answers
    .map((t, i) => ({ t: String(t ?? "").trim(), isCorrect: i === correctIdx }))
    .filter(({ t }) => t && !banned(t));

  const acc = [];
  for (const { t, isCorrect } of entries) {
    const key = mcqDedupKey(t);
    const existing = acc.findIndex((x) => mcqDedupKey(x.t) === key);
    if (existing < 0) {
      acc.push({ t, isCorrect });
    } else if (isCorrect) {
      acc[existing] = { t, isCorrect: true };
    }
  }

  const out = acc.map((x) => x.t);
  const newCorrect = acc.findIndex((x) => x.isCorrect);
  if (newCorrect < 0 || out.length < 2) return q;
  q.answers = out;
  q.correct = newCorrect;
  if (q.optionCount != null) q.optionCount = out.length;
  return q;
}
