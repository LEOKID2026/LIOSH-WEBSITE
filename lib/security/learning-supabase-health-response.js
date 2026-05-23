/**
 * Pure helpers for /api/learning-supabase/health response shaping.
 */

/**
 * @param {Array<{ table: string, ok: boolean, errorCode?: string | null }>} tableChecks
 * @param {{ maskInternals: boolean, projectHost?: string | null, checkedAt: string }}
 */
export function buildLearningSupabaseHealthBody(tableChecks, options) {
  const { maskInternals, projectHost, checkedAt } = options;
  const allOk = tableChecks.every((c) => c.ok);
  const okCount = tableChecks.filter((c) => c.ok).length;
  const failedCount = tableChecks.length - okCount;

  if (maskInternals) {
    return {
      ok: allOk,
      service: "learning-supabase",
      projectHost: null,
      checksSummary: {
        total: tableChecks.length,
        okCount,
        failedCount,
      },
      checkedAt,
    };
  }

  return {
    ok: allOk,
    service: "learning-supabase",
    projectHost: projectHost ?? null,
    checks: tableChecks,
    checkedAt,
  };
}

export function buildLearningSupabaseHealthErrorBody(options) {
  const { maskInternals, projectHost, checkedAt } = options;
  return {
    ok: false,
    service: "learning-supabase",
    projectHost: maskInternals ? null : projectHost ?? null,
    error: "Learning Supabase health check failed",
    checkedAt,
  };
}
