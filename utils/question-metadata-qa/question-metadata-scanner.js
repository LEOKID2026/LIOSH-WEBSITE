/**
 * Walk module exports and produce per-question metadata records.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  COGNITIVE_LEVELS_VALID,
  COMPLETENESS_WEIGHTS,
  DIFFICULTY_VALID,
  ISSUE_CODES,
  MIN_QUESTIONS_PER_SKILL_FOR_DIAGNOSIS,
} from "./question-metadata-contract.js";
import { validateTaxonomyForRecord } from "./question-metadata-taxonomy.js";
import * as bankDiscovery from "./question-bank-discovery.js";
const GEOMETRY_CONCEPTUAL_BANK = bankDiscovery.GEOMETRY_CONCEPTUAL_BANK;

/** @param {unknown} o */
function isPlainObject(o) {
  return o !== null && typeof o === "object" && !Array.isArray(o);
}

/** @param {unknown} q */
function looksLikeQuestionRow(q) {
  if (!isPlainObject(q)) return false;
  const hasStem = !!(q.question || q.stem || q.prompt || q.template);
  const hasChoice =
    Array.isArray(q.answers) ||
    Array.isArray(q.options) ||
    q.correct !== undefined ||
    q.correctIndex !== undefined ||
    q.correctAnswer !== undefined;
  return hasStem && hasChoice;
}

/**
 * @param {unknown} val
 * @param {string} sourceFile
 * @param {string} pathPrefix
 * @param {string} subjectId
 * @param {number[]} indexRef — mutable [n]
 * @param {object[]} out
 */
function walkQuestionTree(val, sourceFile, pathPrefix, subjectId, indexRef, out) {
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i += 1) {
      const el = val[i];
      if (looksLikeQuestionRow(el)) {
        out.push(
          buildScanRecord(/** @type {Record<string, unknown>} */ (el), sourceFile, `${pathPrefix}[${i}]`, subjectId, indexRef[0]++)
        );
      } else if (isPlainObject(el) && !looksLikeQuestionRow(el)) {
        walkQuestionTree(el, sourceFile, `${pathPrefix}[${i}]`, subjectId, indexRef, out);
      }
    }
    return;
  }
  if (!isPlainObject(val)) return;

  const values = Object.values(val);
  const allArrays = values.length > 0 && values.every((v) => Array.isArray(v));
  if (allArrays) {
    for (const k of Object.keys(val)) {
      const arr = val[k];
      walkQuestionTree(arr, sourceFile, `${pathPrefix}.${k}`, subjectId, indexRef, out);
    }
    return;
  }

  if (looksLikeQuestionRow(val)) {
    out.push(
      buildScanRecord(/** @type {Record<string, unknown>} */ (val), sourceFile, pathPrefix, subjectId, indexRef[0]++)
    );
  }
}

/** @param {Record<string, unknown>} q */
function extractParams(q) {
  const p = q.params;
  return isPlainObject(p) ? /** @type {Record<string, unknown>} */ (p) : {};
}

/** @param {Record<string, unknown>} q */
function effectiveSkillId(q, params) {
  return (
    pickStr(q.diagnosticSkillId) ||
    pickStr(q.skillId) ||
    pickStr(params.diagnosticSkillId) ||
    pickStr(params.skillId) ||
    pickStr(q.conceptTag) ||
    pickStr(params.conceptTag) ||
    pickStr(q.patternFamily) ||
    pickStr(params.patternFamily) ||
    pickStr(q.topic) ||
    ""
  );
}

/** @param {Record<string, unknown>} q */
function effectiveSubskillId(q, params) {
  return (
    pickStr(q.subtype) ||
    pickStr(params.subtype) ||
    pickStr(q.patternFamily) ||
    pickStr(params.patternFamily) ||
    pickStr(q.conceptTag) ||
    pickStr(params.conceptTag) ||
    ""
  );
}

function pickStr(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  return s;
}

/** @param {Record<string, unknown>} q */
function effectiveDifficulty(q, params) {
  const d =
    pickStr(q.difficulty) ||
    pickStr(params.difficulty) ||
    pickStr(params.difficultyBand) ||
    pickStr(q.minLevel) ||
    pickStr(q.maxLevel) ||
    pickStr(params.levelKey);
  if (!d) return "";
  const low = d.toLowerCase();
  if (low === "low") return "easy";
  if (low === "high") return "hard";
  return low;
}

