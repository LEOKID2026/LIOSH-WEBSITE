/**
 * Launch Readiness — Diagnostic Ground Truth audit (MVP, read-only).
 *
 * Compares persona expectations against available diagnostic artifacts.
 * No Supabase, no Playwright, no diagnostic engine changes.
 */

import { classifyRunKind } from "./aggregator.mjs";
import {
  derivePersonaExpectations,
  computeMatchStatus,
  PERSONA_MAPPING_ASSUMPTIONS,
} from "./persona-truth-helpers.mjs";
import { scanParentReportText } from "./raw-keys-blacklist.mjs";

export const SCHEMA_VERSION = "diagnostic-ground-truth/v1";

const SUBJECT_KEYS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet-geography",
];

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/");
}

function extractStudentLabelFromAfterSnapshotPath(filePath) {
  const m = normalizePath(filePath).match(/parent-report-snapshots\/([^/]+)-after\.json$/i);
  return m ? m[1] : null;
}

function listStudentAfterSnapshotLabels(diagnosticTextFiles) {
  return new Set(
    diagnosticTextFiles
      .map((f) => extractStudentLabelFromAfterSnapshotPath(f.path))
      .filter(Boolean)
  );
}

function studentAfterSnapshotFile(label, diagnosticTextFiles) {
  const suffix = `parent-report-snapshots/${label}-after.json`;
  return diagnosticTextFiles.find((f) => {
    const p = normalizePath(f.path);
    return p.endsWith(suffix) || p.includes(`/${suffix}`);
  });
}

function filterStudentAfterSnapshotFiles(label, diagnosticTextFiles) {
  return diagnosticTextFiles.filter((f) =>
    normalizePath(f.path).includes(`parent-report-snapshots/${label}-after.json`)
  );
}

const WEAKNESS_DIAGNOSIS_MARKERS = [
  "נקודות לשיפור",
  "תחומים דורשים תשומת לב",
  "דורש תשומת לב",
  "חולש",
  "לשיפור",
  "weakness",
];

function parseSnapshotJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** P0 false-positive requires explicit weakness language in the student's own snapshot. */
function snapshotSupportsWeaknessP0(snapshotParsed) {
  if (!snapshotParsed || snapshotParsed.source !== "rendered-parent-report-page") {
    return false;
  }
  const text = snapshotParsed.normalizedVisibleText || snapshotParsed.visibleText || "";
  const hasWeaknessLanguage = WEAKNESS_DIAGNOSIS_MARKERS.some((m) => text.includes(m));
  if (!hasWeaknessLanguage) return false;
  const diagnosticSubjects = snapshotParsed.detectedDiagnosticSubjects || [];
  if (diagnosticSubjects.length === 0) return false;
  const units = snapshotParsed.detectedDiagnosticUnits || [];
  const hasWeaknessUnit = units.some((u) =>
    WEAKNESS_DIAGNOSIS_MARKERS.some((m) => String(u).includes(m))
  );
  return hasWeaknessUnit || hasWeaknessLanguage;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumAnswered(sessions) {
  if (!Array.isArray(sessions)) return 0;
  return sessions.reduce((s, sess) => s + num(sess?.answeredCount), 0);
}

function subjectsFromSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  return [...new Set(sessions.map((s) => s?.subject).filter(Boolean))];
}

/** Walk JSON for diagnostic/recommendation subject hints (conservative). */
function extractSubjectsFromObject(obj, foundDiag, foundRec, depth = 0) {
  if (!obj || depth > 8) return;
  if (Array.isArray(obj)) {
    for (const item of obj) extractSubjectsFromObject(item, foundDiag, foundRec, depth + 1);
    return;
  }
  if (typeof obj !== "object") return;

  for (const [key, val] of Object.entries(obj)) {
    const kl = key.toLowerCase();
    if (
      kl.includes("diagnostic") ||
      kl.includes("weakness") ||
      kl === "weaksubjects" ||
      kl === "weak_units"
    ) {
      collectSubjects(val, foundDiag);
    }
    if (kl.includes("recommend") || kl === "recommendedsubjects") {
      collectSubjects(val, foundRec);
    }
    if (typeof val === "object") extractSubjectsFromObject(val, foundDiag, foundRec, depth + 1);
  }
}

