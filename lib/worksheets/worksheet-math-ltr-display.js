/**
 * Client-safe math LTR detection for printable worksheet display.
 * @module lib/worksheets/worksheet-math-ltr-display
 */

import { splitLearningMixedHebrewMathRuns } from "../../utils/learning-mixed-hebrew-math-render.js";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse.js";
import { renderMathFractionExpressionHtml } from "./worksheet-fraction-html.js";

const HEBREW_RE = /[\u0590-\u05FF]/;
const MATH_OPERATOR_RE = /[+−\-×÷=<>]/;
const BLANK_RE = /_{2,}|__+/;
const EXERCISE_MATH_RE = /[+−\-×÷=]|_{2,}|__/;

/**
 * @typedef {"empty" | "math-only" | "prose-only" | "mixed-inline" | "split"} WorksheetStemDisplayMode
 * @typedef {{ proseHe: string|null, mathLtr: string|null, mode: WorksheetStemDisplayMode }} WorksheetStemSplit
 */

/**
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
export function isWorksheetMathLtrExpression(text) {
  const value = String(text || "").trim();
  if (!value || value.length < 2) return false;
  if (HEBREW_RE.test(value)) return false;
  if (!/\d/.test(value)) return false;
  return (
    MATH_OPERATOR_RE.test(value) ||
    BLANK_RE.test(value) ||
    /\//.test(value) ||
    /^\d+\s*:\s*(?:\d+|_{2,})$/.test(value)
  );
}

/**
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
export function isWorksheetNumericOption(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (HEBREW_RE.test(value)) return false;
  return /^[\d.,%+\-−×÷/:\s]+$/.test(value);
}

/**
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
export function worksheetStemHasHebrew(text) {
  return HEBREW_RE.test(String(text || ""));
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isExerciseMathRun(value) {
  const v = String(value || "").trim();
  return EXERCISE_MATH_RE.test(v) || /\d\s*[+\-−×÷]\s*\d/.test(v);
}

/**
 * @param {import("../../utils/learning-mixed-hebrew-math-render.js").LearningMixedRun[]} runs
 * @returns {boolean}
 */
