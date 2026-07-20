/**
 * DB-backed daily AI quotas for coloring upload (HF requests only).
 */

import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  COLORING_UPLOAD_AI_GLOBAL_DAILY_LIMIT,
  COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
  coloringUploadRemaining,
  getIsraelNextMidnightResetAt,
  getIsraelUsageDateKey,
} from "./coloring-upload-quota-window.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} usageDate
 */
async function countUsageForDate(supabase, usageDate) {
  const { count, error } = await supabase
    .from("coloring_upload_ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("usage_date", usageDate);

  if (error) throw error;
  return count ?? 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} usageDate
 * @param {string} subjectKey
 */
async function countUsageForSubject(supabase, usageDate, subjectKey) {
  const { count, error } = await supabase
    .from("coloring_upload_ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("usage_date", usageDate)
    .eq("subject_key", subjectKey);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Check quotas before calling HF. Does not increment.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} subjectKey
 */
export async function checkColoringUploadAiQuota(supabase, subjectKey) {
  const usageDate = getIsraelUsageDateKey();
  const resetAt = getIsraelNextMidnightResetAt();

  try {
    const [globalUsed, userUsed] = await Promise.all([
      countUsageForDate(supabase, usageDate),
      countUsageForSubject(supabase, usageDate, subjectKey),
    ]);

    if (globalUsed >= COLORING_UPLOAD_AI_GLOBAL_DAILY_LIMIT) {
      return {
        ok: false,
        status: 429,
        code: "daily_global_limit_exceeded",
        scope: "global",
        remaining: 0,
        limit: COLORING_UPLOAD_AI_GLOBAL_DAILY_LIMIT,
        resetAt,
        messageHe: "מכסת היצירות היומית באתר הסתיימה. נסו שוב מחר.",
      };
    }

    if (userUsed >= COLORING_UPLOAD_AI_USER_DAILY_LIMIT) {
      return {
        ok: false,
        status: 429,
        code: "daily_user_limit_exceeded",
        scope: "user",
        remaining: 0,
        limit: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
        resetAt,
        messageHe: "הגעתם למגבלת 10 דפי הצביעה היומית. תוכלו ליצור דפים נוספים מחר.",
      };
    }

    return {
      ok: true,
      scope: "user",
      remaining: coloringUploadRemaining(userUsed, COLORING_UPLOAD_AI_USER_DAILY_LIMIT),
      limit: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
      resetAt,
      usageDate,
    };
  } catch (err) {
    if (isDbSchemaNotReadyError(err)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return {
      ok: true,
      scope: "user",
      remaining: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
      limit: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
      resetAt,
      usageDate,
      degraded: true,
    };
  }
}

/**
 * Record one successful HF generation.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} subjectKey
 * @param {string} [usageDate]
 */
export async function recordColoringUploadAiUsage(
  supabase,
  subjectKey,
  usageDate = getIsraelUsageDateKey()
) {
  try {
    const { error } = await supabase.from("coloring_upload_ai_usage").insert({
      usage_date: usageDate,
      subject_key: subjectKey,
    });
    if (error) {
      if (isDbSchemaNotReadyError(error)) return { ok: false, code: "db_schema_not_ready" };
      return { ok: false, code: "record_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "record_failed" };
  }
}

/**
 * Remaining quota after a successful generation.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} subjectKey
 */
export async function getColoringUploadAiQuotaStatus(supabase, subjectKey) {
  const usageDate = getIsraelUsageDateKey();
  const resetAt = getIsraelNextMidnightResetAt();
  try {
    const userUsed = await countUsageForSubject(supabase, usageDate, subjectKey);
    return {
      remaining: coloringUploadRemaining(userUsed, COLORING_UPLOAD_AI_USER_DAILY_LIMIT),
      limit: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
      resetAt,
    };
  } catch {
    return {
      remaining: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
      limit: COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
      resetAt,
    };
  }
}
