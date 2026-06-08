#!/usr/bin/env node
/**
 * Verify launch-readiness policy registry and picker alignment.
 * npx tsx scripts/qa/verify-topic-launch-policy.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { curriculumTopicsFor } from "../lib/qa-curriculum-matrix.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  getAllTopicLaunchRows,
  getRegistryMeta,
  isTopicAllowedOnSurface,
  isTopicHiddenFromLaunch,
} = await import(href("lib/launch-readiness/topic-launch-policy.js"));
const { LAUNCH_SURFACES } = await import(href("lib/launch-readiness/launch-surfaces.js"));
const { topicOptionsForSubject } = await import(href("lib/teacher-portal/teacher-class-topic-options.js"));
const { topicOptionsForAssignedActivity } = await import(
  href("lib/classroom-activities/assigned-activity-topic-options.js")
);

const SUBJECTS = ["math", "geometry", "hebrew", "english", "science", "moledet_geography"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** @type {string[]} */
const violations = [];

function checkHideNotInPickers() {
  for (const subject of SUBJECTS) {
    for (const grade of GRADES) {
      const curriculum = curriculumTopicsFor(subject, grade);
      for (const topic of curriculum) {
        if (!isTopicHiddenFromLaunch(subject, grade, topic)) continue;
        const selfOpts = topicOptionsForSubject(subject, grade).map((o) => o.key);
        const assignOpts = topicOptionsForAssignedActivity(subject, grade).map((o) => o.key);
        if (selfOpts.includes(topic)) {
          violations.push(`HIDE topic visible in self-practice picker: ${subject}:${grade}:${topic}`);
        }
        if (assignOpts.includes(topic)) {
          violations.push(`HIDE topic visible in assign picker: ${subject}:${grade}:${topic}`);
        }
      }
    }
  }
}

function checkRegistryCoversCurriculum() {
  const rows = getAllTopicLaunchRows();
  const keys = new Set(rows.map((r) => `${r.subject}:${r.grade}:${r.topic}`));
  for (const subject of SUBJECTS) {
    for (const grade of GRADES) {
      for (const topic of curriculumTopicsFor(subject, grade)) {
        const key = `${subject}:${grade}:${topic}`;
        if (!keys.has(key)) {
          violations.push(`Missing registry row for curriculum cell: ${key}`);
        }
      }
    }
  }
}

function checkAssignSurfacesMatchPolicy() {
  for (const row of getAllTopicLaunchRows()) {
    const allowed = isTopicAllowedOnSurface(
      row.subject,
      row.grade,
      row.topic,
      LAUNCH_SURFACES.PARENT_ASSIGN
    );
    if (row.launchLevel === "HIDE" && allowed) {
      violations.push(`HIDE row allows parent_assign: ${row.cellKey}`);
    }
    if (
      (row.topic === "writing" || row.topic === "speaking") &&
      allowed &&
      row.launchLevel === "PRACTICE_ONLY"
    ) {
      violations.push(`PRACTICE_ONLY writing/speaking allows assign: ${row.cellKey}`);
    }
  }
}

async function checkNoParentServerImports() {
  const parentDir = join(ROOT, "lib", "parent-server");
  try {
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(parentDir, { recursive: true });
    for (const f of files) {
      if (typeof f !== "string" || !f.endsWith(".js")) continue;
      const content = await readFile(join(parentDir, f), "utf8");
      if (/launch-readiness/.test(content)) {
        violations.push(`launch-readiness import in parent-server: ${f}`);
      }
    }
  } catch {
    /* parent-server may be flat */
  }
}

async function main() {
  checkRegistryCoversCurriculum();
  checkHideNotInPickers();
  checkAssignSurfacesMatchPolicy();
  await checkNoParentServerImports();

  const meta = getRegistryMeta();
  const byLevel = { FULL: 0, LIMITED: 0, PRACTICE_ONLY: 0, HIDE: 0 };
  for (const row of getAllTopicLaunchRows()) {
    byLevel[row.launchLevel] = (byLevel[row.launchLevel] || 0) + 1;
  }

  console.log("Registry meta:", meta);
  console.log("By launch level:", byLevel);

  if (violations.length) {
    console.error("VIOLATIONS:");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log("PASS — launch-readiness policy verification");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
