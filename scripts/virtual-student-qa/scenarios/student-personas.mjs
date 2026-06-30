/**
 * Phase D2 — Student persona table for AAA1..AAA12.
 *
 * Owner-tunable constants. Read by:
 *   - daily-plan-generator.mjs (consistency, weaknesses, evolution, dailyMinutesRange)
 *   - longitudinal-state.mjs   (defaults when initializing a fresh state.json)
 *   - phase-d2-suite.mjs       (D2.3+: builds scenario shape from planner output)
 *
 * Hard rules:
 *   - These personas describe SIMULATED student behaviour. They never change
 *     product UI, Hebrew copy, diagnostic logic, parent-report logic, or any
 *     Supabase row. They only steer the QA runner's intent (how often this
 *     fake student studies, which subject they pick, which answer profile
 *     they use).
 *   - Subject keys must match the existing Phase C subject catalog so the
 *     D2.3 suite shim can reuse the existing subject drivers verbatim:
 *       math | geometry | hebrew | english | science | moledet-geography
 *   - Profile keys must match answer-profiles.mjs:
 *       strong | average | weak | targeted
 */
import { SCIENCE_GRADES } from "../../../data/science-curriculum.js";
import { HISTORY_GRADES } from "../../../data/history-curriculum.js";
import { GRADES as GEOMETRY_GRADES } from "../../../utils/geometry-constants.js";

/** Ordered list of subject keys the simulator may schedule. */
export const SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet-geography",
];

/**
 * The 12-student persona table. Order is the canonical AAA1..AAA12 order.
 *
 * Per-field semantics:
 *   - grade (1..6): forwarded to the subject driver via the scenario shape;
 *     also constrains which subjects can roll content (e.g. moledet-geography
 *     starts at grade 3 in the product, so younger personas should not
 *     receive that subject). This is enforced in daily-plan-generator.mjs.
 *   - kind: short human label, surfaced in artifacts only.
 *   - consistency (0..1): probability the persona "shows up" on any given
 *     day. The planner draws Bernoulli(consistency) to decide attendance.
 *   - defaultProfile: strong | average | weak. Initial profile baked into
 *     state.json on the first run; thereafter, the planner reads the
 *     evolved profile out of state.students[label].defaultProfile.
 *   - weaknesses: { [subject]: 'targeted' } — subjects forced to the
 *     'targeted' profile whenever scheduled, regardless of defaultProfile.
 *   - strengths: subjects boosted in subject rotation weighting (informative
 *     today; deeper weighting lands in D2.3+ subject rotation tuning).
 *   - evolution: flat | improving | declining | inconsistent.
 *   - dailyMinutesRange [min,max]: planner samples uniformly in this range
 *     and divides across the day's sessions. Min may be 0 (e.g. AAA8) so
 *     some study days come out as effectively no-op; that is intentional.
 *   - maxSessions: cap on per-day session count (1..n). AAA11 alone can
 *     reach 3.
 *   - dailyMinutesAbsoluteCap: hard upper bound (default 120 per the
 *     project rule "no student should be simulated as learning all night").
 */
