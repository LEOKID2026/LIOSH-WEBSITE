import {
  normalizeStudentUsername,
  hashStudentSecret,
  normalizeStudentPin,
} from "../../../lib/learning-supabase/student-auth";
import { isStudentIdentityDebugEnabled } from "../../../lib/student-identity-debug-flag";
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { requireParentApiContext } from "../../../lib/auth/persona-guard.server.js";
import { safeApiLog } from "../../../lib/security/safe-log.js";
import { safeUuid } from "../../../lib/security/api-input.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const studentId = safeUuid(req.body?.studentId);
  const usernameRaw = String(req.body?.username || "");
  const pinRaw = String(req.body?.pin || "");
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  try {
    const username = normalizeStudentUsername(usernameRaw);
    if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
      return res.status(400).json({ ok: false, error: "שם משתמש לא תקין" });
    }
    const pin = normalizeStudentPin(pinRaw);
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ ok: false, error: "PIN לא תקין" });
    }

    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const serviceRole = getLearningSupabaseServiceRoleClient();

    // Ownership verification first (RLS + explicit parent_id check).
    const { data: student, error: studentErr } = await ctx.bearerSupabase
      .from("students")
      .select("id,parent_id,is_active")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();
    if (studentErr || !student?.id) {
      return res.status(403).json({ ok: false, error: "Student not found for this parent" });
    }
    if (student.is_active !== true) {
      return res.status(403).json({ ok: false, error: "הילד/ה אינו פעיל" });
    }

    const codeHash = hashStudentSecret(username);
    const pinHash = hashStudentSecret(pin);

    const { data: conflict, error: conflictErr } = await serviceRole
      .from("student_access_codes")
      .select("id,student_id")
      .eq("code_hash", codeHash)
      .eq("is_active", true)
      .is("revoked_at", null)
      .neq("student_id", studentId)
      .limit(1)
      .maybeSingle();
    if (conflictErr) {
      return res.status(500).json({ ok: false, error: "בדיקת שם משתמש נכשלה" });
    }
    if (conflict?.id) {
      return res.status(409).json({ ok: false, error: "שם המשתמש כבר תפוס" });
    }

    // Mutations run with service role after explicit ownership checks above.
    // Revoke every non-revoked row for this student (handles duplicate-active rows and RLS edge cases).
    const nowIso = new Date().toISOString();
    const { error: revokeErr } = await serviceRole
      .from("student_access_codes")
      .update({
        is_active: false,
        revoked_at: nowIso,
      })
      .eq("student_id", studentId)
      .is("revoked_at", null);
    if (revokeErr) {
      return res.status(500).json({ ok: false, error: "Could not revoke previous code" });
    }

    const { error: insErr } = await serviceRole.from("student_access_codes").insert({
      student_id: studentId,
      code_hash: codeHash,
      pin_hash: pinHash,
      login_username: username,
      is_active: true,
      expires_at: null,
      revoked_at: null,
    });
    if (insErr) {
      return res.status(500).json({ ok: false, error: "Could not create access code" });
    }

    if (isStudentIdentityDebugEnabled()) {
      safeApiLog("[create-student-access-code] saved credential", {
        studentId,
      });
    }

    return res.status(200).json({
      ok: true,
      username,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}

