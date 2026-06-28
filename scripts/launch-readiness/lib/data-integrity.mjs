/**
 * Launch Readiness — Data Integrity audit (MVP, read-only).
 *
 * Analyses run-summary.json only. No Supabase, no Playwright, no row-level DB checks.
 */

import { classifyRunKind } from "./aggregator.mjs";

export const SCHEMA_VERSION = "data-integrity-mvp/v1";

const ENDPOINT_START = "/api/learning/session/start";
const ENDPOINT_ANSWER = "/api/learning/answer";
const ENDPOINT_ANSWER_ALT = "/api/learning/session/answer";
const ENDPOINT_FINISH = "/api/learning/session/finish";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getEndpointCounts(tier1Counts, path) {
  if (!tier1Counts || typeof tier1Counts !== "object") return null;
  if (tier1Counts[path]) return tier1Counts[path];
  return null;
}

function getAnswerCounts(tier1Counts) {
  return (
    getEndpointCounts(tier1Counts, ENDPOINT_ANSWER) ||
    getEndpointCounts(tier1Counts, ENDPOINT_ANSWER_ALT)
  );
}

function endpointOk(counts) {
  if (!counts) return null;
  return num(counts.fail) === 0 && num(counts.ok) > 0;
}

function sumAnswered(sessions) {
  if (!Array.isArray(sessions)) return 0;
  return sessions.reduce((s, sess) => s + num(sess?.answeredCount), 0);
}

function sessionIntegrityStatus({ startFail, answerFail, finishFail, answered, notes }) {
  if (startFail > 0 || answerFail > 0 || finishFail > 0) return "fail";
  if (notes.length > 0) return "warn";
  if (answered === 0 && startFail === 0) return "warn";
  return "pass";
}

function buildApiEndpointSummary(suiteStudents) {
  const summary = {
    [ENDPOINT_START]: { requests: 0, responses: 0, ok: 0, fail: 0 },
    [ENDPOINT_ANSWER]: { requests: 0, responses: 0, ok: 0, fail: 0 },
    [ENDPOINT_FINISH]: { requests: 0, responses: 0, ok: 0, fail: 0 },
  };

  for (const student of suiteStudents) {
    for (const sess of student.sessions || []) {
      const t1 = sess.tier1Counts || {};
      for (const [path, counts] of Object.entries(t1)) {
        const key =
          path === ENDPOINT_ANSWER_ALT
            ? ENDPOINT_ANSWER
            : path in summary
            ? path
            : null;
        if (!key || !counts) continue;
        summary[key].requests += num(counts.requests);
        summary[key].responses += num(counts.responses);
        summary[key].ok += num(counts.ok);
        summary[key].fail += num(counts.fail);
      }
    }
  }

  return summary;
}

function buildCrossStudentSummary(crossMatrix) {
  const rows = Array.isArray(crossMatrix) ? crossMatrix : [];
  let bleedFindingsCount = 0;
  let status = "pass";

  for (const row of rows) {
    const findings = Array.isArray(row?.bleedFindings) ? row.bleedFindings : [];
    if (row?.bleedOk === false || findings.length > 0) {
      bleedFindingsCount += findings.length || 1;
      status = "fail";
    }
  }

  if (rows.length === 0) status = "unknown";

  return {
    checkedCount: rows.length,
    bleedFindingsCount,
    status,
  };
}

function buildStateAdvanceSummary(stateAdvance) {
  if (!stateAdvance || typeof stateAdvance !== "object") {
    return {
      attempted: false,
      shouldRun: false,
      succeeded: false,
      rowsAppended: 0,
      updatedStudents: [],
      status: "unknown",
    };
  }

  const info = stateAdvance.info || {};
  let status = "pass";

  if (stateAdvance.shouldRun === true && stateAdvance.succeeded === false) {
    status = "fail";
  } else if (stateAdvance.shouldRun === false) {
    status = "warn";
  } else if (stateAdvance.succeeded === true) {
    status = "pass";
  } else {
    status = "unknown";
  }

  return {
    attempted: Boolean(stateAdvance.attempted),
    shouldRun: Boolean(stateAdvance.shouldRun),
    succeeded: Boolean(stateAdvance.succeeded),
    rowsAppended: num(info.rowsAppended),
    updatedStudents: Array.isArray(info.updatedStudents) ? info.updatedStudents : [],
    error: stateAdvance.error || null,
    status,
  };
}

