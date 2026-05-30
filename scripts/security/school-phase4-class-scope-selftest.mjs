#!/usr/bin/env node
/**
 * Phase 4.1 — school class scope / tenant isolation selftest.
 * Pure unit + static source checks. No Supabase writes.
 *
 * Run: node scripts/security/school-phase4-class-scope-selftest.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSchoolClassRowInScope } from "../../lib/school-server/school-class-scope.server.js";
import { loadSchoolClassInScope } from "../../lib/school-server/school-scope.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const SCHOOL_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SCHOOL_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TEACHER_DUAL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TEACHER_A_ONLY = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CLASS_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function testPureValidClassInSameSchool() {
  const ok = isSchoolClassRowInScope(
    { id: CLASS_A, teacher_id: TEACHER_A_ONLY, school_id: SCHOOL_A },
    SCHOOL_A,
    [TEACHER_A_ONLY]
  );
  assert.equal(ok, true);
  record("valid class in same school allowed", true);
}

function testPureCrossSchoolClassRejected() {
  const ok = isSchoolClassRowInScope(
    { id: CLASS_A, teacher_id: TEACHER_A_ONLY, school_id: SCHOOL_A },
    SCHOOL_B,
    [TEACHER_A_ONLY]
  );
  assert.equal(ok, false);
  record("school B cannot access school A class by classId alone", true);
}

function testPureGap01DualMembershipMismatchRejected() {
  // Class tagged to School A; teacher is in both school rosters; query School B context.
  const ok = isSchoolClassRowInScope(
    { id: CLASS_A, teacher_id: TEACHER_DUAL, school_id: SCHOOL_A },
    SCHOOL_B,
    [TEACHER_DUAL]
  );
  assert.equal(ok, false);
  record(
    "GAP-01 dual-membership teacher + mismatched school_id rejected for School B",
    true,
    "teacher in B roster but class school_id=A"
  );
}

function testPureTeacherNotInRosterRejected() {
  const ok = isSchoolClassRowInScope(
    { id: CLASS_A, teacher_id: TEACHER_A_ONLY, school_id: SCHOOL_A },
    SCHOOL_A,
    [TEACHER_DUAL]
  );
  assert.equal(ok, false);
  record("teacher not in school roster rejected even when school_id matches", true);
}

function testPureNullSchoolIdRejected() {
  const ok = isSchoolClassRowInScope(
    { id: CLASS_A, teacher_id: TEACHER_A_ONLY, school_id: null },
    SCHOOL_A,
    [TEACHER_A_ONLY]
  );
  assert.equal(ok, false);
  record("null school_id on class rejected (fail-closed)", true);
}

function testPureMissingClassRowRejected() {
  assert.equal(isSchoolClassRowInScope(null, SCHOOL_A, [TEACHER_A_ONLY]), false);
  assert.equal(isSchoolClassRowInScope({}, SCHOOL_A, [TEACHER_A_ONLY]), false);
  record("missing class row rejected", true);
}

function createMockServiceRole(config) {
  const { scopeTeacherIds, classRow } = config;

  function resolveTable(table) {
    if (table === "school_teacher_memberships") {
      return Promise.resolve({
        data: (scopeTeacherIds || []).map((teacher_id) => ({ teacher_id, role: "teacher" })),
        error: null,
      });
    }
    if (table === "teacher_classes") {
      return Promise.resolve({ data: classRow, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }

  return {
    from(table) {
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        maybeSingle() {
          return resolveTable(table);
        },
        then(onFulfilled, onRejected) {
          return resolveTable(table).then(onFulfilled, onRejected);
        },
      };
      return chain;
    },
  };
}

async function testLoadSchoolClassInScopeIntegration() {
  const serviceRole = createMockServiceRole({
    scopeTeacherIds: [TEACHER_DUAL],
    classRow: { id: CLASS_A, teacher_id: TEACHER_DUAL, school_id: SCHOOL_A, name: "QA" },
  });

  const result = await loadSchoolClassInScope(serviceRole, SCHOOL_B, CLASS_A);
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.code, "class_not_in_school");
  record("loadSchoolClassInScope rejects GAP-01 adversarial case", true, "403 class_not_in_school");
}

async function testLoadSchoolClassInScopeValid() {
  const serviceRole = createMockServiceRole({
    scopeTeacherIds: [TEACHER_A_ONLY],
    classRow: {
      id: CLASS_A,
      teacher_id: TEACHER_A_ONLY,
      school_id: SCHOOL_A,
      name: "QA",
      subject_focus: "math",
    },
  });

  const result = await loadSchoolClassInScope(serviceRole, SCHOOL_A, CLASS_A);
  assert.equal(result.ok, true);
  assert.equal(result.classRow.id, CLASS_A);
  record("loadSchoolClassInScope allows consistent class + school", true);
}

function testStaticOrLogicRemoved() {
  const scopeSrc = read("lib/school-server/school-scope.server.js");
  const hasOrBypass =
    /ownedBySchoolTeacher/.test(scopeSrc) &&
    /taggedToSchool/.test(scopeSrc) &&
    /!ownedBySchoolTeacher && !taggedToSchool/.test(scopeSrc);
  const usesAndHelper =
    /isSchoolClassRowInScope/.test(scopeSrc) &&
    /from "\.\/school-class-scope\.server\.js"/.test(scopeSrc);

  record("OR bypass pattern removed from loadSchoolClassInScope", !hasOrBypass);
  record("loadSchoolClassInScope uses isSchoolClassRowInScope helper", usesAndHelper);
  assert.equal(hasOrBypass, false);
  assert.equal(usesAndHelper, true);
}

function testStaticReportRouteUsesScopeBeforeReport() {
  const reportSrc = read("pages/api/school/classes/[classId]/report-data.js");
  const handlerSrc = reportSrc.slice(reportSrc.indexOf("export default async function handler"));
  const guardBeforeReport =
    /requireSchoolManagerApiContext/.test(handlerSrc) &&
    /loadSchoolClassInScope/.test(handlerSrc) &&
    /buildTeacherClassReportPayload/.test(handlerSrc) &&
    handlerSrc.indexOf("loadSchoolClassInScope") <
      handlerSrc.indexOf("buildTeacherClassReportPayload");
  record(
    "school class report-data calls loadSchoolClassInScope before report build",
    guardBeforeReport
  );
  assert.equal(guardBeforeReport, true);
}

function testStaticOperationsUseScope() {
  const opsSrc = read("lib/school-server/school-operations.server.js");
  const usesScope =
    /loadSchoolClassInScope/.test(opsSrc) &&
    /reassignClassTeacher[\s\S]*loadSchoolClassInScope/.test(opsSrc);
  record("school-operations reassign/archive paths use loadSchoolClassInScope", usesScope);
  assert.equal(usesScope, true);
}

async function main() {
  console.log("school-phase4-class-scope-selftest\n");

  testPureValidClassInSameSchool();
  testPureCrossSchoolClassRejected();
  testPureGap01DualMembershipMismatchRejected();
  testPureTeacherNotInRosterRejected();
  testPureNullSchoolIdRejected();
  testPureMissingClassRowRejected();
  await testLoadSchoolClassInScopeIntegration();
  await testLoadSchoolClassInScopeValid();
  testStaticOrLogicRemoved();
  testStaticReportRouteUsesScopeBeforeReport();
  testStaticOperationsUseScope();

  const failed = results.filter((r) => !r.pass);
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\nschool-phase4-class-scope-selftest: ${passCount}/${results.length} PASS`);

  if (failed.length) {
    console.error("\nFailures:");
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
