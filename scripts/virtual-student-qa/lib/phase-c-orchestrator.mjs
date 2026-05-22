/**
 * Phase C orchestrator — multi-subject scenarios for one student.
 *
 * Runs end-to-end:
 *   1. Authenticate the student via real /student/login UI (already done by
 *      run.mjs; we receive the live page).
 *   2. Authenticate the parent via real /parent/login UI (default mode 'ui'
 *      is the only mode that produces PASS).
 *   3. For each scenario in the suite:
 *      a. Snapshot baseline parent report counters via the real
 *         dashboard "דוח הורים" click (no direct URL construction).
 *      b. Run the subject driver (math / geometry / hebrew / english /
 *         science / moledet-geography). Moledet throws BLOCKED.
 *      c. Compute per-scenario Tier 1 evidence from network events that
 *         happened after the scenario's start marker.
 *      d. Snapshot post-scenario parent report counters via dashboard.
 *      e. Compute the per-subject delta and the profile evidence
 *         (intended vs observed correct counts).
 *
 * Honoured Phase C rules:
 *   • No localStorage as truth (all evidence comes from network or DOM).
 *   • No API mocks.
 *   • Parent report is always reached by the real dashboard click.
 *   • Moledet is recorded as BLOCKED; we never fake its activity.
 */

import { runMathScenario } from "./subject-drivers/math-master.mjs";
import { runGeometryScenario } from "./subject-drivers/geometry-master.mjs";
import { runHebrewScenario } from "./subject-drivers/hebrew-master.mjs";
import { runEnglishScenario } from "./subject-drivers/english-master.mjs";
import { runScienceScenario } from "./subject-drivers/science-master.mjs";
import { runMoledetGeographyScenario } from "./subject-drivers/moledet-geography-master.mjs";
import { authenticateParent } from "./parent-auth.mjs";
import {
  snapshotParentReportViaDashboard,
  snapshotDelta,
} from "./parent-report-snapshot.mjs";
import { verifyTier1 } from "./persistence-evidence.mjs";
import { tallyCorrectness } from "./learning-session-helpers.mjs";

const DRIVER_BY_SUBJECT = {
  math: runMathScenario,
  geometry: runGeometryScenario,
  hebrew: runHebrewScenario,
  english: runEnglishScenario,
  science: runScienceScenario,
  "moledet-geography": runMoledetGeographyScenario,
};

const PROFILE_EXPECTATIONS = {
  // For "where possible" subjects (math, geometry, MCQ with reliable fiber
  // probe), these ranges define what "answer profiles actually work" means.
  // Outside these ranges the run summary marks the profile evidence as
  // FAIL for that scenario. Ranges are deliberately ±15pp around the
  // profile's nominal correctRate at N≈15 to absorb LCG noise without
  // letting profiles mush together — see _test-seeds.mjs for evidence.
  strong:   { minIntendedRate: 0.80, maxIntendedRate: 1.00, label: "≥80% intended-correct" },
  average:  { minIntendedRate: 0.55, maxIntendedRate: 0.85, label: "55–85% intended-correct" },
  weak:     { minIntendedRate: 0.20, maxIntendedRate: 0.55, label: "20–55% intended-correct" },
  // targeted assumes the scenario picks a topic that IS a weakness topic
  // (scenario.weaknessTopics includes scenario.topic / scenario.operation),
  // which switches the picker to weakTopicRate (~0.25). If a non-weakness
  // topic is also present the rate would shift toward spec.correctRate ~0.85;
  // we keep the bound loose enough to allow that variant while still rejecting
  // a degenerate "all correct" run.
  targeted: { minIntendedRate: 0.10, maxIntendedRate: 0.55, label: "10–55% intended-correct (weakness topic)" },
};

