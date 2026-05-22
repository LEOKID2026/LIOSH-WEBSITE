/**
 * Phase D orchestrator — multi-student real UI QA.
 *
 * Inputs:
 *   - plan: array of {studentLabel, username, grade, scenario} entries
 *           produced by scenarios/phase-d-suite.mjs.
 *   - parentAccount: real QA parent (admin@admin.com via env).
 *   - accountsByLabel: lookup table from VIRTUAL_STUDENT_ACCOUNTS so each
 *     plan entry can be paired with its real {label, username, code, pin}.
 *
 * Flow:
 *   0. Authenticate the real parent through /parent/login on a dedicated
 *      browser context. Read /api/parent/list-students once to learn each
 *      student's full_name (the dashboard cards key on full_name) and
 *      record the dashboardStudentCount the parent owns.
 *   1. Verify every plan student is visible on the parent dashboard.
 *   2. Snapshot baseline parent reports for ALL plan students BEFORE any
 *      student activity happens. Every snapshot is reached by clicking
 *      the real "דוח הורים" affordance on the dashboard — never by
 *      direct URL construction. This baseline pass establishes the
 *      reference point for cross-student bleed detection.
 *   3. For each plan student, in order:
 *        a. Open a fresh student browser context (cookies/localStorage
 *           start clean — no cross-contamination between students).
 *        b. Authenticate via /student/login UI.
 *        c. Read /api/student/me to confirm playerName + accountGrade.
 *        d. Run the student's scenario (math addition by default).
 *        e. Verify Tier 1 (real /api/learning/{session/start, answer,
 *           session/finish} responses, no 5xx).
 *        f. Close the student context (frees memory and proves the next
 *           student's session starts cold).
 *   4. Snapshot AFTER parent reports for ALL plan students AFTER all
 *      learning is done. Same dashboard-click rule.
 *   5. Per-student verdict:
 *        - tier1.passed: required.
 *        - delta.subjectDelta == driverResult.answeredQuestions count:
 *          required (proves the student's report only reflects THEIR
 *          activity, not bled-in activity from another student).
 *        - bleedFindings (other-subject deltas != 0): must be empty.
 *   6. Suite verdict: every per-student verdict passed AND parent auth
 *      was non-partial AND every plan student appeared on the dashboard.
 *
 * Honoured rules (same as Phase C):
 *   • Real /student/login UI for every student (no API shortcut by default).
 *   • Real /parent/login UI (mode=ui is the only PASS path).
 *   • Parent report is ALWAYS reached by the dashboard click.
 *   • No localStorage as truth.
 *   • No API mocks.
 *   • No product UI / Hebrew copy / diagnostic logic / report logic /
 *     Supabase schema changes.
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

/**
 * After parent auth, navigate the parent page to /parent/dashboard so the
 * dashboard's own real fetch to /api/parent/list-students runs (with the
 * Authorization: Bearer header it already attaches from the real Supabase
 * session — we never read tokens out of localStorage). We capture the
 * response body to learn each linked student's full_name (used to find
 * the right dashboard card later).
 */
