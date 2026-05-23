/**
 * Persona ground-truth helpers (E5 MVP).
 *
 * Maps scripts/virtual-student-qa/scenarios/student-personas.mjs data to
 * subject-level expectations for diagnostic ground-truth comparison.
 * Conservative — documents assumptions in output.
 */

import { getPersona } from "../../virtual-student-qa/scenarios/student-personas.mjs";

/** Documented MVP mapping assumptions (surfaced in audit output). */
export const PERSONA_MAPPING_ASSUMPTIONS = [
  "expectedWeakSubjects = Object.keys(persona.weaknesses) from student-personas.mjs",
  "expectedStrongSubjects = persona.strengths[] plus subjects where defaultProfile=strong and no weakness entry",
  "geometry-targeted / weak-* kinds map weakness via weaknesses{} only, not kind string parsing alone",
  "improving/declining/inconsistent trend personas: trend validation requires multi-run artifacts (MVP marks unknown)",
  "strong-consistent / strong-persistent: expectedWeakSubjects=[] — weakness diagnosis is a false-positive risk",
];

const STRONG_PERSONA_KINDS = new Set([
  "strong-consistent",
  "strong-persistent",
]);

/**
 * Derive subject-level expectations for a QA student label.
 *
 * @param {string} label  e.g. "AAA7"
 * @returns {object|null}
 */
export function derivePersonaExpectations(label) {
  const persona = getPersona(label);
  if (!persona) return null;

  const expectedWeakSubjects = Object.keys(persona.weaknesses || {});
  const expectedStrongSubjects = [...(persona.strengths || [])];

  // Strong default profile with no weaknesses — math/geometry etc. should not
  // appear as diagnosed weak unless persona explicitly lists them.
  if (
    persona.defaultProfile === "strong" &&
    expectedWeakSubjects.length === 0 &&
    STRONG_PERSONA_KINDS.has(persona.kind)
  ) {
    // strengths already empty; keep expectedWeakSubjects empty
  }

  // strong-math-weak-hebrew: weaknesses={hebrew}, strengths=[math] — table-driven
  if (persona.kind === "strong-math-weak-hebrew") {
    // Already encoded in persona.weaknesses / strengths — no override needed
  }

  return {
    personaProfile: persona.defaultProfile,
    personaKind: persona.kind,
    expectedWeakSubjects,
    expectedStrongSubjects,
    expectedTrend: persona.evolution || "flat",
    isStrongPersona:
      STRONG_PERSONA_KINDS.has(persona.kind) ||
      (persona.defaultProfile === "strong" && expectedWeakSubjects.length === 0),
    thinDataPersona: persona.evolution === "inconsistent" || persona.consistency < 0.4,
    assumptions: PERSONA_MAPPING_ASSUMPTIONS,
  };
}

/**
 * Compare actual vs expected diagnostic subjects.
 *
 * @returns {"match"|"partial"|"miss"|"false_positive"|"unknown"|"thin_data"}
 */
export function computeMatchStatus({
  expectedWeakSubjects,
  expectedStrongSubjects,
  actualDiagnosticSubjects,
  actualRecommendationSubjects,
  evidenceAvailable,
  answeredQuestions,
  isStrongPersona,
  thinDataPersona,
  expectedTrend,
}) {
  const hasDiagnosticEvidence =
    evidenceAvailable?.diagnosticUnits ||
    evidenceAvailable?.parentReportSnapshot ||
    (actualDiagnosticSubjects?.length > 0);

  const hasRecommendationEvidence =
    evidenceAvailable?.recommendations ||
    (actualRecommendationSubjects?.length > 0);

  if (!hasDiagnosticEvidence && !hasRecommendationEvidence) {
    if (thinDataPersona || (answeredQuestions != null && answeredQuestions < 8)) {
      return "thin_data";
    }
    if (expectedTrend === "improving" || expectedTrend === "declining") {
      return "unknown";
    }
    return "unknown";
  }

  const actual = [
    ...(actualDiagnosticSubjects || []),
    ...(actualRecommendationSubjects || []),
  ];
  const actualUnique = [...new Set(actual)];

  if (actualUnique.length === 0) return "unknown";

  // False positive: strong student diagnosed weak
  if (isStrongPersona && expectedWeakSubjects.length === 0) {
    if (actualUnique.some((s) => !expectedStrongSubjects.includes(s))) {
      return "false_positive";
    }
  }

  // False positive: strength subject diagnosed as weak
  for (const strong of expectedStrongSubjects || []) {
    if (actualUnique.includes(strong) && !(expectedWeakSubjects || []).includes(strong)) {
      return "false_positive";
    }
  }

  const expected = expectedWeakSubjects || [];
  if (expected.length === 0) {
    return actualUnique.length > 0 ? "false_positive" : "match";
  }

  const hits = expected.filter((s) => actualUnique.includes(s));
  const misses = expected.filter((s) => !actualUnique.includes(s));
  const extras = actualUnique.filter((s) => !expected.includes(s));

  if (hits.length === expected.length && extras.length === 0) return "match";
  if (hits.length > 0 && (misses.length > 0 || extras.length > 0)) return "partial";
  if (hits.length === 0 && extras.length > 0) return "miss";
  if (misses.length === expected.length) return "miss";

  return "partial";
}
