import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { devStudentIdentityPayload } from "../../../lib/dev-student-identity-api";
import { isStudentIdentityDebugEnabled } from "../../../lib/student-identity-debug-flag";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { safeApiLog } from "../../../lib/security/safe-log.js";
import {
  buildGuestPolicyPayload,
} from "../../../lib/guest/guest-access-policy.server.js";
import {
  formatGuestDisplayNameHe,
  formatStudentGreetingHe,
  formatLeoNumberLabelHe,
  isGuestStudent,
} from "../../../lib/guest/guest-display.js";
import {
  callEnsureParentStudentLearningPermissionsRpc,
  computeSubjectPermissionsPayload,
  isChildUnderParentFromDbRow,
  isGuestStudentFromDbRow,
  isSchemaNotReadyError,
} from "../../../lib/learning/subject-permissions/subject-access.server.js";

export default async function handler(req, res) {
  // Authenticated identity must never be served from a shared or disk cache — otherwise
  // after switching students (new session cookie), a stale cached GET can return the
  // previous child and client sync logic would overwrite the correct identity.
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const nowIso = new Date().toISOString();

    await supabase
      .from("student_sessions")
      .update({ last_seen_at: nowIso })
      .eq("id", auth.studentSessionId);

    const student = auth.student;
    const rel = student.student_coin_balances;
    const balance =
      Array.isArray(rel) ? rel[0]?.balance ?? 0 : rel?.balance ?? 0;

    const bodyStudent = {
      id: student.id,
      full_name: student.full_name,
      grade_level: student.grade_level,
      is_active: student.is_active,
      coin_balance: balance,
      account_kind: student.account_kind || "registered",
      accountKind: student.account_kind || "registered",
      leo_number: student.leo_number ?? null,
      leoNumber: student.leo_number ?? null,
      guest_status: student.guest_status ?? null,
      guestStatus: student.guest_status ?? null,
      displayNameHe: isGuestStudent(student) ? formatGuestDisplayNameHe(student) : student.full_name,
      greetingHe: formatStudentGreetingHe(student),
      leoNumberLabelHe: formatLeoNumberLabelHe(student),
    };

    const guestPolicy = isGuestStudent(student)
      ? await buildGuestPolicyPayload(supabase, student)
      : null;

    /** @type {Record<string, unknown>} */
    const accessPayload = {};
    const { data: studentDbRow } = await supabase
      .from("students")
      .select("id, parent_id, grade_level, account_kind")
      .eq("id", student.id)
      .maybeSingle();

    if (
      studentDbRow &&
      isChildUnderParentFromDbRow(studentDbRow) &&
      !isGuestStudentFromDbRow(studentDbRow)
    ) {
      try {
        await callEnsureParentStudentLearningPermissionsRpc(supabase, {
          parentId: studentDbRow.parent_id,
          changedBy: studentDbRow.parent_id,
          studentId: student.id,
        });
        const permissions = await computeSubjectPermissionsPayload(
          supabase,
          student.id,
          studentDbRow.grade_level
        );
        accessPayload.allowStudentGradePicker = permissions.allowStudentGradePicker;
        accessPayload.subjectPermissions = permissions.subjectPermissions;
      } catch (error) {
        if (!isSchemaNotReadyError(error)) throw error;
      }
    }

    const debugStudentIdentity = devStudentIdentityPayload("student-me-api", student);
    if (isStudentIdentityDebugEnabled() && debugStudentIdentity) {
      safeApiLog("[LIOSH student identity] API", debugStudentIdentity);
    }

    return res.status(200).json({
      ok: true,
      student: bodyStudent,
      guestPolicy,
      isGuest: Boolean(guestPolicy),
      ...accessPayload,
      ...(debugStudentIdentity ? { debugStudentIdentity } : {}),
    });
  } catch (_e) {
    clearStudentSessionCookie(res);
    return res.status(500).json({ ok: false, error: "שגיאת שרת" });
  }
}

