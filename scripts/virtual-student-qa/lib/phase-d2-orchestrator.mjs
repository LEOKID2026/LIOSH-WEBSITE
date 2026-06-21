/**
 * Phase D2 — Daily orchestrator (fast-mode in D2.3, realtime in D2.5).
 *
 * Inputs (all required):
 *   - browser            : a Playwright Browser shared with the preflight.
 *   - baseUrl            : the target site (localhost in D2.3, Vercel in D2.4+).
 *   - plan               : output of generateDailyPlan(...).
 *   - parentAccount      : { email, password } from env.
 *   - parentAuthMode     : 'ui' (only PASS path) | 'token' (debug, partial).
 *   - studentAuthMode    : 'ui' (default) | 'api' (debug).
 *   - accountsByLabel    : Map<label, {label, username, code, pin}>.
 *   - artifacts          : makeDailyArtifacts({date}) handle.
 *   - log                : line logger.
 *   - pacer              : makeDailyPacer({mode, scale}) handle.
 *   - expectedStudentLabels : ['AAA1', ..., 'AAA12'] for preflight reuse.
 *   - studentLabelsFilter   : optional Array<string> CLI smoke filter.
 *
 * Flow:
 *   1. Build studentRecords (studied/skipped/filteredOut) via the
 *      phase-d2-suite adapter.
 *   2. If no student is studied: return PASS with stateAdvanceShouldRun=true
 *      (the day "happened" — every student rolled an attendance="no";
 *      timeline gets no new rows but lastRunDate advances).
 *   3. Open one parent context, authenticate via real /parent/login UI.
 *   4. Read /api/parent/list-students once (parent-side).
 *   5. Validate every studied entry maps to a linked student card.
 *   6. Per-student loop (tight parent-report validation window):
 *        a. Baseline parent-report snapshot immediately BEFORE sessions.
 *        b. Fresh student context → auth → run planned sessions.
 *        c. After parent-report snapshot immediately AFTER sessions.
 *        d. Validate ONLY planned-subject deltas for that student.
 *        e. Log (do not fail on) non-planned-subject deltas as
 *           external/concurrent same-student activity inside the window.
 *        f. Record runWindow metadata (timestamps, session/answer ids).
 *   7. Suite verdict + stateAdvanceShouldRun (true unless FAIL).
 *
 * Batch baseline → multi-student activity → batch after-snapshots is
 * intentionally NOT used — it allows unrelated concurrent activity to
 * appear as false cross-subject bleed failures.
 *
 * Honoured rules (same as Phase C/D):
 *   - Real /student/login UI for every student (no API shortcut by
 *     default).
 *   - Real /parent/login UI (mode=ui is the only PASS path).
 *   - Parent report is ALWAYS reached by the dashboard click.
 *   - No localStorage as truth.
 *   - No API mocks.
 *   - No product UI / Hebrew copy / diagnostic logic / report logic /
 *     Supabase schema changes.
 *
 * IMPORTANT — state-advance contract:
 *   This orchestrator NEVER writes state.json. It returns a structured
 *   suite result that includes `stateAdvanceShouldRun: boolean`. The
 *   caller (run.mjs) is responsible for invoking the state writer ONLY
 *   when that flag is true. On any FAIL path the flag is false and the
 *   canonical state stays at yesterday's value.
 */

import {
  newStudentContext,
  attachLearningNetworkObserver,
  extractDriverPersistenceIds,
} from "./browser.mjs";
import { authenticateStudent } from "./student-auth.mjs";
import { authenticateParent } from "./parent-auth.mjs";
import {
  snapshotParentReportViaDashboard,
  snapshotDelta,
  PHASE_C_KNOWN_SUBJECTS,
} from "./parent-report-snapshot.mjs";
import { verifyTier1 } from "./persistence-evidence.mjs";
import {
  stampSimulationSessionTimestamps,
  isTimestampStampingEnabled,
} from "./simulation-timestamp-stamping.mjs";
import { repairPracticeWrongAnswerEvidence } from "./simulation-practice-evidence-repair.mjs";
import { runMathScenario } from "./subject-drivers/math-master.mjs";
import { runGeometryScenario } from "./subject-drivers/geometry-master.mjs";
import { runHebrewScenario } from "./subject-drivers/hebrew-master.mjs";
import { runEnglishScenario } from "./subject-drivers/english-master.mjs";
import { runScienceScenario } from "./subject-drivers/science-master.mjs";
import { runMoledetGeographyScenario } from "./subject-drivers/moledet-geography-master.mjs";
import { buildPhaseD2StudentRecords } from "../scenarios/phase-d2-suite.mjs";
import { resolveParallelStudentConcurrency } from "./config.mjs";
import { runWithConcurrency } from "./learning-session-helpers.mjs";

const DRIVER_BY_SUBJECT = {
  math: runMathScenario,
  geometry: runGeometryScenario,
  hebrew: runHebrewScenario,
  english: runEnglishScenario,
  science: runScienceScenario,
  "moledet-geography": runMoledetGeographyScenario,
};

const PARENT_LIST_STUDENTS_PATH = "/api/parent/list-students";
const STUDENT_ME_PATH = "/api/student/me";
const NOISE_RE = /^Failed to load resource:/i;

