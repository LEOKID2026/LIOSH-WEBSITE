/**
 * Central learning-book sequence resolver.
 * Page order is derived from LEARNING_BOOK_PAGE_SEQUENCE metadata — not raw array order.
 */
import {
  LEARNING_BOOK_PAGE_SEQUENCE,
  LEARNING_BOOK_SEQUENCE_BOOK_KEYS,
} from "./learning-book-sequence-meta.js";

/** @typedef {{ sequenceIndex: number, batchId: string, batchOrder: number, indexInBatch: number, sequenceGroup?: string, oracleRowId?: string|null, oracleSequenceIndex?: number|null, prerequisitePageIds?: string[], source: string }} PageSequenceMeta */

/**
 * @param {string} subject
 * @param {string} grade
 */
export function getBookSequenceKey(subject, grade) {
  return `${String(subject).toLowerCase()}:${String(grade).toLowerCase()}`;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @returns {PageSequenceMeta|null}
 */
export function getPageSequenceMeta(subject, grade, pageId) {
  const key = getBookSequenceKey(subject, grade);
  return LEARNING_BOOK_PAGE_SEQUENCE[key]?.[pageId] ?? null;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string[]} pageIds
 * @returns {string[]}
 */
export function assertBookSequenceCoverage(subject, grade, pageIds) {
  /** @type {string[]} */
  const violations = [];
  for (const pageId of pageIds) {
    const meta = getPageSequenceMeta(subject, grade, pageId);
    if (!meta || meta.sequenceIndex == null || Number.isNaN(Number(meta.sequenceIndex))) {
      violations.push(`${subject}/${grade}/${pageId}: missing sequenceIndex`);
    }
  }
  return violations;
}

/**
 * Topological sort by prerequisitePageIds when present.
 * @param {{ pageId: string, meta: PageSequenceMeta }[]} items
 */
function topoSortPages(items) {
  const byId = Object.fromEntries(items.map((i) => [i.pageId, i]));
  /** @type {string[]} */
  const sorted = [];
  /** @type {Set<string>} */
  const visiting = new Set();
  /** @type {Set<string>} */
  const done = new Set();

  function visit(pageId) {
    if (done.has(pageId)) return;
    if (visiting.has(pageId)) {
      throw new Error(`cycle in prerequisite chain at ${pageId}`);
    }
    visiting.add(pageId);
    const prereqs = byId[pageId]?.meta?.prerequisitePageIds || [];
    for (const p of prereqs) {
      if (byId[p]) visit(p);
    }
    visiting.delete(pageId);
    done.add(pageId);
    sorted.push(pageId);
  }

  const ordered = items.slice().sort((a, b) => {
    if (a.meta.batchOrder !== b.meta.batchOrder) return a.meta.batchOrder - b.meta.batchOrder;
    return a.meta.sequenceIndex - b.meta.sequenceIndex;
  });

  for (const item of ordered) visit(item.pageId);
  return sorted.map((id) => byId[id]);
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {{ id: string, titleHe: string, pages: string[] }[]} rawBatches
 * @returns {string[]}
 */
export function resolveLearningBookPageOrder(subject, grade, rawBatches) {
  const pageIds = rawBatches.flatMap((b) => b.pages);
  const violations = assertBookSequenceCoverage(subject, grade, pageIds);
  if (violations.length > 0) {
    throw new Error(
      `Sequence coverage failed for ${subject}/${grade}: ${violations.slice(0, 3).join("; ")}`
    );
  }

  const items = pageIds.map((pageId) => ({
    pageId,
    meta: /** @type {PageSequenceMeta} */ (getPageSequenceMeta(subject, grade, pageId)),
  }));

  return topoSortPages(items).map((i) => i.pageId);
}

/**
 * @param {{ id: string, titleHe: string, pages: string[] }[]} rawBatches
 * @param {string[]} pageOrder
 */
export function reorderBatchesToPageOrder(rawBatches, pageOrder) {
  const orderIndex = Object.fromEntries(pageOrder.map((id, i) => [id, i]));
  return rawBatches
    .map((batch) => ({
      ...batch,
      pages: batch.pages
        .slice()
        .sort((a, b) => (orderIndex[a] ?? 9999) - (orderIndex[b] ?? 9999)),
    }))
    .filter((batch) => batch.pages.length > 0);
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {{ id: string, titleHe: string, pages: string[] }[]} rawBatches
 * @param {{ filterPageIds?: (pageOrder: string[]) => string[] }} [options]
 */
export function createSequencedBookExports(subject, grade, rawBatches, options = {}) {
  let pageOrder = resolveLearningBookPageOrder(subject, grade, rawBatches);

  if (options.filterPageIds) {
    const allowed = new Set(options.filterPageIds(pageOrder));
    pageOrder = pageOrder.filter((id) => allowed.has(id));
  }

  const batches = reorderBatchesToPageOrder(rawBatches, pageOrder)
    .map((batch) => ({
      ...batch,
      pages: batch.pages.filter((id) => pageOrder.includes(id)),
    }))
    .filter((batch) => batch.pages.length > 0);

  return {
    pageOrder,
    batches,
    /**
     * @param {string} pageId
     */
    getPageNeighbors(pageId) {
      const index = pageOrder.indexOf(pageId);
      if (index === -1) {
        return { prev: null, next: null, index: -1 };
      }
      return {
        prev: index > 0 ? pageOrder[index - 1] : null,
        next: index < pageOrder.length - 1 ? pageOrder[index + 1] : null,
        index,
      };
    },
    isValidPageId(pageId) {
      return pageOrder.includes(pageId);
    },
  };
}

/**
 * Topic order aligned to book sequence where topic key === pageId (science).
 * @param {string} subject
 * @param {string} grade
 * @param {string[]} topicKeys
 */
export function sortTopicsByBookSequence(subject, grade, topicKeys) {
  const key = getBookSequenceKey(subject, grade);
  const bookMeta = LEARNING_BOOK_PAGE_SEQUENCE[key];
  if (!bookMeta) return topicKeys;

  const order = Object.entries(bookMeta)
    .sort(([, a], [, b]) => a.sequenceIndex - b.sequenceIndex)
    .map(([pageId]) => pageId);

  const rank = Object.fromEntries(order.map((id, i) => [id, i]));
  return topicKeys.slice().sort((a, b) => {
    const ra = rank[a];
    const rb = rank[b];
    if (ra == null && rb == null) return a.localeCompare(b);
    if (ra == null) return 1;
    if (rb == null) return -1;
    return ra - rb;
  });
}

/**
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyAllCompletedBooksSequenceEnforced() {
  /** @type {string[]} */
  const violations = [];

  for (const bookKey of LEARNING_BOOK_SEQUENCE_BOOK_KEYS) {
    const [subject, grade] = bookKey.split(":");
    const meta = LEARNING_BOOK_PAGE_SEQUENCE[bookKey];
    const pageIds = Object.keys(meta || {});
    if (pageIds.length === 0) {
      violations.push(`${bookKey}: no sequence metadata`);
      continue;
    }
    violations.push(...assertBookSequenceCoverage(subject, grade, pageIds));
  }

  return { ok: violations.length === 0, violations };
}

/** Marker consumed by product-alignment verifier (SEQ-02). */
export const LEARNING_BOOK_SEQUENCE_RESOLVER_VERSION = 1;
