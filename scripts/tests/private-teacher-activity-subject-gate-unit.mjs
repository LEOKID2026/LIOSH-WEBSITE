/**
 * Private vs school teacher activity subject gates.
 * Run: node scripts/tests/private-teacher-activity-subject-gate-unit.mjs
 */

import assert from "node:assert/strict";
import {
  assertActivitySubjectAllowed,
  assertDiscussionActivitySubjectAllowed,
} from "../../lib/school-server/school-subjects.server.js";
import { buildActivityReportPayload } from "../../lib/teacher-server/teacher-activities.server.js";
import { buildStudentActivityReportPayload } from "../../lib/teacher-server/student-activity.server.js";
import { loadStudentActivityBatchMonitor } from "../../lib/teacher-server/student-activity.server.js";

const PRIVATE_TEACHER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SCHOOL_TEACHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SCHOOL_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CLASS_ACTIVITY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const STUDENT_ACTIVITY_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

/**
 * @param {{
 *   membership?: object|null,
 *   privateSubjects?: string[],
 *   schoolSubjects?: Array<{ subject: string, grade_level?: string|null }>,
 *   classroomActivity?: object|null,
 *   studentActivity?: object|null,
 *   batchActivities?: object[]|null,
 * }} config
 */
function createMockServiceRole(config) {
  const {
    membership = null,
    privateSubjects = [],
    schoolSubjects = [],
    classroomActivity = null,
    studentActivity = null,
    batchActivities = null,
  } = config;

  return {
    from(table) {
      const state = { filters: {} };
      const chain = {
        select(_cols) {
          return chain;
        },
        eq(col, val) {
          state.filters[col] = val;
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        in() {
          return chain;
        },
        maybeSingle() {
          if (table === "school_teacher_memberships") {
            return Promise.resolve({ data: membership, error: null });
          }
          if (table === "private_teacher_subjects") {
            const subject = state.filters.subject;
            const granted = privateSubjects.includes(subject);
            return Promise.resolve({
              data: granted ? { id: "private-grant-1", subject } : null,
              error: null,
            });
          }
          if (table === "classroom_activities") {
            return Promise.resolve({ data: classroomActivity, error: null });
          }
          if (table === "student_activities") {
            return Promise.resolve({ data: studentActivity, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve) {
          if (table === "school_teacher_subjects") {
            return resolve({ data: schoolSubjects, error: null });
          }
          if (table === "student_activities" && batchActivities) {
            return resolve({ data: batchActivities, error: null });
          }
          if (table === "student_activity_status") {
            return resolve({ data: [], error: null });
          }
          if (table === "students") {
            return resolve({
              data: [{ id: "11111111-1111-4111-8111-111111111111", full_name: "Test Student" }],
              error: null,
            });
          }
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };
}

async function testPrivateTeacherMathGranted() {
  const sb = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
  });
  const regular = await assertActivitySubjectAllowed(sb, PRIVATE_TEACHER, "math", null);
  assert.equal(regular.ok, true);
  assert.equal(regular.allowed, true);

  const discussion = await assertDiscussionActivitySubjectAllowed(sb, PRIVATE_TEACHER, "math", null);
  assert.equal(discussion.ok, true);
  assert.equal(discussion.allowed, true);
}

async function testPrivateTeacherEnglishDenied() {
  const sb = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
  });
  const regular = await assertActivitySubjectAllowed(sb, PRIVATE_TEACHER, "english", null);
  assert.equal(regular.ok, false);
  assert.equal(regular.code, "subject_not_permitted");

  const discussion = await assertDiscussionActivitySubjectAllowed(sb, PRIVATE_TEACHER, "english", null);
  assert.equal(discussion.ok, false);
  assert.equal(discussion.code, "subject_not_permitted");
}

async function testDiscussionMatchesActivityGate() {
  const sb = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
  });
  for (const subject of ["math", "english", "geometry"]) {
    const activity = await assertActivitySubjectAllowed(sb, PRIVATE_TEACHER, subject, null);
    const discussion = await assertDiscussionActivitySubjectAllowed(sb, PRIVATE_TEACHER, subject, null);
    assert.deepEqual(
      { ok: activity.ok, code: activity.code },
      { ok: discussion.ok, code: discussion.code },
      `discussion and activity gates match for private teacher subject=${subject}`
    );
  }
}

async function testSchoolTeacherSubjectGrant() {
  const sb = createMockServiceRole({
    membership: {
      id: "mem-1",
      school_id: SCHOOL_ID,
      teacher_id: SCHOOL_TEACHER,
      role: "teacher",
      joined_at: "2026-01-01T00:00:00.000Z",
      subjects_locked: false,
    },
    schoolSubjects: [{ subject: "math", grade_level: "g3" }],
  });

  const mathOk = await assertActivitySubjectAllowed(sb, SCHOOL_TEACHER, "math", "g3");
  assert.equal(mathOk.ok, true);

  const englishDenied = await assertActivitySubjectAllowed(sb, SCHOOL_TEACHER, "english", "g3");
  assert.equal(englishDenied.ok, false);
  assert.equal(englishDenied.code, "subject_not_permitted");
}

async function testSchoolAdminBypass() {
  const sb = createMockServiceRole({
    membership: {
      id: "mem-admin",
      school_id: SCHOOL_ID,
      teacher_id: SCHOOL_TEACHER,
      role: "school_admin",
      joined_at: "2026-01-01T00:00:00.000Z",
      subjects_locked: false,
    },
    schoolSubjects: [],
  });

  const result = await assertActivitySubjectAllowed(sb, SCHOOL_TEACHER, "english", "g3");
  assert.equal(result.ok, true);
  assert.equal(result.allowed, true);
}

async function testClassReportReadExportGate() {
  const sbDenied = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
    classroomActivity: {
      id: CLASS_ACTIVITY_ID,
      teacher_id: PRIVATE_TEACHER,
      subject: "english",
      status: "closed",
      question_set: [],
      question_count: 1,
      class_id: "11111111-1111-4111-8111-111111111111",
    },
  });
  const denied = await buildActivityReportPayload(sbDenied, PRIVATE_TEACHER, CLASS_ACTIVITY_ID);
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "subject_not_permitted");

  const sbAllowedGate = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
  });
  const allowedGate = await assertActivitySubjectAllowed(
    sbAllowedGate,
    PRIVATE_TEACHER,
    "math",
    null
  );
  assert.equal(allowedGate.ok, true);
}

