/** Step-by-step exercise view types and resolution for math modal. */

export const EXERCISE_VIEWS = {
  placeValue: "placeValue",
  multiplication: "multiplication",
  longDivision: "longDivision",
  fraction: "fraction",
  expression: "expression",
  wordProblem: "wordProblem",
};

const PLACE_VALUE_HIGHLIGHT_RE =
  /^(a|b|result)(Col\d+|Units|Tens|Hundreds|All)$/;

export function hasPlaceValueHighlightKeys(highlights = []) {
  if (!Array.isArray(highlights)) return false;
  return highlights.some((k) => PLACE_VALUE_HIGHLIGHT_RE.test(String(k)));
}

export function isMultiplicationStepId(id) {
  const s = String(id || "");
  return (
    s === "place-value" ||
    s === "explain" ||
    s === "single-digit" ||
    s.startsWith("row-") ||
    s.startsWith("sum-") ||
    s === "final" ||
    s === "note"
  );
}

/**
 * @param {object} step
 * @param {object} [question]
 * @param {string} [operation]
 * @returns {keyof typeof EXERCISE_VIEWS | null}
 */
export function resolveExerciseView(step, question, operation) {
  if (!step) return null;
  if (step.exerciseView && EXERCISE_VIEWS[step.exerciseView]) {
    return step.exerciseView;
  }

  const op = operation || question?.operation;

  if (step.type === "division") return EXERCISE_VIEWS.longDivision;
  if (step.type === "fractions") return EXERCISE_VIEWS.fraction;

  if (step.type === "word_problems") {
    if (step.pre || hasPlaceValueHighlightKeys(step.highlights)) {
      if (hasPlaceValueHighlightKeys(step.highlights)) return EXERCISE_VIEWS.placeValue;
      if (step.type === "division") return EXERCISE_VIEWS.longDivision;
    }
    if (
      !step.pre &&
      Array.isArray(step.highlights) &&
      step.highlights.some((h) =>
        ["story", "operation", "equation", "keywords", "numbers"].includes(h)
      )
    ) {
      return EXERCISE_VIEWS.wordProblem;
    }
    if (step.pre) return EXERCISE_VIEWS.expression;
    return EXERCISE_VIEWS.wordProblem;
  }

  if (op === "multiplication" || (op === "word_problems" && isMultiplicationStepId(step.id))) {
    if (step.pre || isMultiplicationStepId(step.id)) return EXERCISE_VIEWS.multiplication;
  }

  if (op === "division" || op === "division_with_remainder") {
    return EXERCISE_VIEWS.longDivision;
  }

  if (
    op === "addition" ||
    op === "subtraction" ||
    op === "decimals" ||
    hasPlaceValueHighlightKeys(step.highlights)
  ) {
    if (step.pre || hasPlaceValueHighlightKeys(step.highlights)) {
      return EXERCISE_VIEWS.placeValue;
    }
  }

  if (step.expressionLines?.length || step.pre) {
    return EXERCISE_VIEWS.expression;
  }

  if (
    [
      "percentages",
      "sequences",
      "equations",
      "compare",
      "number_sense",
      "factors_multiples",
      "rounding",
      "divisibility",
      "prime_composite",
      "powers",
      "ratio",
      "order_of_operations",
      "zero_one_properties",
      "estimation",
      "scale",
    ].includes(step.type)
  ) {
    return EXERCISE_VIEWS.expression;
  }

  return null;
}

/**
 * Whether the step-by-step modal should render a standalone exercise panel (pre/grid)
 * above the Hebrew explanation text — not for wordProblem or expression-only text steps.
 * @param {object} step
 * @param {object} [question]
 * @param {object} [layoutProps]
 */
export function shouldShowStandaloneExerciseView(step, question, layoutProps = {}) {
  if (!step) return false;
  const view = step.exerciseView || resolveExerciseView(step, question, question?.operation);

  if (view === EXERCISE_VIEWS.wordProblem) return false;
  if (view === EXERCISE_VIEWS.expression) return Boolean(step.pre);

  if (view === EXERCISE_VIEWS.placeValue) {
    return layoutProps.topValue != null || Boolean(step.pre);
  }

  if (
    view === EXERCISE_VIEWS.multiplication ||
    view === EXERCISE_VIEWS.longDivision ||
    view === EXERCISE_VIEWS.fraction
  ) {
    return Boolean(step.pre) || view != null;
  }

  return Boolean(step.pre);
}

/**
 * Attach exerciseView to each animation step.
 * @param {object[]} steps
 * @param {object} question
 * @param {string} [operation]
 */
export function annotateAnimationSteps(steps, question, operation) {
  if (!Array.isArray(steps)) return steps;
  const op = operation || question?.operation;
  return steps.map((step) => ({
    ...step,
    exerciseView: resolveExerciseView(step, question, op),
  }));
}
