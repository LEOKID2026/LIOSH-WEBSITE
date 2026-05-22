import { getLearningSupabaseServerUserClient } from "../../../lib/learning-supabase/server";

const DEFAULT_PARENT_STUDENT_LIMIT = 3;

/**
 * Resolve the per-parent student creation limit.
 *
 * Default product behavior: every parent can create up to 3 students.
 *
 * QA escape hatch (server-side only, never exposed to the browser):
 *   QA_PARENT_STUDENT_LIMIT_EMAILS = comma-separated list of parent emails
 *     allowed a higher limit (e.g. "admin@admin.com"). Compared case-
 *     insensitively after trimming.
 *   QA_PARENT_STUDENT_LIMIT = positive integer override (e.g. 50). Only
 *     applies to emails in the allowlist; ignored otherwise.
 *
 * If either env var is missing, malformed, or the email is not in the
 * allowlist, the default 3-student cap is enforced unchanged.
 */
function resolveParentStudentLimit(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return DEFAULT_PARENT_STUDENT_LIMIT;

  const rawAllowlist = String(process.env.QA_PARENT_STUDENT_LIMIT_EMAILS || "");
  const allowlist = rawAllowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return DEFAULT_PARENT_STUDENT_LIMIT;
  if (!allowlist.includes(email)) return DEFAULT_PARENT_STUDENT_LIMIT;

  const rawOverride = String(process.env.QA_PARENT_STUDENT_LIMIT || "").trim();
  if (!rawOverride) return DEFAULT_PARENT_STUDENT_LIMIT;
  const overrideNum = Number.parseInt(rawOverride, 10);
  if (!Number.isFinite(overrideNum) || overrideNum < DEFAULT_PARENT_STUDENT_LIMIT) {
    return DEFAULT_PARENT_STUDENT_LIMIT;
  }
  return overrideNum;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing bearer token" });
  }

  const fullName = String(req.body?.fullName || "").trim();
  const gradeLevel = String(req.body?.gradeLevel || "").trim();

  if (!fullName) {
    return res.status(400).json({ ok: false, error: "fullName is required" });
  }

  try {
    const supabase = getLearningSupabaseServerUserClient(authHeader);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const { count: existingCount, error: countErr } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", userData.user.id);

    if (countErr) {
      return res.status(403).json({ ok: false, error: "לא ניתן לבדוק את מספר הילדים" });
    }
    const studentLimit = resolveParentStudentLimit(userData.user.email);
    if ((existingCount ?? 0) >= studentLimit) {
      return res.status(400).json({
        ok: false,
        error: "ניתן להוסיף עד 3 ילדים בלבד לחשבון הורה",
      });
    }

    const payload = {
      parent_id: userData.user.id,
      full_name: fullName,
    };
    if (gradeLevel) {
      payload.grade_level = gradeLevel;
    }

    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select("id,full_name,grade_level,is_active,created_at")
      .single();

    if (error) {
      return res.status(403).json({ ok: false, error: "Could not create student" });
    }

    return res.status(200).json({ ok: true, student: data });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
