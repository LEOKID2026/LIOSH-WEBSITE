/**
 * Dry-run counts for scoped AAA simulation reset from a cutoff date.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/dry-run-aaa-reset.mjs
 *   node scripts/virtual-student-qa/scripts/dry-run-aaa-reset.mjs --from 2026-05-01
 *
 * Read-only — never deletes.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getRepoRoot } from "../lib/config.mjs";

const AAA_LABELS = Array.from({ length: 12 }, (_, i) => `AAA${i + 1}`);

function parseArgs(argv) {
  let from = "2026-05-01";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--from") from = argv[++i];
  }
  return { from };
}

function loadSupabase() {
  const root = getRepoRoot();
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^LEARNING_SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
      if (m && !process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY) {
        process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY = m[1].trim();
      }
      const u = line.match(/^NEXT_PUBLIC_LEARNING_SUPABASE_URL=(.+)$/);
      if (u && !process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL) {
        process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL = u[1].trim();
      }
    }
  }
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL/service role in .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

function countLocalReportDirs(fromDate) {
  const dir = join(getRepoRoot(), "reports", "virtual-student-daily");
  if (!existsSync(dir)) return { dirs: 0, paths: [] };
  const paths = [];
  for (const name of readdirSync(dir)) {
    if (name >= fromDate && /^\d{4}-\d{2}-\d{2}/.test(name)) {
      paths.push(join(dir, name));
    }
  }
  return { dirs: paths.length, paths: paths.slice(0, 5) };
}

const args = parseArgs(process.argv);
const fromIso = `${args.from}T00:00:00.000Z`;
const sb = loadSupabase();

const students = [];
for (const label of AAA_LABELS) {
  const { data, error } = await sb
    .from("student_access_codes")
    .select("student_id, login_username, students(id, full_name, grade_level)")
    .eq("login_username", label.toLowerCase())
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  students.push({
    label,
    studentId: row?.student_id || null,
    login: row?.login_username || null,
    fullName: row?.students?.full_name || null,
    grade: row?.students?.grade_level || null,
  });
}

const studentIds = students.map((s) => s.studentId).filter(Boolean);
if (studentIds.length === 0) throw new Error("No AAA student IDs resolved");

const perStudent = {};
let sessionIds = [];

for (const s of students) {
  if (!s.studentId) {
    perStudent[s.label] = { error: "no student_id" };
    continue;
  }
  const { count: sessCount, data: sessRows, error: sErr } = await sb
    .from("learning_sessions")
    .select("id", { count: "exact" })
    .eq("student_id", s.studentId)
    .gte("started_at", fromIso);
  if (sErr) throw sErr;
  const ids = (sessRows || []).map((r) => r.id);
  sessionIds.push(...ids);

  let answerCount = 0;
  if (ids.length) {
    const { count, error: aErr } = await sb
      .from("answers")
      .select("id", { count: "exact", head: true })
      .in("learning_session_id", ids);
    if (aErr) throw aErr;
    answerCount = count || 0;
  }

  const { count: coinCount, error: cErr } = await sb
    .from("coin_transactions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", s.studentId)
    .gte("created_at", fromIso);
  if (cErr) throw cErr;

  const { count: reportCount, error: rErr } = await sb
    .from("parent_reports")
    .select("id", { count: "exact", head: true })
    .eq("student_id", s.studentId)
    .gte("created_at", fromIso);
  if (rErr) throw rErr;

  perStudent[s.label] = {
    studentId: s.studentId,
    learning_sessions: sessCount || 0,
    answers: answerCount,
    coin_transactions: coinCount || 0,
    parent_reports: reportCount || 0,
  };
}

sessionIds = [...new Set(sessionIds)];

const { count: sessionCoinCount } = await sb
  .from("coin_transactions")
  .select("id", { count: "exact", head: true })
  .in("student_id", studentIds)
  .eq("source_type", "learning_session")
  .gte("created_at", fromIso);

const localReports = countLocalReportDirs(args.from);
const statePath = join(
  process.env.LOCALAPPDATA || "",
  "liosh-qa",
  "virtual-student-state",
  "state.json"
);
let stateSnapshot = null;
if (existsSync(statePath)) {
  try {
    const st = JSON.parse(readFileSync(statePath, "utf8"));
    stateSnapshot = {
      lastRunDate: st.lastRunDate,
      lastRunStatus: st.lastRunStatus,
    };
  } catch {
    stateSnapshot = { error: "unreadable" };
  }
}

const backupPath = join(
  process.env.LOCALAPPDATA || "",
  "liosh-qa",
  "backups",
  `aaa-reset-dryrun-${args.from}-${new Date().toISOString().replace(/[:.]/g, "-")}`
);

console.log(
  JSON.stringify(
    {
      mode: "dry-run-only",
      cutoffDate: args.from,
      cutoffIso: fromIso,
      aaaStudents: students,
      perStudentCounts: perStudent,
      totals: {
        learning_sessions: Object.values(perStudent).reduce(
          (a, r) => a + (r.learning_sessions || 0),
          0
        ),
        answers: Object.values(perStudent).reduce(
          (a, r) => a + (r.answers || 0),
          0
        ),
        coin_transactions_since_cutoff: Object.values(perStudent).reduce(
          (a, r) => a + (r.coin_transactions || 0),
          0
        ),
        coin_transactions_learning_session_source: sessionCoinCount || 0,
        parent_reports: Object.values(perStudent).reduce(
          (a, r) => a + (r.parent_reports || 0),
          0
        ),
        distinct_session_ids: sessionIds.length,
      },
      tablesToDeleteOrTrim: [
        "answers (by learning_session_id in scoped sessions)",
        "coin_transactions (AAA students, created_at >= cutoff, especially source_type=learning_session)",
        "learning_sessions (AAA students, started_at >= cutoff)",
        "parent_reports (AAA students, created_at >= cutoff, if any cached rows)",
      ],
      tablesNotTouched: [
        "students",
        "student_access_codes",
        "parent accounts / parent_students links",
        "school / teacher / classroom data",
        "non-AAA users",
        "schema / migrations",
        "student_learning_state (review separately — may retain mission metadata)",
      ],
      nonAaaSafety:
        "All queries filter student_id IN (AAA1..AAA12 UUIDs only) or learning_session_id IN scoped session set.",
      localArtifacts: {
        reportDirsFromCutoff: localReports,
        statePath: existsSync(statePath) ? statePath : null,
        stateSnapshot,
        proposedBackupDir: backupPath,
      },
      localStateAfterReset: {
        lastRunDate: "2026-04-30",
        lastRunStatus: "pass",
        note: "Applied only during execute phase after backup",
      },
    },
    null,
    2
  )
);
