/**
 * Shared learning-book sequence enforcement checks for final sync verifiers.
 */
import fs from "node:fs";
import path from "node:path";
import {
  resolveLearningBookPageOrder,
  assertBookSequenceCoverage,
  getPageSequenceMeta,
  verifyAllCompletedBooksSequenceEnforced,
} from "../../lib/learning-book/learning-book-sequence.js";

const ROOT = process.cwd();

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string[]} pageOrder
 * @param {{ id: string, pages: string[] }[]} batches
 * @returns {string[]}
 */
export function verifyBookSequenceEnforced(subject, grade, pageOrder, batches) {
  /** @type {string[]} */
  const errors = [];

  const regPath = path.join(ROOT, `lib/learning-book/${subject}-${grade}-registry.js`);
  if (!fs.existsSync(regPath)) {
    errors.push(`${subject}/${grade}: missing registry`);
    return errors;
  }
  const regSrc = fs.readFileSync(regPath, "utf8");
  if (!regSrc.includes("createSequencedBookExports")) {
    errors.push(`${subject}/${grade}: registry must use createSequencedBookExports`);
  }
  if (!regSrc.includes("learning-book-sequence")) {
    errors.push(`${subject}/${grade}: registry must import learning-book-sequence`);
  }

  const rawBatchesMatch = regSrc.match(
    new RegExp(`const ${subject.toUpperCase()}_${grade.toUpperCase()}_BOOK_BATCHES_RAW`)
  );
  if (!rawBatchesMatch) {
    errors.push(`${subject}/${grade}: missing *_BOOK_BATCHES_RAW source batches`);
  }

  errors.push(...assertBookSequenceCoverage(subject, grade, pageOrder));

  try {
    const expected = resolveLearningBookPageOrder(subject, grade, batches);
    if (expected.join(",") !== pageOrder.join(",")) {
      errors.push(
        `${subject}/${grade}: PAGE_ORDER diverges from sequence resolver`
      );
    }
  } catch (err) {
    errors.push(`${subject}/${grade}: sequence resolver error: ${err.message}`);
  }

  const flat = batches.flatMap((b) => b.pages);
  if (flat.join(",") !== pageOrder.join(",")) {
    errors.push(`${subject}/${grade}: batches flatMap !== sequenced PAGE_ORDER`);
  }

  for (const pageId of pageOrder) {
    const meta = getPageSequenceMeta(subject, grade, pageId);
    if (!meta?.sequenceIndex) {
      errors.push(`${subject}/${grade}/${pageId}: missing sequenceIndex in meta`);
    }
  }

  // Geometry G5 teach-path prerequisite
  if (subject === "geometry" && grade === "g5") {
    const hTri = pageOrder.indexOf("heights_triangle");
    const triArea = pageOrder.indexOf("triangle_area");
    if (hTri !== -1 && triArea !== -1 && hTri >= triArea) {
      errors.push(
        `${subject}/${grade}: heights_triangle must precede triangle_area in sequence`
      );
    }
  }

  return errors;
}

/**
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyGlobalSequenceEnforcement() {
  return verifyAllCompletedBooksSequenceEnforced();
}
