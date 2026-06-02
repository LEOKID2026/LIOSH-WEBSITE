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
import {
  MATH_G4_BOOK_BATCHES,
  MATH_G4_PAGE_ORDER,
  getMathG4PageNeighbors,
  isValidMathG4PageId,
} from "./math-g4-registry.js";
import {
  MATH_G5_BOOK_BATCHES,
  MATH_G5_PAGE_ORDER,
  getMathG5PageNeighbors,
  isValidMathG5PageId,
} from "./math-g5-registry.js";
import {
  MATH_G6_BOOK_BATCHES,
  MATH_G6_PAGE_ORDER,
  getMathG6PageNeighbors,
  isValidMathG6PageId,
} from "./math-g6-registry.js";
import {
  GEOMETRY_G1_BOOK_BATCHES,
  GEOMETRY_G1_PAGE_ORDER,
  getGeometryG1PageNeighbors,
  isValidGeometryG1PageId,
} from "./geometry-g1-registry.js";
import {
  GEOMETRY_G2_BOOK_BATCHES,
  GEOMETRY_G2_PAGE_ORDER,
  getGeometryG2PageNeighbors,
  isValidGeometryG2PageId,
} from "./geometry-g2-registry.js";
import {
  GEOMETRY_G3_BOOK_BATCHES,
  GEOMETRY_G3_PAGE_ORDER,
  getGeometryG3PageNeighbors,
  isValidGeometryG3PageId,
} from "./geometry-g3-registry.js";
import {
  GEOMETRY_G4_BOOK_BATCHES,
  GEOMETRY_G4_PAGE_ORDER,
  getGeometryG4PageNeighbors,
  isValidGeometryG4PageId,
} from "./geometry-g4-registry.js";
import {
  GEOMETRY_G5_BOOK_BATCHES,
  GEOMETRY_G5_PAGE_ORDER,
  getGeometryG5PageNeighbors,
  isValidGeometryG5PageId,
} from "./geometry-g5-registry.js";
import {
  GEOMETRY_G6_BOOK_BATCHES,
  GEOMETRY_G6_PAGE_ORDER,
  getGeometryG6PageNeighbors,
  isValidGeometryG6PageId,
} from "./geometry-g6-registry.js";
import {
  SCIENCE_G1_BOOK_BATCHES,
  SCIENCE_G1_PAGE_ORDER,
  getScienceG1PageNeighbors,
  isValidScienceG1PageId,
} from "./science-g1-registry.js";
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
  } else if (subject === "math" && grade === "g4") {
    entry = buildServerCatalogEntry({
      subject: "math",
      grade: "g4",
      status: "authored",
      batches: MATH_G4_BOOK_BATCHES,
      pageOrder: MATH_G4_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMathG4PageNeighbors,
      isValidPageId: isValidMathG4PageId,
      masterPath: "/learning/math-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "math" && grade === "g5") {
    entry = buildServerCatalogEntry({
      subject: "math",
      grade: "g5",
      status: "authored",
      batches: MATH_G5_BOOK_BATCHES,
      pageOrder: MATH_G5_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMathG5PageNeighbors,
      isValidPageId: isValidMathG5PageId,
      masterPath: "/learning/math-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "math" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "math",
      grade: "g6",
      status: "authored",
      batches: MATH_G6_BOOK_BATCHES,
      pageOrder: MATH_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMathG6PageNeighbors,
      isValidPageId: isValidMathG6PageId,
      masterPath: "/learning/math-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geometry" && grade === "g1") {
    entry = buildServerCatalogEntry({
      subject: "geometry",
      grade: "g1",
      status: "authored",
      batches: GEOMETRY_G1_BOOK_BATCHES,
      pageOrder: GEOMETRY_G1_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeometryG1PageNeighbors,
      isValidPageId: isValidGeometryG1PageId,
      masterPath: "/learning/geometry-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geometry" && grade === "g2") {
    entry = buildServerCatalogEntry({
      subject: "geometry",
      grade: "g2",
      status: "authored",
      batches: GEOMETRY_G2_BOOK_BATCHES,
      pageOrder: GEOMETRY_G2_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeometryG2PageNeighbors,
      isValidPageId: isValidGeometryG2PageId,
      masterPath: "/learning/geometry-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geometry" && grade === "g3") {
    entry = buildServerCatalogEntry({
      subject: "geometry",
      grade: "g3",
      status: "authored",
      batches: GEOMETRY_G3_BOOK_BATCHES,
      pageOrder: GEOMETRY_G3_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeometryG3PageNeighbors,
      isValidPageId: isValidGeometryG3PageId,
      masterPath: "/learning/geometry-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geometry" && grade === "g4") {
    entry = buildServerCatalogEntry({
      subject: "geometry",
      grade: "g4",
      status: "authored",
      batches: GEOMETRY_G4_BOOK_BATCHES,
      pageOrder: GEOMETRY_G4_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeometryG4PageNeighbors,
      isValidPageId: isValidGeometryG4PageId,
      masterPath: "/learning/geometry-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geometry" && grade === "g5") {
    entry = buildServerCatalogEntry({
      subject: "geometry",
      grade: "g5",
      status: "authored",
      batches: GEOMETRY_G5_BOOK_BATCHES,
      pageOrder: GEOMETRY_G5_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeometryG5PageNeighbors,
      isValidPageId: isValidGeometryG5PageId,
      masterPath: "/learning/geometry-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geometry" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "geometry",
      grade: "g6",
      status: "authored",
      batches: GEOMETRY_G6_BOOK_BATCHES,
      pageOrder: GEOMETRY_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeometryG6PageNeighbors,
      isValidPageId: isValidGeometryG6PageId,
      masterPath: "/learning/geometry-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "science" && grade === "g1") {
    entry = buildServerCatalogEntry({
      subject: "science",
      grade: "g1",
      status: "authored",
      batches: SCIENCE_G1_BOOK_BATCHES,
      pageOrder: SCIENCE_G1_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getScienceG1PageNeighbors,
      isValidPageId: isValidScienceG1PageId,
      masterPath: "/learning/science-master",
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
          : subject === "science"
            ? "/learning/science-master"
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

const EXPLICIT_ROUTE_KEYS = new Set([
  ...["g1", "g2", "g3", "g4", "g5", "g6"].map((g) => `math:${g}`),
  "geometry:g1",
  "geometry:g2",
  "geometry:g3",
  "geometry:g4",
  "geometry:g5",
  "geometry:g6",
]);

export function getDynamicRouteBooks() {
  return LEARNING_BOOK_CATALOG_LIST.filter((book) => !EXPLICIT_ROUTE_KEYS.has(book.key));
}

// Re-export client-safe helpers for server scripts convenience
export {
  getLearningBookIndexHref,
  getLearningBookTileTitle,
  getLearningBookSubjectLabelHe,
  getLearningBookMasterPath,
  hasLearningBook,
} from "./learning-book-catalog-meta.js";
