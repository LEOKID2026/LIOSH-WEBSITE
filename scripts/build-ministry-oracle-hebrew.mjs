#!/usr/bin/env node
/**
 * Standalone Ministry oracle builder — Hebrew (derived alignment matrix).
 */
import {
  makeRowId,
  makeSequence,
  readJson,
  writePartial,
} from "./lib/ministry-oracle-shared.mjs";

const matrix = readJson("data/hebrew-official-alignment-matrix.json");

function gradeNum(g) {
  return Number(String(g).replace(/^g/, ""));
}

const domainSequence = new Map();

function nextSequenceIndex(grade, domain) {
  const key = `${grade}::${domain}`;
  const current = domainSequence.get(key) ?? 0;
  const next = current + 1;
  domainSequence.set(key, next);
  return next;
}

const rows = matrix.map((entry, idx) => {
  const grade = gradeNum(entry.grade);
  const prov = entry.official_provenance ?? {};
  const confidence = grade === 1 && prov.confidence === "medium" ? "medium" : "medium";
  const seqIndex = nextSequenceIndex(grade, entry.domain);

  return {
    row_id: makeRowId("hebrew", grade, entry.mapped_subtopic_id || `row_${idx + 1}`),
    subject: "hebrew",
    grade,
    official_domain: entry.domain,
    official_topic: entry.runtime_topic ?? entry.domain,
    official_subtopic: entry.official_objective,
    ministry_source_file: "data/hebrew-official-alignment-matrix.json",
    ministry_source_type: "json",
    source_class: "derived_alignment",
    source_anchor: prov.official_section_anchor ?? prov.official_doc_excerpt_ref ?? null,
    corroborating_source: prov.official_doc_id ?? "hebrew-1-6.pdf",
    status: entry.coverage_status === "partial" ? "required" : "required",
    confidence,
    geometry_strand: false,
    internal_candidate_skill_id: entry.mapped_subtopic_id ?? null,
    notes: [
      entry.notes,
      grade >= 2 ? "Single hebrew-1-6.pdf source; no per-grade TXT split in repo." : null,
    ]
      .filter(Boolean)
      .join(" "),
    blocker_reason: null,
    ...makeSequence({
      sequence_index: seqIndex,
      sequence_group: slugDomain(entry.domain),
      prerequisite_row_ids: [],
      prerequisite_skill_ids: entry.mapped_subtopic_id ? [entry.mapped_subtopic_id] : [],
      sequence_source_anchor: prov.official_section_anchor ? prov.official_section_anchor : "pedagogical_inferred",
      sequence_confidence: "medium",
      sequence_notes: `Hebrew alignment matrix row order ${idx + 1}; domain sequence index ${seqIndex} within grade ${grade}.`,
    }),
  };
});

function slugDomain(domain) {
  if (!domain) return "hebrew_general";
  if (domain.includes("קריאה")) return "reading_foundations";
  if (domain.includes("כתיבה")) return "writing_foundations";
  if (domain.includes("דקדוק") || domain.includes("לשון")) return "grammar_advanced";
  return "hebrew_general";
}

writePartial("hebrew", {
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-hebrew.mjs",
  row_count: rows.length,
  rows,
});

console.log(`Wrote ${rows.length} Hebrew oracle rows to partial/hebrew.json`);
