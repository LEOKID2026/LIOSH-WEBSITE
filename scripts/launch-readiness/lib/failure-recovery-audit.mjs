/**
 * Launch Readiness — Failure Recovery audit (E9C MVP).
 *
 * Reads existing run artifacts/logs only. No failure injection, no runner, no Supabase.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = "failure-recovery-audit/v1";

/** Patterns scanned in log text (conservative). */
export const LOG_PATTERNS = [
  { id: "timeout", re: /timeout\s+\d+ms\s+exceeded/i, eventType: "timeout" },
  { id: "mcq-buttons-not-ready", re: /mcq-buttons-not-ready/i, eventType: "driver_error" },
  { id: "early-exit", re: /stopping the question loop early|early exit|earlyExitReason/i, eventType: "early_exit" },
  { id: "fallback", re: /fallback|DOM fallback|clickMcqRobustly|probeWithLabelMatchRetry/i, eventType: "fallback_click" },
  { id: "retry", re: /\bretry\b/i, eventType: "recovery_succeeded" },
  { id: "session-finish-fail", re: /session\/finish.*fail|sessionFinishFailures?\s*[>:=]\s*[1-9]/i, eventType: "session_finish_failure" },
  { id: "api-failure", re: /\/api\/learning\/(start|answer|finish).*fail|"fail"\s*:\s*[1-9]/i, eventType: "api_failure" },
  { id: "stateAdvance-fail", re: /stateAdvance.*fail|state-advance.*error/i, eventType: "stateAdvance_failure" },
  { id: "partial-verdict", re: /verdict=partial|status=partial|lastRunStatus=partial/i, eventType: "partial_student" },
  { id: "blocked", re: /\bblocked=[1-9]|\bstatus=blocked\b|\bblockedCount\s*[>:=]\s*[1-9]/i, eventType: "unknown_failure_pattern" },
  { id: "exception", re: /exception|uncaught/i, eventType: "console_page_error" },
  { id: "stateAdvance-ok", re: /stateAdvanceShouldRun=true|state\.json updated atomically|stateAdvance.*succeeded/i, eventType: "recovery_succeeded" },
];

/** Known issues catalog parsed from KNOWN-ISSUES.md headings. */
export const KNOWN_ISSUE_PATTERNS = [
  {
    issueId: "english-driver-typing-mcq-timeout",
    title: "English driver — typing questions not handled; mcq-buttons-not-ready timeout",
    patterns: [/mcq-buttons-not-ready/i, /english-master.*typing/i],
    status: "resolved",
    resolvedDate: "2026-05-23",
    affectedStudents: ["AAA7"],
    notes: "RESOLVED in QA driver only — not a product bug. Surfaced in 2026-05-23 nightly.",
  },
  {
    issueId: "english-driver-accuracy-mismatch",
    title: "English driver — observed-vs-intended accuracy mismatch",
    patterns: [/observed-vs-intended/i],
    status: "resolved",
    resolvedDate: "2026-05-22",
    affectedStudents: [],
    notes: "RESOLVED 2026-05-22 — MCQ probe fallback.",
  },
];

function readTextSafe(absPath) {
  if (!existsSync(absPath)) return null;
  try {
    return readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

function normalizeStudents(runSummary) {
  if (!runSummary) return [];
  const raw = runSummary.suite?.students ?? runSummary.students;
  if (Array.isArray(raw)) return raw.map((s) => ({ label: s.label || s.id, ...s }));
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([label, data]) => ({ label, ...data }));
  }
  return [];
}

function summarizeTier1(session) {
  const counts = session?.tier1Counts || {};
  let ok = 0;
  let fail = 0;
  for (const v of Object.values(counts)) {
    if (v?.fail > 0) fail += 1;
    else if (v?.ok > 0) ok += 1;
  }
  return { ok, fail, counts };
}

function extractApiFailuresFromTier1(tier1) {
  const failures = [];
  for (const [endpoint, v] of Object.entries(tier1.counts || {})) {
    if (v?.fail > 0) failures.push({ endpoint, fail: v.fail, ok: v.ok });
  }
  return failures;
}

