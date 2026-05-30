#!/usr/bin/env node
/**
 * Read-only report: active student_sessions with access_code_id IS NULL.
 * Does NOT modify data.
 *
 * Usage:
 *   node --env-file=.env.local scripts/security/inspect-null-access-code-sessions.mjs
 *
 * If Supabase credentials are unavailable, prints the manual SQL query.
 */
import { createClient } from "@supabase/supabase-js";

const MANUAL_SQL = `-- Read-only: count active student sessions missing access_code_id
SELECT COUNT(*) AS null_access_code_active_sessions
FROM student_sessions
WHERE access_code_id IS NULL
  AND ended_at IS NULL
  AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW());

-- Optional detail (limit 20):
SELECT id, student_id, started_at, last_seen_at, expires_at
FROM student_sessions
WHERE access_code_id IS NULL
  AND ended_at IS NULL
  AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY last_seen_at DESC NULLS LAST
LIMIT 20;`;

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) return null;
  return v;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL") || requireEnv("SUPABASE_URL");
  const key =
    requireEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    console.log("inspect-null-access-code-sessions: CREDENTIALS_MISSING (read-only SQL below)\n");
    console.log(MANUAL_SQL);
    process.exit(0);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const nowIso = new Date().toISOString();

  const { count, error: countErr } = await supabase
    .from("student_sessions")
    .select("id", { count: "exact", head: true })
    .is("access_code_id", null)
    .is("ended_at", null)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (countErr) {
    console.error("inspect-null-access-code-sessions: QUERY_ERROR", countErr.message);
    console.log("\nManual SQL fallback:\n");
    console.log(MANUAL_SQL);
    process.exit(1);
  }

  const { data: sample, error: sampleErr } = await supabase
    .from("student_sessions")
    .select("id, student_id, started_at, last_seen_at, expires_at")
    .is("access_code_id", null)
    .is("ended_at", null)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (sampleErr) {
    console.error("inspect-null-access-code-sessions: SAMPLE_ERROR", sampleErr.message);
    process.exit(1);
  }

  console.log("inspect-null-access-code-sessions: READ-ONLY REPORT");
  console.log(`null_access_code_active_sessions: ${count ?? 0}`);
  if ((sample || []).length) {
    console.log("\nSample rows (up to 20):");
    for (const row of sample) {
      console.log(JSON.stringify(row));
    }
    console.log(
      "\nNote: After fail-closed deploy, these sessions will be rejected on next /api/student/me."
    );
    console.log("No automatic cleanup was performed. End sessions manually if owner approves.");
  } else {
    console.log("No active sessions with access_code_id IS NULL.");
  }
  console.log("\nManual SQL for audit:\n");
  console.log(MANUAL_SQL);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
