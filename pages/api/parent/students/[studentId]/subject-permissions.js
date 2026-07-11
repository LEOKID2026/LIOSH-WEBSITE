import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import { requireParentApiContext } from "../../../../../lib/auth/persona-guard.server.js";
import { safeString } from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import { mapParentPanelApiError } from "../../../../../lib/parent-server/parent-api-errors.he.js";
import {
  callEnableAllParentStudentSubjectsRpc,
  callEnsureParentStudentLearningPermissionsRpc,
  callSetParentStudentGradePickerRpc,
  callSetParentStudentSubjectPermissionRpc,
  computeSubjectPermissionsPayload,
  isSchemaNotReadyError,
} from "../../../../../lib/learning/subject-permissions/subject-access.server.js";
import { isSubjectPermissionKey } from "../../../../../lib/learning/subject-permissions/subject-key-map.js";
import { getSubjectPermissionLabelHe } from "../../../../../lib/learning/subject-permissions/subject-permission-labels.he.js";

function mapRpcError(error) {
  if (isSchemaNotReadyError(error)) {
    return { status: 503, message: "מערכת ההרשאות עדיין לא הופעלה במסד הנתונים" };
  }
  const message = String(error?.message || "");
  if (message.includes("SUBJECT_PERM_PARENT_MISMATCH")) {
    return { status: 404, message: "הילד לא שייך להורה זה" };
  }
  if (
    message.includes("SUBJECT_PERM_CATALOG_INCOMPLETE") ||
    message.includes("SUBJECT_CATALOG_GRADE_INCOMPLETE")
  ) {
    return { status: 500, message: "קטלוג המקצועות אינו שלם" };
  }
  return { status: 500, message: mapParentPanelApiError(error?.message, "save") };
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || "";
  const studentId = safeString(req.query?.studentId, 64);
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  try {
    const ctx = await requireParentApiContext(res, authHeader);
    if (ctx.stopped) return undefined;

    const { data: student, error: studentErr } = await ctx.bearerSupabase
      .from("students")
      .select("id, grade_level, account_kind")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (studentErr || !student?.id) {
      return res.status(404).json({ ok: false, error: "Student not found for this parent" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();

    if (req.method === "GET") {
      const ensure = await callEnsureParentStudentLearningPermissionsRpc(supabase, {
        parentId: ctx.parentUserId,
        changedBy: ctx.parentUserId,
        studentId,
      });
      if (ensure.error) {
        const mapped = mapRpcError(ensure.error);
        return res.status(mapped.status).json({ ok: false, error: mapped.message });
      }

      const payload = await computeSubjectPermissionsPayload(
        supabase,
        studentId,
        student.grade_level
      );

      const subjects = Object.entries(payload.subjectPermissions)
        .map(([subjectKey, row]) => ({
          subjectKey,
          labelHe: getSubjectPermissionLabelHe(subjectKey),
          isEnabled: row.isEnabled,
          isGradeSuitable: row.isGradeSuitable,
          effectiveGrade: row.effectiveGrade,
        }))
        .sort((a, b) => a.subjectKey.localeCompare(b.subjectKey));

      return res.status(200).json({
        ok: true,
        allowStudentGradePicker: payload.allowStudentGradePicker,
        subjects,
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};

      if (body.enableAll === true) {
        const { error } = await callEnableAllParentStudentSubjectsRpc(supabase, {
          parentId: ctx.parentUserId,
          changedBy: ctx.parentUserId,
          studentId,
        });
        if (error) {
          const mapped = mapRpcError(error);
          return res.status(mapped.status).json({ ok: false, error: mapped.message });
        }
      } else if (typeof body.allowStudentGradePicker === "boolean") {
        const { error } = await callSetParentStudentGradePickerRpc(supabase, {
          parentId: ctx.parentUserId,
          changedBy: ctx.parentUserId,
          studentId,
          allowStudentGradePicker: body.allowStudentGradePicker,
        });
        if (error) {
          const mapped = mapRpcError(error);
          return res.status(mapped.status).json({ ok: false, error: mapped.message });
        }
      } else if (body.subjectKey != null && typeof body.isEnabled === "boolean") {
        const subjectKey = String(body.subjectKey).trim();
        if (!isSubjectPermissionKey(subjectKey)) {
          return res.status(400).json({ ok: false, error: "מקצוע לא תקין" });
        }
        const { error } = await callSetParentStudentSubjectPermissionRpc(supabase, {
          parentId: ctx.parentUserId,
          changedBy: ctx.parentUserId,
          studentId,
          subjectKey,
          isEnabled: body.isEnabled,
        });
        if (error) {
          const mapped = mapRpcError(error);
          return res.status(mapped.status).json({ ok: false, error: mapped.message });
        }
      } else {
        return res.status(400).json({ ok: false, error: "No valid fields to update" });
      }

      const { data: refreshedStudent } = await supabase
        .from("students")
        .select("grade_level")
        .eq("id", studentId)
        .maybeSingle();

      const payload = await computeSubjectPermissionsPayload(
        supabase,
        studentId,
        refreshedStudent?.grade_level || student.grade_level
      );
      const subjects = Object.entries(payload.subjectPermissions).map(([subjectKey, row]) => ({
        subjectKey,
        labelHe: getSubjectPermissionLabelHe(subjectKey),
        isEnabled: row.isEnabled,
        isGradeSuitable: row.isGradeSuitable,
        effectiveGrade: row.effectiveGrade,
      }));

      return res.status(200).json({
        ok: true,
        allowStudentGradePicker: payload.allowStudentGradePicker,
        subjects,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[parent/subject-permissions]", err);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
