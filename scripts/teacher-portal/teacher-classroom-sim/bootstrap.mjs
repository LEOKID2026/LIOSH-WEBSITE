/**
 * Idempotent provisioning for teacher classroom simulation entities.
 * Uses service role only. Never touches admin@admin.com / AAA1-12 / ADMIN demo.
 *
 * Quota note: bootstrap inserts class members via service role (bypasses HTTP APIs).
 * STUDENT_COUNT (20) per class stays under the production 40-per-class cap.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  SIM_PARENT_EMAIL,
  SIM_TEACHER_EMAIL,
  SIM_STUDENT_NAME_PREFIX,
  SIM_TEACHER_DISPLAY_NAME,
  TEACHER_PLAN_CODE,
  STUDENT_COUNT,
  classNameForGrade,
  dbGradeLevel,
  studentFullName,
  studentUsername,
  studentLabel,
  requireEnv,
} from "./config.mjs";
import { saveManifest, loadManifest } from "./state.mjs";

function hashStudentSecret(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function normalizeUsername(raw) {
  return String(raw || "").toLowerCase().trim();
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data?.users?.find((u) => u.email === email);
    if (match?.id) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensureAuthUser(admin, { email, password, appMetadata, userMetadata }) {
  let user = await findAuthUserByEmail(admin, email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata || {},
      user_metadata: userMetadata || { source: "teacher-classroom-sim" },
    });
    if (created.error || !created.data.user?.id) {
      throw new Error(`createUser(${email}) failed: ${created.error?.message || "unknown"}`);
    }
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: { ...(user.app_metadata || {}), ...(appMetadata || {}) },
    });
  }
  return user.id;
}

async function ensureParentProfile(admin, parentId) {
  const { data, error } = await admin.from("parent_profiles").select("id").eq("id", parentId).maybeSingle();
  if (error) throw new Error(`parent_profiles lookup failed: ${error.message}`);
  if (data?.id) return;
  const { error: insErr } = await admin.from("parent_profiles").insert({ id: parentId });
  if (insErr && insErr.code !== "23505") {
    throw new Error(`parent_profiles insert failed: ${insErr.message}`);
  }
}

async function ensureTeacherProfile(admin, teacherId) {
  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id, access_prefix")
    .eq("id", teacherId)
    .maybeSingle();
  if (!profile?.id) {
    const { error } = await admin.from("teacher_profiles").insert({
      id: teacherId,
      display_name: SIM_TEACHER_DISPLAY_NAME,
      preferred_language: "he",
      access_prefix: "leo",
    });
    if (error && error.code !== "23505") {
      throw new Error(`teacher_profiles insert failed: ${error.message}`);
    }
  } else if (!profile.access_prefix) {
    const { error } = await admin
      .from("teacher_profiles")
      .update({ access_prefix: "leo" })
      .eq("id", teacherId);
    if (error) {
      throw new Error(`teacher_profiles access_prefix update failed: ${error.message}`);
    }
  }
  const { data: limits } = await admin
    .from("teacher_limits")
    .select("teacher_id, plan_code")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!limits?.teacher_id) {
    const { error } = await admin.from("teacher_limits").insert({
      teacher_id: teacherId,
      plan_code: TEACHER_PLAN_CODE,
    });
    if (error && error.code !== "23505") {
      throw new Error(`teacher_limits insert failed: ${error.message}`);
    }
  }
}

async function findStudentById(admin, studentId) {
  const { data, error } = await admin
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Error(`students lookup failed: ${error.message}`);
  return data;
}

async function findStudentByUsername(admin, username) {
  const loginUsername = normalizeUsername(username);
  const { data: codeRow, error: codeErr } = await admin
    .from("student_access_codes")
    .select("student_id")
    .eq("login_username", loginUsername)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();
  if (codeErr) throw new Error(`student_access_codes lookup failed: ${codeErr.message}`);
  if (!codeRow?.student_id) return null;
  return findStudentById(admin, codeRow.student_id);
}

async function findStudentByNameAndParent(admin, parentId, fullName) {
  const { data, error } = await admin
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .eq("parent_id", parentId)
    .eq("full_name", fullName)
    .maybeSingle();
  if (error) throw new Error(`students lookup failed: ${error.message}`);
  return data;
}

async function ensureStudentAccessCode(admin, { studentId, username, pin, accessSecret }) {
  const loginUsername = normalizeUsername(username);
  const codeHash = hashStudentSecret(loginUsername, accessSecret);
  const pinHash = hashStudentSecret(pin, accessSecret);

  const { data: existing } = await admin
    .from("student_access_codes")
    .select("id, student_id, login_username, is_active")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing?.id) {
    if (existing.login_username !== loginUsername) {
      const { error: updErr } = await admin
        .from("student_access_codes")
        .update({ login_username: loginUsername, code_hash: codeHash, pin_hash: pinHash })
        .eq("id", existing.id);
      if (updErr) throw new Error(`student_access_codes update failed: ${updErr.message}`);
    }
    return existing.id;
  }

  const { error: insErr } = await admin.from("student_access_codes").insert({
    student_id: studentId,
    login_username: loginUsername,
    code_hash: codeHash,
    pin_hash: pinHash,
    is_active: true,
  });
  if (insErr) throw new Error(`student_access_codes insert failed: ${insErr.message}`);
  return null;
}

async function ensureStudent(admin, { parentId, gradeKey, slot, pin, accessSecret, stats, manifestStudentId }) {
  const fullName = studentFullName(slot);
  const username = studentUsername(gradeKey, slot);
  let row = null;

  if (manifestStudentId) {
    row = await findStudentById(admin, manifestStudentId);
    if (row?.id && row.parent_id !== parentId) {
      throw new Error(`student ${manifestStudentId} is not owned by sim parent`);
    }
  }
  if (!row?.id) {
    row = await findStudentByUsername(admin, username);
    if (row?.id && row.parent_id !== parentId) {
      throw new Error(`student username ${username} is not owned by sim parent`);
    }
  }
  if (!row?.id) {
    row = await findStudentByNameAndParent(admin, parentId, fullName);
  }

  if (!row?.id) {
    const { data, error } = await admin
      .from("students")
      .insert({
        parent_id: parentId,
        full_name: fullName,
        grade_level: dbGradeLevel(gradeKey),
        is_active: true,
      })
      .select("id, full_name")
      .single();
    if (error) throw new Error(`students insert (${fullName}) failed: ${error.message}`);
    row = data;
    stats.studentsCreated += 1;
  } else {
    stats.studentsReused += 1;
    if (row.grade_level !== dbGradeLevel(gradeKey)) {
      await admin.from("students").update({ grade_level: dbGradeLevel(gradeKey) }).eq("id", row.id);
    }
  }

  await ensureStudentAccessCode(admin, { studentId: row.id, username, pin, accessSecret });
  return {
    slot,
    label: studentLabel(slot),
    id: row.id,
    username,
    fullName: row.full_name,
  };
}

async function ensureClass(admin, { teacherId, gradeKey, stats }) {
  const name = classNameForGrade(gradeKey);
  const { data: existing } = await admin
    .from("teacher_classes")
    .select("id, name, grade_level")
    .eq("teacher_id", teacherId)
    .eq("grade_level", gradeKey)
    .eq("name", name)
    .eq("is_archived", false)
    .maybeSingle();

  if (existing?.id) {
    stats.classReused = true;
    return existing.id;
  }

  const { data, error } = await admin
    .from("teacher_classes")
    .insert({
      teacher_id: teacherId,
      name,
      grade_level: gradeKey,
      subject_focus: null,
      color_hint: "sim",
      is_archived: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(`teacher_classes insert failed: ${error.message}`);
  stats.classCreated = true;
  return data.id;
}

async function ensureTeacherStudentLink(admin, teacherId, studentId) {
  const { data } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .is("archived_at", null)
    .maybeSingle();
  if (data?.id) return;
  const { error } = await admin.from("teacher_students").insert({
    teacher_id: teacherId,
    student_id: studentId,
    relationship: "primary_teacher",
    notes: "qa-classroom-sim",
  });
  if (error && error.code !== "23505") {
    throw new Error(`teacher_students insert failed: ${error.message}`);
  }
}

async function ensureClassMember(admin, classId, studentId) {
  const { data } = await admin
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .is("removed_at", null)
    .maybeSingle();
  if (data?.id) return;
  const { error } = await admin.from("teacher_class_students").insert({
    class_id: classId,
    student_id: studentId,
  });
  if (error && error.code !== "23505") {
    throw new Error(`teacher_class_students insert failed: ${error.message}`);
  }
}

export function createAdminClient() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function bootstrapSimulation({
  grade,
  stateDir,
  teacherPassword,
  parentPassword,
  studentPin,
  log = console.log,
}) {
  const admin = createAdminClient();
  const accessSecret = requireEnv("LEARNING_STUDENT_ACCESS_SECRET");

  const stats = { studentsCreated: 0, studentsReused: 0, classCreated: false, classReused: false };

  log("bootstrap: ensuring dedicated sim parent auth user…");
  const parentId = await ensureAuthUser(admin, {
    email: SIM_PARENT_EMAIL,
    password: parentPassword,
    userMetadata: { source: "teacher-classroom-sim-parent" },
  });
  await ensureParentProfile(admin, parentId);

  log("bootstrap: ensuring dedicated sim teacher auth user…");
  const teacherId = await ensureAuthUser(admin, {
    email: SIM_TEACHER_EMAIL,
    password: teacherPassword,
    appMetadata: { role: "teacher" },
    userMetadata: { source: "teacher-classroom-sim-teacher" },
  });
  await ensureTeacherProfile(admin, teacherId);

  const existingManifest = stateDir ? loadManifest(stateDir) : null;

  const students = [];
  for (let slot = 1; slot <= STUDENT_COUNT; slot++) {
    const manifestStudentId = existingManifest?.students?.find((s) => s.slot === slot)?.id || null;
    const entry = await ensureStudent(admin, {
      parentId,
      gradeKey: grade,
      slot,
      pin: studentPin,
      accessSecret,
      stats,
      manifestStudentId,
    });
    students.push(entry);
  }

  const classId = await ensureClass(admin, { teacherId, gradeKey: grade, stats });

  for (const s of students) {
    await ensureTeacherStudentLink(admin, teacherId, s.id);
    await ensureClassMember(admin, classId, s.id);
  }

  const manifest = {
    version: 1,
    grade,
    parentId,
    teacherId,
    classId,
    parentEmail: SIM_PARENT_EMAIL,
    teacherEmail: SIM_TEACHER_EMAIL,
    students,
    provisionedAt: new Date().toISOString(),
  };

  saveManifest(stateDir, manifest);

  log(
    `bootstrap: done — students created=${stats.studentsCreated} reused=${stats.studentsReused} classId=${classId}`
  );

  return { admin, manifest, stats };
}

/**
 * Reset learning activity ONLY for dedicated sim students (by manifest IDs + name prefix).
 */
