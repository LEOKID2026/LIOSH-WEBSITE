/**
 * Launch Readiness — Parent Report Truth audit (pure logic, read-only).
 *
 * Evaluates parent-report artifacts for students present in suite.students
 * only. Never browses the live site, never writes to Supabase.
 */

import { classifyRunKind } from "./aggregator.mjs";
import { scanParentReportText } from "./raw-keys-blacklist.mjs";
import { snapshotHasText } from "./parent-report-snapshot-loader.mjs";

export const SCHEMA_VERSION = "parent-report-truth/v1";

const TEXT_SNAPSHOT_GLOBS = [
  /parent-report/i,
  /report-snapshot/i,
  /report-text/i,
  /populated.*\.(json|md|txt)$/i,
  /baseline.*\.(json|md|txt)$/i,
  /after.*\.(json|md|txt)$/i,
];

function extractStudentIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/studentId=([^&]+)/i);
  return m ? m[1] : null;
}

function fileMatchesStudent(filePath, label) {
  const base = filePath.replace(/\\/g, "/");
  const re = new RegExp(`(?:^|[-_/])${label}(?:[-_/]|\\.)`, "i");
  return re.test(base) || base.includes(`-${label}-`) || base.includes(`_${label}_`);
}

function fileHasPattern(filePath, pattern) {
  return filePath.replace(/\\/g, "/").toLowerCase().includes(pattern.toLowerCase());
}

function isTextSnapshotFile(filePath) {
  const lower = filePath.replace(/\\/g, "/").toLowerCase();
  if (!/\.(json|md|txt|html)$/i.test(lower)) return false;
  if (/run-summary|plan\.json|state-snapshot|failure-repro/i.test(lower)) return false;
  return TEXT_SNAPSHOT_GLOBS.some((re) => re.test(lower));
}

function isScreenshotFile(filePath) {
  return /\.(png|jpg|jpeg|webp)$/i.test(filePath);
}

function sumAnswered(sessions) {
  if (!Array.isArray(sessions)) return 0;
  return sessions.reduce((sum, s) => sum + Number(s?.answeredCount || 0), 0);
}

function studiedInPlan(planStudents, label) {
  const entry = planStudents?.[label];
  return entry?.studied === true;
}

/**
 * Build parent report truth audit from run-summary + scanned artifact paths.
 *
 * @param {Object} params
 * @param {string} params.date
 * @param {string} params.sourceDir  relative path to nightly artifacts root
 * @param {object|null} params.runSummary
 * @param {string[]} params.artifactFiles  relative paths under sourceDir
 * @param {Map<string,{baseline:object|null,after:object|null}>} params.parentReportSnapshots
 */