/** Parse E5.1 parent-report-snapshot JSON into diagnostic evidence. */
function applyParentReportSnapshotJson(parsed, foundDiag, foundRec, state) {
  if (!parsed || parsed.source !== "rendered-parent-report-page") return false;
  if (Array.isArray(parsed.detectedDiagnosticSubjects)) {
    for (const s of parsed.detectedDiagnosticSubjects) {
      if (SUBJECT_KEYS.includes(s)) foundDiag.add(s);
    }
  }
  if (Array.isArray(parsed.detectedRecommendations)) {
    for (const s of parsed.detectedRecommendations) {
      if (SUBJECT_KEYS.includes(s)) foundRec.add(s);
    }
  }
  if (Array.isArray(parsed.detectedDiagnosticUnits) && parsed.detectedDiagnosticUnits.length > 0) {
    state.diagnosticUnits = true;
  }
  if (parsed.detectedRecommendations?.length > 0) {
    state.recommendations = true;
  }
  const text = parsed.normalizedVisibleText || parsed.visibleText || "";
  if (foundDiag.size === 0 && text) {
    deriveDiagnosticSubjectsFromVisibleText(text, foundDiag);
  }
  return snapshotHasText(parsed);
}

function deriveDiagnosticSubjectsFromVisibleText(text, foundDiag) {
  const normalized = String(text || "");
  const weaknessMarkers = [
    "נקודות לשיפור",
    "תחומים דורשים תשומת לב",
    "דורש תשומת לב",
    "חולש",
    "לשיפור",
  ];
  if (!weaknessMarkers.some((m) => normalized.includes(m))) return;
  for (const subj of SUBJECT_KEYS) {
    const heMap = {
      math: ["חשבון", "מתמטיקה"],
      geometry: ["גאומטריה"],
      english: ["אנגלית"],
      hebrew: ["עברית"],
      science: ["מדעים"],
      "moledet-geography": ["מולדת", "גאוגרפיה"],
    };
    const labels = heMap[subj] || [];
    if (normalized.toLowerCase().includes(subj) || labels.some((l) => normalized.includes(l))) {
      foundDiag.add(subj);
    }
  }
}

function snapshotHasText(evidence) {
  return Boolean(
    evidence &&
      (String(evidence.visibleText || "").trim() ||
        String(evidence.normalizedVisibleText || "").trim())
  );
}

function collectSubjects(val, set) {
  if (typeof val === "string" && SUBJECT_KEYS.includes(val)) {
    set.add(val);
    return;
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      if (typeof item === "string" && SUBJECT_KEYS.includes(item)) set.add(item);
      else if (item && typeof item === "object") {
        const subj = item.subject || item.subjectId || item.subjectKey;
        if (SUBJECT_KEYS.includes(subj)) set.add(subj);
      }
    }
    return;
  }
  if (val && typeof val === "object") {
    for (const k of Object.keys(val)) {
      if (SUBJECT_KEYS.includes(k)) set.add(k);
    }
  }
}

/**
 * Extract diagnostic evidence from all available read-only inputs.
 */
