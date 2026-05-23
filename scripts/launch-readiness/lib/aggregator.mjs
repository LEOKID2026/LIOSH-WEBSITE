/**
 * Launch Readiness — aggregator (read-only, MVP).
 *
 * Reads existing artifacts only. Never writes to product, never writes to
 * Supabase. If an artifact is missing, the layer is marked `not_run` with a
 * helpful Hebrew summary string — never `fail`.
 *
 * MVP inputs (read if exist; missing => not_run):
 *   1. reports/virtual-student-daily/<date>/run-summary.json   (REQUIRED for nightly)
 *   2. reports/question-metadata-qa/summary.json               (optional)
 *   3. reports/learning-simulator/orchestrator/run-summary.json (optional)
 *
 * Layers populated by this MVP aggregator:
 *   - nightly                (from run-summary.json — P0 checks encoded)
 *   - questionQuality        (from question-metadata-qa/summary.json)
 *   - pdfExport              (from learning-simulator/orchestrator/run-summary.json if step exists)
 *
 * Layers left as `not_run` for now (filled in E2-E9):
 *   - coverage, parentReportTruth, dataIntegrity,
 *     diagnosticGroundTruth, similarQuestions, recommendation, copilotTruth,
 *     mobile, crossDevicePersistence, failureRecovery
 *
 * Each layer object follows verdict-rules.mjs shape:
 *   { status, source, summary, blockers?, warnings? }
 */

import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { ALL_LAYERS } from "./verdict-rules.mjs";

const NOT_RUN_DEFAULT_NOTE = "שכבה זו עוד לא מחוברת ל-Launch Gate (MVP).";

async function readJsonSafe(filePath) {
  if (!existsSync(filePath)) return { exists: false, data: null, error: null };
  try {
    const raw = await readFile(filePath, "utf8");
    return { exists: true, data: JSON.parse(raw), error: null };
  } catch (err) {
    return {
      exists: true,
      data: null,
      error: `קריאה נכשלה: ${String(err?.message || err).slice(0, 200)}`,
    };
  }
}

/**
 * Detect whether a nightly run-summary represents a FULL daily readiness run
 * or a FILTERED/manual smoke run.
 *
 * "Filtered" means the runner was invoked with --students (e.g. the desktop
 * smoke runs against a single AAA-N) and therefore the suite only covered a
 * subset of the persona table. Such a run MUST NOT count as readiness data.
 *
 * Signals (in priority order):
 *   - studentLabelsFilter present & non-empty           => filtered
 *   - suite.filteredOut[] non-empty (excludes cli-filter explicitly)
 *                                                       => filtered
 *   - plan.summary.studied >> suite.summary.counts.total (>=4x or +3 absolute)
 *                                                       => filtered
 *   - none of the above + plan looks complete           => full
 *   - anything else / unparseable                       => unknown
 *
 * Returns { runKind, isFullNightlyRun, filterReason }.
 */
export function classifyRunKind(runSummary) {
  if (!runSummary || typeof runSummary !== "object") {
    return { runKind: "unknown", isFullNightlyRun: false, filterReason: null };
  }

  const filter = Array.isArray(runSummary.studentLabelsFilter)
    ? runSummary.studentLabelsFilter
    : [];
  const suite = runSummary.suite || {};
  const suiteCounts = (suite.summary && suite.summary.counts) || {};
  const suiteTotal = Number(suiteCounts.total || 0);
  const planSummary = (runSummary.plan && runSummary.plan.summary) || {};
  const planStudied = Number(planSummary.studied || 0);
  const filteredOut = Array.isArray(suite.filteredOut) ? suite.filteredOut : [];
  const cliFilteredOut = filteredOut.filter(
    (r) => r && typeof r.reason === "string" && r.reason.startsWith("cli-filter")
  );

  if (filter.length > 0) {
    return {
      runKind: "filtered",
      isFullNightlyRun: false,
      filterReason:
        `studentLabelsFilter=${filter.join(",")}: ` +
        `plan studied=${planStudied} but suite total=${suiteTotal}` +
        (cliFilteredOut.length > 0
          ? ` (${cliFilteredOut.length} students cli-filtered out)`
          : ""),
    };
  }

  if (cliFilteredOut.length > 0) {
    return {
      runKind: "filtered",
      isFullNightlyRun: false,
      filterReason: `${cliFilteredOut.length} students excluded by cli-filter; plan studied=${planStudied}, suite total=${suiteTotal}`,
    };
  }

  // Heuristic: planned to study many but suite only saw 1-2 — almost certainly
  // a smoke run that escaped the explicit signals above.
  if (planStudied >= 4 && suiteTotal > 0 && planStudied >= suiteTotal * 4) {
    return {
      runKind: "filtered",
      isFullNightlyRun: false,
      filterReason: `plan studied=${planStudied} >> suite total=${suiteTotal} (likely focused subset)`,
    };
  }

  // Looks like a full run: planned students roughly match the suite verdict
  // population, and no filter signals are present.
  if (planStudied > 0 && suiteTotal > 0) {
    return {
      runKind: "full",
      isFullNightlyRun: true,
      filterReason: null,
    };
  }

  return { runKind: "unknown", isFullNightlyRun: false, filterReason: null };
}