function isComparisonStemRuns(runs) {
  const mathRuns = runs.filter((r) => r.type === "math");
  if (mathRuns.length < 2) return false;
  const joined = runs.map((r) => r.value).join("");
  if (!/או|גדול|קטן|השבר הגדול|השבר הקטן/.test(joined)) return false;
  return !mathRuns.some((r) => isExerciseMathRun(r.value));
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isComparisonStemText(value) {
  return /איזה שבר|השוו\s+\d+\/\d+|גדול יותר|קטן יותר/.test(String(value || ""));
}

/**
 * Split Hebrew worksheet stem into RTL prose line + LTR math line when possible.
 * @param {string|null|undefined} text
 * @returns {WorksheetStemSplit}
 */
export function splitWorksheetStemProseAndMath(text) {
  const value = String(text || "").trim();
  if (!value) return { proseHe: null, mathLtr: null, mode: "empty" };

  if (!worksheetStemHasHebrew(value)) {
    return { proseHe: null, mathLtr: value, mode: "math-only" };
  }

  const runs = splitLearningMixedHebrewMathRuns(value);
  if (isComparisonStemText(value) || isComparisonStemRuns(runs)) {
    return { proseHe: value, mathLtr: null, mode: "mixed-inline" };
  }

  const colonMath = value.match(/^(.+?:)\s*(\d+\/\d+.+)$/u);
  if (colonMath) {
    const proseHe = colonMath[1].trim();
    let mathLtr = colonMath[2].trim();
    if (mathLtr.endsWith(":")) mathLtr = mathLtr.slice(0, -1).trim();
    if (proseHe && mathLtr) {
      return { proseHe, mathLtr, mode: "split" };
    }
  }

  const trailingFrac = value.match(/^([\u0590-\u05FF\s().,-\-–?]+?)\s+(\d+\/\d+)\s*:$/u);
  if (trailingFrac) {
    const proseHe = trailingFrac[1].trim().endsWith(":")
      ? trailingFrac[1].trim()
      : `${trailingFrac[1].trim()}:`;
    const mathLtr = trailingFrac[2].trim();
    return { proseHe, mathLtr, mode: "split" };
  }

  const mixedToFrac = value.match(/^(.+?)(\d+\s+\d+\/\d+)\s*לשבר:\s*$/u);
  if (mixedToFrac) {
    return {
      proseHe: `${mixedToFrac[1].trim()}:`,
      mathLtr: mixedToFrac[2].trim(),
      mode: "split",
    };
  }

  // כפל/חילוק/המרה — לפני דפוס embedded הכללי, כדי לא לגרור עברית לתוך mathLtr.
  const mulHe = value.match(/^מה תוצאת\s+(\d+\/\d+)\s+כפול\s+(\d+\/\d+)\s*\??$/u);
  if (mulHe) {
    return { proseHe: "מה התוצאה?", mathLtr: `${mulHe[1]} × ${mulHe[2]} =`, mode: "split" };
  }
  const divHe = value.match(/^(\d+\/\d+)\s+לחלק ב-(\d+\/\d+)\s+שווה אל\s*_*$/u);
  if (divHe) {
    return { proseHe: "חשבו:", mathLtr: `${divHe[1]} ÷ ${divHe[2]} =`, mode: "split" };
  }
  const convertMixed = value.match(/^המר את השבר\s+(\d+\/\d+)\s+למספר מעורב:\s*$/u);
  if (convertMixed) {
    return { proseHe: "המרו למספר מעורב:", mathLtr: convertMixed[1], mode: "split" };
  }

  const embeddedFracEnd = value.match(/^(.+?)(?:\s*ל-)?(\d+\/\d+.*?)\s*:$/u);
  if (embeddedFracEnd) {
    const proseHe = embeddedFracEnd[1].trim().endsWith(":")
      ? embeddedFracEnd[1].trim()
      : `${embeddedFracEnd[1].trim()}:`;
    let mathLtr = embeddedFracEnd[2].trim();
    if (mathLtr.endsWith(":")) mathLtr = mathLtr.slice(0, -1).trim();
    // לא לערבב עברית בתוך שורת המתמטיקה.
    if (proseHe && mathLtr && !HEBREW_RE.test(mathLtr)) {
      return { proseHe, mathLtr, mode: "split" };
    }
  }

  if (!runs.some((r) => r.type === "math")) {
    return { proseHe: value, mathLtr: null, mode: "prose-only" };
  }

  return { proseHe: value, mathLtr: null, mode: "mixed-inline" };
}

/**
 * Mixed Hebrew + a/b text → HTML with stacked fraction islands (print preview HTML).
 * @param {string|null|undefined} text
 * @param {(s: string) => string} escapeHtml
 * @returns {string}
 */
export function renderMathFractionAwareHtml(text, escapeHtml) {
  const raw = String(text || "");
  if (!raw) return "";
  if (!hasStackedFractionToken(raw)) return escapeHtml(raw);
  if (!HEBREW_RE.test(raw)) {
    return renderMathFractionExpressionHtml(raw, escapeHtml);
  }
  const runs = splitLearningMixedHebrewMathRuns(raw);
  if (!runs.length) {
    return renderMathFractionExpressionHtml(raw, escapeHtml);
  }
  return runs
    .map((run) => {
      if (run.value === "\n") return "<br />";
      if (run.type === "math") {
        if (hasStackedFractionToken(run.value)) {
          return renderMathFractionExpressionHtml(run.value, escapeHtml);
        }
        return `<span class="worksheet-math-ltr" dir="ltr">${escapeHtml(run.value)}</span>`;
      }
      if (hasStackedFractionToken(run.value)) {
        return `<span dir="rtl">${renderMathFractionExpressionHtml(run.value, escapeHtml)}</span>`;
      }
      return `<span dir="rtl">${escapeHtml(run.value)}</span>`;
    })
    .join("");
}

/**
 * Insert answer into a math expression stem.
 * @param {string} mathLtr
 * @param {string} answer
 * @returns {string}
 */
function fillAnswerInMathExpression(mathLtr, answer) {
  const expr = String(mathLtr || "").trim();
  const ans = String(answer || "").trim();
  if (!expr) return ans;
  if (!ans) return expr;
  if (BLANK_RE.test(expr)) return expr.replace(/_{2,}|__+/g, ans);
  if (/=\s*$/.test(expr)) return `${expr}${ans}`;
  if (expr.includes(ans)) return expr;
  return `${expr} = ${ans}`;
}

/**
 * Build answer-key display using the same prose/math structure as the question.
 * @param {string|null|undefined} stemHe
 * @param {string|null|undefined} correctAnswerHe
 * @param {string} [mathExpressionLtr]
 * @returns {WorksheetStemSplit}
 */
export function formatAnswerKeyStemDisplay(stemHe, correctAnswerHe, mathExpressionLtr = "") {
  const answer = String(correctAnswerHe || "").trim();
  const source = String(stemHe || mathExpressionLtr || "").trim();
  if (!source) {
    return { proseHe: answer || null, mathLtr: null, mode: answer ? "prose-only" : "empty" };
  }

  const split = splitWorksheetStemProseAndMath(source);
  if (split.mode === "split") {
    return {
      proseHe: split.proseHe,
      mathLtr: fillAnswerInMathExpression(split.mathLtr || "", answer),
      mode: "split",
    };
  }
  if (split.mode === "math-only") {
    return {
      proseHe: null,
      mathLtr: fillAnswerInMathExpression(split.mathLtr || "", answer),
      mode: "math-only",
    };
  }
  if (split.mode === "mixed-inline") {
    return { proseHe: split.proseHe, mathLtr: answer, mode: "split" };
  }
  return { proseHe: answer || split.proseHe, mathLtr: null, mode: "prose-only" };
}

/**
 * Wrap math expression HTML for static preview/test HTML.
 * @param {string} text
 * @param {(s: string) => string} escapeHtml
 * @returns {string}
 */
export function renderWorksheetMathLtrHtml(text, escapeHtml) {
  const value = String(text || "").trim();
  if (!value) return "";
  return `<span class="worksheet-math-ltr" dir="ltr">${escapeHtml(value)}</span>`;
}

/**
 * @param {string|null|undefined} text
 * @param {(s: string) => string} escapeHtml
 * @returns {string}
 */
export function renderWorksheetStemSplitHtml(text, escapeHtml, opts = {}) {
  const split = splitWorksheetStemProseAndMath(text);
  return renderWorksheetStemSplitFromParts(split, escapeHtml, opts);
}

/**
 * @param {WorksheetStemSplit} split
 * @param {(s: string) => string} escapeHtml
 * @param {{ useFractionExpression?: boolean }} [opts]
 * @returns {string}
 */
export function renderWorksheetStemSplitFromParts(split, escapeHtml, opts = {}) {
  const useFraction = opts.useFractionExpression === true;
  const mathExpr = (expr) => {
    const inner = useFraction
      ? renderMathFractionExpressionHtml(expr, escapeHtml)
      : renderWorksheetMathLtrHtml(expr, escapeHtml);
    return `<div class="worksheet-math-expression" dir="ltr">${inner}</div>`;
  };
  const proseSlot = (content, empty = false) =>
    `<div class="worksheet-stem-prose-slot${empty ? " worksheet-stem-prose-slot-empty" : ""}">${content}</div>`;
  const mathSlot = (content, empty = false) =>
    `<div class="worksheet-math-balanced-slot${empty ? " worksheet-math-balanced-slot-empty" : ""}">${content}</div>`;

  if (split.mode === "split") {
    return `<div class="worksheet-prose-math-lines">${proseSlot(`<p class="worksheet-stem worksheet-stem-prose" dir="rtl">${escapeHtml(split.proseHe || "")}</p>`)}${mathSlot(mathExpr(split.mathLtr || ""))}</div>`;
  }
  if (split.mode === "math-only" && split.mathLtr) {
    return `<div class="worksheet-prose-math-lines">${proseSlot("", true)}${mathSlot(mathExpr(split.mathLtr))}</div>`;
  }
  if (split.mode === "mixed-inline" || split.mode === "prose-only") {
    const proseText = split.proseHe || "";
    let proseBody;
    if (useFraction && hasStackedFractionToken(proseText)) {
      proseBody = renderMathFractionAwareHtml(proseText, escapeHtml);
    } else {
      proseBody = escapeHtml(proseText);
    }
    return `<div class="worksheet-prose-math-lines">${proseSlot(`<p class="worksheet-stem worksheet-stem-prose" dir="rtl">${proseBody}</p>`)}${mathSlot("", true)}</div>`;
  }
  return "";
}

/**
 * @param {WorksheetStemSplit} split
 * @param {(s: string) => string} escapeHtml
 * @returns {string}
 */
export function renderAnswerKeyStemSplitHtml(split, escapeHtml) {
  return renderWorksheetStemSplitFromParts(split, escapeHtml, { useFractionExpression: true });
}
