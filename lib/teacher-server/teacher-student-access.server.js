import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { writeTeacherAuditRow } from "./teacher-audit.server.js";
import { teacherHasReportAccessToStudent } from "./teacher-report.server.js";
import { isUuid } from "./teacher-request.server.js";
import { generateTeacherPrefixedGuardianUsername } from "./teacher-access-prefix.server.js";
import {
  generateMagicLinkToken,
  generateStudentPin,
  hashStudentSecret,
  normalizeStudentPin,
  requestOriginBase,
} from "../guardian-server/guardian-crypto.server.js";
import { revokeLiveGuardianSessionsForAccess } from "../guardian-server/guardian-session.server.js";

const DEFAULT_EXPIRES_DAYS = 30;
const MAX_EXPIRES_DAYS = 90;
const MAGIC_LINK_DAYS = 7;

/**
 * @param {Record<string, unknown>} row
 * @param {string} nowIso
 */
export function computeGuardianAccessState(row, nowIso = new Date().toISOString()) {
  if (!row) return "revoked";
  if (row.revoked_at != null || row.is_active === false) return "revoked";
  if (row.expires_at && row.expires_at <= nowIso) return "expired";
  return "active";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function assertTeacherCanManageStudentAccess(serviceRole, teacherId, studentId) {
  const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
  if (!access.ok) return access;
  if (!access.allowed) {
    return { ok: false, status: 403, code: "student_not_linked" };
  }
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function generateUniqueGuardianUsername(serviceRole, teacherId, studentId = null) {
  return generateTeacherPrefixedGuardianUsername(serviceRole, teacherId, studentId);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
async function findActiveAccessForTeacherStudent(serviceRole, teacherId, studentId) {
  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select("id, expires_at, revoked_at, is_active")
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const nowIso = new Date().toISOString();
  const active = (data || []).find((row) => computeGuardianAccessState(row, nowIso) === "active");
  return { ok: true, row: active || null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ studentId?: string, state?: string }} filters
 */
export async function listTeacherGuardianAccess(serviceRole, teacherId, filters = {}) {
  let query = serviceRole
    .from("student_guardian_access")
    .select(
      "id, student_id, login_username, is_active, revoked_at, expires_at, created_at, delivery_channel"
    )
    .eq("created_by_teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.studentId) {
    const linked = await assertTeacherCanManageStudentAccess(
      serviceRole,
      teacherId,
      filters.studentId
    );
    if (!linked.ok) return linked;
    query = query.eq("student_id", filters.studentId);
  }

  const { data, error } = await query;
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const stateFilter = filters.state || "active";
  const nowIso = new Date().toISOString();
  const accessIds = (data || []).map((r) => r.id);

  const lastLoginMap = new Map();
  if (accessIds.length) {
    const { data: audits } = await serviceRole
      .from("teacher_access_audit")
      .select("guardian_access_id, created_at")
      .in("guardian_access_id", accessIds)
      .eq("action", "guardian_login_success")
      .order("created_at", { ascending: false })
      .limit(200);

    for (const row of audits || []) {
      if (row.guardian_access_id && !lastLoginMap.has(row.guardian_access_id)) {
        lastLoginMap.set(row.guardian_access_id, row.created_at);
      }
    }
  }

  const accesses = [];
  for (const row of data || []) {
    const state = computeGuardianAccessState(row, nowIso);
    if (stateFilter !== "all" && state !== stateFilter) continue;
    accesses.push({
      accessId: row.id,
      studentId: row.student_id,
      state,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      deliveryChannel: row.delivery_channel,
      loginUsername: row.login_username,
      lastLoginSucceededAt: lastLoginMap.get(row.id) || null,
    });
  }

  return { ok: true, accesses };
}

/**
 * @param {object} body
 */
export function parseCreateGuardianAccessBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const studentId = raw.studentId;
  if (!isUuid(studentId)) {
    return { ok: false, code: "validation_failed", field: "studentId" };
  }

  let expiresInDays = raw.expiresInDays;
  if (expiresInDays == null || expiresInDays === "") {
    expiresInDays = DEFAULT_EXPIRES_DAYS;
  } else {
    expiresInDays = Number.parseInt(String(expiresInDays), 10);
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > MAX_EXPIRES_DAYS) {
      return { ok: false, code: "expiry_out_of_range", field: "expiresInDays" };
    }
  }

  const deliveryChannel = String(raw.deliveryChannel || "code").trim();
  if (!["code", "magic_link", "email_invite"].includes(deliveryChannel)) {
    return { ok: false, code: "validation_failed", field: "deliveryChannel" };
  }
  if (deliveryChannel === "email_invite") {
    return { ok: false, code: "delivery_channel_not_implemented", field: "deliveryChannel" };
  }

  let notes = raw.notes;
  if (notes != null) {
    if (typeof notes !== "string") return { ok: false, code: "validation_failed", field: "notes" };
    notes = notes.trim();
    if (notes.length > 500) return { ok: false, code: "validation_failed", field: "notes" };
    if (!notes) notes = null;
  } else {
    notes = null;
  }

  return {
    ok: true,
    studentId: String(studentId).trim(),
    expiresInDays,
    deliveryChannel,
    notes,
  };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   expiresInDays: number,
 *   deliveryChannel: string,
 *   req: import('http').IncomingMessage,
 * }} input
 */
