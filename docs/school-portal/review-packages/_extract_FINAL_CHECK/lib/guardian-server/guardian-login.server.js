import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { maskStudentFullName } from "../teacher-server/teacher-students.server.js";
import { computeGuardianAccessState } from "../teacher-server/teacher-student-access.server.js";
import {
  hashStudentSecret,
  normalizeStudentPin,
  normalizeStudentUsername,
} from "./guardian-crypto.server.js";
import {
  GUARDIAN_SESSION_MAX_AGE_SECONDS,
  guardianRequestMeta,
  issueGuardianSession,
  resolveAuthenticatedGuardian,
} from "./guardian-session.server.js";

/**
 * Resolve guardian login when one username may map to multiple student_guardian_access rows
 * (school-linked multi-child credentials). PIN must match; optional studentId disambiguates.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} usernameNormalized
 * @param {string} pinNormalized
 * @param {string|null|undefined} studentIdOptional
 */
async function verifyGuardianCredentials(
  serviceRole,
  usernameNormalized,
  pinNormalized,
  studentIdOptional
) {
  const { data: rows, error } = await serviceRole
    .from("student_guardian_access")
    .select(
      "id, student_id, pin_hash, is_active, revoked_at, expires_at, created_by_teacher_id, must_change_pin, created_by_school_id"
    )
    .eq("login_username_normalized", usernameNormalized)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const pinHash = hashStudentSecret(pinNormalized);
  const matching = (rows || []).filter((row) => {
    const accessState = computeGuardianAccessState(row);
    if (accessState === "expired" || accessState === "revoked") {
      return false;
    }
    return row.pin_hash === pinHash;
  });

  if (!matching.length) {
    return { ok: false, status: 401, code: "invalid_credentials" };
  }

  if (studentIdOptional) {
    const picked = matching.find((row) => row.student_id === studentIdOptional);
    if (!picked) {
      return { ok: false, status: 401, code: "invalid_credentials" };
    }
    return { ok: true, accessRow: picked };
  }

  if (matching.length === 1) {
    return { ok: true, accessRow: matching[0] };
  }

  const studentIds = matching.map((row) => row.student_id);
  const { data: students } = await serviceRole
    .from("students")
    .select("id, full_name")
    .in("id", studentIds);

  const nameById = new Map((students || []).map((s) => [s.id, s.full_name]));

  return {
    ok: false,
    status: 409,
    code: "guardian_multiple_students",
    data: {
      students: matching.map((row) => ({
        studentId: row.student_id,
        studentFullNameMasked: maskStudentFullName(nameById.get(row.student_id)),
        isSchoolLinked: Boolean(row.created_by_school_id),
      })),
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} inviteToken
 */
async function verifyMagicLinkInvite(serviceRole, inviteToken) {
  const tokenHash = hashStudentSecret(inviteToken);
  const nowIso = new Date().toISOString();

  const { data: invite, error } = await serviceRole
    .from("teacher_access_invitations")
    .select(
      "id, student_id, teacher_id, expires_at, consumed_at, consumed_guardian_access_id"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!invite?.id || invite.consumed_at != null || invite.expires_at <= nowIso) {
    return { ok: false, status: 403, code: "invitation_invalid" };
  }

  let accessId = invite.consumed_guardian_access_id;
  if (!accessId) {
    const { data: access } = await serviceRole
      .from("student_guardian_access")
      .select("id")
      .eq("student_id", invite.student_id)
      .eq("created_by_teacher_id", invite.teacher_id)
      .eq("is_active", true)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    accessId = access?.id || null;
  }

  if (!accessId) {
    return { ok: false, status: 403, code: "invitation_invalid" };
  }

  const { data: accessRow, error: accessErr } = await serviceRole
    .from("student_guardian_access")
    .select("id, student_id, is_active, revoked_at, expires_at, created_by_teacher_id")
    .eq("id", accessId)
    .maybeSingle();

  if (accessErr || !accessRow?.id) {
    return { ok: false, status: 403, code: "invitation_invalid" };
  }

  if (computeGuardianAccessState(accessRow) !== "active") {
    return { ok: false, status: 403, code: "invitation_invalid" };
  }

  await serviceRole
    .from("teacher_access_invitations")
    .update({
      consumed_at: nowIso,
      consumed_guardian_access_id: accessRow.id,
    })
    .eq("id", invite.id);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: invite.teacher_id,
    studentId: accessRow.student_id,
    guardianAccessId: accessRow.id,
    action: "magic_link_consumed",
    actorRole: "guardian",
    actorId: accessRow.id,
    metadata: { student_id: accessRow.student_id, access_id: accessRow.id },
  });

  return { ok: true, accessRow };
}

