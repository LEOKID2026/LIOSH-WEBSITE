#!/usr/bin/env node
/**
 * Standalone Ministry oracle builder — Science internal scaffold ONLY.
 * Does NOT write to ministry-matrix.draft.json.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  NULL_SEQUENCE,
  ORACLE_DIR,
  makeRowId,
  writeJson,
} from "./lib/ministry-oracle-shared.mjs";

const scienceModule = await import(
  pathToFileURL(path.join(process.cwd(), "data/science-curriculum.js")).href
);

const { SCIENCE_GRADES, SCIENCE_GRADE_ORDER } = scienceModule;

const BLOCKER =
  "Science Curriculum2016.docx not parsed; this is NOT an official oracle row. Do not merge into ministry-matrix.draft.json.";

const rows = [];

for (const gk of SCIENCE_GRADE_ORDER) {
  const gradeNum = Number(gk.replace("g", ""));
  const slot = SCIENCE_GRADES[gk];
  let topicIndex = 0;
  for (const topic of slot.topics ?? []) {
    topicIndex += 1;
    rows.push({
      row_id: makeRowId("science", gradeNum, "scaffold", topic),
      subject: "science",
      grade: gradeNum,
      official_domain: null,
      official_topic: topic,
      official_subtopic: slot.curriculum?.summary ?? null,
      ministry_source_file: "data/science-curriculum.js",
      ministry_source_type: "internal_js_scaffold",
      source_class: "internal_scaffold",
      source_anchor: null,
      corroborating_source: null,
      status: "source_blocker",
      confidence: "low",
      geometry_strand: false,
      internal_candidate_skill_id: `science.${gk}.${topic}`,
      notes: "Internal product scaffold row; NOT Ministry curriculum.",
      blocker_reason: BLOCKER,
      ...NULL_SEQUENCE,
      product_scaffold: {
        stage: slot.stage ?? null,
        focus_lines: slot.curriculum?.focus ?? [],
        skills: slot.curriculum?.skills ?? [],
      },
    });
  }
}

const output = {
  WARNING:
    "This file is NOT part of the Ministry oracle. It is a scaffold for reference until the DOCX is parsed.",
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-science.mjs",
  source_class: "internal_scaffold",
  row_count: rows.length,
  rows,
};

writeJson(path.join(ORACLE_DIR, "internal-scaffold.science.json"), output);
console.log(`Wrote ${rows.length} science scaffold rows to internal-scaffold.science.json`);
