/**
 * Moledet / geography (`data/geography-questions/g*.js`) - proposal-only enrichment.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { scanQuestionBankModule } from "./question-metadata-scanner.js";
import {
  classifyMoledetGeographyConfidenceAndReview,
  inferMoledetGeographyCognitiveLevel,
  inferMoledetGeographyExpectedErrorTypes,
  mapMoledetGeographyBandToDifficulty,
  moledetGeographyStrandToSkillId,
  parseGradeFromMoledetGeographyFile,
  parseMoledetGeographyExportName,
  parseMoledetGeographyObjectPath,
  suggestMoledetGeographyPrerequisites,
} from "./question-metadata-taxonomy-geography.js";

export const MOLEDET_GEOGRAPHY_REL_PATHS = [
  "data/geography-questions/g1.js",
  "data/geography-questions/g2.js",
  "data/geography-questions/g3.js",
  "data/geography-questions/g4.js",
  "data/geography-questions/g5.js",
  "data/geography-questions/g6.js",
];

/**
 * @param {Record<string, unknown>} mod
 * @param {string} objectPath
 */
export function getMoledetGeographyRawAtPath(mod, objectPath) {
  const p = parseMoledetGeographyObjectPath(objectPath);
  if (!p) return null;
  const root = mod[p.exportName];
  if (!root || typeof root !== "object") return null;
  const arr = root[p.strand];
  if (!Array.isArray(arr)) return null;
  return arr[p.index] ?? null;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 * @param {string} sourceRel
 */
export function buildMoledetGeographyEnrichmentSuggestion(raw, record, sourceRel) {
  const prereq = suggestMoledetGeographyPrerequisites();
  const parsedPath = parseMoledetGeographyObjectPath(record.objectPath);
  const exportName = parsedPath ? parsedPath.exportName : "";
  const exportMeta = exportName ? parseMoledetGeographyExportName(exportName) : null;

  const g = parseGradeFromMoledetGeographyFile(sourceRel);
  const gradeLabel = g != null ? `g${g}` : "";

  if (!parsedPath || !exportMeta) {
    const cls = classifyMoledetGeographyConfidenceAndReview(record);
    return {
      questionId: record.declaredId || record.id,
      sourceFile: sourceRel,
      grade: gradeLabel || null,
      subject: "moledet-geography",
      objectPath: `${sourceRel}::${record.objectPath}`,
      current: {
        skillId: record.skillId,
        subskillId: record.subskillId,
        difficulty: record.difficulty,
        cognitiveLevel: record.cognitiveLevel,
        expectedErrorTypes: record.expectedErrorTypes || [],
        prerequisiteSkillIds: record.prerequisiteSkillIds || [],
      },
      suggested: {
        skillId: "",
        subskillId: gradeLabel,
        difficulty: "standard",
        cognitiveLevel: "understanding",
        expectedErrorTypes: ["geography_concept_confusion", "careless_error"],
        prerequisiteSkillIds: [],
      },
      confidence: "low",
      confidenceReasons: ["Could not parse geography path or export band.", ...cls.confidenceReasons],
      reviewPriority: "high",
      needsHumanReview: true,
    };
  }

  const skillId = moledetGeographyStrandToSkillId(parsedPath.strand);
  const difficulty = mapMoledetGeographyBandToDifficulty(exportMeta.band);
  const cognitiveLevel = inferMoledetGeographyCognitiveLevel(parsedPath.strand);
  const expectedErrorTypes = inferMoledetGeographyExpectedErrorTypes(parsedPath.strand);

  const suggested = {
    skillId,
    subskillId: gradeLabel,
    difficulty,
    cognitiveLevel,
    expectedErrorTypes,
    prerequisiteSkillIds: prereq.ids,
  };

  const cls = classifyMoledetGeographyConfidenceAndReview(record);

  return {
    questionId: record.declaredId || record.id,
    sourceFile: sourceRel,
    grade: gradeLabel,
    subject: "moledet-geography",
    objectPath: `${sourceRel}::${record.objectPath}`,
    current: {
      skillId: record.skillId,
      subskillId: record.subskillId,
      difficulty: record.difficulty,
      cognitiveLevel: record.cognitiveLevel,
      expectedErrorTypes: record.expectedErrorTypes || [],
      prerequisiteSkillIds: record.prerequisiteSkillIds || [],
    },
    suggested,
    confidence: cls.confidence,
    confidenceReasons: cls.confidenceReasons,
    reviewPriority: cls.reviewPriority,
    needsHumanReview: true,
  };
}

/**
 * @param {string} rootAbs
 */
export async function generateMoledetGeographySuggestions(rootAbs) {
  /** @type {object[]} */
  const suggestions = [];
  /** @type {Record<string, number>} */
  const rowCountByFile = {};
  /** @type {Record<string, number>} */
  const fieldHistogram = {
    skillId: 0,
    subskillId: 0,
    difficulty: 0,
    cognitiveLevel: 0,
    expectedErrorTypes: 0,
    prerequisiteSkillIds: 0,
  };

  for (const rel of MOLEDET_GEOGRAPHY_REL_PATHS) {
    const url = pathToFileURL(join(rootAbs, rel)).href;
    const mod = await import(`${url}?t=${Date.now()}`);
    const { records } = await scanQuestionBankModule(rootAbs, rel, "moledet-geography");
    rowCountByFile[rel] = records.length;

    for (const record of records) {
      const raw = /** @type {Record<string, unknown>} */ (
        getMoledetGeographyRawAtPath(mod, record.objectPath) || {}
      );
      const sug = buildMoledetGeographyEnrichmentSuggestion(raw, record, rel);
      suggestions.push(sug);

      const cur = sug.current;
      const s = sug.suggested;
      if ((cur.skillId || "") !== (s.skillId || "")) fieldHistogram.skillId += 1;
      if ((cur.subskillId || "") !== (s.subskillId || "")) fieldHistogram.subskillId += 1;
      if ((cur.difficulty || "") !== (s.difficulty || "")) fieldHistogram.difficulty += 1;
      if ((cur.cognitiveLevel || "") !== (s.cognitiveLevel || "")) fieldHistogram.cognitiveLevel += 1;
      if ((cur.expectedErrorTypes || []).join(",") !== (s.expectedErrorTypes || []).join(","))
        fieldHistogram.expectedErrorTypes += 1;
      if ((cur.prerequisiteSkillIds || []).join(",") !== (s.prerequisiteSkillIds || []).join(","))
        fieldHistogram.prerequisiteSkillIds += 1;
    }
  }

  const geographyRowTotal = Object.values(rowCountByFile).reduce((a, b) => a + b, 0);

  return { suggestions, rowCountByFile, geographyRowTotal, fieldHistogram };
}