/** @param {Record<string, unknown>} q */
function effectiveCognitive(q, params) {
  const c = pickStr(q.cognitiveLevel) || pickStr(params.cognitiveLevel);
  if (c) return c.toLowerCase();
  const pp = pickStr(q.probePower) || pickStr(params.probePower);
  if (pp === "high") return "reasoning";
  if (pp === "low") return "recall";
  return "";
}

/** @param {Record<string, unknown>} q */
function expectedErrors(q, params) {
  const a = q.expectedErrorTypes || q.expectedErrorTags || params.expectedErrorTypes || params.expectedErrorTags;
  if (!Array.isArray(a)) return [];
  return a.map(String).filter(Boolean);
}

/** @param {Record<string, unknown>} q */
function prereqIds(q, params) {
  const a = q.prerequisiteSkillIds || params.prerequisiteSkillIds;
  if (!Array.isArray(a)) return [];
  return a.map(String).filter(Boolean);
}

/** @param {Record<string, unknown>} q */
function hasCorrectAnswer(q) {
  if (q.correctIndex !== undefined && Number.isFinite(Number(q.correctIndex))) return true;
  if (q.correct !== undefined && q.correct !== null && String(q.correct).length > 0) return true;
  if (q.correctAnswer !== undefined && q.correctAnswer !== null) return true;
  if (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0) return true;
  return false;
}

/** @param {Record<string, unknown>} q */
function hasExplanation(q, params) {
  const ex =
    pickStr(q.explanation) ||
    pickStr(params.explanationHe) ||
    pickStr(q.explanationHe);
  if (ex.length > 10) return true;
  if (Array.isArray(q.theoryLines) && q.theoryLines.some((x) => String(x).trim().length > 5)) return true;
  return false;
}

/** @param {Record<string, unknown>} q */
function effectiveSubject(q, params, subjectHint) {
  return (
    pickStr(q.subject) ||
    pickStr(q.subjectId) ||
    pickStr(params.subjectId) ||
    pickStr(q.topic) ||
    subjectHint ||
    ""
  );
}

/**
 * @param {Record<string, unknown>} q
 * @param {string} sourceFile
 * @param {string} objectPath
 * @param {string} subjectHint
 * @param {number} seqIndex
 */
