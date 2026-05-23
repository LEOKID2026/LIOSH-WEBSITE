/**
 * Launch Readiness — Parent Recommendation Audit (E7 MVP).
 *
 * Read-only: compares persona expected weaknesses against parent-report
 * snapshot recommendation evidence. No Supabase, no Playwright, no product changes.
 */

import { classifyRunKind } from "./aggregator.mjs";
import { derivePersonaExpectations } from "./persona-truth-helpers.mjs";
import { scanParentReportText } from "./raw-keys-blacklist.mjs";
import { snapshotHasText } from "./parent-report-snapshot-loader.mjs";

export const SCHEMA_VERSION = "parent-recommendation-audit/v1";

const SUBJECT_KEYS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet-geography",
];

const SUBJECT_HEbrew = {
  math: ["חשבון", "מתמטיקה"],
  geometry: ["גאומטריה", "גיאומטריה"],
  english: ["אנגלית"],
  hebrew: ["עברית"],
  science: ["מדעים"],
  "moledet-geography": ["מולדת", "גאוגרפיה"],
};

const GENERIC_PATTERNS = [
  /^להמשיך לתרגל$/u,
  /^לתרגל יותר$/u,
  /מומלץ להמשיך עם שגרת תרגול/u,
  /תרגול קצר וממוקד(?!.*(?:אנגלית|עברית|חשבון|גאומטריה|מדעים|מולדת))/u,
  /להמשיך תרגול קצר ומדויק עם משימה אחת/u,
  /לעקוב לאורך זמן ולתת לתמונה להתגבש/u,
];

const MEDICAL_CLAIM_PATTERNS = [
  /ADHD/i,
  /דיסלקצ/i,
  /הפרעת קשב/i,
  /אבחון רפואי/i,
  /טיפול פסיכולוג/i,
  /הפרעה נוירו/i,
];

const RECOMMENDATION_SECTION_MARKERS = [
  "💡 המלצות",
  "המלצה:",
  "מומלץ",
  "כדאי להמשיך לחזק",
  "תחומים לחיזוק",
  "טיפים לבית",
  "יעדים לשבוע הקרוב",
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function subjectsFromSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  return [...new Set(sessions.map((s) => s?.subject).filter(Boolean))];
}

function detectSubjectsInText(text) {
  const found = new Set();
  const normalized = String(text || "");
  for (const subj of SUBJECT_KEYS) {
    if (normalized.toLowerCase().includes(subj)) found.add(subj);
    for (const he of SUBJECT_HEbrew[subj] || []) {
      if (normalized.includes(he)) found.add(subj);
    }
  }
  return [...found];
}

function isTooGeneric(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 8) return true;
  for (const re of GENERIC_PATTERNS) {
    if (re.test(t)) return true;
  }
  if (/מומלץ|המלצ|כדאי|תרגול/u.test(t) && detectSubjectsInText(t).length === 0) {
    return true;
  }
  return false;
}

function hasMedicalClaim(text) {
  return MEDICAL_CLAIM_PATTERNS.some((re) => re.test(String(text || "")));
}

/**
 * Extract recommendation-like snippets from parent-report snapshot text.
 */
export function extractRecommendationSnippets(snapshot) {
  const text = snapshot?.normalizedVisibleText || snapshot?.visibleText || "";
  if (!text.trim()) return [];

  const snippets = [];
  const seen = new Set();

  for (const marker of RECOMMENDATION_SECTION_MARKERS) {
    let idx = 0;
    while (idx < text.length) {
      const pos = text.indexOf(marker, idx);
      if (pos < 0) break;
      const slice = text.slice(pos, pos + 280).trim();
      const key = slice.slice(0, 80);
      if (!seen.has(key)) {
        seen.add(key);
        snippets.push({
          textSnippet: slice,
          detectedSubjects: detectSubjectsInText(slice),
          marker,
        });
      }
      idx = pos + marker.length;
    }
  }

  // Subject-specific "כדאי להמשיך לחזק את X" lines
  const strengthenRe = /כדאי להמשיך לחזק את [^.·]{3,80}/gu;
  for (const m of text.matchAll(strengthenRe)) {
    const slice = m[0].trim();
    const key = slice.slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      snippets.push({
        textSnippet: slice,
        detectedSubjects: detectSubjectsInText(slice),
        marker: "כדאי להמשיך לחזק",
      });
    }
  }

  return snippets.slice(0, 30);
}

function triBool(value) {
  if (value === true) return true;
  if (value === false) return false;
  return "unknown";
}

