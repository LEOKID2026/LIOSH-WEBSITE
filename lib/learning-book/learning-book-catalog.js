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
  getGeometryG6AccessibleBookBatches,
  getGeometryG6AccessiblePageOrder,
  getGeometryG6PageNeighbors,
  isValidGeometryG6PageId,
} from "./geometry-g6-registry.js";
import {
  SCIENCE_G1_BOOK_BATCHES,
  SCIENCE_G1_PAGE_ORDER,
  getScienceG1PageNeighbors,
  isValidScienceG1PageId,
} from "./science-g1-registry.js";
import {
  SCIENCE_G2_BOOK_BATCHES,
  SCIENCE_G2_PAGE_ORDER,
  getScienceG2PageNeighbors,
  isValidScienceG2PageId,
} from "./science-g2-registry.js";
import {
  SCIENCE_G3_BOOK_BATCHES,
  SCIENCE_G3_PAGE_ORDER,
  getScienceG3PageNeighbors,
  isValidScienceG3PageId,
} from "./science-g3-registry.js";
import {
  SCIENCE_G4_BOOK_BATCHES,
  SCIENCE_G4_PAGE_ORDER,
  getScienceG4PageNeighbors,
  isValidScienceG4PageId,
} from "./science-g4-registry.js";
import {
  SCIENCE_G5_BOOK_BATCHES,
  SCIENCE_G5_PAGE_ORDER,
  getScienceG5PageNeighbors,
  isValidScienceG5PageId,
} from "./science-g5-registry.js";
import {
  SCIENCE_G6_BOOK_BATCHES,
  SCIENCE_G6_PAGE_ORDER,
  getScienceG6PageNeighbors,
  isValidScienceG6PageId,
} from "./science-g6-registry.js";
import {
  HEBREW_G1_BOOK_BATCHES,
  HEBREW_G1_PAGE_ORDER,
  getHebrewG1PageNeighbors,
  isValidHebrewG1PageId,
} from "./hebrew-g1-registry.js";
import {
  HEBREW_G2_BOOK_BATCHES,
  HEBREW_G2_PAGE_ORDER,
  getHebrewG2PageNeighbors,
  isValidHebrewG2PageId,
} from "./hebrew-g2-registry.js";
import {
  HEBREW_G3_BOOK_BATCHES,
  HEBREW_G3_PAGE_ORDER,
  getHebrewG3PageNeighbors,
  isValidHebrewG3PageId,
} from "./hebrew-g3-registry.js";
import {
  HEBREW_G4_BOOK_BATCHES,
  HEBREW_G4_PAGE_ORDER,
  getHebrewG4PageNeighbors,
  isValidHebrewG4PageId,
} from "./hebrew-g4-registry.js";
import {
  HEBREW_G5_BOOK_BATCHES,
  HEBREW_G5_PAGE_ORDER,
  getHebrewG5PageNeighbors,
  isValidHebrewG5PageId,
} from "./hebrew-g5-registry.js";
import {
  HEBREW_G6_BOOK_BATCHES,
  HEBREW_G6_PAGE_ORDER,
  getHebrewG6PageNeighbors,
  isValidHebrewG6PageId,
} from "./hebrew-g6-registry.js";
import {
  ENGLISH_G1_BOOK_BATCHES,
  ENGLISH_G1_PAGE_ORDER,
  getEnglishG1PageNeighbors,
  isValidEnglishG1PageId,
} from "./english-g1-registry.js";
import {
  ENGLISH_G2_BOOK_BATCHES,
  ENGLISH_G2_PAGE_ORDER,
  getEnglishG2PageNeighbors,
  isValidEnglishG2PageId,
} from "./english-g2-registry.js";
import {
  ENGLISH_G3_BOOK_BATCHES,
  ENGLISH_G3_PAGE_ORDER,
  getEnglishG3PageNeighbors,
  isValidEnglishG3PageId,
} from "./english-g3-registry.js";
import {
  ENGLISH_G4_BOOK_BATCHES,
  ENGLISH_G4_PAGE_ORDER,
  getEnglishG4PageNeighbors,
  isValidEnglishG4PageId,
} from "./english-g4-registry.js";
import {
  ENGLISH_G5_BOOK_BATCHES,
  ENGLISH_G5_PAGE_ORDER,
  getEnglishG5PageNeighbors,
  isValidEnglishG5PageId,
} from "./english-g5-registry.js";
import {
  ENGLISH_G6_BOOK_BATCHES,
  ENGLISH_G6_PAGE_ORDER,
  getEnglishG6PageNeighbors,
  isValidEnglishG6PageId,
} from "./english-g6-registry.js";
import {
  MOLEDET_G2_BOOK_BATCHES,
  MOLEDET_G2_PAGE_ORDER,
  getMoledetG2PageNeighbors,
  isValidMoledetG2PageId,
} from "./moledet-g2-registry.js";
import {
  MOLEDET_G3_BOOK_BATCHES,
  MOLEDET_G3_PAGE_ORDER,
  getMoledetG3PageNeighbors,
  isValidMoledetG3PageId,
} from "./moledet-g3-registry.js";
import {
  MOLEDET_G4_BOOK_BATCHES,
  MOLEDET_G4_PAGE_ORDER,
  getMoledetG4PageNeighbors,
  isValidMoledetG4PageId,
} from "./moledet-g4-registry.js";
import {
  GEOGRAPHY_G5_BOOK_BATCHES,
  GEOGRAPHY_G5_PAGE_ORDER,
  getGeographyG5PageNeighbors,
  isValidGeographyG5PageId,
} from "./geography-g5-registry.js";
import {
  GEOGRAPHY_G6_BOOK_BATCHES,
  GEOGRAPHY_G6_PAGE_ORDER,
  getGeographyG6PageNeighbors,
  isValidGeographyG6PageId,
} from "./geography-g6-registry.js";
import {
  HISTORY_G6_BOOK_BATCHES,
  HISTORY_G6_PAGE_ORDER,
  getHistoryG6PageNeighbors,
  isValidHistoryG6PageId,
} from "./history-g6-registry.js";
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
      batches: getGeometryG6AccessibleBookBatches(),
      pageOrder: getGeometryG6AccessiblePageOrder(),
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
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "science" && grade === "g2") {
    entry = buildServerCatalogEntry({
      subject: "science",
      grade: "g2",
      status: "authored",
      batches: SCIENCE_G2_BOOK_BATCHES,
      pageOrder: SCIENCE_G2_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getScienceG2PageNeighbors,
      isValidPageId: isValidScienceG2PageId,
      masterPath: "/learning/science-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "science" && grade === "g3") {
    entry = buildServerCatalogEntry({
      subject: "science",
      grade: "g3",
      status: "authored",
      batches: SCIENCE_G3_BOOK_BATCHES,
      pageOrder: SCIENCE_G3_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getScienceG3PageNeighbors,
      isValidPageId: isValidScienceG3PageId,
      masterPath: "/learning/science-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "science" && grade === "g4") {
    entry = buildServerCatalogEntry({
      subject: "science",
      grade: "g4",
      status: "authored",
      batches: SCIENCE_G4_BOOK_BATCHES,
      pageOrder: SCIENCE_G4_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getScienceG4PageNeighbors,
      isValidPageId: isValidScienceG4PageId,
      masterPath: "/learning/science-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "science" && grade === "g5") {
    entry = buildServerCatalogEntry({
      subject: "science",
      grade: "g5",
      status: "authored",
      batches: SCIENCE_G5_BOOK_BATCHES,
      pageOrder: SCIENCE_G5_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getScienceG5PageNeighbors,
      isValidPageId: isValidScienceG5PageId,
      masterPath: "/learning/science-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "science" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "science",
      grade: "g6",
      status: "authored",
      batches: SCIENCE_G6_BOOK_BATCHES,
      pageOrder: SCIENCE_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getScienceG6PageNeighbors,
      isValidPageId: isValidScienceG6PageId,
      masterPath: "/learning/science-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "hebrew" && grade === "g1") {
    entry = buildServerCatalogEntry({
      subject: "hebrew",
      grade: "g1",
      status: "authored",
      batches: HEBREW_G1_BOOK_BATCHES,
      pageOrder: HEBREW_G1_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHebrewG1PageNeighbors,
      isValidPageId: isValidHebrewG1PageId,
      masterPath: "/learning/hebrew-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "hebrew" && grade === "g2") {
    entry = buildServerCatalogEntry({
      subject: "hebrew",
      grade: "g2",
      status: "authored",
      batches: HEBREW_G2_BOOK_BATCHES,
      pageOrder: HEBREW_G2_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHebrewG2PageNeighbors,
      isValidPageId: isValidHebrewG2PageId,
      masterPath: "/learning/hebrew-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "hebrew" && grade === "g3") {
    entry = buildServerCatalogEntry({
      subject: "hebrew",
      grade: "g3",
      status: "authored",
      batches: HEBREW_G3_BOOK_BATCHES,
      pageOrder: HEBREW_G3_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHebrewG3PageNeighbors,
      isValidPageId: isValidHebrewG3PageId,
      masterPath: "/learning/hebrew-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "hebrew" && grade === "g4") {
    entry = buildServerCatalogEntry({
      subject: "hebrew",
      grade: "g4",
      status: "authored",
      batches: HEBREW_G4_BOOK_BATCHES,
      pageOrder: HEBREW_G4_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHebrewG4PageNeighbors,
      isValidPageId: isValidHebrewG4PageId,
      masterPath: "/learning/hebrew-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "hebrew" && grade === "g5") {
    entry = buildServerCatalogEntry({
      subject: "hebrew",
      grade: "g5",
      status: "authored",
      batches: HEBREW_G5_BOOK_BATCHES,
      pageOrder: HEBREW_G5_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHebrewG5PageNeighbors,
      isValidPageId: isValidHebrewG5PageId,
      masterPath: "/learning/hebrew-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "hebrew" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "hebrew",
      grade: "g6",
      status: "authored",
      batches: HEBREW_G6_BOOK_BATCHES,
      pageOrder: HEBREW_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHebrewG6PageNeighbors,
      isValidPageId: isValidHebrewG6PageId,
      masterPath: "/learning/hebrew-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "english" && grade === "g1") {
    entry = buildServerCatalogEntry({
      subject: "english",
      grade: "g1",
      status: "authored",
      batches: ENGLISH_G1_BOOK_BATCHES,
      pageOrder: ENGLISH_G1_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getEnglishG1PageNeighbors,
      isValidPageId: isValidEnglishG1PageId,
      masterPath: "/learning/english-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "english" && grade === "g2") {
    entry = buildServerCatalogEntry({
      subject: "english",
      grade: "g2",
      status: "authored",
      batches: ENGLISH_G2_BOOK_BATCHES,
      pageOrder: ENGLISH_G2_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getEnglishG2PageNeighbors,
      isValidPageId: isValidEnglishG2PageId,
      masterPath: "/learning/english-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "english" && grade === "g3") {
    entry = buildServerCatalogEntry({
      subject: "english",
      grade: "g3",
      status: "authored",
      batches: ENGLISH_G3_BOOK_BATCHES,
      pageOrder: ENGLISH_G3_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getEnglishG3PageNeighbors,
      isValidPageId: isValidEnglishG3PageId,
      masterPath: "/learning/english-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "english" && grade === "g4") {
    entry = buildServerCatalogEntry({
      subject: "english",
      grade: "g4",
      status: "authored",
      batches: ENGLISH_G4_BOOK_BATCHES,
      pageOrder: ENGLISH_G4_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getEnglishG4PageNeighbors,
      isValidPageId: isValidEnglishG4PageId,
      masterPath: "/learning/english-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "english" && grade === "g5") {
    entry = buildServerCatalogEntry({
      subject: "english",
      grade: "g5",
      status: "authored",
      batches: ENGLISH_G5_BOOK_BATCHES,
      pageOrder: ENGLISH_G5_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getEnglishG5PageNeighbors,
      isValidPageId: isValidEnglishG5PageId,
      masterPath: "/learning/english-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "english" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "english",
      grade: "g6",
      status: "authored",
      batches: ENGLISH_G6_BOOK_BATCHES,
      pageOrder: ENGLISH_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getEnglishG6PageNeighbors,
      isValidPageId: isValidEnglishG6PageId,
      masterPath: "/learning/english-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "moledet" && grade === "g2") {
    entry = buildServerCatalogEntry({
      subject: "moledet",
      grade: "g2",
      status: "authored",
      batches: MOLEDET_G2_BOOK_BATCHES,
      pageOrder: MOLEDET_G2_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMoledetG2PageNeighbors,
      isValidPageId: isValidMoledetG2PageId,
      masterPath: "/learning/moledet-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "moledet" && grade === "g3") {
    entry = buildServerCatalogEntry({
      subject: "moledet",
      grade: "g3",
      status: "authored",
      batches: MOLEDET_G3_BOOK_BATCHES,
      pageOrder: MOLEDET_G3_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMoledetG3PageNeighbors,
      isValidPageId: isValidMoledetG3PageId,
      masterPath: "/learning/moledet-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "moledet" && grade === "g4") {
    entry = buildServerCatalogEntry({
      subject: "moledet",
      grade: "g4",
      status: "authored",
      batches: MOLEDET_G4_BOOK_BATCHES,
      pageOrder: MOLEDET_G4_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getMoledetG4PageNeighbors,
      isValidPageId: isValidMoledetG4PageId,
      masterPath: "/learning/moledet-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geography" && grade === "g5") {
    entry = buildServerCatalogEntry({
      subject: "geography",
      grade: "g5",
      status: "authored",
      batches: GEOGRAPHY_G5_BOOK_BATCHES,
      pageOrder: GEOGRAPHY_G5_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeographyG5PageNeighbors,
      isValidPageId: isValidGeographyG5PageId,
      masterPath: "/learning/geography-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "geography" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "geography",
      grade: "g6",
      status: "authored",
      batches: GEOGRAPHY_G6_BOOK_BATCHES,
      pageOrder: GEOGRAPHY_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getGeographyG6PageNeighbors,
      isValidPageId: isValidGeographyG6PageId,
      masterPath: "/learning/geography-master",
      features: { practice: true, topicResolve: true, questionResolve: true },
    });
  } else if (subject === "history" && grade === "g6") {
    entry = buildServerCatalogEntry({
      subject: "history",
      grade: "g6",
      status: "authored",
      batches: HISTORY_G6_BOOK_BATCHES,
      pageOrder: HISTORY_G6_PAGE_ORDER,
      meta: clientMeta.meta,
      getPageNeighbors: getHistoryG6PageNeighbors,
      isValidPageId: isValidHistoryG6PageId,
      masterPath: "/learning/history-master",
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
          : subject === "science"
            ? "/learning/science-master"
            : subject === "hebrew"
              ? "/learning/hebrew-master"
              : subject === "english"
                ? "/learning/english-master"
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
  getVisibleLearningBooks,
} from "./learning-book-catalog-meta.js";
