import { writeSchoolStaffAuditRow } from "./school-staff-audit.server.js";
import {
  hashStaffSecret,
  normalizeStaffPin,
} from "./school-staff-crypto.server.js";
import { validateStaffNewPin } from "./school-staff-pin-gate.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   userId: string;
 *   schoolId: string;
 *   staffAccessId: string;
 *   sessionId: string;
 *   currentPin?: string;
 *   newPin?: string;
 *   confirmPin?: string;
 *   ipHash?: string|null;
 *   userAgent?: string|null;
 * }} input
 */
export async function staffChangePin(serviceRole, input) {
  const currentPin = normalizeStaffPin(input.currentPin || "");
  const pinCheck = validateStaffNewPin(input.newPin, input.confirmPin);
  if (!pinCheck.ok) return pinCheck;

  if (!/^\d{4}$/.test(currentPin)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  if (currentPin === pinCheck.newPin) {
    return { ok: false, status: 400, code: "invalid_new_pin" };
  }

  const { data: accessRow, error: accessErr } = await serviceRole
    .from("school_staff_access_codes")
    .select("id, pin_hash, is_active, revoked_at, must_change_pin, staff_role")
    .eq("id", input.staffAccessId)
    .eq("user_id", input.userId)
    .eq("school_id", input.schoolId)
    .maybeSingle();

  if (accessErr || !accessRow?.id) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }
  if (!accessRow.is_active || accessRow.revoked_at != null) {
    return { ok: false, status: 401, code: "not_authenticated" };
  }

  const currentHash = hashStaffSecret(currentPin);
  if (accessRow.pin_hash !== currentHash) {
    return { ok: false, status: 401, code: "invalid_current_pin" };
  }

  const newHash = hashStaffSecret(pinCheck.newPin);
  const { error: updateErr } = await serviceRole
    .from("school_staff_access_codes")
    .update({
      pin_hash: newHash,
      must_change_pin: false,
      failed_attempts: 0,
      locked_until: null,
    })
    .eq("id", accessRow.id);

  if (updateErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const now = new Date().toISOString();
  await serviceRole
    .from("school_staff_sessions")
    .update({ revoked_at: now })
    .eq("user_id", input.userId)
    .neq("id", input.sessionId)
    .is("revoked_at", null);

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId: input.schoolId,
    action: "staff_pin_changed",
    actorUserId: input.userId,
    targetUserId: input.userId,
    metadata: { via: "staff_change_pin" },
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  });

  const redirectPath =
    accessRow.staff_role === "school_operator"
      ? "/school/operator/dashboard"
      : "/teacher/dashboard";

  return {
    ok: true,
    data: {
      mustChangePin: false,
      redirectPath,
    },
  };
}