async function testStudentActivityReportReadGate() {
  const sbDenied = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
    studentActivity: {
      id: STUDENT_ACTIVITY_ID,
      teacher_id: PRIVATE_TEACHER,
      student_id: "11111111-1111-4111-8111-111111111111",
      subject: "english",
      status: "closed",
      question_set: [],
      question_count: 1,
    },
  });
  const denied = await buildStudentActivityReportPayload(
    sbDenied,
    PRIVATE_TEACHER,
    STUDENT_ACTIVITY_ID
  );
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "subject_not_permitted");

  const sbAllowedGate = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
  });
  const allowedGate = await assertActivitySubjectAllowed(
    sbAllowedGate,
    PRIVATE_TEACHER,
    "math",
    null
  );
  assert.equal(allowedGate.ok, true);
}

async function testBatchMonitorSubjectGate() {
  const BATCH_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const sbDenied = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
    batchActivities: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
        student_id: "11111111-1111-4111-8111-111111111111",
        title: "Batch English",
        subject: "english",
        topic: "t",
        mode: "quiz",
        question_count: 5,
        status: "active",
        activated_at: "2026-01-01T00:00:00.000Z",
        closed_at: null,
      },
    ],
  });
  const denied = await loadStudentActivityBatchMonitor(sbDenied, PRIVATE_TEACHER, BATCH_ID);
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "subject_not_permitted");

  const sbAllowed = createMockServiceRole({
    membership: null,
    privateSubjects: ["math"],
    batchActivities: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
        student_id: "11111111-1111-4111-8111-111111111111",
        title: "Batch Math",
        subject: "math",
        topic: "t",
        mode: "quiz",
        question_count: 5,
        status: "active",
        activated_at: "2026-01-01T00:00:00.000Z",
        closed_at: null,
      },
    ],
  });
  const allowed = await loadStudentActivityBatchMonitor(sbAllowed, PRIVATE_TEACHER, BATCH_ID);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.roster?.length, 1);
}

await testPrivateTeacherMathGranted();
await testPrivateTeacherEnglishDenied();
await testDiscussionMatchesActivityGate();
await testSchoolTeacherSubjectGrant();
await testSchoolAdminBypass();
await testClassReportReadExportGate();
await testStudentActivityReportReadGate();
await testBatchMonitorSubjectGate();

console.log("private-teacher-activity-subject-gate-unit: ok");
