/**
 * Shared MCQ option-count audit helpers (child-visible / runtime paths).
 * Self-contained for QA scripts (no static imports from CJS-interop .js utils).
 */

export const NORMAL_MCQ_OPTION_COUNT = 4;

const GEOMETRY_LABEL_KINDS = new Set([
  "parallel_perpendicular",
  "triangles",
  "transformations",
  "shapes_basic_square",
  "shapes_basic_rectangle",
  "shapes_basic_properties_square",
  "shapes_basic_properties_rectangle",
  "shapes_basic_properties_angles",
  "quadrilaterals",
  "solids",
]);

/** @param {string} text */
export function normalizeOptionKey(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[“”״]/g, '"')
    .replace(/[‘’׳]/g, "'")
    .replace(/^[\s"'`.,!?;:()[\]{}\-–—]+|[\s"'`.,!?;:()[\]{}\-–—]+$/g, "")
    .replace(/\s+/g, " ");
}

/** @param {unknown} q */
export function isGeometryVariableLabelMcq(q) {
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  const baseKind = String(params.kind || "").replace(/^story_/, "");
  return GEOMETRY_LABEL_KINDS.has(baseKind);
}

/** @param {unknown} q */
export function shouldEnforceFourMcqOptions(q) {
  if (!q || typeof q !== "object") return false;
  const answers = childVisibleMcqOptions(q);
  if (answers.length === 0) return false;
  const params = q.params && typeof q.params === "object" ? q.params : {};
  const mode = String(params.answerMode ?? q.answerMode ?? q.qType ?? "").toLowerCase();
  if (mode === "typing" || mode === "numeric" || mode === "text") return false;
  if (params.kind === "empty_pool" || params.patternFamily === "no_questions") return false;
  if (isGeometryVariableLabelMcq(q)) return false;
  return true;
}

/** @param {unknown} cell */
function cellValue(cell) {
  if (cell == null) return null;
  if (typeof cell === "object" && cell !== null && "value" in cell) return cell.value;
  return cell;
}

/** @param {unknown} q */
export function childVisibleMcqOptions(q) {
  const raw = Array.isArray(q?.choices)
    ? q.choices
    : Array.isArray(q?.answers)
      ? q.answers
      : Array.isArray(q?.options)
        ? q.options
        : [];
  return raw
    .map((a) => {
      const v = cellValue(a);
      if (v == null) return String(a ?? "").trim();
      if (typeof v === "number" && Number.isFinite(v)) return v;
      return String(v).trim();
    })
    .filter((a) => String(a).length > 0);
}

/** @param {unknown} q */
export function isMcqShapeQuestion(q) {
  const options = childVisibleMcqOptions(q);
  if (options.length > 0) return true;
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  const mode = String(params.answerMode ?? q?.answerMode ?? q?.qType ?? "").toLowerCase();
  return mode === "choice";
}

/** @param {unknown} q @param {string|null} [correctRaw] @param {Record<string, unknown>} [meta] */
export function auditMcqOptionRow(q, correctRaw, meta = {}) {
  if (!isMcqShapeQuestion(q)) {
    return {
      ...meta,
      stem: String(q?.question ?? q?.stem ?? "").trim().slice(0, 160),
      options: [],
      optionCount: 0,
      expectedCount: 0,
      enforceFour: false,
      skipped: true,
      skipReason: "non_mcq_shape",
      issues: [],
      pass: true,
    };
  }
  const options = childVisibleMcqOptions(q);
  const stem = String(
    q?.question ?? q?.stem ?? q?.exerciseText ?? q?.template ?? ""
  ).trim();
  const enforceFour = shouldEnforceFourMcqOptions({
    ...q,
    answers: options,
    question: stem,
  });

  const keys = options.map((o) => normalizeOptionKey(String(o)));
  const uniqueKeys = new Set(keys.filter(Boolean));
  const duplicateOptions = uniqueKeys.size !== keys.length;

  let correct = correctRaw != null ? String(correctRaw).trim() : "";
  if (!correct && q?.correctAnswer != null) correct = String(q.correctAnswer).trim();
  if (!correct && Number.isFinite(Number(q?.correctIndex)) && options[Number(q.correctIndex)] != null) {
    correct = String(options[Number(q.correctIndex)]).trim();
  }

  const correctInOptions =
    !correct ||
    options.some(
      (o) =>
        String(o) === correct ||
        normalizeOptionKey(String(o)) === normalizeOptionKey(correct)
    );

  const nonPrimitive = options.some((o) => {
    const t = typeof o;
    return t !== "string" && t !== "number";
  });

  const issues = [];
  if (enforceFour && options.length !== NORMAL_MCQ_OPTION_COUNT) {
    issues.push(`option_count_${options.length}_expected_${NORMAL_MCQ_OPTION_COUNT}`);
  } else if (!enforceFour && options.length < 2) {
    issues.push(`option_count_${options.length}_too_few`);
  }
  if (duplicateOptions) issues.push("duplicate_options");
  if (correct && !correctInOptions) issues.push("correct_not_in_options");
  if (nonPrimitive) issues.push("non_primitive_option");
  if (options.some((o) => !String(o).trim())) issues.push("empty_option");

  return {
    ...meta,
    stem: stem.slice(0, 160),
    options,
    optionCount: options.length,
    expectedCount: enforceFour ? NORMAL_MCQ_OPTION_COUNT : options.length,
    enforceFour,
    correctAnswer: correct || null,
    duplicateOptions,
    correctInOptions,
    issues,
    pass: issues.length === 0,
  };
}

/** @param {Array<Record<string, unknown>>} rows */
export function summarizeMcqOptionAudits(rows) {
  const summary = {
    totalScanned: rows.length,
    pass: 0,
    fail: 0,
    exactly4: 0,
    count2: 0,
    count3: 0,
    countOver4: 0,
    duplicateOptions: 0,
    correctMissing: 0,
    bySubject: /** @type {Record<string, { total: number, fail: number, count2: number, count3: number, not4: number }>} */ ({}),
    bySource: /** @type {Record<string, { total: number, fail: number }>} */ ({}),
    verdict: "PASS",
  };

  for (const row of rows) {
    if (row.pass) summary.pass += 1;
    else summary.fail += 1;

    const n = Number(row.optionCount) || 0;
    if (n === 4) summary.exactly4 += 1;
    if (n === 2) summary.count2 += 1;
    if (n === 3) summary.count3 += 1;
    if (n > 4) summary.countOver4 += 1;
    if (row.duplicateOptions) summary.duplicateOptions += 1;
    if (Array.isArray(row.issues) && row.issues.includes("correct_not_in_options")) {
      summary.correctMissing += 1;
    }

    const sub = String(row.subject || "unknown");
    if (!summary.bySubject[sub]) {
      summary.bySubject[sub] = { total: 0, fail: 0, count2: 0, count3: 0, not4: 0 };
    }
    summary.bySubject[sub].total += 1;
    if (!row.pass) summary.bySubject[sub].fail += 1;
    if (n === 2) summary.bySubject[sub].count2 += 1;
    if (n === 3) summary.bySubject[sub].count3 += 1;
    if (row.enforceFour && n !== 4) summary.bySubject[sub].not4 += 1;

    const src = String(row.source || "unknown");
    if (!summary.bySource[src]) summary.bySource[src] = { total: 0, fail: 0 };
    summary.bySource[src].total += 1;
    if (!row.pass) summary.bySource[src].fail += 1;
  }

  summary.verdict = summary.fail === 0 ? "PASS" : "NOT_PASS";
  return summary;
}