export function extractDiagnosticEvidence({
  runSummary,
  stateSnapshot,
  parentReportTruth,
  diagnosticTextFiles = [],
}) {
  const actualDiagnosticSubjects = new Set();
  const actualRecommendationSubjects = new Set();
  let diagnosticUnits = false;
  let recommendations = false;
  let parentReportSnapshot = false;
  let runSummaryEvidence = false;

  for (const { path, text } of diagnosticTextFiles) {
    try {
      const parsed = JSON.parse(text);
      const snapState = { diagnosticUnits: false, recommendations: false };
      if (applyParentReportSnapshotJson(parsed, actualDiagnosticSubjects, actualRecommendationSubjects, snapState)) {
        parentReportSnapshot = true;
        diagnosticUnits = diagnosticUnits || snapState.diagnosticUnits;
        recommendations = recommendations || snapState.recommendations;
        continue;
      }
      parentReportSnapshot = true;
      extractSubjectsFromObject(parsed, actualDiagnosticSubjects, actualRecommendationSubjects);
      if (
        parsed.diagnosticUnits ||
        parsed.weaknesses ||
        parsed.diagnosticSummary
      ) {
        diagnosticUnits = true;
      }
      if (parsed.recommendations || parsed.recommendedSubjects) {
        recommendations = true;
      }
    } catch {
      // Plain text — look for subject keys near diagnostic Hebrew/English tokens
      const lower = text.toLowerCase();
      if (/diagnos|weakness|חולש|מומלץ|recommend/i.test(text)) {
        for (const subj of SUBJECT_KEYS) {
          if (lower.includes(subj)) actualDiagnosticSubjects.add(subj);
        }
        diagnosticUnits = diagnosticUnits || /unit|יחיד|diagnos/i.test(text);
        recommendations = recommendations || /recommend|מומלץ/i.test(text);
      }
    }
  }

  if (runSummary) {
    extractSubjectsFromObject(runSummary, actualDiagnosticSubjects, actualRecommendationSubjects);
    // Explicit diagnostic report sections in run-summary (if runner adds them later)
    const suite = runSummary.suite || {};
    if (suite.diagnosticReport || suite.parentReportDiagnosis) {
      runSummaryEvidence = true;
      diagnosticUnits = true;
      extractSubjectsFromObject(
        suite.diagnosticReport || suite.parentReportDiagnosis,
        actualDiagnosticSubjects,
        actualRecommendationSubjects
      );
    }
  }

  if (stateSnapshot?.students) {
    extractSubjectsFromObject(stateSnapshot, actualDiagnosticSubjects, actualRecommendationSubjects);
    // state performance alone is NOT diagnostic units — do not set diagnosticUnits=true
  }

  return {
    actualDiagnosticSubjects: [...actualDiagnosticSubjects],
    actualRecommendationSubjects: [...actualRecommendationSubjects],
    evidenceAvailable: {
      runSummary: Boolean(runSummary),
      parentReportSnapshot,
      diagnosticUnits: diagnosticUnits || actualDiagnosticSubjects.size > 0,
      recommendations: recommendations || actualRecommendationSubjects.size > 0,
      runSummaryDiagnosticFields: runSummaryEvidence,
    },
  };
}

/**
 * Build the full diagnostic ground-truth report.
 */
