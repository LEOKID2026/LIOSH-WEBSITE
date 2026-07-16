/**
 * Server-only: attach `student_learning_state` + derived aggregates to parent report-data payloads.
 */

import { loadStudentLearningDerivedCached } from "../learning-supabase/student-home-profile-load.server.js";
import { buildAccountSnapshotForParentReport } from "../learning-shared/student-account-state-view.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {{ id: string, full_name?: string|null }} student
 * @param {Record<string, unknown>} analyticsPayload — output of {@link aggregateParentReportPayload}
 * @param {{ derived?: Awaited<ReturnType<typeof loadStudentLearningDerivedCached>> }} [opts]
 *        Optional precomputed derived (same shape as computeStudentLearningDerived). When omitted,
 *        uses the existing 45s per-student cache / cold compute path.
 */
export async function attachStudentLearningAccountToParentReportPayload(
  serviceClient,
  student,
  analyticsPayload,
  opts = {}
) {
  const studentId = student.id;
  const derivedPromise =
    opts.derived != null
      ? Promise.resolve(opts.derived)
      : loadStudentLearningDerivedCached(serviceClient, studentId);

  const [{ data: slsRow, error: slsErr }, derived] = await Promise.all([
    serviceClient
      .from("student_learning_state")
      .select("id,student_id,subjects,monthly,challenges,streaks,achievements,profile,created_at,updated_at")
      .eq("student_id", studentId)
      .maybeSingle(),
    derivedPromise,
  ]);

  if (slsErr) {
    throw slsErr;
  }

  const accountSnapshot = {
    ...buildAccountSnapshotForParentReport(slsRow ?? null, derived, student.full_name),
    hasLearningStateRow: !!(slsRow && slsRow.id),
    studentLearningStateUpdatedAt: slsRow?.updated_at ?? null,
  };

  return {
    ...analyticsPayload,
    studentLearningState: slsRow ?? null,
    studentLearningDerived: derived,
    accountSnapshot,
  };
}