/**
 * Build the `nightly` layer from a run-summary.json blob.
 * Encodes all the P0 nightly checks listed in user requirements §4.
 */
function buildNightlyLayer({ runSummary, summarySource, runSummaryReadError }) {
  if (runSummaryReadError) {
    return {
      status: "fail",
      source: summarySource,
      summary: `לא ניתן לקרוא את run-summary של ה-nightly: ${runSummaryReadError}`,
      runKind: "unknown",
      isFullNightlyRun: false,
      blockers: [
        {
          severity: "P0",
          detail: `run-summary.json קיים אך לא תקין: ${runSummaryReadError}`,
          source: summarySource,
          action: "בדוק את הקובץ ידנית ותקן/הרץ שוב.",
        },
      ],
      warnings: [],
    };
  }
  if (!runSummary) {
    return {
      status: "not_run",
      source: summarySource,
      summary: "לא נמצאה ריצת nightly לתאריך הזה. אם הריצה אמורה הייתה לרוץ — בדוק את ה-laptop scheduler.",
      runKind: "unknown",
      isFullNightlyRun: false,
      blockers: [],
      warnings: [],
    };
  }

  const blockers = [];
  const warnings = [];

  // Classify run kind early — needed to add a filtered-run P1 warning and
  // to label the layer correctly even when everything else passed.
  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);

  // ---- P0: top-level run status ----
  const topStatus = String(runSummary.status || "unknown").toLowerCase();
  if (topStatus === "fail") {
    blockers.push({
      severity: "P0",
      detail: `ריצת ה-nightly מסתיימת בכישלון (status=fail).`,
      source: summarySource,
      action: "פתח את failure-repro.md תחת תיק הריצה ובדוק שורש הבעיה.",
    });
  } else if (topStatus === "blocked") {
    blockers.push({
      severity: "P0",
      detail: `ריצת ה-nightly חסומה (status=blocked).`,
      source: summarySource,
      action: "בדוק את ה-stateAdvance.error או את שלב ה-preflight.",
    });
  }

  // ---- P0: preflight — parent login ----
  const preflight = runSummary.preflight || {};
  if (preflight.parent && preflight.parent.ok === false) {
    blockers.push({
      severity: "P0",
      detail: "התחברות הורה (parent login) נכשלה ב-preflight.",
      source: summarySource,
      action: "בדוק credentials של ההורה ו/או זמינות שרת.",
    });
  }

  // ---- P0: preflight — student logins ----
  const studentPreflight = Array.isArray(preflight.students) ? preflight.students : [];
  const failedStudentLogins = studentPreflight.filter((s) => s && s.ok === false);
  if (failedStudentLogins.length > 0) {
    blockers.push({
      severity: "P0",
      detail: `${failedStudentLogins.length} תלמידים נכשלו ב-login preflight: ${failedStudentLogins.map((s) => s.label).join(", ")}.`,
      source: summarySource,
      action: "בדוק PIN/access codes של התלמידים שנכשלו.",
    });
  }

  // ---- P0: preflight — list-students ----
  const listStudents = preflight.listStudents || {};
  if (listStudents.ok === false) {
    blockers.push({
      severity: "P0",
      detail: "list-students API לא החזיר נתונים תקינים ב-preflight.",
      source: summarySource,
      action: "בדוק זמינות /api/parent/list-students.",
    });
  }

  // ---- P0: suite — fail/blocked students ----
  const suite = runSummary.suite || {};
  const suiteCounts = (suite.summary && suite.summary.counts) || {};
  if ((suiteCounts.fail || 0) > 0) {
    blockers.push({
      severity: "P0",
      detail: `${suiteCounts.fail} תלמיד(ים) נכשלו בריצה.`,
      source: summarySource,
      action: "בדוק את suite.students[].driverError וצלם screenshots.",
    });
  }
  if ((suiteCounts.blocked || 0) > 0) {
    blockers.push({
      severity: "P0",
      detail: `${suiteCounts.blocked} תלמיד(ים) חסומים.`,
      source: summarySource,
      action: "בדוק את suite.students[].blocker.",
    });
  }

  // ---- P0: cross-student bleed ----
  const crossMatrix = Array.isArray(suite.crossStudentMatrix) ? suite.crossStudentMatrix : [];
  const bleedFindings = crossMatrix.filter(
    (row) => row && (row.bleedOk === false || (Array.isArray(row.bleedFindings) && row.bleedFindings.length > 0))
  );
  if (bleedFindings.length > 0) {
    blockers.push({
      severity: "P0",
      detail: `דליפת נתונים בין תלמידים (cross-student bleed) ב-${bleedFindings.length} תלמיד(ים): ${bleedFindings.map((r) => r.studentLabel).join(", ")}.`,
      source: summarySource,
      action: "קריטי לפרטיות — לעצור ולבדוק לפני כל שינוי נוסף.",
    });
  }

  // ---- P0: session/finish not saved ----
  const students = Array.isArray(suite.students) ? suite.students : [];
  const finishFailures = [];
  for (const student of students) {
    for (const session of student.sessions || []) {
      const finishCounts = session?.tier1Counts?.["/api/learning/session/finish"];
      if (finishCounts && (finishCounts.fail || 0) > 0) {
        finishFailures.push(`${student.label}.sess${session.index}`);
      }
    }
  }
  if (finishFailures.length > 0) {
    blockers.push({
      severity: "P0",
      detail: `session/finish לא נשמר ב-${finishFailures.length} sessions: ${finishFailures.join(", ")}.`,
      source: summarySource,
      action: "בדוק /api/learning/session/finish ולוודא שאין 5xx.",
    });
  }

  // ---- P0: driver error per student ----
  const driverErrors = students
    .filter((s) => s && s.driverError && s.status !== "pass")
    .map((s) => `${s.label}: ${String(s.driverError).slice(0, 80)}`);
  if (driverErrors.length >= 2) {
    blockers.push({
      severity: "P0",
      detail: `שגיאת driver חוזרת על ${driverErrors.length} תלמידים: ${driverErrors.slice(0, 2).join("; ")}.`,
      source: summarySource,
      action: "בדוק אם זו תקלת מוצר אמיתית או QA driver bug; עדכן KNOWN-ISSUES.md.",
    });
  } else if (driverErrors.length === 1) {
    warnings.push({
      severity: "P1",
      detail: `שגיאת driver על תלמיד יחיד: ${driverErrors[0]}.`,
      source: summarySource,
      action: "בדוק אם זו תקלת QA driver חד-פעמית או דפוס.",
    });
  }

  // ---- P1: partial nightly status ----
  if (topStatus === "partial") {
    warnings.push({
      severity: "P1",
      detail: "ריצת ה-nightly הסתיימה כ-PARTIAL — חלק מהתלמידים לא סיימו את ה-session המלאה.",
      source: summarySource,
      action: "בדוק את KNOWN-ISSUES.md ו-failure-repro.md; אם הסיבה QA driver — לא חוסם.",
    });
  }

  // ---- P1: partial students ----
  if ((suiteCounts.partial || 0) > 0) {
    warnings.push({
      severity: "P1",
      detail: `${suiteCounts.partial} תלמיד(ים) במצב PARTIAL.`,
      source: summarySource,
      action: "ראה failure-repro.md.",
    });
  }

  // ---- P1: parent console errors ----
  const parentConsole = suite.parentConsole || {};
  const consoleErrorCount = (parentConsole.errors || []).length;
  const pageErrorCount = (parentConsole.pageErrors || []).length;
  if (consoleErrorCount > 0 || pageErrorCount > 0) {
    warnings.push({
      severity: "P1",
      detail: `שגיאות בקונסול הורה: ${consoleErrorCount} console + ${pageErrorCount} page errors.`,
      source: summarySource,
      action: "בדוק parentConsole.errors בקובץ run-summary.json.",
    });
  }

  // ---- P1: stateAdvance failure ----
  const stateAdvance = runSummary.stateAdvance || {};
  if (stateAdvance.attempted && stateAdvance.shouldRun && stateAdvance.succeeded === false) {
    warnings.push({
      severity: "P1",
      detail: `stateAdvance נכשל: ${String(stateAdvance.error || "(ללא פרטים)").slice(0, 120)}`,
      source: summarySource,
      action: "ייתכן ש-state.json לא מתעדכן ויש בעיית persistence ארוכת-טווח.",
    });
  }

  // ---- P1: filtered/manual run (NOT a full readiness run) ----
  // This is the critical correction added in E1.1 (2026-05-23): a focused
  // smoke against AAA7 must NOT silently be treated as full readiness.
  if (runKind === "filtered") {
    const filterTail = filterReason ? ` — ${filterReason}` : "";
    warnings.push({
      severity: "P1",
      detail:
        `ריצת ה-nightly לתאריך זה מסוננת/ממוקדת — זו ריצת אימות ולא ריצת readiness מלאה${filterTail}.`,
      source: summarySource,
      action:
        "השג artifact של ריצת nightly מלאה (כל 12 הפרסונות, ללא --students) לפני שמכריזים על readiness.",
    });
  } else if (runKind === "unknown") {
    warnings.push({
      severity: "P1",
      detail:
        "לא ניתן לסווג את ריצת ה-nightly כ-full או filtered (חסרים שדות plan.summary / suite.counts).",
      source: summarySource,
      action:
        "בדוק שלמות run-summary.json. אם זו ריצת אימות — סמן אותה ידנית ל-PARTIAL.",
    });
  }

  // ---- summary line ----
  const studiedCount = (runSummary.plan && runSummary.plan.summary && runSummary.plan.summary.studied) || 0;
  const totalSessions = (runSummary.plan && runSummary.plan.summary && runSummary.plan.summary.totalSessions) || 0;
  const passCount = suiteCounts.pass || 0;
  const totalCount = suiteCounts.total || 0;
  const filter = Array.isArray(runSummary.studentLabelsFilter) ? runSummary.studentLabelsFilter : [];
  const filterNote = filter.length > 0 ? ` (סנן ל-${filter.length} תלמידים: ${filter.join(", ")})` : "";
  const kindNote =
    runKind === "filtered"
      ? " [runKind=filtered — לא readiness מלאה]"
      : runKind === "full"
      ? " [runKind=full]"
      : " [runKind=unknown]";

  const summary =
    `ריצה ${topStatus.toUpperCase()}: ${passCount}/${totalCount} תלמידים passed, ` +
    `${studiedCount} למדו, ${totalSessions} sessions מתוכננים${filterNote}${kindNote}.`;

  // Status mapping for the layer:
  //   - fail/blocked => fail
  //   - partial      => warn
  //   - pass         => pass (or warn if there are P1)
  //   - other        => not_run
  let layerStatus = "not_run";
  if (topStatus === "fail" || topStatus === "blocked") layerStatus = "fail";
  else if (topStatus === "partial") layerStatus = "warn";
  else if (topStatus === "pass") layerStatus = warnings.length > 0 ? "warn" : "pass";

  // If blockers were added by deeper checks even when top status is pass,
  // still surface them as fail.
  if (blockers.length > 0 && layerStatus !== "fail") layerStatus = "fail";

  return {
    status: layerStatus,
    source: summarySource,
    summary,
    runKind,
    isFullNightlyRun,
    filterReason,
    blockers,
    warnings,
  };
}

