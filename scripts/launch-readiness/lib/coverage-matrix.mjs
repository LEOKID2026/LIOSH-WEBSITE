/**
 * Launch Readiness — Coverage Matrix (pure logic, read-only).
 *
 * Builds a coverage report from a nightly run-summary.json blob.
 * Never writes to product or Supabase.
 */

import { classifyRunKind } from "./aggregator.mjs";

export const SCHEMA_VERSION = "launch-coverage/v1";

export const ALL_STUDENT_LABELS = [
  "AAA1", "AAA2", "AAA3", "AAA4", "AAA5", "AAA6",
  "AAA7", "AAA8", "AAA9", "AAA10", "AAA11", "AAA12",
];

export const ALL_GRADES = [1, 2, 3, 4, 5, 6];

export const CORE_SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet-geography",
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function sessionAnsweredCount(session) {
  if (!session || typeof session !== "object") return 0;
  if (Number.isFinite(session.answeredCount)) return num(session.answeredCount);
  if (Number.isFinite(session.answeredQuestions)) return num(session.answeredQuestions);
  return 0;
}

function sessionStatus(session, studentStatus) {
  if (session?.error) return "fail";
  if (session?.earlyExitReason) return "partial";
  if (session?.completed === false) return "partial";
  const st = String(studentStatus || session?.status || "unknown").toLowerCase();
  if (st === "pass" || st === "partial" || st === "fail" || st === "blocked") return st;
  return session?.completed === true ? "pass" : "unknown";
}

function extractAnswerFlows(session) {
  if (Array.isArray(session?.answerFlows)) return session.answerFlows;
  if (Array.isArray(session?.answerFlow)) return session.answerFlow;
  if (session?.answerFlow && typeof session.answerFlow === "object") return [session.answerFlow];
  return null;
}

function extractQuestionShapes(session) {
  if (Array.isArray(session?.questionShapes)) return session.questionShapes;
  if (session?.questionShape) return [session.questionShape];
  return null;
}

function countProbeFailures(student) {
  let count = 0;
  for (const session of student?.sessions || []) {
    if (Array.isArray(session?.probeFailures)) count += session.probeFailures.length;
    else if (Number.isFinite(session?.probeFailureCount)) count += num(session.probeFailureCount);
  }
  if (Number.isFinite(student?.probeFailureCount)) return num(student.probeFailureCount);
  return count;
}

function collectEarlyExitReasons(student) {
  const reasons = [];
  for (const session of student?.sessions || []) {
    if (session?.earlyExitReason) reasons.push(session.earlyExitReason);
  }
  if (Array.isArray(student?.earlyExitReasons)) {
    for (const r of student.earlyExitReasons) if (r) reasons.push(r);
  }
  return uniq(reasons);
}

/**
 * Build the full coverage report object from a run-summary (or null when missing).
 *
 * @param {{ date: string, runSummary: object|null, source: string|null }} params
 */
