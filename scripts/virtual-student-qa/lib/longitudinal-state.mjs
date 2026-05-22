/**
 * Phase D2 — Longitudinal state load/save.
 *
 * The "longitudinal state" is the persistent simulation memory across
 * nightly runs. It lives OUTSIDE the repo so:
 *   - it is never committed,
 *   - it is not deleted when reports/* is cleaned,
 *   - it survives `git clean -fdx`.
 *
 * Default location (resolved by config.mjs):
 *   Windows:   %LOCALAPPDATA%\liosh-qa\virtual-student-state\
 *   POSIX:     ~/.local/share/liosh-qa/virtual-student-state/
 *
 * Files inside that directory:
 *   state.json        — canonical, current state. Read at start of each run.
 *   state.json.bak    — previous state.json, atomically rotated before save.
 *   timeline.md       — append-only Markdown table; one row per studied
 *                       student per day; surface-level human review only.
 *
 * State-advancement safety (per plan §17): saveStateAtomically() must NOT
 * be called from the orchestrator until ALL of these have completed for
 * the day in this exact order: student sessions, parent AFTER snapshots,
 * parent-report DOM assertions, cross-student bleed checks. On any FAIL,
 * the orchestrator simply returns without invoking the saver and the
 * canonical state.json is left untouched (so the operator can rerun the
 * same date with --force after fixing the underlying issue).
 *
 * No PII / no PINs / no Bearer tokens are ever written to state. The
 * state holds only labels, attendance booleans, integers, and the
 * persona-evolution scalar.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { PERSONAS, PERSONA_LABELS } from "../scenarios/student-personas.mjs";

export const STATE_VERSION = 1;
const TIMELINE_HEADER =
  "| date | student | grade | persona | sessions | minutes | subjects | accuracyToday | profile |\n" +
  "|---|---|---|---|---|---|---|---|---|\n";

/**
 * Build a fresh state object from the persona table. Used on the very
 * first run, when state.json does not exist yet, and as a backfill when
 * a new persona is added (we union the loaded state with this default
 * inside loadState()).
 */
export function defaultStateForPersonas({ personas = PERSONAS, todayIso = null } = {}) {
  const state = {
    version: STATE_VERSION,
    createdAt: todayIso || new Date().toISOString().slice(0, 10),
    lastRunDate: null,
    lastRunStatus: null,
    lastRunMode: null,
    students: {},
  };
  for (const label of Object.keys(personas)) {
    state.students[label] = makeFreshStudent(personas[label]);
  }
  return state;
}

function makeFreshStudent(persona) {
  return {
    grade: persona.grade,
    personaKind: persona.kind,
    evolutionPhase: persona.evolution,
    evolutionMomentum: 0,
    defaultProfile: persona.defaultProfile,
    attendance: [],
    performance: {},
  };
}

/**
 * Load state.json from disk. If the file does not exist, return a fresh
 * state (does NOT write to disk — the orchestrator only persists at the
 * end of a successful day, never preemptively).
 *
 * Returns: { state, filePath, fresh, parseErrors }.
 *  - fresh=true means this is the first time we've ever seen this state
 *    dir; the operator should expect a "first run, attendance starts at
 *    zero" experience, not a bug.
 *  - parseErrors is non-empty only if state.json existed but couldn't be
 *    parsed; the runner falls back to a fresh state but surfaces the
 *    error so the operator can investigate (a corrupted state.json
 *    typically means a previous run was killed mid-write — but we use
 *    rename-from-tmp so this should be rare).
 */