/**
 * Build the `questionQuality` layer from question-metadata-qa/summary.json.
 * If file missing => not_run.
 */
function buildQuestionQualityLayer({ qa, source }) {
  if (!qa) {
    return {
      status: "not_run",
      source,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:question-metadata\` כדי לחבר.`,
    };
  }

  const blockers = [];
  const warnings = [];

  // The gate writes `gateDecision` and `blocking` counts; if absent, treat as warn.
  const decision = String(qa.gateDecision || "").toLowerCase();
  const blockingCount = Number(qa.blocking || 0);

  if (decision === "fail_blocking_metadata" || blockingCount > 0) {
    blockers.push({
      severity: "P0",
      detail: `gate החזיר ${decision || "decision לא ידוע"} עם ${blockingCount} blocking metadata items.`,
      source,
      action: "תקן את ה-blocking items לפני שכבה הזו עוברת ל-pass.",
    });
  }

  const advisoryCount = Number(qa.advisory || 0);
  if (advisoryCount > 0) {
    warnings.push({
      severity: "P1",
      detail: `${advisoryCount} advisory items (לא חוסמים).`,
      source,
      action: "ראה advisories ב-summary.json. אופציונלי לתיקון.",
    });
  }

  const status = blockers.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass";
  return {
    status,
    source,
    summary: `gate=${decision || "ok"}, blocking=${blockingCount}, advisory=${advisoryCount}.`,
    blockers,
    warnings,
  };
}