export function buildScanRecord(q, sourceFile, objectPath, subjectHint, seqIndex) {
  const params = extractParams(q);
  const declaredId = pickStr(q.id) || pickStr(q._id);
  const syntheticId = declaredId || `${sourceFile.replace(/\\/g, "/")}::${objectPath}::#${seqIndex}`;

  const subject = effectiveSubject(q, params, subjectHint);
  const skillId = effectiveSkillId(q, params);
  const subskillId = effectiveSubskillId(q, params);
  const difficulty = effectiveDifficulty(q, params);
  const cognitiveLevel = effectiveCognitive(q, params);
  const expectedErr = expectedErrors(q, params);
  const prereq = prereqIds(q, params);

  /** @type {string[]} */
  const issues = [];

  if (!declaredId) issues.push(ISSUE_CODES.implicit_id_only);
  if (!subject) issues.push(ISSUE_CODES.missing_subject);
  if (!skillId) issues.push(ISSUE_CODES.missing_skillId);
  if (!subskillId) issues.push(ISSUE_CODES.missing_subskillId);
  if (!difficulty) issues.push(ISSUE_CODES.missing_difficulty);
  else if (!DIFFICULTY_VALID.has(difficulty.toLowerCase())) issues.push(ISSUE_CODES.invalid_difficulty);

  if (!cognitiveLevel) issues.push(ISSUE_CODES.missing_cognitiveLevel);
  else if (!COGNITIVE_LEVELS_VALID.has(cognitiveLevel)) issues.push(ISSUE_CODES.invalid_cognitive_level);

  if (!q.expectedErrorTypes && !q.expectedErrorTags && !params.expectedErrorTypes && !params.expectedErrorTags) {
    issues.push(ISSUE_CODES.missing_expected_error_types);
  } else if (expectedErr.length === 0) issues.push(ISSUE_CODES.expected_error_types_empty);

  if (!q.prerequisiteSkillIds && !params.prerequisiteSkillIds) {
    issues.push(ISSUE_CODES.missing_prerequisite_skill_ids);
  } else if (prereq.length === 0) issues.push(ISSUE_CODES.prerequisite_skill_ids_empty);

  if (!hasCorrectAnswer(q)) issues.push(ISSUE_CODES.missing_correct_answer);
  if (!hasExplanation(q, params)) issues.push(ISSUE_CODES.missing_explanation);

  issues.push(
    ...validateTaxonomyForRecord({
      subject,
      skillId,
      subskillId,
      difficulty: difficulty || null,
      cognitiveLevel: cognitiveLevel || null,
      expectedErrorTypes: expectedErr,
      prerequisiteSkillIds: prereq,
    })
  );

  let score = 0;
  if (declaredId) score += COMPLETENESS_WEIGHTS.id;
  if (subject) score += COMPLETENESS_WEIGHTS.subject;
  if (skillId) score += COMPLETENESS_WEIGHTS.skillId;
  if (subskillId) score += COMPLETENESS_WEIGHTS.subskillId;
  if (difficulty && DIFFICULTY_VALID.has(difficulty.toLowerCase())) score += COMPLETENESS_WEIGHTS.difficulty;
  if (cognitiveLevel && COGNITIVE_LEVELS_VALID.has(cognitiveLevel)) score += COMPLETENESS_WEIGHTS.cognitiveLevel;
  if (expectedErr.length > 0) score += COMPLETENESS_WEIGHTS.expectedErrorTypes;
  if (prereq.length > 0) score += COMPLETENESS_WEIGHTS.prerequisiteSkillIds;
  if (hasCorrectAnswer(q)) score += COMPLETENESS_WEIGHTS.correctAnswer;
  if (hasExplanation(q, params)) score += COMPLETENESS_WEIGHTS.explanation;

  /** @type {"low"|"medium"|"high"} */
  let riskLevel = "low";
  const critical = issues.filter((c) =>
    [ISSUE_CODES.missing_skillId, ISSUE_CODES.missing_correct_answer].includes(c)
  );
  if (critical.length >= 2 || !skillId || !hasCorrectAnswer(q)) riskLevel = "high";
  else if (issues.length >= 4 || score < 0.55) riskLevel = "medium";

  return {
    id: syntheticId,
    declaredId: declaredId || null,
    sourceFile: sourceFile.replace(/\\/g, "/"),
    objectPath,
    subject,
    skillId,
    subskillId,
    difficulty: difficulty || null,
    cognitiveLevel: cognitiveLevel || null,
    expectedErrorTypes: expectedErr,
    prerequisiteSkillIds: prereq,
    hasCorrectAnswer: hasCorrectAnswer(q),
    hasExplanation: hasExplanation(q, params),
    questionType: pickStr(q.type) || pickStr(q.qType) || null,
    gradeHint: Array.isArray(q.grades) ? q.grades.join(",") : pickStr(q.minGrade) || pickStr(q.maxGrade) || null,
    metadataCompletenessScore: Math.round(score * 1000) / 1000,
    issues: [...new Set(issues)],
    riskLevel,
  };
}

/**
 * @param {string} rootAbs
 * @param {string} relPath
 * @param {string} subjectId
 */
export async function scanQuestionBankModule(rootAbs, relPath, subjectId) {
  const abs = join(rootAbs, relPath);
  const url = pathToFileURL(abs).href;
  const mod = await import(/* webpackIgnore: true */ url);
  /** @type {object[]} */
  const out = [];
  const indexRef = [0];

  for (const key of Object.keys(mod)) {
    if (key === "default") continue;
    const val = mod[key];
    if (typeof val === "function") continue;
    walkQuestionTree(val, relPath, key, subjectId, indexRef, out);
  }

  return { records: out, exportCount: Object.keys(mod).filter((k) => k !== "default").length };
}

/** Scan geometry conceptual export only */
export async function scanGeometryConceptualBank(rootAbs) {
  const rel = GEOMETRY_CONCEPTUAL_BANK.path;
  const abs = join(rootAbs, rel);
  const url = pathToFileURL(abs).href;
  const mod = await import(/* webpackIgnore: true */ url);
  const items = mod[GEOMETRY_CONCEPTUAL_BANK.exportName];
  /** @type {object[]} */
  const out = [];
  const indexRef = [0];
  if (Array.isArray(items)) {
    walkQuestionTree(items, rel, GEOMETRY_CONCEPTUAL_BANK.exportName, GEOMETRY_CONCEPTUAL_BANK.subjectId, indexRef, out);
  }
  return { records: out };
}

export { MIN_QUESTIONS_PER_SKILL_FOR_DIAGNOSIS, looksLikeQuestionRow };
