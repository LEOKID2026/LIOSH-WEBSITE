/**
 * Scoped AAA simulation timestamp repair.
 *
 * Maps session IDs from run-summary artifacts only (never broad date patches).
 * Shifts DB timestamps to the simulated calendar date while preserving
 * duration_seconds, correctness, mode/gameMode, and diagnostic content.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getRepoRoot } from "./config.mjs";

export const AAA_LABELS = Array.from({ length: 12 }, (_, i) => `AAA${i + 1}`);

export const PARENT_REPORT_FILTER = {
  sessions: "learning_sessions.started_at (fallback created_at)",
  answers: "answers.answered_at (fallback created_at)",
  simulatedDateColumn: "none in DB — only run-summary.json resolved.date",
};

const DAY_ANCHOR_HOUR_UTC = 6;
const SESSION_GAP_MS = 2 * 60 * 1000;

export function loadSupabaseClient() {
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
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL / LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function resolveAaaStudentMap(sb) {
  const labelToStudentId = new Map();
  const studentIdToLabel = new Map();
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
      labelToStudentId.set(label, data[0].student_id);
      studentIdToLabel.set(data[0].student_id, label);
    }
  }
  return { labelToStudentId, studentIdToLabel };
}

/**
 * Load sessionId → simulatedDate mappings from PASS run-summary artifacts only.
 */
export function loadArtifactSessionMappings({ from, to }) {
  const reportsDir = join(getRepoRoot(), "reports", "virtual-student-daily");
  if (!existsSync(reportsDir)) {
    return { mappings: [], stats: { passDays: 0, missingSessionId: 0, duplicateSessionIds: 0 } };
  }

  const mappings = [];
  const seen = new Map();
  const duplicateSessionIds = new Set();
  let passDays = 0;
  let missingSessionId = 0;

  for (const name of readdirSync(reportsDir).sort()) {
    if (name < from || name > to) continue;
    const summaryPath = join(reportsDir, name, "run-summary.json");
    if (!existsSync(summaryPath)) continue;

    const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    const passed =
      summary.status === "pass" || summary.suite?.summary?.verdict === "pass";
    if (!passed) continue;
    passDays += 1;

    const simDate = summary.resolved?.date || summary.args?.date || name;
    for (const student of summary.suite?.students || []) {
      if (student.status !== "pass") continue;
      for (const session of student.sessions || []) {
        const sessionId =
          session.tier1Counts?.["/api/learning/session/start"]?.sessionId;
        if (!sessionId) {
          missingSessionId += 1;
          continue;
        }
        if (seen.has(sessionId)) duplicateSessionIds.add(sessionId);
        const entry = {
          sessionId,
          simDate,
          label: student.label,
          subject: session.subject,
          topic: session.topic,
          sessionIndex: session.index ?? 0,
          durationMs: session.durationMs ?? null,
        };
        seen.set(sessionId, entry);
        mappings.push(entry);
      }
    }
  }

  return {
    mappings,
    stats: {
      passDays,
      mappedSessionIds: seen.size,
      missingSessionId,
      duplicateSessionIds: duplicateSessionIds.size,
    },
  };
}

function dayAnchorIso(simDate) {
  return `${simDate}T${String(DAY_ANCHOR_HOUR_UTC).padStart(2, "0")}:00:00.000Z`;
}

/**
 * Compute target started_at per session within a simulated day.
 * Preserves session order; uses DB duration_seconds for spacing.
 */
export function planSessionTimestamps(mappings, dbSessionsById) {
  const byDay = new Map();
  for (const m of mappings) {
    if (!byDay.has(m.simDate)) byDay.set(m.simDate, []);
    byDay.get(m.simDate).push(m);
  }

  const plans = [];
  for (const [simDate, dayMappings] of [...byDay.entries()].sort()) {
    dayMappings.sort((a, b) => {
      const lc = a.label.localeCompare(b.label);
      if (lc !== 0) return lc;
      if (a.sessionIndex !== b.sessionIndex) return a.sessionIndex - b.sessionIndex;
      const aStart = dbSessionsById.get(a.sessionId)?.started_at || "";
      const bStart = dbSessionsById.get(b.sessionId)?.started_at || "";
      return aStart.localeCompare(bStart);
    });

    let cursorMs = Date.parse(dayAnchorIso(simDate));
    for (const m of dayMappings) {
      const row = dbSessionsById.get(m.sessionId);
      const durationSec = Number(row?.duration_seconds) || 0;
      const oldStartedMs = row?.started_at ? Date.parse(row.started_at) : null;
      const newStartedMs = cursorMs;
      const newEndedMs =
        durationSec > 0
          ? newStartedMs + durationSec * 1000
          : row?.ended_at && oldStartedMs != null
            ? newStartedMs + (Date.parse(row.ended_at) - oldStartedMs)
            : newStartedMs;

      plans.push({
        ...m,
        oldStartedAt: row?.started_at ?? null,
        oldEndedAt: row?.ended_at ?? null,
        oldCreatedAt: row?.created_at ?? null,
        newStartedAt: new Date(newStartedMs).toISOString(),
        newEndedAt: row?.ended_at ? new Date(newEndedMs).toISOString() : null,
        durationSeconds: durationSec,
        deltaMs: oldStartedMs != null ? newStartedMs - oldStartedMs : null,
      });

      cursorMs =
        (durationSec > 0 ? newStartedMs + durationSec * 1000 : newEndedMs) +
        SESSION_GAP_MS;
    }
  }
  return plans;
}

