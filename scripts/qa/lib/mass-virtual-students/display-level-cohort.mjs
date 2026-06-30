/**
 * Mass-sim displayLevel (regular | advanced) — wraps product SSOT in lib/learning/display-level.js.
 * Science: regular only. All other launch subjects: regular + advanced.
 * sourceDifficulty (easy/medium/hard) is internal seed metadata only — not product UI levels.
 */
import { resolveActivityGenerationPlan } from "../../../../lib/learning/activity-question-selection.js";
import {
  DISPLAY_LEVELS,
  displayLevelToActivityDbEnum,
  isDisplayLevelAllowedForSubject,
  isScienceSubjectId,
  normalizeDisplayLevel,
  normalizeSubjectIdForDisplayLevel,
  resolveSessionLevels,
} from "../../../../lib/learning/display-level.js";
import { MOLEDET_GEOGRAPHY_SUBJECT } from "./subject-registry.mjs";

export { DISPLAY_LEVELS };

/** @param {string} logicalSubject cohort / CLI subject key */
export function normalizeMassSimSubjectForLevel(subject) {
  const raw = String(subject || "").trim();
  if (raw === MOLEDET_GEOGRAPHY_SUBJECT) return "moledet_geography";
  return normalizeSubjectIdForDisplayLevel(raw) || raw;
}

/** Product display levels allowed for seeding this subject. */
export function displayLevelsForSubject(logicalSubject) {
  if (isScienceSubjectId(normalizeMassSimSubjectForLevel(logicalSubject))) {
    return ["regular"];
  }
  return ["regular", "advanced"];
}

/**
 * Assign primary practice displayLevel — alternates regular/advanced per subject primary count.
 * Science primary always regular.
 */
export function assignPrimaryDisplayLevel(logicalSubject, subjectPrimaryIndex) {
  if (isScienceSubjectId(normalizeMassSimSubjectForLevel(logicalSubject))) {
    return "regular";
  }
  return subjectPrimaryIndex % 2 === 0 ? "regular" : "advanced";
}

/**
 * Resolve displayLevel for a practice session on `logicalSubject`.
 * Science never advanced; other subjects use the student's assigned level.
 */
export function resolvePracticeDisplayLevel(logicalSubject, studentDisplayLevel) {
  const subject = normalizeMassSimSubjectForLevel(logicalSubject);
  if (isScienceSubjectId(subject)) return "regular";
  const dl = normalizeDisplayLevel(studentDisplayLevel) || "regular";
  return isDisplayLevelAllowedForSubject(dl, subject) ? dl : "regular";
}

/**
 * Activity DB enum + internal source difficulty for one answer (not parent-facing product level).
 */
export function resolveMassSimAnswerLevelFields(logicalSubject, displayLevel, answerIndex = 0) {
  const subject = normalizeMassSimSubjectForLevel(logicalSubject);
  const dl = resolvePracticeDisplayLevel(logicalSubject, displayLevel);
  const activityDbEnum = displayLevelToActivityDbEnum(dl) || "mixed";
  const plan = resolveActivityGenerationPlan(activityDbEnum, subject);
  const resolved = resolveSessionLevels({
    subjectId: subject,
    displayLevel: plan.displayLevel,
    level: activityDbEnum,
  });

  let sourceDifficulty = "medium";
  if (resolved.displayLevel === "advanced") {
    sourceDifficulty = "hard";
  } else if (isScienceSubjectId(subject)) {
    const pool = ["easy", "medium", "hard"];
    sourceDifficulty = pool[answerIndex % pool.length];
  } else {
    sourceDifficulty = answerIndex % 2 === 0 ? "easy" : "medium";
  }

  return {
    displayLevel: resolved.displayLevel,
    activityDbEnum,
    sourceDifficulty,
    regularInternalState: resolved.regularInternalState,
    scienceInternalState: resolved.scienceInternalState,
    rejectAdvanced: plan.rejectAdvanced === true,
  };
}

/** Preflight: advanced must be blocked for science. */
export function assertScienceNeverAdvanced(logicalSubject) {
  const subject = normalizeMassSimSubjectForLevel(logicalSubject);
  if (!isScienceSubjectId(subject)) return { ok: true };
  const advancedAllowed = isDisplayLevelAllowedForSubject("advanced", subject);
  const hardPlan = resolveActivityGenerationPlan("hard", subject);
  if (advancedAllowed || hardPlan.displayLevel === "advanced") {
    return { ok: false, detail: "science must not expose advanced displayLevel" };
  }
  return { ok: true, detail: "science regular-only (hard maps to regular+hard pool)" };
}

/** Preflight: non-science must allow both regular and advanced. */
export function assertNonScienceHasBothLevels(logicalSubject) {
  const subject = normalizeMassSimSubjectForLevel(logicalSubject);
  if (isScienceSubjectId(subject)) return { ok: true, skip: true };
  const regularOk = isDisplayLevelAllowedForSubject("regular", subject);
  const advancedOk = isDisplayLevelAllowedForSubject("advanced", subject);
  const regPlan = resolveActivityGenerationPlan("mixed", subject);
  const advPlan = resolveActivityGenerationPlan("hard", subject);
  if (!regularOk || !advancedOk || regPlan.displayLevel !== "regular" || advPlan.displayLevel !== "advanced") {
    return {
      ok: false,
      detail: `regular=${regularOk} advanced=${advancedOk} regPlan=${regPlan.displayLevel} advPlan=${advPlan.displayLevel}`,
    };
  }
  return { ok: true, detail: "regular + advanced OK" };
}

/**
 * Planned cohort level matrix: subject × grade × displayLevel → student count.
 */
export function buildLevelCoverageMatrix(cohort, subjects, grades) {
  const matrix = {};
  for (const subject of subjects) {
    matrix[subject] = {};
    for (const grade of grades) {
      matrix[subject][grade] = {};
      for (const level of displayLevelsForSubject(subject)) {
        matrix[subject][grade][level] = cohort.filter(
          (s) =>
            s.grade === grade &&
            s.primarySubject === subject &&
            resolvePracticeDisplayLevel(subject, s.displayLevel) === level,
        ).length;
      }
    }
  }
  return matrix;
}

export function buildLevelCoverageRows(cohort, subjects, grades, seededStats = {}) {
  const rows = [];
  for (const subject of subjects) {
    for (const grade of grades) {
      for (const displayLevel of displayLevelsForSubject(subject)) {
        const planned = cohort.filter(
          (s) =>
            s.grade === grade &&
            s.primarySubject === subject &&
            resolvePracticeDisplayLevel(subject, s.displayLevel) === displayLevel,
        ).length;
        const key = `${subject}:${grade}:${displayLevel}`;
        rows.push({
          subject,
          grade,
          displayLevel,
          studentsPlanned: planned,
          studentsSeeded: seededStats.bySubjectGradeLevel?.[key] || 0,
        });
      }
    }
  }
  return rows;
}

export function summarizeCohortLevelDistribution(cohort, subjects) {
  const out = {};
  for (const subject of subjects) {
    const primaries = cohort.filter((s) => s.primarySubject === subject);
    out[subject] = {};
    for (const level of displayLevelsForSubject(subject)) {
      out[subject][level] = primaries.filter(
        (s) => resolvePracticeDisplayLevel(subject, s.displayLevel) === level,
      ).length;
    }
  }
  return out;
}
