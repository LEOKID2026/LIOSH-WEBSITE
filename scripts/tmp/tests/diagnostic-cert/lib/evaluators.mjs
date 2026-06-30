/**
 * Flexible expectation evaluators — DE2 today, V3 when fields exist.
 * `skip` = field not ready yet (not a failure).
 */

/** @typedef {"pass"|"fail"|"skip"} CheckStatus */

/**
 * @param {string} id
 * @param {string} labelHe
 * @param {boolean} ok
 * @param {string} [reasonHe]
 * @param {"de2"|"v3"|"agg"|"both"|"classify"} [engine]
 * @returns {{ id: string, labelHe: string, status: CheckStatus, reasonHe: string, engine: string }}
 */
export function result(id, labelHe, ok, reasonHe = "", engine = "both") {
  return {
    id,
    labelHe,
    status: ok ? "pass" : "fail",
    reasonHe: reasonHe || (ok ? "עבר" : "נכשל"),
    engine,
  };
}

/**
 * @param {string} id
 * @param {string} labelHe
 * @param {string} [reasonHe]
 * @returns {{ id: string, labelHe: string, status: "skip", reasonHe: string, engine: string }}
 */
export function skip(id, labelHe, reasonHe = "שדה V3 עדיין לא זמין — נדחה") {
  return { id, labelHe, status: "skip", reasonHe, engine: "v3" };
}

/**
 * @param {unknown} value
 * @param {unknown[]} allowed
 */
export function oneOf(value, allowed) {
  return allowed.includes(value);
}

/**
 * @param {unknown} value
 * @param {unknown[]} forbidden
 */
export function noneOf(value, forbidden) {
  return !forbidden.includes(value);
}

/**
 * Run check only when V3 rollup field exists.
 * @param {object|null} rollup
 * @param {string} field
 * @param {string} id
 * @param {string} labelHe
 * @param {(value: unknown, rollup: object) => boolean} predicate
 * @param {string} failReasonHe
 */
export function whenV3Field(rollup, field, id, labelHe, predicate, failReasonHe) {
  if (!rollup || rollup[field] == null) {
    return skip(id, labelHe);
  }
  const value = rollup[field];
  const ok = predicate(value, rollup);
  const reason = ok
    ? `ערך: ${value}`
    : typeof failReasonHe === "function"
      ? failReasonHe(value, rollup)
      : failReasonHe || `ערך=${value}`;
  return result(id, labelHe, ok, reason, "v3");
}

/**
 * @param {object|null} unit
 * @param {string} id
 * @param {string} labelHe
 * @param {(unit: object) => boolean} predicate
 * @param {string} failReasonHe
 */
export function whenDe2Unit(unit, id, labelHe, predicate, failReasonHe) {
  if (!unit) {
    return result(id, labelHe, false, "יחידת DE2 חסרה", "de2");
  }
  const ok = predicate(unit);
  return result(id, labelHe, ok, ok ? "DE2 תואם" : failReasonHe, "de2");
}

/**
 * @param {CheckStatus[]} statuses
 */
export function summarizeChecks(checks) {
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const skipped = checks.filter((c) => c.status === "skip").length;
  let status = "pass";
  if (fail > 0) status = "fail";
  else if (skipped > 0 && pass > 0) status = "partial";
  return { pass, fail, skipped, status };
}
