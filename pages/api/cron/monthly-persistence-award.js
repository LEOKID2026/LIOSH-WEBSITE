/**
 * Scheduled monthly persistence coin awards (Phase 2.6).
 *
 * Runs daily via Vercel Cron. On the first Israel calendar day of each month,
 * awards the previous month's persistence tiers to all eligible students.
 *
 * Auth: CRON_SECRET - Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.
 *       ENABLE_MONTHLY_PERSISTENCE_CRON=true must be set.
 */
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  getPreviousIsraelYearMonth,
  isFirstIsraelCalendarDay,
} from "../../../lib/learning-supabase/israel-calendar.server";
import { runMonthlyPersistenceAwardJob } from "../../../lib/learning-supabase/monthly-persistence-reward.server";
import { timingSafeCompareStrings } from "../../../lib/security/timing-safe-equal.js";

function isCronEnabled() {
  return process.env.ENABLE_MONTHLY_PERSISTENCE_CRON === "true";
}

function validateCronSecret(req) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const sent = bearer || String(req.headers["x-cron-secret"] || "").trim();

  if (!expected || String(expected).trim() === "") {
    return { ok: false, status: 503, code: "missing_secret", error: "CRON_SECRET is not configured" };
  }
  if (!sent) {
    return { ok: false, status: 401, code: "missing_secret", error: "Missing cron authorization" };
  }
  if (!timingSafeCompareStrings(sent, String(expected).trim())) {
    return { ok: false, status: 401, code: "invalid_secret", error: "Cron secret does not match" };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ code: "method_not_allowed", error: "Method not allowed" });
  }

  if (!isCronEnabled()) {
    return res.status(403).json({
      code: "cron_disabled",
      error: "Monthly persistence cron is disabled. Set ENABLE_MONTHLY_PERSISTENCE_CRON=true",
    });
  }

  const auth = validateCronSecret(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ code: auth.code, error: auth.error });
  }

  if (!isFirstIsraelCalendarDay()) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "not_first_israel_calendar_day",
      israelDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }),
    });
  }

  const yearMonthIsrael = getPreviousIsraelYearMonth();

  try {
    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await runMonthlyPersistenceAwardJob(supabase, {
      yearMonthIsrael,
      dryRun: false,
    });

    return res.status(200).json({
      ok: true,
      trigger: "cron",
      yearMonthIsrael: result.yearMonthIsrael,
      monthBounds: result.monthBounds,
      studentCount: result.studentCount,
      eligibleCount: result.eligibleCount,
      awardedCount: result.awardedCount,
      skippedCount: result.skippedCount,
    });
  } catch (err) {
    const message = err?.message || String(err);
    console.error("[cron/monthly-persistence-award]", message);
    return res.status(500).json({ code: "internal_error", error: "Monthly persistence cron job failed" });
  }
}
