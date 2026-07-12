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
/** Short-lived in-memory cache — same parent/student/range within TTL skips re-aggregation. */
const REPORT_DATA_CACHE_TTL_MS = 90_000;

/** @type {Map<string, { expiresAt: number, payload: unknown }>} */
const reportDataResponseCache = new Map();

function reportDataCacheKey(parentUserId, studentId, fromYmd, toYmd) {
  return `${parentUserId}|${studentId}|${fromYmd}|${toYmd}`;
}

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
      .select("id,full_name,grade_level,is_active,parent_id,account_kind")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (studentErr) {
      return res.status(403).json({ ok: false, error: "Could not verify student ownership" });
    }
    if (!student?.id) {
      return res.status(404).json({ ok: false, error: "Student not found for this parent" });
    }
    if (student.account_kind === "guest") {
      return res.status(403).json({ ok: false, error: "לא זמין לאורח", code: "guest_not_eligible" });
    }

    const fromYmd = fromDate.toISOString().slice(0, 10);
    const toYmd = toDate.toISOString().slice(0, 10);
    const cacheKey = reportDataCacheKey(ctx.parentUserId, studentId, fromYmd, toYmd);
    const cached = reportDataResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      return res.status(200).json(cached.payload);
    }

    const serviceClient = getLearningSupabaseServiceRoleClient();
    const analytics = await aggregateParentReportPayload(serviceClient, student, fromDate, toDate, {
      includeParentActivities: true,
      includePrivateTeacherActivities: true,
    });
    const payload = await attachStudentLearningAccountToParentReportPayload(serviceClient, student, analytics);
    const enriched = await enrichPayloadWithParentFacing(serviceClient, payload, studentId);
    const responseBody = stripInternalReportPayloadFields(enriched);
    reportDataResponseCache.set(cacheKey, {
      expiresAt: Date.now() + REPORT_DATA_CACHE_TTL_MS,
      payload: responseBody,
    });
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(200).json(responseBody);
  } catch {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
