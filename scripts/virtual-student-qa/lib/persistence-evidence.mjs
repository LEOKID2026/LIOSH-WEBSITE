/**
 * Real persistence evidence verifier.
 *
 * Tier 1 (always required, browser network): assert that the three real
 * persistence endpoints fired and returned 200 the expected number of times.
 * Reads the network summary built by lib/browser.mjs — never reads
 * localStorage as primary evidence.
 *
 * Tier 2 (optional, Supabase row count): only enabled when SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY are set. Lazily imports @supabase/supabase-js so
 * the runner does not require the Supabase env in default Phase A runs.
 * Read-only — no writes, no schema changes.
 */

export function verifyTier1({ networkSummary, expectedAnswers }) {
  const errors = [];
  const start = networkSummary?.["/api/learning/session/start"];
  const answer = networkSummary?.["/api/learning/answer"];
  const finish = networkSummary?.["/api/learning/session/finish"];

  if (!start || start.responses < 1) {
    errors.push("expected at least 1 /api/learning/session/start response, got 0");
  } else if (start.ok < 1) {
    errors.push(
      `session/start responses had no successful response (responses=${start.responses}, ok=${start.ok}, fail=${start.fail})`
    );
  } else if (!start.sessionId) {
    errors.push("session/start succeeded but no learningSessionId in response body");
  }

  if (!answer || answer.responses < expectedAnswers) {
    errors.push(
      `expected ${expectedAnswers} /api/learning/answer responses, got ${answer?.responses ?? 0}`
    );
  } else if (answer.fail > 0) {
    errors.push(`/api/learning/answer had ${answer.fail} failed response(s)`);
  }

  if (!finish || finish.responses < 1) {
    errors.push("expected at least 1 /api/learning/session/finish response, got 0");
  } else if (finish.ok < 1) {
    errors.push(
      `session/finish responses had no successful response (responses=${finish.responses}, ok=${finish.ok}, fail=${finish.fail})`
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    sessionId: start?.sessionId || null,
    counts: {
      sessionStart: start?.responses ?? 0,
      sessionStartOk: start?.ok ?? 0,
      answer: answer?.responses ?? 0,
      answerOk: answer?.ok ?? 0,
      sessionFinish: finish?.responses ?? 0,
      sessionFinishOk: finish?.ok ?? 0,
    },
  };
}

export async function verifyTier2({ sessionId, expectedAnswers, log }) {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceRoleKey) {
    return { enabled: false, reason: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set" };
  }
  if (!sessionId) {
    return { enabled: false, reason: "no learningSessionId from Tier 1; skipping Tier 2" };
  }

  let createClient;
  try {
    ({ createClient } = await import("@supabase/supabase-js"));
  } catch (error) {
    return {
      enabled: false,
      reason: `@supabase/supabase-js import failed: ${error?.message || error}`,
    };
  }

  try {
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    log("persistence-evidence(tier2): querying answers + learning_sessions");

    const answersResult = await client
      .from("answers")
      .select("*", { count: "exact", head: true })
      .eq("learning_session_id", sessionId);

    if (answersResult.error) {
      return {
        enabled: true,
        passed: false,
        errors: [`answers count failed: ${answersResult.error.message}`],
      };
    }

    const sessionResult = await client
      .from("learning_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .single();

    if (sessionResult.error) {
      return {
        enabled: true,
        passed: false,
        errors: [`learning_sessions lookup failed: ${sessionResult.error.message}`],
      };
    }

    const errors = [];
    if (typeof answersResult.count === "number" && answersResult.count < expectedAnswers) {
      errors.push(
        `expected at least ${expectedAnswers} answer rows for session ${sessionId}, got ${answersResult.count}`
      );
    }
    if (sessionResult.data?.status !== "completed") {
      errors.push(
        `learning_sessions.status expected 'completed', got '${sessionResult.data?.status}'`
      );
    }

    return {
      enabled: true,
      passed: errors.length === 0,
      errors,
      counts: {
        answerRows: answersResult.count ?? null,
        sessionStatus: sessionResult.data?.status ?? null,
      },
    };
  } catch (error) {
    return {
      enabled: true,
      passed: false,
      errors: [`tier2 unexpected error: ${error?.message || error}`],
    };
  }
}