function shiftIso(iso, deltaMs) {
  if (!iso || deltaMs == null) return null;
  return new Date(Date.parse(iso) + deltaMs).toISOString();
}

async function fetchSessionsByIds(sb, sessionIds) {
  const rows = [];
  for (let i = 0; i < sessionIds.length; i += 100) {
    const chunk = sessionIds.slice(i, i + 100);
    const { data, error } = await sb
      .from("learning_sessions")
      .select(
        "id,student_id,subject,topic,started_at,ended_at,created_at,updated_at,duration_seconds,status,metadata"
      )
      .in("id", chunk);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

async function fetchAnswersForSessions(sb, sessionIds) {
  const rows = [];
  for (let i = 0; i < sessionIds.length; i += 50) {
    const chunk = sessionIds.slice(i, i + 50);
    const { data, error } = await sb
      .from("answers")
      .select("id,learning_session_id,answered_at,created_at,is_correct,answer_payload")
      .in("learning_session_id", chunk);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

async function fetchCoinTxForSessions(sb, sessionIds) {
  const rows = [];
  for (let i = 0; i < sessionIds.length; i += 50) {
    const chunk = sessionIds.slice(i, i + 50);
    const { data, error } = await sb
      .from("coin_transactions")
      .select("id,student_id,source_type,source_id,created_at,amount,direction,reason")
      .eq("source_type", "learning_session")
      .in("source_id", chunk);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

export async function diagnoseTimestampRepair({ from, to }) {
  const sb = loadSupabaseClient();
  const { studentIdToLabel } = await resolveAaaStudentMap(sb);
  const { mappings, stats } = loadArtifactSessionMappings({ from, to });
  const sessionIds = mappings.map((m) => m.sessionId);
  const dbRows = sessionIds.length
    ? await fetchSessionsByIds(sb, sessionIds)
    : [];
  const dbById = new Map(dbRows.map((r) => [r.id, r]));

  const missingInDb = sessionIds.filter((id) => !dbById.has(id));
  const nonAaa = dbRows.filter((r) => !studentIdToLabel.has(r.student_id));
  const subjectMismatches = dbRows.filter((r) => {
    const m = mappings.find((x) => x.sessionId === r.id);
    return m && r.subject && m.subject && r.subject !== m.subject;
  });

  const started = dbRows.map((r) => r.started_at).filter(Boolean).sort();
  const created = dbRows.map((r) => r.created_at).filter(Boolean).sort();

  let answerStats = { count: 0 };
  if (sessionIds.length) {
    const answers = await fetchAnswersForSessions(sb, sessionIds);
    answerStats.count = answers.length;
    const at = answers.map((a) => a.answered_at).filter(Boolean).sort();
    const ct = answers.map((a) => a.created_at).filter(Boolean).sort();
    answerStats.answeredMin = at[0] ?? null;
    answerStats.answeredMax = at.at(-1) ?? null;
    answerStats.createdMin = ct[0] ?? null;
    answerStats.createdMax = ct.at(-1) ?? null;
  }

  const repairable = missingInDb.length === 0 && nonAaa.length === 0;
  const plans = repairable
    ? planSessionTimestamps(mappings, dbById)
    : planSessionTimestamps(
        mappings.filter((m) => dbById.has(m.sessionId)),
        dbById
      );

  return {
    artifactRange: { from, to },
    artifactStats: stats,
    dbFound: dbRows.length,
    missingInDb: missingInDb.length,
    missingInDbSample: missingInDb.slice(0, 8),
    nonAaaSessionCount: nonAaa.length,
    subjectMismatchCount: subjectMismatches.length,
    dbStartedAt: { min: started[0] ?? null, max: started.at(-1) ?? null },
    dbCreatedAt: { min: created[0] ?? null, max: created.at(-1) ?? null },
    answers: answerStats,
    parentReportFilter: PARENT_REPORT_FILTER,
    mappingReliable:
      stats.missingSessionId === 0 &&
      stats.duplicateSessionIds === 0 &&
      missingInDb.length === 0 &&
      nonAaa.length === 0,
    repairableSessionCount: plans.length,
    samplePlans: plans.slice(0, 5),
    sampleMappings: mappings.slice(0, 5),
  };
}

export async function executeTimestampRepair({ from, to, backupDir }) {
  const sb = loadSupabaseClient();
  const { studentIdToLabel } = await resolveAaaStudentMap(sb);
  const { mappings, stats } = loadArtifactSessionMappings({ from, to });
  const sessionIds = [...new Set(mappings.map((m) => m.sessionId))];

  if (stats.missingSessionId > 0) {
    throw new Error(
      `refusing repair: ${stats.missingSessionId} artifact sessions missing sessionId`
    );
  }
  if (stats.duplicateSessionIds > 0) {
    throw new Error(
      `refusing repair: ${stats.duplicateSessionIds} duplicate sessionIds in artifacts`
    );
  }

  const dbRows = await fetchSessionsByIds(sb, sessionIds);
  const dbById = new Map(dbRows.map((r) => [r.id, r]));
  const missingInDb = sessionIds.filter((id) => !dbById.has(id));
  if (missingInDb.length) {
    throw new Error(
      `refusing repair: ${missingInDb.length} artifact sessionIds not found in DB`
    );
  }
  const nonAaa = dbRows.filter((r) => !studentIdToLabel.has(r.student_id));
  if (nonAaa.length) {
    throw new Error(`refusing repair: ${nonAaa.length} sessions belong to non-AAA students`);
  }

  const plans = planSessionTimestamps(mappings, dbById);
  const answers = await fetchAnswersForSessions(sb, sessionIds);
  const coins = await fetchCoinTxForSessions(sb, sessionIds);

  const backup = {
    generatedAt: new Date().toISOString(),
    from,
    to,
    plans,
    sessions: dbRows,
    answers,
    coins,
  };
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, "pre-repair-backup.json"), JSON.stringify(backup, null, 2));

  let sessionsUpdated = 0;
  let answersUpdated = 0;
  let coinsUpdated = 0;

  for (const plan of plans) {
    const row = dbById.get(plan.sessionId);
    const deltaMs = plan.deltaMs;
    const sessionPatch = {
      started_at: plan.newStartedAt,
      updated_at: shiftIso(row.updated_at, deltaMs) ?? plan.newStartedAt,
      created_at: shiftIso(row.created_at, deltaMs) ?? plan.newStartedAt,
    };
    if (plan.newEndedAt) sessionPatch.ended_at = plan.newEndedAt;

    const { error: sessErr } = await sb
      .from("learning_sessions")
      .update(sessionPatch)
      .eq("id", plan.sessionId);
    if (sessErr) throw sessErr;
    sessionsUpdated += 1;
  }

  const answersBySession = new Map();
  for (const ans of answers) {
    const list = answersBySession.get(ans.learning_session_id) || [];
    list.push(ans);
    answersBySession.set(ans.learning_session_id, list);
  }

  for (const plan of plans) {
    const deltaMs = plan.deltaMs;
    for (const ans of answersBySession.get(plan.sessionId) || []) {
      const patch = {
        answered_at: shiftIso(ans.answered_at, deltaMs) ?? plan.newStartedAt,
        created_at: shiftIso(ans.created_at, deltaMs) ?? plan.newStartedAt,
      };
      const { error } = await sb.from("answers").update(patch).eq("id", ans.id);
      if (error) throw error;
      answersUpdated += 1;
    }
  }

  for (const tx of coins) {
    const plan = plans.find((p) => p.sessionId === tx.source_id);
    if (!plan || plan.deltaMs == null) continue;
    const { error } = await sb
      .from("coin_transactions")
      .update({ created_at: shiftIso(tx.created_at, plan.deltaMs) })
      .eq("id", tx.id);
    if (error) throw error;
    coinsUpdated += 1;
  }

  return {
    backupDir,
    sessionsUpdated,
    answersUpdated,
    coinsUpdated,
    simulatedDates: [...new Set(plans.map((p) => p.simDate))].sort(),
  };
}