function matchKnownIssues({ logText, students, runDate }) {
  const matched = [];
  const haystack = `${logText || ""}\n${JSON.stringify(students)}`;

  for (const issue of KNOWN_ISSUE_PATTERNS) {
    const hit = issue.patterns.some((re) => re.test(haystack));
    if (!hit) continue;

    let affectedStudent = null;
    for (const label of issue.affectedStudents || []) {
      if (students.some((s) => s.label === label)) affectedStudent = label;
    }
    if (!affectedStudent) {
      for (const s of students) {
        const sessText = JSON.stringify(s.sessions || []);
        if (issue.patterns.some((re) => re.test(sessText))) {
          affectedStudent = s.label;
          break;
        }
      }
    }

    matched.push({
      issueId: issue.issueId,
      title: issue.title,
      matchedPattern: issue.patterns.map((re) => re.source).join("|"),
      affectedStudent,
      status: issue.status,
      notes: issue.notes,
      resolvedDate: issue.resolvedDate || null,
      runDate,
    });
  }
  return matched;
}

function scanLogs(logDir) {
  const events = [];
  const logFiles = [];
  if (!existsSync(logDir)) return { events, logFiles, logText: "" };

  try {
    for (const name of readdirSync(logDir)) {
      if (!/\.(log|txt|md)$/i.test(name)) continue;
      const abs = path.join(logDir, name);
      const text = readTextSafe(abs);
      if (text) {
        logFiles.push(name);
        for (const pat of LOG_PATTERNS) {
          if (pat.re.test(text)) {
            const lines = text.split(/\n/).filter((l) => pat.re.test(l));
            events.push({
              type: pat.eventType,
              source: `logs/${name}`,
              pattern: pat.id,
              lineCount: lines.length,
              sample: lines.slice(0, 2).join(" | ").slice(0, 300),
              recovered: pat.eventType === "recovery_succeeded" || pat.id === "stateAdvance-ok",
            });
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  const logText = logFiles
    .map((name) => readTextSafe(path.join(logDir, name)))
    .filter(Boolean)
    .join("\n");

  return { events, logFiles, logText };
}

function pickReason(...candidates) {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() && c !== "[object Object]") return c;
  }
  return null;
}

function buildStudentRecords(runSummary, dataIntegrity) {
  const students = normalizeStudents(runSummary);
  const diByLabel = new Map(
    (dataIntegrity?.students || []).map((s) => [s.label, s])
  );

  return students.map((s) => {
    const di = diByLabel.get(s.label) || {};
    const sessions = Array.isArray(s.sessions) ? s.sessions : [];
    const sessionStatuses = sessions.map((sess) => sess.status || "unknown");
    const earlyExitReasons = sessions
      .map((sess) => sess.earlyExitReason)
      .filter(Boolean);
    const driverErrors = sessions
      .map((sess) => sess.driverError)
      .filter(Boolean);

    let apiFailures = [];
    let sessionFinishOk = true;
    for (const sess of sessions) {
      const tier1 = summarizeTier1(sess);
      apiFailures = apiFailures.concat(extractApiFailuresFromTier1(tier1));
      const finish = sess.tier1Counts?.["/api/learning/session/finish"];
      if (finish?.fail > 0) sessionFinishOk = false;
    }

    const status = s.status || di.status || "unknown";
    const partialReason = pickReason(s.partialReason, di.partialReason);
    const earlyExitReason = pickReason(
      ...earlyExitReasons,
      s.earlyExitReason,
      di.earlyExitReason
    );
    const driverError = pickReason(...driverErrors, s.driverError, di.driverError);

    const notes = [];
    let recovered = "unknown";
    let recoveryStatus = "unknown";

    if (status === "pass" && !earlyExitReason && !driverError) {
      recovered = true;
      recoveryStatus = "pass";
      notes.push("All sessions completed without early exit.");
    } else if (status === "partial") {
      if (sessionFinishOk && apiFailures.length === 0) {
        recovered = true;
        recoveryStatus = "warn";
        notes.push("Partial session but session/finish and APIs clean — likely QA driver early exit.");
      } else if (!sessionFinishOk || apiFailures.length > 0) {
        recovered = false;
        recoveryStatus = "fail";
        notes.push("Partial with API or session/finish failure.");
      }
    } else if (status === "fail" || status === "blocked") {
      recovered = false;
      recoveryStatus = "fail";
    }

    if (earlyExitReason && earlyExitReason.includes("mcq-buttons-not-ready")) {
      notes.push("Matches known resolved English driver issue (KNOWN-ISSUES.md RESOLVED 2026-05-23).");
      if (sessionFinishOk) {
        recovered = true;
        recoveryStatus = "warn";
      }
    }

    return {
      label: s.label,
      status,
      partialReason,
      driverError,
      earlyExitReason,
      apiFailures,
      sessionFinishOk: di.apiFinishOk !== false && sessionFinishOk,
      sessionCount: sessions.length,
      sessionStatuses,
      recovered,
      recoveryStatus,
      notes,
    };
  });
}

function collectRunEvents(runSummary, students, logScan) {
  const events = [...(logScan.events || [])];

  if (runSummary?.status === "partial") {
    events.push({
      type: "partial_student",
      source: "run-summary.json",
      pattern: "top-level status=partial",
      sample: `suite.verdict=${runSummary.suite?.summary?.verdict || runSummary.status}`,
      recovered: false,
    });
  }

  const counts = runSummary?.suite?.summary?.counts;
  if (counts?.partial > 0) {
    events.push({
      type: "partial_student",
      source: "run-summary.json",
      pattern: "suite.summary.counts.partial",
      sample: `pass=${counts.pass} partial=${counts.partial} fail=${counts.fail} blocked=${counts.blocked}`,
      recovered: counts.fail === 0 && counts.blocked === 0,
    });
  }

  if (counts?.fail > 0) {
    events.push({
      type: "unknown_failure_pattern",
      source: "run-summary.json",
      pattern: "suite.summary.counts.fail",
      sample: `fail=${counts.fail}`,
      recovered: false,
    });
  }

  if (counts?.blocked > 0) {
    events.push({
      type: "unknown_failure_pattern",
      source: "run-summary.json",
      pattern: "suite.summary.counts.blocked",
      sample: `blocked=${counts.blocked}`,
      recovered: false,
    });
  }

  for (const s of students) {
    if (s.status === "partial") {
      events.push({
        type: "partial_student",
        source: "run-summary.json",
        pattern: `student ${s.label} status=partial`,
        sample: s.earlyExitReason || s.driverError || s.partialReason || "—",
        recovered: s.recovered === true,
      });
    }
    if (s.earlyExitReason) {
      events.push({
        type: "early_exit",
        source: "run-summary.json",
        pattern: `student ${s.label}`,
        sample: String(s.earlyExitReason).slice(0, 200),
        recovered: s.sessionFinishOk,
      });
    }
    if (s.driverError) {
      events.push({
        type: "driver_error",
        source: "run-summary.json",
        pattern: `student ${s.label}`,
        sample: String(s.driverError).slice(0, 200),
        recovered: false,
      });
    }
    if (s.apiFailures?.length) {
      for (const af of s.apiFailures) {
        events.push({
          type: "api_failure",
          source: "run-summary.json",
          pattern: af.endpoint,
          sample: `fail=${af.fail}`,
          recovered: false,
        });
      }
    }
    if (s.recovered === true && s.status === "partial") {
      events.push({
        type: "recovery_succeeded",
        source: "run-summary.json",
        pattern: `student ${s.label} partial-but-clean-finish`,
        sample: "session/finish ok, API tier1 clean",
        recovered: true,
      });
    }
  }

  const sa = runSummary?.stateAdvance;
  if (sa?.shouldRun && sa?.succeeded === false) {
    events.push({
      type: "stateAdvance_failure",
      source: "run-summary.json",
      pattern: "stateAdvance.shouldRun=true succeeded=false",
      sample: sa.error || "—",
      recovered: false,
    });
  } else if (sa?.succeeded) {
    events.push({
      type: "recovery_succeeded",
      source: "run-summary.json",
      pattern: "stateAdvance succeeded",
      sample: `rowsAppended=${sa.info?.rowsAppended ?? "?"}`,
      recovered: true,
    });
  }

  return events;
}

function dedupeEvents(events) {
  const seen = new Set();
  return events.filter((e) => {
    const key = `${e.type}|${e.source}|${e.pattern}|${(e.sample || "").slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildBlockers({ students, runSummary, dataIntegrity, knownIssues, events }) {
  const blockers = [];

  for (const s of students) {
    if (s.status === "fail" || s.status === "blocked") {
      blockers.push({
        severity: "P0",
        detail: `${s.label}: student status=${s.status}`,
        action: "Investigate run-summary and logs before launch.",
      });
    }
    if (!s.sessionFinishOk) {
      blockers.push({
        severity: "P0",
        detail: `${s.label}: session/finish failure detected`,
        action: "Verify session/finish tier1 and logs.",
      });
    }
    if (s.apiFailures?.length) {
      blockers.push({
        severity: "P0",
        detail: `${s.label}: API failures — ${s.apiFailures.map((a) => a.endpoint).join(", ")}`,
        action: "Check tier1Counts in run-summary.",
      });
    }
  }

  const sa = dataIntegrity?.stateAdvanceSummary || runSummary?.stateAdvance;
  if (sa?.shouldRun && sa?.succeeded === false) {
    blockers.push({
      severity: "P0",
      detail: "stateAdvance shouldRun=true but failed",
      action: "Check stateAdvance.error in run-summary.",
    });
  }

  const cross = dataIntegrity?.crossStudentSummary;
  if (cross?.status === "fail" || (cross?.bleedFindingsCount ?? 0) > 0) {
    blockers.push({
      severity: "P0",
      detail: `Cross-student bleed: ${cross.bleedFindingsCount ?? "?"} finding(s)`,
      action: "Review data-integrity-audit crossStudentSummary.",
    });
  }

  const apiSummary = dataIntegrity?.apiEndpointSummary;
  if (apiSummary) {
    for (const [endpoint, v] of Object.entries(apiSummary)) {
      if (v?.fail > 0) {
        blockers.push({
          severity: "P0",
          detail: `${endpoint}: ${v.fail} failure(s) in run`,
          action: "Review apiEndpointSummary in data-integrity-audit.",
        });
      }
    }
  }

  // Unrecovered driver error affecting multiple students
  const unrecoveredDriver = students.filter(
    (s) => s.driverError && s.recovered !== true && s.recoveryStatus === "fail"
  );
  if (unrecoveredDriver.length > 1) {
    blockers.push({
      severity: "P0",
      detail: `Unrecovered driver errors on ${unrecoveredDriver.length} students`,
      action: "Review driverError fields in run-summary.",
    });
  }

  // Repeated timeout preventing answering — only if multiple students fail APIs
  const timeoutStudents = students.filter(
    (s) =>
      String(s.earlyExitReason || "").includes("Timeout") &&
      !s.sessionFinishOk
  );
  if (timeoutStudents.length > 1) {
    blockers.push({
      severity: "P0",
      detail: "Repeated timeout pattern preventing clean session finish",
      action: "Review logs for timeout clusters.",
    });
  }

  // Do NOT block on resolved known issues alone
  const openKnown = knownIssues.filter((k) => k.status === "open");
  for (const k of openKnown) {
    const student = students.find((s) => s.label === k.affectedStudent);
    if (student?.recoveryStatus === "fail") {
      blockers.push({
        severity: "P0",
        detail: `Open known issue ${k.issueId} with unrecovered failure on ${k.affectedStudent}`,
        action: "See KNOWN-ISSUES.md.",
      });
    }
  }

  return blockers;
}

function buildWarnings({
  students,
  runSummary,
  dataIntegrity,
  knownIssues,
  hasFailureRepro,
  hasLogs,
  events,
}) {
  const warnings = [
    {
      severity: "P1",
      detail:
        "Failure Recovery MVP — לא בוצעה הזרקת כשלים (refresh/network-drop/double-click); סריקת artifacts/logs בלבד.",
      action: "אימות מלא דורש E9-Full injection tests בעתיד.",
    },
  ];

  if (!hasLogs) {
    warnings.push({
      severity: "P1",
      detail: "Missing logs/ directory or log files for this date.",
      action: "Ensure nightly writes logs/phase-d2-<date>.log.",
    });
  }

  if (!hasFailureRepro) {
    warnings.push({
      severity: "P1",
      detail: "failure-repro.md not found — limited repro context.",
      action: "Nightly may generate failure-repro.md on partial runs.",
    });
  }

  const partialStudents = students.filter((s) => s.status === "partial");
  if (partialStudents.length > 0) {
    warnings.push({
      severity: "P1",
      detail: `${partialStudents.length} partial student(s): ${partialStudents.map((s) => s.label).join(", ")}`,
      action: "Review earlyExitReason — warn only if session/finish clean.",
    });
  }

  for (const s of students) {
    if (s.earlyExitReason) {
      warnings.push({
        severity: "P1",
        detail: `${s.label}: early exit — ${String(s.earlyExitReason).slice(0, 120)}`,
        action: s.sessionFinishOk ? "Session finished cleanly — QA driver limitation." : "Investigate.",
      });
    }
    if (events.some((e) => e.type === "fallback_click" && e.source?.includes("log"))) {
      /* per-student fallback tracked via events */
    }
  }

  const fallbackEvents = events.filter((e) => e.type === "fallback_click");
  if (fallbackEvents.length > 0) {
    warnings.push({
      severity: "P1",
      detail: `Driver fallback/DOM fallback patterns in logs (${fallbackEvents.length} hit(s)).`,
      action: "Review if recovered — warn only unless data corruption.",
    });
  }

  const timeoutEvents = events.filter((e) => e.type === "timeout");
  if (timeoutEvents.length > 0) {
    const allRecovered = partialStudents.every((s) => s.sessionFinishOk);
    warnings.push({
      severity: "P1",
      detail: `Timeout pattern(s) in logs (${timeoutEvents.length}) — recovered=${allRecovered}`,
      action: "Check KNOWN-ISSUES for resolved driver issues.",
    });
  }

  for (const k of knownIssues.filter((ki) => ki.status === "resolved")) {
    warnings.push({
      severity: "P1",
      detail: `Known resolved issue matched: ${k.title} (${k.affectedStudent || "—"})`,
      action: "Not a current product blocker — artifact from pre-fix nightly.",
    });
  }

  if (runSummary?.status === "partial") {
    warnings.push({
      severity: "P1",
      detail: `run-summary top-level status=partial (verdict=${runSummary.suite?.summary?.verdict || "partial"})`,
      action: "See suite.summary.counts — 0 fail/block expected for MVP warn-only.",
    });
  }

  return warnings;
}

function classifyAaa7(students, knownIssues) {
  const aaa7 = students.find((s) => s.label === "AAA7");
  if (!aaa7) {
    return {
      classification: "not_in_run",
      notes: "AAA7 not in suite.students for this date.",
    };
  }

  const knownMatch = knownIssues.find(
    (k) => k.issueId === "english-driver-typing-mcq-timeout" && k.affectedStudent === "AAA7"
  );

  if (aaa7.status === "partial" && aaa7.sessionFinishOk && knownMatch?.status === "resolved") {
    return {
      classification: "old_resolved_artifact_warning",
      notes:
        "AAA7 partial from mcq-buttons-not-ready on English q4 — known QA driver issue RESOLVED 2026-05-23. session/finish ok, APIs clean. Not an active product bug.",
    };
  }

  if (aaa7.status === "fail" || aaa7.status === "blocked" || !aaa7.sessionFinishOk) {
    return {
      classification: "active_failure",
      notes: "AAA7 shows unrecovered failure — investigate as potential product/driver blocker.",
    };
  }

  return {
    classification: "clean",
    notes: "AAA7 passed without partial/early-exit in this run.",
  };
}

/**
 * Build failure recovery audit from existing artifacts.
 */
export function buildFailureRecoveryAudit({
  date,
  repoRoot,
  runSummary = null,
  dataIntegrity = null,
  coverageSummary = null,
  knownIssuesDoc = null,
}) {
  const sourceDir = path.join("reports", "virtual-student-daily", date);
  const dailyAbs = path.join(repoRoot, sourceDir);
  const launchDir = path.join(repoRoot, "reports", "launch-readiness", date);

  if (!runSummary) {
    return {
      date,
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      sourceDir,
      overallStatus: "not_run",
      blockers: [],
      warnings: [
        {
          severity: "P1",
          detail: `No run-summary.json for ${date}`,
          action: "Run nightly or pick a date with artifacts.",
        },
      ],
      events: [],
      students: [],
      knownIssues: [],
      stateAdvanceSummary: null,
      apiFailureSummary: null,
      aaa7Classification: null,
      failureInjectionPerformed: false,
      summary: `Failure recovery audit not_run — missing run-summary for ${date}.`,
    };
  }

  const logDir = path.join(dailyAbs, "logs");
  const failureReproPath = path.join(dailyAbs, "failure-repro.md");
  const hasLogs = existsSync(logDir) && readdirSync(logDir).some((f) => /\.(log|txt)$/i.test(f));
  const hasFailureRepro = existsSync(failureReproPath);

  const logScan = scanLogs(logDir);
  const students = buildStudentRecords(runSummary, dataIntegrity);
  let events = collectRunEvents(runSummary, students, logScan);
  events = dedupeEvents(events);

  const knownIssues = matchKnownIssues({
    logText: logScan.logText,
    students,
    runDate: date,
  });

  for (const ki of knownIssues) {
    events.push({
      type: "known_issue_matched",
      source: "scripts/virtual-student-qa/KNOWN-ISSUES.md",
      pattern: ki.issueId,
      sample: ki.title,
      recovered: ki.status === "resolved",
    });
  }
  events = dedupeEvents(events);

  const stateAdvanceSummary =
    dataIntegrity?.stateAdvanceSummary ||
    (runSummary.stateAdvance
      ? {
          attempted: runSummary.stateAdvance.attempted,
          shouldRun: runSummary.stateAdvance.shouldRun,
          succeeded: runSummary.stateAdvance.succeeded,
          rowsAppended: runSummary.stateAdvance.info?.rowsAppended,
          updatedStudents: runSummary.stateAdvance.info?.updatedStudents,
          error: runSummary.stateAdvance.error,
          status: runSummary.stateAdvance.succeeded ? "pass" : "fail",
        }
      : null);

  const apiFailureSummary =
    dataIntegrity?.apiEndpointSummary ||
    (() => {
      const agg = {};
      for (const s of students) {
        for (const sess of normalizeStudents(runSummary).flatMap((st) => st.sessions || [])) {
          for (const [ep, v] of Object.entries(sess.tier1Counts || {})) {
            if (!agg[ep]) agg[ep] = { requests: 0, ok: 0, fail: 0 };
            agg[ep].requests += v.requests || 0;
            agg[ep].ok += v.ok || 0;
            agg[ep].fail += v.fail || 0;
          }
        }
      }
      return Object.keys(agg).length ? agg : null;
    })();

  const blockers = buildBlockers({
    students,
    runSummary,
    dataIntegrity,
    knownIssues,
    events,
  });

  const warnings = buildWarnings({
    students,
    runSummary,
    dataIntegrity,
    knownIssues,
    hasFailureRepro,
    hasLogs,
    events,
  });

  const aaa7Classification = classifyAaa7(students, knownIssues);

  let overallStatus = "not_run";
  if (blockers.length > 0) {
    overallStatus = "fail";
  } else if (
    students.length > 0 &&
    students.every((s) => s.recoveryStatus === "pass") &&
    runSummary.status === "pass"
  ) {
    overallStatus = "pass";
  } else if (students.length > 0 || events.length > 0) {
    overallStatus = "warn";
  }

  const partialCount = students.filter((s) => s.status === "partial").length;
  const failCount = students.filter((s) => s.status === "fail" || s.status === "blocked").length;
  const apiFailTotal = apiFailureSummary
    ? Object.values(apiFailureSummary).reduce((n, v) => n + (v.fail || 0), 0)
    : 0;

  const summary =
    blockers.length > 0
      ? `Failure recovery: ${blockers.length} blocker(s), ${events.length} events — overallStatus=fail.`
      : `Failure recovery MVP: ${students.length} students, partial=${partialCount}, fail/blocked=${failCount}, ` +
        `API fail=${apiFailTotal}, stateAdvance=${stateAdvanceSummary?.status || "unknown"}, ` +
        `${events.length} events — overallStatus=${overallStatus}. No failure injection performed.`;

  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceDir,
    overallStatus,
    blockers,
    warnings,
    events,
    students,
    knownIssues,
    stateAdvanceSummary,
    apiFailureSummary,
    aaa7Classification,
    failureInjectionPerformed: false,
    runSummaryStatus: runSummary.status,
    suiteCounts: runSummary.suite?.summary?.counts || null,
    coverageSummaryStatus: coverageSummary?.overallStatus || null,
    inputsFound: {
      runSummary: true,
      failureRepro: hasFailureRepro,
      logs: hasLogs,
      logFiles: logScan.logFiles,
      dataIntegrity: Boolean(dataIntegrity),
      coverageSummary: Boolean(coverageSummary),
      knownIssuesDoc: Boolean(knownIssuesDoc),
    },
    summary,
  };
}

export function buildFailureRecoveryMarkdown(report) {
  const lines = [];
  lines.push(`# Failure Recovery Audit (E9C MVP) — ${report.date}`);
  lines.push("");
  lines.push(`- **overallStatus:** ${report.overallStatus}`);
  lines.push(`- **failureInjectionPerformed:** ${report.failureInjectionPerformed}`);
  lines.push(`- **run-summary status:** ${report.runSummaryStatus || "—"}`);
  lines.push(`- **events:** ${report.events?.length ?? 0}`);
  lines.push(`- **blockers:** ${report.blockers?.length ?? 0}`);
  lines.push(`- **warnings:** ${report.warnings?.length ?? 0}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(report.summary || "—");
  lines.push("");

  if (report.aaa7Classification) {
    lines.push("## AAA7 classification");
    lines.push(`- **classification:** ${report.aaa7Classification.classification}`);
    lines.push(`- ${report.aaa7Classification.notes}`);
    lines.push("");
  }

  if (report.stateAdvanceSummary) {
    lines.push("## stateAdvance");
    lines.push(`- status: ${report.stateAdvanceSummary.status}`);
    lines.push(`- succeeded: ${report.stateAdvanceSummary.succeeded}`);
    lines.push(`- rowsAppended: ${report.stateAdvanceSummary.rowsAppended ?? "—"}`);
    lines.push("");
  }

  if (report.apiFailureSummary) {
    lines.push("## API summary");
    for (const [ep, v] of Object.entries(report.apiFailureSummary)) {
      lines.push(`- ${ep}: ok=${v.ok} fail=${v.fail}`);
    }
    lines.push("");
  }

  lines.push("## Students");
  for (const s of report.students || []) {
    lines.push(
      `### ${s.label} — ${s.status} (recovery: ${s.recoveryStatus}, recovered: ${s.recovered})`
    );
    if (s.earlyExitReason) lines.push(`- earlyExit: ${s.earlyExitReason}`);
    if (s.driverError) lines.push(`- driverError: ${s.driverError}`);
    lines.push(`- sessionFinishOk: ${s.sessionFinishOk}`);
    for (const n of s.notes || []) lines.push(`- ${n}`);
    lines.push("");
  }

  lines.push("## Events");
  for (const e of report.events || []) {
    lines.push(`- **${e.type}** (${e.source}) recovered=${e.recovered} — ${(e.sample || e.pattern || "").slice(0, 120)}`);
  }
  lines.push("");

  lines.push("## Known issues matched");
  for (const k of report.knownIssues || []) {
    lines.push(`- **${k.issueId}** [${k.status}] ${k.affectedStudent || "—"} — ${k.title}`);
  }
  lines.push("");
  lines.push("## Limitations");
  lines.push("- לא בוצעה הזרקת כשלים (refresh / network / double-click)");
  lines.push("- לא כל edge cases מכוסים");
  lines.push("- resolved known issues אינם blockers");

  return lines.join("\n");
}