export function buildCoverageReport({ date, runSummary, source }) {
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
          detail: `לא נמצא run-summary.json לתאריך ${date} — לא ניתן לחשב כיסוי.`,
          source,
          action: "הרץ nightly או העתק artifact ל-reports/virtual-student-daily/<date>/.",
        },
      ],
      students: [],
      grades: {},
      subjects: {},
      matrix: [],
      gaps: [
        {
          kind: "no-run-summary",
          severity: "P1",
          status: "unknown",
          detail: `חסר reports/virtual-student-daily/${date}/run-summary.json`,
        },
      ],
      summary: `אין artifact של nightly לתאריך ${date} — כיסוי לא חושב.`,
    };
  }

  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);
  const planStudents = (runSummary.plan && runSummary.plan.students) || {};
  const planSummary = (runSummary.plan && runSummary.plan.summary) || {};
  const suite = runSummary.suite || {};
  const suiteStudents = Array.isArray(suite.students) ? suite.students : [];
  const suiteLabels = new Set(suiteStudents.map((s) => s?.label).filter(Boolean));

  const blockers = [];
  const warnings = [];
  const gaps = [];
  const matrix = [];
  const students = [];

  // ---- Build per-student records from suite ----
  for (const student of suiteStudents) {
    if (!student?.label) continue;

    const label = student.label;
    const planEntry = planStudents[label] || {};
    const sessions = Array.isArray(student.sessions) ? student.sessions : [];
    const subjects = uniq(sessions.map((s) => s?.subject));
    const answeredTotal = sessions.reduce((sum, s) => sum + sessionAnsweredCount(s), 0);
    const probeFailures = countProbeFailures(student);
    const earlyExitReasons = collectEarlyExitReasons(student);

  const answerFlows = [];
  const questionShapes = [];
  for (const session of sessions) {
    const flows = extractAnswerFlows(session);
    if (flows) answerFlows.push(...flows);
    const shapes = extractQuestionShapes(session);
    if (shapes) questionShapes.push(...shapes);
  }

    students.push({
      label,
      grade: student.grade ?? planEntry.grade ?? null,
      status: student.status || "unknown",
      planned: planEntry.studied !== undefined ? Boolean(planEntry.studied) : null,
      studied: planEntry.studied === true,
      skipped: planEntry.studied === false,
      skipReason: planEntry.skipReason || null,
      subjects,
      sessionsCount: sessions.length,
      answeredQuestionCount: answeredTotal,
      answerFlows: answerFlows.length > 0 ? answerFlows : null,
      questionShapes: questionShapes.length > 0 ? questionShapes : null,
      probeFailuresCount: probeFailures,
      earlyExitReason: earlyExitReasons.length > 0 ? earlyExitReasons.join("; ") : null,
    });

    for (const session of sessions) {
      matrix.push({
        studentLabel: label,
        grade: student.grade ?? planEntry.grade ?? session.grade ?? null,
        subject: session?.subject || "unknown",
        sessions: 1,
        answeredQuestions: sessionAnsweredCount(session),
        status: sessionStatus(session, student.status),
        answerFlows: extractAnswerFlows(session),
        questionShapes: extractQuestionShapes(session),
      });
    }
  }

  // ---- Aggregate subjects{} ----
  const subjects = {};
  for (const row of matrix) {
    const subj = row.subject || "unknown";
    if (!subjects[subj]) {
      subjects[subj] = {
        subject: subj,
        studentsCount: 0,
        sessionsCount: 0,
        answeredQuestionCount: 0,
        statuses: { pass: 0, partial: 0, fail: 0, blocked: 0, unknown: 0 },
      };
    }
  }
  for (const subj of Object.keys(subjects)) {
    const rows = matrix.filter((r) => r.subject === subj);
    subjects[subj].studentsCount = uniq(rows.map((r) => r.studentLabel)).length;
    subjects[subj].sessionsCount = rows.length;
    subjects[subj].answeredQuestionCount = rows.reduce((s, r) => s + num(r.answeredQuestions), 0);
    for (const r of rows) {
      const st = r.status in subjects[subj].statuses ? r.status : "unknown";
      subjects[subj].statuses[st]++;
    }
  }

  // ---- Aggregate grades{} ----
  const grades = {};
  for (const g of ALL_GRADES) {
    grades[String(g)] = {
      grade: g,
      studentsCount: 0,
      subjectsCovered: [],
      answeredQuestionCount: 0,
    };
  }
  for (const student of students) {
    const g = student.grade;
    if (g == null || !grades[String(g)]) continue;
    grades[String(g)].studentsCount++;
    grades[String(g)].subjectsCovered = uniq([
      ...grades[String(g)].subjectsCovered,
      ...student.subjects,
    ]);
    grades[String(g)].answeredQuestionCount += student.answeredQuestionCount;
  }

  // ---- Gap: filtered run ----
  if (!isFullNightlyRun) {
    const filterDetail =
      filterReason ||
      (Array.isArray(runSummary.studentLabelsFilter)
        ? `studentLabelsFilter=${runSummary.studentLabelsFilter.join(",")}`
        : "focused/manual subset run");
    gaps.push({
      kind: "filtered-run",
      severity: "P1",
      status: "confirmed",
      detail: filterDetail,
    });
    warnings.push({
      severity: "P1",
      detail:
        `Coverage source is filtered/focused and cannot prove full readiness coverage. ${filterDetail}`,
      source,
      action:
        "השג artifact של ריצת nightly מלאה (כל 12 הפרסונות, ללא --students) לפני שמכריזים על readiness.",
    });
  }

  // ---- Gap: missing AAA1–AAA12 from suite ----
  const missingFromSuite = ALL_STUDENT_LABELS.filter((l) => !suiteLabels.has(l));
  if (missingFromSuite.length > 0) {
    gaps.push({
      kind: "missing-students",
      severity: isFullNightlyRun ? "P0" : "P1",
      status: "confirmed",
      detail: `${missingFromSuite.length} תלמידים חסרים מ-suite.students: ${missingFromSuite.join(", ")}`,
      missing: missingFromSuite,
    });
  }

  // ---- Gap: grades 1–6 not represented in tested students ----
  const testedGrades = uniq(students.filter((s) => s.status === "pass" || s.answeredQuestionCount > 0).map((s) => s.grade));
  const missingGrades = ALL_GRADES.filter((g) => !testedGrades.includes(g));
  if (missingGrades.length > 0) {
    gaps.push({
      kind: "missing-grades",
      severity: isFullNightlyRun ? "P1" : "P1",
      status: "confirmed",
      detail: `כיתות ${missingGrades.join(", ")} לא מיוצגות בתוצאות suite (נבדקו: ${testedGrades.join(", ") || "אף אחת"})`,
      missing: missingGrades,
    });
  }

  // ---- Gap: core subjects not seen ----
  const seenSubjects = uniq(matrix.map((r) => r.subject));
  const missingSubjects = CORE_SUBJECTS.filter((s) => !seenSubjects.includes(s));
  if (missingSubjects.length > 0) {
    gaps.push({
      kind: "missing-subjects",
      severity: isFullNightlyRun ? "P1" : "P1",
      status: seenSubjects.length === 0 ? "confirmed" : "confirmed",
      detail: `מקצועות ליבה שלא נראו בריצה: ${missingSubjects.join(", ")}`,
      missing: missingSubjects,
    });
  }

  // ---- Gap: partial/fail/blocked sessions ----
  const badSessions = matrix.filter((r) => ["partial", "fail", "blocked"].includes(r.status));
  for (const row of badSessions) {
    gaps.push({
      kind: "session-not-pass",
      severity: row.status === "fail" || row.status === "blocked" ? "P0" : "P1",
      status: "confirmed",
      detail: `${row.studentLabel}/${row.subject}: session status=${row.status}`,
      studentLabel: row.studentLabel,
      subject: row.subject,
    });
  }

  // ---- Gap: subjects with 0 answered questions ----
  for (const subj of seenSubjects) {
    const agg = subjects[subj];
    if (agg && agg.answeredQuestionCount === 0) {
      gaps.push({
        kind: "subject-zero-answers",
        severity: "P1",
        status: "confirmed",
        detail: `מקצוע ${subj}: 0 תשובות שנרשמו ב-suite`,
        subject: subj,
      });
    }
  }

  // ---- Gap: student expected to study but 0 answers ----
  for (const student of students) {
    const expected =
      student.planned === true ||
      student.studied === true ||
      (planStudents[student.label]?.studied === true);
    if (expected && student.answeredQuestionCount === 0) {
      gaps.push({
        kind: "student-zero-answers",
        severity: "P1",
        status: "confirmed",
        detail: `${student.label}: צפוי ללמוד אך 0 תשובות ב-suite`,
        studentLabel: student.label,
      });
    }
  }

  // ---- Blockers from fail/blocked students ----
  const failedStudents = suiteStudents.filter((s) =>
    ["fail", "blocked"].includes(String(s?.status || "").toLowerCase())
  );
  for (const s of failedStudents) {
    blockers.push({
      severity: "P0",
      detail: `תלמיד ${s.label} במצב ${s.status}${s.driverError ? `: ${String(s.driverError).slice(0, 100)}` : ""}`,
      source,
      action: "בדוק failure-repro.md ו-screenshots.",
    });
  }

  // ---- overallStatus ----
  let overallStatus = "pass";
  if (blockers.length > 0 || failedStudents.length > 0) {
    overallStatus = "fail";
  } else if (!isFullNightlyRun || runKind === "filtered" || runKind === "unknown") {
    overallStatus = "warn";
  } else if (
    badSessions.length > 0 ||
    warnings.length > 0 ||
    gaps.some((g) => g.kind !== "filtered-run" && g.severity === "P1")
  ) {
    overallStatus = "warn";
  }

  const passCount = suiteStudents.filter((s) => s.status === "pass").length;
  const suiteTotal = num((suite.summary && suite.summary.counts && suite.summary.counts.total) || suiteStudents.length);
  const planStudied = num(planSummary.studied);

  const summary =
    isFullNightlyRun
      ? `כיסוי מלא: ${passCount}/${suiteTotal} תלמידים passed, ` +
        `${Object.keys(subjects).length} מקצועות, כיתות ${testedGrades.join(", ") || "—"}, ` +
        `${matrix.reduce((s, r) => s + num(r.answeredQuestions), 0)} תשובות.`
      : `כיסוי ממוקד (runKind=${runKind}): רק ${suiteTotal} תלמיד(ים) ב-suite ` +
        `(מתוכננים ${planStudied} למדו) — לא מספיק ל-readiness מלא. ` +
        `נבדקו: ${students.map((s) => s.label).join(", ") || "—"}.`;

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
    students,
    grades,
    subjects,
    matrix,
    gaps,
    summary,
  };
}

