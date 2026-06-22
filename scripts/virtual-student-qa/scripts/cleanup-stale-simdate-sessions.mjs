/**
 * Delete learning_sessions + answers on one simDate that are NOT listed in a
 * run-summary runWindow.driverSessionIds (stale aborted-run leftovers).
 * Does NOT touch state.json, coin_transactions, or report dirs.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/cleanup-stale-simdate-sessions.mjs \
 *     --date 2026-06-08 \
 *     --run-summary reports/virtual-student-daily/2026-06-08/run-summary.json
 *   ... --execute
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getRepoRoot } from "../lib/config.mjs";

const AAA_LABELS = Array.from({ length: 12 }, (_, i) => `AAA${i + 1}`);

function parseArgs(argv) {
  let date = "";
  let runSummary = "";
  let execute = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--date") date = argv[++i];
    else if (argv[i] === "--run-summary") runSummary = argv[++i];
    else if (argv[i] === "--execute") execute = true;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date YYYY-MM-DD is required");
  }
  if (!runSummary) throw new Error("--run-summary path is required");
  return { date, runSummary, execute };
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

function nextDayIso(simDate) {
  const d = new Date(`${simDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function collectDriverSessionIds(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collectDriverSessionIds(item, out);
    return out;
  }
  if (Array.isArray(node.driverSessionIds)) {
    for (const id of node.driverSessionIds) out.add(id);
  }
  for (const value of Object.values(node)) collectDriverSessionIds(value, out);
  return out;
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
    if (data?.[0]?.student_id) out.push(data[0].student_id);
  }
  return out;
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

const args = parseArgs(process.argv);
const summaryPath = join(getRepoRoot(), args.runSummary);
if (!existsSync(summaryPath)) throw new Error(`run-summary not found: ${summaryPath}`);

const keepIds = collectDriverSessionIds(JSON.parse(readFileSync(summaryPath, "utf8")));
const dayStart = `${args.date}T00:00:00.000Z`;
const dayEnd = `${nextDayIso(args.date)}T00:00:00.000Z`;
const sb = loadSupabase();
const studentIds = await resolveAaaStudentIds(sb);

const allSessionIds = [];
for (const sid of studentIds) {
  const { data, error } = await sb
    .from("learning_sessions")
    .select("id")
    .eq("student_id", sid)
    .gte("started_at", dayStart)
    .lt("started_at", dayEnd);
  if (error) throw error;
  allSessionIds.push(...(data || []).map((r) => r.id));
}
const uniqueAll = [...new Set(allSessionIds)];
const staleIds = uniqueAll.filter((id) => !keepIds.has(id));
const validIds = uniqueAll.filter((id) => keepIds.has(id));

let staleAnswerCount = 0;
if (staleIds.length) {
  const { count, error } = await sb
    .from("answers")
    .select("id", { count: "exact", head: true })
    .in("learning_session_id", staleIds);
  if (error) throw error;
  staleAnswerCount = count || 0;
}

let validAnswerCount = 0;
if (validIds.length) {
  const { count, error } = await sb
    .from("answers")
    .select("id", { count: "exact", head: true })
    .in("learning_session_id", validIds);
  if (error) throw error;
  validAnswerCount = count || 0;
}

const summary = {
  date: args.date,
  runSummary: args.runSummary,
  execute: args.execute,
  keepSessionCount: keepIds.size,
  totalSessionsOnDate: uniqueAll.length,
  validSessions: validIds.length,
  validAnswers: validAnswerCount,
  staleSessions: staleIds.length,
  staleAnswers: staleAnswerCount,
  staleSessionIds: staleIds,
  untouched: ["state.json", "coin_transactions", "report dirs", "other dates"],
};

if (!args.execute) {
  console.log(JSON.stringify({ ...summary, mode: "dry-run" }, null, 2));
  process.exit(0);
}

let answersDeleted = 0;
if (staleIds.length) {
  answersDeleted = await deleteInChunks(sb, "answers", "learning_session_id", staleIds);
}
let sessionsDeleted = 0;
if (staleIds.length) {
  sessionsDeleted = await deleteInChunks(sb, "learning_sessions", "id", staleIds);
}

console.log(
  JSON.stringify(
    {
      ...summary,
      mode: "executed",
      deleted: {
        answers: answersDeleted,
        learning_sessions: sessionsDeleted,
      },
    },
    null,
    2
  )
);