export const PERSONAS = {
  AAA1: {
    grade: 1,
    kind: "strong-consistent",
    consistency: 0.9,
    defaultProfile: "strong",
    weaknesses: {},
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [20, 40],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 60,
  },
  AAA2: {
    grade: 1,
    kind: "weak-hebrew",
    consistency: 0.55,
    defaultProfile: "average",
    weaknesses: { hebrew: "targeted" },
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [10, 25],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 60,
  },
  AAA3: {
    grade: 2,
    kind: "average-stable",
    consistency: 0.85,
    defaultProfile: "average",
    weaknesses: {},
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [25, 45],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 75,
  },
  AAA4: {
    grade: 2,
    kind: "weak-math",
    consistency: 0.7,
    defaultProfile: "average",
    weaknesses: { math: "targeted" },
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [20, 40],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 75,
  },
  AAA5: {
    grade: 3,
    kind: "geometry-targeted",
    consistency: 0.9,
    defaultProfile: "average",
    weaknesses: { geometry: "targeted" },
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [30, 50],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 90,
  },
  AAA6: {
    grade: 3,
    kind: "improving",
    consistency: 0.75,
    defaultProfile: "weak",
    weaknesses: {},
    strengths: [],
    evolution: "improving",
    dailyMinutesRange: [25, 45],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 90,
  },
  AAA7: {
    grade: 4,
    kind: "weak-english",
    consistency: 0.85,
    defaultProfile: "average",
    weaknesses: { english: "targeted" },
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [30, 55],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 90,
  },
  AAA8: {
    grade: 4,
    kind: "inconsistent",
    consistency: 0.3,
    defaultProfile: "average",
    weaknesses: {},
    strengths: [],
    evolution: "inconsistent",
    dailyMinutesRange: [0, 35],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 60,
  },
  AAA9: {
    grade: 5,
    kind: "strong-math-weak-hebrew",
    consistency: 0.85,
    defaultProfile: "strong",
    weaknesses: { hebrew: "targeted" },
    strengths: ["math"],
    evolution: "flat",
    dailyMinutesRange: [35, 60],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 90,
  },
  AAA10: {
    grade: 5,
    kind: "weak-science",
    consistency: 0.7,
    defaultProfile: "average",
    weaknesses: { science: "targeted" },
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [25, 50],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 90,
  },
  AAA11: {
    grade: 6,
    kind: "strong-persistent",
    consistency: 0.95,
    defaultProfile: "strong",
    weaknesses: {},
    strengths: [],
    evolution: "flat",
    dailyMinutesRange: [60, 90],
    maxSessions: 3,
    dailyMinutesAbsoluteCap: 120,
  },
  AAA12: {
    grade: 6,
    kind: "declining",
    consistency: 0.45,
    defaultProfile: "average",
    weaknesses: {},
    strengths: [],
    evolution: "declining",
    dailyMinutesRange: [10, 30],
    maxSessions: 2,
    dailyMinutesAbsoluteCap: 75,
  },
};

/**
 * Default per-subject topic for a given grade. The product grade-locks math
 * operations and product content per subject; "addition" in math is the
 * one operation supported across all six grades, which is why every
 * existing Phase D math scenario uses it. For non-math subjects we choose
 * a stable canonical topic that the existing subject driver tolerates.
 *
 * The subject driver remains the source of truth for what's actually
 * answerable; this function just supplies a reasonable label for the
 * planner's per-session intent (and for human-readable artifacts).
 */
export function defaultTopicForSubject(subject, grade) {
  switch (subject) {
    case "math":
      return "addition";
    case "geometry": {
      const g = Math.min(6, Math.max(1, Number(grade) || 1));
      const topics = GEOMETRY_GRADES[`g${g}`]?.topics || [];
      if (topics.includes("shapes_basic")) return "shapes_basic";
      return topics[0] || "area";
    }
    case "hebrew":
      return "reading";
    case "english":
      return "vocabulary";
    case "science": {
      const g = Math.min(6, Math.max(1, Number(grade) || 1));
      const topics = SCIENCE_GRADES[`g${g}`]?.topics || [];
      if (g === 1) {
        return topics.includes("body") ? "body" : topics[0] || "body";
      }
      return topics.includes("experiments") ? "experiments" : topics[0] || "body";
    }
    case "moledet-geography":
      return "geography";
    case "history": {
      const g = Math.min(6, Math.max(1, Number(grade) || 6));
      const topics = HISTORY_GRADES[`g${g}`]?.topics || [];
      return topics.includes("what_is_history") ? "what_is_history" : topics[0] || "what_is_history";
    }
    default:
      return "general";
  }
}

/**
 * Some subjects are not available in every grade per the live product
 * curriculum (most notably moledet-geography, which only lights up from
 * grade 3 onward). The planner consults this helper before scheduling a
 * subject so we never schedule activity the product would refuse.
 *
 * Returns true if the subject is available at the given grade.
 */
export function isSubjectAvailableForGrade(subject, grade) {
  const g = Number(grade) || 0;
  if (subject === "moledet-geography") return g >= 3;
  return g >= 1 && g <= 6;
}

/**
 * Read-only persona accessor used by the planner (and later the
 * orchestrator). Returns null if no persona is registered for the label.
 */
export function getPersona(label) {
  return PERSONAS[label] || null;
}

/** Stable iteration order for the 12-student loop. */
export const PERSONA_LABELS = Object.keys(PERSONAS);
