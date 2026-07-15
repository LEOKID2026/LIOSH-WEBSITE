/**
 * Resolve MCQ choice lists for assigned-activity math (fractions / division_with_remainder).
 * Legacy frozen activities often store options only under params.answers / mcqOptionCells.
 * Client-safe — no math-question-generator import.
 */

/**
 * Math topics that use MCQ in math-master (not free numeric typing).
 * @param {Record<string, unknown>|null|undefined} question
 */
export function assignedActivityMathTopicUsesMcq(question) {
  const op = String(question?.operation || question?.topic || "")
    .trim()
    .toLowerCase();
  if (op === "fractions" || op === "division_with_remainder") return true;
  const kind = String(question?.params?.kind || "").trim().toLowerCase();
  if (kind.startsWith("frac_") || kind === "mixed_to_frac") return true;
  if (kind === "div_with_remainder" || kind === "div_with_remainder_long") return true;
  return false;
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeChoiceValue(value) {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    const v = /** @type {Record<string, unknown>} */ (value).value;
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
  }
  const s = String(value).trim();
  return s || null;
}

/**
 * Collect choice strings from top-level or nested generator params (legacy snapshots).
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {string[]|null}
 */
export function extractAssignedActivityMathMcqChoiceList(question) {
  if (!question || typeof question !== "object") return null;
  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? question.params
      : null;

  const candidates = [
    question.choices,
    question.answers,
    question.options,
    question.answerOptions,
    params?.answers,
    Array.isArray(params?.mcqOptionCells) ? params.mcqOptionCells : null,
  ];

  for (const list of candidates) {
    if (!Array.isArray(list) || list.length < 2) continue;
    const out = [];
    const seen = new Set();
    for (const raw of list) {
      const s = normalizeChoiceValue(raw);
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    if (out.length >= 2) return out;
  }
  return null;
}

/**
 * Promote nested/legacy choice lists onto top-level `choices` when present.
 * Does not invent options — use server hydrate for rebuild-from-correct.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {Record<string, unknown>|null|undefined}
 */
export function promoteAssignedActivityMathMcqChoices(question) {
  if (!question || typeof question !== "object") return question;
  if (String(question.subject || "").trim().toLowerCase() !== "math") return question;
  if (!assignedActivityMathTopicUsesMcq(question)) return question;
  const existing = extractAssignedActivityMathMcqChoiceList(question);
  if (!existing?.length) return question;
  if (Array.isArray(question.choices) && question.choices.length >= 2) return question;
  return { ...question, choices: existing, answers: question.answers ?? existing };
}
