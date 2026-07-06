import { requireParentApiContext } from "../../../lib/auth/persona-guard.server.js";
import { resolveParentMaxChildren } from "../../../lib/parent-server/parent-entitlement-provision.server.js";
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
  if (!gradeLevel) {
    return res.status(400).json({
      ok: false,
      code: "grade_required",
      error: "יש לבחור כיתה",
    });
  }

  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const limitResult = await resolveParentMaxChildren(
      ctx.serviceRole,
      ctx.parentUserId,
      ctx.user?.email
    );
    if (!limitResult.ok) {
      return res.status(limitResult.status).json({ ok: false, error: limitResult.code });
    }

    const { count: existingCount, error: countErr } = await ctx.bearerSupabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", ctx.parentUserId);

    if (countErr) {
      return res.status(403).json({ ok: false, error: "לא ניתן לבדוק את מספר הילדים" });
    }
    if ((existingCount ?? 0) >= limitResult.maxChildren) {
      return res.status(400).json({
        ok: false,
        error: "ניתן להוסיף עד 3 ילדים בלבד לחשבון הורה",
      });
    }

    const payload = {
      parent_id: ctx.parentUserId,
      full_name: fullName,
      grade_level: gradeLevel,
    };

    const { data, error } = await ctx.bearerSupabase
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
