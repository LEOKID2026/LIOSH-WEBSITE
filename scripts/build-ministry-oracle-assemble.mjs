#!/usr/bin/env node
/**
 * Assemble Ministry oracle partials into ministry-matrix.draft.json.
 * Standalone only — not wired to npm/CI/runtime.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ORACLE_DIR,
  PARTIAL_DIR,
  assertNoInternalScaffold,
  writeJson,
} from "./lib/ministry-oracle-shared.mjs";

const PARTIALS = ["math-geometry", "hebrew", "english", "science", "moledet-geography"];

function loadPartial(name) {
  const file = path.join(PARTIAL_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing partial: ${file}. Run build-ministry-oracle-${name}.mjs first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const allRows = [];
const sources = [];

for (const name of PARTIALS) {
  const partial = loadPartial(name);
  assertNoInternalScaffold(partial.rows, name);
  allRows.push(...partial.rows);
  sources.push({
    partial: name,
    row_count: partial.row_count,
    generated_at: partial.generated_at,
    source_script: partial.source_script,
  });
}

const blockerCount = allRows.filter((r) =>
  ["source_blocker", "pending_parse", "not_in_grade", "required_pending_pdf_parse"].includes(r.status)
).length;

const matrix = {
  schema_version: 1,
  WARNING:
    "internal_scaffold rows must never appear here; source_class: internal_scaffold is banned from this file",
  assembly_timestamp: new Date().toISOString(),
  assembly_script: "scripts/build-ministry-oracle-assemble.mjs",
  blocker_count: blockerCount,
  row_count: allRows.length,
  partial_sources: sources,
  policy: {
    upstream: "Official Ministry of Education sources only",
    downstream: "skills.json and product layers are diff targets only — not modified by this build",
  },
  rows: allRows,
};

writeJson(path.join(ORACLE_DIR, "ministry-matrix.draft.json"), matrix);
console.log(`Assembled ministry-matrix.draft.json with ${allRows.length} rows (${blockerCount} blockers/pending).`);
