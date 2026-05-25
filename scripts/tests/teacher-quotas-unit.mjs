#!/usr/bin/env node
/**
 * Unit checks for teacher quota helpers (no DB).
 * node scripts/tests/teacher-quotas-unit.mjs
 */
import assert from "node:assert/strict";
import {
  effectiveMaxStudentsPerClass,
  isFiniteQuotaLimit,
  normalizeTeacherFeatureFlags,
  assertTeacherFeatureEnabled,
} from "../../lib/teacher-server/teacher-entitlements.server.js";
import { SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS } from "../../lib/teacher-server/teacher-session.server.js";

assert.equal(isFiniteQuotaLimit(null), false);
assert.equal(isFiniteQuotaLimit(undefined), false);
assert.equal(isFiniteQuotaLimit(40), true);
assert.equal(isFiniteQuotaLimit(0), true);

const flags = normalizeTeacherFeatureFlags({ classroom_activities: false });
assert.equal(flags.classroom_activities, false);
assert.equal(flags.parent_messaging, true);

const disabled = assertTeacherFeatureEnabled(flags, "classroom_activities");
assert.equal(disabled.ok, false);
assert.equal(disabled.code, "feature_disabled");

assert.equal(SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS, 40);

assert.equal(effectiveMaxStudentsPerClass(null), 40);
assert.equal(effectiveMaxStudentsPerClass(undefined), 40);
assert.equal(effectiveMaxStudentsPerClass(40), 40);
assert.equal(effectiveMaxStudentsPerClass(25), 25);

console.log("teacher-quotas-unit: ok");
