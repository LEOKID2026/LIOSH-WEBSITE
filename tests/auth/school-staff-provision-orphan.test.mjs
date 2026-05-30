#!/usr/bin/env node
/**
 * Mocked orphan cleanup tests for school staff provisioning.
 * Run: node --env-file=.env.local --test tests/auth/school-staff-provision-orphan.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteOrphanAuthUser,
  provisionSchoolStaffAccountForTest,
} from "../../lib/school-server/school-staff-provision.server.js";
import { SCHOOL_STAFF_KIND_TEACHER } from "../../lib/school-server/school-staff-code.server.js";

const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const MANAGER_ID = "22222222-2222-4222-8222-222222222222";
const ORPHAN_USER_ID = "33333333-3333-4333-8333-333333333333";

test("deleteOrphanAuthUser calls auth.admin.deleteUser on success", async () => {
  let deletedId = null;
  const serviceRole = {
    auth: {
      admin: {
        deleteUser: async (id) => {
          deletedId = id;
          return { error: null };
        },
      },
    },
    from() {
      return {
        insert: async () => ({ error: null }),
      };
    },
  };

  const ok = await deleteOrphanAuthUser(serviceRole, ORPHAN_USER_ID);
  assert.equal(ok, true);
  assert.equal(deletedId, ORPHAN_USER_ID);
});

test("deleteOrphanAuthUser logs staff_provision_orphan when deleteUser fails", async () => {
  const auditRows = [];
  const serviceRole = {
    auth: {
      admin: {
        deleteUser: async () => ({ error: { message: "delete failed" } }),
      },
    },
    from(table) {
      if (table === "school_staff_audit_log") {
        return {
          insert: async (row) => {
            auditRows.push(row);
            return { error: null };
          },
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  };

  const ok = await deleteOrphanAuthUser(serviceRole, ORPHAN_USER_ID);
  assert.equal(ok, false);
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].action, "staff_provision_orphan");
  assert.equal(auditRows[0].target_user_id, ORPHAN_USER_ID);
});

test("provision deletes orphan auth user when teacher_profiles insert fails", async () => {
  let deleteUserCalled = false;
  let createUserCalled = false;

  const serviceRole = {
    auth: {
      admin: {
        createUser: async () => {
          createUserCalled = true;
          return { data: { user: { id: ORPHAN_USER_ID } }, error: null };
        },
        deleteUser: async (id) => {
          deleteUserCalled = true;
          assert.equal(id, ORPHAN_USER_ID);
          return { error: null };
        },
      },
    },
    from(table) {
      if (table === "school_accounts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: SCHOOL_ID,
                  school_code: "leok",
                  max_school_teachers: 50,
                  max_school_managers: 1,
                  max_school_students: 500,
                  max_school_operators: 50,
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "school_teacher_memberships") {
        return {
          select: () => ({
            eq: (col) => {
              if (col === "school_id") {
                return {
                  eq: () => ({ count: 0, error: null }),
                };
              }
              return { eq: () => ({ count: 0, error: null }) };
            },
          }),
        };
      }
      if (table === "school_credential_sequences") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { school_id: SCHOOL_ID, next_teacher_seq: 1 },
                error: null,
              }),
            }),
          }),
          insert: async () => ({ error: null }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === "teacher_profiles") {
        return {
          insert: async () => ({ error: { code: "XX000", message: "simulated profile failure" } }),
        };
      }
      if (table === "school_staff_audit_log") {
        return { insert: async () => ({ error: null }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  const result = await provisionSchoolStaffAccountForTest(serviceRole, {
    schoolId: SCHOOL_ID,
    managerId: MANAGER_ID,
    displayName: "Orphan Test Teacher",
    staffRole: "school_teacher",
    membershipRole: "teacher",
    sequenceKind: SCHOOL_STAFF_KIND_TEACHER,
    persona: "school_teacher",
    quotaType: "teacher",
  });

  assert.equal(createUserCalled, true);
  assert.equal(result.ok, false);
  assert.equal(deleteUserCalled, true);
});

test("provision logs staff_provision_orphan when cleanup deleteUser fails", async () => {
  const auditRows = [];
  const serviceRole = {
    auth: {
      admin: {
        createUser: async () => ({
          data: { user: { id: ORPHAN_USER_ID } },
          error: null,
        }),
        deleteUser: async () => ({ error: { message: "cleanup failed" } }),
      },
    },
    from(table) {
      if (table === "school_accounts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: SCHOOL_ID,
                  school_code: "leok",
                  max_school_teachers: 50,
                  max_school_managers: 1,
                  max_school_students: 500,
                  max_school_operators: 50,
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "school_teacher_memberships") {
        return {
          select: () => ({
            eq: (col) => {
              if (col === "school_id") {
                return {
                  eq: () => ({ count: 0, error: null }),
                };
              }
              return { eq: () => ({ count: 0, error: null }) };
            },
          }),
        };
      }
      if (table === "school_credential_sequences") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { school_id: SCHOOL_ID, next_teacher_seq: 2 },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === "teacher_profiles") {
        return {
          insert: async () => ({ error: { code: "XX000", message: "simulated profile failure" } }),
        };
      }
      if (table === "school_staff_audit_log") {
        return {
          insert: async (row) => {
            auditRows.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  const result = await provisionSchoolStaffAccountForTest(serviceRole, {
    schoolId: SCHOOL_ID,
    managerId: MANAGER_ID,
    displayName: "Orphan Test Teacher",
    staffRole: "school_teacher",
    membershipRole: "teacher",
    sequenceKind: SCHOOL_STAFF_KIND_TEACHER,
    persona: "school_teacher",
    quotaType: "teacher",
  });

  assert.equal(result.ok, false);
  assert.ok(auditRows.some((row) => row.action === "staff_provision_orphan"));
});
