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
 *   6. Baseline-snapshot every studied student's parent report.
 *   7. Per-student loop: fresh context → student auth → for each session
 *      run the subject driver → between-session pacer → close context →
 *      between-students pacer.
 *   8. After-snapshot every studied student's parent report.
 *   9. Per-student verdict: own-subject deltas must match today's
 *      answered counts AND bleed (deltas in subjects the student did
 *      NOT study today) must be 0/null.
 *  10. Suite verdict + stateAdvanceShouldRun (true unless FAIL).
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
} from "./browser.mjs";
import { authenticateStudent } from "./student-auth.mjs";
import { authenticateParent } from "./parent-auth.mjs";
import {
  snapshotParentReportViaDashboard,
  snapshotDelta,
  PHASE_C_KNOWN_SUBJECTS,
} from "./parent-report-snapshot.mjs";
import { verifyTier1 } from "./persistence-evidence.mjs";
import { runMathScenario } from "./subject-drivers/math-master.mjs";
import { runGeometryScenario } from "./subject-drivers/geometry-master.mjs";
import { runHebrewScenario } from "./subject-drivers/hebrew-master.mjs";
import { runEnglishScenario } from "./subject-drivers/english-master.mjs";
import { runScienceScenario } from "./subject-drivers/science-master.mjs";
import { runMoledetGeographyScenario } from "./subject-drivers/moledet-geography-master.mjs";
import { buildPhaseD2StudentRecords } from "../scenarios/phase-d2-suite.mjs";

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
 * after-snapshot delta MUST be ≥ the count of /api/learning/answer
 * responses observed for that subject. For each non-ownSubject, delta
 * must be 0 or null (no card).
 *
 * Returns:
 *   {
 *     ownSubjects:        string[],     // subjects studied today
 *     ownDeltaOk:         boolean|null, // null if any subject snapshot is null
 *     bleedOk:            boolean,
 *     bleedFindings:      [{subject, before, after, delta, note}],
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
  for (const subject of ownSubjects) {
    const expected = expectedBySubject[subject] || 0;
    const entry = subjectMap[subject] || null;
    if (!entry) {
      anyOwnNullSnapshot = true;
      subjectClassification[subject] = {
        subject,
        before: null,
        after: null,
        delta: null,
        expected,
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
        expected,
        directionOk: null,
        note: `target subject "${subject}" delta unavailable (snapshot returned null)`,
      };
      continue;
    }
    if (entry.delta >= expected) {
      subjectClassification[subject] = {
        subject,
        before: entry.before,
        after: entry.after,
        delta: entry.delta,
        expected,
        directionOk: true,
        note:
          `target subject "${subject}" question count increased by ` +
          `${entry.delta} (expected ≥${expected})`,
      };
    } else {
      ownDeltaOk = false;
      subjectClassification[subject] = {
        subject,
        before: entry.before,
        after: entry.after,
        delta: entry.delta,
        expected,
        directionOk: false,
        note:
          `target subject "${subject}" question count increased by only ` +
          `${entry.delta} but expected ≥${expected}`,
      };
    }
  }
  if (ownSubjects.length === 0) ownDeltaOk = null;
  if (anyOwnNullSnapshot && ownDeltaOk !== false) ownDeltaOk = null;

  // Bleed = any non-own subject with non-zero delta.
  const ownSet = new Set(ownSubjects);
  const bleedFindings = [];
  for (const subject of PHASE_C_KNOWN_SUBJECTS) {
    if (ownSet.has(subject)) continue;
    const entry = subjectMap[subject];
    if (!entry) continue;
    const d = entry.delta;
    if (d == null) continue;
    if (d === 0) continue;
    bleedFindings.push({
      subject,
      before: entry.before,
      after: entry.after,
      delta: d,
      note:
        `non-target subject "${subject}" delta=${d} ` +
        `(before=${entry.before}, after=${entry.after}). ` +
        `This student's day plan only exercised [${ownSubjects.join(", ")}]; ` +
        `any non-zero delta on another subject is a bleed indicator.`,
    });
  }
  const bleedOk = bleedFindings.length === 0;

  return {
    ownSubjects,
    ownDeltaOk,
    bleedOk,
    bleedFindings,
    subjectClassification,
  };
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

  // ---- 5. Baseline-snapshot pass ----------------------------------------
  log?.("");
  log?.(
    "phase-d2: ===== baseline-snapshot pass (BEFORE any student activity) ====="
  );
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.status === "blocked") continue;
    const tag = `s${String(i + 1).padStart(2, "0")}-${record.label}`;
    try {
      record.baseline = await snapshotParentReportViaDashboard({
        page: parentPage,
        baseUrl,
        expectedStudentName: record.expectedDisplayName,
        log,
        artifacts,
        artifactPrefix: `${tag}-baseline`,
        studentLabel: record.label,
        phase: "baseline",
      });
      record.reportUrlAtBaseline = record.baseline.url;
    } catch (error) {
      record.status = "fail";
      record.stepFailed = "baseline-snapshot";
      record.driverError = `baseline snapshot failed: ${error?.message || error}`;
      log?.(`phase-d2: ${record.label} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(parentPage, `${tag}-baseline-failure`)
        .catch(() => {});
    }
  }

  // ---- 6. Per-student learning loop -------------------------------------
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.status === "blocked" || record.status === "fail") {
      log?.(
        `phase-d2: skipping learning for ${record.label} (status=${record.status}).`
      );
      continue;
    }
    const tag = `s${String(i + 1).padStart(2, "0")}-${record.label}`;
    log?.("");
    log?.(
      `phase-d2: ===== student ${i + 1}/${records.length}: ${record.label} ` +
        `(grade=${record.grade}, persona=${record.personaKind}, ` +
        `sessions=${record.sessions.length}, intendedMinutes=${record.intendedMinutes}) =====`
    );

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

      // ---- Sessions loop --------------------------------------------------
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
        } catch (driverError) {
          sessionResult.error = `driver-error: ${
            driverError?.message || driverError
          }`;
          log?.(
            `phase-d2: ${record.label} session${s + 1} FAILED — ${sessionResult.error}`
          );
          await artifacts
            .saveScreenshot(studentPage, `${sessionTag}-driver-failure`)
            .catch(() => {});
        } finally {
          sessionResult.endedAt = Date.now();
          record.sessionResults.push(sessionResult);
        }

        // Pacer between sessions (fast mode = 0). Skip after the last
        // session of the student.
        if (s < record.sessions.length - 1) {
          await pacer.pauseBetweenSessions();
        }
      }

      // Aggregate per-student tier1: pass iff every session that produced
      // answers has tier1.passed===true and at least one session completed.
      const completedSessions = record.sessionResults.filter(
        (r) => r.completed
      );
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
      if (failedSessions.length > 0 && completedSessions.length > 0) {
        // Some sessions ran cleanly but at least one failed → mark
        // partial later when classification is in.
      }
    } catch (error) {
      record.status = "fail";
      record.driverError = `${record.stepFailed || "unknown"}: ${
        error?.message || error
      }`;
      log?.(
        `phase-d2: ${record.label} FAIL — ${record.driverError}`
      );
      await artifacts
        .saveScreenshot(studentPage, `${tag}-driver-failure`)
        .catch(() => {});
    } finally {
      record.consoleErrors = studentConsoleErrors;
      record.consoleNoise = studentConsoleNoise;
      record.pageErrors = studentPageErrors;
      try {
        await studentContext.close();
      } catch {
        // best-effort cleanup
      }
    }

    // Pacer between students (fast mode = ~2s floor; realtime = 30s..3min).
    if (i < records.length - 1) {
      await pacer.pauseBetweenStudents();
    }
  }

  // ---- 7. After-snapshot pass -------------------------------------------
  log?.("");
  log?.(
    "phase-d2: ===== after-snapshot pass (AFTER all student activity) ====="
  );
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.status === "blocked") continue;
    if (record.status === "fail" && record.stepFailed === "baseline-snapshot") {
      continue; // no baseline → no meaningful after
    }
    const tag = `s${String(i + 1).padStart(2, "0")}-${record.label}`;
    try {
      record.after = await snapshotParentReportViaDashboard({
        page: parentPage,
        baseUrl,
        expectedStudentName: record.expectedDisplayName,
        log,
        artifacts,
        artifactPrefix: `${tag}-after`,
        studentLabel: record.label,
        phase: "after",
      });
      record.reportUrlAtAfter = record.after.url;
    } catch (error) {
      if (record.status !== "fail") {
        record.status = "fail";
        record.stepFailed = "after-snapshot";
        record.driverError = `after snapshot failed: ${error?.message || error}`;
      }
      log?.(`phase-d2: ${record.label} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(parentPage, `${tag}-after-failure`)
        .catch(() => {});
    }
  }

  // ---- 8. Per-student delta + classification -----------------------------
  for (const record of records) {
    if (record.status === "blocked") continue;
    if (!record.baseline || !record.after) continue;
    record.delta = snapshotDelta(record.baseline, record.after);
    record.classification = classifyDailyDelta({
      sessionResults: record.sessionResults,
      delta: record.delta,
    });

    if (record.status === "fail") continue; // already pinned

    const failedSessions = record.sessionResults.filter(
      (r) => !r.completed && r.error
    );
    const completedSessions = record.sessionResults.filter(
      (r) => r.completed
    );

    if (!record.tier1?.passed && completedSessions.length === 0) {
      record.status = "fail";
      record.driverError =
        record.driverError || "no session produced clean tier1 evidence";
      continue;
    }
    if (record.classification.bleedOk === false) {
      record.status = "fail";
      record.driverError =
        record.driverError ||
        `cross-subject bleed: ${record.classification.bleedFindings
          .map((f) => `${f.subject}+${f.delta}`)
          .join(", ")}`;
      continue;
    }
    if (record.classification.ownDeltaOk === false) {
      record.status = "fail";
      record.driverError =
        record.driverError ||
        `own-subject delta failed: ${
          Object.values(record.classification.subjectClassification)
            .filter((c) => c.directionOk === false)
            .map((c) => c.note)
            .join("; ") || "see classification"
        }`;
      continue;
    }
    if (failedSessions.length > 0 || record.earlyExitReasons.length > 0) {
      record.status = "partial";
      continue;
    }
    record.status = "pass";
  }

  // ---- 9. Cross-student matrix ------------------------------------------
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