/**
 * Build the `pdfExport` layer from learning-simulator orchestrator summary,
 * if it has a pdf-export step. Otherwise => not_run.
 */
function buildPdfExportLayer({ orchestrator, source }) {
  if (!orchestrator) {
    return {
      status: "not_run",
      source,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:parent-pdf-export\` או \`npm run qa:learning-simulator:release\`.`,
    };
  }

  // Try to find a pdf-export-like step; the orchestrator output shape may vary.
  // We never fail loudly here — just degrade to not_run when shape is unfamiliar.
  const steps = Array.isArray(orchestrator.steps) ? orchestrator.steps : [];
  const pdfStep = steps.find(
    (s) =>
      s &&
      typeof s.name === "string" &&
      (s.name.toLowerCase().includes("pdf") || s.name.toLowerCase().includes("export"))
  );
  if (!pdfStep) {
    return {
      status: "not_run",
      source,
      summary: "orchestrator נמצא אך אין שלב PDF זמין בקובץ.",
    };
  }
  const ok = pdfStep.ok === true || String(pdfStep.status || "").toLowerCase() === "pass";
  return {
    status: ok ? "pass" : "fail",
    source,
    summary: `שלב PDF: ${pdfStep.name} — ${ok ? "PASS" : "FAIL"}.`,
    blockers: ok
      ? []
      : [
          {
            severity: "P0",
            detail: `יצוא PDF נכשל ב-${pdfStep.name}.`,
            source,
            action: "בדוק את הלוג של orchestrator/run-summary.json.",
          },
        ],
  };
}

