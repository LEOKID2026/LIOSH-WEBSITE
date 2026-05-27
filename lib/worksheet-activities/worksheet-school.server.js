import { isUuid } from "../teacher-server/teacher-request.server.js";
import { buildSchoolWorksheetSummary } from "./worksheet-report.server.js";
import { mapWorksheetActivityRow, worksheetDbError } from "./worksheet-shared.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ classId?: string, teacherId?: string, status?: string, limit?: number }} filters
 */
export async function listSchoolWorksheets(serviceRole, schoolId, filters = {}) {
  let query = serviceRole
    .from("worksheet_activities")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (filters.classId) {
    if (!isUuid(filters.classId)) return { ok: false, status: 400, code: "validation_failed" };
    query = query.eq("class_id", filters.classId);
  }
  if (filters.teacherId) {
    if (!isUuid(filters.teacherId)) return { ok: false, status: 400, code: "validation_failed" };
    query = query.eq("teacher_id", filters.teacherId);
  }
  if (filters.status) {
    query = query.eq("status", String(filters.status).trim());
  } else {
    query = query.neq("status", "archived");
  }

  const limit = filters.limit != null ? Math.min(100, Math.max(1, Number(filters.limit))) : 50;
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) return worksheetDbError(error);

  return { ok: true, worksheets: (data || []).map(mapWorksheetActivityRow) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} worksheetId
 */
export async function getSchoolWorksheetReport(serviceRole, schoolId, worksheetId) {
  if (!isUuid(worksheetId)) return { ok: false, status: 400, code: "validation_failed" };

  const { data, error } = await serviceRole
    .from("worksheet_activities")
    .select("*")
    .eq("id", worksheetId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) return worksheetDbError(error);
  if (!data) return { ok: false, status: 404, code: "worksheet_not_found" };

  return buildSchoolWorksheetSummary(serviceRole, data);
}
