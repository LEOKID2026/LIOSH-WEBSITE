/**
 * Math display mapping for printable worksheets — driven by worksheetMathPracticeFormat.
 * @module lib/worksheets/worksheet-math-display.server
 */

import { buildVerticalOperation } from "../../utils/math-animations.js";
import {
  isMathFractionsQuestionStem,
  shouldHideFractionsMcqTrailingBlank,
  stripRedundantTrailingAnswerBlank,
} from "../../utils/math-fraction-question-display.js";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse.js";
import { splitWorksheetStemProseAndMath } from "./worksheet-math-ltr-display.js";
import {
  getMathPracticeFormatSpec,
  inferMathPracticeFormat,
  isWorksheetMathPracticeFormat,
  resolveMathDisplayMode,
} from "./worksheet-math-practice-format.js";

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function canBuildMathVerticalLayout(raw) {
  const op = String(raw.operation || raw.topic || "");
  const params = raw.params || {};
  if (params.vertical === true || params.kind === "mul_vertical") return true;
  if (op === "addition" || op === "subtraction" || op === "multiplication") {
    return raw.a != null && raw.b != null;
  }
  if (op === "division" || op === "division_with_remainder") {
    return (params.dividend ?? raw.a) != null && (params.divisor ?? raw.b) != null;
  }
  if (op === "decimals") {
    const kind = params.kind;
    return (
      params.a != null &&
      params.b != null &&
      (kind === "dec_add" || kind === "dec_sub")
    );
  }
  return false;
}

/** @deprecated Use canBuildMathVerticalLayout — kept for tests referencing old name */
export const canDisplayMathVertically = canBuildMathVerticalLayout;

/**
 * @param {Record<string, unknown>} raw
 * @returns {string|null}
 */
