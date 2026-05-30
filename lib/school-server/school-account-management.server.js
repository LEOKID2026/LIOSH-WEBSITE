import crypto from "node:crypto";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import {
  computeGuardianAccessState,
} from "../teacher-server/teacher-student-access.server.js";
import {
  computeStudentLoginAccessState,
  endLiveStudentSessions,
} from "../teacher-server/teacher-student-login-access.server.js";
import { revokeLiveGuardianSessionsForAccess } from "../guardian-server/guardian-session.server.js";
import {
  generateStudentPin,
  hashStudentSecret,
  normalizeStudentPin,
  normalizeStudentUsername,
} from "../guardian-server/guardian-crypto.server.js";
import { verifyStudentVisibleToSchool } from "./school-scope.server.js";
import {
  allocateSchoolAccessUsername,
  SCHOOL_ACCESS_KIND_PARENT,
  SCHOOL_ACCESS_KIND_STUDENT,
} from "./school-access-username.server.js";

export function generateSchoolParentPin() {
  let pin = "";
  for (let i = 0; i < 6; i += 1) {
    pin += String(crypto.randomInt(0, 10));
  }
  return pin;
}

const VALID_RELATIONS = new Set(["mother", "father", "guardian", "other"]);

async function lastGuardianLoginAt(serviceRole, accessId) {
  const { data } = await serviceRole
    .from("teacher_access_audit")
    .select("created_at")
    .eq("guardian_access_id", accessId)
    .eq("action", "guardian_login_success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at || null;
}

function mapStudentAccessRow(row, lastLogin) {
  const state = computeStudentLoginAccessState(row);
  let status = "not_created";
  if (row?.id) {
    if (state === "active") status = row.is_active === false ? "blocked" : "active";
    else if (state === "revoked") status = "revoked";
    else status = "blocked";
  }
  return {
    accessId: row?.id || null,
    loginUsername: row?.login_username || null,
    status,
    lastLoginAt: lastLogin,
    createdBySchool: Boolean(row?.created_by_school_id),
  };
}

function isSchoolIssuedRow(row, schoolId) {
  return Boolean(row?.created_by_school_id && row.created_by_school_id === schoolId);
}

function pickSchoolStudentAccessRow(studentCodes, schoolId) {
  const schoolRows = (studentCodes || []).filter((row) => isSchoolIssuedRow(row, schoolId));
  const active = schoolRows.find((row) => computeStudentLoginAccessState(row) === "active");
  if (active) return active;
  return schoolRows[0] || null;
}

function pickLegacyStudentAccessRow(studentCodes, schoolId) {
  const legacyRows = (studentCodes || []).filter((row) => !isSchoolIssuedRow(row, schoolId));
  const active = legacyRows.find((row) => computeStudentLoginAccessState(row) === "active");
  return active || legacyRows[0] || null;
}

function mapParentAccessRow(row, lastLogin) {
  const state = computeGuardianAccessState(row);
  let status = "not_created";
  if (row?.id) {
    if (state === "active") status = row.is_active === false ? "blocked" : "active";
    else if (state === "revoked") status = "revoked";
    else status = "blocked";
  }
  return {
    accessId: row.id,
    studentId: row.student_id,
    loginUsername: row.login_username,
    status,
    relation: row.guardian_relation || null,
    displayLabel: row.guardian_display_label || null,
    mustChangePin: Boolean(row.must_change_pin),
    lastLoginAt: lastLogin,
    createdBySchool: Boolean(row.created_by_school_id),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function listSchoolStudentAccounts(serviceRole, schoolId, studentId) {
  const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, studentId);
  if (!visible.ok) return visible;

  const { data: studentCodes, error: scErr } = await serviceRole
    .from("student_access_codes")
    .select("id, login_username, is_active, revoked_at, expires_at, created_at, created_by_school_id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (scErr) {
    if (isDbSchemaNotReadyError(scErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const schoolStudentRow = pickSchoolStudentAccessRow(studentCodes, schoolId);
  const legacyStudentRow = pickLegacyStudentAccessRow(studentCodes, schoolId);

  const { data: parents, error: pErr } = await serviceRole
    .from("student_guardian_access")
    .select(
      "id, student_id, login_username, is_active, revoked_at, expires_at, created_at, created_by_school_id, must_change_pin, guardian_relation, guardian_display_label"
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (pErr) {
    if (isDbSchemaNotReadyError(pErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const schoolParentRows = [];
  const legacyParentRows = [];
  for (const row of parents || []) {
    const lastLogin = await lastGuardianLoginAt(serviceRole, row.id);
    const mapped = mapParentAccessRow(row, lastLogin);
    if (isSchoolIssuedRow(row, schoolId)) schoolParentRows.push(mapped);
    else legacyParentRows.push({ ...mapped, isLegacy: true });
  }

  return {
    ok: true,
    data: {
      studentAccess: mapStudentAccessRow(schoolStudentRow, null),
      legacyStudentAccess: legacyStudentRow
        ? { ...mapStudentAccessRow(legacyStudentRow, null), isLegacy: true }
        : null,
      parentAccesses: schoolParentRows,
      legacyParentAccesses: legacyParentRows,
    },
  };
}

async function assertSchoolStudent(serviceRole, schoolId, studentId) {
  const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, studentId);
  if (!visible.ok) return visible;
  return { ok: true };
}

async function findActiveSchoolStudentCode(serviceRole, schoolId, studentId) {
  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, login_username, is_active, revoked_at, expires_at, created_by_school_id")
    .eq("student_id", studentId)
    .eq("created_by_school_id", schoolId)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const row = (data || []).find((r) => computeStudentLoginAccessState(r) === "active");
  return { ok: true, row: row || null };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   schoolId: string,
 *   managerId: string,
 *   studentId: string,
 * }} input
 */
export async function createSchoolStudentAccess(input) {
  const { serviceRole, schoolId, managerId, studentId } = input;
  const check = await assertSchoolStudent(serviceRole, schoolId, studentId);
  if (!check.ok) return check;

  const existing = await findActiveSchoolStudentCode(serviceRole, schoolId, studentId);
  if (!existing.ok) return existing;
  if (existing.row?.id) {
    return { ok: false, status: 409, code: "active_access_exists" };
  }

  const usernameGen = await allocateSchoolAccessUsername(
    serviceRole,
    schoolId,
    SCHOOL_ACCESS_KIND_STUDENT,
    { studentId }
  );
  if (!usernameGen.ok) return usernameGen;

  const pinPlain = generateStudentPin();
  const pin = normalizeStudentPin(pinPlain);
  const usernameNormalized = usernameGen.loginUsernameNormalized;
  const codeHash = hashStudentSecret(usernameNormalized);
  const pinHash = hashStudentSecret(pin);

  const { data: inserted, error: insErr } = await serviceRole
    .from("student_access_codes")
    .insert({
      student_id: studentId,
      login_username: usernameGen.loginUsername,
      code_hash: codeHash,
      pin_hash: pinHash,
      is_active: true,
      created_by_school_id: schoolId,
    })
    .select("id")
    .single();

  if (insErr) {
    if (isDbSchemaNotReadyError(insErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    action: "school_student_access_created",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: inserted.id },
  });

  return {
    ok: true,
    data: {
      accessId: inserted.id,
      loginUsername: usernameGen.loginUsername,
      loginPinOnce: pinPlain,
      mustChangePinOnFirstLogin: false,
    },
  };
}

async function loadSchoolStudentCode(serviceRole, schoolId, studentId, accessId) {
  if (!isUuid(accessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  const check = await assertSchoolStudent(serviceRole, schoolId, studentId);
  if (!check.ok) return check;

  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, student_id, is_active, revoked_at, expires_at, login_username, created_by_school_id")
    .eq("id", accessId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!data?.id) {
    return { ok: false, status: 404, code: "access_not_found" };
  }
  if (!isSchoolIssuedRow(data, schoolId)) {
    return { ok: false, status: 403, code: "not_school_issued_access" };
  }
  return { ok: true, row: data };
}

export async function rotateSchoolStudentPin(input) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolStudentCode(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;
  if (computeStudentLoginAccessState(loaded.row) !== "active") {
    return { ok: false, status: 409, code: "access_not_active" };
  }

  const pinPlain = generateStudentPin();
  const pinHash = hashStudentSecret(normalizeStudentPin(pinPlain));
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_access_codes")
    .update({ pin_hash: pinHash, updated_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await endLiveStudentSessions(serviceRole, studentId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    action: "school_student_pin_rotated",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return {
    ok: true,
    data: { accessId, loginPinOnce: pinPlain, mustChangePinOnFirstLogin: false },
  };
}

export async function setSchoolStudentBlocked(input, blocked) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolStudentCode(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;
  if (loaded.row.revoked_at) {
    return { ok: false, status: 409, code: "access_revoked" };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_access_codes")
    .update({ is_active: !blocked, updated_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (blocked) {
    await endLiveStudentSessions(serviceRole, studentId);
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    action: blocked ? "school_student_access_blocked" : "school_student_access_unblocked",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return { ok: true, data: { accessId, blocked } };
}

export async function revokeSchoolStudentAccess(input) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolStudentCode(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;
  if (loaded.row.revoked_at) {
    return { ok: false, status: 409, code: "already_revoked" };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_access_codes")
    .update({ is_active: false, revoked_at: now, updated_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await endLiveStudentSessions(serviceRole, studentId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    action: "school_student_access_revoked",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return { ok: true, data: { accessId, revokedAt: now } };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 * @param {string} accessId
 */
async function loadSchoolParentAccess(serviceRole, schoolId, studentId, accessId) {
  if (!isUuid(accessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  const check = await assertSchoolStudent(serviceRole, schoolId, studentId);
  if (!check.ok) return check;

  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select(
      "id, student_id, is_active, revoked_at, expires_at, login_username, created_by_school_id, must_change_pin"
    )
    .eq("id", accessId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!data?.id) {
    return { ok: false, status: 404, code: "access_not_found" };
  }
  if (!isSchoolIssuedRow(data, schoolId)) {
    return { ok: false, status: 403, code: "not_school_issued_access" };
  }
  return { ok: true, row: data };
}

export async function createSchoolParentAccess(input) {
  const { serviceRole, schoolId, managerId, studentId, relation, displayLabel } = input;
  const check = await assertSchoolStudent(serviceRole, schoolId, studentId);
  if (!check.ok) return check;

  if (!VALID_RELATIONS.has(relation)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const usernameGen = await allocateSchoolAccessUsername(
    serviceRole,
    schoolId,
    SCHOOL_ACCESS_KIND_PARENT,
    { studentId }
  );
  if (!usernameGen.ok) return usernameGen;

  const pinPlain = generateSchoolParentPin();
  const pin = normalizeStudentPin(pinPlain);
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  const pinHash = hashStudentSecret(pin);
  const codeHash = hashStudentSecret(usernameGen.loginUsernameNormalized);

  const { data: inserted, error: insErr } = await serviceRole
    .from("student_guardian_access")
    .insert({
      student_id: studentId,
      created_by_teacher_id: managerId,
      created_by_school_id: schoolId,
      login_username: usernameGen.loginUsername,
      login_username_normalized: usernameGen.loginUsernameNormalized,
      code_hash: codeHash,
      pin_hash: pinHash,
      delivery_channel: "code",
      is_active: true,
      expires_at: null,
      must_change_pin: true,
      guardian_relation: relation,
      guardian_display_label: displayLabel || null,
    })
    .select("id")
    .single();

  if (insErr) {
    if (isDbSchemaNotReadyError(insErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    guardianAccessId: inserted.id,
    action: "school_parent_access_created",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: inserted.id, relation },
  });

  return {
    ok: true,
    data: {
      accessId: inserted.id,
      loginUsername: usernameGen.loginUsername,
      loginPinOnce: pinPlain,
      mustChangePinOnFirstLogin: true,
    },
  };
}

export async function rotateSchoolParentPin(input) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolParentAccess(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;
  if (computeGuardianAccessState(loaded.row) !== "active") {
    return { ok: false, status: 409, code: "access_not_active" };
  }

  const pinPlain = generateSchoolParentPin();
  const pinHash = hashStudentSecret(normalizeStudentPin(pinPlain));
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({
      pin_hash: pinHash,
      must_change_pin: true,
      updated_at: now,
    })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    guardianAccessId: accessId,
    action: "school_parent_pin_rotated",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return {
    ok: true,
    data: {
      accessId,
      loginPinOnce: pinPlain,
      mustChangePinOnFirstLogin: true,
    },
  };
}

export async function setSchoolParentBlocked(input, blocked) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolParentAccess(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;
  if (loaded.row.revoked_at) {
    return { ok: false, status: 409, code: "access_revoked" };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({ is_active: !blocked, updated_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (blocked) {
    await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    guardianAccessId: accessId,
    action: blocked ? "school_parent_access_blocked" : "school_parent_access_unblocked",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return { ok: true, data: { accessId, blocked } };
}

export async function revokeSchoolParentAccess(input) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolParentAccess(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;
  if (loaded.row.revoked_at) {
    return { ok: false, status: 409, code: "already_revoked" };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({
      is_active: false,
      revoked_at: now,
      revoked_by_teacher_id: managerId,
      updated_at: now,
    })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    guardianAccessId: accessId,
    action: "school_parent_access_revoked",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return { ok: true, data: { accessId, revokedAt: now } };
}

/**
 * Deferred: one parent credential → multiple children requires stable login disambiguation.
 * Use createSchoolParentAccess per child until multi-child portal ships.
 */
export async function linkSchoolParentByUsername(_input) {
  return {
    ok: false,
    status: 501,
    code: "multi_child_link_deferred",
  };
}

export async function unlinkSchoolParentFromStudent(input) {
  const { serviceRole, schoolId, managerId, studentId, accessId } = input;
  const loaded = await loadSchoolParentAccess(serviceRole, schoolId, studentId, accessId);
  if (!loaded.ok) return loaded;

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({
      is_active: false,
      revoked_at: now,
      revoked_by_teacher_id: managerId,
      updated_at: now,
    })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    guardianAccessId: accessId,
    action: "school_parent_unlinked_from_student",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, access_id: accessId },
  });

  return { ok: true, data: { accessId, unlinked: true } };
}

/**
 * Guardian changes PIN after school-issued login.
 */
export async function guardianChangePin(input) {
  const { serviceRole, guardianAccessId, currentPin, newPin } = input;
  if (!isUuid(guardianAccessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const newNormalized = normalizeStudentPin(newPin);
  if (!/^\d{6}$/.test(newNormalized)) {
    return { ok: false, status: 400, code: "pin_invalid_length" };
  }

  const { data: row, error } = await serviceRole
    .from("student_guardian_access")
    .select("id, student_id, pin_hash, must_change_pin, is_active, revoked_at, expires_at, created_by_teacher_id")
    .eq("id", guardianAccessId)
    .maybeSingle();

  if (error || !row?.id) {
    return { ok: false, status: 404, code: "access_not_found" };
  }

  if (computeGuardianAccessState(row) !== "active") {
    return { ok: false, status: 403, code: "access_not_active" };
  }

  const currentNormalized = normalizeStudentPin(currentPin);
  const currentHash = hashStudentSecret(currentNormalized);

  if (currentHash !== row.pin_hash) {
    return { ok: false, status: 401, code: "invalid_current_pin" };
  }

  const newHash = hashStudentSecret(newNormalized);
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({
      pin_hash: newHash,
      must_change_pin: false,
      updated_at: now,
    })
    .eq("id", guardianAccessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: row.created_by_teacher_id,
    studentId: row.student_id,
    guardianAccessId,
    action: "school_parent_pin_changed_by_parent",
    actorRole: "guardian",
    actorId: guardianAccessId,
    metadata: {},
  });

  return { ok: true, data: { mustChangePin: false, changedAt: now } };
}
