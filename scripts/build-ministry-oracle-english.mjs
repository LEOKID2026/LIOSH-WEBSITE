#!/usr/bin/env node
/**
 * Standalone Ministry oracle builder — English grades 1–6.
 */
import fs from "node:fs";
import path from "node:path";
import {
  NULL_SEQUENCE,
  TXT_DIR,
  makeRowId,
  makeSequence,
  writePartial,
} from "./lib/ministry-oracle-shared.mjs";

const GRADE_FILES = [
  { grade: 1, file: "כיתה א.txt", validated: true },
  { grade: 2, file: "כיתה ב.txt", validated: true },
  { grade: 3, file: "כיתה ג.txt", validated: true },
  { grade: 4, file: "כיתה ד.txt", validated: true },
  { grade: 5, file: "כיתה ה.txt", validated: true },
  { grade: 6, file: "כיתה ו.txt", validated: true },
];

const SECTION_ORDER = ["Focus", "Skills", "Grammar & Structures", "Vocabulary Themes", "Benchmark"];

function parseEnglishTxt(text) {
  const sections = {};
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (SECTION_ORDER.some((s) => trimmed.startsWith(s))) {
      current = trimmed.replace(/:$/, "");
      sections[current] = [];
      continue;
    }
    if (current && (trimmed.startsWith("-") || trimmed.startsWith("•"))) {
      sections[current].push(trimmed.replace(/^[-•]\s*/, ""));
    }
  }
  return sections;
}

function buildValidatedRows(grade, fileName, sections) {
  const rows = [];
  let seq = 0;
  for (const sectionName of SECTION_ORDER) {
    const items = sections[sectionName] ?? [];
    items.forEach((item, i) => {
      seq += 1;
      rows.push({
        row_id: makeRowId("english", grade, sectionName, `${i + 1}`),
        subject: "english",
        grade,
        official_domain: sectionName,
        official_topic: sectionName,
        official_subtopic: item,
        ministry_source_file: `תוכנית משרד החינוך קובצי TXT/${fileName}`,
        ministry_source_type: "txt",
        source_class: "official_primary",
        source_anchor: `${fileName} § ${sectionName}`,
        corroborating_source: "english Curriculum2020.pdf",
        status: "required",
        confidence: "medium",
        geometry_strand: false,
        internal_candidate_skill_id: null,
        notes: "Extracted from validated English TXT; PDF section anchor pending.",
        blocker_reason: null,
        ...makeSequence({
          sequence_index: seq,
          sequence_group: sectionName.toLowerCase().replace(/\s+/g, "_"),
          prerequisite_row_ids: [],
          prerequisite_skill_ids: [],
          sequence_source_anchor: `${fileName} document order`,
          sequence_confidence: "medium",
          sequence_notes: `Section order follows ${fileName} structure.`,
        }),
      });
    });
  }
  return rows;
}

function buildBlockerRow(grade, fileName) {
  return {
    row_id: makeRowId("english", grade, "source_blocker"),
    subject: "english",
    grade,
    official_domain: null,
    official_topic: null,
    official_subtopic: null,
    ministry_source_file: `תוכנית משרד החינוך קובצי TXT/${fileName}`,
    ministry_source_type: "txt",
    source_class: "unverified",
    source_anchor: null,
    corroborating_source: null,
    status: "source_blocker",
    confidence: "low",
    geometry_strand: false,
    internal_candidate_skill_id: null,
    notes: "TXT file content not validated against english Curriculum2020.pdf.",
    blocker_reason:
      "TXT file content not validated against english Curriculum2020.pdf; must be verified by owner before rows can be promoted.",
    ...NULL_SEQUENCE,
  };
}

const rows = [];

for (const { grade, file, validated } of GRADE_FILES) {
  const fullPath = path.join(TXT_DIR, file);
  if (!fs.existsSync(fullPath)) {
    rows.push(buildBlockerRow(grade, file));
    continue;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  if (!validated) {
    rows.push(buildBlockerRow(grade, file));
    continue;
  }
  const sections = parseEnglishTxt(text);
  rows.push(...buildValidatedRows(grade, file, sections));
}

writePartial("english", {
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-english.mjs",
  row_count: rows.length,
  rows,
});

console.log(`Wrote ${rows.length} English oracle rows to partial/english.json`);