/**
 * Build data integrity audit from run-summary (or null when missing).
 */
export function buildDataIntegrityAudit({ date, runSummary, source }) {
  if (!runSummary) {
    return {
      date,
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source,
      runKind: "unknown",
      isFullNightlyRun: false,
      filterReason: null,
      overallStatus: "not_run",
      blockers: [],
      warnings: [
        {
          severity: "P1",
          detail: `לא נמצא run-summary.json לתאריך ${date} — לא ניתן לבדוק שלמות נתונים.`,
          source,
          action: "העתק artifact של nightly או הרץ nightly מחדש.",
        },
      ],
      summary: `אין run-summary — ביקורת שלמות נתונים לא בוצעה.`,
      students: [],
      sessions: [],
      apiEndpointSummary: {},
      crossStudentSummary: { checkedCount: 0, bleedFindingsCount: 0, status: "unknown" },
      stateAdvanceSummary: buildStateAdvanceSummary(null),
    };
  }

  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);
  const topStatus = String(runSummary.status || "unknown").toLowerCase();
  const suite = runSummary.suite || {};
  const suiteCounts = suite.summary?.counts || {};
  const suiteStudents = Array.isArray(suite.students) ? suite.students : [];
  const crossMatrix = Array.isArray(suite.crossStudentMatrix) ? suite.crossStudentMatrix : [];
  const stateAdvance = runSummary.stateAdvance || null;

  const blockers = [];
  const warnings = [];
  const students = [];
  const sessions = [];

  const nightlyIntegrityBaselineProven =
    topStatus === "pass" &&
    isFullNightlyRun &&
    num(suiteCounts.fail) === 0 &&
    num(suiteCounts.partial) === 0 &&
    num(suiteCounts.blocked) === 0 &&
    stateAdvance?.succeeded === true;

  // MVP scope disclaimer — skip when a full nightly pass already proved DB/session integrity.
  if (!nightlyIntegrityBaselineProven) {
    warnings.push({
      severity: "P1",
      detail:
        "ביקורת שלמות נתונים היא MVP בלבד — לא נבדקו שורות Supabase, orphan answers, או duplicate finishes.",
      source,
      action: "שכבת Full Data Integrity (E4+) תוסיף ביקורת DB row-level.",
    });
  }

  if (!isFullNightlyRun) {
    warnings.push({
      severity: "P1",
      detail:
        `מקור הנתונים הוא ריצה מסוננת/ממוקדת (runKind=${runKind}) — ` +
        `נבדקו רק ${suiteStudents.length} תלמיד(ים) מ-suite, לא כל 12. לא מוכיח readiness מלא.`,
      source,
      action: "הרץ nightly מלאה לפני שמכריזים על שלמות נתונים מלאה.",
    });
  }

  // ---- Top-level run status blockers ----
  if (topStatus === "fail" || topStatus === "blocked") {
    blockers.push({
      severity: "P0",
      detail: `run-summary status=${topStatus} — ריצת nightly לא עברה.`,
      source,
      action: "פתח failure-repro.md ובדוק שורש הבעיה.",
    });
  }

  if (topStatus === "partial") {
    warnings.push({
      severity: "P1",
      detail: "run-summary status=partial — חלק מהתלמידים לא סיימו במלואם.",
      source,
      action: "בדוק suite.students עם status=partial.",
    });
  }

  if (num(suiteCounts.fail) > 0) {
    blockers.push({
      severity: "P0",
      detail: `${suiteCounts.fail} תלמיד(ים) במצב fail ב-suite.`,
      source,
      action: "בדוק driverError ו-failure-repro.md.",
    });
  }

  if (num(suiteCounts.blocked) > 0) {
    blockers.push({
      severity: "P0",
      detail: `${suiteCounts.blocked} תלמיד(ים) במצב blocked ב-suite.`,
      source,
      action: "בדוק suite.students[].blocker.",
    });
  }

  if (num(suiteCounts.partial) > 0) {
    warnings.push({
      severity: "P1",
      detail: `${suiteCounts.partial} תלמיד(ים) במצב partial ב-suite.`,
      source,
      action: "ראה earlyExitReason ו-session errors.",
    });
  }

  // ---- Per-student / per-session analysis ----
  for (const student of suiteStudents) {
    const label = student.label;
    if (!label) continue;

    const studentSessions = Array.isArray(student.sessions) ? student.sessions : [];
    const answeredQuestions = sumAnswered(studentSessions);
    const stStatus = String(student.status || "unknown").toLowerCase();

    let apiStartOk = true;
    let apiAnswerOk = true;
    let apiFinishOk = true;
    let failCount = stStatus === "fail" ? 1 : 0;
    let blockedCount = stStatus === "blocked" ? 1 : 0;

    for (const sess of studentSessions) {
      const t1 = sess.tier1Counts || {};
      const start = getEndpointCounts(t1, ENDPOINT_START);
      const answer = getAnswerCounts(t1);
      const finish = getEndpointCounts(t1, ENDPOINT_FINISH);

      const startFail = num(start?.fail);
      const answerFail = num(answer?.fail);
      const finishFail = num(finish?.fail);
      const notes = [];

      if (!start) notes.push("missing session/start tier1Counts");
      if (!answer) notes.push("missing answer tier1Counts");
      if (!finish) notes.push("missing session/finish tier1Counts");

      if (startFail > 0) {
        apiStartOk = false;
        blockers.push({
          severity: "P0",
          detail: `${label} sess${sess.index}: session/start failed (${startFail} failures).`,
          source,
          action: "בדוק /api/learning/session/start.",
        });
      }
      if (answerFail > 0) {
        apiAnswerOk = false;
        blockers.push({
          severity: "P0",
          detail: `${label} sess${sess.index}: answer API failed (${answerFail} failures).`,
          source,
          action: "בדוק /api/learning/answer.",
        });
      }
      if (finishFail > 0) {
        apiFinishOk = false;
        blockers.push({
          severity: "P0",
          detail: `${label} sess${sess.index}: session/finish failed (${finishFail} failures).`,
          source,
          action: "בדוק /api/learning/session/finish.",
        });
      }

      if (start && num(start.ok) === 0 && num(start.requests) > 0) {
        notes.push("session/start requested but zero ok");
        warnings.push({
          severity: "P1",
          detail: `${label} sess${sess.index}: suspicious session/start counts (ok=0, requests=${start.requests}).`,
          source,
          action: "בדוק tier1Counts ידנית.",
        });
      }

      const integrityStatus = sessionIntegrityStatus({
        startFail,
        answerFail,
        finishFail,
        answered: num(sess.answeredCount),
        notes,
      });

      sessions.push({
        studentLabel: label,
        sessionIndex: sess.index ?? null,
        subject: sess.subject || "unknown",
        status: sess.completed === false ? "partial" : sess.error ? "fail" : "pass",
        answeredQuestions: num(sess.answeredCount),
        sessionStartCount: num(start?.requests),
        sessionStartFailures: startFail,
        answerCount: num(answer?.requests),
        answerFailures: answerFail,
        sessionFinishCount: num(finish?.requests),
        sessionFinishFailures: finishFail,
        integrityStatus,
        notes,
      });
    }

    const isStudiedOrPass =
      stStatus === "pass" ||
      stStatus === "partial" ||
      answeredQuestions > 0 ||
      studentSessions.length > 0;

    if (isStudiedOrPass && answeredQuestions === 0) {
      blockers.push({
        severity: "P0",
        detail: `${label}: תלמיד studied/pass עם 0 תשובות — חשד לכשל שמירה.`,
        source,
        action: "בדוק sessions[].answeredCount ו-tier1Counts.",
      });
    }

    if (stStatus === "partial") {
      warnings.push({
        severity: "P1",
        detail: `${label}: תלמיד במצב partial.`,
        source,
        action: "בדוק earlyExitReason ו-driverError.",
      });
    }

    students.push({
      label,
      status: student.status || "unknown",
      sessionsCount: studentSessions.length,
      answeredQuestions,
      apiStartOk,
      apiAnswerOk,
      apiFinishOk,
      failCount,
      blockedCount,
      partialReason: stStatus === "partial" ? student.stepFailed || student.driverError || null : null,
      earlyExitReason:
        Array.isArray(student.earlyExitReasons) && student.earlyExitReasons.length
          ? student.earlyExitReasons.join("; ")
          : null,
      driverError: student.driverError || null,
    });
  }

  const apiEndpointSummary = buildApiEndpointSummary(suiteStudents);
  const crossStudentSummary = buildCrossStudentSummary(crossMatrix);
  const stateAdvanceSummary = buildStateAdvanceSummary(stateAdvance);

  // Cross-student bleed blockers
  if (crossStudentSummary.status === "fail") {
    blockers.push({
      severity: "P0",
      detail: `cross-student bleed: ${crossStudentSummary.bleedFindingsCount} finding(s) in crossStudentMatrix.`,
      source,
      action: "קריטי לפרטיות — עצור ובדוק bleedFindings.",
    });
  }

  // stateAdvance blockers
  if (stateAdvanceSummary.shouldRun && !stateAdvanceSummary.succeeded) {
    blockers.push({
      severity: "P0",
      detail: `stateAdvance נכשל: ${stateAdvanceSummary.error || "(ללא פרטים)"}`,
      source,
      action: "בדוק state.json persistence.",
    });
  }

  if (stateAdvanceSummary.shouldRun === false && stateAdvanceSummary.attempted) {
    warnings.push({
      severity: "P1",
      detail: "stateAdvance.shouldRun=false — state advance לא רץ (ייתכן dry-run או preflight).",
      source,
      action: "וודא שזו התנהגות צפויה לריצה זו.",
    });
  }

  // ---- overallStatus ----
  let overallStatus = "pass";
  if (students.length === 0 && !runSummary) {
    overallStatus = "not_run";
  } else if (blockers.length > 0) {
    overallStatus = "fail";
  } else if (
    warnings.length > 0 ||
    !isFullNightlyRun ||
    topStatus === "partial" ||
    crossStudentSummary.status === "warn" ||
    stateAdvanceSummary.status === "warn"
  ) {
    overallStatus = "warn";
  }

  const checkedLabels = students.map((s) => s.label).join(", ");
  const totalSessions = sessions.length;
  const cleanSessions = sessions.filter((s) => s.integrityStatus === "pass").length;

  const summary = isFullNightlyRun
    ? `שלמות נתונים MVP: ${students.length} תלמידים, ${totalSessions} sessions (${cleanSessions} pass), ` +
      `API start/answer/finish נקיים, cross-student=${crossStudentSummary.status}, stateAdvance=${stateAdvanceSummary.status}.`
    : `ריצה מסוננת — נבדקו ${students.length} תלמיד(ים) בלבד (${checkedLabels}), ` +
      `${totalSessions} sessions. לא מוכיח readiness מלא. overallStatus=${overallStatus}.`;

  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source,
    runKind,
    isFullNightlyRun,
    filterReason,
    overallStatus,
    blockers,
    warnings,
    summary,
    students,
    sessions,
    apiEndpointSummary,
    crossStudentSummary,
    stateAdvanceSummary,
  };
}

