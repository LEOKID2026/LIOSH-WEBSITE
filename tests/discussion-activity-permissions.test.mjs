import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSubjectKey,
  checkPrivateTeacherSubjectPermission,
  checkSchoolTeacherSubjectPermission,
} from "../lib/school-server/school-subjects.server.js";
import { assertTeacherCanManageStudentAccess } from "../lib/teacher-server/teacher-student-access.server.js";

/**
 * @param {Record<string, object[]>} tables
 */
function mockServiceRole(tables) {
  return {
    from(table) {
      /** @type {{ col: string, val: unknown, op: string }[]} */
      const filters = [];
      let maybeSingle = false;
      const chain = {
        select() {
          return chain;
        },
        eq(col, val) {
          filters.push({ col, val, op: "eq" });
          return chain;
        },
        is(col, val) {
          filters.push({ col, val, op: "is" });
          return chain;
        },
        maybeSingle() {
          maybeSingle = true;
          return chain;
        },
        then(resolve, reject) {
          try {
            let rows = [...(tables[table] || [])];
            for (const { col, val, op } of filters) {
              if (op === "is") {
                rows = rows.filter((row) => row[col] === val);
              } else {
                rows = rows.filter((row) => row[col] === val);
              }
            }
            if (maybeSingle) {
              resolve({ data: rows[0] ?? null, error: null });
              return;
            }
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

test("normalizeSubjectKey lowercases and trims", () => {
  assert.equal(normalizeSubjectKey(" Math "), "math");
  assert.equal(normalizeSubjectKey(""), "");
});

const PRIVATE_TEACHER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_G1 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const UNLINKED_STUDENT = "99999999-9999-4999-8999-999999999999";
const SCHOOL_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SCHOOL_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TEACHER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

test("private teacher with no subject grant is blocked", async () => {
  const sr = mockServiceRole({ private_teacher_subjects: [] });
  assert.equal(await checkPrivateTeacherSubjectPermission(sr, PRIVATE_TEACHER_ID, "math"), false);
});

test("private teacher with math grant is allowed for math regardless of student grade", async () => {
  const sr = mockServiceRole({
    private_teacher_subjects: [
      { id: "1", teacher_id: PRIVATE_TEACHER_ID, subject: "math" },
    ],
  });
  assert.equal(await checkPrivateTeacherSubjectPermission(sr, PRIVATE_TEACHER_ID, "math"), true);
  assert.equal(await checkPrivateTeacherSubjectPermission(sr, PRIVATE_TEACHER_ID, "Math"), true);
});

test("private teacher with math grant cannot create geometry discussion", async () => {
  const sr = mockServiceRole({
    private_teacher_subjects: [
      { id: "1", teacher_id: PRIVATE_TEACHER_ID, subject: "math" },
    ],
  });
  assert.equal(await checkPrivateTeacherSubjectPermission(sr, PRIVATE_TEACHER_ID, "geometry"), false);
});

test("private teacher cannot act on student not assigned to them", async () => {
  const sr = mockServiceRole({
    teacher_students: [
      {
        id: "link1",
        teacher_id: PRIVATE_TEACHER_ID,
        student_id: STUDENT_G1,
        archived_at: null,
      },
    ],
    teacher_classes: [],
  });
  const linked = await assertTeacherCanManageStudentAccess(sr, PRIVATE_TEACHER_ID, STUDENT_G1);
  assert.equal(linked.ok, true);

  const srUnlinked = mockServiceRole({
    teacher_students: [],
    teacher_classes: [],
  });
  const blocked = await assertTeacherCanManageStudentAccess(
    srUnlinked,
    PRIVATE_TEACHER_ID,
    UNLINKED_STUDENT
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "student_not_linked");
});

test("school teacher unauthorized subject/grade is blocked", async () => {
  const sr = mockServiceRole({
    school_teacher_subjects: [
      {
        id: "1",
        school_id: SCHOOL_A,
        teacher_id: TEACHER_ID,
        subject: "math",
        grade_level: "g2",
      },
    ],
  });
  assert.equal(
    await checkSchoolTeacherSubjectPermission(sr, TEACHER_ID, SCHOOL_A, "math", "g2"),
    true
  );
  assert.equal(
    await checkSchoolTeacherSubjectPermission(sr, TEACHER_ID, SCHOOL_A, "math", "g3"),
    false
  );
  assert.equal(
    await checkSchoolTeacherSubjectPermission(sr, TEACHER_ID, SCHOOL_A, "english", "g2"),
    false
  );
});

test("cross-school grant row does not satisfy permission in other school", async () => {
  const sr = mockServiceRole({
    school_teacher_subjects: [
      {
        id: "1",
        school_id: SCHOOL_A,
        teacher_id: TEACHER_ID,
        subject: "math",
        grade_level: null,
      },
    ],
  });
  assert.equal(
    await checkSchoolTeacherSubjectPermission(sr, TEACHER_ID, SCHOOL_A, "math", "g5"),
    true
  );
  assert.equal(
    await checkSchoolTeacherSubjectPermission(sr, TEACHER_ID, SCHOOL_B, "math", "g5"),
    false
  );
});