/**
 * Build the `coverage` layer from coverage-summary.json (E2).
 * If file missing => not_run.
 */
function buildCoverageLayer({ coverage, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא coverage-summary.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `coverage-summary.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:coverage -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!coverage) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:coverage -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(coverage.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(coverage.blockers) ? coverage.blockers : [];
  const warnings = Array.isArray(coverage.warnings) ? coverage.warnings : [];
  const gapCount = Array.isArray(coverage.gaps) ? coverage.gaps.length : 0;
  const studentCount = Array.isArray(coverage.students) ? coverage.students.length : 0;
  const subjectCount = coverage.subjects ? Object.keys(coverage.subjects).length : 0;

  const kindNote = coverage.isFullNightlyRun
    ? "כיסוי מלא"
    : `כיסוי ממוקד (runKind=${coverage.runKind || "unknown"})`;

  const summary =
    coverage.summary ||
    `${kindNote}: ${studentCount} תלמידים, ${subjectCount} מקצועות, ${gapCount} פערים — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `parentReportTruth` layer from parent-report-truth-audit.json (E3).
 */
function buildParentReportTruthLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא parent-report-truth-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `parent-report-truth-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:parent-report-truth -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:parent-report-truth -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const studentCount = Array.isArray(audit.students) ? audit.students.length : 0;
  const checked = audit.students?.map((s) => s.label).join(", ") || "—";

  const kindNote = audit.isFullNightlyRun
    ? "ביקורת מלאה"
    : `ביקורת ממוקדת (runKind=${audit.runKind || "unknown"})`;

  const summary =
    audit.summary ||
    `${kindNote}: ${studentCount} דוחות (${checked}) — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `dataIntegrity` layer from data-integrity-audit.json (E4).
 */
function buildDataIntegrityLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא data-integrity-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `data-integrity-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:data-integrity -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:data-integrity -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const studentCount = Array.isArray(audit.students) ? audit.students.length : 0;
  const sessionCount = Array.isArray(audit.sessions) ? audit.sessions.length : 0;

  const kindNote = audit.isFullNightlyRun
    ? "שלמות מלאה"
    : `שלמות ממוקדת (runKind=${audit.runKind || "unknown"})`;

  const summary =
    audit.summary ||
    `${kindNote}: ${studentCount} תלמידים, ${sessionCount} sessions — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `diagnosticGroundTruth` layer from diagnostic-ground-truth-report.json (E5).
 */
function buildDiagnosticGroundTruthLayer({ report, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא diagnostic-ground-truth-report.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `diagnostic-ground-truth-report.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:diagnostic-ground-truth -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!report) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:diagnostic-ground-truth -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(report.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(report.blockers) ? report.blockers : [];
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const studentCount = Array.isArray(report.students) ? report.students.length : 0;
  const checked = report.students?.map((s) => s.label).join(", ") || "—";

  const kindNote = report.isFullNightlyRun
    ? "אבחון מלא"
    : `אבחון ממוקד (runKind=${report.runKind || "unknown"})`;

  const summary =
    report.summary ||
    `${kindNote}: ${studentCount} personas (${checked}) — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `similarQuestions` layer from similar-question-audit.json (E6).
 */
function buildSimilarQuestionsLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא similar-question-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `similar-question-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:similar-questions -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:similar-questions -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const studentCount = Array.isArray(audit.students) ? audit.students.length : 0;
  const eventCount = Array.isArray(audit.events) ? audit.events.length : 0;
  const checked = audit.students?.map((s) => s.label).join(", ") || "—";

  const kindNote = audit.isFullNightlyRun
    ? "follow-up מלא"
    : `follow-up ממוקד (runKind=${audit.runKind || "unknown"})`;

  const summary =
    audit.summary ||
    `${kindNote}: ${studentCount} תלמידים (${checked}), ${eventCount} wrong-answer events — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `recommendation` layer from parent-recommendation-audit.json (E7).
 */
function buildParentRecommendationLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא parent-recommendation-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `parent-recommendation-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:parent-recommendation -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:parent-recommendation -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const studentCount = Array.isArray(audit.students) ? audit.students.length : 0;
  const recCount = Array.isArray(audit.recommendations) ? audit.recommendations.length : 0;
  const checked = audit.students?.map((s) => s.label).join(", ") || "—";

  const kindNote = audit.isFullNightlyRun
    ? "המלצות מלא"
    : `המלצות ממוקדות (runKind=${audit.runKind || "unknown"})`;

  const summary =
    audit.summary ||
    `${kindNote}: ${studentCount} תלמידים (${checked}), ${recCount} recommendation snippets — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `copilotTruth` layer from parent-copilot-truth-audit.json (E8).
 */
function buildCopilotTruthLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא parent-copilot-truth-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `parent-copilot-truth-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:parent-copilot-truth -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:parent-copilot-truth -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const studentCount = Array.isArray(audit.students) ? audit.students.length : 0;
  const turnCount = Array.isArray(audit.turns) ? audit.turns.length : 0;
  const generated = audit.adapter?.generatedAnswers ?? 0;
  const checked = audit.students?.map((s) => s.label).join(", ") || "—";

  const kindNote = audit.isFullNightlyRun
    ? "Copilot Truth מלא"
    : `Copilot Truth ממוקד (runKind=${audit.runKind || "unknown"})`;

  const summary =
    audit.summary ||
    `${kindNote}: ${studentCount} תלמידים (${checked}), ${turnCount} turns, ${generated} תשובות deterministic — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `mobile` layer from mobile-rtl-audit.json (E9A).
 */
function buildMobileRtlLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא mobile-rtl-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `mobile-rtl-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:mobile -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:mobile -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const pageCount = Array.isArray(audit.pages) ? audit.pages.length : 0;
  const checked = audit.pages?.filter((p) => p.checked).map((p) => p.name).join(", ") || "—";
  const vp = audit.viewport
    ? `${audit.viewport.label || "mobile"} ${audit.viewport.width}×${audit.viewport.height}`
    : "390×844";

  const summary =
    audit.summary ||
    `Mobile RTL MVP (${vp}): ${pageCount} pages, checked=[${checked}] — overallStatus=${overall}.`;

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `crossDevicePersistence` layer from cross-device-persistence-audit.json (E9B).
 */
function buildCrossDevicePersistenceLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא cross-device-persistence-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `cross-device-persistence-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:cross-device -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:cross-device -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const passCount = Array.isArray(audit.checkedClaims)
    ? audit.checkedClaims.filter((c) => c.status === "pass").length
    : 0;
  const claimCount = Array.isArray(audit.checkedClaims) ? audit.checkedClaims.length : 0;
  const live = audit.liveMultiDeviceTestPerformed === true;

  const summary =
    `סנכרון בין-מכשירים (E9B evidence): ${passCount}/${claimCount} claims pass, overallStatus=${overall}.` +
    (live ? " בוצעה בדיקת multi-device חיה." : " ללא בדיקת multi-device חיה — docs/artifacts בלבד.");

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build the `failureRecovery` layer from failure-recovery-audit.json (E9C).
 */
function buildFailureRecoveryLayer({ audit, source, readError }) {
  if (readError) {
    return {
      status: "fail",
      source,
      summary: `לא ניתן לקרוא failure-recovery-audit.json: ${readError}`,
      blockers: [
        {
          severity: "P0",
          detail: `failure-recovery-audit.json קיים אך לא תקין: ${readError}`,
          source,
          action: "הרץ npm run qa:launch:failure-recovery -- --date <date> מחדש.",
        },
      ],
      warnings: [],
    };
  }
  if (!audit) {
    return {
      status: "not_run",
      source: null,
      summary: `${NOT_RUN_DEFAULT_NOTE} הרץ \`npm run qa:launch:failure-recovery -- --date <date>\` כדי לחבר.`,
    };
  }

  const overall = String(audit.overallStatus || "unknown").toLowerCase();
  let status = "not_run";
  if (overall === "pass") status = "pass";
  else if (overall === "warn") status = "warn";
  else if (overall === "fail") status = "fail";
  else if (overall === "not_run") status = "not_run";

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];
  const eventCount = Array.isArray(audit.events) ? audit.events.length : 0;
  const partialCount = Array.isArray(audit.students)
    ? audit.students.filter((s) => s.status === "partial").length
    : 0;
  const injected = audit.failureInjectionPerformed === true;

  const summary =
    `התאוששות מכשלים (E9C MVP): ${eventCount} events, partial=${partialCount}, overallStatus=${overall}.` +
    (injected ? " בוצעה הזרקת כשלים." : " ללא הזרקת כשלים — artifacts/logs בלבד.");

  return {
    status,
    source,
    summary,
    blockers,
    warnings,
  };
}

/**
 * Build a `not_run` placeholder for layers that this MVP doesn't read yet.
 */
function buildNotRunLayer(layerName, phaseName) {
  return {
    status: "not_run",
    source: null,
    summary: `${NOT_RUN_DEFAULT_NOTE} יחובר בשכבה ${phaseName}.`,
  };
}

/**
 * Main aggregator. Returns the full `layers` object for verdict-rules.
 *
 * @param {Object} params
 * @param {string} params.repoRoot
 * @param {string} params.date  "YYYY-MM-DD"
 * @returns {Promise<{layers, sources}>}
 */
export async function aggregateLayers({ repoRoot, date }) {
  const nightlyPath = path.join(
    repoRoot,
    "reports",
    "virtual-student-daily",
    date,
    "run-summary.json"
  );
  const questionMetadataPath = path.join(
    repoRoot,
    "reports",
    "question-metadata-qa",
    "summary.json"
  );
  const orchestratorPath = path.join(
    repoRoot,
    "reports",
    "learning-simulator",
    "orchestrator",
    "run-summary.json"
  );
  const coveragePath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "coverage-summary.json"
  );
  const parentReportTruthPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "parent-report-truth-audit.json"
  );
  const dataIntegrityPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "data-integrity-audit.json"
  );
  const diagnosticGroundTruthPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "diagnostic-ground-truth-report.json"
  );
  const similarQuestionsPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "similar-question-audit.json"
  );
  const parentRecommendationPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "parent-recommendation-audit.json"
  );
  const copilotTruthPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "parent-copilot-truth-audit.json"
  );
  const mobileRtlPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "mobile-rtl-audit.json"
  );
  const crossDevicePersistencePath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "cross-device-persistence-audit.json"
  );
  const failureRecoveryPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    date,
    "failure-recovery-audit.json"
  );

  const [
    nightlyRead,
    qmRead,
    orchRead,
    coverageRead,
    parentReportTruthRead,
    dataIntegrityRead,
    diagnosticGroundTruthRead,
    similarQuestionsRead,
    parentRecommendationRead,
    copilotTruthRead,
    mobileRtlRead,
    crossDevicePersistenceRead,
    failureRecoveryRead,
  ] = await Promise.all([
    readJsonSafe(nightlyPath),
    readJsonSafe(questionMetadataPath),
    readJsonSafe(orchestratorPath),
    readJsonSafe(coveragePath),
    readJsonSafe(parentReportTruthPath),
    readJsonSafe(dataIntegrityPath),
    readJsonSafe(diagnosticGroundTruthPath),
    readJsonSafe(similarQuestionsPath),
    readJsonSafe(parentRecommendationPath),
    readJsonSafe(copilotTruthPath),
    readJsonSafe(mobileRtlPath),
    readJsonSafe(crossDevicePersistencePath),
    readJsonSafe(failureRecoveryPath),
  ]);

  const layers = {
    nightly: buildNightlyLayer({
      runSummary: nightlyRead.data,
      summarySource: relSource(repoRoot, nightlyPath, nightlyRead.exists),
      runSummaryReadError: nightlyRead.error,
    }),
    coverage: buildCoverageLayer({
      coverage: coverageRead.data,
      source: relSource(repoRoot, coveragePath, coverageRead.exists),
      readError: coverageRead.error,
    }),
    parentReportTruth: buildParentReportTruthLayer({
      audit: parentReportTruthRead.data,
      source: relSource(repoRoot, parentReportTruthPath, parentReportTruthRead.exists),
      readError: parentReportTruthRead.error,
    }),
    dataIntegrity: buildDataIntegrityLayer({
      audit: dataIntegrityRead.data,
      source: relSource(repoRoot, dataIntegrityPath, dataIntegrityRead.exists),
      readError: dataIntegrityRead.error,
    }),
    diagnosticGroundTruth: buildDiagnosticGroundTruthLayer({
      report: diagnosticGroundTruthRead.data,
      source: relSource(repoRoot, diagnosticGroundTruthPath, diagnosticGroundTruthRead.exists),
      readError: diagnosticGroundTruthRead.error,
    }),
    similarQuestions: buildSimilarQuestionsLayer({
      audit: similarQuestionsRead.data,
      source: relSource(repoRoot, similarQuestionsPath, similarQuestionsRead.exists),
      readError: similarQuestionsRead.error,
    }),
    recommendation: buildParentRecommendationLayer({
      audit: parentRecommendationRead.data,
      source: relSource(repoRoot, parentRecommendationPath, parentRecommendationRead.exists),
      readError: parentRecommendationRead.error,
    }),
    copilotTruth: buildCopilotTruthLayer({
      audit: copilotTruthRead.data,
      source: relSource(repoRoot, copilotTruthPath, copilotTruthRead.exists),
      readError: copilotTruthRead.error,
    }),
    mobile: buildMobileRtlLayer({
      audit: mobileRtlRead.data,
      source: relSource(repoRoot, mobileRtlPath, mobileRtlRead.exists),
      readError: mobileRtlRead.error,
    }),
    crossDevicePersistence: buildCrossDevicePersistenceLayer({
      audit: crossDevicePersistenceRead.data,
      source: relSource(repoRoot, crossDevicePersistencePath, crossDevicePersistenceRead.exists),
      readError: crossDevicePersistenceRead.error,
    }),
    failureRecovery: buildFailureRecoveryLayer({
      audit: failureRecoveryRead.data,
      source: relSource(repoRoot, failureRecoveryPath, failureRecoveryRead.exists),
      readError: failureRecoveryRead.error,
    }),
    pdfExport: buildPdfExportLayer({
      orchestrator: orchRead.data,
      source: relSource(repoRoot, orchestratorPath, orchRead.exists),
    }),
    questionQuality: buildQuestionQualityLayer({
      qa: qmRead.data,
      source: relSource(repoRoot, questionMetadataPath, qmRead.exists),
    }),
  };

  const sources = {
    nightly: { path: relPath(repoRoot, nightlyPath), exists: nightlyRead.exists, readError: nightlyRead.error },
    questionMetadata: { path: relPath(repoRoot, questionMetadataPath), exists: qmRead.exists, readError: qmRead.error },
    orchestrator: { path: relPath(repoRoot, orchestratorPath), exists: orchRead.exists, readError: orchRead.error },
    coverage: { path: relPath(repoRoot, coveragePath), exists: coverageRead.exists, readError: coverageRead.error },
    parentReportTruth: {
      path: relPath(repoRoot, parentReportTruthPath),
      exists: parentReportTruthRead.exists,
      readError: parentReportTruthRead.error,
    },
    dataIntegrity: {
      path: relPath(repoRoot, dataIntegrityPath),
      exists: dataIntegrityRead.exists,
      readError: dataIntegrityRead.error,
    },
    diagnosticGroundTruth: {
      path: relPath(repoRoot, diagnosticGroundTruthPath),
      exists: diagnosticGroundTruthRead.exists,
      readError: diagnosticGroundTruthRead.error,
    },
    similarQuestions: {
      path: relPath(repoRoot, similarQuestionsPath),
      exists: similarQuestionsRead.exists,
      readError: similarQuestionsRead.error,
    },
    parentRecommendation: {
      path: relPath(repoRoot, parentRecommendationPath),
      exists: parentRecommendationRead.exists,
      readError: parentRecommendationRead.error,
    },
    copilotTruth: {
      path: relPath(repoRoot, copilotTruthPath),
      exists: copilotTruthRead.exists,
      readError: copilotTruthRead.error,
    },
    mobileRtl: {
      path: relPath(repoRoot, mobileRtlPath),
      exists: mobileRtlRead.exists,
      readError: mobileRtlRead.error,
    },
    crossDevicePersistence: {
      path: relPath(repoRoot, crossDevicePersistencePath),
      exists: crossDevicePersistenceRead.exists,
      readError: crossDevicePersistenceRead.error,
    },
    failureRecovery: {
      path: relPath(repoRoot, failureRecoveryPath),
      exists: failureRecoveryRead.exists,
      readError: failureRecoveryRead.error,
    },
  };

  // Top-level run metadata — surfaced separately so the CLI can put
  // `isFullNightlyRun` / `runKind` directly on LAUNCH_READINESS_DAILY.json
  // (E1.1 correction). When nightly is missing entirely, kind is `unknown`.
  const runMeta = {
    runKind: layers.nightly.runKind || "unknown",
    isFullNightlyRun: Boolean(layers.nightly.isFullNightlyRun),
    filterReason: layers.nightly.filterReason || null,
  };

  return { layers, sources, runMeta, coverageSummary: coverageRead.data };
}

