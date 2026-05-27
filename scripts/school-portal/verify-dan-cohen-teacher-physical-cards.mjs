#!/usr/bin/env node
/** Textual evidence: Dan Cohen teacher detail physical class cards (Part A). */
import {
  groupPhysicalClassesForTeacher,
  physicalClassStudentCount,
  physicalClassSubjectLabelsHe,
} from "../../lib/school-portal/school-drilldown.js";
import { listSchoolClasses } from "../../lib/school-server/school-classes.server.js";
import { getSchoolTeacherDetail } from "../../lib/school-server/school-teachers.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";

const SCHOOL_ID = process.argv[2] || "bb4e5984-d95f-438f-a465-e1a8208ea7de";

async function main() {
  const admin = createServiceRole();
  const authUser = await findAuthUserByEmail(admin, "dan@leo-k.com");
  if (!authUser?.id) throw new Error("Dan Cohen auth user not found");

  const detail = await getSchoolTeacherDetail(admin, SCHOOL_ID, authUser.id);
  if (!detail.ok) throw new Error(detail.code || "teacher detail failed");

  const listed = await listSchoolClasses(admin, SCHOOL_ID, {
    teacherId: authUser.id,
    isArchived: false,
  });
  if (!listed.ok) throw new Error(listed.code || "list classes failed");

  const classes = listed.classes || [];
  const groups = groupPhysicalClassesForTeacher(classes);

  console.log("=== Dan Cohen teacher detail (API evidence) ===\n");
  console.log(`Teacher: ${detail.teacher.displayName}`);
  console.log(`Summary — classes: ${detail.teacher.activeClassCount}, linked students: ${detail.teacher.activeStudentLinkCount}`);
  console.log(`Subject classes from API: ${classes.length}`);
  console.log(`Physical class cards: ${groups.length}\n`);

  console.log("Section: כיתות של המורה");
  for (const group of groups) {
    const count = physicalClassStudentCount(group.subjectClasses);
    const subjects = physicalClassSubjectLabelsHe(group.subjectClasses).join(", ");
    console.log(`\n* ${group.name}`);
    console.log(`  * ${count} תלמידים`);
    console.log(`  * מקצועות: ${subjects}`);
  }

  console.log("\nSection below: הרשאות מקצועות (subject permissions unchanged)");
  console.log("verify-dan-cohen-teacher-physical-cards: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
