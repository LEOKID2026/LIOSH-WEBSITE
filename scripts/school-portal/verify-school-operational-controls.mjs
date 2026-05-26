#!/usr/bin/env node
/**
 * Verify Phase 2 school operational APIs (T13–T16).
 * Each check reverses its mutation and restores exact demo baseline (108/398/2388).
 *
 *   node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=all
 */
import { createClient } from "@supabase/supabase-js";
import {
  PHYSICAL_CLASSES,
  SUBJECTS,
  classRecordKey,
  physicalClassName,
} from "./demo-school-data.mjs";
import {
  assertDemoSchoolBaseline,
  createServiceRole,
  importServerModule,
  loadSimState,
  requireEnv,
} from "./demo-school-lib.mjs";

function parseCheck(argv) {
  const idx = argv.indexOf("--check");
  return idx >= 0 ? argv[idx + 1] : "all";
}

async function getManagerToken() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const password = String(
    process.env.SCHOOL_QA_PASSWORD || process.env.DEMO_TEACHER_PASSWORD || ""
  ).trim();
  if (!password) {
    throw new Error("Missing SCHOOL_QA_PASSWORD or DEMO_TEACHER_PASSWORD");
  }
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: "school@leo-k.com",
    password,
  });
  if (error) throw error;
  return data.session?.access_token;
}

async function apiFetch(baseUrl, path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function countStudentOnPhysicalClasses(serviceRole, state, grade, section, studentId) {
  let active = 0;
  for (const subject of SUBJECTS) {
    const classId = state.classIds[classRecordKey(grade, section, subject)];
    const { count } = await serviceRole
      .from("teacher_class_students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .is("removed_at", null);
    active += count ?? 0;
  }
  return active;
}

async function checkTransfer(serviceRole, state, token, baseUrl) {
  const pc = PHYSICAL_CLASSES.find((p) => p.grade === 1 && p.section === 1);
  const pc2 = PHYSICAL_CLASSES.find((p) => p.grade === 1 && p.section === 2);
  const fromName = physicalClassName(pc.grade, pc.section);
  const toName = physicalClassName(pc2.grade, pc2.section);
  const studentId = state.studentsByPhysical?.["1:1"]?.studentIds?.[0];
  if (!studentId) throw new Error("No sample student for transfer check");

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });

  const res = await apiFetch(baseUrl, `/api/school/students/${studentId}/class-transfer`, {
    method: "POST",
    token,
    body: { fromPhysicalClass: fromName, toPhysicalClass: toName, gradeLevel: "1" },
  });
  if (res.status !== 200) {
    throw new Error(`transfer failed: ${res.status} ${JSON.stringify(res.json)}`);
  }

  const onFrom = await countStudentOnPhysicalClasses(serviceRole, state, 1, 1, studentId);
  const onTo = await countStudentOnPhysicalClasses(serviceRole, state, 1, 2, studentId);
  if (onFrom !== 0 || onTo !== 6) {
    throw new Error(`transfer roster mismatch from=${onFrom} to=${onTo} (expected 0/6)`);
  }

  const reverse = await apiFetch(baseUrl, `/api/school/students/${studentId}/class-transfer`, {
    method: "POST",
    token,
    body: { fromPhysicalClass: toName, toPhysicalClass: fromName, gradeLevel: "1" },
  });
  if (reverse.status !== 200) {
    throw new Error(`transfer reverse failed: ${reverse.status} ${JSON.stringify(reverse.json)}`);
  }

  const backFrom = await countStudentOnPhysicalClasses(serviceRole, state, 1, 1, studentId);
  const backTo = await countStudentOnPhysicalClasses(serviceRole, state, 1, 2, studentId);
  if (backFrom !== 6 || backTo !== 0) {
    throw new Error(`transfer reverse roster mismatch from=${backFrom} to=${backTo} (expected 6/0)`);
  }

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });
  console.log("check=transfer OK");
}