/** Compute coverage gaps — prefers E2 coverage-summary when available. */
export function computeCoverageGaps({ layers, sources, coverageSummary }) {
  if (coverageSummary && Array.isArray(coverageSummary.gaps) && coverageSummary.gaps.length > 0) {
    return coverageSummary.gaps.map((g) => ({
      kind: g.kind,
      detail: g.detail,
      severity: g.severity || null,
      status: g.status || null,
    }));
  }

  // Fallback when coverage-summary not yet generated.
  if (!sources?.nightly?.exists) {
    return [
      {
        kind: "no-nightly-data",
        detail: "אין artifact של nightly לתאריך זה — לא ניתן לחשב כיסוי כלל.",
      },
    ];
  }
  return [];
}

/** Extract `lastNightlyStatus` for the JSON output (top-level field). */
export function extractLastNightlyStatus(layers) {
  const nightly = layers.nightly || {};
  // Prefer the source's run summary top-level status (encoded into layer summary).
  // But layer.status is already mapped (pass/warn/fail/not_run). Return that as canonical.
  return nightly.status || "not_run";
}

function relPath(repoRoot, absPath) {
  try {
    return path.relative(repoRoot, absPath).split(path.sep).join("/");
  } catch {
    return absPath;
  }
}

function relSource(repoRoot, absPath, exists) {
  const rel = relPath(repoRoot, absPath);
  return exists ? rel : null;
}