function computeRecommendationAlignment({
  expectedWeakSubjects,
  detectedRecommendationSubjects,
  subjectsSeen,
  snapshotAvailable,
  recommendationCount,
  hasGenericOnly,
  isFullNightlyRun,
}) {
  if (!snapshotAvailable) return "unknown";
  if (recommendationCount === 0 && expectedWeakSubjects.length > 0) return "miss";
  if (recommendationCount === 0) return "unknown";

  const expected = expectedWeakSubjects || [];
  const detected = detectedRecommendationSubjects || [];
  const hits = expected.filter((s) => detected.includes(s));
  const misses = expected.filter((s) => !detected.includes(s));

  if (expected.length === 0) {
    return detected.length > 0 ? "partial" : "unknown";
  }

  if (hits.length === 0) return "miss";

  const extras = detected.filter((s) => !expected.includes(s) && !subjectsSeen.includes(s));
  const broadExtras = detected.filter((s) => !expected.includes(s));

  if (hits.length === expected.length && broadExtras.length === 0 && !hasGenericOnly) {
    return isFullNightlyRun ? "pass" : "partial";
  }

  if (hits.length > 0 && (broadExtras.length > 0 || hasGenericOnly || !isFullNightlyRun)) {
    return "partial";
  }

  if (hits.length > 0 && misses.length > 0) return "partial";

  return "partial";
}

function buildRecommendationRecords(studentLabel, snapshot, expectedWeakSubjects, subjectsSeen) {
  const snippets = snapshot ? extractRecommendationSnippets(snapshot) : [];
  const records = [];

  for (const snip of snippets) {
    const alignedExpected = expectedWeakSubjects.some((s) => snip.detectedSubjects.includes(s));
    const alignedObserved = subjectsSeen.some((s) => snip.detectedSubjects.includes(s));
    const generic = isTooGeneric(snip.textSnippet);
    const scan = scanParentReportText(snip.textSnippet);
    const medical = hasMedicalClaim(snip.textSnippet);

    let status = "unknown";
    if (medical || scan.rawKeys.length > 0) status = "fail";
    else if (alignedExpected) status = generic ? "warn" : "pass";
    else if (generic) status = "warn";
    else if (snip.detectedSubjects.length === 0) status = "warn";
    else status = "warn";

    const notes = [];
    if (generic) notes.push("generic recommendation text (MVP warning)");
    if (alignedExpected) notes.push("matches expected persona weakness subject");
    if (!alignedExpected && expectedWeakSubjects.length) {
      notes.push("does not mention expected weak subject in snippet");
    }
    if (alignedObserved) notes.push("aligned to subject seen in run-summary sessions");

    records.push({
      studentLabel,
      source: snapshot ? "parent-report-snapshot-after" : "none",
      rawText: snip.textSnippet,
      textSnippet: snip.textSnippet.slice(0, 200),
      detectedSubjects: snip.detectedSubjects,
      alignedToExpectedWeakness: triBool(alignedExpected),
      alignedToObservedSubject: triBool(alignedObserved),
      isTooGeneric: triBool(generic),
      status,
      notes,
      rawKeyMatches: scan.rawKeys,
      engineJargonMatches: scan.engineJargon,
    });
  }

  if (records.length === 0 && snapshot?.detectedRecommendations?.length) {
    for (const subj of snapshot.detectedRecommendations) {
      records.push({
        studentLabel,
        source: "parent-report-snapshot-after-detectedRecommendations",
        rawText: null,
        textSnippet: `(subject-level detection only: ${subj})`,
        detectedSubjects: [subj],
        alignedToExpectedWeakness: triBool(expectedWeakSubjects.includes(subj)),
        alignedToObservedSubject: triBool(subjectsSeen.includes(subj)),
        isTooGeneric: "unknown",
        status: expectedWeakSubjects.includes(subj) ? "pass" : "warn",
        notes: ["derived from detectedRecommendations[] only — no discrete snippet"],
      });
    }
  }

  return records;
}