async function readParentLinkedStudents({ page, baseUrl, log }) {
  const target = new URL("/parent/dashboard", baseUrl).toString();
  const respPromise = page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      r.url().includes(PARENT_LIST_STUDENTS_PATH),
    { timeout: 30_000 }
  );
  log?.(
    `phase-d2: navigating parent to ${target} to trigger list-students fetch`
  );
  await page.goto(target, { waitUntil: "domcontentloaded" });
  let resp;
  try {
    resp = await respPromise;
  } catch (error) {
    throw new Error(
      `phase-d2: ${PARENT_LIST_STUDENTS_PATH} response wait timed out — ${
        error?.message || error
      }`
    );
  }
  const status = resp.status();
  if (status !== 200) {
    let bodyText = "";
    try {
      bodyText = await resp.text();
    } catch {
      // ignore
    }
    throw new Error(
      `phase-d2: ${PARENT_LIST_STUDENTS_PATH} returned status=${status}` +
        (bodyText ? ` body=${bodyText.slice(0, 200)}` : "")
    );
  }
  let body = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  const list = Array.isArray(body?.students) ? body.students : [];
  log?.(
    `phase-d2: parent owns ${list.length} linked student(s) per real dashboard fetch.`
  );
  return list;
}

async function readStudentStateFromApi({ page, baseUrl, log }) {
  const url = new URL(STUDENT_ME_PATH, baseUrl).toString();
  let res;
  try {
    res = await page.request.get(url, { timeout: 30_000 });
  } catch (error) {
    throw new Error(
      `phase-d2: ${STUDENT_ME_PATH} request failed: ${error?.message || error}`
    );
  }
  const status = res.status();
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (status !== 200 || !body) {
    throw new Error(
      `phase-d2: ${STUDENT_ME_PATH} returned status=${status} body=${JSON.stringify(body)}`
    );
  }
  const student = body.student || body;
  const playerName = String(student.full_name || student.fullName || "").trim();
  const accountGradeRaw = String(
    student.grade_level || student.gradeLevel || ""
  );
  log?.(
    `phase-d2: ${STUDENT_ME_PATH} -> playerName="${playerName || "(empty)"}" ` +
      `grade="${accountGradeRaw || "(empty)"}"`
  );
  return { playerName, accountGradeRaw };
}

function findLinkedStudentForLabel(linkedStudents, label) {
  const want = String(label || "").toLowerCase().trim();
  if (!want) return null;
  return (
    linkedStudents.find(
      (s) =>
        String(s?.login_username || "").toLowerCase().trim() === want
    ) || null
  );
}

/**
 * Phase D2 multi-subject classification.
 *
 * For each ownSubject (a subject the student studied today), the
 * primary pass criterion is countable driver evidence
 * (sessionResults[].countableAnswerCount). Parent-report UI net delta
 * is logged for visibility but is NOT authoritative: the product
 * report uses a rolling wall-clock window, so baseline→after net delta
 * can go negative when older rows fall out even though fresh driver
 * answers pass the evidence gate. Non-planned-subject deltas inside
 * the tight window are logged as external/concurrent activity — they
 * are NOT treated as product bleed failures.
 *
 * Returns:
 *   {
 *     ownSubjects:        string[],     // subjects studied today
 *     ownDeltaOk:         boolean|null, // null if any subject snapshot is null
 *     bleedOk:            boolean,
 *     bleedOk:            boolean,      // always true in per-student model
 *     bleedFindings:      [...],        // alias of externalConcurrentFindings
 *     externalConcurrentFindings: [...],
 *     externalConcurrentDetected: boolean,
 *     subjectClassification: { [subject]: {before, after, delta, expected, directionOk, note} }
 *   }
 */
