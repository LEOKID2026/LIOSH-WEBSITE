import { loadTeacherSchoolMembership } from "../school-server/school-membership.server.js";

/**
 * Platform admin may manage private-teacher quotas/subjects only — not school staff.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function assertAdminPrivateTeacherScope(serviceRole, teacherId) {
  const mem = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!mem.ok) return mem;
  if (mem.membership?.schoolId) {
    return {
      ok: false,
      status: 403,
      code: "school_staff_not_private_teacher",
    };
  }
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
export async function loadSchoolAffiliatedTeacherIds(serviceRole) {
  const { data, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("teacher_id");

  if (error) {
    return { ok: false, error };
  }

  return { ok: true, ids: new Set((data || []).map((r) => r.teacher_id)) };
}
