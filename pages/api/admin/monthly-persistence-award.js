/**
 * Manual/admin trigger for monthly persistence coin rewards (Phase 2.6).
 *
 * POST body:
 *   { dryRun?: boolean, yearMonthIsrael?: "YYYY-MM", studentIds?: string[] }
 *
 * When yearMonthIsrael is omitted, defaults to the previous Israel calendar month.
 *
 * Auth: ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN=true + requireAdminApiContext JWT
 */
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { getPreviousIsraelYearMonth } from "../../../lib/learning-supabase/israel-calendar.server";
import { runMonthlyPersistenceAwardJob } from "../../../lib/learning-supabase/monthly-persistence-reward.server";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../lib/admin-server/admin-request.server.js";

function isAdminEnabled() {
  return process.env.ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN === "true";
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

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const dryRun = body.dryRun === true;
    const yearMonthIsrael =
      typeof body.yearMonthIsrael === "string" && body.yearMonthIsrael.trim()
        ? body.yearMonthIsrael.trim()
        : getPreviousIsraelYearMonth();
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.map(String).filter(Boolean)
      : undefined;

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await runMonthlyPersistenceAwardJob(supabase, {
      yearMonthIsrael,
      studentIds,
      dryRun,
    });

    return res.status(200).json({
      ok: true,
      dryRun,
      adminUserId: ctx.adminUserId,
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
      return sendAdminApiError(res, 400, "invalid_year_month", "yearMonthIsrael must be YYYY-MM");
    }
    console.error("[monthly-persistence-award]", message);
    return sendAdminApiError(res, 500, "internal_error", "Monthly persistence job failed");
  }
}
