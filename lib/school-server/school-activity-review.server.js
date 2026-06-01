import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import {
  buildActivityMonitorPayload,
  buildActivityStudentAnswersPayload,
} from "../teacher-server/teacher-activities.server.js";
import { loadSchoolScope } from "./school-scope.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} activityId
 */
export async function loadSchoolClassroomActivityOwned(serviceRole, schoolId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data, error } = await serviceRole
    .from("classroom_activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id) {
    return { ok: false, status: 404, code: "activity_not_found" };
  }

  if (!scope.teacherIds.includes(data.teacher_id)) {
    return { ok: false, status: 404, code: "activity_not_found" };
  }

  return { ok: true, row: data, teacherId: data.teacher_id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} activityId
 */
export async function buildSchoolActivityMonitorPayload(serviceRole, schoolId, activityId) {
  const owned = await loadSchoolClassroomActivityOwned(serviceRole, schoolId, activityId);
  if (!owned.ok) return owned;

  const monitor = await buildActivityMonitorPayload(serviceRole, owned.teacherId, activityId);
  if (!monitor.ok) return monitor;

  return {
    ...monitor,
    schoolScope: {
      schoolId,
      teacherId: owned.teacherId,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} activityId
 * @param {string} studentId
 */
export async function buildSchoolActivityStudentAnswersPayload(
  serviceRole,
  schoolId,
  activityId,
  studentId
) {
  const owned = await loadSchoolClassroomActivityOwned(serviceRole, schoolId, activityId);
  if (!owned.ok) return owned;

  return buildActivityStudentAnswersPayload(serviceRole, owned.teacherId, activityId, studentId);
}