export function loadState({ stateDir, personas = PERSONAS, todayIso = null }) {
  const filePath = join(stateDir, "state.json");
  const parseErrors = [];
  if (!existsSync(filePath)) {
    return {
      state: defaultStateForPersonas({ personas, todayIso }),
      filePath,
      fresh: true,
      parseErrors,
    };
  }
  let parsed;
  try {
    const text = readFileSync(filePath, "utf8");
    parsed = JSON.parse(text);
  } catch (error) {
    parseErrors.push(`state.json parse failed: ${error?.message || error}`);
    return {
      state: defaultStateForPersonas({ personas, todayIso }),
      filePath,
      fresh: true,
      parseErrors,
    };
  }
  if (!parsed || typeof parsed !== "object") {
    parseErrors.push(`state.json is not an object (got ${typeof parsed})`);
    return {
      state: defaultStateForPersonas({ personas, todayIso }),
      filePath,
      fresh: true,
      parseErrors,
    };
  }
  if (!parsed.version) parsed.version = STATE_VERSION;
  if (!parsed.students || typeof parsed.students !== "object") {
    parsed.students = {};
  }
  for (const label of Object.keys(personas)) {
    if (!parsed.students[label]) {
      parsed.students[label] = makeFreshStudent(personas[label]);
    } else {
      const s = parsed.students[label];
      if (typeof s !== "object" || s === null) {
        parsed.students[label] = makeFreshStudent(personas[label]);
        parseErrors.push(
          `state.students.${label} was not an object; reset to persona defaults`
        );
        continue;
      }
      if (s.grade == null) s.grade = personas[label].grade;
      if (!s.personaKind) s.personaKind = personas[label].kind;
      if (!s.evolutionPhase) s.evolutionPhase = personas[label].evolution;
      if (typeof s.evolutionMomentum !== "number") s.evolutionMomentum = 0;
      if (!s.defaultProfile) s.defaultProfile = personas[label].defaultProfile;
      if (!Array.isArray(s.attendance)) s.attendance = [];
      if (!s.performance || typeof s.performance !== "object") s.performance = {};
    }
  }
  return { state: parsed, filePath, fresh: false, parseErrors };
}

/**
 * Atomically write state.json:
 *   1. mkdir -p stateDir
 *   2. write to state.json.tmp.<pid>
 *   3. if state.json exists, rename to state.json.bak (best-effort)
 *   4. rename tmp file to state.json
 *
 * The rename-from-tmp guarantees a partially-written state.json never
 * lands at the canonical path, even if the process is killed.
 *
 * IMPORTANT: This must be the very LAST step of a successful day. The
 * orchestrator MUST NOT call this on a FAIL day; the canonical state
 * stays at yesterday's value, and the operator can rerun with --force
 * after fixing the underlying issue.
 */
export function saveStateAtomically({ stateDir, state }) {
  if (!stateDir) throw new Error("saveStateAtomically: stateDir required");
  if (!state || typeof state !== "object") {
    throw new Error("saveStateAtomically: state must be an object");
  }
  mkdirSync(stateDir, { recursive: true });
  const filePath = join(stateDir, "state.json");
  const bakPath = join(stateDir, "state.json.bak");
  const tmpPath = join(stateDir, `state.json.tmp.${process.pid}`);
  const text = JSON.stringify(state, null, 2);
  writeFileSync(tmpPath, text, "utf8");
  if (existsSync(filePath)) {
    try {
      renameSync(filePath, bakPath);
    } catch {
      // If rotation fails (e.g. cross-volume on weird FS), fall back to
      // an inline overwrite — the tmp file is still our atomic anchor.
    }
  }
  renameSync(tmpPath, filePath);
  return { filePath, bakPath };
}

/**
 * Append a single row to timeline.md. Creates the file (with header) if
 * missing. Each row corresponds to a studied student on a given date;
 * skipped students (attendance = no) are NOT recorded here — they are
 * already enumerated in the daily run-summary.md / .json.
 *
 * row shape: {
 *   date,            // 'YYYY-MM-DD'
 *   student,         // 'AAA1'
 *   grade,           // 1..6
 *   persona,         // persona kind label
 *   sessions,        // session count for the day
 *   minutes,         // minutes spent
 *   subjects,        // string[] of subject keys
 *   accuracyTodayPct,// number or null
 *   profile,         // current defaultProfile after evolution
 * }
 */
