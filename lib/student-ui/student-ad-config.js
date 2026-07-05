/**
 * Student ad placement policy and ENV-driven render mode.
 *
 * No manual code edits to enable external ads — set env per environment:
 *   NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED=true  (production only)
 *
 * Safety defaults:
 *   - development / TRY / any non-production: placeholder always (hard lock)
 *   - production: external only when NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED=true
 */

/** @typedef {"placeholder"|"external"} StudentAdRenderMode */

export const STUDENT_AD_ENV = Object.freeze({
  /** Explicit production opt-in for child-safe external provider (future). */
  EXTERNAL_ENABLED: "NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED",
});

export const STUDENT_AD_POLICY = Object.freeze({
  childSafe: true,
  personalized: false,
});

/**
 * Props that must never reach ad components on child-facing pages.
 */
export const STUDENT_AD_FORBIDDEN_PROP_KEYS = Object.freeze([
  "studentId",
  "studentName",
  "childName",
  "name",
  "email",
  "grade",
  "gradeKey",
  "className",
  "class",
  "subject",
  "topic",
  "subtopic",
  "results",
  "score",
  "progress",
  "report",
  "reports",
  "gameData",
  "sessionData",
  "MB",
]);

/**
 * Resolve render mode from environment. Safe to call in Node tests and client bundles.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {StudentAdRenderMode}
 */
export function resolveStudentAdRenderModeFromEnv(env = process.env) {
  if (env.NODE_ENV !== "production") {
    return "placeholder";
  }
  const flag = String(env[STUDENT_AD_ENV.EXTERNAL_ENABLED] || "")
    .trim()
    .toLowerCase();
  if (flag === "true") {
    return "external";
  }
  return "placeholder";
}
