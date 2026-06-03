#!/usr/bin/env node
/**
 * Generate lib/learning-book/learning-book-sequence-meta.js from registries + oracle.
 * Run: node scripts/generate-learning-book-sequence-meta.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const matrix = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/curriculum-oracle/v1/ministry-matrix.draft.json"), "utf8")
);

const SUBJECTS = ["math", "geometry", "science", "hebrew", "english", "moledet", "geography"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** @type {Record<string, string[]>} */
const SUBJECT_GRADES = {
  moledet: ["g2", "g3", "g4"],
  geography: ["g5", "g6"],
};

/** @param {string} subject @param {number} gradeNum @param {string} pageId */
function findOracleRow(subject, gradeNum, pageId) {
  const rows = matrix.rows.filter(
    (r) => r.subject === subject && r.grade === gradeNum && r.sequence_index != null
  );

  for (const row of rows) {
    const cand = row.internal_candidate_skill_id;
    if (!cand) continue;
    if (cand === pageId) return row;
    if (cand.split(";").some((part) => part.trim() === pageId || part.endsWith(`.${pageId}`))) {
      return row;
    }
    if (subject === "math" || subject === "geometry") {
      if (cand === `${subject}:kind:${pageId}` || cand === `math:kind:${pageId}` || cand === `geometry:kind:${pageId}`) {
        return row;
      }
    }
    if (subject === "science") {
      if (cand === `science.${pageId}` || cand.includes(`science.g${gradeNum}.${pageId}`)) return row;
      if (cand.split(";").includes(pageId)) return row;
    }
    if (subject === "english" && pageId.startsWith("vocab_")) {
      const theme = pageId.replace(/^vocab_/, "");
      if (cand === `english:vocabulary:wordlist:${theme}`) return row;
    }
    if (subject === "english" && pageId.startsWith("grammar_")) {
      const pool = pageId.replace(/^grammar_/, "");
      if (cand === `english:pool:grammar:${pool}`) return row;
    }
  }
  return null;
}

/** Explicit prerequisite overrides (approved teach-path). */
const PREREQUISITE_OVERRIDES = {
  "geometry:g5": {
    triangle_area: ["heights_triangle"],
  },
};

/** @type {Record<string, Record<string, object>>} */
const LEARNING_BOOK_PAGE_SEQUENCE = {};

for (const subject of SUBJECTS) {
  const gradesForSubject = SUBJECT_GRADES[subject] || GRADES;
  for (const grade of gradesForSubject) {
    const regPath = path.join(ROOT, `lib/learning-book/${subject}-${grade}-registry.js`);
    const upper = grade.toUpperCase();
    const prefix = subject.toUpperCase();
    /** @type {{ id: string, titleHe: string, pages: string[] }[]|null} */
    let batches = null;

    if (subject === "moledet" || subject === "geography") {
      const manifestPath = path.join(
        ROOT,
        `scripts/lib/moledet-geography-${grade}-draft-manifest.mjs`
      );
      if (fs.existsSync(manifestPath)) {
        const manifestMod = await import(pathToFileURL(manifestPath).href);
        batches = manifestMod[`MOLEDET_GEOGRAPHY_${upper}_BOOK_BATCHES`];
      }
    } else if (fs.existsSync(regPath)) {
      const mod = await import(pathToFileURL(regPath).href);
      const batchesKey = `${prefix}_${upper}_BOOK_BATCHES`;
      batches = mod[batchesKey];
    }

    if (!Array.isArray(batches)) continue;

    const bookKey = `${subject}:${grade}`;
    LEARNING_BOOK_PAGE_SEQUENCE[bookKey] = {};
    const gradeNum = Number(grade.replace("g", ""));
    let globalIndex = 0;

    batches.forEach((batch, batchOrder) => {
      batch.pages.forEach((pageId, indexInBatch) => {
        globalIndex += 1;
        const oracle = findOracleRow(subject, gradeNum, pageId);
        LEARNING_BOOK_PAGE_SEQUENCE[bookKey][pageId] = {
          sequenceIndex: globalIndex,
          batchId: batch.id,
          batchOrder,
          indexInBatch: indexInBatch + 1,
          sequenceGroup: oracle?.sequence_group || batch.id,
          oracleRowId: oracle?.row_id || null,
          oracleSequenceIndex: oracle?.sequence_index ?? null,
          prerequisitePageIds: PREREQUISITE_OVERRIDES[bookKey]?.[pageId] || [],
          source: oracle ? "oracle" : "approved_local",
        };
      });
    });
  }
}

const out = `/**
 * Learning book page sequence metadata (generated).
 * Do not edit by hand — run: node scripts/generate-learning-book-sequence-meta.mjs
 */
export const LEARNING_BOOK_PAGE_SEQUENCE = ${JSON.stringify(LEARNING_BOOK_PAGE_SEQUENCE, null, 2)};

export const LEARNING_BOOK_SEQUENCE_BOOK_KEYS = ${JSON.stringify(
  Object.keys(LEARNING_BOOK_PAGE_SEQUENCE).sort()
)};
`;

const outPath = path.join(ROOT, "lib/learning-book/learning-book-sequence-meta.js");
fs.writeFileSync(outPath, out, "utf8");

let pageCount = 0;
for (const book of Object.values(LEARNING_BOOK_PAGE_SEQUENCE)) {
  pageCount += Object.keys(book).length;
}
console.log(`Wrote ${outPath} — ${Object.keys(LEARNING_BOOK_PAGE_SEQUENCE).length} books, ${pageCount} pages`);