export function buildMathVerticalLayoutText(raw) {
  if (!canBuildMathVerticalLayout(raw)) return null;
  const op = String(raw.operation || raw.topic || "");
  const params = raw.params || {};
  if (op === "addition") {
    return buildVerticalOperation(raw.a, raw.b, "+");
  }
  if (op === "subtraction") {
    return buildVerticalOperation(raw.a, raw.b, "-");
  }
  if (op === "multiplication") {
    return buildVerticalOperation(raw.a, raw.b, "×");
  }
  if (op === "division" || op === "division_with_remainder") {
    const kind = String(params.kind || "");
    if (kind === "div_long" || kind === "div_two_digit") {
      // סימון חילוק ארוך אמיתי מ־dividend/divisor — לא תלוי ב־exerciseText חד־שורתי.
      const dividend = params.dividend ?? raw.a;
      const divisor = params.divisor ?? raw.b;
      if (dividend == null || divisor == null) return null;
      return buildVerticalOperation(divisor, dividend, "÷");
    }
    // חילוק עם שארית מוצג במאוזן דרך enrich (לא כאן).
    const dividend = params.dividend ?? raw.a;
    const divisor = params.divisor ?? raw.b;
    return buildVerticalOperation(divisor, dividend, "÷");
  }
  if (op === "decimals") {
    const places = params.places || 2;
    const kind = params.kind;
    if (kind === "dec_add") {
      return buildVerticalOperation(
        Number(params.a).toFixed(places),
        Number(params.b).toFixed(places),
        "+"
      );
    }
    if (kind === "dec_sub") {
      return buildVerticalOperation(
        Number(params.a).toFixed(places),
        Number(params.b).toFixed(places),
        "-"
      );
    }
  }
  if (params.exerciseText && typeof params.exerciseText === "string") {
    return params.exerciseText;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {string}
 */
export function resolveMathExpressionText(raw) {
  const exerciseText =
    (typeof raw.exerciseText === "string" && raw.exerciseText.trim()) ||
    (typeof raw.params?.exerciseText === "string" && raw.params.exerciseText.trim()) ||
    "";
  const label =
    (typeof raw.questionLabel === "string" && raw.questionLabel.trim()) || "";
  const stem =
    (typeof raw.question === "string" && raw.question.trim()) ||
    (typeof raw.stemHe === "string" && raw.stemHe.trim()) ||
    "";
  const usesChoiceUi = Array.isArray(raw.answers) && raw.answers.length >= 2;
  let text = exerciseText || label || stem;
  if (shouldHideFractionsMcqTrailingBlank(raw, { usesChoiceUi })) {
    text = stripRedundantTrailingAnswerBlank(text);
  }
  text = text.trim();
  if (!text || /^_{2,}$/.test(text)) {
    let fallback = label || stem;
    if (shouldHideFractionsMcqTrailingBlank(raw, { usesChoiceUi })) {
      fallback = stripRedundantTrailingAnswerBlank(fallback);
    }
    text = fallback.trim();
  }
  return text;
}

/**
 * True when long-division operands exist so a bracket layout can be built.
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function hasAdequateLongDivisionVerticalLayout(raw) {
  const params = raw.params || {};
  const kind = String(params.kind || "");
  const isLongKind =
    kind === "div_long" || kind === "div_two_digit" || params.longDivision === true;
  if (!isLongKind) return false;
  const dividend = params.dividend ?? raw.a;
  const divisor = params.divisor ?? raw.b;
  return dividend != null && divisor != null;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function isMathWordProblem(raw) {
  const op = String(raw.operation || raw.topic || "");
  const kind = String(raw.params?.kind || "");
  return op === "word_problems" || kind.startsWith("wp_");
}

/**
 * @param {string} stemHe
 * @returns {string}
 */
function stripHorizontalExerciseFromStem(stemHe) {
  const split = splitWorksheetStemProseAndMath(stemHe);
  return split.proseHe?.trim() || "";
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} base
 * @param {boolean} preferOpen
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
function applyOpenAnswerPreference(base, preferOpen) {
  if (!preferOpen) return base;
  const { optionsHe: _removed, ...rest } = base;
  return rest;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} base
 * @param {{ mathPracticeFormat?: string | null, gradeKey?: string, topicKey?: string }} [options]
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function enrichMathPrintableQuestion(raw, base, options = {}) {
  const preferMcq = options.preferMcq;
  const topicKey = String(
    options.topicKey || raw.operation || raw.topic || ""
  ).toLowerCase();
  const gradeKey = String(options.gradeKey || raw.gradeLevel || "g3");
  let formatId = options.mathPracticeFormat;
  if (!formatId || !isWorksheetMathPracticeFormat(formatId)) {
    formatId = inferMathPracticeFormat(topicKey, gradeKey);
  }

  const kind = String(raw.params?.kind || "");
  const expression = resolveMathExpressionText({ ...raw, stemHe: base.stemHe });
  const wordProblem = isMathWordProblem(raw);
  const op = String(raw.operation || raw.topic || "");
  const fractionLike =
    op === "fractions" ||
    isMathFractionsQuestionStem(raw) ||
    hasStackedFractionToken(expression);

  if (!formatId) {
    let questionType = base.questionType;
    if (wordProblem) questionType = "word_problem";
    else if (fractionLike) questionType = "fraction";
    else if (base.optionsHe?.length) questionType = "mcq";
    else questionType = "open";

    const needsMathExpression =
      fractionLike ||
      ["decimals", "percentages", "ratio", "scale", "equations"].includes(op);
    const safeLtrCandidate = expression && !/^_{2,}$/.test(expression) ? expression : base.stemHe;

    return {
      ...base,
      questionType,
      mathExpressionLtr: needsMathExpression ? safeLtrCandidate : undefined,
      verticalLayoutLtr: undefined,
      wordProblemBodyHe: wordProblem ? base.stemHe : undefined,
      writingSpaceLines: wordProblem ? base.writingSpaceLines || 4 : base.writingSpaceLines,
    };
  }

  const spec = getMathPracticeFormatSpec(formatId);
  const displayMode = resolveMathDisplayMode(formatId, kind);
  const preferOpen = preferMcq === true ? false : preferMcq === false ? true : spec.preferOpen;
  let questionType = base.questionType;

  // חילוק עם שארית: ביטוי LTR + שורת «שארית» RTL בנפרד (לא אותה מחרוזת).
  if (formatId === "division_with_remainder" || kind === "div_with_remainder") {
    const dividend = raw.params?.dividend ?? raw.a;
    const divisor = raw.params?.divisor ?? raw.b;
    const mathLtr =
      dividend != null && divisor != null
        ? `${dividend} ÷ ${divisor} = __`
        : String(expression || base.stemHe || "")
            .replace(/\s*שארית\s*:?\s*_*/gu, "")
            .trim();
    return applyOpenAnswerPreference(
      {
        ...base,
        questionType: "open",
        stemHe: "שארית: __",
        mathExpressionLtr: mathLtr,
        verticalLayoutLtr: undefined,
        writingSpaceLines: undefined,
      },
      true
    );
  }

  // אחוזים: stem עברי. MCQ רק כש־preferMcq מסומן; אחרת תשובה פתוחה.
  if (formatId === "percentages") {
    const openBase = {
      ...base,
      mathExpressionLtr: undefined,
      verticalLayoutLtr: undefined,
      writingSpaceLines: undefined,
    };
    if (preferMcq === true && base.optionsHe?.length) {
      return { ...openBase, questionType: "mcq" };
    }
    return applyOpenAnswerPreference({ ...openBase, questionType: "open" }, true);
  }

  // יחס / קנה מידה: stem עברי אחד (בלי mathExpression כפול). כרטיסי 2×2.
  if (formatId === "ratio_scale") {
    const openBase = {
      ...base,
      mathExpressionLtr: undefined,
      verticalLayoutLtr: undefined,
      writingSpaceLines: undefined,
    };
    if (preferMcq === true && base.optionsHe?.length) {
      return { ...openBase, questionType: "mcq" };
    }
    return applyOpenAnswerPreference({ ...openBase, questionType: "open" }, true);
  }

  if (displayMode === "word_problem" || formatId === "word_problems" || wordProblem) {
    questionType = "word_problem";
    return applyOpenAnswerPreference(
      {
        ...base,
        questionType,
        mathExpressionLtr: undefined,
        verticalLayoutLtr: undefined,
        wordProblemBodyHe: base.stemHe,
        writingSpaceLines: 4,
      },
      true
    );
  }

  if (displayMode === "fraction" || fractionLike) {
    const safeLtr =
      expression && expression.length > 2 && !/^=+$/.test(expression.trim())
        ? expression
        : base.stemHe;
    // שברים בלבד: בלי writingSpaceLines כדי להישאר בכרטיסי 2×2.
    return applyOpenAnswerPreference(
      {
        ...base,
        questionType: "fraction",
        mathExpressionLtr: safeLtr,
        verticalLayoutLtr: undefined,
        writingSpaceLines: undefined,
      },
      spec.preferOpen && preferMcq !== true
    );
  }

  if (displayMode === "vertical") {
    const verticalLayoutLtr = buildMathVerticalLayoutText(raw);
    const proseOnly = stripHorizontalExerciseFromStem(base.stemHe);

    // כפל ארוך / חילוק ארוך / עשרוניים מאונכים: בלי writingSpaceLines → כרטיסי 2×2.
    // בלי תרגיל אופקי נוסף לצד הסימון האנכי.
    const isLongMultiplicationVertical =
      formatId === "long_multiplication" && kind === "mul_vertical" && Boolean(verticalLayoutLtr);
    const isLongDivisionVertical =
      formatId === "long_division" &&
      (kind === "div_long" || kind === "div_two_digit") &&
      Boolean(verticalLayoutLtr);
    const isDecimalsVertical =
      formatId === "decimals" && Boolean(verticalLayoutLtr);
    const useMathCardPages =
      isLongMultiplicationVertical || isLongDivisionVertical || isDecimalsVertical;

    // אסור fallback שקט מחילוק ארוך לחילוק אופקי + writing.
    if (formatId === "long_division" && !verticalLayoutLtr) {
      return applyOpenAnswerPreference(
        {
          ...base,
          questionType: "open",
          stemHe: proseOnly || base.stemHe,
          mathExpressionLtr: undefined,
          verticalLayoutLtr: undefined,
          writingSpaceLines: undefined,
        },
        true
      );
    }

    questionType = verticalLayoutLtr ? "vertical_math" : "open";
    // עשרוניים מאונכים: בלי תוויות כמו "סכום ישר" / "חיסור מיושר" — רק העמודה.
    const stemForCard =
      isDecimalsVertical
        ? ""
        : proseOnly || (verticalLayoutLtr ? "" : base.stemHe);
    return applyOpenAnswerPreference(
      {
        ...base,
        questionType,
        stemHe: stemForCard,
        mathExpressionLtr: undefined,
        verticalLayoutLtr: verticalLayoutLtr || undefined,
        writingSpaceLines: useMathCardPages
          ? undefined
          : spec.writingSpaceLines || base.writingSpaceLines,
      },
      preferOpen
    );
  }

  if (displayMode === "mcq") {
    const blankOnlyExpression =
      !expression ||
      /^=+\s*_*$/.test(expression.trim()) ||
      /^_+$/.test(expression.trim()) ||
      expression.trim() === "= __";

    const safeLtr =
      !blankOnlyExpression &&
      ["decimals", "ratio", "scale", "equations", "order_of_operations"].includes(op) &&
      expression
        ? expression
        : undefined;

    // MCQ מהמחולל — רק אם ההורה ביקש אמריקאיות; אחרת פתוח.
    if (preferMcq === true && base.optionsHe?.length) {
      return {
        ...base,
        questionType: "mcq",
        mathExpressionLtr: safeLtr,
        verticalLayoutLtr: undefined,
      };
    }
    return applyOpenAnswerPreference(
      {
        ...base,
        questionType: "open",
        mathExpressionLtr: safeLtr,
        verticalLayoutLtr: undefined,
      },
      true
    );
  }

  const horizontalExpression =
    expression && !/^_{2,}$/.test(expression) && expression !== "= __"
      ? expression
      : base.stemHe;

  if (preferMcq === true && base.optionsHe?.length) {
    const heStem = /[\u0590-\u05FF]/.test(horizontalExpression);
    const safeLtr =
      expression && !/^_{2,}$/.test(expression) && !/[\u0590-\u05FF]/.test(expression)
        ? expression
        : undefined;
    return {
      ...base,
      questionType: "mcq",
      stemHe: horizontalExpression,
      mathExpressionLtr: safeLtr || (heStem ? undefined : horizontalExpression),
      verticalLayoutLtr: undefined,
    };
  }

  const heStem = /[\u0590-\u05FF]/.test(horizontalExpression);
  return applyOpenAnswerPreference(
    {
      ...base,
      questionType: "open",
      stemHe: horizontalExpression,
      mathExpressionLtr: heStem ? undefined : horizontalExpression,
      verticalLayoutLtr: undefined,
      // עשרוניים אופקיים: אין writing → נשארים בכרטיסי 2×2.
      writingSpaceLines: formatId === "decimals" ? undefined : base.writingSpaceLines,
    },
    preferOpen
  );
}

/**
 * Strip LTR isolation markers from vertical text for plain HTML pre rendering.
 * @param {string} text
 * @returns {string}
 */
export function stripMathLtrMarkers(text) {
  return String(text || "")
    .replace(/\u2066/g, "")
    .replace(/\u2069/g, "")
    .replace(/[\u200E\u200F]/g, "");
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} question
 * @returns {boolean}
 */
export function hasDualHorizontalAndVerticalDisplay(question) {
  const hasVertical = Boolean(question.verticalLayoutLtr);
  const stem = String(question.stemHe || "");
  const hasHorizontalMath = /[0-9+\-×÷=]/.test(stem);
  return hasVertical && hasHorizontalMath;
}
