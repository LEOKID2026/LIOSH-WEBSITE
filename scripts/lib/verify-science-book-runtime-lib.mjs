/**
 * Shared Science grade book runtime verification.
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

/**
 * @param {{
 *   grade: string,
 *   pageOrder: string[],
 *   bookMeta: { routeBase: string, bookTitleHe: string },
 *   batchCount: number,
 *   mustIncludeExperiments?: boolean,
 *   mustExcludeExperiments?: boolean,
 *   mustIncludePlants?: boolean,
 *   mustExcludePlants?: boolean,
 * }} spec
 */
export function verifyScienceBookRuntime(spec) {
  const errors = [];
  const label = `science/${spec.grade}`;

  const entry = getLearningBookEntry("science", spec.grade);
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
  if (!entry?.features?.practice) {
    errors.push(`${label} must enable practice feature`);
  }
  if (getLearningBookIndexHref("science", spec.grade) !== spec.bookMeta.routeBase) {
    errors.push(`${label} index href mismatch`);
  }

  const tile = getLearningBookTileTitle("science", spec.grade);
  const expectedLine2 = `כיתה ${getGradeShortLabel(spec.grade)}`;
  if (tile.line1 !== "ספר מדעים" || tile.line2 !== expectedLine2) {
    errors.push(`${label} tile title mismatch: ${JSON.stringify(tile)}`);
  }

  if (spec.mustIncludeExperiments && !spec.pageOrder.includes("experiments")) {
    errors.push(`${label} must include experiments page`);
  }
  if (spec.mustExcludeExperiments && spec.pageOrder.includes("experiments")) {
    errors.push(`${label} must not include experiments page`);
  }
  if (spec.mustIncludePlants && !spec.pageOrder.includes("plants")) {
    errors.push(`${label} must include plants page`);
  }
  if (spec.mustExcludePlants && spec.pageOrder.includes("plants")) {
    errors.push(`${label} must not include plants page`);
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
    if (page.metadata?.subject !== "science") {
      errors.push(`${label}/${pageId}: metadata subject must be science`);
    }
    if (page.metadata?.approval_status !== "draft") {
      errors.push(`${label}/${pageId}: source approval_status must remain draft`);
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

export function assertScienceMasterPath() {
  if (getLearningBookMasterPath("science") !== "/learning/science-master") {
    return ["science master path must be /learning/science-master"];
  }
  return [];
}