function classifyProfileEvidence({ profile, tally }) {
  const exp = PROFILE_EXPECTATIONS[profile] || PROFILE_EXPECTATIONS.average;
  if (!tally || tally.total === 0) {
    return {
      profile,
      expectation: exp.label,
      intendedRate: null,
      observedRate: null,
      profileSignalOk: null,
      note: "no questions answered",
    };
  }
  const intendedRate = tally.intendedRate;
  let profileSignalOk = null;
  let note = "";
  if (intendedRate == null) {
    note = "intendedRate unknown (driver did not surface intent)";
  } else if (intendedRate < exp.minIntendedRate || intendedRate > exp.maxIntendedRate) {
    profileSignalOk = false;
    note = `intendedRate=${(intendedRate * 100).toFixed(0)}% outside expected ${exp.label}`;
  } else {
    profileSignalOk = true;
    note = `intendedRate=${(intendedRate * 100).toFixed(0)}% inside expected ${exp.label}`;
  }
  // Cross-check against observed isCorrect from /api/learning/answer.
  let crossNote = "";
  if (tally.observedRate != null) {
    const diff = tally.observedRate - (intendedRate ?? tally.observedRate);
    crossNote =
      ` (observedRate=${(tally.observedRate * 100).toFixed(0)}% from ` +
      `${tally.observedKnown}/${tally.total} answer responses; ` +
      `Δ vs intended=${(diff * 100).toFixed(0)}pp)`;
  }
  return {
    profile,
    expectation: exp.label,
    intendedRate,
    observedRate: tally.observedRate ?? null,
    intendedCorrectCount: tally.intendedCorrect,
    observedCorrectCount: tally.observedCorrect,
    profileSignalOk,
    note: note + crossNote,
  };
}

function classifyDelta({ scenario, expectedAnswered, delta }) {
  // expectedAnswered = how many /api/learning/answer responses the driver
  // observed for THIS scenario (i.e. the network ground truth, not the
  // scenario.questionCount which is just the upper bound).
  const subject = scenario.subject;
  const subjectDelta = delta?.bySubject?.[subject] ?? null;
  if (!subjectDelta) {
    return {
      subject,
      before: null,
      after: null,
      delta: null,
      expected: expectedAnswered,
      directionOk: null,
      note: "subject delta missing from snapshot",
    };
  }
  const observed = subjectDelta.delta;
  let directionOk = null;
  let note = "";
  if (observed == null) {
    note = "delta unavailable (snapshot returned null)";
  } else if (observed >= expectedAnswered) {
    directionOk = true;
    note =
      `subject question count increased by ${observed} (expected ≥${expectedAnswered}` +
      `, before=${subjectDelta.before}, after=${subjectDelta.after})`;
  } else {
    directionOk = false;
    note =
      `subject question count increased by only ${observed} but expected ≥${expectedAnswered} ` +
      `(before=${subjectDelta.before}, after=${subjectDelta.after})`;
  }
  return {
    subject,
    before: subjectDelta.before,
    after: subjectDelta.after,
    delta: subjectDelta.delta,
    expected: expectedAnswered,
    directionOk,
    note,
  };
}

/**
 * Run the Phase C suite end-to-end.
 *
 * Returns an array of per-scenario records and the suite-level aggregate so
 * the caller (run.mjs) can render run-summary.json / run-summary.md with
 * Phase C-specific sections.
 */
