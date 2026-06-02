#!/usr/bin/env node
/**
 * Standalone Ministry oracle builder — Moledet / Geography.
 * Oracle partial: official rows only. Scaffold file: product-state from moledet-geography-curriculum.js.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  NULL_SEQUENCE,
  ORACLE_DIR,
  makeRowId,
  makeSequence,
  writeJson,
  writePartial,
} from "./lib/ministry-oracle-shared.mjs";

const molModule = await import(
  pathToFileURL(path.join(process.cwd(), "data/moledet-geography-curriculum.js")).href
);

const { MOLEDET_GEOGRAPHY_GRADES, MOLEDET_GEOGRAPHY_GRADE_ORDER } = molModule;

/** Official oracle rows — NOT from internal JS for grades 2–6 (curated from PDF scope). */
const OFFICIAL_MOLEDET_ROWS = [
  {
    grade: 2,
    subject: "moledet",
    domain: "מולדת",
    topic: "שכונה וקהילה",
    subtopic: "מהי שכונה; מבנים וסביבות; שירותים בקהילה",
    source: "תוכנית משרד החינוך/homeland-curriculum.pdf",
    anchor: "homeland-curriculum.pdf grades 2–4 scope",
    index: 1,
  },
  {
    grade: 3,
    subject: "moledet",
    domain: "מולדת",
    topic: "ארץ ישראל",
    subtopic: "מפת ישראל; אזורים; נופים; מחוזות",
    source: "תוכנית משרד החינוך/homeland-curriculum.pdf",
    anchor: "homeland-curriculum.pdf grades 2–4 scope",
    index: 1,
  },
  {
    grade: 4,
    subject: "moledet",
    domain: "מולדת",
    topic: "חברה ואזרחות",
    subtopic: "יסודות אזרחות; קהילה; ערכים",
    source: "תוכנית משרד החינוך/homeland-curriculum.pdf",
    anchor: "homeland-curriculum.pdf grades 2–4 scope",
    index: 1,
  },
];

const OFFICIAL_GEOGRAPHY_ROWS = [
  {
    grade: 5,
    subject: "geography",
    domain: "גאוגרפיה",
    topic: "מפות ומרחב",
    subtopic: "קריאת מפות; אזורים בישראל",
    source: "תוכנית משרד החינוך/tohnit-geography-5-6.pdf",
    anchor: "tohnit-geography-5-6.pdf grade 5 scope",
    index: 1,
  },
  {
    grade: 6,
    subject: "geography",
    domain: "גאוגרפיה",
    topic: "גאוגרפיה של ישראל והעולם",
    subtopic: "מחוזות; יבשות וימים; קשרים גאוגרפיים",
    source: "תוכנית משרד החינוך/tohnit-geography-5-6.pdf",
    anchor: "tohnit-geography-5-6.pdf grade 6 scope; tochnit-vav.pdf supplement",
    index: 1,
  },
];

const oracleRows = [];

oracleRows.push({
  row_id: "moledet.g1.official_status",
  subject: "moledet",
  grade: 1,
  official_domain: null,
  official_topic: null,
  official_subtopic: null,
  ministry_source_file: null,
  ministry_source_type: null,
  source_class: "no_verified_source",
  source_anchor: null,
  corroborating_source: null,
  status: "not_in_grade",
  confidence: "low",
  geometry_strand: false,
  internal_candidate_skill_id: null,
  notes:
    "Product teaches grade-1 moledet/geography content but no verified official MoE primary source was found to support it. Product may continue as enrichment but must not present this as Ministry-aligned curriculum.",
  blocker_reason: "No verified official MoE source for grade-1 Moledet/geography found.",
  ...NULL_SEQUENCE,
});

for (const item of [...OFFICIAL_MOLEDET_ROWS, ...OFFICIAL_GEOGRAPHY_ROWS]) {
  oracleRows.push({
    row_id: makeRowId(item.subject, item.grade, item.domain, item.topic),
    subject: item.subject,
    grade: item.grade,
    official_domain: item.domain,
    official_topic: item.topic,
    official_subtopic: item.subtopic,
    ministry_source_file: item.source,
    ministry_source_type: "pdf",
    source_class: "official_primary",
    source_anchor: item.anchor,
    corroborating_source: null,
    status: "required",
    confidence: "medium",
    geometry_strand: false,
    internal_candidate_skill_id: null,
    notes: "Curated from official PDF scope; PDF not auto-parsed to subsection rows in this phase.",
    blocker_reason: null,
    ...makeSequence({
      sequence_index: item.index,
      sequence_group: item.subject === "moledet" ? "moledet_civic" : "geography_maps",
      prerequisite_row_ids: [],
      prerequisite_skill_ids: [],
      sequence_source_anchor: "pedagogical_inferred",
      sequence_confidence: "medium",
      sequence_notes: "Order inferred from homeland/geography programme scope statements.",
    }),
  });
}

writePartial("moledet-geography", {
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-moledet-geography.mjs",
  row_count: oracleRows.length,
  rows: oracleRows,
});

const scaffoldRows = [];
for (const gk of MOLEDET_GEOGRAPHY_GRADE_ORDER) {
  const gradeNum = Number(gk.replace("g", ""));
  const slot = MOLEDET_GEOGRAPHY_GRADES[gk];
  let idx = 0;
  for (const topic of slot.topics ?? []) {
    idx += 1;
    scaffoldRows.push({
      row_id: makeRowId("moledet_scaffold", gradeNum, topic),
      subject: "moledet",
      grade: gradeNum,
      official_domain: null,
      official_topic: topic,
      official_subtopic: slot.curriculum?.summary ?? null,
      ministry_source_file: "data/moledet-geography-curriculum.js",
      ministry_source_type: "internal_js_scaffold",
      source_class: "internal_scaffold",
      source_anchor: null,
      corroborating_source: null,
      status: "source_blocker",
      confidence: "low",
      geometry_strand: false,
      internal_candidate_skill_id: `moledet.${gk}.${topic}`,
      notes: "Internal product topic state; NOT Ministry oracle.",
      blocker_reason:
        "Derived from data/moledet-geography-curriculum.js; must never merge into ministry-matrix.draft.json.",
      ...NULL_SEQUENCE,
      product_scaffold: {
        stage: slot.stage ?? null,
        focus_lines: slot.curriculum?.focus ?? [],
        geography: slot.curriculum?.geography ?? [],
        citizenship: slot.curriculum?.citizenship ?? [],
      },
    });
  }
}

writeJson(path.join(ORACLE_DIR, "internal-scaffold.moledet-geography.json"), {
  WARNING:
    "This file is NOT part of the Ministry oracle. It documents the current product topic state only. These rows must never be merged into ministry-matrix.draft.json and must never raise confidence for any oracle row.",
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-moledet-geography.mjs",
  source_class: "internal_scaffold",
  row_count: scaffoldRows.length,
  rows: scaffoldRows,
});

console.log(
  `Wrote ${oracleRows.length} moledet/geography oracle rows + ${scaffoldRows.length} scaffold rows`
);