export function appendTimelineRow({ stateDir, row }) {
  if (!stateDir) throw new Error("appendTimelineRow: stateDir required");
  mkdirSync(stateDir, { recursive: true });
  const filePath = join(stateDir, "timeline.md");
  const subjects = Array.isArray(row.subjects) ? row.subjects.join(", ") : "";
  const accuracy =
    row.accuracyTodayPct == null || Number.isNaN(Number(row.accuracyTodayPct))
      ? "n/a"
      : `${Number(row.accuracyTodayPct).toFixed(0)}%`;
  const line =
    `| ${row.date} | ${row.student} | ${row.grade ?? "?"} | ` +
    `${row.persona || "?"} | ${row.sessions ?? 0} | ${row.minutes ?? 0} | ` +
    `${subjects} | ${accuracy} | ${row.profile || "?"} |\n`;
  if (!existsSync(filePath)) {
    writeFileSync(filePath, TIMELINE_HEADER, "utf8");
  }
  appendFileSync(filePath, line, "utf8");
  return filePath;
}

/**
 * Convenience: did the runner already record this exact date? Used by
 * the orchestrator's idempotency check, which the operator can bypass
 * with --force.
 */
export function isAlreadyRunForDate(state, dateIso) {
  if (!state || typeof state !== "object") return false;
  return String(state.lastRunDate || "") === String(dateIso);
}

/**
 * Apply a successful (or partial) day's results to the in-memory state.
 *
 * Inputs:
 *   - state         : the loaded state object (will be mutated in place).
 *   - date          : 'YYYY-MM-DD'.
 *   - mode          : 'realtime' | 'fast'.
 *   - verdict       : 'pass' | 'partial' | 'fail'. (FAIL must NOT reach
 *                     this function — the orchestrator's caller is
 *                     responsible for the gate; we still defend with
 *                     a hard throw if a FAIL slips through.)
 *   - studentRecords: orchestrator output records (only studied
 *                     students; skipped students get no attendance row).
 *
 * What it does, per studied student:
 *   1. Append an attendance row:
 *        { date, studied: true, sessions: [{subject, profile, topic,
 *          questionCount, answered, correct, accuracyPct,
 *          status, earlyExit?}], totalSessions, totalAnswered,
 *          totalCorrect, totalMinutesEstimate }
 *   2. Update per-subject performance counters: totalAnswered,
 *      totalCorrect, lastStudiedDate. (Sliding window stats live as
 *      derived data; rebuilders can recompute from attendance later.)
 *
 * What it does, suite-level:
 *   - Sets lastRunDate, lastRunStatus, lastRunMode.
 *
 * What it does NOT do:
 *   - Saving to disk. Caller invokes saveStateAtomically() after
 *     applyDailyResults() returns. This split makes the gate explicit:
 *     "build the new state, then commit to disk only on the success
 *     branch."
 *   - Mutating evolutionMomentum / defaultProfile. Persona evolution
 *     (improving / declining / inconsistent → state-driven profile
 *     drift) is wired in D2.5; D2.3 keeps the in-state defaultProfile
 *     stable and the planner reads from persona.defaultProfile via
 *     state.students[label].defaultProfile (which equals the persona
 *     value until evolution starts mutating it).
 *
 * Returns: { studentTimelineRows: [{date, student, ...}], updatedStudents }
 */
