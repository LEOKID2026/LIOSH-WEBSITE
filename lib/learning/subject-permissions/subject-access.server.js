import { normalizePracticeGradeKey } from "../../learning-supabase/practice-grade-resolution.js";
import {
  isChildUnderParentFromDbRow,
  isGuestStudentFromDbRow,
} from "../../guest/guest-student-identity.server.js";
import { resolvePermissionSubjectKey } from "./subject-key-map.js";
import { resolveEffectiveContentGradePure } from "./subject-grade-defaults.resolver.js";

export const SUBJECT_ACCESS_ERROR_CODES = Object.freeze({
  SUBJECT_LOCKED_BY_PARENT: "SUBJECT_LOCKED_BY_PARENT",
  GRADE_PICKER_NOT_ALLOWED: "GRADE_PICKER_NOT_ALLOWED",
  SUBJECT_CONTENT_CATALOG_INCOMPLETE: "SUBJECT_CONTENT_CATALOG_INCOMPLETE",
  DB_SCHEMA_NOT_READY: "db_schema_not_ready",
});

const SUBJECT_LOCKED_MESSAGE_HE = "המקצוע נעול על ידי ההורים";
const GRADE_PICKER_MESSAGE_HE = "אין הרשאה לבחור כיתה זו";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function loadStudentRow(supabase, studentId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, parent_id, grade_level, account_kind, full_name, is_active")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Session auth rows omit parent_id — always reload when linkage fields are missing. */
async function resolveStudentRowForSubjectAccess(supabase, studentId, studentRow) {
  if (
    studentRow &&
    Object.prototype.hasOwnProperty.call(studentRow, "parent_id") &&
    Object.prototype.hasOwnProperty.call(studentRow, "account_kind")
  ) {
    return studentRow;
  }
  return loadStudentRow(supabase, studentId);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} subjectKey
 */
export async function loadAvailableGradesForSubject(supabase, subjectKey) {
  const { data, error } = await supabase
    .from("subject_grade_default_catalog")
    .select("grade_key, subject_permission_catalog!inner(is_active)")
    .eq("subject_key", subjectKey)
    .eq("is_grade_suitable", true)
    .eq("subject_permission_catalog.is_active", true)
    .order("grade_key");
  if (error) throw error;
  return (data || []).map((row) => row.grade_key);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} subjectKey
 * @param {string} registeredGradeKey
 */
export async function resolveEffectiveContentGrade(supabase, subjectKey, registeredGradeKey) {
  const registered = normalizePracticeGradeKey(registeredGradeKey);
  if (!registered) throw new Error(SUBJECT_ACCESS_ERROR_CODES.SUBJECT_CONTENT_CATALOG_INCOMPLETE);
  const availableGrades = await loadAvailableGradesForSubject(supabase, subjectKey);
  return resolveEffectiveContentGradePure(registered, availableGrades);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function loadStudentLearningAccessPreferences(supabase, studentId) {
  const { data, error } = await supabase
    .from("student_learning_access_preferences")
    .select("allow_student_grade_picker")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return {
    allowStudentGradePicker: data?.allow_student_grade_picker === true,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function loadStudentSubjectPermissionMap(supabase, studentId) {
  const { data, error } = await supabase
    .from("student_subject_permissions")
    .select("subject_key, is_enabled, subject_permission_catalog!inner(is_active)")
    .eq("student_id", studentId)
    .eq("subject_permission_catalog.is_active", true);
  if (error) throw error;
  /** @type {Record<string, boolean>} */
  const map = {};
  for (const row of data || []) {
    map[row.subject_key] = row.is_enabled !== false;
  }
  return map;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ parentId: string, changedBy: string, studentId: string }} params
 */
export async function callEnsureParentStudentLearningPermissionsRpc(supabase, params) {
  return supabase.rpc("ensure_parent_student_learning_permissions", {
    p_parent_id: params.parentId,
    p_changed_by: params.changedBy,
    p_student_id: params.studentId,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ parentId: string, changedBy: string, fullName: string, gradeLevel: string }} params
 */
export async function callCreateParentStudentWithDefaultsRpc(supabase, params) {
  return supabase.rpc("create_parent_student_with_subject_defaults", {
    p_parent_id: params.parentId,
    p_changed_by: params.changedBy,
    p_full_name: params.fullName,
    p_grade_level: params.gradeLevel,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ parentId: string, changedBy: string, studentId: string, gradeLevel: string }} params
 */
export async function callApplyParentStudentGradeChangeRpc(supabase, params) {
  return supabase.rpc("apply_parent_student_grade_change", {
    p_parent_id: params.parentId,
    p_changed_by: params.changedBy,
    p_student_id: params.studentId,
    p_grade_level: params.gradeLevel,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function callSetParentStudentSubjectPermissionRpc(supabase, params) {
  return supabase.rpc("set_parent_student_subject_permission", {
    p_parent_id: params.parentId,
    p_changed_by: params.changedBy,
    p_student_id: params.studentId,
    p_subject_key: params.subjectKey,
    p_is_enabled: params.isEnabled,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function callEnableAllParentStudentSubjectsRpc(supabase, params) {
  return supabase.rpc("enable_all_parent_student_subjects", {
    p_parent_id: params.parentId,
    p_changed_by: params.changedBy,
    p_student_id: params.studentId,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function callSetParentStudentGradePickerRpc(supabase, params) {
  return supabase.rpc("set_parent_student_grade_picker", {
    p_parent_id: params.parentId,
    p_changed_by: params.changedBy,
    p_student_id: params.studentId,
    p_allow_student_grade_picker: params.allowStudentGradePicker,
  });
}

function isSchemaNotReadyError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42883" ||
    message.includes("does not exist") ||
    message.includes("could not find the function")
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gradeLevel
 */
export async function loadActiveCatalogSubjectsForGrade(supabase, gradeLevel) {
  const gradeKey = normalizePracticeGradeKey(gradeLevel);
  const { data, error } = await supabase
    .from("subject_grade_default_catalog")
    .select(
      "grade_key, subject_key, is_grade_suitable, is_enabled_by_default, subject_permission_catalog!inner(display_name_he, sort_order, is_active)"
    )
    .eq("grade_key", gradeKey)
    .eq("subject_permission_catalog.is_active", true)
    .order("sort_order", { foreignTable: "subject_permission_catalog" });
  if (error) throw error;
  return data || [];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} registeredGradeKey
 */
export async function computeSubjectPermissionsPayload(supabase, studentId, registeredGradeKey) {
  const [catalogRows, permissionMap, preferences] = await Promise.all([
    loadActiveCatalogSubjectsForGrade(supabase, registeredGradeKey),
    loadStudentSubjectPermissionMap(supabase, studentId),
    loadStudentLearningAccessPreferences(supabase, studentId),
  ]);

  /** @type {Record<string, { isEnabled: boolean, isLockedByParent: boolean, isGradeSuitable: boolean, effectiveGrade: string }>} */
  const subjectPermissions = {};

  for (const row of catalogRows) {
    const subjectKey = row.subject_key;
    const isEnabled = permissionMap[subjectKey] !== false;
    const effectiveGrade = await resolveEffectiveContentGrade(
      supabase,
      subjectKey,
      registeredGradeKey
    );
    subjectPermissions[subjectKey] = {
      isEnabled,
      isLockedByParent: !isEnabled,
      isGradeSuitable: row.is_grade_suitable === true,
      effectiveGrade,
    };
  }

  return {
    allowStudentGradePicker: preferences.allowStudentGradePicker,
    subjectPermissions,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} activityId
 * @param {string} studentId
 */
export async function loadParentAssignedActivityContext(supabase, activityId, studentId) {
  const { data, error } = await supabase
    .from("parent_assigned_activities")
    .select("id, student_id, subject, metadata, snapshot_metadata")
    .eq("id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error || !data?.id) return null;

  const meta = data.snapshot_metadata || data.metadata || {};
  const assignedGrade =
    normalizePracticeGradeKey(meta.gradeLevel) ||
    normalizePracticeGradeKey(meta.grade_level) ||
    normalizePracticeGradeKey(meta.contentGradeLevel);

  if (!assignedGrade) return null;
  return { activityId: data.id, assignedGrade, subject: data.subject };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function isChildUnderParent(supabase, studentId) {
  const row = await loadStudentRow(supabase, studentId);
  return Boolean(row && isChildUnderParentFromDbRow(row) && !isGuestStudentFromDbRow(row));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   studentRow?: Record<string, unknown>|null,
 *   permissionKey?: string|null,
 *   subject?: string|null,
 *   visualStrand?: string|null,
 *   activityMetadata?: Record<string, unknown>|null,
 * }} params
 */
export async function assertStudentCanAccessSubject(supabase, params) {
  const studentRow = await resolveStudentRowForSubjectAccess(
    supabase,
    params.studentId,
    params.studentRow
  );
  if (!studentRow) {
    return { ok: false, code: "student_not_found", message: "תלמיד לא נמצא", status: 404 };
  }
  if (isGuestStudentFromDbRow(studentRow)) return { ok: true, skipped: true };
  if (!isChildUnderParentFromDbRow(studentRow)) return { ok: true, skipped: true };

  const permissionKey =
    resolvePermissionSubjectKey({
      permissionSubjectKey: params.permissionKey,
      subject: params.subject,
      visualStrand: params.visualStrand,
      routeSubject: params.activityMetadata?.permissionSubjectKey,
    }) || resolvePermissionSubjectKey({ subject: params.subject, visualStrand: params.visualStrand });

  if (!permissionKey) {
    return { ok: true, skipped: true };
  }

  try {
    if (studentRow.parent_id) {
      await callEnsureParentStudentLearningPermissionsRpc(supabase, {
        parentId: studentRow.parent_id,
        changedBy: studentRow.parent_id,
        studentId: params.studentId,
      });
    }
    const permissionMap = await loadStudentSubjectPermissionMap(supabase, params.studentId);
    if (permissionMap[permissionKey] === false) {
      return {
        ok: false,
        code: SUBJECT_ACCESS_ERROR_CODES.SUBJECT_LOCKED_BY_PARENT,
        message: SUBJECT_LOCKED_MESSAGE_HE,
        status: 403,
        permissionKey,
      };
    }
    return { ok: true, permissionKey };
  } catch (error) {
    if (isSchemaNotReadyError(error)) {
      return { ok: true, skipped: true, schemaNotReady: true };
    }
    throw error;
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   studentId: string,
 *   studentRow?: Record<string, unknown>|null,
 *   subjectKey: string,
 *   requestedGrade?: string|null,
 *   activityContext?: { assignedGrade: string }|null,
 * }} params
 */
export async function assertStudentGradePickerAllowed(supabase, params) {
  const studentRow = await resolveStudentRowForSubjectAccess(
    supabase,
    params.studentId,
    params.studentRow
  );
  if (!studentRow) {
    return { ok: false, code: "student_not_found", message: "תלמיד לא נמצא", status: 404 };
  }
  if (isGuestStudentFromDbRow(studentRow)) return { ok: true, skipped: true };
  if (!isChildUnderParentFromDbRow(studentRow)) return { ok: true, skipped: true };

  const requestedGrade = normalizePracticeGradeKey(params.requestedGrade);
  const registeredGrade = normalizePracticeGradeKey(studentRow.grade_level);
  const subjectKey = String(params.subjectKey || "").trim();
  if (!subjectKey || !requestedGrade || !registeredGrade) {
    return {
      ok: false,
      code: SUBJECT_ACCESS_ERROR_CODES.GRADE_PICKER_NOT_ALLOWED,
      message: GRADE_PICKER_MESSAGE_HE,
      status: 403,
    };
  }

  try {
    if (studentRow.parent_id) {
      await callEnsureParentStudentLearningPermissionsRpc(supabase, {
        parentId: studentRow.parent_id,
        changedBy: studentRow.parent_id,
        studentId: params.studentId,
      });
    }

    if (params.activityContext?.assignedGrade) {
      const assigned = normalizePracticeGradeKey(params.activityContext.assignedGrade);
      if (requestedGrade === assigned) return { ok: true, effectiveGrade: assigned };
      return {
        ok: false,
        code: SUBJECT_ACCESS_ERROR_CODES.GRADE_PICKER_NOT_ALLOWED,
        message: GRADE_PICKER_MESSAGE_HE,
        status: 403,
      };
    }

    const effectiveGrade = await resolveEffectiveContentGrade(
      supabase,
      subjectKey,
      registeredGrade
    );
    if (requestedGrade === effectiveGrade) return { ok: true, effectiveGrade };

    const preferences = await loadStudentLearningAccessPreferences(supabase, params.studentId);
    if (preferences.allowStudentGradePicker) {
      const availableGrades = await loadAvailableGradesForSubject(supabase, subjectKey);
      if (availableGrades.includes(requestedGrade)) {
        return { ok: true, effectiveGrade: requestedGrade };
      }
    }

    return {
      ok: false,
      code: SUBJECT_ACCESS_ERROR_CODES.GRADE_PICKER_NOT_ALLOWED,
      message: GRADE_PICKER_MESSAGE_HE,
      status: 403,
      effectiveGrade,
    };
  } catch (error) {
    if (isSchemaNotReadyError(error)) {
      return { ok: true, skipped: true, schemaNotReady: true };
    }
    throw error;
  }
}

export {
  isGuestStudentFromDbRow,
  isChildUnderParentFromDbRow,
  isSchemaNotReadyError,
  SUBJECT_LOCKED_MESSAGE_HE,
  GRADE_PICKER_MESSAGE_HE,
};