export async function createTeacherGuardianAccess(input) {
  const { serviceRole, teacherId, studentId, expiresInDays, deliveryChannel, req } = input;

  const linked = await assertTeacherCanManageStudentAccess(serviceRole, teacherId, studentId);
  if (!linked.ok) return linked;

  const existing = await findActiveAccessForTeacherStudent(serviceRole, teacherId, studentId);
  if (!existing.ok) return existing;
  if (existing.row?.id) {
    return { ok: false, status: 409, code: "active_access_exists" };
  }

  const usernameGen = await generateTeacherPrefixedGuardianUsername(serviceRole, teacherId, studentId);
  if (!usernameGen.ok) return usernameGen;

  const pinPlain = generateStudentPin();
  const pin = normalizeStudentPin(pinPlain);
  const username = usernameGen.loginUsername;
  const usernameNormalized = usernameGen.loginUsernameNormalized;
  const codeHash = hashStudentSecret(usernameNormalized);
  const pinHash = hashStudentSecret(pin);

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + expiresInDays);
  const expiresAtIso = expiresAt.toISOString();

  const { data: inserted, error: insErr } = await serviceRole
    .from("student_guardian_access")
    .insert({
      student_id: studentId,
      created_by_teacher_id: teacherId,
      login_username: username,
      login_username_normalized: usernameNormalized,
      code_hash: codeHash,
      pin_hash: pinHash,
      delivery_channel: deliveryChannel,
      is_active: true,
      expires_at: expiresAtIso,
    })
    .select("id")
    .single();

  if (insErr) {
    if (isDbSchemaNotReadyError(insErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const accessId = inserted.id;
  let magicLink = null;

  if (deliveryChannel === "magic_link") {
    const inviteToken = generateMagicLinkToken();
    const tokenHash = hashStudentSecret(inviteToken);
    const inviteExpires = new Date();
    inviteExpires.setUTCDate(inviteExpires.getUTCDate() + MAGIC_LINK_DAYS);

    const { error: invErr } = await serviceRole.from("teacher_access_invitations").insert({
      student_id: studentId,
      teacher_id: teacherId,
      token_hash: tokenHash,
      expires_at: inviteExpires.toISOString(),
      consumed_guardian_access_id: accessId,
    });

    if (invErr) {
      await serviceRole
        .from("student_guardian_access")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", accessId);
      return { ok: false, status: 500, code: "internal_error" };
    }

    const base = requestOriginBase(req) || "";
    magicLink = base
      ? `${base}/guardian/login?invite=${encodeURIComponent(inviteToken)}`
      : `/guardian/login?invite=${encodeURIComponent(inviteToken)}`;

    await writeTeacherAuditRow({
      serviceRole,
      teacherId,
      studentId,
      guardianAccessId: accessId,
      action: "magic_link_issued",
      actorRole: "teacher",
      actorId: teacherId,
      metadata: {
        student_id: studentId,
        access_id: accessId,
        expires_at: expiresAtIso,
        delivery_channel: deliveryChannel,
      },
    });
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    studentId,
    guardianAccessId: accessId,
    action: "grant_created",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: {
      student_id: studentId,
      access_id: accessId,
      delivery_channel: deliveryChannel,
      expires_at: expiresAtIso,
    },
  });

  return {
    ok: true,
    data: {
      accessId,
      studentId,
      loginUsername: username,
      loginPinPlaintext: pinPlain,
      expiresAt: expiresAtIso,
      magicLink,
      shownOnceWarning:
        "Plaintext PIN/magic-link will not be retrievable after this response. Store securely.",
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} accessId
 */
export async function loadTeacherOwnedGuardianAccess(serviceRole, teacherId, accessId) {
  if (!isUuid(accessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select("id, student_id, created_by_teacher_id, is_active, revoked_at, expires_at")
    .eq("id", accessId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id || data.created_by_teacher_id !== teacherId) {
    return { ok: false, status: 404, code: "access_not_found" };
  }

  return { ok: true, row: data };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   accessId: string,
 * }} input
 */
export async function revokeTeacherGuardianAccess(input) {
  const { serviceRole, teacherId, accessId } = input;
  const loaded = await loadTeacherOwnedGuardianAccess(serviceRole, teacherId, accessId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.revoked_at != null || row.is_active === false) {
    return { ok: false, status: 409, code: "already_revoked" };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({
      is_active: false,
      revoked_at: now,
      revoked_by_teacher_id: teacherId,
    })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const sessions = await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    studentId: row.student_id,
    guardianAccessId: accessId,
    action: "grant_revoked",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: {
      student_id: row.student_id,
      access_id: accessId,
      sessions_revoked: sessions.ok ? sessions.sessionsRevoked : 0,
    },
  });

  return {
    ok: true,
    data: {
      accessId,
      revokedAt: now,
      sessionsRevoked: sessions.ok ? sessions.sessionsRevoked : 0,
    },
  };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   accessId: string,
 * }} input
 */
export async function rotateTeacherGuardianPin(input) {
  const { serviceRole, teacherId, accessId } = input;
  const loaded = await loadTeacherOwnedGuardianAccess(serviceRole, teacherId, accessId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  const state = computeGuardianAccessState(row);
  if (state !== "active") {
    return { ok: false, status: 409, code: "access_not_active" };
  }

  const pinPlain = generateStudentPin();
  const pinHash = hashStudentSecret(normalizeStudentPin(pinPlain));
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({ pin_hash: pinHash, updated_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const sessions = await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    studentId: row.student_id,
    guardianAccessId: accessId,
    action: "pin_rotated",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: {
      student_id: row.student_id,
      access_id: accessId,
      sessions_revoked: sessions.ok ? sessions.sessionsRevoked : 0,
    },
  });

  return {
    ok: true,
    data: {
      accessId,
      loginPinPlaintext: pinPlain,
      rotatedAt: now,
      sessionsRevoked: sessions.ok ? sessions.sessionsRevoked : 0,
    },
  };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   accessId: string,
 * }} input
 */
export async function rotateTeacherGuardianUsername(input) {
  const { serviceRole, teacherId, accessId } = input;
  const loaded = await loadTeacherOwnedGuardianAccess(serviceRole, teacherId, accessId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  const state = computeGuardianAccessState(row);
  if (state !== "active") {
    return { ok: false, status: 409, code: "access_not_active" };
  }

  const usernameGen = await generateTeacherPrefixedGuardianUsername(
    serviceRole,
    teacherId,
    row.student_id
  );
  if (!usernameGen.ok) return usernameGen;

  const username = usernameGen.loginUsername;
  const usernameNormalized = usernameGen.loginUsernameNormalized;
  const codeHash = hashStudentSecret(usernameNormalized);
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_guardian_access")
    .update({
      login_username: username,
      login_username_normalized: usernameNormalized,
      code_hash: codeHash,
      updated_at: now,
    })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const sessions = await revokeLiveGuardianSessionsForAccess(serviceRole, accessId);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    studentId: row.student_id,
    guardianAccessId: accessId,
    action: "username_rotated",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: {
      student_id: row.student_id,
      access_id: accessId,
      sessions_revoked: sessions.ok ? sessions.sessionsRevoked : 0,
    },
  });

  return {
    ok: true,
    data: {
      accessId,
      loginUsername: username,
      rotatedAt: now,
      sessionsRevoked: sessions.ok ? sessions.sessionsRevoked : 0,
    },
  };
}
