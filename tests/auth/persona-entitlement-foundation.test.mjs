import test from "node:test";
import assert from "node:assert/strict";
import { entitlementStatusToErrorCode } from "../../lib/auth/persona-entitlement.server.js";
import { resolveSchoolQuotaFields } from "../../lib/school-server/school-quota.server.js";
import { resolveUtcMonthWindow } from "../../lib/parent-server/parent-copilot-limit.server.js";

test("entitlementStatusToErrorCode maps pending/suspended/revoked", () => {
  assert.equal(entitlementStatusToErrorCode("pending"), "entitlement_pending");
  assert.equal(entitlementStatusToErrorCode("suspended"), "entitlement_suspended");
  assert.equal(entitlementStatusToErrorCode("revoked"), "entitlement_revoked");
});

test("resolveSchoolQuotaFields uses defaults when columns missing", () => {
  const q = resolveSchoolQuotaFields({});
  assert.equal(q.maxSchoolTeachers, 20);
  assert.equal(q.maxSchoolManagers, 1);
  assert.equal(q.maxSchoolStudents, 500);
  assert.equal(q.maxSchoolOperators, 5);
});

test("resolveSchoolQuotaFields reads explicit values", () => {
  const q = resolveSchoolQuotaFields({
    max_school_teachers: 10,
    max_school_managers: 2,
    max_school_students: 100,
    max_school_operators: 3,
  });
  assert.equal(q.maxSchoolTeachers, 10);
  assert.equal(q.maxSchoolManagers, 2);
  assert.equal(q.maxSchoolStudents, 100);
  assert.equal(q.maxSchoolOperators, 3);
});

test("resolveUtcMonthWindow spans current UTC month", () => {
  const now = new Date("2026-05-15T12:00:00.000Z");
  const { startIso, endIso } = resolveUtcMonthWindow(now);
  assert.equal(startIso, "2026-05-01T00:00:00.000Z");
  assert.equal(endIso, "2026-06-01T00:00:00.000Z");
});