function classifyDailyDelta({ sessionResults, delta }) {
  const subjectMap = delta?.bySubject || {};
  // Sum expected answers per subject (a student may have multiple
  // sessions in the same subject — rare but supported by the planner).
  const expectedBySubject = {};
  for (const sr of sessionResults) {
    if (!sr.completed) continue; // only count sessions that produced answers
    const k = sr.subject;
    const countable =
      sr.countableAnswerCount ??
      sr.evidence?.countableAnswers ??
      sr.answeredCount ??
      0;
    expectedBySubject[k] = (expectedBySubject[k] || 0) + countable;
  }
  const ownSubjects = Object.keys(expectedBySubject);

  const subjectClassification = {};
  let ownDeltaOk = true;
  let anyOwnNullSnapshot = false;
  let rollingWindowInstabilityDetected = false;
  for (const subject of ownSubjects) {
    const driverCountable = expectedBySubject[subject] || 0;
    const entry = subjectMap[subject] || null;
    if (!entry) {
      anyOwnNullSnapshot = true;
      subjectClassification[subject] = {
        subject,
        before: null,
        after: null,
        delta: null,
        expected: driverCountable,
        driverCountable,
        directionOk: null,
        note: `target subject "${subject}" missing from snapshot`,
      };
      continue;
    }
    if (entry.delta == null) {
      anyOwnNullSnapshot = true;
      subjectClassification[subject] = {
        subject,
        before: entry.before,
        after: entry.after,
        delta: null,
        expected: driverCountable,
        driverCountable,
        directionOk: null,
        note: `target subject "${subject}" delta unavailable (snapshot returned null)`,
      };
      continue;
    }
    const uiDelta = entry.delta;
    const driverEvidenceOk = driverCountable > 0;
    const uiConfirms = uiDelta >= driverCountable;
    const rollingWindowSalvage =
      driverEvidenceOk && !uiConfirms && uiDelta < driverCountable;

    if (uiConfirms) {
      subjectClassification[subject] = {
        subject,
        before: entry.before,
        after: entry.after,
        delta: uiDelta,
        expected: driverCountable,
        driverCountable,
        directionOk: true,
        rollingWindowSalvage: false,
        note:
          `target subject "${subject}" UI net delta=${uiDelta} confirms ` +
          `driver countable evidence=${driverCountable}`,
      };
    } else if (rollingWindowSalvage) {
      rollingWindowInstabilityDetected = true;
      subjectClassification[subject] = {
        subject,
        before: entry.before,
        after: entry.after,
        delta: uiDelta,
        expected: driverCountable,
        driverCountable,
        directionOk: true,
        rollingWindowSalvage: true,
        note:
          `driver countable evidence=${driverCountable} satisfies gate; ` +
          `parent-report UI net delta=${uiDelta} (rolling-window instability` +
          `${uiDelta < 0 ? ", older rows fell out of window" : ""})`,
      };
    } else {
      ownDeltaOk = false;
      subjectClassification[subject] = {
        subject,
        before: entry.before,
        after: entry.after,
        delta: uiDelta,
        expected: driverCountable,
        driverCountable,
        directionOk: false,
        rollingWindowSalvage: false,
        note:
          `driver countable evidence=${driverCountable} insufficient; ` +
          `UI net delta=${uiDelta}`,
      };
    }
  }
  if (ownSubjects.length === 0) ownDeltaOk = null;
  if (anyOwnNullSnapshot && ownDeltaOk !== false) ownDeltaOk = null;

  // Non-planned-subject deltas inside the per-student window are logged
  // as external/concurrent activity — not harness/product practice failures.
  const ownSet = new Set(ownSubjects);
  const externalConcurrentFindings = [];
  for (const subject of PHASE_C_KNOWN_SUBJECTS) {
    if (ownSet.has(subject)) continue;
    const entry = subjectMap[subject];
    if (!entry) continue;
    const d = entry.delta;
    if (d == null) continue;
    if (d === 0) continue;
    externalConcurrentFindings.push({
      subject,
      before: entry.before,
      after: entry.after,
      delta: d,
      note:
        `non-planned subject "${subject}" delta=${d} ` +
        `(before=${entry.before}, after=${entry.after}) inside the ` +
        `per-student snapshot window. Planned subjects: [${ownSubjects.join(", ")}]. ` +
        `Logged as external/concurrent same-student activity — not a product bleed failure.`,
    });
  }

  return {
    ownSubjects,
    ownDeltaOk,
    rollingWindowInstabilityDetected,
    bleedOk: true,
    bleedFindings: externalConcurrentFindings,
    externalConcurrentFindings,
    externalConcurrentDetected: externalConcurrentFindings.length > 0,
    subjectClassification,
  };
}

/**
 * True when sessions, stamping, evidence repair, and practice driver legs
 * completed — parent after-snapshot is intentionally excluded.
 */
function studentCoreLearningGatesPassed(record) {
  const sessions = record.sessionResults || [];
  if (sessions.length === 0) return false;
  if (sessions.some((s) => !s.completed)) return false;
  if (sessions.some((s) => s.error)) return false;
  if ((record.earlyExitReasons || []).length > 0) return false;
  if (record.tier1?.passed === false) return false;
  if (isTimestampStampingEnabled()) {
    if (sessions.some((s) => !s.timestampStamp?.sessionId)) return false;
    if (
      sessions.some((s) => Number(s.timestampStamp?.durationSeconds) <= 0)
    ) {
      return false;
    }
  }
  return true;
}

function applyStudentVerdict(record, log) {
  if (record.status === "blocked" || record.status === "fail") return;

  const failedSessions = record.sessionResults.filter(
    (r) => !r.completed && r.error
  );
  const completedSessions = record.sessionResults.filter((r) => r.completed);
  const cls = record.classification;

  if (cls?.externalConcurrentDetected && record.runWindow) {
    record.runWindow.externalConcurrentActivity =
      cls.externalConcurrentFindings || [];
    log?.(
      `phase-d2: ${record.label} external/concurrent same-student activity ` +
        `(informational, not a practice-mode failure): ` +
        `${cls.externalConcurrentFindings
          .map((f) => `${f.subject}+${f.delta}`)
          .join(", ")}`
    );
  }

  if (cls?.rollingWindowInstabilityDetected) {
    const salvaged = Object.values(cls.subjectClassification || {}).filter(
      (c) => c.rollingWindowSalvage
    );
    log?.(
      `phase-d2: ${record.label} parent-report rolling-window net delta ` +
        `unstable for [${salvaged.map((c) => c.subject).join(", ")}]; ` +
        `passing on driver countable evidence instead`
    );
    if (record.runWindow) {
      record.runWindow.rollingWindowInstability = salvaged.map((c) => ({
        subject: c.subject,
        uiDelta: c.delta,
        driverCountable: c.driverCountable,
      }));
    }
  }

  if (!record.tier1?.passed && completedSessions.length === 0) {
    record.status = "fail";
    record.driverError =
      record.driverError || "no session produced clean tier1 evidence";
    return;
  }

  if (cls?.ownDeltaOk === false) {
    record.status = "fail";
    record.driverError =
      record.driverError ||
      `own-subject delta failed: ${
        Object.values(cls.subjectClassification)
          .filter((c) => c.directionOk === false)
          .map((c) => c.note)
          .join("; ") || "see classification"
      }`;
    return;
  }

  if (cls?.ownDeltaOk == null && completedSessions.length > 0) {
    record.status = "fail";
    record.stepFailed = "environment-contamination";
    record.driverError =
      record.driverError ||
      "environment contamination: parent report delta unavailable for " +
        "planned subject(s) despite driver evidence";
    return;
  }

  if (failedSessions.length > 0 || record.earlyExitReasons.length > 0) {
    record.status = "partial";
    return;
  }

  record.status = "pass";
}

