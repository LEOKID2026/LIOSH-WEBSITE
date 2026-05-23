import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getStudentSessionCookie,
  hashStudentSecret,
} from "../../../lib/learning-supabase/student-auth";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  const token = getStudentSessionCookie(req);
  clearStudentSessionCookie(res);

  if (!token) {
    return res.status(200).json({ ok: true });
  }

  try {
    const supabase = getLearningSupabaseServiceRoleClient();
    const tokenHash = hashStudentSecret(token);
    const nowIso = new Date().toISOString();

    await supabase
      .from("student_sessions")
      .update({
        revoked_at: nowIso,
        ended_at: nowIso,
      })
      .eq("session_token_hash", tokenHash)
      .is("ended_at", null);

    return res.status(200).json({ ok: true });
  } catch (_e) {
    return res.status(200).json({ ok: true });
  }
}

