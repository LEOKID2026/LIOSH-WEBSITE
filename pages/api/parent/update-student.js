import { requireParentApiContext } from "../../../lib/auth/persona-guard.server.js";
import {
  MAX_PARENT_GRADE_LEVEL_LEN,
  MAX_PARENT_STUDENT_NAME_LEN,
  parseBoundedTrimmedString,
  safeUuid,
  trimString,
} from "../../../lib/security/api-input.server.js";
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  callApplyParentStudentGradeChangeRpc,
  isSchemaNotReadyError,
} from "../../../lib/learning/subject-permissions/subject-access.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const studentId = safeUuid(req.body?.studentId);
  const isActiveRaw = req.body?.isActive;

  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  const patch = {};
  if (req.body?.fullName != null && String(req.body.fullName).trim() !== "") {
    const fullNameParsed = parseBoundedTrimmedString(req.body.fullName, MAX_PARENT_STUDENT_NAME_LEN);
    if (!fullNameParsed.ok) {
      return res.status(400).json({ ok: false, error: "fullName too long" });
    }
    patch.full_name = fullNameParsed.value;
  }
  if (req.body?.gradeLevel != null && String(req.body.gradeLevel).trim() !== "") {
    const gradeParsed = parseBoundedTrimmedString(req.body.gradeLevel, MAX_PARENT_GRADE_LEVEL_LEN);
    if (!gradeParsed.ok) {
      return res.status(400).json({ ok: false, error: "gradeLevel too long" });
    }
    patch.grade_level = gradeParsed.value;
  }
  if (typeof isActiveRaw === "boolean") patch.is_active = isActiveRaw;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ ok: false, error: "No fields to update" });
  }

  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const { data: existing, error: existingErr } = await ctx.bearerSupabase
      .from("students")
      .select("id, grade_level")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (existingErr || !existing?.id) {
      return res.status(403).json({ ok: false, error: "Could not update student" });
    }

    const gradeChanged =
      patch.grade_level != null && String(patch.grade_level) !== String(existing.grade_level || "");

    if (gradeChanged) {
      const supabase = getLearningSupabaseServiceRoleClient();
      const rpcResult = await callApplyParentStudentGradeChangeRpc(supabase, {
        parentId: ctx.parentUserId,
        changedBy: ctx.parentUserId,
        studentId,
        gradeLevel: patch.grade_level,
      });
      if (rpcResult.error && !isSchemaNotReadyError(rpcResult.error)) {
        return res.status(403).json({ ok: false, error: "Could not update student grade" });
      }
      delete patch.grade_level;
    }

    if (Object.keys(patch).length === 0) {
      const { data, error } = await ctx.bearerSupabase
        .from("students")
        .select("id,full_name,grade_level,is_active,created_at")
        .eq("id", studentId)
        .single();
      if (error) return res.status(403).json({ ok: false, error: "Could not update student" });
      return res.status(200).json({ ok: true, student: data });
    }

    const { data, error } = await ctx.bearerSupabase
      .from("students")
      .update(patch)
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .select("id,full_name,grade_level,is_active,created_at")
      .single();

    if (error) {
      return res.status(403).json({ ok: false, error: "Could not update student" });
    }

    return res.status(200).json({ ok: true, student: data });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