export function buildParentReportTruthAudit({
  date,
  sourceDir,
  runSummary,
  artifactFiles = [],
  textContents = new Map(),
  parentReportSnapshots = new Map(),
}) {
  if (!runSummary) {
    return {
      date,
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      sourceDir,
      runKind: "unknown",
      isFullNightlyRun: false,
      filterReason: null,
      overallStatus: "not_run",
      blockers: [],
      warnings: [
        {
          severity: "P1",
          detail: `לא נמצא run-summary.json תחת ${sourceDir} — לא ניתן לבדוק דוחות הורים.`,
          source: sourceDir,
          action: "העתק artifact של nightly או הרץ nightly מחדש.",
        },
      ],
      students: [],
      summary: `אין run-summary — ביקורת דוחות הורים לא בוצעה.`,
    };
  }

  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);
  const suite = runSummary.suite || {};
  const suiteStudents = Array.isArray(suite.students) ? suite.students : [];
  const planStudents = runSummary.plan?.students || {};
  const crossMatrix = Array.isArray(suite.crossStudentMatrix) ? suite.crossStudentMatrix : [];

  const blockers = [];
  const warnings = [];
  const students = [];

  if (!isFullNightlyRun) {
    warnings.push({
      severity: "P1",
      detail:
        `ביקורת דוחות הורים מבוססת על ריצה מסוננת/ממוקדת (runKind=${runKind}) — ` +
        `נבדקו רק ${suiteStudents.length} תלמיד(ים) מ-suite, לא כל 12.`,
      source: sourceDir,
      action: "הרץ nightly מלאה לפני שמכריזים על readiness של דוחות הורים.",
    });
  }

  // Cross-student URL consistency across entire suite
  const studentIdByLabel = {};
  for (const s of suiteStudents) {
    const id =
      extractStudentIdFromUrl(s.reportUrlAtAfter) ||
      extractStudentIdFromUrl(s.reportUrlAtBaseline);
    if (id) studentIdByLabel[s.label] = id;
  }
  const uniqueIds = [...new Set(Object.values(studentIdByLabel))];

  for (const student of suiteStudents) {
    const label = student.label;
    if (!label) continue;

    const studentFiles = artifactFiles.filter((f) => fileMatchesStudent(f, label));
    const screenshotFiles = studentFiles.filter(isScreenshotFile);
    const textFiles = studentFiles.filter(isTextSnapshotFile);

    const baselineScreenshotFound = screenshotFiles.some((f) =>
      fileHasPattern(f, "baseline-populated")
    );
    const afterScreenshotFound = screenshotFiles.some((f) =>
      fileHasPattern(f, "after-populated")
    );
    const baselineDashboardFound = screenshotFiles.some((f) =>
      fileHasPattern(f, "baseline-parent-dashboard")
    );
    const afterDashboardFound = screenshotFiles.some((f) =>
      fileHasPattern(f, "after-parent-dashboard")
    );

    const reportArtifactsFound =
      baselineScreenshotFound ||
      afterScreenshotFound ||
      Boolean(student.reportUrlAtBaseline || student.reportUrlAtAfter);

    const structuredSnapshots = parentReportSnapshots.get(label) || {
      baseline: null,
      after: null,
    };
    const snapshotJsonFiles = [];
    if (structuredSnapshots.baseline) {
      snapshotJsonFiles.push(`parent-report-snapshots/${label}-baseline.json`);
    }
    if (structuredSnapshots.after) {
      snapshotJsonFiles.push(`parent-report-snapshots/${label}-after.json`);
    }

    // Collect text from snapshot files for this student
    const textParts = [];
    for (const tf of textFiles) {
      const content = textContents.get(tf);
      if (content) textParts.push(content);
    }
    for (const snap of [structuredSnapshots.baseline, structuredSnapshots.after]) {
      if (snap?.normalizedVisibleText) textParts.push(snap.normalizedVisibleText);
      else if (snap?.visibleText) textParts.push(snap.visibleText);
    }
    const textSnapshotFound =
      snapshotJsonFiles.length > 0 ||
      textParts.some((t) => String(t || "").trim().length > 0);

    // ---- studentIdentityCheck ----
    const expectedLabel = label;
    const snapshotName =
      structuredSnapshots.after?.detectedStudentNameOrLabel ||
      structuredSnapshots.baseline?.detectedStudentNameOrLabel ||
      null;
    const foundLabelOrName = snapshotName || student.expectedDisplayName || null;
    let identityStatus = "unknown";
    if (foundLabelOrName && student.dashboardVisible === true) {
      identityStatus = "pass";
    } else if (foundLabelOrName) {
      identityStatus = "warn";
    } else if (student.reportUrlAtAfter || student.reportUrlAtBaseline) {
      identityStatus = "warn";
    }

    const reportStudentId =
      extractStudentIdFromUrl(student.reportUrlAtAfter) ||
      extractStudentIdFromUrl(student.reportUrlAtBaseline);
    if (reportStudentId && uniqueIds.length > 1) {
      const othersWithSameId = Object.entries(studentIdByLabel).filter(
        ([l, id]) => l !== label && id === reportStudentId
      );
      if (othersWithSameId.length > 0) {
        identityStatus = "fail";
      }
    }

    // ---- activityEvidenceCheck ----
    const answeredInSessions = sumAnswered(student.sessions);
    const matrixRow = crossMatrix.find((r) => r.studentLabel === label);
    const totalAnswered = matrixRow?.totalAnswered ?? answeredInSessions;
    const deltaTotal = student.delta?.totalDelta;
    const ownSubjects = student.classification?.ownSubjects || [];
    let activityStatus = "unknown";
    let activityDetails = "";

    if (afterScreenshotFound && totalAnswered > 0) {
      activityStatus = "pass";
      activityDetails =
        `after-populated screenshot exists; ${totalAnswered} answers recorded` +
        (deltaTotal != null ? `; delta.total=${deltaTotal}` : "") +
        (ownSubjects.length ? `; ownSubjects=${ownSubjects.join(",")}` : "");
    } else if (
      structuredSnapshots.after &&
      snapshotHasText(structuredSnapshots.after) &&
      totalAnswered > 0
    ) {
      activityStatus = "pass";
      activityDetails =
        `after parent-report text snapshot exists; ${totalAnswered} answers recorded` +
        (deltaTotal != null ? `; delta.total=${deltaTotal}` : "");
    } else if (afterScreenshotFound) {
      activityStatus = "warn";
      activityDetails = "after-populated screenshot exists but no answered count in metadata";
    } else if (studiedInPlan(planStudents, label) || answeredInSessions > 0) {
      activityStatus = "fail";
      activityDetails = "studied student has no after-populated report artifact";
    } else {
      activityStatus = "unknown";
      activityDetails = "student not studied or no activity metadata";
    }

    // ---- rawKeysCheck / engineJargonCheck ----
    let rawKeysStatus = "unknown";
    let engineJargonStatus = "unknown";
    let rawMatches = [];
    let jargonMatches = [];

    if (textSnapshotFound) {
      const afterSnap = structuredSnapshots.after;
      const baselineSnap = structuredSnapshots.baseline;
      const precomputedRaw = [
        ...(afterSnap?.detectedRawKeys || []),
        ...(baselineSnap?.detectedRawKeys || []),
      ];
      const precomputedJargon = [
        ...(afterSnap?.detectedEngineJargon || []),
        ...(baselineSnap?.detectedEngineJargon || []),
      ];

      if (precomputedRaw.length > 0 || precomputedJargon.length > 0) {
        rawMatches = (afterSnap?.rawKeyMatches || baselineSnap?.rawKeyMatches || []).slice();
        jargonMatches = (
          afterSnap?.engineJargonMatches ||
          baselineSnap?.engineJargonMatches ||
          []
        ).slice();
        if (rawMatches.length === 0 && precomputedRaw.length > 0) {
          rawMatches = precomputedRaw.map((token) => ({ token, context: "" }));
        }
        if (jargonMatches.length === 0 && precomputedJargon.length > 0) {
          jargonMatches = precomputedJargon.map((token) => ({ token, context: "" }));
        }
      } else {
        const combined = textParts.join("\n");
        const scan = scanParentReportText(combined);
        rawMatches = scan.rawKeys;
        jargonMatches = scan.engineJargon;
      }
      rawKeysStatus = rawMatches.length > 0 ? "fail" : "pass";
      engineJargonStatus = jargonMatches.length > 0 ? "fail" : "pass";
    }

    // ---- crossStudentMismatchCheck ----
    let crossStatus = "unknown";
    let crossDetails = "";
    if (matrixRow) {
      if (matrixRow.bleedOk === false || (matrixRow.bleedFindings?.length > 0)) {
        crossStatus = "fail";
        crossDetails = `bleed detected: ${JSON.stringify(matrixRow.bleedFindings || []).slice(0, 200)}`;
      } else if (matrixRow.bleedOk === true) {
        crossStatus = "pass";
        crossDetails = "crossStudentMatrix bleedOk=true for this student";
      }
    } else if (suiteStudents.length === 1) {
      crossStatus = "pass";
      crossDetails = "single student in suite — no cross-student comparison needed";
    }

    const studentRecord = {
      label,
      grade: student.grade ?? planStudents[label]?.grade ?? null,
      status: student.status || "unknown",
      reportArtifactsFound,
      baselineScreenshotFound,
      afterScreenshotFound,
      baselineDashboardFound,
      afterDashboardFound,
      textSnapshotFound,
      parentReportSnapshotFiles: snapshotJsonFiles,
      screenshotFiles: screenshotFiles.map((f) => f.replace(/\\/g, "/")),
      textSnapshotFiles: [
        ...textFiles.map((f) => f.replace(/\\/g, "/")),
        ...snapshotJsonFiles,
      ],
      reportUrlAtBaseline: student.reportUrlAtBaseline || null,
      reportUrlAtAfter: student.reportUrlAtAfter || null,
      studentIdentityCheck: {
        expectedLabel,
        foundLabelOrName,
        status: identityStatus,
      },
      activityEvidenceCheck: {
        status: activityStatus,
        details: activityDetails,
      },
      rawKeysCheck: {
        status: rawKeysStatus,
        matches: rawMatches,
      },
      engineJargonCheck: {
        status: engineJargonStatus,
        matches: jargonMatches,
      },
      crossStudentMismatchCheck: {
        status: crossStatus,
        details: crossDetails,
      },
    };

    students.push(studentRecord);

    // Per-student blockers/warnings
    const isStudied =
      studiedInPlan(planStudents, label) ||
      answeredInSessions > 0 ||
      (student.sessions?.length || 0) > 0;

    if (isStudied && !afterScreenshotFound && !student.reportUrlAtAfter) {
      blockers.push({
        severity: "P0",
        detail: `${label}: תלמיד למד אך אין artifact של דוח הורים after-populated.`,
        source: sourceDir,
        action: "בדוק screenshots/ ו-failure-repro.md.",
      });
    } else if (isStudied && !afterScreenshotFound && student.reportUrlAtAfter) {
      warnings.push({
        severity: "P1",
        detail: `${label}: reportUrlAtAfter קיים אך חסר screenshot after-populated.`,
        source: sourceDir,
        action: "וודא שה-runner שמר screenshot; MVP מקבל URL כראיה חלקית.",
      });
    }

    if (identityStatus === "fail") {
      blockers.push({
        severity: "P0",
        detail: `${label}: חשד ל-cross-student mismatch ב-report URL/studentId.`,
        source: sourceDir,
        action: "בדוק reportUrlAtBaseline/After ב-run-summary.json.",
      });
    }

    if (activityStatus === "fail") {
      blockers.push({
        severity: "P0",
        detail: `${label}: ${activityDetails}`,
        source: sourceDir,
        action: "וודא שהדוח מתמלא אחרי למידה.",
      });
    }

    if (crossStatus === "fail") {
      blockers.push({
        severity: "P0",
        detail: `${label}: ${crossDetails}`,
        source: sourceDir,
        action: "קריטי לפרטיות — עצור ובדוק bleed.",
      });
    }

    if (rawKeysStatus === "fail") {
      blockers.push({
        severity: "P0",
        detail: `${label}: raw keys leaked in parent report text: ${rawMatches.map((m) => m.token).join(", ")}`,
        source: sourceDir,
        action: "תקן תצוגת דוח הורים — מפתחות פנימיים גלויים.",
      });
    }

    if (engineJargonStatus === "fail") {
      blockers.push({
        severity: "P0",
        detail: `${label}: engine jargon in parent report text: ${jargonMatches.map((m) => m.token).join(", ")}`,
        source: sourceDir,
        action: "הסר ז'רגון פנימי מתצוגת ההורה.",
      });
    }

    if (!textSnapshotFound) {
      warnings.push({
        severity: "P1",
        detail: `${label}: No text snapshot available for raw key scan — screenshot-only evidence.`,
        source: sourceDir,
        action: "MVP: raw-key scan unknown until text snapshot artifact exists.",
      });
    }
  }

  // ---- overallStatus ----
  let overallStatus = "pass";
  if (students.length === 0) {
    overallStatus = "not_run";
    warnings.push({
      severity: "P1",
      detail: "אין תלמידים ב-suite.students — לא ניתן לבדוק דוחות הורים.",
      source: sourceDir,
      action: "הרץ nightly עם לפחות תלמיד אחד ב-suite.",
    });
  } else if (blockers.length > 0) {
    overallStatus = "fail";
  } else if (
    warnings.length > 0 ||
    !isFullNightlyRun ||
    students.some(
      (s) =>
        s.rawKeysCheck.status === "unknown" ||
        s.activityEvidenceCheck.status === "warn"
    )
  ) {
    overallStatus = "warn";
  }

  const checkedLabels = students.map((s) => s.label).join(", ");
  const summary = isFullNightlyRun
    ? `נבדקו ${students.length} דוחות הורים (${checkedLabels}): artifacts=${students.filter((s) => s.reportArtifactsFound).length}/${students.length}, overallStatus=${overallStatus}.`
    : `ריצה מסוננת — נבדקו ${students.length} מתוך 12 דוחות בלבד (${checkedLabels}). ` +
      `לא מוכיח readiness מלא. overallStatus=${overallStatus}.`;

  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceDir,
    runKind,
    isFullNightlyRun,
    filterReason,
    overallStatus,
    blockers,
    warnings,
    students,
    summary,
  };
}

