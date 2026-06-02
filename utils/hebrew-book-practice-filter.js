import { parseHebrewRichPatternFromSkillId } from "../lib/learning-book/hebrew-book-practice-map.js";
import { resolveG1ItemSubtopicId } from "./hebrew-g1-subtopic.js";
import { resolveG2ItemSubtopicId } from "./hebrew-g2-subtopic.js";
import { resolveUpperGradeItemSubtopicId } from "./hebrew-g3456-subtopic.js";

/**
 * @param {Record<string, unknown>} row
 * @param {string} gradeKey
 * @param {string} topicKey
 */
function resolveRowSubtopicId(row, gradeKey, topicKey) {
  const g = String(gradeKey || "").toLowerCase();
  if (g === "g1") return resolveG1ItemSubtopicId(row, topicKey);
  if (g === "g2") return resolveG2ItemSubtopicId(row, topicKey);
  if (["g3", "g4", "g5", "g6"].includes(g)) {
    return resolveUpperGradeItemSubtopicId(g, row, topicKey);
  }
  return null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} pageId
 * @param {string} skillId
 */
export function hebrewBookRowMatchesPage(row, gradeKey, topicKey, pageId, skillId) {
  if (!pageId) return false;

  if (row?.subtopicId != null && String(row.subtopicId).trim() === pageId) {
    return true;
  }

  const resolved = resolveRowSubtopicId(row, gradeKey, topicKey);
  if (resolved === pageId) return true;

  const pat = parseHebrewRichPatternFromSkillId(skillId);
  if (pat && row?.patternFamily === pat.patternFamily && row?.subtype === pat.subtype) {
    return true;
  }

  if (
    pat &&
    row?.subtype === pat.subtype &&
    (pageId === pat.subtype ||
      pageId.endsWith(`_${pat.subtype}`) ||
      pageId.includes(pat.subtype))
  ) {
    return row?.patternFamily === pat.patternFamily;
  }

  return false;
}

/**
 * @param {unknown[]} merged
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} pageId
 * @param {string} [skillId]
 */
export function filterHebrewPoolByBookPage(
  merged,
  gradeKey,
  topicKey,
  pageId,
  skillId = ""
) {
  if (!pageId || !Array.isArray(merged) || merged.length === 0) return merged;
  const matched = merged.filter((row) =>
    hebrewBookRowMatchesPage(row, gradeKey, topicKey, pageId, skillId)
  );
  return matched.length > 0 ? matched : merged;
}
