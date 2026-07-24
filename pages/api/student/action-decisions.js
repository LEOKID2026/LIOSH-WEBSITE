import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { aggregateParentReportPayload } from "../../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../../lib/parent-server/parent-report-parent-facing.server.js";
import { buildDetailedPayloadFromAggregatedReportBody } from "../../../lib/parent-server/db-input-to-detailed-report.server.js";
import { collectActionDecisionContractsV2 } from "../../../utils/action-decision-contract/public-action-decision-v2.js";
import { buildParentFacingFromAdcV2 } from "../../../utils/parent-report-engine-insights-he.js";

const RANGE_DAYS = 30;

function reportRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (RANGE_DAYS - 1));
  return { from, to };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }
    const student = {
      id: auth.studentId,
      full_name: auth.student?.full_name || "",
      grade_level: auth.student?.grade_level || null,
      is_active: auth.student?.is_active !== false,
      account_kind: auth.student?.account_kind || "student",
    };
    const { from, to } = reportRange();
    const serviceClient = getLearningSupabaseServiceRoleClient();
    const aggregate = await aggregateParentReportPayload(
      serviceClient,
      student,
      from,
      to,
      {
        includeParentActivities: false,
        includePrivateTeacherActivities: false,
      },
    );
    const enriched = await enrichPayloadWithParentFacing(
      serviceClient,
      aggregate,
      auth.studentId,
    );
    const detailed = await buildDetailedPayloadFromAggregatedReportBody(
      enriched,
      "custom",
    );
    return res.status(200).json({
      ok: true,
      contractVersion: "2.0.0",
      decisions: collectActionDecisionContractsV2(detailed || enriched),
      parentReport: detailed ? buildParentFacingFromAdcV2(detailed) : null,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Could not build action decisions" });
  }
}
