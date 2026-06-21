/**
 * Gate achievement/card grant evaluation on home visit — cooldown + in-flight dedupe.
 * Grants themselves are idempotent (skip owned cards); this avoids re-scanning all rules every refresh.
 */

const GRANTS_COOLDOWN_MS = Number(process.env.STUDENT_HOME_ACHIEVEMENT_GRANTS_COOLDOWN_MS) || 10 * 60 * 1000;

/** @type {Map<string, { at: number, result: object }>} */
const lastResultByStudent = new Map();

/** @type {Map<string, Promise<object>>} */
const inFlightByStudent = new Map();

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {(supabase: import("@supabase/supabase-js").SupabaseClient, studentId: string) => Promise<object>} runGrants
 * @param {{ force?: boolean }} [opts]
 */
export async function runStudentHomeAchievementGrantsGated(supabase, studentId, runGrants, opts = {}) {
  const sid = String(studentId || "").trim();
  if (!sid) {
    return { ok: false, grantedCount: 0, granted: [], error: "missing_student_id" };
  }

  const force = opts.force === true;
  const now = Date.now();
  const cached = lastResultByStudent.get(sid);

  if (!force && cached && now - cached.at < GRANTS_COOLDOWN_MS) {
    return {
      ...cached.result,
      skipped: true,
      skipReason: "cooldown",
      evaluatedAt: new Date(cached.at).toISOString(),
      cooldownMsRemaining: GRANTS_COOLDOWN_MS - (now - cached.at),
    };
  }

  const existingFlight = inFlightByStudent.get(sid);
  if (existingFlight) {
    return existingFlight;
  }

  const flight = (async () => {
    try {
      const result = await runGrants(supabase, sid);
      const payload = {
        ...result,
        skipped: false,
        skipReason: null,
        evaluatedAt: new Date().toISOString(),
      };
      lastResultByStudent.set(sid, { at: Date.now(), result: payload });
      return payload;
    } finally {
      inFlightByStudent.delete(sid);
    }
  })();

  inFlightByStudent.set(sid, flight);
  return flight;
}

/** Test/dev helper */
export function invalidateStudentHomeAchievementGrantsGate(studentId) {
  if (studentId) {
    lastResultByStudent.delete(String(studentId));
    inFlightByStudent.delete(String(studentId));
    return;
  }
  lastResultByStudent.clear();
  inFlightByStudent.clear();
}

export { GRANTS_COOLDOWN_MS };