/** Render coverage-summary.md from a report object. */
export function buildCoverageMarkdown(report) {
  const lines = [];
  lines.push(`# Coverage Matrix — ${report.date}`);
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
  if (report.filterReason) {
    lines.push(`**סיבת סינון:** ${report.filterReason}`);
  }
  if (!report.isFullNightlyRun) {
    lines.push("");
    lines.push(
      "> ⚠️ מקור הכיסוי הוא ריצה ממוקדת/מסוננת. אסור להכריז על כיסוי readiness מלא על בסיס דוח זה."
    );
  }
  lines.push("");

  lines.push(`## חוסמים (P0) — ${report.blockers.length}`);
  if (report.blockers.length === 0) lines.push("אין.");
  else for (const b of report.blockers) lines.push(`- ${b.detail}`);
  lines.push("");

  lines.push(`## אזהרות (P1) — ${report.warnings.length}`);
  if (report.warnings.length === 0) lines.push("אין.");
  else for (const w of report.warnings) lines.push(`- ${w.detail}`);
  lines.push("");

  lines.push(`## פערי כיסוי — ${report.gaps.length}`);
  for (const g of report.gaps) {
    lines.push(`- \`${g.kind}\` [${g.severity}] ${g.detail}`);
  }
  lines.push("");

  lines.push(`## תלמידים (${report.students.length})`);
  lines.push("");
  lines.push("| label | grade | status | subjects | sessions | answered |");
  lines.push("|-------|-------|--------|----------|----------|----------|");
  for (const s of report.students) {
    lines.push(
      `| ${s.label} | ${s.grade ?? "—"} | ${s.status} | ${(s.subjects || []).join(", ") || "—"} | ${s.sessionsCount} | ${s.answeredQuestionCount} |`
    );
  }
  lines.push("");

  lines.push(`## מקצועות`);
  lines.push("");
  lines.push("| subject | students | sessions | answered |");
  lines.push("|---------|----------|----------|----------|");
  for (const subj of CORE_SUBJECTS) {
    const agg = report.subjects[subj];
    if (!agg) {
      lines.push(`| ${subj} | 0 | 0 | 0 |`);
    } else {
      lines.push(
        `| ${subj} | ${agg.studentsCount} | ${agg.sessionsCount} | ${agg.answeredQuestionCount} |`
      );
    }
  }
  lines.push("");

  lines.push(`## כיתות`);
  lines.push("");
  lines.push("| grade | students | subjects | answered |");
  lines.push("|-------|----------|----------|----------|");
  for (const g of ALL_GRADES) {
    const agg = report.grades[String(g)];
    lines.push(
      `| ${g} | ${agg?.studentsCount ?? 0} | ${(agg?.subjectsCovered || []).join(", ") || "—"} | ${agg?.answeredQuestionCount ?? 0} |`
    );
  }
  lines.push("");

  lines.push(`## מטריצה (${report.matrix.length} שורות)`);
  lines.push("");
  lines.push("| student | grade | subject | answered | status |");
  lines.push("|---------|-------|---------|----------|--------|");
  for (const row of report.matrix) {
    lines.push(
      `| ${row.studentLabel} | ${row.grade ?? "—"} | ${row.subject} | ${row.answeredQuestions} | ${row.status} |`
    );
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("> Read-only aggregation מ-run-summary.json. לא נכתב ל-Supabase ולא שונה product.");
  lines.push("");

  return lines.join("\n");
}