/** Render data-integrity-audit.md */
export function buildDataIntegrityMarkdown(report) {
  const lines = [];
  lines.push(`# Data Integrity Audit (MVP) — ${report.date}`);
  lines.push("");
  lines.push(`> Schema: \`${report.schemaVersion}\` · נוצר ב-${report.generatedAt}`);
  lines.push(`> מקור: \`${report.source || "—"}\``);
  lines.push("");
  lines.push(`## סטטוס כולל: \`${report.overallStatus}\``);
  lines.push("");
  lines.push(`**סיכום:** ${report.summary}`);
  lines.push("");
  lines.push(
    `**סוג ריצה:** \`${report.runKind}\` · \`isFullNightlyRun = ${report.isFullNightlyRun}\``
  );
  if (report.filterReason) lines.push(`**סיבת סינון:** ${report.filterReason}`);
  if (!report.isFullNightlyRun) {
    lines.push("");
    lines.push(
      "> ⚠️ ריצה מסוננת — **לא** נבדקו כל 12 התלמידים. אין להכריז על readiness מלא."
    );
  }
  lines.push("");
  lines.push(
    "> MVP בלבד: לא נבדקו שורות Supabase, orphan answers, duplicate finishes."
  );
  lines.push("");

  lines.push(`## חוסמים (P0) — ${report.blockers.length}`);
  if (report.blockers.length === 0) lines.push("אין.");
  else for (const b of report.blockers) lines.push(`- ${b.detail}`);
  lines.push("");

  lines.push(`## אזהרות (P1) — ${report.warnings.length}`);
  if (report.warnings.length === 0) lines.push("אין.");
  else for (const w of report.warnings) lines.push(`- ${w.detail}`);
  lines.push("");

  lines.push(`## API Endpoint Summary`);
  lines.push("");
  lines.push("| endpoint | requests | ok | fail |");
  lines.push("|----------|----------|-----|------|");
  for (const [ep, agg] of Object.entries(report.apiEndpointSummary || {})) {
    lines.push(`| ${ep} | ${agg.requests} | ${agg.ok} | ${agg.fail} |`);
  }
  lines.push("");

  lines.push(`## Cross-Student Summary`);
  lines.push("");
  const cs = report.crossStudentSummary || {};
  lines.push(`- checked: ${cs.checkedCount ?? 0}`);
  lines.push(`- bleed findings: ${cs.bleedFindingsCount ?? 0}`);
  lines.push(`- status: \`${cs.status ?? "unknown"}\``);
  lines.push("");

  lines.push(`## State Advance Summary`);
  lines.push("");
  const sa = report.stateAdvanceSummary || {};
  lines.push(`- shouldRun: ${sa.shouldRun}`);
  lines.push(`- succeeded: ${sa.succeeded}`);
  lines.push(`- rowsAppended: ${sa.rowsAppended ?? 0}`);
  lines.push(`- updatedStudents: ${(sa.updatedStudents || []).join(", ") || "—"}`);
  lines.push(`- status: \`${sa.status ?? "unknown"}\``);
  lines.push("");

  lines.push(`## תלמידים (${report.students.length})`);
  lines.push("");
  lines.push("| label | status | sessions | answered | start | answer | finish |");
  lines.push("|-------|--------|----------|----------|-------|--------|--------|");
  for (const s of report.students) {
    lines.push(
      `| ${s.label} | ${s.status} | ${s.sessionsCount} | ${s.answeredQuestions} | ${s.apiStartOk ? "ok" : "fail"} | ${s.apiAnswerOk ? "ok" : "fail"} | ${s.apiFinishOk ? "ok" : "fail"} |`
    );
  }
  lines.push("");

  lines.push(`## Sessions (${report.sessions.length})`);
  lines.push("");
  lines.push("| student | idx | subject | answered | integrity | start fail | answer fail | finish fail |");
  lines.push("|---------|-----|---------|----------|-----------|------------|-------------|-------------|");
  for (const s of report.sessions) {
    lines.push(
      `| ${s.studentLabel} | ${s.sessionIndex ?? "—"} | ${s.subject} | ${s.answeredQuestions} | ${s.integrityStatus} | ${s.sessionStartFailures} | ${s.answerFailures} | ${s.sessionFinishFailures} |`
    );
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("> Read-only aggregation מ-run-summary.json. Full DB audit — E4+.");
  lines.push("");

  return lines.join("\n");
}
