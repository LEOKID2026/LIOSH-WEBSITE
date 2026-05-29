/**
 * Shared roster student report entry builder for class + physical reports.
 */

import { batchAggregateParentReportPayloadsForRoster } from "../parent-server/report-data-aggregate-batch.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { teacherStudentDisplayName } from "./teacher-students.server.js";
import { chunkIds } from "../school-server/school-query-chunks.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string[]} studentIds
 */
async function loadStudentRowsForRosterBatch(serviceRole, studentIds) {
  /** @type {Map<string, { id: string, full_name?: string|null, grade_level?: string|null, is_active?: boolean }>} */
  const map = new Map();
  if (!studentIds.length) return { ok: true, byId: map };

  for (const chunk of chunkIds(studentIds, 80)) {
    const { data, error } = await serviceRole
      .from("students")
      .select("id, full_name, grade_level, is_active")
      .in("id", chunk);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    for (const row of data || []) {
      if (row?.id) map.set(String(row.id), row);
    }
  }

  return { ok: true, byId: map };
}

/**
 * @param {{
 *   serviceRole: import("@supabase/supabase-js").SupabaseClient,
 *   members: Array<{ studentId: string, membershipId: string, displayName?: string|null }>,
 *   fromDate: Date,
 *   toDate: Date,
 *   sessionSubjectFilter?: string|null,
 * }} input
 */
export async function buildRosterStudentReportEntries(input) {
  const { serviceRole, members, fromDate, toDate, sessionSubjectFilter = null } = input;
  if (!members.length) {
    return { ok: true, entries: [] };
  }

  const studentIds = members.map((m) => m.studentId).filter(Boolean);
  const loaded = await loadStudentRowsForRosterBatch(serviceRole, studentIds);
  if (!loaded.ok) return loaded;

  const students = studentIds.map((id) => loaded.byId.get(String(id))).filter(Boolean);
  if (!students.length) {
    return { ok: true, entries: [] };
  }

  try {
    const payloadByStudentId = await batchAggregateParentReportPayloadsForRoster(
      serviceRole,
      students,
      fromDate,
      toDate,
      { sessionSubjectFilter }
    );

    const entries = [];
    for (const member of members) {
      const payload = payloadByStudentId.get(String(member.studentId));
      if (!payload) continue;

      const row = loaded.byId.get(String(member.studentId));
      const fullName = row?.full_name || member.displayName || "";

      entries.push({
        studentId: member.studentId,
        studentFullName: fullName,
        studentFullNameMasked: teacherStudentDisplayName(fullName),
        membershipId: member.membershipId,
        payload,
      });
    }

    return { ok: true, entries };
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}
