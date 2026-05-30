import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

/**
 * UTC month window for usage counting.
 * @param {Date} [now]
 */
export function resolveUtcMonthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 * @param {number|null|undefined} monthlyAiLimit
 */
export async function assertParentCopilotMonthlyLimit(serviceRole, parentUserId, monthlyAiLimit) {
  if (monthlyAiLimit == null) {
    return { ok: true, unlimited: true };
  }

  const { startIso, endIso } = resolveUtcMonthWindow();
  const { count, error } = await serviceRole
    .from("parent_copilot_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("parent_user_id", parentUserId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const used = count ?? 0;
  if (used >= monthlyAiLimit) {
    return { ok: false, status: 429, code: "monthly_ai_limit_exceeded", used, limit: monthlyAiLimit };
  }

  return { ok: true, used, limit: monthlyAiLimit };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentUserId
 */
export async function recordParentCopilotUsage(serviceRole, parentUserId) {
  const { error } = await serviceRole.from("parent_copilot_usage_log").insert({
    parent_user_id: parentUserId,
  });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true };
}
