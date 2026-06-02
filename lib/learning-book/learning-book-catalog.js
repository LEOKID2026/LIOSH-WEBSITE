/**
 * Server-side learning book catalog (loaders, SSG). Do not import from client pages.
 */

import {
  MATH_G1_BOOK_BATCHES,
  MATH_G1_PAGE_ORDER,
  getMathG1PageNeighbors,
  isValidMathG1PageId,
} from "./math-g1-registry.js";
import {
  MATH_G2_BOOK_BATCHES,
  MATH_G2_PAGE_ORDER,
  getMathG2PageNeighbors,
  isValidMathG2PageId,
} from "./math-g2-registry.js";
import {
  MATH_G3_BOOK_BATCHES,
  MATH_G3_PAGE_ORDER,
  getMathG3PageNeighbors,
  isValidMathG3PageId,
} from "./math-g3-registry.js";
import { createPlaceholderBookRegistry } from "./create-placeholder-book-registry.js";
import { createLearningBookPageLoader } from "./load-learning-book-pages.js";
import { createLearningBookNav } from "./learning-book-nav.js";
import {
  getLearningBookKey,
  LEARNING_BOOK_META_BY_KEY,
} from "./learning-book-catalog-meta.js";

/** @type {Map<string, ReturnType<typeof buildServerCatalogEntry>>} */
const serverCache = new Map();

/**
 * @param {{
 *   subject: string,
 *   grade: string,
 *   status: "authored"|"placeholder",
 *   batches: typeof MATH_G1_BOOK_BATCHES,
 *   pageOrder: string[],
 *   meta: Record<string, unknown>,
 *   getPageNeighbors: (pageId: string) => { prev: string|null, next: string|null, index: number },
 *   isValidPageId: (pageId: string) => boolean,
 *   masterPath: string,
 *   features?: { practice?: boolean, topicResolve?: boolean, questionResolve?: boolean },
 * }} def
 */
function buildServerCatalogEntry(def) {
  const registry = {
    batches: def.batches,
    pageOrder: def.pageOrder,
    meta: { ...def.meta, status: def.status },
    getPageNeighbors: def.getPageNeighbors,
    isValidPageId: def.isValidPageId,
  };

  const loader = createLearningBookPageLoader(registry);
  const nav = createLearningBookNav(def.subject, def.grade, def.masterPath);

  return {
    key: getLearningBookKey(def.subject, def.grade),
    subject: def.subject,
    grade: def.grade,
    status: def.status,
    registry,
    loader,
    nav,
    meta: registry.meta,
    features: {
      practice: def.features?.practice ?? false,
      topicResolve: def.features?.topicResolve ?? false,
      questionResolve: def.features?.questionResolve ?? false,
    },
  };
}

function getOrCreateServerEntry(subject, grade) {
  const key = getLearningBookKey(subject, grade);
  if (serverCache.has(key)) {
    return serverCache.get(key);
  }

  const clientMeta = LEARNING_BOOK_META_BY_KEY[key];
  if (!clientMeta) return null;

  let entry;

  if (subject === "math" && grade === "g1") {
    entry = buildServerCatalogEntry({
      subject: "math",
      grade: "g1",
      status: "authored",
      batches: MATH_G1_BOOK_BATCHES,
      pageOrder: MATH_G1_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMathG1PageNeighbors,
      isValidPageId: isValidMathG1PageId,
      masterPath: "/learning/math-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "math" && grade === "g2") {
    entry = buildServerCatalogEntry({
      subject: "math",
      grade: "g2",
      status: "authored",
      batches: MATH_G2_BOOK_BATCHES,
      pageOrder: MATH_G2_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMathG2PageNeighbors,
      isValidPageId: isValidMathG2PageId,
      masterPath: "/learning/math-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "math" && grade === "g3") {
    entry = buildServerCatalogEntry({
      subject: "math",
      grade: "g3",
      status: "authored",
      batches: MATH_G3_BOOK_BATCHES,
      pageOrder: MATH_G3_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMathG3PageNeighbors,
      isValidPageId: isValidMathG3PageId,
      masterPath: "/learning/math-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (clientMeta.status === "placeholder") {
    const reg = createPlaceholderBookRegistry(subject, grade, {
      subjectTitleHe: clientMeta.meta.subjectTitleHe,
    });
    entry = buildServerCatalogEntry({
      subject,
      grade,
      status: "placeholder",
      batches: reg.batches,
      pageOrder: reg.pageOrder,
      meta: clientMeta.meta,
      getPageNeighbors: reg.getPageNeighbors,
      isValidPageId: reg.isValidPageId,
      masterPath:
        subject === "geometry"
          ? "/learning/geometry-master"
          : "/learning/math-master",
    });
  } else {
    return null;
  }

  serverCache.set(key, entry);
  return entry;
}

export const LEARNING_BOOK_CATALOG_LIST = (() => {
  const keys = Object.keys(LEARNING_BOOK_META_BY_KEY);
  return keys
    .map((key) => {
      const [subject, grade] = key.split(":");
      return getOrCreateServerEntry(subject, grade);
    })
    .filter(Boolean);
})();

/**
 * @param {string} subject
 * @param {string} grade
 */
export function getLearningBookEntry(subject, grade) {
  return getOrCreateServerEntry(String(subject).toLowerCase(), String(grade).toLowerCase());
}

export function getDynamicRouteBooks() {
  return LEARNING_BOOK_CATALOG_LIST.filter(
    (book) => !(book.subject === "math" && ["g1", "g2", "g3"].includes(book.grade))
  );
}

// Re-export client-safe helpers for server scripts convenience
export {
  getLearningBookIndexHref,
  getLearningBookTileTitle,
  getLearningBookSubjectLabelHe,
  hasLearningBook,
} from "./learning-book-catalog-meta.js";
