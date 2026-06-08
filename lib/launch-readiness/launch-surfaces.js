/**
 * Launch-readiness surface identifiers and launch level constants.
 * Marketing and diagnostics consumption are registry metadata only in Phase 1.
 */

/** @typedef {'FULL'|'LIMITED'|'PRACTICE_ONLY'|'HIDE'} LaunchLevel */

/** @typedef {'normal'|'thin'|'manual_only'|'excluded'} DiagnosticContribution */

export const LAUNCH_LEVELS = Object.freeze(["FULL", "LIMITED", "PRACTICE_ONLY", "HIDE"]);

export const LAUNCH_SURFACES = Object.freeze({
  SELF_PRACTICE: "self_practice",
  PARENT_ASSIGN: "parent_assign",
  TEACHER_ASSIGN: "teacher_assign",
  LEARNING_BOOK_ENTRY: "learning_book_entry",
});

export const DIAGNOSTIC_CONTRIBUTION = Object.freeze({
  NORMAL: "normal",
  THIN: "thin",
  MANUAL_ONLY: "manual_only",
  EXCLUDED: "excluded",
});

/** @type {readonly LaunchLevel[]} */
export const LAUNCH_LEVEL_ORDER = Object.freeze(["HIDE", "PRACTICE_ONLY", "LIMITED", "FULL"]);

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 */
export function topicCellKey(subject, grade, topic) {
  return `${String(subject).trim().toLowerCase()}:${String(grade).trim().toLowerCase()}:${String(topic).trim().toLowerCase()}`;
}

/**
 * @param {LaunchLevel} level
 */
export function defaultSurfacesForLaunchLevel(level) {
  if (level === "HIDE") {
    return {
      selfPractice: false,
      parentAssign: false,
      teacherAssign: false,
      learningBookEntry: false,
    };
  }
  return {
    selfPractice: true,
    parentAssign: level === "FULL" || level === "LIMITED",
    teacherAssign: level === "FULL" || level === "LIMITED",
    learningBookEntry: true,
  };
}

/**
 * @param {LaunchLevel} launchLevel
 * @param {string} topic
 */
export function refineSurfacesForTopic(launchLevel, topic) {
  const base = defaultSurfacesForLaunchLevel(launchLevel);
  if (launchLevel === "HIDE") return base;

  const t = String(topic || "").toLowerCase();
  if (t === "writing" || t === "speaking") {
    return { ...base, parentAssign: false, teacherAssign: false };
  }
  return base;
}

/**
 * @param {LaunchLevel} launchLevel
 * @param {string} topic
 * @param {boolean} [criticalBlocking]
 */
export function diagnosticContributionFor(launchLevel, topic, criticalBlocking = false) {
  if (launchLevel === "HIDE" || criticalBlocking) return DIAGNOSTIC_CONTRIBUTION.EXCLUDED;
  const t = String(topic || "").toLowerCase();
  if (t === "writing" || t === "speaking" || t === "mixed") {
    return DIAGNOSTIC_CONTRIBUTION.MANUAL_ONLY;
  }
  if (launchLevel === "FULL") return DIAGNOSTIC_CONTRIBUTION.NORMAL;
  if (launchLevel === "LIMITED") return DIAGNOSTIC_CONTRIBUTION.THIN;
  return DIAGNOSTIC_CONTRIBUTION.MANUAL_ONLY;
}
