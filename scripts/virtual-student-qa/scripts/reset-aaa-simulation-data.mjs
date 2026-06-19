/**
 * Scoped AAA simulation reset from cutoff date.
 *
 * Default: dry-run summary only.
 * Execute: --execute (requires --from YYYY-MM-DD, backs up then deletes)
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/reset-aaa-simulation-data.mjs --from 2026-05-01
 *   node scripts/virtual-student-qa/scripts/reset-aaa-simulation-data.mjs --from 2026-05-01 --execute
 */
import { createClient } from "@supabase/supabase-js";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getRepoRoot, resolveStateDir } from "../lib/config.mjs";

const AAA_LABELS = Array.from({ length: 12 }, (_, i) => `AAA${i + 1}`);

function parseArgs(argv) {
  let from = "2026-05-01";
  let execute = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--from") from = argv[++i];
    else if (argv[i] === "--execute") execute = true;
  }
  return { from, execute };
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

async function resolveAaaStudentIds(sb) {
  const out = [];
  for (const label of AAA_LABELS) {
    const { data, error } = await sb
      .from("student_access_codes")
      .select("student_id, login_username")
      .eq("login_username", label.toLowerCase())
      .eq("is_active", true)
      .is("revoked_at", null)
      .limit(1);
    if (error) throw error;
    if (data?.[0]?.student_id) {
      out.push({ label, studentId: data[0].student_id });
    }
  }
  return out;
}

async function fetchSessionIds(sb, studentIds, fromIso) {
  const ids = [];
  for (const sid of studentIds) {
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await sb
        .from("learning_sessions")
        .select("id")
        .eq("student_id", sid)
        .gte("started_at", fromIso)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data?.length) break;
      ids.push(...data.map((r) => r.id));
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  return [...new Set(ids)];
}

async function deleteInChunks(sb, table, column, ids, chunkSize = 200) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error, count } = await sb.from(table).delete({ count: "exact" }).in(column, chunk);
    if (error) throw error;
    deleted += count || chunk.length;
  }
  return deleted;
}

function backupLocalState(backupDir) {
  const stateDir = resolveStateDir();
  const statePath = join(stateDir, "state.json");
  if (!existsSync(statePath)) return null;
  mkdirSync(backupDir, { recursive: true });
  const dest = join(backupDir, "state.json.bak");
  copyFileSync(statePath, dest);
  return dest;
}

function resetLocalState(fromDate) {
  const stateDir = resolveStateDir();
  const statePath = join(stateDir, "state.json");
  const state = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf8"))
    : {};
  state.lastRunDate = "2026-04-30";
  state.lastRunStatus = "pass";
  state.lastRunMode = "realtime";
  let attendanceRemoved = 0;
  for (const label of Object.keys(state.students || {})) {
    const arr = state.students[label]?.attendance;
    if (!Array.isArray(arr)) continue;
    const before = arr.length;
    state.students[label].attendance = arr.filter((a) => !a?.date || a.date < fromDate);
    attendanceRemoved += before - state.students[label].attendance.length;
  }
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");

  const timelinePath = join(stateDir, "timeline.md");
  if (existsSync(timelinePath)) {
    const lines = readFileSync(timelinePath, "utf8").split("\n");
    const kept = lines.filter((line) => {
      const m = line.match(/^\| (\d{4}-\d{2}-\d{2}) \|/);
      return !m || m[1] < fromDate;
    });
    writeFileSync(timelinePath, kept.join("\n"), "utf8");
  }
  return { attendanceRemoved };
}

function removeLocalReportDirs(fromDate) {
  const dir = join(getRepoRoot(), "reports", "virtual-student-daily");
  if (!existsSync(dir)) return 0;
  let removed = 0;
  for (const name of readdirSync(dir)) {
    if (name >= fromDate && /^\d{4}-\d{2}-\d{2}/.test(name)) {
      rmSync(join(dir, name), { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

const args = parseArgs(process.argv);
const fromIso = `${args.from}T00:00:00.000Z`;
const sb = loadSupabase();
const aaa = await resolveAaaStudentIds(sb);
const studentIds = aaa.map((a) => a.studentId);
const sessionIds = await fetchSessionIds(sb, studentIds, fromIso);

const summary = {
  from: args.from,
  execute: args.execute,
  aaaStudents: aaa.length,
  sessionIds: sessionIds.length,
};

if (!args.execute) {
  console.log(
    JSON.stringify(
      {
        ...summary,
        mode: "dry-run",
        message: "Re-run with --execute to apply scoped delete after smoke PASS.",
      },
      null,
      2
    )
  );
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = join(
  process.env.LOCALAPPDATA || "",
  "liosh-qa",
  "backups",
  `aaa-reset-execute-${args.from}-${stamp}`
);
mkdirSync(backupDir, { recursive: true });

const exportMeta = { from: args.from, sessionIds: sessionIds.length, studentIds };
writeFileSync(join(backupDir, "reset-meta.json"), JSON.stringify(exportMeta, null, 2));

let answersDeleted = 0;
if (sessionIds.length) {
  answersDeleted = await deleteInChunks(sb, "answers", "learning_session_id", sessionIds);
}

let coinsDeleted = 0;
for (const sid of studentIds) {
  const { error } = await sb
    .from("coin_transactions")
    .delete()
    .eq("student_id", sid)
    .gte("created_at", fromIso);
  if (error) throw error;
}
const { count: coinCount } = await sb
  .from("coin_transactions")
  .select("id", { count: "exact", head: true })
  .in("student_id", studentIds)
  .gte("created_at", fromIso);
coinsDeleted = coinCount === 0 ? "deleted" : coinCount;

for (const sid of studentIds) {
  const { error } = await sb
    .from("parent_reports")
    .delete()
    .eq("student_id", sid)
    .gte("created_at", fromIso);
  if (error) throw error;
}

let sessionsDeleted = 0;
if (sessionIds.length) {
  sessionsDeleted = await deleteInChunks(sb, "learning_sessions", "id", sessionIds);
}

const stateBackup = backupLocalState(backupDir);
const stateCleanup = resetLocalState(args.from);
const reportDirsRemoved = removeLocalReportDirs(args.from);

console.log(
  JSON.stringify(
    {
      ...summary,
      mode: "executed",
      backupDir,
      deleted: {
        answers: answersDeleted,
        learning_sessions: sessionsDeleted,
        coin_transactions: "scoped delete per student from cutoff",
        parent_reports: "scoped delete per student from cutoff",
      },
      local: {
        stateBackup,
        stateLastRunDate: "2026-04-30",
        attendanceRowsRemoved: stateCleanup.attendanceRemoved,
        reportDirsRemoved,
      },
    },
    null,
    2
  )
);
