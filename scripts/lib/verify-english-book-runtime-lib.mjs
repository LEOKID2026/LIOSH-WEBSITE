/**
 * Shared English grade book runtime verification.
 */
import {
  getLearningBookEntry,
  getLearningBookIndexHref,
} from "../../lib/learning-book/learning-book-catalog.js";
import {
  getLearningBookMasterPath,
  getLearningBookTileTitle,
} from "../../lib/learning-book/learning-book-catalog-meta.js";
import { getGradeShortLabel } from "../../lib/learning-book/learning-book-grade-labels.js";

const FAKE_PRACTICE_RE =
  /english-master\?|fromBook=|resolveEnglish|\/learning\/english-master\?topic=/i;

/**
 * @param {{
 *   grade: string,
 *   pageOrder: string[],
 *   bookMeta: { routeBase: string, bookTitleHe: string },
 *   batchCount: number,
 * }} spec
 */
export function verifyEnglishBookRuntime(spec) {
  const errors = [];
  const label = `english/${spec.grade}`;

  const entry = getLearningBookEntry("english", spec.grade);
  if (!entry) errors.push(`missing ${label} catalog entry`);
  if (entry?.status !== "authored") errors.push(`${label} must be authored`);
  if (entry?.meta?.bookTitleHe !== spec.bookMeta.bookTitleHe) {
    errors.push(`${label} bookTitleHe mismatch: ${entry?.meta?.bookTitleHe}`);
  }
  if (entry?.meta?.routeBase !== spec.bookMeta.routeBase) {
    errors.push(`${label} routeBase mismatch: ${entry?.meta?.routeBase}`);
  }
  if (entry?.registry.pageOrder.length !== spec.pageOrder.length) {
    errors.push(
      `${label} expected ${spec.pageOrder.length} pages, got ${entry?.registry.pageOrder.length}`
    );
  }
  if (
    entry &&
    JSON.stringify(entry.registry.pageOrder) !== JSON.stringify(spec.pageOrder)
  ) {
    errors.push(`${label} page order mismatch vs registry`);
  }
  if (entry?.features?.practice !== true) {
    errors.push(`${label} must enable practice feature`);
  }
  if (getLearningBookIndexHref("english", spec.grade) !== spec.bookMeta.routeBase) {
    errors.push(`${label} index href mismatch`);
  }

  const tile = getLearningBookTileTitle("english", spec.grade);
  const expectedLine2 = `כיתה ${getGradeShortLabel(spec.grade)}`;
  if (tile.line1 !== "ספר אנגלית" || tile.line2 !== expectedLine2) {
    errors.push(`${label} tile title mismatch: ${JSON.stringify(tile)}`);
  }

  for (const pageId of spec.pageOrder) {
    if (!entry?.registry.isValidPageId(pageId)) {
      errors.push(`${label} invalid page id in registry: ${pageId}`);
      continue;
    }
    const page = entry.loader.loadPage(pageId);
    if (!page) {
      errors.push(`${label} could not load page: ${pageId}`);
      continue;
    }
    if (page.sections?.length !== 7) {
      errors.push(
        `${label}/${pageId}: expected 7 sections, got ${page.sections?.length}`
      );
    }
    const visible = JSON.stringify(page);
    if (visible.includes("[DRAFT")) {
      errors.push(`${label}/${pageId}: visible DRAFT marker in parsed page`);
    }
    if (page.displayTitle?.includes("[DRAFT")) {
      errors.push(`${label}/${pageId}: DRAFT in displayTitle`);
    }
    if (visible.match(FAKE_PRACTICE_RE)) {
      errors.push(`${label}/${pageId}: fake practice routing in parsed page`);
    }
    if (page.metadata?.subject !== "english") {
      errors.push(`${label}/${pageId}: metadata subject must be english`);
    }
    if (page.metadata?.approval_status !== "approved") {
      errors.push(`${label}/${pageId}: approval_status must be approved`);
    }
    const expectedLearningPageId = `english:${spec.grade}:${pageId}`;
    if (
      page.metadata?.learning_page_id &&
      page.metadata.learning_page_id !== expectedLearningPageId
    ) {
      errors.push(
        `${label}/${pageId}: learning_page_id ${page.metadata.learning_page_id} != ${expectedLearningPageId}`
      );
    }

    const neighbors = entry.registry.getPageNeighbors(pageId);
    if (neighbors.index === -1) {
      errors.push(`${label}/${pageId}: getPageNeighbors returned index -1`);
    }
  }

  const batches = entry?.loader.loadTocEntries();
  if (batches && batches.length !== spec.batchCount) {
    errors.push(`${label} expected ${spec.batchCount} TOC batches, got ${batches.length}`);
  }
  if (batches) {
    const tocPages = batches.flatMap((b) => b.pages.map((p) => p.pageId));
    if (JSON.stringify(tocPages) !== JSON.stringify(spec.pageOrder)) {
      errors.push(`${label} TOC page order mismatch`);
    }
  }

  return errors;
}

export function assertEnglishMasterPath() {
  if (getLearningBookMasterPath("english") !== "/learning/english-master") {
    return ["english master path must be /learning/english-master"];
  }
  return [];
}

/**
 * @param {Array<{ grade: string, pageOrder: string[] }>} specs
 */
export function checkEnglishLearningPageIdCollisions(specs) {
  const errors = [];
  /** @type {Map<string, string>} */
  const seen = new Map();
  for (const spec of specs) {
    for (const pageId of spec.pageOrder) {
      const id = `english:${spec.grade}:${pageId}`;
      if (seen.has(id)) {
        errors.push(`learning_page_id collision: ${id} in ${seen.get(id)} and ${spec.grade}`);
      }
      seen.set(id, spec.grade);
    }
  }
  return errors;
}
