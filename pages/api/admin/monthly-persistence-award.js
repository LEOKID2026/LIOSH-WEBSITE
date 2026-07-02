/**
 * Manual/admin trigger for monthly persistence coin rewards (Phase 2.6).
 *
 * POST body:
 *   { dryRun?: boolean, yearMonthIsrael?: "YYYY-MM", studentIds?: string[] }
 *
 * When yearMonthIsrael is omitted, defaults to the previous Israel calendar month.
 *
 * Auth: ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN=true
 *       x-admin-token header must match ENGINE_REVIEW_ADMIN_TOKEN
 */
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { getPreviousIsraelYearMonth } from "../../../lib/learning-supabase/israel-calendar.server";
import { runMonthlyPersistenceAwardJob } from "../../../lib/learning-supabase/monthly-persistence-reward.server";
import { timingSafeCompareStrings } from "../../../lib/security/timing-safe-equal.js";

function isAdminEnabled() {
  return process.env.ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN === "true";
}

function validateAdminToken(req) {
  const expected = process.env.ENGINE_REVIEW_ADMIN_TOKEN;
  const headerToken = req.headers["x-admin-token"] || req.headers["x-engine-review-token"];
  const sent = typeof headerToken === "string" ? headerToken.trim() : "";

  if (!expected || String(expected).trim() === "") {
    return { ok: false, status: 503, code: "missing_token", error: "ENGINE_REVIEW_ADMIN_TOKEN is not configured" };
  }
  if (!sent) {
    return { ok: false, status: 401, code: "missing_token", error: "Missing x-admin-token header" };
  }
  if (!timingSafeCompareStrings(sent, String(expected).trim())) {
    return { ok: false, status: 401, code: "invalid_token", error: "Admin token does not match server configuration" };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: "method_not_allowed", error: "Method not allowed" });
  }

  if (!isAdminEnabled()) {
    return res.status(403).json({
      code: "admin_disabled",
      error: "Monthly persistence admin is disabled. Set ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN=true",
    });
  }

  const auth = validateAdminToken(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ code: auth.code, error: auth.error });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const dryRun = body.dryRun === true;
  const yearMonthIsrael =
    typeof body.yearMonthIsrael === "string" && body.yearMonthIsrael.trim()
      ? body.yearMonthIsrael.trim()
      : getPreviousIsraelYearMonth();
  const studentIds = Array.isArray(body.studentIds)
    ? body.studentIds.map(String).filter(Boolean)
    : undefined;

  try {
    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await runMonthlyPersistenceAwardJob(supabase, {
      yearMonthIsrael,
      studentIds,
      dryRun,
    });

    return res.status(200).json({
      ok: true,
      dryRun,
      yearMonthIsrael: result.yearMonthIsrael,
      monthBounds: result.monthBounds,
      studentCount: result.studentCount,
      eligibleCount: result.eligibleCount,
      awardedCount: result.awardedCount,
      skippedCount: result.skippedCount,
      results: result.results,
    });
  } catch (err) {
    const message = err?.message || String(err);
    if (message.includes("invalid_year_month")) {
      return res.status(400).json({ code: "invalid_year_month", error: "yearMonthIsrael must be YYYY-MM" });
    }
    console.error("[monthly-persistence-award]", message);
    return res.status(500).json({ code: "internal_error", error: "Monthly persistence job failed" });
  }
}
