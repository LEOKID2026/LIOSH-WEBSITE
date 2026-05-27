#!/usr/bin/env node
/**
 * Dan Cohen linked student count uses teacher_class_students.
 */
import assert from "node:assert/strict";
import { getSchoolTeacherDetail } from "../../lib/school-server/school-teachers.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";

const SCHOOL_ID = process.argv[2] || "bb4e5984-d95f-438f-a465-e1a8208ea7de";

async function main() {
  const admin = createServiceRole();
  const authUser = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(authUser?.id, "Dan Cohen auth user");

  const detail = await getSchoolTeacherDetail(admin, SCHOOL_ID, authUser.id);
  assert.ok(detail.ok, detail.code || "teacher detail failed");
  assert.ok(detail.teacher.activeStudentLinkCount > 0, "Dan linked students must be > 0");
  assert.equal(detail.teacher.activeClassCount, 12);

  console.log(
    JSON.stringify(
      {
        teacherId: authUser.id,
        activeClassCount: detail.teacher.activeClassCount,
        activeStudentLinkCount: detail.teacher.activeStudentLinkCount,
      },
      null,
      2
    )
  );
  console.log("\nschool-teacher-linked-students-regression: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
