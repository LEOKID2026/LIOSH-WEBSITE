/**
 * Shared Hebrew helpers for FractionDisplay (no CSS — safe for Node selftests).
 */

/**
 * @param {number} numerator
 * @param {number} denominator
 */
export function fractionAriaLabel(numerator, denominator) {
  if (numerator === 0) return "אפס";
  if (numerator === denominator) return "שלם";
  return `${numerator} חלקי ${denominator}`;
}

/** Hebrew labels for compare relations — never show enum strings. */
export const COMPARE_LABEL_HE = Object.freeze({
  greater: "השבר הראשון גדול יותר",
  less: "השבר השני גדול יותר",
  equal: "השברים שווים",
});
