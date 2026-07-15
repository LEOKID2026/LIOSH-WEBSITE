/**
 * Math Final Closure Gate — student-facing topic policy (single source for QA scripts).
 * Mirrors product rules in utils/math-constants.js GRADES[].operations.
 */

import { GRADES } from "./math-constants.js";

/** @type {Record<string, Set<string>>} gradeKey -> operations that must NOT appear in UI/runtime for that grade */
export const MUST_NOT_EXPOSE_OPS = {
  g1: new Set(["decimals", "divisibility", "equations", "percentages", "ratio", "scale", "prime_composite", "powers"]),
  g2: new Set(["decimals", "divisibility", "equations", "percentages", "ratio", "scale", "prime_composite", "powers"]),
  g3: new Set(["equations", "percentages", "ratio", "scale", "prime_composite", "powers"]),
};

/**
 * @param {string} gradeKey g1..g6
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function assertGradeOperationsMatchPolicy(gradeKey) {
  const violations = [];
  const ops = GRADES[gradeKey]?.operations || [];
  const banned = MUST_NOT_EXPOSE_OPS[gradeKey];
  if (banned) {
    for (const op of ops) {
      if (banned.has(op)) {
        violations.push(`${gradeKey}: forbidden operation exposed - "${op}"`);
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function assertAllGradesTopicPolicy() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    const r = assertGradeOperationsMatchPolicy(gk);
    violations.push(...r.violations);
  }
  return { ok: violations.length === 0, violations };
}