export async function resetSimActivity(admin, manifest, log = console.log) {
  if (!manifest?.parentId || !Array.isArray(manifest.students)) {
    throw new Error("resetSimActivity: invalid manifest");
  }

  const studentIds = [];
  for (const s of manifest.students) {
    const { data: row, error } = await admin
      .from("students")
      .select("id, full_name, parent_id")
      .eq("id", s.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.id) continue;
    if (row.parent_id !== manifest.parentId) {
      throw new Error(`reset blocked: student ${s.id} is not owned by sim parent`);
    }
    studentIds.push(row.id);
  }

  if (studentIds.length === 0) {
    log("reset: no sim students to reset");
    return { sessionsDeleted: 0, answersDeleted: 0 };
  }

  log(`reset: deleting learning activity for ${studentIds.length} sim students only…`);

  const { data: sessions } = await admin
    .from("learning_sessions")
    .select("id")
    .in("student_id", studentIds);
  const sessionIds = (sessions || []).map((r) => r.id);

  let answersDeleted = 0;
  if (sessionIds.length) {
    const { count, error: ansErr } = await admin
      .from("answers")
      .delete({ count: "exact" })
      .in("learning_session_id", sessionIds);
    if (ansErr) throw new Error(`answers delete failed: ${ansErr.message}`);
    answersDeleted = count || 0;
  }

  const { count: sessCount, error: sessErr } = await admin
    .from("learning_sessions")
    .delete({ count: "exact" })
    .in("student_id", studentIds);
  if (sessErr) throw new Error(`learning_sessions delete failed: ${sessErr.message}`);

  log(`reset: deleted sessions=${sessCount || 0} answers=${answersDeleted}`);
  return { sessionsDeleted: sessCount || 0, answersDeleted };
}

/**
 * Read-only safety check: AAA/admin accounts unchanged.
 */
export async function verifyUntouchedAccounts(admin) {
  const checks = [];

  const adminUser = await findAuthUserByEmail(admin, "admin@admin.com");
  if (adminUser?.id) {
    const { count } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", adminUser.id);
    checks.push({ name: "admin@admin.com student count", value: count });
  } else {
    checks.push({ name: "admin@admin.com student count", value: "parent not found (skipped)" });
  }

  const aaaUsernames = Array.from({ length: 12 }, (_, i) => `aaa${i + 1}`);
  const { data: aaaStudents } = await admin
    .from("student_access_codes")
    .select("login_username, student_id")
    .in("login_username", aaaUsernames)
    .eq("is_active", true);
  checks.push({ name: "AAA1-12 access codes still active", value: (aaaStudents || []).length });

  const { data: demoStudent } = await admin
    .from("students")
    .select("id, full_name")
    .eq("full_name", "ישראל ישראלי")
    .maybeSingle();
  checks.push({ name: "ADMIN demo student (ישראל ישראלי) exists", value: demoStudent?.id ? "yes" : "no" });

  return checks;
}
