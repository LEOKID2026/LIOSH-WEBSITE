import { getLearningSupabaseServerUserClient } from "../../../lib/learning-supabase/server";
import { resolveParentStudentLimit } from "../../../lib/parent-server/parent-student-limit.server";
import {
  MAX_PARENT_GRADE_LEVEL_LEN,
  MAX_PARENT_STUDENT_NAME_LEN,
  parseBoundedTrimmedString,
  trimString,
} from "../../../lib/security/api-input.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing bearer token" });
  }

  const fullNameParsed = parseBoundedTrimmedString(req.body?.fullName, MAX_PARENT_STUDENT_NAME_LEN);
  if (!fullNameParsed.ok) {
    return res.status(400).json({ ok: false, error: "fullName too long" });
  }
  if (!fullNameParsed.value) {
    return res.status(400).json({ ok: false, error: "fullName is required" });
  }
  const fullName = fullNameParsed.value;

  if (req.body?.gradeLevel != null && String(req.body.gradeLevel).trim() !== "") {
    const gradeParsed = parseBoundedTrimmedString(req.body.gradeLevel, MAX_PARENT_GRADE_LEVEL_LEN);
    if (!gradeParsed.ok) {
      return res.status(400).json({ ok: false, error: "gradeLevel too long" });
    }
  }
  const gradeLevel = trimString(req.body?.gradeLevel);

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
