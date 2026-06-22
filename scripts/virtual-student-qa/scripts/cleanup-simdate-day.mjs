/**
 * Scoped cleanup for one simDate only (AAA students).
 * Deletes learning_sessions + answers stamped on that date; removes one report dir.
 * Does NOT touch state.json, coin_transactions, or parent_reports.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/cleanup-simdate-day.mjs --date 2026-06-08
 *   node scripts/virtual-student-qa/scripts/cleanup-simdate-day.mjs --date 2026-06-08 --execute
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getRepoRoot } from "../lib/config.mjs";

const AAA_LABELS = Array.from({ length: 12 }, (_, i) => `AAA${i + 1}`);

function parseArgs(argv) {
  let date = "";
  let execute = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--date") date = argv[++i];
    else if (argv[i] === "--execute") execute = true;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date YYYY-MM-DD is required");
  }
  return { date, execute };
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
const dayStart = `${args.date}T00:00:00.000Z`;
const dayEnd = `${nextDayIso(args.date)}T00:00:00.000Z`;
const sb = loadSupabase();
const studentIds = await resolveAaaStudentIds(sb);

const sessionIds = [];
for (const sid of studentIds) {
  const { data, error } = await sb
    .from("learning_sessions")
    .select("id")
    .eq("student_id", sid)
    .gte("started_at", dayStart)
    .lt("started_at", dayEnd);
  if (error) throw error;
  sessionIds.push(...(data || []).map((r) => r.id));
}
const uniqueSessionIds = [...new Set(sessionIds)];

let answerCount = 0;
if (uniqueSessionIds.length) {
  const { count, error } = await sb
    .from("answers")
    .select("id", { count: "exact", head: true })
    .in("learning_session_id", uniqueSessionIds);
  if (error) throw error;
  answerCount = count || 0;
}

const reportDir = join(getRepoRoot(), "reports", "virtual-student-daily", args.date);
const reportDirExists = existsSync(reportDir);

const summary = {
  date: args.date,
  execute: args.execute,
  sessions: uniqueSessionIds.length,
  answers: answerCount,
  reportDir,
  reportDirExists,
  untouched: ["state.json", "coin_transactions", "parent_reports", "other dates"],
};

if (!args.execute) {
  console.log(JSON.stringify({ ...summary, mode: "dry-run" }, null, 2));
  process.exit(0);
}

let answersDeleted = 0;
if (uniqueSessionIds.length) {
  answersDeleted = await deleteInChunks(sb, "answers", "learning_session_id", uniqueSessionIds);
}
let sessionsDeleted = 0;
if (uniqueSessionIds.length) {
  sessionsDeleted = await deleteInChunks(sb, "learning_sessions", "id", uniqueSessionIds);
}
let reportDirRemoved = false;
if (reportDirExists) {
  rmSync(reportDir, { recursive: true, force: true });
  reportDirRemoved = true;
}

console.log(
  JSON.stringify(
    {
      ...summary,
      mode: "executed",
      deleted: {
        answers: answersDeleted,
        learning_sessions: sessionsDeleted,
        reportDirRemoved,
      },
    },
    null,
    2
  )
);
