/**
 * Artifact writer for reports/school-sim-backfill/<from>__<to>/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { weekStartSunday } from "./backfill-date-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

export function repoRoot() {
  return REPO_ROOT;
}

export function backfillArtifactRoot(fromIso, toIso) {
  const root = path.join(REPO_ROOT, "reports", "school-sim-backfill", `${fromIso}__${toIso}`);
  for (const sub of [
    "days",
    "weeks",
    "months",
    "final",
    "home-practice",
    "home-practice/screenshots",
  ]) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
  return root;
}

export function writeJson(root, relativePath, data) {
  const full = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return full;
}

export function writeText(root, relativePath, text) {
  const full = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text, "utf8");
  return full;
}

export function weekFolderName(fromIso) {
  return `week-${weekStartSunday(fromIso).replace(/-/g, "")}`;
}

export function buildBackfillSummaryMarkdown(summary) {
  const lines = [];
  lines.push(`# School Sim Backfill — ${summary.fromDate} → ${summary.toDate}`);
  lines.push("");
  lines.push(`**Status:** ${summary.overallStatus}`);
  lines.push(`**School days simulated:** ${summary.schoolDaysSimulated}`);
  lines.push(`**Activities created:** ${summary.activitiesCreated ?? 0}`);
  lines.push(`**Home-practice scope:** ${summary.homePracticeScope ?? "none"}`);
  lines.push(`**Home-practice sessions:** ${summary.homePracticeSessionsCreated ?? 0}`);
  lines.push(`**UI checkpoints:** ${summary.uiCheckpointsPassed ?? 0}/${summary.uiCheckpointsRan ?? 0} pass`);
  lines.push(`**Report checkpoints:** ${summary.reportCheckpointsPassed ?? 0}/${summary.reportCheckpointsRan ?? 0} pass`);
  lines.push("");
  if (summary.blockers?.length) {
    lines.push("## P0 blockers");
    for (const b of summary.blockers) lines.push(`- ${b}`);
    lines.push("");
  }
  if (summary.warnings?.length) {
    lines.push("## P1 warnings");
    for (const w of summary.warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  lines.push(`Artifact root: \`${summary.artifactRoot}\``);
  return lines.join("\n");
}

export function buildHomePracticeSampleMarkdown(manifest) {
  const lines = [];
  lines.push(`# Home-Practice Sample — ${manifest.fromDate} → ${manifest.toDate}`);
  lines.push("");
  lines.push(`Scope: **${manifest.scope}** | Students: **${manifest.totalStudents}** | Sessions: **${manifest.totalSessions}** | Answers: **${manifest.totalAnswers}**`);
  lines.push("");
  for (const s of manifest.students || []) {
    lines.push(`## ${s.fullName || s.studentId}`);
    lines.push("");
    lines.push(`- Grade: ${s.grade} | Class: ${s.physicalClass} | Persona: ${s.personaType}${s.weakSubject ? ` | Weak: ${s.weakSubject}` : ""}`);
    lines.push(`- Sessions: ${s.totalSessions} | Answers: ${s.totalAnswers}`);
    lines.push("");
    lines.push("### R1 — Parent API (learning sessions only)");
    lines.push(`- Route: \`${s.r1ApiCheck?.apiRoute || ""}\``);
    lines.push(`- Example: \`${s.r1ApiCheck?.exampleCall || ""}\``);
    if (s.r1ApiCheck?.r1ExpectedRanges) {
      for (const [k, r] of Object.entries(s.r1ApiCheck.r1ExpectedRanges)) {
        lines.push(`- ${k}: ${r.from} → ${r.to} expected answers ${r.expectedAnswers}${r.note ? ` (${r.note})` : ""}`);
      }
    }
    lines.push("");
    lines.push("### R3 — Teacher bridge (classroom + home-practice)");
    lines.push(`- API: \`${s.r3TeacherBridge?.apiRoute || ""}\``);
    if (s.r3TeacherBridge?.manualBrowserUrl) {
      lines.push(`- Browser: \`${s.r3TeacherBridge.manualBrowserUrl}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}
