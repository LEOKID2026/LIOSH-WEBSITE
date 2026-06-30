import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { buildEnglishAnalysisMarkdown } from "./english-analysis.mjs";
import { buildEngineDecisionDebugMarkdown } from "./engine-decision-debug.mjs";
import { buildParentAssignedDebugMarkdown } from "./parent-assigned-debug.mjs";
import { buildSpeedPressurePatchMarkdown } from "./speed-pressure-audit.mjs";
import {
  buildSpeedPressureBridgeDebugMarkdown,
  buildSpeedPressureBridgeCompareMarkdown,
} from "./speed-pressure-bridge-debug.mjs";
import {
  buildSpeedPressureTopicAlignmentDebugMarkdown,
} from "./speed-pressure-topic-alignment-debug.mjs";
import {
  buildTopicCoverageMarkdown,
  topicCoverageToCsv,
} from "./topic-coverage.mjs";
export async function ensureReportDir(reportDir) {
  await mkdir(reportDir, { recursive: true });
}

export async function writeJson(reportDir, name, data) {
  await writeFile(join(reportDir, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function writeProvisionManifest(reportDir, manifest) {
  await ensureReportDir(reportDir);
  await writeJson(reportDir, "manifest.json", manifest);
}

export async function writeCheckpoint(reportDir, checkpoint) {
  await ensureReportDir(reportDir);
  await writeJson(reportDir, "checkpoint.json", checkpoint);
}

export function buildQaAccountsMarkdown(parents, { studentPin, runId }) {
  const lines = [
    `# חשבונות QA — ${runId}`,
    "",
    "סיסמת הורים: כפי שהוגדרה ב־CLI (ברירת מחדל `747975`).",
    `PIN תלמיד (4 ספרות): \`${studentPin}\``,
    "",
    "| Parent | Email | Password | Children |",
    "| ------ | ----- | -------- | -------- |",
  ];

  for (const p of parents) {
    lines.push(`| QA Parent ${String(p.parentIndex).padStart(2, "0")} | ${p.email} | ${p.password} | ${p.childrenCount ?? p.children?.length ?? 0} |`);
  }

  lines.push("", "## ילדים לדוגמה (10 ראשונים)", "");
  const allChildren = parents.flatMap((p) =>
    (p.children || []).map((c) => ({ ...c, parentEmail: p.email })),
  );
  for (const c of allChildren.slice(0, 10)) {
    lines.push(`- **${c.displayName}** — login \`${c.login}\`, pin \`${studentPin}\`, parent ${c.parentEmail}`);
  }
  if (allChildren.length > 10) {
    lines.push(`- … ועוד ${allChildren.length - 10} ילדים (ראה manifest.json)`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildSummaryMarkdown(summary) {
  const lines = [
    `# Mass Virtual Students — Summary`,
    "",
    `**Run ID:** ${summary.runId}`,
    `**Final verdict:** ${summary.finalVerdict || summary.verdict}`,
    `**Infrastructure:** ${summary.infrastructureVerdict || "—"}`,
    `**Engine coverage:** ${summary.engineCoverageVerdict || "—"}`,
    "",
    "## ספירות",
    "",
    `1. הורים QA: ${summary.parentsCreated}`,
    `2. תלמידים: ${summary.studentsCreated}`,
    `3. תלמידים לפי כיתה: ${JSON.stringify(summary.studentsByGrade)}`,
    `4. תלמידים לפי מקצוע ראשי: ${JSON.stringify(summary.studentsBySubject)}`,
    `5. תלמידים לפי פרופיל: ${JSON.stringify(summary.studentsByProfile)}`,
    `6. ימי פעילות מדומים: ${summary.simulatedDays}`,
    `7. תשובות שנוצרו: ${summary.totalAnswers}`,
    `8. כיסוי מקצוע×כיתה: coverage.csv`,
    `8a. כיסוי מקצוע×כיתה×רמה: coverage-level.csv`,
    `8b. כיסוי topic-level: topic-coverage.csv (${summary.topicCoverage?.rows?.length ?? "—"} cells)`,
    `8c. subskill: ${summary.topicCoverage?.subskillNote || "—"}`,
    `9. נושאים עם כיסוי נמוך: ${summary.lowCoverageTopics?.join(", ") || "—"}`,
    `10. תתי־מיומנויות עם כיסוי נמוך: ${summary.lowCoverageSubskills?.join(", ") || "—"}`,
    `11. דוחות הורה שנוצרו: ${summary.reportsGenerated}`,
    `12. דוחות שנכשלו: ${summary.reportsFailed}`,
    `13. בעיות מנוע: ${summary.engineIssueCount}`,
    `14. בעיות ניסוח: ${summary.wordingIssues}`,
    `15. בעיות עברית: ${summary.hebrewIssues}`,
    `16. אנגלית אסורה: ${summary.englishIssues}`,
    `17. טקסטים טכניים: ${summary.technicalIssues}`,
    `18. APIs שנכשלו: ${summary.apiErrors}`,
    `19. APIs איטיים (>5s): ${summary.slowApis}`,
    "",
    "## מצבים אבחוניים",
    "",
    `נראו: ${summary.decisionsSeen?.join(", ") || "—"}`,
    `לא הופיעו: ${summary.missingDecisions?.join(", ") || "—"}`,
    "",
    "## engine-decision-debug",
    "",
    summary.engineDecisionDebug
      ? `- seen: ${summary.engineDecisionDebug.decisionsSeen?.join(", ") || "—"}`
      : "—",
    summary.engineDecisionDebug
      ? `- missing: ${summary.engineDecisionDebug.missingDecisions?.join(", ") || "—"}`
      : "",
    summary.engineDecisionDebug
      ? `- total topic findings: ${summary.engineDecisionDebug.totalTopicFindings ?? "—"}`
      : "",
    "",
    "## english analysis",
    "",
    summary.englishAnalysis?.conclusion || "—",
    summary.englishAnalysis?.recommendedCleanup
      ? `- technical cleanup (recommended): ${summary.englishAnalysis.recommendedCleanup.recommendation}`
      : "",
    "",
    "## blockers",
    "",
    summary.blockers?.length ? summary.blockers.map((b) => `- ${b}`).join("\n") : "—",
  ];
  return `${lines.join("\n")}\n`;
}

export function buildParentReportSamplesMarkdown(reportResults, limit = 5) {
  const lines = ["# Parent Report Samples", ""];
  const ok = reportResults.filter((r) => r.ok).slice(0, limit);
  for (const r of ok) {
    lines.push(`## ${r.login} (כיתה ${r.grade}, פרופיל ${r.profile})`);
    lines.push(`- engineDecisions: ${(r.engineDecisions || []).join(", ") || "—"}`);
    lines.push(`- englishHits: ${(r.englishHits || []).length}`);
    lines.push(`- technicalHits: ${(r.technicalHits || []).length}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function coverageToCsv(rows) {
  const header = "subject,grade,studentsPlanned,studentsSeeded";
  const body = rows.map((r) => `${r.subject},${r.grade},${r.studentsPlanned},${r.studentsSeeded}`).join("\n");
  return `${header}\n${body}\n`;
}

export function coverageLevelToCsv(rows) {
  const header = "subject,grade,displayLevel,studentsPlanned,studentsSeeded";
  const body = rows
    .map((r) => `${r.subject},${r.grade},${r.displayLevel},${r.studentsPlanned},${r.studentsSeeded}`)
    .join("\n");
  return `${header}\n${body}\n`;
}

export function engineFindingsToCsv(findings) {
  const header = "studentId,login,grade,profile,engineDecision";
  const body = findings
    .map((f) => `${f.studentId},${f.login},${f.grade},${f.profile},${f.engineDecision}`)
    .join("\n");
  return `${header}\n${body}\n`;
}

export async function writeAllArtifacts(reportDir, bundle) {
  await ensureReportDir(reportDir);
  await writeFile(join(reportDir, "summary.md"), buildSummaryMarkdown(bundle.summary), "utf8");
  await writeJson(reportDir, "summary.json", bundle.summary);
  if (bundle.summary?.englishAnalysis) {
    await writeJson(reportDir, "english-analysis.json", bundle.summary.englishAnalysis);
    await writeFile(
      join(reportDir, "english-analysis.md"),
      buildEnglishAnalysisMarkdown(bundle.summary.englishAnalysis),
      "utf8",
    );
  }
  if (bundle.summary?.engineDecisionDebug) {
    await writeJson(reportDir, "engine-decision-debug.json", bundle.summary.engineDecisionDebug);
    await writeFile(
      join(reportDir, "engine-decision-debug.md"),
      buildEngineDecisionDebugMarkdown(bundle.summary.engineDecisionDebug),
      "utf8",
    );
  }
  if (bundle.summary?.topicCoverage) {
    await writeJson(reportDir, "topic-coverage.json", bundle.summary.topicCoverage);
    await writeFile(
      join(reportDir, "topic-coverage.csv"),
      topicCoverageToCsv(bundle.summary.topicCoverage.rows || []),
      "utf8",
    );
    await writeFile(
      join(reportDir, "topic-coverage.md"),
      buildTopicCoverageMarkdown(bundle.summary.topicCoverage),
      "utf8",
    );
  }
  if (bundle.summary?.parentAssignedDebug) {
    await writeJson(reportDir, "parent-assigned-debug.json", bundle.summary.parentAssignedDebug);
    await writeFile(
      join(reportDir, "parent-assigned-debug.md"),
      buildParentAssignedDebugMarkdown(bundle.summary.parentAssignedDebug),
      "utf8",
    );
  }
  const speedAudit = bundle.summary?.speedPressurePatchAudit || bundle.summary?.speedPressureSeedAudit;
  if (speedAudit) {
    await writeJson(reportDir, "speed-pressure-patch.json", speedAudit);
    await writeFile(
      join(reportDir, "speed-pressure-patch.md"),
      buildSpeedPressurePatchMarkdown(speedAudit),
      "utf8",
    );
  }
  if (bundle.summary?.speedPressureBridgeDebug) {
    await writeJson(reportDir, "speed-pressure-bridge-debug.json", bundle.summary.speedPressureBridgeDebug);
    await writeFile(
      join(reportDir, "speed-pressure-bridge-debug.md"),
      buildSpeedPressureBridgeDebugMarkdown(bundle.summary.speedPressureBridgeDebug),
      "utf8",
    );
    if (bundle.summary.speedPressureBridgeCompare) {
      await writeJson(reportDir, "speed-pressure-bridge-compare.json", bundle.summary.speedPressureBridgeCompare);
      await writeFile(
        join(reportDir, "speed-pressure-bridge-compare.md"),
        buildSpeedPressureBridgeCompareMarkdown(bundle.summary.speedPressureBridgeCompare),
        "utf8",
      );
    }
  }
  if (bundle.summary?.speedPressureTopicAlignmentDebug) {
    await writeJson(reportDir, "speed-pressure-topic-alignment-debug.json", bundle.summary.speedPressureTopicAlignmentDebug);
    await writeFile(
      join(reportDir, "speed-pressure-topic-alignment-debug.md"),
      buildSpeedPressureTopicAlignmentDebugMarkdown(bundle.summary.speedPressureTopicAlignmentDebug),
      "utf8",
    );
  }
  await writeFile(
    join(reportDir, "qa-accounts.md"),
    buildQaAccountsMarkdown(bundle.parents, { studentPin: bundle.studentPin, runId: bundle.runId }),
    "utf8",
  );
  await writeFile(join(reportDir, "coverage.csv"), coverageToCsv(bundle.coverageRows), "utf8");
  if (bundle.coverageLevelRows?.length) {
    await writeFile(
      join(reportDir, "coverage-level.csv"),
      coverageLevelToCsv(bundle.coverageLevelRows),
      "utf8",
    );
  }
  await writeFile(join(reportDir, "engine-findings.csv"), engineFindingsToCsv(bundle.engineFindings), "utf8");
  await writeFile(
    join(reportDir, "parent-report-samples.md"),
    buildParentReportSamplesMarkdown(bundle.reportResults),
    "utf8",
  );
  await writeJson(reportDir, "errors.json", bundle.errors);
  await writeJson(reportDir, "manifest.json", bundle.manifest);
}
