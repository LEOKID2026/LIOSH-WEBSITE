/**
 * Post-day DB sanity guard for AAA simulation range runs.
 *
 * Runs after suite completion and before state-advance. Hard-fails the day
 * if timestamps, practice-only, or session completeness checks fail.
 */
import {
  loadSupabaseClient,
  resolveAaaStudentMap,
} from "./simulation-timestamp-repair.mjs";
import {
  REQUIRED_GAME_MODE,
  REQUIRED_SESSION_MODE,
} from "./practice-only-guard.mjs";

function isoDateOnly(iso) {
  return String(iso || "").slice(0, 10);
}

function nextDayIso(simDate) {
  const d = new Date(`${simDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function countLearningRows(sessions, answers) {
  let n = 0;
  for (const s of sessions) {
    const mode = String(s.metadata?.mode || "").toLowerCase();
    if (mode === "learning" || mode === "learning_guided" || mode === "learning_book") {
      n += 1;
    }
  }
  for (const a of answers) {
    const payload = a.answer_payload || {};
    const gm = String(payload.gameMode || payload.mode || "").toLowerCase();
    if (gm === "learning" || gm === "learning_guided" || gm === "learning_book") {
      n += 1;
    }
  }
  return n;
}

function collectSessionIdsFromSuite(suiteResult) {
  const ids = new Set();
  for (const record of suiteResult?.records || []) {
    for (const sess of record.sessionResults || []) {
      const sid = sess.tier1?.sessionId;
      if (sid) ids.add(sid);
    }
    for (const sid of record.runWindow?.driverSessionIds || []) {
      if (sid) ids.add(sid);
    }
  }
  return [...ids];
}

async function fetchRowsForSessions(sb, sessionIds) {
  const sessions = [];
  const answers = [];
  for (let i = 0; i < sessionIds.length; i += 100) {
    const chunk = sessionIds.slice(i, i + 100);
    const { data: sData, error: sErr } = await sb
      .from("learning_sessions")
      .select(
        "id,student_id,subject,started_at,ended_at,created_at,duration_seconds,status,metadata"
      )
      .in("id", chunk);
    if (sErr) throw sErr;
    sessions.push(...(sData || []));

    const { data: aData, error: aErr } = await sb
      .from("answers")
      .select("id,learning_session_id,answered_at,created_at,answer_payload")
      .in("learning_session_id", chunk);
    if (aErr) throw aErr;
    answers.push(...(aData || []));
  }
  return { sessions, answers };
}

/**
 * @returns {{ passed: boolean, errors: string[], metrics: object }}
 */
export async function assertDailyDbSanity({ simDate, suiteResult, log = null }) {
  const errors = [];
  const sessionIds = collectSessionIdsFromSuite(suiteResult);

  if (!sessionIds.length) {
    const studied = (suiteResult?.records || []).filter(
      (r) => r.status === "pass" && (r.sessionResults || []).some((s) => s.completed)
    );
    if (studied.length === 0) {
      return {
        passed: true,
        skipped: true,
        reason: "no-studied-sessions",
        metrics: { sessionIds: 0 },
        errors: [],
      };
    }
    errors.push("db-sanity: no sessionIds collected from suite artifacts");
  }

  const sb = loadSupabaseClient();
  const { studentIdToLabel } = await resolveAaaStudentMap(sb);
  const { sessions, answers } = sessionIds.length
    ? await fetchRowsForSessions(sb, sessionIds)
    : { sessions: [], answers: [] };

  if (sessionIds.length && sessions.length !== sessionIds.length) {
    const found = new Set(sessions.map((s) => s.id));
    const missing = sessionIds.filter((id) => !found.has(id));
    errors.push(
      `db-sanity: ${missing.length} sessionIds missing in DB (sample: ${missing.slice(0, 3).join(", ")})`
    );
  }

  const dayEnd = nextDayIso(simDate);
  const startedTimes = [];
  const answeredTimes = [];
  let durationTotal = 0;
  let learningRows = 0;
  let nonPracticeSessions = 0;
  let zeroDuration = 0;

  learningRows = countLearningRows(sessions, answers);

  for (const s of sessions) {
    if (!studentIdToLabel.has(s.student_id)) {
      errors.push(`db-sanity: session ${s.id} belongs to non-AAA student`);
    }
    if (isoDateOnly(s.started_at) !== simDate) {
      errors.push(
        `db-sanity: session ${s.id} started_at=${s.started_at} not on simDate=${simDate}`
      );
    }
    if (isoDateOnly(s.created_at) !== simDate) {
      errors.push(
        `db-sanity: session ${s.id} created_at=${s.created_at} not on simDate=${simDate}`
      );
    }
    const mode = String(s.metadata?.mode || "").toLowerCase();
    const gameMode = String(s.metadata?.gameMode || s.metadata?.summary?.gameMode || mode).toLowerCase();
    if (mode !== REQUIRED_SESSION_MODE) nonPracticeSessions += 1;
    if (gameMode && gameMode !== REQUIRED_GAME_MODE && gameMode !== REQUIRED_SESSION_MODE) {
      nonPracticeSessions += 1;
    }
    if (Number(s.duration_seconds) <= 0) zeroDuration += 1;
    durationTotal += Number(s.duration_seconds) || 0;
    startedTimes.push(s.started_at);
  }

  for (const a of answers) {
    if (isoDateOnly(a.answered_at) !== simDate) {
      errors.push(
        `db-sanity: answer ${a.id} answered_at=${a.answered_at} not on simDate=${simDate}`
      );
    }
    answeredTimes.push(a.answered_at);
  }

  if (zeroDuration > 0) {
    errors.push(`db-sanity: ${zeroDuration} session(s) have duration_seconds=0`);
  }
  if (nonPracticeSessions > 0) {
    errors.push(`db-sanity: ${nonPracticeSessions} session(s) not practice-only mode`);
  }
  if (learningRows > 0) {
    errors.push(`db-sanity: ${learningRows} learning row(s) created (expected 0)`);
  }

  // May-month visibility proxy: sessions on simDate exist; none on wall-clock-only June day boundary
  const wallClockToday = new Date().toISOString().slice(0, 10);
  const onSimDateCount = sessions.filter((s) => isoDateOnly(s.started_at) === simDate).length;
  const onWallClockTodayCount =
    wallClockToday !== simDate
      ? sessions.filter((s) => isoDateOnly(s.started_at) === wallClockToday).length
      : 0;
  if (onSimDateCount === 0 && sessionIds.length > 0) {
    errors.push(`db-sanity: no sessions stamped on simDate=${simDate}`);
  }
  if (onWallClockTodayCount > 0) {
    errors.push(
      `db-sanity: ${onWallClockTodayCount} session(s) still on wall-clock date ${wallClockToday}`
    );
  }

  startedTimes.sort();
  answeredTimes.sort();

  const metrics = {
    simDate,
    sessionIdsExpected: sessionIds.length,
    sessionsFound: sessions.length,
    answersFound: answers.length,
    startedAtMin: startedTimes[0] ?? null,
    startedAtMax: startedTimes.at(-1) ?? null,
    answeredAtMin: answeredTimes[0] ?? null,
    answeredAtMax: answeredTimes.at(-1) ?? null,
    durationSecondsTotal: durationTotal,
    avgSecPerQuestion:
      answers.length > 0 ? Math.round(durationTotal / answers.length) : null,
    onSimDateCount,
    onWallClockTodayCount,
    learningRowsCreated: learningRows,
    parentReportMayVisibleProxy: onSimDateCount > 0 && errors.length === 0,
  };

  const passed = errors.length === 0;
  log?.(
    `db-sanity: ${passed ? "PASS" : "FAIL"} simDate=${simDate} ` +
      `sessions=${sessions.length}/${sessionIds.length} answers=${answers.length} ` +
      `duration_total=${durationTotal}s started=${metrics.startedAtMin}..${metrics.startedAtMax}`
  );
  if (!passed) {
    for (const e of errors.slice(0, 10)) log?.(`db-sanity: ${e}`);
  }

  return { passed, errors, metrics };
}

function collectSessionIdsFromRunSummary(summary) {
  const ids = new Set();
  for (const student of summary?.suite?.students || []) {
    for (const sid of student.runWindow?.driverSessionIds || []) {
      if (sid) ids.add(sid);
    }
    for (const sess of student.sessions || []) {
      const sid =
        sess.tier1Counts?.["/api/learning/session/start"]?.sessionId ||
        sess.sessionId;
      if (sid) ids.add(sid);
    }
  }
  return [...ids];
}

/**
 * Recovery-time sanity for a halted day whose DB work completed but
 * state-advance was blocked (e.g. after-snapshot timeout only).
 */
export async function assertSimDateRecoverySanity({
  simDate,
  suiteResult = null,
  runSummary = null,
  expectedSessionCount = null,
  log = null,
}) {
  const errors = [];
  const sessionIds = suiteResult
    ? collectSessionIdsFromSuite(suiteResult)
    : collectSessionIdsFromRunSummary(runSummary);

  const sb = loadSupabaseClient();
  const { labelToStudentId, studentIdToLabel } = await resolveAaaStudentMap(sb);
  const studentIds = [...labelToStudentId.values()];
  const dayEnd = nextDayIso(simDate);

  const { data: simDateSessions, error: simErr } = await sb
    .from("learning_sessions")
    .select(
      "id,student_id,subject,started_at,ended_at,created_at,duration_seconds,status,metadata"
    )
    .in("student_id", studentIds)
    .gte("started_at", `${simDate}T00:00:00.000Z`)
    .lt("started_at", `${dayEnd}T00:00:00.000Z`);
  if (simErr) throw simErr;

  const sessionsOnDate = simDateSessions || [];
  const uniqueSessionIds = new Set(sessionsOnDate.map((s) => s.id));

  if (expectedSessionCount != null && sessionsOnDate.length !== expectedSessionCount) {
    errors.push(
      `recovery-sanity: expected ${expectedSessionCount} sessions on ${simDate}, found ${sessionsOnDate.length}`
    );
  }

  if (sessionIds.length && uniqueSessionIds.size !== sessionsOnDate.length) {
    errors.push(
      `recovery-sanity: duplicate session rows on ${simDate} ` +
        `(unique=${uniqueSessionIds.size}, total=${sessionsOnDate.length})`
    );
  }

  if (sessionIds.length) {
    const found = new Set(sessionsOnDate.map((s) => s.id));
    const missing = sessionIds.filter((id) => !found.has(id));
    const extra = sessionsOnDate.filter((s) => !sessionIds.includes(s.id));
    if (missing.length) {
      errors.push(
        `recovery-sanity: ${missing.length} run sessionIds missing in DB (sample: ${missing.slice(0, 3).join(", ")})`
      );
    }
    if (extra.length) {
      errors.push(
        `recovery-sanity: ${extra.length} extra session(s) on ${simDate} not in run-summary (sample: ${extra.slice(0, 3).map((s) => s.id).join(", ")})`
      );
    }
  }

  const perStudentCounts = {};
  for (const s of sessionsOnDate) {
    const label = studentIdToLabel.get(s.student_id) || s.student_id;
    perStudentCounts[label] = (perStudentCounts[label] || 0) + 1;
  }

  const planStudents = runSummary?.plan?.students || {};
  for (const [label, planStudent] of Object.entries(planStudents)) {
    if (!planStudent?.studied) continue;
    const planned = (planStudent.sessions || []).length;
    const found = perStudentCounts[label] || 0;
    if (planned !== found) {
      errors.push(
        `recovery-sanity: ${label} planned ${planned} session(s), DB has ${found}`
      );
    }
  }

  const targetIds =
    sessionIds.length > 0 ? sessionIds : sessionsOnDate.map((s) => s.id);
  const { sessions, answers } = targetIds.length
    ? await fetchRowsForSessions(sb, targetIds)
    : { sessions: [], answers: [] };

  let durationTotal = 0;
  let zeroDuration = 0;
  let nonPracticeSessions = 0;
  const learningRows = countLearningRows(sessions, answers);

  for (const s of sessions) {
    if (isoDateOnly(s.started_at) !== simDate) {
      errors.push(
        `recovery-sanity: session ${s.id} started_at=${s.started_at} not on ${simDate}`
      );
    }
    if (isoDateOnly(s.created_at) !== simDate) {
      errors.push(
        `recovery-sanity: session ${s.id} created_at=${s.created_at} not on ${simDate}`
      );
    }
    const mode = String(s.metadata?.mode || "").toLowerCase();
    const gameMode = String(
      s.metadata?.gameMode || s.metadata?.summary?.gameMode || mode
    ).toLowerCase();
    if (mode !== REQUIRED_SESSION_MODE) nonPracticeSessions += 1;
    if (
      gameMode &&
      gameMode !== REQUIRED_GAME_MODE &&
      gameMode !== REQUIRED_SESSION_MODE
    ) {
      nonPracticeSessions += 1;
    }
    if (Number(s.duration_seconds) <= 0) zeroDuration += 1;
    durationTotal += Number(s.duration_seconds) || 0;
  }

  for (const a of answers) {
    if (isoDateOnly(a.answered_at) !== simDate) {
      errors.push(
        `recovery-sanity: answer ${a.id} answered_at=${a.answered_at} not on ${simDate}`
      );
    }
  }

  if (zeroDuration > 0) {
    errors.push(`recovery-sanity: ${zeroDuration} session(s) have duration_seconds=0`);
  }
  if (nonPracticeSessions > 0) {
    errors.push(
      `recovery-sanity: ${nonPracticeSessions} session(s) not practice-only mode`
    );
  }
  if (learningRows > 0) {
    errors.push(`recovery-sanity: ${learningRows} learning row(s) created (expected 0)`);
  }

  const metrics = {
    simDate,
    sessionsOnDate: sessionsOnDate.length,
    sessionIdsFromRun: sessionIds.length,
    answersFound: answers.length,
    durationSecondsTotal: durationTotal,
    perStudentCounts,
    duplicateRisk: uniqueSessionIds.size !== sessionsOnDate.length,
  };

  const passed = errors.length === 0;
  log?.(
    `recovery-sanity: ${passed ? "PASS" : "FAIL"} simDate=${simDate} ` +
      `sessions=${sessionsOnDate.length} answers=${answers.length} ` +
      `duration_total=${durationTotal}s`
  );
  if (!passed) {
    for (const e of errors.slice(0, 15)) log?.(e);
  }

  return { passed, errors, metrics };
}