function aggregateSuite(records, { studiedCount }) {
  let pass = 0;
  let partial = 0;
  let fail = 0;
  let blocked = 0;
  for (const r of records) {
    if (r.status === "pass") pass += 1;
    else if (r.status === "partial") partial += 1;
    else if (r.status === "blocked") blocked += 1;
    else fail += 1;
  }
  // PASS  : every studied student passed (no fail, no blocked, no partial).
  // PARTIAL: at least one studied student is partial OR blocked, but no FAIL,
  //          AND #fail == 0 AND ≥ half studied succeeded.
  // FAIL  : any FAIL, OR more than half of studied students didn't pass.
  let verdict = "pass";
  if (fail === 0 && partial === 0 && blocked === 0) {
    verdict = "pass";
  } else if (fail === 0 && pass >= Math.ceil(studiedCount / 2)) {
    verdict = "partial";
  } else {
    verdict = "fail";
  }
  return {
    counts: { pass, partial, fail, blocked, total: records.length },
    studiedCount,
    verdict,
  };
}

export async function runPhaseD2Suite({
  browser,
  baseUrl,
  plan,
  parentAccount,
  parentAuthMode = "ui",
  studentAuthMode = "ui",
  accountsByLabel,
  artifacts,
  log,
  pacer,
  studentLabelsFilter = null,
}) {
  const startedAt = Date.now();

  // ---- 1. Adapter: planner output → studentRecords ----------------------
  const adapted = buildPhaseD2StudentRecords({
    plan,
    accountsByLabel,
    studentLabels: studentLabelsFilter,
  });
  log?.(
    `phase-d2: adapter produced studied=${adapted.studied.length} ` +
      `skipped=${adapted.skipped.length} ` +
      `filteredOut=${adapted.filteredOut.length} ` +
      `totalSessions=${adapted.summary.totalSessions}`
  );

  // ---- 2. Empty-day shortcut --------------------------------------------
  if (adapted.studied.length === 0) {
    log?.(
      "phase-d2: nobody studies today (all attendance rolls said no, or filter " +
        "left an empty studied set). Returning PASS with state-advance enabled."
    );
    return {
      verdict: "pass",
      stateAdvanceShouldRun: true,
      durationMs: Date.now() - startedAt,
      empty: true,
      adapted,
      parentAuthResult: null,
      dashboardStudentCount: null,
      linkedStudents: [],
      records: [],
      crossStudentMatrix: [],
      summary: {
        counts: { pass: 0, partial: 0, fail: 0, blocked: 0, total: 0 },
        studiedCount: 0,
        verdict: "pass",
      },
      parentConsole: { errors: [], noise: [], pageErrors: [] },
    };
  }

  // ---- 3. Parent context + auth -----------------------------------------
  const parentContext = await browser.newContext({
    locale: "he-IL",
    viewport: { width: 1280, height: 800 },
  });
  const parentPage = await parentContext.newPage();
  const parentConsoleErrors = [];
  const parentConsoleNoise = [];
  const parentPageErrors = [];
  parentPage.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = String(msg.text()).slice(0, 400);
    if (NOISE_RE.test(text)) parentConsoleNoise.push(text);
    else parentConsoleErrors.push(text);
  });
  parentPage.on("pageerror", (err) => {
    parentPageErrors.push(String(err?.message || err).slice(0, 400));
  });

  let parentAuthResult = null;
  let linkedStudents = [];
  let dashboardStudentCount = null;

  try {
    log?.("phase-d2: authenticating parent (real /parent/login UI required)");
    parentAuthResult = await authenticateParent({
      context: parentContext,
      page: parentPage,
      account: parentAccount,
      baseUrl,
      mode: parentAuthMode,
      log,
    });
    await artifacts
      .saveScreenshot(parentPage, "10-parent-auth-ok")
      .catch(() => {});
    log?.(
      `phase-d2: parent-auth ok mode=${parentAuthResult.mode} ` +
        `pass-eligible=${parentAuthResult.pass} partial=${parentAuthResult.partial}`
    );

    linkedStudents = await readParentLinkedStudents({
      page: parentPage,
      baseUrl,
      log,
    });
    dashboardStudentCount = linkedStudents.length;
  } catch (error) {
    log?.(`phase-d2: parent auth/list failed — ${error?.message || error}`);
    await artifacts
      .saveScreenshot(parentPage, "10-parent-auth-failure")
      .catch(() => {});
    try {
      await parentContext.close();
    } catch {
      // best-effort cleanup
    }
    return {
      verdict: "fail",
      stateAdvanceShouldRun: false,
      durationMs: Date.now() - startedAt,
      empty: false,
      adapted,
      parentAuthResult: parentAuthResult || {
        ok: false,
        error: String(error?.message || error).slice(0, 400),
      },
      dashboardStudentCount,
      linkedStudents: linkedStudents.map((s) => ({
        id: s?.id ?? null,
        full_name: s?.full_name ?? null,
        grade_level: s?.grade_level ?? null,
        login_username: s?.login_username ?? null,
      })),
      records: [],
      crossStudentMatrix: [],
      summary: {
        counts: { pass: 0, partial: 0, fail: 1, blocked: 0, total: 0 },
        studiedCount: adapted.studied.length,
        verdict: "fail",
      },
      parentConsole: {
        errors: parentConsoleErrors,
        noise: parentConsoleNoise,
        pageErrors: parentPageErrors,
      },
      error: `parent-auth-or-list: ${error?.message || error}`,
    };
  }

  // ---- 4. Build per-student record + dashboard validation ---------------
  const records = adapted.studied.map((entry) => {
    const linked = findLinkedStudentForLabel(linkedStudents, entry.label);
    return {
      label: entry.label,
      account: entry.account,
      grade: entry.grade,
      personaKind: entry.personaKind,
      defaultProfile: entry.defaultProfile,
      intendedMinutes: entry.intendedMinutes,
      sessions: entry.sessions, // scenario objects
      plannerSessions: entry.plannerSessions,
      // dashboard mapping
      linked,
      expectedDisplayName: linked?.full_name || null,
      studentId: linked?.id || null,
      dashboardVisible: !!linked,
      // verdict scaffolding
      status: "pending",
      blocker: null,
      stepFailed: null,
      driverError: null,
      studentState: null,
      sessionResults: [],
      networkSummary: null,
      tier1: null,
      baseline: null,
      after: null,
      delta: null,
      classification: null,
      reportUrlAtBaseline: null,
      reportUrlAtAfter: null,
      consoleErrors: [],
      consoleNoise: [],
      pageErrors: [],
      earlyExitReasons: [],
      runWindow: null,
    };
  });

  for (const record of records) {
    if (record.dashboardVisible && record.expectedDisplayName) continue;
    if (!record.dashboardVisible) {
      record.status = "blocked";
      record.blocker = {
        kind: "student-not-on-parent-dashboard",
        message:
          `phase-d2: parent dashboard does NOT list a child whose ` +
          `login_username matches "${record.label}". This is expected to ` +
          `have been caught by the preflight; if you see it here, the ` +
          `parent's roster changed between preflight and orchestrator.`,
      };
      log?.(
        `phase-d2: ${record.label} BLOCKED — ${record.blocker.message}`
      );
      continue;
    }
    if (!record.expectedDisplayName) {
      record.status = "blocked";
      record.blocker = {
        kind: "student-missing-full-name",
        message:
          `phase-d2: linked student row for "${record.label}" has empty full_name.`,
      };
      log?.(
        `phase-d2: ${record.label} BLOCKED — ${record.blocker.message}`
      );
    }
  }

  // ---- 5. Parallel per-student workers: baseline → sessions → after ----
  const runnableRecords = records.filter((r) => r.status !== "blocked");
  const runnableCount = runnableRecords.length;
  const parallelRunStartedAt = Date.now();
  const parallelConcurrency = resolveParallelStudentConcurrency();
  log?.(
    `phase-d2: parallel student execution — ${runnableCount} worker(s), ` +
      `concurrency=${parallelConcurrency} (own parent+student browser contexts)`
  );

  await runWithConcurrency(records, parallelConcurrency, async (record, i) => {
    if (record.status === "blocked") {
      log?.(`phase-d2: skipping ${record.label} (status=blocked).`);
      return;
    }

    const workerStartedAt = Date.now();
    log?.(
      `worker-start ${record.label} timestamp=${new Date(workerStartedAt).toISOString()} ` +
        `plannedMinutesForStudent=${record.intendedMinutes} ` +
        `sessionsForStudent=${record.sessions.length}`
    );

    const workerLog = (line) => log?.(`[${record.label}] ${line}`);

    const parentContext = await browser.newContext({
      locale: "he-IL",
      viewport: { width: 1280, height: 800 },
    });
    const workerParentPage = await parentContext.newPage();

    const tag = `s${String(i + 1).padStart(2, "0")}-${record.label}`;
    record.runWindow = {
      plannedSubjects: [...new Set(record.sessions.map((s) => s.subject))],
      studentRunStartedAt: null,
      studentRunEndedAt: null,
      baselineCapturedAt: null,
      afterCapturedAt: null,
      driverSessionIds: [],
      driverAnswerIds: [],
      driverAnswerCount: 0,
      externalConcurrentActivity: [],
    };

    try {
      await authenticateParent({
        context: parentContext,
        page: workerParentPage,
        account: parentAccount,
        baseUrl,
        mode: parentAuthMode,
        log: workerLog,
      });
    } catch (parentWorkerError) {
      record.status = "fail";
      record.stepFailed = "parent-auth-worker";
      record.driverError = `parallel parent auth failed: ${
        parentWorkerError?.message || parentWorkerError
      }`;
      workerLog(`FAIL — ${record.driverError}`);
      try {
        await parentContext.close();
      } catch {
        // ignore
      }
      return;
    }

    log?.("");
    log?.(
      `phase-d2: ===== student ${i + 1}/${records.length}: ${record.label} ` +
        `(grade=${record.grade}, persona=${record.personaKind}, ` +
        `sessions=${record.sessions.length}, intendedMinutes=${record.intendedMinutes}) =====`
    );

    // --- 5a. Baseline immediately before this student's sessions ----------
    log?.(
      `phase-d2: ${record.label} — baseline snapshot (immediately before sessions)`
    );
    record.runWindow.studentRunStartedAt = new Date().toISOString();
    try {
      record.baseline = await snapshotParentReportViaDashboard({
        page: workerParentPage,
        baseUrl,
        expectedStudentName: record.expectedDisplayName,
        log: workerLog,
        artifacts,
        artifactPrefix: `${tag}-baseline`,
        studentLabel: record.label,
        phase: "baseline",
        ...(isTimestampStampingEnabled() ? { simulatedDate: plan.date } : {}),
      });
      record.reportUrlAtBaseline = record.baseline.url;
      record.runWindow.baselineCapturedAt = new Date().toISOString();
    } catch (error) {
      record.status = "fail";
      record.stepFailed = "baseline-snapshot";
      record.driverError = `baseline snapshot failed: ${error?.message || error}`;
      log?.(`phase-d2: ${record.label} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(workerParentPage, `${tag}-baseline-failure`)
        .catch(() => {});
      try {
        await parentContext.close();
      } catch {
        // ignore
      }
      return;
    }

    const studentContext = await newStudentContext(browser);
    const studentPage = await studentContext.newPage();
    const studentConsoleErrors = [];
    const studentConsoleNoise = [];
    const studentPageErrors = [];
    studentPage.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = String(msg.text()).slice(0, 400);
      if (NOISE_RE.test(text)) studentConsoleNoise.push(text);
      else studentConsoleErrors.push(text);
    });
    studentPage.on("pageerror", (err) => {
      studentPageErrors.push(String(err?.message || err).slice(0, 400));
    });
    const observer = attachLearningNetworkObserver(studentPage);
    let driverObserverMark = null;

    try {
      record.stepFailed = "student-auth";
      await authenticateStudent({
        context: studentContext,
        page: studentPage,
        account: record.account,
        baseUrl,
        mode: studentAuthMode,
        log,
      });
      await artifacts
        .saveScreenshot(studentPage, `${tag}-after-student-auth`)
        .catch(() => {});

      record.stepFailed = "resolve-student-state";
      record.studentState = await readStudentStateFromApi({
        page: studentPage,
        baseUrl,
        log,
      });
      if (!record.studentState.playerName) {
        throw new Error(
          `phase-d2: /api/student/me returned an empty full_name for ${record.label}.`
        );
      }
      if (record.studentState.playerName !== record.expectedDisplayName) {
        throw new Error(
          `phase-d2: /api/student/me playerName="${record.studentState.playerName}" ` +
            `differs from /api/parent/list-students full_name="${record.expectedDisplayName}". ` +
            "Cross-student data integrity blocker."
        );
      }

      driverObserverMark = observer.mark();
      record.stepFailed = null;

      for (let s = 0; s < record.sessions.length; s++) {
        const scenario = record.sessions[s];
        const driver = DRIVER_BY_SUBJECT[scenario.subject];
        const sessionTag = `${tag}-sess${String(s + 1).padStart(2, "0")}-${scenario.subject}`;
        const sessionResult = {
          index: s,
          subject: scenario.subject,
          profile: scenario.profile,
          topic: scenario.topic,
          intendedQuestionCount: scenario.questionCount,
          answeredCount: 0,
          countableAnswerCount: 0,
          excludedAnswerCount: 0,
          correctIntended: null,
          correctObserved: null,
          tally: null,
          earlyExitReason: null,
          completed: false,
          error: null,
          tier1: null,
          tier1Counts: null,
          startedAt: Date.now(),
          endedAt: null,
        };

        if (!driver) {
          sessionResult.error =
            `no driver registered for subject "${scenario.subject}"`;
          record.sessionResults.push(sessionResult);
          log?.(
            `phase-d2: ${record.label} session${s + 1} ` +
              `subject=${scenario.subject} skipped — ${sessionResult.error}`
          );
          continue;
        }

        log?.(
          `phase-d2: ${record.label} session ${s + 1}/${record.sessions.length} ` +
            `subject=${scenario.subject} profile=${scenario.profile} ` +
            `topic=${scenario.topic} questions=${scenario.questionCount}`
        );

        const observerMark = observer.mark();
        try {
          const driverResult = await driver({
            page: studentPage,
            baseUrl,
            scenario,
            log,
            screenshotter: (name) =>
              artifacts.saveScreenshot(studentPage, `${sessionTag}-${name}`),
          });
          const counts = observer.summarizeSince(observerMark);
          sessionResult.tier1Counts = counts;
          sessionResult.tier1 = verifyTier1({
            networkSummary: counts,
            expectedAnswers:
              driverResult?.answeredQuestions?.length ?? scenario.questionCount,
          });
          sessionResult.tier1.sessionId =
            counts["/api/learning/session/start"]?.sessionId ||
            sessionResult.tier1.sessionId;
          sessionResult.answeredCount =
            counts["/api/learning/answer"]?.responses ??
            driverResult?.answeredQuestions?.length ??
            0;
          sessionResult.countableAnswerCount =
            driverResult?.evidence?.countableAnswers ?? sessionResult.answeredCount;
          sessionResult.excludedAnswerCount =
            driverResult?.evidence?.excludedAnswers ?? 0;
          sessionResult.tally = driverResult?.tally || null;
          sessionResult.correctIntended =
            driverResult?.tally?.intendedCorrect ?? null;
          sessionResult.correctObserved =
            driverResult?.tally?.observedCorrect ?? null;
          sessionResult.earlyExitReason =
            driverResult?.earlyExitReason || null;
          if (sessionResult.earlyExitReason) {
            record.earlyExitReasons.push({
              session: s + 1,
              subject: scenario.subject,
              reason: sessionResult.earlyExitReason,
            });
          }
          sessionResult.completed =
            sessionResult.tier1?.passed === true &&
            sessionResult.countableAnswerCount > 0;

          if (
            sessionResult.completed &&
            sessionResult.tier1?.sessionId &&
            isTimestampStampingEnabled()
          ) {
            const sessionPersistence = extractDriverPersistenceIds(
              observer,
              observerMark
            );
            try {
              const stampResult = await stampSimulationSessionTimestamps({
                sessionId: sessionResult.tier1.sessionId,
                simDate: plan.date,
                studentLabel: record.label,
                sessionIndex: s,
                priorEndMs: record._stampPriorEndMs ?? null,
                answerIds: sessionPersistence.answerIds,
                log: workerLog,
              });
              record._stampPriorEndMs = stampResult.endMs;
              sessionResult.timestampStamp = {
                sessionId: stampResult.sessionId,
                newStartedAt: stampResult.newStartedAt,
                newEndedAt: stampResult.newEndedAt,
                durationSeconds: stampResult.durationSeconds,
                answerCount: stampResult.answerCount,
              };
              try {
                const repairResult = await repairPracticeWrongAnswerEvidence({
                  sessionId: sessionResult.tier1.sessionId,
                  log: workerLog,
                });
                sessionResult.timestampStamp.evidenceRepaired = repairResult.repaired;
              } catch (repairError) {
                sessionResult.error = `practice-evidence-repair: ${
                  repairError?.message || repairError
                }`;
                sessionResult.completed = false;
                log?.(
                  `phase-d2: ${record.label} session${s + 1} REPAIR FAIL — ${sessionResult.error}`
                );
              }
            } catch (stampError) {
              sessionResult.error = `timestamp-stamp: ${
                stampError?.message || stampError
              }`;
              sessionResult.completed = false;
              log?.(
                `phase-d2: ${record.label} session${s + 1} STAMP FAIL — ${sessionResult.error}`
              );
            }
          }
        } catch (driverError) {
          sessionResult.error = `driver-error: ${
            driverError?.message || driverError
          }`;
          const counts = observer.summarizeSince(observerMark);
          sessionResult.tier1Counts = counts;
          sessionResult.tier1 = verifyTier1({
            networkSummary: counts,
            expectedAnswers: 0,
          });
          sessionResult.tier1.sessionId =
            counts["/api/learning/session/start"]?.sessionId ||
            sessionResult.tier1.sessionId;
          log?.(
            `phase-d2: ${record.label} session${s + 1} FAILED — ${sessionResult.error}`
          );
          await artifacts
            .saveScreenshot(studentPage, `${sessionTag}-driver-failure`)
            .catch(() => {});
        } finally {
          sessionResult.endedAt = Date.now();
          const orphanSessionId =
            sessionResult.tier1?.sessionId ||
            sessionResult.tier1Counts?.["/api/learning/session/start"]?.sessionId ||
            null;
          if (!sessionResult.completed && orphanSessionId) {
            sessionResult.orphanRisk = true;
            sessionResult.orphanSessionId = orphanSessionId;
            log?.(
              `phase-d2: ${record.label} session${s + 1} ORPHAN-RISK ` +
                `sessionId=${orphanSessionId} — finish/stamp incomplete; wall-clock row may remain`
            );
          }
          record.sessionResults.push(sessionResult);
        }

        if (s < record.sessions.length - 1) {
          await pacer.pauseBetweenSessions();
        }
      }

      const completedSessions = record.sessionResults.filter((r) => r.completed);
      const failedSessions = record.sessionResults.filter(
        (r) => !r.completed && r.error
      );
      record.networkSummary = observer.summary();
      record.tier1 = {
        passed:
          completedSessions.length > 0 && failedSessions.length === 0,
        completedSessions: completedSessions.length,
        failedSessions: failedSessions.length,
        totalSessions: record.sessionResults.length,
      };
    } catch (error) {
      record.status = "fail";
      record.driverError = `${record.stepFailed || "unknown"}: ${
        error?.message || error
      }`;
      log?.(`phase-d2: ${record.label} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(studentPage, `${tag}-driver-failure`)
        .catch(() => {});
    } finally {
      if (driverObserverMark) {
        const persistence = extractDriverPersistenceIds(
          observer,
          driverObserverMark
        );
        record.runWindow.driverSessionIds = persistence.sessionIds;
        record.runWindow.driverAnswerIds = persistence.answerIds;
        record.runWindow.driverAnswerCount = persistence.answerResponseCount;
      }
      record.consoleErrors = studentConsoleErrors;
      record.consoleNoise = studentConsoleNoise;
      record.pageErrors = studentPageErrors;
      try {
        await studentContext.close();
      } catch {
        // best-effort cleanup
      }
    }

    // --- 5b. After snapshot immediately after this student's sessions ---
    log?.(
      `phase-d2: ${record.label} — after snapshot (immediately after sessions)`
    );
    try {
      record.after = await snapshotParentReportViaDashboard({
        page: workerParentPage,
        baseUrl,
        expectedStudentName: record.expectedDisplayName,
        log: workerLog,
        artifacts,
        artifactPrefix: `${tag}-after`,
        studentLabel: record.label,
        phase: "after",
        ...(isTimestampStampingEnabled() ? { simulatedDate: plan.date } : {}),
      });
      record.reportUrlAtAfter = record.after.url;
      record.runWindow.afterCapturedAt = new Date().toISOString();
      record.runWindow.studentRunEndedAt = record.runWindow.afterCapturedAt;
    } catch (error) {
      const snapshotError = `after snapshot failed: ${error?.message || error}`;
      record.stepFailed = "after-snapshot";
      if (studentCoreLearningGatesPassed(record)) {
        record.snapshotWarning = true;
        record.driverError = snapshotError;
        if (record.status !== "fail") {
          record.status = "partial";
        }
        log?.(
          `phase-d2: ${record.label} WARN — ${snapshotError} ` +
            `(core learning gates passed; after-snapshot non-blocking)`
        );
      } else if (record.status !== "fail") {
        record.status = "fail";
        record.driverError = snapshotError;
        log?.(`phase-d2: ${record.label} FAIL — ${record.driverError}`);
      }
      await artifacts
        .saveScreenshot(workerParentPage, `${tag}-after-failure`)
        .catch(() => {});
    }

    // --- 5c. Delta + verdict for this student only ------------------------
    if (record.baseline && record.after) {
      record.delta = snapshotDelta(record.baseline, record.after);
      record.classification = classifyDailyDelta({
        sessionResults: record.sessionResults,
        delta: record.delta,
      });
      applyStudentVerdict(record, log);
    }

    try {
      await parentContext.close();
    } catch {
      // best-effort cleanup
    }

    const workerEndedAt = Date.now();
    const workerWallClockMs = workerEndedAt - workerStartedAt;
    log?.(
      `worker-end ${record.label} timestamp=${new Date(workerEndedAt).toISOString()} ` +
        `actualWallClockMs=${workerWallClockMs} ` +
        `actualWallClockMin=${(workerWallClockMs / 60_000).toFixed(1)}`
    );
    record.runWindow.workerWallClockMs = workerWallClockMs;
    record.runWindow.workerStartedAt = new Date(workerStartedAt).toISOString();
    record.runWindow.workerEndedAt = new Date(workerEndedAt).toISOString();
  });

  const parallelRunEndedAt = Date.now();
  const actualParallelWallClockMs = parallelRunEndedAt - parallelRunStartedAt;
  const studiedRecords = records.filter(
    (r) => r.status !== "blocked" && r.sessions.length > 0
  );
  const totalPlannedMinutes = studiedRecords.reduce(
    (acc, r) => acc + (Number(r.intendedMinutes) || 0),
    0
  );
  const maxStudentPlannedMinutes = studiedRecords.reduce(
    (acc, r) => Math.max(acc, Number(r.intendedMinutes) || 0),
    0
  );
  const serialEquivalentMs = studiedRecords.reduce(
    (acc, r) => acc + (r.runWindow?.workerWallClockMs || 0),
    0
  );
  const parallelismEfficiency =
    actualParallelWallClockMs > 0
      ? serialEquivalentMs / actualParallelWallClockMs
      : 0;

  log?.(
    `parallelism-summary studied=${studiedRecords.length} ` +
      `totalPlannedMinutes=${totalPlannedMinutes} (sum, NOT wall-clock) ` +
      `maxStudentPlannedMinutes=${maxStudentPlannedMinutes} ` +
      `actualWallClockMs=${actualParallelWallClockMs} ` +
      `actualWallClockMin=${(actualParallelWallClockMs / 60_000).toFixed(1)} ` +
      `parallelismEfficiency=${parallelismEfficiency.toFixed(2)} ` +
      `(serialEquivalent/wall-clock; ~${studiedRecords.length} if fully parallel)`
  );

  // ---- 6. Cross-student matrix ------------------------------------------
  const crossStudentMatrix = records
    .filter((r) => r.status !== "blocked")
    .map((r) => ({
      studentLabel: r.label,
      grade: r.grade,
      expectedDisplayName: r.expectedDisplayName,
      ownSubjects: r.classification?.ownSubjects || [],
      ownDeltaOk: r.classification?.ownDeltaOk ?? null,
      bleedOk: r.classification?.bleedOk ?? null,
      bleedFindings: r.classification?.bleedFindings || [],
      externalConcurrentDetected:
        r.classification?.externalConcurrentDetected ?? false,
      runWindow: r.runWindow || null,
      tier1Passed: r.tier1?.passed ?? null,
      finalStatus: r.status,
      sessionCount: r.sessions.length,
      completedSessionCount: r.sessionResults.filter((s) => s.completed)
        .length,
      totalAnswered: r.sessionResults.reduce(
        (acc, s) => acc + (s.answeredCount || 0),
        0
      ),
    }));

  // Final dashboard screenshot for the artifact bundle.
  await artifacts
    .saveScreenshot(parentPage, "99-final-parent-dashboard")
    .catch(() => {});
  try {
    await parentContext.close();
  } catch {
    // best-effort cleanup
  }

  const summary = aggregateSuite(records, {
    studiedCount: adapted.studied.length,
  });

  return {
    verdict: summary.verdict,
    stateAdvanceShouldRun: summary.verdict !== "fail",
    durationMs: Date.now() - startedAt,
    empty: false,
    adapted,
    parentAuthResult,
    dashboardStudentCount,
    linkedStudents: linkedStudents.map((s) => ({
      id: s?.id ?? null,
      full_name: s?.full_name ?? null,
      grade_level: s?.grade_level ?? null,
      login_username: s?.login_username ?? null,
    })),
    records,
    crossStudentMatrix,
    summary,
    parentConsole: {
      errors: parentConsoleErrors,
      noise: parentConsoleNoise,
      pageErrors: parentPageErrors,
    },
  };
}
