#!/usr/bin/env node
/**
 * Standalone Ministry oracle builder — Science grades 1–6.
 * Parses official science Curriculum2016.docx into partial/science.json.
 * Product scaffold rows remain in internal-scaffold.science.json only.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  NULL_SEQUENCE,
  PDF_DIR,
  makeRowId,
  makeSequence,
  writeJson,
  writePartial,
  ORACLE_DIR,
} from "./lib/ministry-oracle-shared.mjs";
import {
  parseScienceCurriculum2016Docx,
  classifyOfficialRow,
} from "./lib/parse-science-curriculum-docx.mjs";

const DOCX_REL = "תוכנית משרד החינוך/science Curriculum2016.docx";
const DOCX_PATH = path.join(PDF_DIR, "science Curriculum2016.docx");

const scienceModule = await import(
  pathToFileURL(path.join(process.cwd(), "data/science-curriculum.js")).href
);
const { SCIENCE_GRADES, SCIENCE_GRADE_ORDER } = scienceModule;

const BLOCKER =
  "Science Curriculum2016.docx not parsed; this is NOT an official oracle row. Do not merge into ministry-matrix.draft.json.";

function stripTocPageSuffix(value) {
  return String(value ?? "").replace(/\d+$/g, "").trim();
}

function dedupeKey(row) {
  return [
    row.grade,
    row.domain,
    row.centralTopic,
    row.subtopic,
    row.rowKind,
  ].join("|");
}

function buildOfficialOracleRows(parsedRows) {
  /** @type {Map<string, object>} */
  const seen = new Map();
  let seq = 0;

  for (const row of parsedRows) {
    const key = dedupeKey(row);
    if (seen.has(key)) continue;

    seq += 1;
    const domain = stripTocPageSuffix(row.domain);
    const centralTopic = stripTocPageSuffix(row.centralTopic);
    const subtopic = stripTocPageSuffix(row.subtopic);
    const productTopics = classifyOfficialRow({ ...row, domain, centralTopic, subtopic });

    seen.set(key, {
      row_id: makeRowId("science", row.grade, row.rowKind, domain, centralTopic, `${seq}`),
      subject: "science",
      grade: row.grade,
      official_domain: domain,
      official_topic: centralTopic,
      official_subtopic: subtopic,
      ministry_source_file: DOCX_REL,
      ministry_source_type: "docx",
      source_class: "official_primary",
      source_anchor: row.sourceAnchor,
      corroborating_source: "https://meyda.education.gov.il/files/Tochniyot_Limudim/Science/science Curriculum2016.docx",
      status: "required",
      confidence: row.rowKind === "learning_outcome" ? "medium" : "medium",
      geometry_strand: false,
      internal_candidate_skill_id: productTopics.length
        ? productTopics.map((t) => `science.g${row.grade}.${t}`).join(";")
        : null,
      notes:
        row.rowKind === "learning_outcome"
          ? "Learning outcome extracted from Curriculum2016.docx detailed grade section."
          : "Domain/topic row extracted from Curriculum2016.docx (TOC or detailed section).",
      blocker_reason: null,
      ...makeSequence({
        sequence_index: seq,
        sequence_group: slugGroup(domain),
        prerequisite_row_ids: [],
        prerequisite_skill_ids: [],
        sequence_source_anchor: row.sourceAnchor,
        sequence_confidence: "low",
        sequence_notes: "Science curriculum is spiral; sequence within grade follows DOCX section order.",
      }),
    });
  }

  return [...seen.values()];
}

function slugGroup(domain) {
  return String(domain ?? "domain")
    .replace(/[^\w\u0590-\u05FF]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

function buildScaffoldRows() {
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
  return rows;
}

if (!fs.existsSync(DOCX_PATH)) {
  throw new Error(
    `Missing ${DOCX_REL}. Download from https://meyda.education.gov.il/files/Tochniyot_Limudim/Science/science%20Curriculum2016.docx`
  );
}

const { rows: parsedRows, summary, paragraphCount } = parseScienceCurriculum2016Docx(DOCX_PATH);
const officialRows = buildOfficialOracleRows(parsedRows);

writePartial("science", {
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-science.mjs",
  source_docx: DOCX_REL,
  paragraph_count: paragraphCount,
  parse_summary: summary,
  row_count: officialRows.length,
  rows: officialRows,
});

const scaffoldOutput = {
  WARNING:
    "This file is NOT part of the Ministry oracle. It is a scaffold for reference until the DOCX is parsed.",
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-science.mjs",
  source_class: "internal_scaffold",
  row_count: 0,
  rows: buildScaffoldRows(),
  note: "Official rows now live in partial/science.json; scaffold retained for product cross-reference only.",
};
scaffoldOutput.row_count = scaffoldOutput.rows.length;
writeJson(path.join(ORACLE_DIR, "internal-scaffold.science.json"), scaffoldOutput);

console.log(
  `Wrote ${officialRows.length} official Science oracle rows to partial/science.json (${paragraphCount} DOCX paragraphs parsed)`
);
console.log(`Wrote ${scaffoldOutput.row_count} internal scaffold rows to internal-scaffold.science.json`);
