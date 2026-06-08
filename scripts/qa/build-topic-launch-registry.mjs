#!/usr/bin/env node
/**
 * Build data/launch-readiness/topic-launch-registry.json from inventory matrix.
 * npx tsx scripts/qa/build-topic-launch-registry.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { curriculumTopicsFor } from "../lib/qa-curriculum-matrix.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { buildRegistryRow } = await import(href("lib/launch-readiness/compute-launch-row.js"));

const SUBJECTS = ["math", "geometry", "hebrew", "english", "science", "moledet_geography"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

function aggregateInventory(rows) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const row of rows) {
    const key = `${row.subject}:${row.grade}:${row.topic}`;
    if (!map.has(key)) {
      map.set(key, {
        topicTotal: 0,
        byLevel: {},
        criticalBlocking: false,
        needsAuthoring: false,
        professionalReady: 0,
        launchAcceptableThin: 0,
      });
    }
    const agg = map.get(key);
    agg.byLevel[row.level] = row.uniqueUsableQuestionCount ?? row.count ?? 0;
    agg.topicTotal = Math.max(agg.topicTotal, row.topicTotalUniqueCount ?? 0);
    if (row.status === "CRITICAL_BLOCKING") agg.criticalBlocking = true;
    if (row.status === "NEEDS_AUTHORING_BEFORE_LAUNCH") agg.needsAuthoring = true;
    if (row.status === "PROFESSIONAL_READY") agg.professionalReady += 1;
    if (row.status === "LAUNCH_ACCEPTABLE_THIN") agg.launchAcceptableThin += 1;
  }
  return map;
}

async function main() {
  const invPath = join(ROOT, "reports", "question-audit", "QUESTION_INVENTORY_MATRIX.json");
  const invRaw = JSON.parse(await readFile(invPath, "utf8"));
  const invByTopic = aggregateInventory(invRaw.rows || []);

  /** @type {object[]} */
  const registryRows = [];

  for (const subject of SUBJECTS) {
    for (const grade of GRADES) {
      const topics = curriculumTopicsFor(subject, grade);
      for (const topic of topics) {
        const key = `${subject}:${grade}:${topic}`;
        const inv = invByTopic.get(key) || { topicTotal: 0 };
        registryRows.push(buildRegistryRow(subject, grade, topic, inv));
      }
    }
  }

  registryRows.sort((a, b) =>
    `${a.subject}:${a.grade}:${a.topic}`.localeCompare(`${b.subject}:${b.grade}:${b.topic}`)
  );

  const out = {
    generatedAt: new Date().toISOString(),
    registryVersion: "launch-policy-v1",
    sourceInventoryGeneratedAt: invRaw.generatedAt ?? null,
    rowCount: registryRows.length,
    rows: registryRows,
  };

  const outDir = join(ROOT, "data", "launch-readiness");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "topic-launch-registry.json");
  await writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${outPath} (${registryRows.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