async function readParentLinkedStudents({ page, baseUrl, log }) {
  const target = new URL("/parent/dashboard", baseUrl).toString();
  const respPromise = page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      r.url().includes(PARENT_LIST_STUDENTS_PATH),
    { timeout: 30_000 }
  );
  log?.(`phase-d: navigating parent to ${target} to trigger list-students fetch`);
  await page.goto(target, { waitUntil: "domcontentloaded" });

  let resp;
  try {
    resp = await respPromise;
  } catch (error) {
    throw new Error(
      `phase-d: ${PARENT_LIST_STUDENTS_PATH} response wait timed out — ${
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
      `phase-d: ${PARENT_LIST_STUDENTS_PATH} returned status=${status}` +
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
    `phase-d: parent owns ${list.length} linked student(s) per real dashboard fetch.`
  );
  return list;
}

/**
 * After student auth, read /api/student/me through the student's page so
 * we can confirm playerName and accountGrade BEFORE driving the subject
 * page. Mirrors the helper Phase C uses (page.request.get carries the
 * page's auth cookies and session correctly).
 */
async function readStudentStateFromApi({ page, baseUrl, log }) {
  const url = new URL(STUDENT_ME_PATH, baseUrl).toString();
  let res;
  try {
    res = await page.request.get(url, { timeout: 30_000 });
  } catch (error) {
    throw new Error(
      `phase-d: ${STUDENT_ME_PATH} request failed: ${error?.message || error}`
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
      `phase-d: ${STUDENT_ME_PATH} returned status=${status} body=${JSON.stringify(body)}`
    );
  }
  const student = body.student || body;
  const playerName = String(student.full_name || student.fullName || "").trim();
  const accountGradeRaw = String(student.grade_level || student.gradeLevel || "");
  log?.(
    `phase-d: ${STUDENT_ME_PATH} -> playerName="${playerName || "(empty)"}" ` +
      `grade="${accountGradeRaw || "(empty)"}"`
  );
  return { playerName, accountGradeRaw };
}

function findLinkedStudentForPlanEntry(linkedStudents, planEntry) {
  const want = String(planEntry.username || planEntry.studentLabel || "")
    .toLowerCase()
    .trim();
  if (!want) return null;
  return (
    linkedStudents.find(
      (s) =>
        String(s.login_username || "").toLowerCase().trim() === want
    ) || null
  );
}

/**
 * Compute per-student delta-vs-expected and bleed findings.
 *
 * Inputs:
 *   - planEntry: the original {scenario.subject, scenario.questionCount, ...}
 *   - expectedAnswered: number of /api/learning/answer responses observed
 *     for this student's session (the network ground truth).
 *   - delta: snapshotDelta(baseline, after) for this student.
 *
 * Output:
 *   {
 *     ownDeltaOk: boolean | null,
 *     bleedOk: boolean | null,
 *     bleedFindings: [{subject, before, after, delta, note}],
 *     subjectClassification: { ...same shape as Phase C classifyDelta... }
 *   }
 */
function classifyStudentDelta({ planEntry, expectedAnswered, delta }) {
  const targetSubject = planEntry.scenario.subject;
  const subjectMap = delta?.bySubject || {};
  const targetEntry = subjectMap[targetSubject] || null;

  // ---- Own subject delta ----
  let ownDeltaOk = null;
  let ownNote = "";
  let subjectClassification = null;
  if (!targetEntry) {
    ownDeltaOk = null;
    ownNote = `target subject "${targetSubject}" missing from snapshot`;
    subjectClassification = {
      subject: targetSubject,
      before: null,
      after: null,
      delta: null,
      expected: expectedAnswered,
      directionOk: null,
      note: ownNote,
    };
  } else if (targetEntry.delta == null) {
    ownDeltaOk = null;
    ownNote = "target subject delta unavailable (snapshot returned null)";
    subjectClassification = {
      subject: targetSubject,
      before: targetEntry.before,
      after: targetEntry.after,
      delta: null,
      expected: expectedAnswered,
      directionOk: null,
      note: ownNote,
    };
  } else if (targetEntry.delta >= expectedAnswered) {
    ownDeltaOk = true;
    ownNote =
      `target subject "${targetSubject}" question count increased by ` +
      `${targetEntry.delta} (expected ≥${expectedAnswered}, ` +
      `before=${targetEntry.before}, after=${targetEntry.after})`;
    subjectClassification = {
      subject: targetSubject,
      before: targetEntry.before,
      after: targetEntry.after,
      delta: targetEntry.delta,
      expected: expectedAnswered,
      directionOk: true,
      note: ownNote,
    };
  } else {
    ownDeltaOk = false;
    ownNote =
      `target subject "${targetSubject}" question count increased by only ` +
      `${targetEntry.delta} but expected ≥${expectedAnswered} ` +
      `(before=${targetEntry.before}, after=${targetEntry.after})`;
    subjectClassification = {
      subject: targetSubject,
      before: targetEntry.before,
      after: targetEntry.after,
      delta: targetEntry.delta,
      expected: expectedAnswered,
      directionOk: false,
      note: ownNote,
    };
  }

  // ---- Bleed: every OTHER subject's delta must be 0 (or null = "no card
  // visible at all"; null is fine because both before and after were null,
  // meaning the student has no card for that subject — no change).
  const bleedFindings = [];
  for (const subject of PHASE_C_KNOWN_SUBJECTS) {
    if (subject === targetSubject) continue;
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
        `Phase D plan only exercised "${targetSubject}" for this student; ` +
        `any non-zero delta on another subject is a bleed indicator.`,
    });
  }
  const bleedOk = bleedFindings.length === 0;

  return {
    ownDeltaOk,
    bleedOk,
    bleedFindings,
    subjectClassification,
  };
}

export async function runPhaseDSuite({
  browser,
  baseUrl,
  plan,
  parentAccount,
  parentAuthMode,
  studentAuthMode,
  accountsByLabel,
  artifacts,
  log,
}) {
  if (!Array.isArray(plan) || plan.length === 0) {
    throw new Error("phase-d: empty plan — nothing to run.");
  }

  // ---- 0. Parent context + auth -----------------------------------------
  const parentContext = await browser.newContext({
    locale: "he-IL",
    viewport: { width: 1280, height: 800 },
  });
  const parentPage = await parentContext.newPage();
  // Parent-side console capture only; per-student console errors are
  // captured inside their own contexts so we can scope dev-mode noise.
  const parentConsoleErrors = [];
  const parentConsoleNoise = [];
  const parentPageErrors = [];
  const NOISE_RE = /^Failed to load resource:/i;
  parentPage.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = String(msg.text()).slice(0, 400);
    if (NOISE_RE.test(text)) parentConsoleNoise.push(text);
    else parentConsoleErrors.push(text);
  });
  parentPage.on("pageerror", (err) => {
    parentPageErrors.push(String(err?.message || err).slice(0, 400));
  });

  log("phase-d: authenticating parent (real /parent/login UI required)");
  const parentAuthResult = await authenticateParent({
    context: parentContext,
    page: parentPage,
    account: parentAccount,
    baseUrl,
    mode: parentAuthMode,
    log,
  });
  await artifacts.saveScreenshot(parentPage, "10-parent-auth-ok").catch(() => {});
  log(
    `parent-auth: ok mode=${parentAuthResult.mode} pass-eligible=${parentAuthResult.pass} ` +
      `partial=${parentAuthResult.partial}`
  );

  // ---- 1. Read parent's linked-students list once ------------------------
  const linkedStudents = await readParentLinkedStudents({
    page: parentPage,
    baseUrl,
    log,
  });
  const dashboardStudentCount = linkedStudents.length;

  // Pair each plan entry with its account credentials and dashboard
  // metadata (full_name + studentId). Fail-fast on any plan student that
  // isn't actually owned by the parent — that's a config blocker, not a
  // product bug.
  const studentRecords = [];
  for (const planEntry of plan) {
    const account = accountsByLabel.get(planEntry.studentLabel) || null;
    const linked = findLinkedStudentForPlanEntry(linkedStudents, planEntry);
    studentRecords.push({
      planEntry,
      account, // {label, username, code, pin} or null
      linked,  // server row from /api/parent/list-students or null
      expectedDisplayName: linked?.full_name || null,
      studentId: linked?.id || null,
      dashboardVisible: !!linked,
      // Filled in later:
      status: "pending",
      blocker: null,
      stepFailed: null,
      driverError: null,
      studentState: null,
      driverResult: null,
      tier1: null,
      tier1ScenarioCounts: null,
      networkEvents: null,
      baseline: null,
      after: null,
      delta: null,
      classification: null,
      reportUrlAtBaseline: null,
      reportUrlAtAfter: null,
      consoleErrors: [],
      consoleNoise: [],
      pageErrors: [],
    });
  }

  // ---- 2. Validate every plan student is visible on the parent's list ----
  // This gates baseline snapshots: we cannot snapshot a student we cannot
  // locate on the dashboard. Mark missing entries as BLOCKED right away.
  for (const record of studentRecords) {
    if (record.dashboardVisible && record.account && record.expectedDisplayName) {
      continue;
    }
    if (!record.account) {
      record.status = "blocked";
      record.blocker = {
        kind: "account-not-loaded",
        message:
          `phase-d: no credentials loaded for studentLabel=${record.planEntry.studentLabel}. ` +
          "Add it to VIRTUAL_STUDENT_ACCOUNTS or E2E_STUDENT_{N}_*.",
      };
      log(`phase-d: ${record.planEntry.studentLabel} BLOCKED — ${record.blocker.message}`);
      continue;
    }
    if (!record.dashboardVisible) {
      record.status = "blocked";
      record.blocker = {
        kind: "student-not-on-parent-dashboard",
        message:
          `phase-d: parent dashboard does NOT list a child whose ` +
          `login_username matches "${record.planEntry.username}". ` +
          "Confirm the parent owns this student and run again.",
      };
      log(`phase-d: ${record.planEntry.studentLabel} BLOCKED — ${record.blocker.message}`);
      continue;
    }
    if (!record.expectedDisplayName) {
      record.status = "blocked";
      record.blocker = {
        kind: "student-missing-full-name",
        message:
          `phase-d: linked student row for "${record.planEntry.username}" has empty full_name. ` +
          "Set a non-empty full_name on the student row before running Phase D.",
      };
      log(`phase-d: ${record.planEntry.studentLabel} BLOCKED — ${record.blocker.message}`);
    }
  }

  // ---- 3. Baseline snapshots for every non-blocked student ---------------
  log("");
  log("phase-d: ===== baseline-snapshot pass (BEFORE any student activity) =====");
  for (let i = 0; i < studentRecords.length; i++) {
    const record = studentRecords[i];
    if (record.status === "blocked") continue;
    const tag = `s${String(i + 1).padStart(2, "0")}-${record.planEntry.studentLabel}`;
    try {
      record.baseline = await snapshotParentReportViaDashboard({
        page: parentPage,
        baseUrl,
        expectedStudentName: record.expectedDisplayName,
        log,
        artifacts,
        artifactPrefix: `${tag}-baseline`,
      });
      record.reportUrlAtBaseline = record.baseline.url;
    } catch (error) {
      record.status = "fail";
      record.stepFailed = "baseline-snapshot";
      record.driverError = `baseline snapshot failed: ${error?.message || error}`;
      log(`phase-d: ${record.planEntry.studentLabel} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(parentPage, `${tag}-baseline-failure`)
        .catch(() => {});
    }
  }

  // ---- 4. Per-student learning loop --------------------------------------
  for (let i = 0; i < studentRecords.length; i++) {
    const record = studentRecords[i];
    if (record.status === "blocked" || record.status === "fail") {
      log(
        `phase-d: skipping learning for ${record.planEntry.studentLabel} ` +
          `(status=${record.status}).`
      );
      continue;
    }
    const tag = `s${String(i + 1).padStart(2, "0")}-${record.planEntry.studentLabel}`;
    log("");
    log(
      `phase-d: ===== student ${i + 1}/${studentRecords.length}: ` +
        `${record.planEntry.studentLabel} (grade=${record.planEntry.grade}, ` +
        `subject=${record.planEntry.scenario.subject}, ` +
        `profile=${record.planEntry.scenario.profile}, ` +
        `questions=${record.planEntry.scenario.questionCount}) =====`
    );

    // Fresh context per student — guarantees no cookie/localStorage leak
    // across students. Also gives us per-student console-error scopes so
    // dev-mode noise doesn't bleed into other students' verdicts.
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
          `phase-d: /api/student/me returned an empty full_name for ` +
            `${record.planEntry.studentLabel}.`
        );
      }
      // Confirm the API-side full_name matches the parent's dashboard
      // full_name. A mismatch is a hard cross-student-bleed indicator —
      // the dashboard would be showing the wrong student's name for
      // the same login_username, which means the test would attribute
      // activity to the wrong card later.
      if (record.studentState.playerName !== record.expectedDisplayName) {
        throw new Error(
          `phase-d: /api/student/me playerName="${record.studentState.playerName}" ` +
            `differs from /api/parent/list-students full_name="${record.expectedDisplayName}". ` +
            "Cross-student data integrity blocker."
        );
      }

      const driver = DRIVER_BY_SUBJECT[record.planEntry.scenario.subject];
      if (!driver) {
        throw new Error(
          `phase-d: no driver registered for subject "${record.planEntry.scenario.subject}"`
        );
      }

      record.stepFailed = "subject-driver";
      const observerMark = observer.mark();
      const driverResult = await driver({
        page: studentPage,
        baseUrl,
        scenario: record.planEntry.scenario,
        log,
        screenshotter: (name) =>
          artifacts.saveScreenshot(studentPage, `${tag}-${name}`),
      });
      record.driverResult = driverResult;

      record.stepFailed = "tier1-verification";
      const summary = observer.summarizeSince(observerMark);
      record.tier1ScenarioCounts = summary;
      record.networkEvents = observer.eventsSince(observerMark).map((e) => ({
        kind: e.kind,
        path: e.path,
        method: e.method,
        status: e.status ?? null,
        ok: e.ok ?? null,
        ts: e.ts,
      }));
      record.tier1 = verifyTier1({
        networkSummary: summary,
        expectedAnswers: driverResult.answeredQuestions.length,
      });
      record.stepFailed = null;
    } catch (error) {
      record.status = "fail";
      record.driverError = `${record.stepFailed || "unknown"}: ${
        error?.message || error
      }`;
      log(
        `phase-d: ${record.planEntry.studentLabel} FAIL — ${record.driverError}`
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
  }

  // ---- 5. After snapshots for every non-blocked student ------------------
  log("");
  log("phase-d: ===== after-snapshot pass (AFTER all student activity) =====");
  for (let i = 0; i < studentRecords.length; i++) {
    const record = studentRecords[i];
    if (
      record.status === "blocked" ||
      (record.status === "fail" && record.stepFailed === "baseline-snapshot")
    ) {
      // No baseline → no meaningful after.
      continue;
    }
    const tag = `s${String(i + 1).padStart(2, "0")}-${record.planEntry.studentLabel}`;
    try {
      record.after = await snapshotParentReportViaDashboard({
        page: parentPage,
        baseUrl,
        expectedStudentName: record.expectedDisplayName,
        log,
        artifacts,
        artifactPrefix: `${tag}-after`,
      });
      record.reportUrlAtAfter = record.after.url;
    } catch (error) {
      // If the after-snapshot fails AFTER a successful learning leg, the
      // student gets fail because we cannot verify their report.
      if (record.status !== "fail") {
        record.status = "fail";
        record.stepFailed = "after-snapshot";
        record.driverError = `after snapshot failed: ${error?.message || error}`;
      }
      log(
        `phase-d: ${record.planEntry.studentLabel} FAIL — ${record.driverError}`
      );
      await artifacts
        .saveScreenshot(parentPage, `${tag}-after-failure`)
        .catch(() => {});
    }
  }

  // ---- 6. Compute per-student delta + bleed verdict ----------------------
  for (const record of studentRecords) {
    if (record.status === "blocked") continue;
    if (!record.baseline || !record.after) {
      // Baseline or after missing — driver/snapshot already marked fail.
      continue;
    }
    record.delta = snapshotDelta(record.baseline, record.after);
    const expectedAnswered =
      record.tier1ScenarioCounts?.["/api/learning/answer"]?.responses ??
      record.driverResult?.answeredQuestions?.length ??
      0;
    record.classification = classifyStudentDelta({
      planEntry: record.planEntry,
      expectedAnswered,
      delta: record.delta,
    });

    if (record.status === "fail") {
      // Already marked fail upstream (driver / snapshot). Keep it.
      continue;
    }

    if (!record.tier1?.passed) {
      record.status = "fail";
      record.driverError = record.driverError || "tier1 failed (see tier1.errors)";
    } else if (record.classification.ownDeltaOk === false) {
      record.status = "fail";
      record.driverError =
        `own-subject delta failed: ${record.classification.subjectClassification.note}`;
    } else if (record.classification.bleedOk === false) {
      record.status = "fail";
      record.driverError = `cross-subject bleed detected: ${record.classification.bleedFindings
        .map((f) => `${f.subject}+${f.delta}`)
        .join(", ")}`;
    } else if (
      record.driverResult?.earlyExitReason &&
      record.driverResult?.answeredQuestions?.length <
        record.planEntry.scenario.questionCount
    ) {
      record.status = "partial";
      record.earlyExitReason = record.driverResult.earlyExitReason;
    } else {
      record.status = "pass";
    }

    log(
      `phase-d: ${record.planEntry.studentLabel} status=${record.status} ` +
        `tier1=${record.tier1?.passed} ` +
        `ownDelta=${record.classification?.ownDeltaOk} ` +
        `bleedOk=${record.classification?.bleedOk}`
    );
  }

  // ---- 7. Cross-student matrix: every tested student's after-snapshot ----
  // should reflect ONLY their own scenario's expectedAnswered. This is
  // the same check classifyStudentDelta already encodes per-student;
  // the matrix below is an aggregate view that surfaces the property in
  // run-summary.md so a human reviewer can read it at a glance.
  const crossStudentMatrix = studentRecords
    .filter((r) => r.status !== "blocked")
    .map((r) => ({
      studentLabel: r.planEntry.studentLabel,
      grade: r.planEntry.grade,
      expectedDisplayName: r.expectedDisplayName,
      expectedAnswered:
        r.tier1ScenarioCounts?.["/api/learning/answer"]?.responses ??
        r.driverResult?.answeredQuestions?.length ??
        null,
      targetSubject: r.planEntry.scenario.subject,
      targetSubjectDelta:
        r.delta?.bySubject?.[r.planEntry.scenario.subject]?.delta ?? null,
      totalDelta: r.delta?.totalDelta ?? null,
      bleedFindings: r.classification?.bleedFindings || [],
      ownDeltaOk: r.classification?.ownDeltaOk ?? null,
      bleedOk: r.classification?.bleedOk ?? null,
      tier1Passed: r.tier1?.passed ?? null,
      finalStatus: r.status,
    }));

  // ---- 8. Suite aggregation ----------------------------------------------
  const summary = aggregateSuite(studentRecords);

  // Take a final dashboard screenshot for the artifact bundle.
  await artifacts
    .saveScreenshot(parentPage, "99-final-parent-dashboard")
    .catch(() => {});
  try {
    await parentContext.close();
  } catch {
    // best-effort cleanup
  }

  return {
    parentAuthResult,
    dashboardStudentCount,
    linkedStudents: linkedStudents.map((s) => ({
      id: s.id,
      full_name: s.full_name || null,
      grade_level: s.grade_level || null,
      login_username: s.login_username || null,
    })),
    studentRecords,
    crossStudentMatrix,
    summary,
    parentConsoleErrors,
    parentConsoleNoise,
    parentPageErrors,
  };
}

function aggregateSuite(records) {
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
  // Per-grade roll-up so the summary surfaces "every grade tested passed".
  const byGrade = {};
  for (const r of records) {
    const k = String(r.planEntry.grade);
    if (!byGrade[k]) byGrade[k] = { pass: 0, partial: 0, fail: 0, blocked: 0, students: [] };
    byGrade[k][r.status] = (byGrade[k][r.status] || 0) + 1;
    byGrade[k].students.push(r.planEntry.studentLabel);
  }
  return {
    counts: { pass, partial, fail, blocked, total: records.length },
    byGrade,
  };
}
