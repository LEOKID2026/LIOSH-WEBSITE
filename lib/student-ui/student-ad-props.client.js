import { STUDENT_AD_FORBIDDEN_PROP_KEYS } from "./student-ad-config.js";

/** Whitelist of props accepted by student ad placement components. */
export const STUDENT_AD_ALLOWED_PROP_KEYS = Object.freeze([
  "variant",
  "theme",
  "slotClassName",
  "labelClassName",
  "wrapClassName",
  "className",
  "dataAdSlot",
]);

const FORBIDDEN_SET = new Set(STUDENT_AD_FORBIDDEN_PROP_KEYS);

/**
 * Strip forbidden / unknown props so ad slots never receive child or learning data.
 * @param {Record<string, unknown>} props
 * @returns {Record<string, unknown>}
 */
export function sanitizeStudentAdProps(props = {}) {
  const safe = {};
  for (const key of STUDENT_AD_ALLOWED_PROP_KEYS) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      safe[key] = props[key];
    }
  }
  return safe;
}

/**
 * @param {Record<string, unknown>} props
 * @returns {string[]} forbidden keys present in props
 */
export function findForbiddenStudentAdProps(props = {}) {
  return Object.keys(props).filter((key) => FORBIDDEN_SET.has(key));
}
