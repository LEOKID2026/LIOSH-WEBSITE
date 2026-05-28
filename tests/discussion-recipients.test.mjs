import test from "node:test";
import assert from "node:assert/strict";
import { classroomActivityRecipientsSatisfyDbCheck } from "../lib/classroom-activities/classroom-activities-shared.server.js";
import { resolveClassActivityRecipientStudentIds } from "../lib/teacher-server/teacher-activities.server.js";

/** @param {{ ok: true, recipientScope: string, studentIds: string[] }} resolved */
function discussionInsertRecipientFields(resolved) {
  return {
    recipientScope: resolved.recipientScope,
    assignedStudentIds:
      resolved.recipientScope === "selected_students" ? resolved.studentIds : null,
  };
}

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const S1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const S2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const S3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_CLASS = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function mockServiceRole(membersByClass) {
  return {
    from(table) {
      if (table !== "teacher_class_students") {
        throw new Error(`unexpected table ${table}`);
      }
      /** @type {{ col: string, val: unknown }[]} */
      const filters = [];
      const chain = {
        select() {
          return chain;
        },
        eq(col, val) {
          filters.push({ col, val });
          return chain;
        },
        is() {
          return chain;
        },
        order() {
          return chain;
        },
        then(resolve, reject) {
          try {
            const classId = filters.find((f) => f.col === "class_id")?.val;
            const rows = (membersByClass[String(classId)] || []).map((m) => ({
              id: m.membershipId,
              student_id: m.studentId,
              joined_at: m.joinedAt || "2026-01-01T00:00:00.000Z",
              students: { full_name: m.fullName || "Student" },
            }));
            resolve({ data: rows, error: null });
          } catch (e) {
            reject(e);
          }
        },
      };
      return chain;
    },
  };
}

test("whole-class discussion assigns all active class students", async () => {
  const sr = mockServiceRole({
    [CLASS_ID]: [
      { membershipId: "m1", studentId: S1, fullName: "A" },
      { membershipId: "m2", studentId: S2, fullName: "B" },
    ],
  });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "whole_class",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(new Set(result.studentIds), new Set([S1, S2]));
  assert.equal(result.recipientScope, "whole_class");
});

test("selected-students discussion assigns only selected class members", async () => {
  const sr = mockServiceRole({
    [CLASS_ID]: [
      { membershipId: "m1", studentId: S1, fullName: "A" },
      { membershipId: "m2", studentId: S2, fullName: "B" },
      { membershipId: "m3", studentId: S3, fullName: "C" },
    ],
  });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "selected_students",
    assignedStudentIds: [S1, S3],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(new Set(result.studentIds), new Set([S1, S3]));
});

test("selected-students with zero IDs is rejected", async () => {
  const sr = mockServiceRole({ [CLASS_ID]: [{ membershipId: "m1", studentId: S1 }] });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "selected_students",
    assignedStudentIds: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "validation_failed");
});

test("selected-students with null assignedStudentIds is rejected", async () => {
  const sr = mockServiceRole({ [CLASS_ID]: [{ membershipId: "m1", studentId: S1 }] });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "selected_students",
    assignedStudentIds: null,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "validation_failed");
});

test("whole-class discussion DB shape: whole_class scope and null assigned ids", async () => {
  const sr = mockServiceRole({
    [CLASS_ID]: [{ membershipId: "m1", studentId: S1 }],
  });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "whole_class",
  });
  assert.equal(result.ok, true);
  const fields = discussionInsertRecipientFields(result);
  assert.equal(fields.recipientScope, "whole_class");
  assert.equal(fields.assignedStudentIds, null);
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "discussion",
      recipientScope: fields.recipientScope,
      assignedStudentIds: fields.assignedStudentIds,
    }),
    true
  );
});

test("selected-students with one or more IDs accepted for DB shape", async () => {
  const sr = mockServiceRole({
    [CLASS_ID]: [
      { membershipId: "m1", studentId: S1 },
      { membershipId: "m2", studentId: S2 },
    ],
  });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "selected_students",
    assignedStudentIds: [S1],
  });
  assert.equal(result.ok, true);
  const fields = discussionInsertRecipientFields(result);
  assert.equal(fields.recipientScope, "selected_students");
  assert.deepEqual(fields.assignedStudentIds, [S1]);
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "discussion",
      recipientScope: fields.recipientScope,
      assignedStudentIds: fields.assignedStudentIds,
    }),
    true
  );
});

test("non-discussion activities with null recipient fields satisfy DB check", () => {
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "homework",
      recipientScope: null,
      assignedStudentIds: null,
    }),
    true
  );
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "quiz",
      recipientScope: null,
      assignedStudentIds: null,
    }),
    true
  );
});

test("constraint is mode-agnostic: whole_class + null ids is valid for any mode", () => {
  for (const mode of ["homework", "quiz", "guided_practice", "live_lesson", "discussion"]) {
    assert.equal(
      classroomActivityRecipientsSatisfyDbCheck({
        mode,
        recipientScope: "whole_class",
        assignedStudentIds: null,
      }),
      true,
      `failed for mode=${mode}`
    );
  }
});

test("invalid DB shapes are rejected by check mirror", () => {
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "discussion",
      recipientScope: "selected_students",
      assignedStudentIds: [],
    }),
    false
  );
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "homework",
      recipientScope: "selected_students",
      assignedStudentIds: null,
    }),
    false
  );
  assert.equal(
    classroomActivityRecipientsSatisfyDbCheck({
      mode: "quiz",
      recipientScope: "selected_students",
      assignedStudentIds: [],
    }),
    false
  );
});

test("student from another class cannot be assigned", async () => {
  const sr = mockServiceRole({
    [CLASS_ID]: [{ membershipId: "m1", studentId: S1 }],
    [OTHER_CLASS]: [{ membershipId: "m2", studentId: S2 }],
  });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "discussion",
    recipientScope: "selected_students",
    assignedStudentIds: [S2],
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "student_not_in_class");
});

test("non-discussion modes always resolve whole class members", async () => {
  const sr = mockServiceRole({
    [CLASS_ID]: [
      { membershipId: "m1", studentId: S1 },
      { membershipId: "m2", studentId: S2 },
    ],
  });
  const result = await resolveClassActivityRecipientStudentIds(sr, CLASS_ID, {
    mode: "homework",
    recipientScope: "selected_students",
    assignedStudentIds: [S1],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(new Set(result.studentIds), new Set([S1, S2]));
  assert.equal(result.recipientScope, "whole_class");
});
