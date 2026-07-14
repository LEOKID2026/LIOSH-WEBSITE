/**
 * Stacked fraction HTML for printable worksheets (server / static HTML).
 * @module lib/worksheets/worksheet-fraction-html
 */

import {
  hasStackedFractionToken,
  parseMathFractionExpression,
} from "../../utils/math-fraction-expression-parse.js";

/**
 * @param {string} numerator
 * @param {string} denominator
 * @param {string} sign
 * @param {string|null} whole
 * @param {(s: string) => string} escapeHtml
 * @returns {string}
 */
function renderFractionStackHtml(numerator, denominator, sign, whole, escapeHtml) {
  const signHtml = sign ? `<span class="worksheet-fraction-sign">${escapeHtml(sign)}</span>` : "";
  const wholeHtml =
    whole != null && String(whole) !== ""
      ? `<span class="worksheet-fraction-whole">${escapeHtml(String(whole))}</span>`
      : "";
  return `${signHtml}${wholeHtml}<span class="worksheet-fraction-stack" dir="ltr"><span class="worksheet-fraction-num">${escapeHtml(numerator)}</span><span class="worksheet-fraction-bar" aria-hidden="true"></span><span class="worksheet-fraction-den">${escapeHtml(denominator)}</span></span>`;
}

/**
 * @param {string|null|undefined} text
 * @param {(s: string) => string} escapeHtml
 * @returns {string}
 */
export function renderMathFractionExpressionHtml(text, escapeHtml) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  if (!hasStackedFractionToken(raw)) {
    return `<span class="worksheet-math-ltr" dir="ltr">${escapeHtml(raw)}</span>`;
  }

  const tokens = parseMathFractionExpression(raw);
  const parts = tokens
    .map((tok) => {
      if (tok.type === "fraction") {
        return renderFractionStackHtml(
          tok.numerator,
          tok.denominator,
          tok.sign,
          tok.whole,
          escapeHtml
        );
      }
      if (tok.type === "space") return "\u00a0";
      return escapeHtml(tok.value);
    })
    .join("");

  return `<span class="worksheet-math-fraction-expression worksheet-math-ltr" dir="ltr">${parts}</span>`;
}
