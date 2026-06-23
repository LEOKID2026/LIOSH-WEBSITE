import {
  aggregateParentReportPayload,
  isoDateOnly,
  stripInternalReportPayloadFields,
} from "../parent-server/report-data-aggregate.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../parent-server/parent-report-account-attachment.server.js";
import { enrichPayloadWithParentFacing } from "../parent-server/parent-report-parent-facing.server.js";
import { maskStudentFullName } from "../teacher-server/teacher-students.server.js";
import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import {
  loadStudentRowForTeacherReport,
  resolveTeacherReportDateRange,
} from "../teacher-server/teacher-report.server.js";

const GUARDIAN_STRIP_KEYS = new Set([
  "parent",
  "parentId",
  "parent_id",
  "parentEmail",
  "parent_email",
  "parentName",
  "parent_name",
  "parentDisplayName",
  "parent_display_name",
  "copilotLastResponse",
  "parentAiExplanation",
  "parentCopilot",
  "copilot",
  "guardianAccessSummary",
  "teacherGuidanceBlock",
  "gamification",
  "coins",
  "inventory",
  "coinBalance",
  "coinTransactions",
]);

/**
 * @param {Record<string, unknown>} payload
 */
export function sanitizeReportPayloadForGuardian(payload) {
  const out = { ...payload };
  for (const key of GUARDIAN_STRIP_KEYS) {
    delete out[key];
  }

  if (out.student && typeof out.student === "object") {
    const student = out.student;
    out.student = {
      id: student.id,
      full_name: maskStudentFullName(student.full_name),
      grade_level: student.grade_level ?? null,
      is_active: student.is_active === true,
    };
  }

  if (out.accountSnapshot && typeof out.accountSnapshot === "object") {
    const snap = { ...out.accountSnapshot };
    delete snap.parentId;
    delete snap.parent_id;
    delete snap.parentEmail;
    delete snap.parent_email;
    delete snap.parentName;
    delete snap.parent_name;
    if (typeof snap.displayName === "string" && snap.displayName.trim()) {
      snap.displayName = maskStudentFullName(snap.displayName);
    }
    out.accountSnapshot = snap;
  }

  out.reportMeta = {
    ...(typeof out.reportMeta === "object" && out.reportMeta ? out.reportMeta : {}),
    audience: "guardian",
    source: "guardian_view",
  };

  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} guardianAccessId
 * @param {string} studentId
 */
export async function writeGuardianViewReportAuditIfNeeded(serviceRole, guardianAccessId, studentId) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { data: recent } = await serviceRole
    .from("teacher_access_audit")
    .select("id, metadata")
    .eq("guardian_access_id", guardianAccessId)
    .eq("action", "viewed_student_report")
    .gte("created_at", dayStart.toISOString())
    .limit(20);

  const alreadyLogged = (recent || []).some(
    (row) =>
      row?.metadata &&
      typeof row.metadata === "object" &&
      row.metadata.source === "guardian_view"
  );
  if (alreadyLogged) return;

  await writeTeacherAuditRow({
    serviceRole,
    studentId,
    guardianAccessId,
    action: "viewed_student_report",
    actorRole: "guardian",
    actorId: guardianAccessId,
    metadata: { student_id: studentId, source: "guardian_view" },
  });
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   guardianAccessId: string,
 *   boundStudentId: string,
 *   requestedStudentId: string,
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 */
export async function buildGuardianStudentReportPayload(input) {
  const { serviceRole, guardianAccessId, boundStudentId, requestedStudentId, fromDate, toDate } =
    input;

  if (requestedStudentId !== boundStudentId) {
    return { ok: false, status: 403, code: "student_scope_violation" };
  }

  const loaded = await loadStudentRowForTeacherReport(serviceRole, boundStudentId);
  if (!loaded.ok) return loaded;

  const analytics = await aggregateParentReportPayload(
    serviceRole,
    loaded.student,
    fromDate,
    toDate,
    { includeParentActivities: true, includePrivateTeacherActivities: true }
  );
  const withAccount = await attachStudentLearningAccountToParentReportPayload(
    serviceRole,
    loaded.student,
    analytics
  );
  const stripped = stripInternalReportPayloadFields(withAccount);
  const payload = sanitizeReportPayloadForGuardian(stripped);
  const enrichedReport = stripInternalReportPayloadFields(
    await enrichPayloadWithParentFacing(serviceRole, payload, boundStudentId)
  );

  await writeGuardianViewReportAuditIfNeeded(serviceRole, guardianAccessId, boundStudentId);

  return {
    ok: true,
    payload: {
      ok: true,
      student: enrichedReport.student || payload.student || {
        id: boundStudentId,
        full_name: maskStudentFullName(loaded.student.full_name),
      },
      range: {
        from: isoDateOnly(fromDate),
        to: isoDateOnly(toDate),
      },
      report: enrichedReport,
      reportMeta: enrichedReport.reportMeta,
    },
  };
}

export { resolveTeacherReportDateRange };
