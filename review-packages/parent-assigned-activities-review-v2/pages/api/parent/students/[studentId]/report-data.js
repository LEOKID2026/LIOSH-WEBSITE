import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import { requireParentApiContext } from "../../../../../lib/auth/persona-guard.server.js";
import {
  aggregateParentReportPayload,
  parseIsoDateParam,
  safeString,
  stripInternalReportPayloadFields,
} from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../../../../../lib/parent-server/parent-report-account-attachment.server.js";
import { enrichPayloadWithParentFacing } from "../../../../../lib/parent-server/parent-report-parent-facing.server.js";

const DEFAULT_RANGE_DAYS = 30;

function buildDefaultRange() {
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";

  const studentId = safeString(req.query?.studentId, 64);
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  const defaultRange = buildDefaultRange();
  const fromRaw = safeString(req.query?.from, 10);
  const toRaw = safeString(req.query?.to, 10);

  const fromDate = fromRaw ? parseIsoDateParam(fromRaw) : parseIsoDateParam(defaultRange.from);
  const toDate = toRaw ? parseIsoDateParam(toRaw) : parseIsoDateParam(defaultRange.to);
  if (!fromDate || !toDate) {
    return res.status(400).json({ ok: false, error: "Invalid date params, expected YYYY-MM-DD" });
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return res.status(400).json({ ok: false, error: "from must be <= to" });
  }

  try {
    const ctx = await requireParentApiContext(res, authHeader, { requireFeature: "reports_enabled" });
    if (ctx.stopped) return undefined;

    const { data: student, error: studentErr } = await ctx.bearerSupabase
      .from("students")
      .select("id,full_name,grade_level,is_active,parent_id")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (studentErr) {
      return res.status(403).json({ ok: false, error: "Could not verify student ownership" });
    }
    if (!student?.id) {
      return res.status(404).json({ ok: false, error: "Student not found for this parent" });
    }

    const serviceClient = getLearningSupabaseServiceRoleClient();
    const analytics = await aggregateParentReportPayload(serviceClient, student, fromDate, toDate, {
      includeParentActivities: true,
    });
    const payload = await attachStudentLearningAccountToParentReportPayload(serviceClient, student, analytics);
    const enriched = await enrichPayloadWithParentFacing(serviceClient, payload, studentId);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(200).json(stripInternalReportPayloadFields(enriched));
  } catch {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