/**
 * @param {{
 *   loginUsername?: string,
 *   pin?: string,
 *   studentId?: string,
 *   inviteToken?: string,
 *   req: import('http').IncomingMessage,
 * }} input
 */
export async function guardianLogin(input) {
  const serviceRole = getLearningSupabaseServiceRoleClient();
  const meta = guardianRequestMeta(input.req);
  let accessRow = null;

  if (input.inviteToken) {
    const inviteResult = await verifyMagicLinkInvite(serviceRole, input.inviteToken);
    if (!inviteResult.ok) {
      if (inviteResult.code === "invitation_invalid") {
        await writeTeacherAuditRow({
          serviceRole,
          action: "guardian_login_failed",
          actorRole: "system",
          actorId: null,
          metadata: { error_code: "invitation_invalid", ip_hash: meta.ipHash },
          ipHash: meta.ipHash,
          userAgent: meta.userAgent,
        });
      }
      return inviteResult;
    }
    accessRow = inviteResult.accessRow;
  } else {
    const username = normalizeStudentUsername(input.loginUsername || "");
    const pin = normalizeStudentPin(input.pin || "");
    if (!username || !/^[a-z0-9_-]{3,24}$/.test(username)) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return { ok: false, status: 400, code: "validation_failed" };
    }

    const studentId =
      typeof input.studentId === "string" && input.studentId.trim()
        ? input.studentId.trim()
        : null;

    const cred = await verifyGuardianCredentials(serviceRole, username, pin, studentId);
    if (!cred.ok) {
      if (cred.code === "guardian_multiple_students") {
        return cred;
      }
      if (cred.code === "invalid_credentials") {
        await writeTeacherAuditRow({
          serviceRole,
          action: "guardian_login_failed",
          actorRole: "system",
          actorId: null,
          metadata: { error_code: "invalid_credentials", ip_hash: meta.ipHash },
          ipHash: meta.ipHash,
          userAgent: meta.userAgent,
        });
      }
      return cred;
    }
    accessRow = cred.accessRow;
  }

  const session = await issueGuardianSession(serviceRole, accessRow.id, {
    userAgent: meta.userAgent,
    ipHash: meta.ipHash,
    accessExpiresAt: accessRow.expires_at,
  });
  if (!session.ok) return session;

  const { data: student } = await serviceRole
    .from("students")
    .select("full_name")
    .eq("id", accessRow.student_id)
    .maybeSingle();

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: accessRow.created_by_teacher_id,
    studentId: accessRow.student_id,
    guardianAccessId: accessRow.id,
    action: "guardian_login_success",
    actorRole: "guardian",
    actorId: accessRow.id,
    metadata: { student_id: accessRow.student_id, ip_hash: meta.ipHash },
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
  });

  const maxAgeSec = Math.min(
    GUARDIAN_SESSION_MAX_AGE_SECONDS,
    Math.max(
      60,
      Math.floor((new Date(session.sessionExpiresAt).getTime() - Date.now()) / 1000)
    )
  );

  return {
    ok: true,
    sessionToken: session.token,
    cookieMaxAgeSec: maxAgeSec,
    data: {
      studentId: accessRow.student_id,
      studentFullNameMasked: maskStudentFullName(student?.full_name),
      expiresAt: session.sessionExpiresAt,
      mustChangePin: Boolean(accessRow.must_change_pin),
      isSchoolLinked: Boolean(accessRow.created_by_school_id),
      flags: { uiCopyEnabled: true },
    },
  };
}

/**
 * @param {import('http').IncomingMessage} req
 */
export async function guardianLogout(req) {
  const ctx = await resolveAuthenticatedGuardian(req);
  if (!ctx.ok) {
    return { ok: true, alreadyLoggedOut: true };
  }

  const now = new Date().toISOString();
  await ctx.serviceRole
    .from("student_guardian_sessions")
    .update({ revoked_at: now })
    .eq("id", ctx.sessionId);

  return { ok: true, loggedOut: true };
}