export function buildParentRecommendationAudit({
  date,
  sourceDir,
  runSummary,
  parentReportSnapshots = new Map(),
  diagnosticGroundTruth = null,
  parentReportTruth = null,
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
          detail: "לא נמצא run-summary.json — ביקורת המלצות הורים לא בוצעה.",
          source: sourceDir,
          action: "העתק artifact של nightly.",
        },
      ],
      students: [],
      recommendations: [],
      summary: "אין run-summary — parent recommendation audit לא חושב.",
    };
  }

  const { runKind, isFullNightlyRun, filterReason } = classifyRunKind(runSummary);
  const suiteStudents = Array.isArray(runSummary.suite?.students)
    ? runSummary.suite.students
    : [];
  const planStudents = runSummary.plan?.students || {};

  const blockers = [];
  const warnings = [];
  const students = [];
  const allRecommendations = [];

  warnings.push({
    severity: "P1",
    detail:
      "Parent Recommendation Audit MVP — לא נבדק Copilot, לא semantic scoring מלא, לא Supabase.",
    source: sourceDir,
    action: "שכבה מלאה תדרוש nightly מלאה + grade-aware scoring.",
  });

  if (!isFullNightlyRun) {
    warnings.push({
      severity: "P1",
      detail:
        `מקור מסונן (runKind=${runKind}) — נבדקו ${suiteStudents.length} תלמיד(ים) בלבד; ` +
        `אין הוכחת recommendation readiness לכל 12 personas.`,
      source: sourceDir,
      action: "הרץ nightly מלאה (ללא --students) לפני readiness המלצות.",
    });
  }

  if (suiteStudents.length === 1) {
    warnings.push({
      severity: "P1",
      detail:
        "רק תלמיד אחד ב-suite — artifact מסונן (למשל AAA7 validation); זו לא כיסוי readiness מלא.",
      source: sourceDir,
      action: "הרץ nightly מלאה לכל 12 personas.",
    });
  }

  for (const student of suiteStudents) {
    const label = student.label;
    if (!label) continue;

    const persona = derivePersonaExpectations(label);
    const planEntry = planStudents[label] || {};
    const sessions = Array.isArray(student.sessions) ? student.sessions : [];
    const studied =
      planEntry.studied === true ||
      sessions.length > 0 ||
      sessions.reduce((n, s) => n + num(s?.answeredCount), 0) > 0;
    const subjectsSeen = subjectsFromSessions(sessions);
    const expectedWeakSubjects = persona?.expectedWeakSubjects || [];

    const snapshots = parentReportSnapshots.get(label) || { baseline: null, after: null };
    const afterSnapshot = snapshots.after;
    const snapshotAvailable = Boolean(afterSnapshot && snapshotHasText(afterSnapshot));

    const detectedRecommendationSubjects = snapshotAvailable
      ? [...new Set(afterSnapshot.detectedRecommendations || [])]
      : [];
    const detectedDiagnosticSubjects = snapshotAvailable
      ? [...new Set(afterSnapshot.detectedDiagnosticSubjects || [])]
      : [];

    const studentBlockers = [];
    const studentWarnings = [];

    if (!snapshotAvailable) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: no parent-report-snapshot after.json — recommendations unknown.`,
        source: `${sourceDir}/parent-report-snapshots`,
        action: "הרץ capture-parent-report-snapshots או nightly עם E5.1 artifacts.",
      });
    }

    const recRecords = buildRecommendationRecords(
      label,
      afterSnapshot,
      expectedWeakSubjects,
      subjectsSeen
    );
    allRecommendations.push(...recRecords);

    const hasGenericOnly =
      recRecords.length > 0 && recRecords.every((r) => r.isTooGeneric === true);
    const recommendationCount = recRecords.length;

    if (hasGenericOnly) {
      studentWarnings.push({
        severity: "P1",
        detail: `${label}: recommendation snippets appear generic (no clear subject/action).`,
        source: sourceDir,
        action: "MVP warning only — review parent report copy specificity.",
      });
    }

    const alignment = computeRecommendationAlignment({
      expectedWeakSubjects,
      detectedRecommendationSubjects,
      subjectsSeen,
      snapshotAvailable,
      recommendationCount,
      hasGenericOnly,
      isFullNightlyRun,
    });

    if (alignment === "miss" && expectedWeakSubjects.length > 0) {
      studentWarnings.push({
        severity: "P1",
        detail:
          `${label}: expected weak [${expectedWeakSubjects.join(",")}] but no matching recommendation subject in snapshot.`,
        source: sourceDir,
        action: "בדוק שהדוח ממליץ על מקצוע החולשה.",
      });
    }

    if (alignment === "partial" && expectedWeakSubjects.length > 0) {
      const hits = expectedWeakSubjects.filter((s) =>
        detectedRecommendationSubjects.includes(s)
      );
      const extras = detectedRecommendationSubjects.filter(
        (s) => !expectedWeakSubjects.includes(s)
      );
      if (hits.length > 0 && extras.length > 0) {
        studentWarnings.push({
          severity: "P1",
          detail:
            `${label}: recommendations include expected weak [${hits.join(",")}] ` +
            `but also broad subjects [${extras.join(",")}] — partial alignment only.`,
          source: sourceDir,
          action: "MVP: broad report is warn, not blocker, unless clearly unrelated main weakness.",
        });
      }
    }

    for (const rec of recRecords) {
      if (rec.rawKeyMatches?.length > 0) {
        studentBlockers.push({
          severity: "P0",
          detail: `${label}: raw keys in recommendation text: ${rec.rawKeyMatches.map((m) => m.token).join(", ")}`,
          source: sourceDir,
          action: "תקן תצוגת המלצות — מפתחות פנימיים גלויים.",
        });
      }
      if (hasMedicalClaim(rec.rawText || rec.textSnippet)) {
        studentBlockers.push({
          severity: "P0",
          detail: `${label}: unsupported medical/psychological claim in recommendation text.`,
          source: sourceDir,
          action: "הסר claim רפואי/פסיכולוגי מתצוגת ההורה.",
        });
      }
    }

    const wrongStudentName =
      afterSnapshot?.detectedStudentNameOrLabel &&
      student.expectedDisplayName &&
      afterSnapshot.detectedStudentNameOrLabel !== student.expectedDisplayName;
    if (wrongStudentName) {
      studentBlockers.push({
        severity: "P0",
        detail: `${label}: recommendation snapshot student name mismatch.`,
        source: sourceDir,
        action: "בדוק cross-student bleed בדוח.",
      });
    }

    for (const b of studentBlockers) blockers.push(b);
    for (const w of studentWarnings) warnings.push(w);

    students.push({
      label,
      grade: student.grade ?? planEntry.grade ?? null,
      runStatus: student.status || "unknown",
      studied,
      personaKind: persona?.personaKind ?? null,
      expectedWeakSubjects,
      subjectsSeen,
      detectedDiagnosticSubjects,
      detectedRecommendationSubjects,
      recommendationCount,
      recommendationAlignment: alignment,
      snapshotAvailable,
      blockers: studentBlockers,
      warnings: studentWarnings,
      details:
        !snapshotAvailable
          ? "No after snapshot — recommendation alignment unknown."
          : alignment === "pass"
          ? `Recommendations align with expected weak [${expectedWeakSubjects.join(", ")}].`
          : alignment === "partial"
          ? `Partial: expected weak [${expectedWeakSubjects.join(", ")}], detected rec subjects [${detectedRecommendationSubjects.join(", ")}].`
          : alignment === "miss"
          ? `Expected weak [${expectedWeakSubjects.join(", ")}] not found in recommendation subjects.`
          : `Recommendation evidence inspected at subject level (${recommendationCount} snippets).`,
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
    students.some((s) =>
      ["unknown", "partial", "miss", "thin_data"].includes(s.recommendationAlignment)
    )
  ) {
    overallStatus = "warn";
  }

  const checked = students.map((s) => s.label).join(", ");
  const summary = isFullNightlyRun
    ? `Parent recommendation MVP: ${students.length} students (${checked}), overallStatus=${overallStatus}.`
    : `ריצה מסוננת — נבדקו ${students.length} students (${checked}) בלבד. ` +
      `artifact ממוקד (לא readiness מלא). overallStatus=${overallStatus}.`;

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
    recommendations: allRecommendations,
    summary,
    meta: {
      diagnosticGroundTruthUsed: Boolean(diagnosticGroundTruth),
      parentReportTruthUsed: Boolean(parentReportTruth),
    },
  };
}

export function buildParentRecommendationMarkdown(report) {
  const lines = [];
  lines.push(`# Parent Recommendation Audit — ${report.date}`);
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
      "> ⚠️ ריצה מסוננת — **לא** נבדקו המלצות לכל 12 personas. AAA7 (אם קיים) הוא artifact validation, לא bug פתוח."
    );
  }
  lines.push("");
  lines.push("> MVP: subject-level alignment בלבד; לא Copilot; לא Supabase.");
  lines.push("");

  lines.push(`## חוסמים (P0) — ${report.blockers.length}`);
  if (report.blockers.length === 0) lines.push("אין.");
  else for (const b of report.blockers) lines.push(`- ${b.detail}`);
  lines.push("");

  lines.push(`## אזהרות (P1) — ${report.warnings.length}`);
  if (report.warnings.length === 0) lines.push("אין.");
  else for (const w of report.warnings) lines.push(`- ${w.detail}`);
  lines.push("");

  lines.push(`## תלמידים (${report.students.length})`);
  lines.push("");
  lines.push("| label | expected weak | rec subjects | alignment | count |");
  lines.push("|-------|---------------|--------------|-----------|-------|");
  for (const s of report.students) {
    lines.push(
      `| ${s.label} | ${(s.expectedWeakSubjects || []).join(", ") || "—"} | ${(s.detectedRecommendationSubjects || []).join(", ") || "—"} | ${s.recommendationAlignment} | ${s.recommendationCount} |`
    );
  }
  lines.push("");

  const sampleRecs = (report.recommendations || []).slice(0, 6);
  lines.push(`## דוגמאות המלצות (${sampleRecs.length}/${(report.recommendations || []).length})`);
  lines.push("");
  for (const r of sampleRecs) {
    lines.push(`- **${r.studentLabel}** [${r.status}] ${r.textSnippet?.slice(0, 120) || "—"}`);
    if (r.detectedSubjects?.length) {
      lines.push(`  subjects: ${r.detectedSubjects.join(", ")}`);
    }
  }
  if (sampleRecs.length === 0) lines.push("אין snippets.");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("> Read-only. Full recommendation proof requires full nightly + richer snapshots.");
  lines.push("");

  return lines.join("\n");
}