async function checkReassign(serviceRole, state, token, baseUrl) {
  const classId = state.classIds[classRecordKey(1, 1, "english")];
  const saraId = state.teacherIds.sara;
  const michalId = state.teacherIds.michal;

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });

  const { grantSchoolTeacherSubject } = await importServerModule(
    "lib/school-server/school-subjects.server.js"
  );
  await grantSchoolTeacherSubject(serviceRole, {
    schoolId: state.schoolId,
    teacherId: michalId,
    subject: "english",
    gradeLevel: "1",
    grantedBy: state.teacherIds.manager,
  }).catch(() => {});

  const { data: before } = await serviceRole
    .from("teacher_classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();

  const targetId = before.teacher_id === saraId ? michalId : saraId;

  const res = await apiFetch(baseUrl, `/api/school/classes/${classId}/assign-teacher`, {
    method: "PATCH",
    token,
    body: { teacherId: targetId },
  });
  if (res.status !== 200) throw new Error(`reassign failed: ${res.status}`);

  const { data: after } = await serviceRole
    .from("teacher_classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();
  if (after.teacher_id !== targetId) throw new Error("reassign teacher_id not updated");

  const undo = await apiFetch(baseUrl, `/api/school/classes/${classId}/assign-teacher`, {
    method: "PATCH",
    token,
    body: { teacherId: before.teacher_id },
  });
  if (undo.status !== 200) throw new Error(`reassign reverse failed: ${undo.status}`);

  const { data: restored } = await serviceRole
    .from("teacher_classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();
  if (restored.teacher_id !== before.teacher_id) {
    throw new Error("reassign did not restore original teacher");
  }

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });
  console.log("check=reassign OK");
}

async function checkArchive(serviceRole, state, token, baseUrl) {
  const classId = state.classIds[classRecordKey(6, 3, "science")];

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });

  const res = await apiFetch(baseUrl, `/api/school/classes/${classId}/archive`, {
    method: "POST",
    token,
  });
  if (res.status !== 200) throw new Error(`archive failed: ${res.status}`);

  const { data: row } = await serviceRole
    .from("teacher_classes")
    .select("is_archived")
    .eq("id", classId)
    .single();
  if (!row.is_archived) throw new Error("class not archived");

  const afterArchive = await assertDemoSchoolBaseline(serviceRole, state, { strict: false });
  if (afterArchive.activeClasses !== 107) {
    throw new Error(`expected 107 active classes while one archived, got ${afterArchive.activeClasses}`);
  }

  const { unarchiveSchoolClass } = await importServerModule(
    "lib/school-server/school-operations.server.js"
  );
  const unarchived = await unarchiveSchoolClass(serviceRole, {
    schoolId: state.schoolId,
    classId,
    managerId: state.teacherIds.manager,
  });
  if (!unarchived.ok) throw new Error(`unarchive failed: ${unarchived.code}`);

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });
  console.log("check=archive OK");
}

async function checkAuditLog(token, baseUrl) {
  const res = await apiFetch(baseUrl, "/api/school/audit-log?limit=20&offset=0", { token });
  if (res.status !== 200) throw new Error(`audit-log failed: ${res.status}`);
  if (!Array.isArray(res.json?.data?.entries)) throw new Error("audit-log missing entries");
  console.log("check=audit-log OK", { count: res.json.data.entries.length });
}

async function main() {
  const check = parseCheck(process.argv.slice(2));
  const state = loadSimState();
  const serviceRole = createServiceRole();
  const baseUrl = String(process.env.SCHOOL_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const token = await getManagerToken();

  const run = async (name, fn) => {
    if (check !== "all" && check !== name) return;
    await fn();
  };

  await run("transfer", () => checkTransfer(serviceRole, state, token, baseUrl));
  await run("reassign", () => checkReassign(serviceRole, state, token, baseUrl));
  await run("archive", () => checkArchive(serviceRole, state, token, baseUrl));
  await run("audit-log", () => checkAuditLog(token, baseUrl));

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });
  console.log(`verify-school-operational-controls: ${check} OK`);
}

main().catch((e) => {
  console.error("verify-school-operational-controls: FAIL", e.message || e);
  process.exit(1);
});