/** Render parent-report-truth-audit.md */
export function buildParentReportTruthMarkdown(report) {
  const lines = [];
  lines.push(`# Parent Report Truth Audit — ${report.date}`);
  lines.push("");
  lines.push(`> Schema: \`${report.schemaVersion}\` · נוצר ב-${report.generatedAt}`);
  lines.push(`> מקור: \`${report.sourceDir}\``);
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
      "> ⚠️ ריצה מסוננת — **לא** נבדקו כל 12 דוחות ההורים. אין להכריז על readiness מלא."
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

  lines.push(`## תלמידים שנבדקו (${report.students.length})`);
  lines.push("");
  for (const s of report.students) {
    lines.push(`### ${s.label} (grade ${s.grade ?? "—"}, status=${s.status})`);
    lines.push("");
    lines.push("| בדיקה | תוצאה |");
    lines.push("|-------|--------|");
    lines.push(`| report artifacts | ${s.reportArtifactsFound ? "yes" : "no"} |`);
    lines.push(`| baseline screenshot | ${s.baselineScreenshotFound ? "yes" : "no"} |`);
    lines.push(`| after screenshot | ${s.afterScreenshotFound ? "yes" : "no"} |`);
    lines.push(`| text snapshot | ${s.textSnapshotFound ? "yes" : "no"} |`);
    lines.push(`| identity | ${s.studentIdentityCheck.status} |`);
    lines.push(`| activity evidence | ${s.activityEvidenceCheck.status} — ${s.activityEvidenceCheck.details} |`);
    lines.push(`| raw keys | ${s.rawKeysCheck.status}${s.rawKeysCheck.matches?.length ? ` (${s.rawKeysCheck.matches.length} matches)` : ""} |`);
    lines.push(`| engine jargon | ${s.engineJargonCheck.status}${s.engineJargonCheck.matches?.length ? ` (${s.engineJargonCheck.matches.length} matches)` : ""} |`);
    lines.push(`| cross-student | ${s.crossStudentMismatchCheck.status} — ${s.crossStudentMismatchCheck.details} |`);
    if (s.screenshotFiles?.length) {
      lines.push("");
      lines.push("Screenshots:");
      for (const f of s.screenshotFiles) lines.push(`- \`${f}\``);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "> MVP בלבד: לא נבדקה דיוק מספרי מלא, לא Copilot, לא Supabase row-level audit."
  );
  lines.push("");

  return lines.join("\n");
}