export function applyDailyResults({
  state,
  date,
  mode,
  verdict,
  studentRecords,
}) {
  if (!state || typeof state !== "object") {
    throw new Error("applyDailyResults: state must be an object");
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    throw new Error(
      `applyDailyResults: date must be YYYY-MM-DD (got: ${String(date)})`
    );
  }
  if (verdict === "fail") {
    throw new Error(
      "applyDailyResults: verdict='fail' MUST NOT reach the state-advance " +
        "helper. The orchestrator caller is responsible for gating; FAIL " +
        "days must leave the canonical state.json untouched."
    );
  }
  const records = Array.isArray(studentRecords) ? studentRecords : [];
  const studentTimelineRows = [];
  const updatedStudents = [];

  for (const record of records) {
    if (!record || record.status === "blocked") continue;
    if (record.status === "fail") continue; // defensive — should not happen on PASS/PARTIAL
    const studentEntry = state.students?.[record.label];
    if (!studentEntry) continue;

    const sessionRows = (record.sessionResults || []).map((s) => {
      const tally = s.tally || null;
      const answered = Number(s.answeredCount || 0);
      const correctIntended = tally?.intendedCorrect ?? null;
      const correctObserved = tally?.observedCorrect ?? null;
      const correctForStats =
        correctObserved == null ? correctIntended : correctObserved;
      const accuracyPct =
        answered > 0 && correctForStats != null
          ? Math.round((correctForStats / answered) * 100)
          : null;
      return {
        subject: s.subject,
        profile: s.profile,
        topic: s.topic,
        questionCount: s.intendedQuestionCount,
        answered,
        correctIntended,
        correctObserved,
        accuracyPct,
        status: s.completed
          ? "ok"
          : s.error
            ? "error"
            : s.earlyExitReason
              ? "early-exit"
              : "incomplete",
        earlyExit: s.earlyExitReason || null,
      };
    });

    const totalAnswered = sessionRows.reduce(
      (acc, sr) => acc + (sr.answered || 0),
      0
    );
    const totalCorrect = sessionRows.reduce(
      (acc, sr) =>
        acc +
        (sr.correctObserved != null
          ? sr.correctObserved
          : sr.correctIntended || 0),
      0
    );
    const dayAccuracyPct =
      totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : null;
    const totalMinutesEstimate = Number(record.intendedMinutes) || 0;

    const attendanceEntry = {
      date,
      studied: true,
      verdict: record.status,
      sessions: sessionRows,
      totalSessions: sessionRows.length,
      totalAnswered,
      totalCorrect,
      totalMinutesEstimate,
      accuracyPct: dayAccuracyPct,
    };
    if (!Array.isArray(studentEntry.attendance)) studentEntry.attendance = [];
    // De-duplicate same-date attendance rows when the operator runs
    // with --force after an earlier same-day FAIL: replace any prior
    // row for this date with the fresh one.
    studentEntry.attendance = studentEntry.attendance.filter(
      (a) => a?.date !== date
    );
    studentEntry.attendance.push(attendanceEntry);

    if (!studentEntry.performance || typeof studentEntry.performance !== "object") {
      studentEntry.performance = {};
    }
    for (const sr of sessionRows) {
      if (!sr.subject) continue;
      const perf = studentEntry.performance[sr.subject] || {
        totalAnswered: 0,
        totalCorrect: 0,
        sessionsCount: 0,
        lastStudiedDate: null,
      };
      perf.totalAnswered += sr.answered || 0;
      perf.totalCorrect += sr.correctObserved != null
        ? sr.correctObserved
        : sr.correctIntended || 0;
      perf.sessionsCount += 1;
      perf.lastStudiedDate = date;
      studentEntry.performance[sr.subject] = perf;
    }

    studentTimelineRows.push({
      date,
      student: record.label,
      grade: record.grade,
      persona: record.personaKind,
      sessions: sessionRows.length,
      minutes: totalMinutesEstimate,
      subjects: sessionRows.map((sr) => sr.subject),
      accuracyTodayPct: dayAccuracyPct,
      profile: studentEntry.defaultProfile,
    });
    updatedStudents.push(record.label);
  }

  state.lastRunDate = date;
  state.lastRunStatus = verdict;
  state.lastRunMode = mode || state.lastRunMode || null;

  return { studentTimelineRows, updatedStudents };
}

export const __filename__ = "longitudinal-state.mjs";

// Convenience re-exports so the orchestrator (D2.3) does not need to
// import from two places.
export { PERSONAS, PERSONA_LABELS };

/** Echo helper; returns the same dirname for callers that need the
 *  parent directory (e.g. a one-liner mkdir before save). */
export function getStateDirParent(stateDir) {
  return dirname(stateDir);
}
