import { DEFAULT_TEACHER_FEATURE_FLAGS } from "../teacher-portal/teacher-feature-flags.js";

/** @typedef {'classroom_activities'|'individual_activities'|'parent_messaging'|'ai_reports'|'live_audio'} TeacherFeatureKey */

export { DEFAULT_TEACHER_FEATURE_FLAGS };

/**
 * True only for a finite numeric cap. Used for total-student and class-count limits where
 * null means unlimited. Do NOT use this for per-class limits — see effectiveMaxStudentsPerClass.
 *
 * @param {number|null|undefined} limit
 */
export function isFiniteQuotaLimit(limit) {
  return limit != null && typeof limit === "number" && Number.isFinite(limit);
}

/**
 * Per-class cap for enforcement. NULL/undefined never means unlimited: falls back to
 * defaultPerClass (40). Only a positive integer from override or plan is used as-is.
 *
 * @param {number|null|undefined} resolvedLimit from resolveTeacherPlanLimits().maxStudentsPerClass
 * @param {number} [defaultPerClass=40]
 */
export function effectiveMaxStudentsPerClass(resolvedLimit, defaultPerClass = 40) {
  if (isFiniteQuotaLimit(resolvedLimit)) {
    return resolvedLimit;
  }
  return defaultPerClass;
}

/**
 * @param {Record<string, unknown>|null|undefined} raw
 */
export function normalizeTeacherFeatureFlags(raw) {
  const base = { ...DEFAULT_TEACHER_FEATURE_FLAGS };
  if (!raw || typeof raw !== "object") return base;
  for (const key of Object.keys(DEFAULT_TEACHER_FEATURE_FLAGS)) {
    if (typeof raw[key] === "boolean") {
      base[key] = raw[key];
    }
  }
  return base;
}

/**
 * @param {Record<string, boolean>} featureFlags
 * @param {TeacherFeatureKey} feature
 */
export function assertTeacherFeatureEnabled(featureFlags, feature) {
  const flags = normalizeTeacherFeatureFlags(featureFlags);
  if (flags[feature] === true) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    code: "feature_disabled",
    feature,
  };
}
