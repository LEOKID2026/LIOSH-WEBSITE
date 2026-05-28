#!/usr/bin/env node
/**
 * Pack Teacher Guidance V2 review ZIP with preserved relative paths.
 * Run from repo root: node scripts/qa/pack-teacher-guidance-v2-review.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

const FILES = [
  "components/teacher-portal/SubjectSummaryCards.jsx",
  "components/teacher-portal/TeacherDashboardClient.jsx",
  "lib/school-portal/school-report-view-model.js",
  "lib/school-server/school-subjects.server.js",
  "lib/teacher-portal/teacher-ui.he.js",
  "lib/teacher-server/teacher-class-report.server.js",
  "lib/teacher-server/teacher-dashboard-activity.server.js",
  "lib/teacher-server/teacher-dashboard.server.js",
  "lib/teacher-server/teacher-report.server.js",
  "lib/teacher-server/teacher-guidance-v2.server.js",
  "pages/teacher/class/[classId].js",
  "pages/teacher/student/[studentId].js",
  "scripts/tests/teacher-guidance-v2-unit.mjs",
  "scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs",
  "scripts/qa/pack-teacher-guidance-v2-review.mjs",
  "docs/qa/TEACHER_GUIDANCE_V2_CLOSURE_REPORT.md",
];

const staging = path.join(root, "docs/qa/_teacher_guidance_v2_staging");
const zipPath = path.join(root, "docs/qa/teacher-guidance-v2-review.zip");

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

for (const rel of FILES) {
  const src = path.join(root, rel);
  const dest = path.join(staging, rel);
  if (!fs.existsSync(src)) {
    console.error(`Missing: ${rel}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.rmSync(zipPath, { force: true });
execSync(`tar -a -cf "${zipPath}" -C "${staging}" .`, { stdio: "inherit", shell: true });
fs.rmSync(staging, { recursive: true, force: true });

const tv = execSync(`tar -tvf "${zipPath}"`, { encoding: "utf8", shell: true }).trim();
const lines = tv ? tv.split(/\r?\n/) : [];
console.log("\nZIP contents (tar -tvf):");
console.log("---");
let total = 0;
for (const line of lines) {
  console.log(line);
  const m = line.match(/\s+(\d+)\s+\d{4}-\d{2}-\d{2}/);
  if (m) total += Number(m[1]);
}
const zipStat = fs.statSync(zipPath);
console.log("---");
console.log(`Entries: ${lines.length}`);
console.log(`Uncompressed total (parsed from listing): ${total} bytes`);
console.log(`ZIP file on disk: ${zipStat.size} bytes`);
console.log(`\nWritten: ${zipPath}`);