export async function runPhaseCSuite({
  page,
  context,
  baseUrl,
  scenarios,
  parentAccount,
  parentAuthMode,
  observer,
  artifacts,
  studentPlayerNamePromise,
  log,
}) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error("phase-c: no scenarios to run");
  }

  // Authenticate parent first so we can read baseline counters before any
  // student activity. If parent auth fails, the suite cannot proceed at all.
  log("phase-c: authenticating parent (real /parent/login UI required)");
  const parentAuthResult = await authenticateParent({
    context,
    page,
    account: parentAccount,
    baseUrl,
    mode: parentAuthMode,
    log,
  });
  await artifacts.saveScreenshot(page, "10-after-parent-auth").catch(() => {});
  log(
    `parent-auth: ok mode=${parentAuthResult.mode} pass-eligible=${parentAuthResult.pass} ` +
      `partial=${parentAuthResult.partial} alreadyAuthenticated=${parentAuthResult.alreadyAuthenticated || false}`
  );

  // Resolve the live student name (set by the first non-blocker driver, or
  // the caller's known student account label as a fallback for the FIRST
  // baseline snapshot — drivers fill in the actual name later).
  let resolvedStudentName = await studentPlayerNamePromise;
  if (!resolvedStudentName) {
    throw new Error(
      "phase-c: cannot snapshot parent report — student playerName is unknown. " +
        "The student driver must provide a non-empty playerName."
    );
  }
  log(`phase-c: expected linked student name on dashboard = "${resolvedStudentName}"`);

  const scenarioRecords = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const scenarioIndex = i + 1;
    const tag = `s${String(scenarioIndex).padStart(2, "0")}-${scenario.id}`;
    log("");
    log(
      `phase-c: ===== scenario ${scenarioIndex}/${scenarios.length}: ` +
        `${scenario.id} (subject=${scenario.subject}, profile=${scenario.profile}, ` +
        `questions=${scenario.questionCount}) =====`
    );

    const record = {
      scenario: {
        id: scenario.id,
        subject: scenario.subject,
        profile: scenario.profile,
        questionCount: scenario.questionCount,
        weaknessTopics: scenario.weaknessTopics ?? [],
        topic: scenario.topic ?? null,
        grade: scenario.grade ?? null,
        operation: scenario.operation ?? null,
      },
      status: "pending",
      blocked: false,
      blocker: null,
      driverError: null,
      tier1: null,
      tier1ScenarioCounts: null,
      driverResult: null,
      profileEvidence: null,
      baseline: null,
      after: null,
      delta: null,
      deltaClassification: null,
      networkEvents: null,
    };

    // Phase C originally used `scenario.blocker` to mark moledet-geography
    // as a verified blocker because that page lacked stable testids. The
    // Phase C repair pass added the canonical testids, so all scenarios
    // now run their drivers. The flag stays supported here for any future
    // blocker scenario that might be added to the suite without touching
    // the orchestrator.
    if (scenario.blocker) {
      record.blocked = true;
      record.blocker = {
        kind: scenario.blocker.kind || "verified-blocker",
        message: scenario.blocker.message || null,
        missingTestids: scenario.blocker.missingTestids || null,
        recommendedAction: scenario.blocker.recommendedAction || null,
      };
      record.status = "blocked";
      log(
        `phase-c: scenario ${scenario.id} BLOCKED — ${
          scenario.blocker.message || scenario.blocker.kind || "verified blocker"
        }. Recording blocker and continuing.`
      );
      scenarioRecords.push(record);
      continue;
    }

    const driver = DRIVER_BY_SUBJECT[scenario.subject];
    if (!driver) {
      record.status = "fail";
      record.driverError = `no driver registered for subject "${scenario.subject}"`;
      log(`phase-c: scenario ${scenario.id} FAIL — ${record.driverError}`);
      scenarioRecords.push(record);
      continue;
    }

    // ---- Baseline snapshot ---------------------------------------------
    try {
      record.baseline = await snapshotParentReportViaDashboard({
        page,
        baseUrl,
        expectedStudentName: resolvedStudentName,
        log,
        artifacts,
        artifactPrefix: `${tag}-baseline`,
      });
    } catch (error) {
      record.status = "fail";
      record.driverError = `baseline snapshot failed: ${error?.message || error}`;
      log(`phase-c: scenario ${scenario.id} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(page, `${tag}-baseline-failure`)
        .catch(() => {});
      scenarioRecords.push(record);
      continue;
    }

    // ---- Run driver -----------------------------------------------------
    const observerMark = observer.mark();
    let driverResult = null;
    try {
      driverResult = await driver({
        page,
        baseUrl,
        scenario,
        log,
        screenshotter: (name) =>
          artifacts.saveScreenshot(page, `${tag}-${name}`),
      });
      record.driverResult = driverResult;
      // First successful driver supplies the live student name (if not
      // already resolved). Subsequent snapshots can rely on this.
      if (driverResult.playerName && driverResult.playerName !== resolvedStudentName) {
        log(
          `phase-c: driver surfaced playerName="${driverResult.playerName}", ` +
            `previously="${resolvedStudentName}" — using the new value.`
        );
        resolvedStudentName = driverResult.playerName;
      }
    } catch (error) {
      record.status = "fail";
      record.driverError = `driver failed: ${error?.message || error}`;
      log(`phase-c: scenario ${scenario.id} FAIL — ${record.driverError}`);
      await artifacts
        .saveScreenshot(page, `${tag}-driver-failure`)
        .catch(() => {});
      scenarioRecords.push(record);
      continue;
    }

    // ---- Per-scenario Tier 1 -------------------------------------------
    const scenarioNetworkSummary = observer.summarizeSince(observerMark);
    record.tier1ScenarioCounts = scenarioNetworkSummary;
    record.networkEvents = observer.eventsSince(observerMark).map((e) => ({
      kind: e.kind,
      path: e.path,
      method: e.method,
      status: e.status ?? null,
      ok: e.ok ?? null,
      ts: e.ts,
    }));
    record.tier1 = verifyTier1({
      networkSummary: scenarioNetworkSummary,
      expectedAnswers: driverResult.answeredQuestions.length,
    });

    // ---- After snapshot -------------------------------------------------
    try {
      record.after = await snapshotParentReportViaDashboard({
        page,
        baseUrl,
        expectedStudentName: resolvedStudentName,
        log,
        artifacts,
        artifactPrefix: `${tag}-after`,
      });
    } catch (error) {
      record.status = "fail";
      record.driverError = `after-snapshot failed: ${error?.message || error}`;
      log(
        `phase-c: scenario ${scenario.id} FAIL — ${record.driverError}`
      );
      await artifacts
        .saveScreenshot(page, `${tag}-after-failure`)
        .catch(() => {});
      scenarioRecords.push(record);
      continue;
    }

    // ---- Delta + classification -----------------------------------------
    record.delta = snapshotDelta(record.baseline, record.after);
    const expectedAnswered =
      scenarioNetworkSummary?.["/api/learning/answer"]?.responses ??
      driverResult.answeredQuestions.length;
    record.deltaClassification = classifyDelta({
      scenario,
      expectedAnswered,
      delta: record.delta,
    });
    record.profileEvidence = classifyProfileEvidence({
      profile: scenario.profile,
      tally: driverResult.tally || tallyCorrectness(driverResult.answeredQuestions),
    });

    // ---- Status decision ------------------------------------------------
    const earlyExit = driverResult.earlyExitReason || null;
    if (!record.tier1.passed) {
      record.status = "fail";
    } else if (record.deltaClassification.directionOk === false) {
      record.status = "fail";
    } else if (earlyExit) {
      // The driver could not complete its full questionCount because the
      // page entered a non-question state (modal, completion screen, etc.)
      // The persisted answers we DID submit landed correctly; record this
      // as PARTIAL so the suite summary surfaces the early exit.
      record.status = "partial";
      record.earlyExitReason = earlyExit;
    } else if (record.profileEvidence.profileSignalOk === false) {
      // Profile evidence failures are non-fatal for the scenario itself —
      // the persistence + delta proved the leg works — but they downgrade
      // the suite-level profile evidence to FAIL for this profile.
      record.status = "partial";
    } else {
      record.status = "pass";
    }

    log(
      `phase-c: scenario ${scenario.id} status=${record.status} ` +
        `tier1=${record.tier1.passed} ` +
        `delta=${record.deltaClassification.directionOk} ` +
        `profileSignal=${record.profileEvidence.profileSignalOk}`
    );

    scenarioRecords.push(record);
  }

  // ---- Suite aggregation -------------------------------------------------
  const summary = aggregateSuite(scenarioRecords);

  return { parentAuthResult, scenarioRecords, summary, resolvedStudentName };
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
  // Per-subject roll-up.
  const bySubject = {};
  for (const r of records) {
    const key = r.scenario.subject;
    if (!bySubject[key]) {
      bySubject[key] = { pass: 0, partial: 0, fail: 0, blocked: 0, scenarios: [] };
    }
    bySubject[key][r.status] = (bySubject[key][r.status] || 0) + 1;
    bySubject[key].scenarios.push(r.scenario.id);
  }
  // Profile signal evidence by profile name.
  const byProfile = {};
  for (const r of records) {
    if (!r.profileEvidence) continue;
    const p = r.scenario.profile;
    if (!byProfile[p]) {
      byProfile[p] = { ok: 0, fail: 0, unknown: 0, scenarios: [] };
    }
    if (r.profileEvidence.profileSignalOk === true) byProfile[p].ok += 1;
    else if (r.profileEvidence.profileSignalOk === false) byProfile[p].fail += 1;
    else byProfile[p].unknown += 1;
    byProfile[p].scenarios.push({
      id: r.scenario.id,
      intendedRate: r.profileEvidence.intendedRate,
      observedRate: r.profileEvidence.observedRate,
    });
  }
  return {
    counts: { pass, partial, fail, blocked, total: records.length },
    bySubject,
    byProfile,
  };
}