export function buildDiagnosticGroundTruthReport({
  date,
  sourceDir,
  runSummary,
  stateSnapshot,
  parentReportTruth,
  diagnosticTextFiles = [],
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
          detail: `לא נמצא run-summary.json — ביקורת diagnostic ground truth לא בוצעה.`,
          source: sourceDir,
          action: "העתק artifact של nightly.",
        },
      ],
      students: [],
      personaMappingAssumptions: PERSONA_MAPPING_ASSUMPTIONS,
      summary: "אין run-summary — diagnostic ground truth לא חושב.",
    };
  }

  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);
  const suite = runSummary.suite || {};
  const suiteStudents = Array.isArray(suite.students) ? suite.students : [];
  const planStudents = runSummary.plan?.students || {};

  const blockers = [];
  const warnings = [];
  const students = [];

  warnings.push({
    severity: "P1",
    detail:
      "Diagnostic Ground Truth MVP — לא נבדקו skill-level units, Supabase rows, או מנוע האבחון המלא.",
    source: sourceDir,
    action: "שכבת Full (E5+) תדרוש artifacts של diagnostic units + multi-run trend.",
  });

  if (!isFullNightlyRun) {
    warnings.push({
      severity: "P1",
      detail:
        `מקור מסונן (runKind=${runKind}) — נבדקו ${suiteStudents.length} תלמיד(ים) בלבד, לא כל 12 personas.`,
      source: sourceDir,
      action: "הרץ nightly מלאה לפני readiness אבחוני.",
    });
  }

  if (suiteStudents.length === 1) {
    warnings.push({
      severity: "P1",
      detail: "רק תלמיד אחד ב-suite — אין הוכחת diagnostic ground truth לכל הטבלה.",
      source: sourceDir,
      action: "הרץ nightly מלאה.",
    });
  }

  const snapshotLabels = listStudentAfterSnapshotLabels(diagnosticTextFiles);
  const suiteLabels = suiteStudents.map((s) => s.label).filter(Boolean);
  const withSnapshot = suiteLabels.filter((l) => snapshotLabels.has(l));
  const missingSnapshot = suiteLabels.filter((l) => !snapshotLabels.has(l));

  if (suiteLabels.length > 0 && missingSnapshot.length > 0) {
    warnings.push({
      severity: "P1",
      detail:
        `Diagnostic artifact coverage incomplete: ${withSnapshot.length}/${suiteLabels.length} students have parent-report diagnostic snapshots. Missing: ${missingSnapshot.join(", ")}`,
      source: sourceDir,
      action: "הרץ qa:capture:parent-report-snapshots עבור התלמידים החסרים.",
    });
  }

  const globalEvidence = extractDiagnosticEvidence({
    runSummary: null,
    stateSnapshot: null,
    parentReportTruth: null,
    diagnosticTextFiles,
  });

  if (
    !globalEvidence.evidenceAvailable.diagnosticUnits &&
    !globalEvidence.evidenceAvailable.parentReportSnapshot
  ) {
    warnings.push({
      severity: "P1",
      detail:
        "No diagnostic text/unit artifact available for ground-truth comparison.",
      source: sourceDir,
      action: "הוסף parent-report text snapshot ל-artifacts או הרץ runner עם diagnostic export.",
    });
  }

  for (const student of suiteStudents) {
    const label = student.label;
    if (!label) continue;

    const persona = derivePersonaExpectations(label);
    const planEntry = planStudents[label] || {};
    const sessions = Array.isArray(student.sessions) ? student.sessions : [];
    const subjectsSeen = subjectsFromSessions(sessions);
    const answeredQuestions = sumAnswered(sessions);
    const studied =
      planEntry.studied === true ||
      sessions.length > 0 ||
      answeredQuestions > 0;

    const studentBlockers = [];
    const studentWarnings = [];

    const hasStudentAfterSnapshot = Boolean(studentAfterSnapshotFile(label, diagnosticTextFiles));
    const studentSnapshotFiles = hasStudentAfterSnapshot
      ? filterStudentAfterSnapshotFiles(label, diagnosticTextFiles)
      : [];

    const evidence = extractDiagnosticEvidence({
      runSummary: null,
      stateSnapshot: null,
      parentReportTruth: null,
      diagnosticTextFiles: studentSnapshotFiles,
    });

    evidence.evidenceAvailable = {
      runSummary: true,
      parentReportSnapshot: hasStudentAfterSnapshot,
      diagnosticUnits: hasStudentAfterSnapshot && evidence.evidenceAvailable.diagnosticUnits,
      recommendations: hasStudentAfterSnapshot && evidence.evidenceAvailable.recommendations,
    };

    if (!hasStudentAfterSnapshot) {
      evidence.actualDiagnosticSubjects = [];
      evidence.actualRecommendationSubjects = [];
    }

    // Scan diagnostic text for raw keys if text exists
    for (const { text } of studentSnapshotFiles) {
      const scan = scanParentReportText(text);
      if (scan.rawKeys.length > 0) {
        studentBlockers.push({
          severity: "P0",
          detail: `${label}: raw keys in diagnostic text: ${scan.rawKeys.map((m) => m.token).join(", ")}`,
          source: sourceDir,
          action: "תקן תצוגת אבחון — מפתחות פנימיים גלויים.",
        });
      }
    }

    const studentSnapshotParsed = studentSnapshotFiles.length
      ? parseSnapshotJson(studentSnapshotFiles[0].text)
      : null;
    const supportsWeaknessP0 = snapshotSupportsWeaknessP0(studentSnapshotParsed);

    let matchStatus = persona
      ? computeMatchStatus({
          expectedWeakSubjects: persona.expectedWeakSubjects,
          expectedStrongSubjects: persona.expectedStrongSubjects,
          actualDiagnosticSubjects: evidence.actualDiagnosticSubjects,
          actualRecommendationSubjects: [],
          evidenceAvailable: evidence.evidenceAvailable,
          answeredQuestions,
          isStrongPersona: persona.isStrongPersona,
          thinDataPersona: persona.thinDataPersona,
          expectedTrend: persona.expectedTrend,
        })
      : "unknown";

    const hasStudentDiagnosticEvidence =
      hasStudentAfterSnapshot &&
      (evidence.evidenceAvailable.diagnosticUnits ||
        evidence.actualDiagnosticSubjects.length > 0 ||
        evidence.actualRecommendationSubjects.length > 0);

    if (!hasStudentAfterSnapshot) {
      matchStatus = "unknown";
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: No student-specific parent-report diagnostic artifact available`,
        source: sourceDir,
        action: "הרץ qa:capture:parent-report-snapshots עבור תלמיד זה.",
      });
    } else if (matchStatus === "false_positive" && !supportsWeaknessP0) {
      matchStatus = evidence.actualDiagnosticSubjects.length > 0 ? "partial" : "unknown";
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: diagnostic subjects present in report but no explicit weakness diagnosis confirmed — not escalated to P0.`,
        source: sourceDir,
        action: "MVP: P0 false-positive דורש שפה/יחידות חולשה מפורשות ב-after.json של התלמיד.",
      });
    }

    if (!persona) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: לא נמצא persona ב-student-personas.mjs.`,
        source: sourceDir,
        action: "הוסף persona או בדוק label.",
      });
    }

    if (matchStatus === "unknown" && hasStudentAfterSnapshot) {
      const afterSnapPath = studentAfterSnapshotFile(label, diagnosticTextFiles);
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: expected weakness cannot be validated — diagnostic evidence insufficient in parent-report snapshot (see limitations in ${afterSnapPath?.path || "after.json"}).`,
        source: sourceDir,
        action: "ספק parent-report diagnostic snapshot עם detectedDiagnosticSubjects/units.",
      });
    }

    if (matchStatus === "thin_data") {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: thin_data — לא מספיק תשובות/artifacts לאבחון (${answeredQuestions} answered).`,
        source: sourceDir,
        action: "הרץ session מלאה + diagnostic export.",
      });
    }

    if (
      persona &&
      (persona.expectedTrend === "improving" || persona.expectedTrend === "declining")
    ) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: trend persona (${persona.expectedTrend}) — לא ניתן לאמת trend מריצה אחת.`,
        source: sourceDir,
        action: "דורש multi-run artifacts.",
      });
    }

    if (hasStudentAfterSnapshot && !evidence.evidenceAvailable.recommendations) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: recommendations missing from available artifacts.`,
        source: sourceDir,
        action: "הוסף recommendation snapshot ל-artifacts.",
      });
    }

    // P0 blockers only with student-specific explicit weakness diagnosis
    if (
      matchStatus === "false_positive" &&
      hasStudentDiagnosticEvidence &&
      supportsWeaknessP0 &&
      persona &&
      persona.isStrongPersona &&
      persona.expectedWeakSubjects.length === 0
    ) {
      const detail =
        `${label}: false-positive risk — persona ${persona.personaKind} ` +
        `(expected weak: none) ` +
        `but actual weakness diagnostic subjects: ${evidence.actualDiagnosticSubjects.join(",")}`;
      studentBlockers.push({
        severity: "P0",
        detail,
        source: sourceDir,
        action: "בדוק מנוע אבחון — חולשה על תלמיד חזק או מקצוע חזק.",
      });
    }

    if (
      matchStatus === "miss" &&
      hasStudentDiagnosticEvidence &&
      evidence.evidenceAvailable.diagnosticUnits
    ) {
      studentBlockers.push({
        severity: "P0",
        detail:
          `${label}: expected weak ${(persona?.expectedWeakSubjects || []).join(",")} ` +
          `but diagnosis shows unrelated subjects: ${evidence.actualDiagnosticSubjects.join(",")}`,
        source: sourceDir,
        action: "בדוק התאמת אבחון ל-persona weakness.",
      });
    }

    for (const b of studentBlockers) blockers.push(b);
    for (const w of studentWarnings) warnings.push(w);

    students.push({
      label,
      grade: student.grade ?? planEntry.grade ?? null,
      runStatus: student.status || "unknown",
      studied,
      subjectsSeen,
      answeredQuestions,
      personaProfile: persona?.personaProfile ?? null,
      personaKind: persona?.personaKind ?? null,
      expectedWeakSubjects: persona?.expectedWeakSubjects ?? [],
      expectedStrongSubjects: persona?.expectedStrongSubjects ?? [],
      expectedTrend: persona?.expectedTrend ?? null,
      evidenceAvailable: evidence.evidenceAvailable,
      actualDiagnosticSubjects: evidence.actualDiagnosticSubjects,
      actualRecommendationSubjects: evidence.actualRecommendationSubjects,
      matchStatus,
      blockers: studentBlockers,
      warnings: studentWarnings,
      details:
        matchStatus === "unknown"
          ? "No diagnostic units/text in artifacts — cannot claim pass or fail."
          : matchStatus === "thin_data"
          ? `Only ${answeredQuestions} answers / limited session data for diagnostic claim.`
          : `Persona ${persona?.personaKind || "?"}: expected weak [${(persona?.expectedWeakSubjects || []).join(", ")}], ` +
            `actual diagnostic [${evidence.actualDiagnosticSubjects.join(", ")}], ` +
            `recommendations [${evidence.actualRecommendationSubjects.join(", ")}].`,
    });
  }

  let overallStatus = "pass";
  if (students.length === 0) {
    overallStatus = "not_run";
    warnings.push({
      severity: "P1",
      detail: "אין תלמידים ב-suite.students.",
      source: sourceDir,
      action: "הרץ nightly.",
    });
  } else if (blockers.length > 0) {
    overallStatus = "fail";
  } else if (
    warnings.length > 0 ||
    !isFullNightlyRun ||
    students.some((s) => ["unknown", "thin_data", "partial"].includes(s.matchStatus))
  ) {
    overallStatus = "warn";
  }

  const checked = students.map((s) => s.label).join(", ");
  const summary = isFullNightlyRun
    ? `Diagnostic ground truth MVP: ${students.length} personas (${checked}), overallStatus=${overallStatus}.`
    : `ריצה מסוננת — נבדקו ${students.length} personas בלבד (${checked}). ` +
      `אין הוכחת readiness אבחוני מלא. overallStatus=${overallStatus}.`;

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
    personaMappingAssumptions: PERSONA_MAPPING_ASSUMPTIONS,
    summary,
  };
}

/** Render diagnostic-ground-truth-report.md */
export function buildDiagnosticGroundTruthMarkdown(report) {
  const lines = [];
  lines.push(`# Diagnostic Ground Truth (MVP) — ${report.date}`);
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
    lines.push("> ⚠️ ריצה מסוננת — **לא** נבדקו כל 12 personas.");
  }
  lines.push("");
  lines.push("> MVP: לא skill-level, לא Supabase, לא מנוע אבחון.");
  lines.push("");

  lines.push(`## חוסמים (P0) — ${report.blockers.length}`);
  if (report.blockers.length === 0) lines.push("אין.");
  else for (const b of report.blockers) lines.push(`- ${b.detail}`);
  lines.push("");

  lines.push(`## אזהרות (P1) — ${report.warnings.length}`);
  if (report.warnings.length === 0) lines.push("אין.");
  else for (const w of report.warnings) lines.push(`- ${w.detail}`);
  lines.push("");

  lines.push(`## Personas (${report.students.length})`);
  lines.push("");
  lines.push("| label | persona | expected weak | actual diag | matchStatus | answered |");
  lines.push("|-------|---------|---------------|-------------|-------------|----------|");
  for (const s of report.students) {
    lines.push(
      `| ${s.label} | ${s.personaKind || "—"} | ${(s.expectedWeakSubjects || []).join(", ") || "—"} | ${(s.actualDiagnosticSubjects || []).join(", ") || "—"} | ${s.matchStatus} | ${s.answeredQuestions} |`
    );
  }
  lines.push("");

  lines.push(`## הנחות MVP`);
  for (const a of report.personaMappingAssumptions || []) lines.push(`- ${a}`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("> Read-only aggregation. Full diagnostic truth requires broader artifacts.");
  lines.push("");

  return lines.join("\n");
}
