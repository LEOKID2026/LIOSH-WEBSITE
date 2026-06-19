/**
 * Post-session DB timestamp stamping for AAA simulation backfill.
 *
 * After UI creates real rows with wall-clock timestamps, rewrite only
 * timestamp columns to the simulated calendar date while preserving
 * duration_seconds, correctness, mode/gameMode, and metadata content.
 */
import { loadSupabaseClient } from "./simulation-timestamp-repair.mjs";
import { resolveTimestampStampingEnabled } from "./config.mjs";

const AFTERNOON_START_HOUR_UTC = 14;
const STUDENT_STAGGER_MINUTES = 12;
const SESSION_GAP_MS = 2 * 60 * 1000;
const SESSION_FETCH_RETRIES = 8;
const SESSION_FETCH_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function studentNumber(label) {
  const n = parseInt(String(label || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 1;
}

export function computeSessionStartMs(simDate, studentLabel, sessionIndex, priorEndMs) {
  const dayBase = Date.parse(
    `${simDate}T${String(AFTERNOON_START_HOUR_UTC).padStart(2, "0")}:00:00.000Z`
  );
  const studentOffsetMs = (studentNumber(studentLabel) - 1) * STUDENT_STAGGER_MINUTES * 60 * 1000;
  if (sessionIndex === 0 || priorEndMs == null) {
    return dayBase + studentOffsetMs;
  }
  return priorEndMs + SESSION_GAP_MS;
}

function isoDateOnly(iso) {
  return String(iso || "").slice(0, 10);
}

function isOnSimulatedDate(iso, simDate) {
  return isoDateOnly(iso) === simDate;
}

function spreadAnswerTimes(startMs, endMs, count) {
  if (count <= 0) return [];
  if (count === 1) return [Math.round(startMs + (endMs - startMs) * 0.5)];
  const innerStart = startMs + 30_000;
  const innerEnd = Math.max(innerStart + 1000, endMs - 30_000);
  const span = innerEnd - innerStart;
  const step = span / (count + 1);
  return Array.from({ length: count }, (_, i) =>
    Math.round(innerStart + step * (i + 1))
  );
}

async function fetchSessionRow(sb, sessionId) {
  const { data, error } = await sb
    .from("learning_sessions")
    .select(
      "id,student_id,subject,topic,started_at,ended_at,created_at,updated_at,duration_seconds,status,metadata"
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function waitForSessionRow(sb, sessionId, log) {
  let last = null;
  for (let attempt = 1; attempt <= SESSION_FETCH_RETRIES; attempt++) {
    last = await fetchSessionRow(sb, sessionId);
    if (last && Number(last.duration_seconds) > 0) return last;
    if (last?.status === "completed" && Number(last.duration_seconds) > 0) return last;
    log?.(
      `timestamp-stamp: waiting for session ${sessionId} duration_seconds ` +
        `(attempt ${attempt}/${SESSION_FETCH_RETRIES}, got=${last?.duration_seconds ?? "none"})`
    );
    await sleep(SESSION_FETCH_DELAY_MS);
  }
  return last;
}

/**
 * Stamp one completed session and its related rows to the simulated date.
 *
 * @returns {{ sessionId, newStartedAt, newEndedAt, durationSeconds, answerCount, coinCount }}
 */
export async function stampSimulationSessionTimestamps({
  sessionId,
  simDate,
  studentLabel,
  sessionIndex = 0,
  priorEndMs = null,
  answerIds = [],
  log = null,
}) {
  if (!resolveTimestampStampingEnabled()) {
    return { skipped: true, reason: "stamping-disabled" };
  }
  if (!sessionId || !simDate) {
    throw new Error("stampSimulationSessionTimestamps: sessionId and simDate required");
  }

  const sb = loadSupabaseClient();
  const row = await waitForSessionRow(sb, sessionId, log);
  if (!row) {
    throw new Error(`timestamp-stamp: session ${sessionId} not found in DB`);
  }
  const durationSec = Number(row.duration_seconds) || 0;
  if (durationSec <= 0) {
    throw new Error(
      `timestamp-stamp: session ${sessionId} duration_seconds=${row.duration_seconds} — ` +
        "refusing to stamp incomplete session"
    );
  }

  const startMs = computeSessionStartMs(simDate, studentLabel, sessionIndex, priorEndMs);
  const endMs = startMs + durationSec * 1000;
  const newStartedAt = new Date(startMs).toISOString();
  const newEndedAt = new Date(endMs).toISOString();
  const oldStartedMs = row.started_at ? Date.parse(row.started_at) : startMs;
  const createdDelta = row.created_at ? startMs - Date.parse(row.created_at) : 0;
  const updatedDelta = row.updated_at ? startMs - Date.parse(row.updated_at) : createdDelta;
  const endedDelta =
    row.ended_at != null ? endMs - Date.parse(row.ended_at) : endMs - oldStartedMs;

  const sessionPatch = {
    started_at: newStartedAt,
    ended_at: newEndedAt,
    created_at: row.created_at
      ? new Date(Date.parse(row.created_at) + createdDelta).toISOString()
      : newStartedAt,
    updated_at: row.updated_at
      ? new Date(Date.parse(row.updated_at) + updatedDelta).toISOString()
      : newEndedAt,
  };
  const { error: sessErr } = await sb
    .from("learning_sessions")
    .update(sessionPatch)
    .eq("id", sessionId);
  if (sessErr) throw sessErr;

  let answers = [];
  if (answerIds.length) {
    const { data, error } = await sb
      .from("answers")
      .select("id,answered_at,created_at")
      .in("id", answerIds)
      .eq("learning_session_id", sessionId)
      .order("answered_at", { ascending: true });
    if (error) throw error;
    answers = data || [];
  }
  if (!answers.length) {
    const { data, error } = await sb
      .from("answers")
      .select("id,answered_at,created_at")
      .eq("learning_session_id", sessionId)
      .order("answered_at", { ascending: true });
    if (error) throw error;
    answers = data || [];
  }

  const answerTimes = spreadAnswerTimes(startMs, endMs, answers.length);
  for (let i = 0; i < answers.length; i++) {
    const ans = answers[i];
    const answeredAt = new Date(answerTimes[i]).toISOString();
    const ansCreatedDelta = ans.created_at
      ? answerTimes[i] - Date.parse(ans.created_at)
      : 0;
    const patch = {
      answered_at: answeredAt,
      created_at: ans.created_at
        ? new Date(Date.parse(ans.created_at) + ansCreatedDelta).toISOString()
        : answeredAt,
    };
    const { error } = await sb.from("answers").update(patch).eq("id", ans.id);
    if (error) throw error;
  }

  const { data: coins, error: coinErr } = await sb
    .from("coin_transactions")
    .select("id,created_at")
    .eq("source_type", "learning_session")
    .eq("source_id", sessionId);
  if (coinErr) throw coinErr;

  for (const tx of coins || []) {
    const txDelta = tx.created_at ? endMs - Date.parse(tx.created_at) : 0;
    const { error } = await sb
      .from("coin_transactions")
      .update({
        created_at: tx.created_at
          ? new Date(Date.parse(tx.created_at) + txDelta).toISOString()
          : newEndedAt,
      })
      .eq("id", tx.id);
    if (error) throw error;
  }

  log?.(
    `timestamp-stamp: ${studentLabel} session ${sessionIndex + 1} id=${sessionId} ` +
      `simDate=${simDate} started_at=${newStartedAt} duration_seconds=${durationSec} ` +
      `answers=${answers.length} coins=${(coins || []).length}`
  );

  return {
    sessionId,
    simDate,
    studentLabel,
    newStartedAt,
    newEndedAt,
    durationSeconds: durationSec,
    answerCount: answers.length,
    coinCount: (coins || []).length,
    endMs,
    onSimDate:
      isOnSimulatedDate(newStartedAt, simDate) &&
      answers.every((_, i) => isOnSimulatedDate(new Date(answerTimes[i]).toISOString(), simDate)),
  };
}

export function isTimestampStampingEnabled() {
  return resolveTimestampStampingEnabled();
}
