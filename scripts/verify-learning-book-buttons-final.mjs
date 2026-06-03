#!/usr/bin/env node
/**
 * Final learning-book button verifier — main index tile + per-topic הסבר בספר.
 * Run: node scripts/verify-learning-book-buttons-final.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  getLearningBookIndexHref,
  hasLearningBook,
  getVisibleLearningBooks,
} from "../lib/learning-book/learning-book-catalog-meta.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import {
  GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE,
  GEOMETRY_PAGE_ORDER_BY_GRADE,
} from "../lib/learning-book/geometry-book-practice-map.js";
import { SCIENCE_PAGE_TO_PRACTICE_BY_GRADE } from "../lib/learning-book/science-book-practice-map.js";
import {
  HEBREW_PAGE_TO_PRACTICE_BY_GRADE,
  firstHebrewBookPageForTopic,
} from "../lib/learning-book/hebrew-book-practice-map.js";
import {
  ENGLISH_PAGE_TO_PRACTICE_BY_GRADE,
  firstEnglishBookPageForTopic,
} from "../lib/learning-book/english-book-practice-map.js";
import { GRADES as MATH_GRADES } from "../utils/math-constants.js";
import { GRADES as GEOMETRY_GRADES } from "../utils/geometry-constants.js";
import { GRADES as HEBREW_GRADES } from "../utils/hebrew-constants.js";
import { SCIENCE_GRADES } from "../data/science-curriculum.js";
import { ENGLISH_GRADES } from "../data/english-curriculum.js";
import { GRADES as MG_GRADES } from "../utils/moledet-geography-constants.js";
import {
  MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE,
} from "../lib/learning-book/moledet-geography-book-practice-map.js";
import {
  getMoledetGeographyBookHref,
  getMoledetGeographyBookSubjectForGrade,
} from "../lib/learning-book/resolve-moledet-geography-book-page.js";

const ROOT = process.cwd();
const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];
const MG_PUBLISHED_GRADES = ["g2", "g3", "g4", "g5", "g6"];
const MOLEDET_BOOK_GRADES = ["g2", "g3", "g4"];
const GEOGRAPHY_BOOK_GRADES = ["g5", "g6"];

/** @type {string[]} */
const failures = [];

/** @type {Record<string, { main: "PASS"|"FAIL", explain: "PASS"|"FAIL"|"NOT_APPLICABLE" }>} */
const results = {};

/** @type {Map<string, Record<string, string>>} */
const mathOperationToPageCache = new Map();

function key(subject, grade) {
  return `${subject}:${grade}`;
}

function fail(code, detail) {
  failures.push(`${code}: ${detail}`);
}

function setResult(subject, grade, field, value) {
  const k = key(subject, grade);
  if (!results[k]) results[k] = { main: "PASS", explain: "PASS" };
  results[k][field] = value;
}

/** @param {string} rel */
function readMaster(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    fail("master.missing", rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

/** @param {string} grade */
function parseMathOperationToPage(grade) {
  if (mathOperationToPageCache.has(grade)) {
    return mathOperationToPageCache.get(grade);
  }
  const file = path.join(ROOT, `lib/learning-book/resolve-math-${grade}-book-page.js`);
  const src = fs.readFileSync(file, "utf8");
  /** @type {Record<string, string>} */
  const map = {};
  const block = src.match(/const OPERATION_TO_PAGE = Object\.freeze\(\{([\s\S]*?)\}\)/);
  if (block) {
    for (const line of block[1].split("\n")) {
      const m = /^\s*([a-z0-9_]+):\s*"([^"]+)"/.exec(line);
      if (m) map[m[1]] = m[2];
    }
  }
  mathOperationToPageCache.set(grade, map);
  return map;
}

/** @param {string} subject @param {string} grade @param {string} pageId */
function buildBookPageHref(subject, grade, pageId) {
  const entry = getLearningBookEntry(subject, grade);
  if (!entry?.meta?.routeBase) return null;
  return `${entry.meta.routeBase}/${pageId}`;
}

/** @param {string} grade @param {{ operation?: string }} ctx */
function getMathBookHref(grade, ctx) {
  const op = String(ctx.operation || "").trim();
  if (!op || op === "mixed") return null;
  const entry = getLearningBookEntry("math", grade);
  if (!entry) return null;
  const pageId = parseMathOperationToPage(grade)[op];
  if (!pageId || !entry.registry.pageOrder.includes(pageId)) return null;
  return buildBookPageHref("math", grade, pageId);
}

/** @param {string} grade @param {string} topic */
function getGeometryBookHref(grade, topic) {
  if (!topic || topic === "mixed") return null;
  const pageId = firstGeometryBookPageForTopic(grade, topic);
  if (!pageId) return null;
  return buildBookPageHref("geometry", grade, pageId);
}

/** @param {string} grade @param {string} topic */
function firstGeometryBookPageForTopic(grade, topic) {
  const order = GEOMETRY_PAGE_ORDER_BY_GRADE[grade] || [];
  const map = GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE[grade] || {};
  for (const pageId of order) {
    if (map[pageId]?.topic === topic) return pageId;
  }
  return null;
}

/** @param {string} grade @param {string} topic */
function getScienceBookHref(grade, topic) {
  if (!topic || topic === "mixed") return null;
  const entry = getLearningBookEntry("science", grade);
  if (!entry?.registry.pageOrder.includes(topic)) return null;
  return buildBookPageHref("science", grade, topic);
}

/** @param {string} grade @param {string} operation */
function getHebrewBookHref(grade, operation) {
  if (!operation || operation === "mixed") return null;
  const pageId = firstHebrewBookPageForTopic(grade, operation);
  if (!pageId) return null;
  return buildBookPageHref("hebrew", grade, pageId);
}

/** @param {string} grade @param {string} topic */
function getEnglishBookHref(grade, topic) {
  if (!topic || topic === "mixed") return null;
  const pageId = firstEnglishBookPageForTopic(grade, topic);
  if (!pageId) return null;
  return buildBookPageHref("english", grade, pageId);
}

/**
 * @param {string} href
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 */
function validateBookPageHref(href, subject, grade, pageId) {
  const expectedPrefix = `/learning/book/${subject}/${grade}/`;
  if (!href || !href.startsWith(expectedPrefix)) {
    fail(
      "explain.route",
      `${subject} ${grade} page ${pageId}: href ${href} wrong prefix (expected ${expectedPrefix})`
    );
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  const resolvedPageId = href.slice(expectedPrefix.length);
  if (resolvedPageId !== pageId) {
    fail(
      "explain.route",
      `${subject} ${grade}: href page ${resolvedPageId} != expected ${pageId}`
    );
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  const entry = getLearningBookEntry(subject, grade);
  if (!entry) {
    fail("explain.catalog", `${subject} ${grade}: missing catalog entry for ${pageId}`);
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  if (!entry.registry.pageOrder.includes(pageId)) {
    fail("explain.missing", `${subject} ${grade}: page ${pageId} not in registry`);
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  try {
    const page = entry.loader.loadPage(pageId);
    if (!page) {
      fail("explain.load", `${subject} ${grade}: could not load page ${pageId}`);
      setResult(subject, grade, "explain", "FAIL");
      return false;
    }
  } catch (err) {
    fail("explain.load", `${subject} ${grade}/${pageId}: ${err.message}`);
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  return true;
}

/**
 * @param {string|null} href
 * @param {string} subject
 * @param {string} grade
 * @param {string} context
 */
function validateHrefOrNull(href, subject, grade, context) {
  if (!href) return true;
  const m = /^\/learning\/book\/([^/]+)\/(g[1-6])\/([^/]+)$/.exec(href);
  if (!m) {
    fail("explain.format", `${subject} ${grade} ${context}: invalid href ${href}`);
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  const [, subj, gk, pageId] = m;
  if (subj !== subject) {
    fail("explain.subject", `${subject} ${grade} ${context}: href subject ${subj}`);
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  if (gk !== grade) {
    fail("explain.grade", `${subject} ${grade} ${context}: href grade ${gk}`);
    setResult(subject, grade, "explain", "FAIL");
    return false;
  }
  return validateBookPageHref(href, subject, grade, pageId);
}

/** Topics where a null הסבר בספר href is approved (button hidden). */
const EXEMPT_TOPIC_KEYS = new Set(["mixed"]);

/**
 * @param {{
 *   subject: string,
 *   masterPath: string,
 *   tileSubjectAttr: string,
 *   getTopics: (grade: string) => string[],
 *   getBookHref: (grade: string, topic: string) => string|null,
 *   getPracticeMap?: (grade: string) => Record<string, { topic: string, forceKind?: string }>,
 * }} cfg
 */
function verifySubject(cfg) {
  const masterSrc = readMaster(cfg.masterPath);
  if (!masterSrc) return;

  if (!masterSrc.includes("LearningBookIndexTile")) {
    fail("main.ui", `${cfg.subject}: master missing LearningBookIndexTile`);
  }
  if (!masterSrc.includes(`getLearningBookIndexHref("${cfg.subject}"`)) {
    fail("main.ui", `${cfg.subject}: master missing getLearningBookIndexHref call`);
  }
  if (!masterSrc.includes(`subject="${cfg.tileSubjectAttr}"`)) {
    fail("main.ui", `${cfg.subject}: master LearningBookIndexTile missing subject attr`);
  }
  if (!masterSrc.includes("bookTopicHref")) {
    fail("explain.ui", `${cfg.subject}: master missing bookTopicHref`);
  }
  if (!masterSrc.includes("הסבר בספר")) {
    fail("explain.ui", `${cfg.subject}: master missing הסבר בספר label`);
  }
  if (!masterSrc.includes("bookTopicHref ?")) {
    fail("explain.ui", `${cfg.subject}: master must gate הסבר בספר on bookTopicHref`);
  }

  const visible = getVisibleLearningBooks(cfg.subject);
  if (visible.length !== GRADE_KEYS.length) {
    fail(
      "main.visible",
      `${cfg.subject}: expected ${GRADE_KEYS.length} authored books, got ${visible.length}`
    );
  }

  for (const grade of GRADE_KEYS) {
    setResult(cfg.subject, grade, "main", "PASS");
    setResult(cfg.subject, grade, "explain", "PASS");

    const expectedIndex = `/learning/book/${cfg.subject}/${grade}`;
    const indexHref = getLearningBookIndexHref(cfg.subject, grade);

    if (!hasLearningBook(cfg.subject, grade)) {
      fail("main.catalog", `${cfg.subject} ${grade}: not authored in catalog meta`);
      setResult(cfg.subject, grade, "main", "FAIL");
    }
    if (indexHref !== expectedIndex) {
      fail("main.route", `${cfg.subject} ${grade}: index ${indexHref} != ${expectedIndex}`);
      setResult(cfg.subject, grade, "main", "FAIL");
    }

    const entry = getLearningBookEntry(cfg.subject, grade);
    if (!entry) {
      fail("main.load", `${cfg.subject} ${grade}: getLearningBookEntry returned null`);
      setResult(cfg.subject, grade, "main", "FAIL");
    } else if (entry.meta?.routeBase !== expectedIndex) {
      fail(
        "main.route",
        `${cfg.subject} ${grade}: catalog routeBase ${entry.meta?.routeBase} != ${expectedIndex}`
      );
      setResult(cfg.subject, grade, "main", "FAIL");
    } else if (!entry.registry.pageOrder?.length) {
      fail("main.load", `${cfg.subject} ${grade}: empty page order`);
      setResult(cfg.subject, grade, "main", "FAIL");
    }

    const topics = cfg.getTopics(grade);
    let mappableCount = 0;
    let resolvedCount = 0;

    for (const topic of topics) {
      const href = cfg.getBookHref(grade, topic);
      if (EXEMPT_TOPIC_KEYS.has(topic)) {
        if (href) {
          fail("explain.exempt", `${cfg.subject} ${grade} topic ${topic} must not resolve (got ${href})`);
          setResult(cfg.subject, grade, "explain", "FAIL");
        }
        continue;
      }
      mappableCount += 1;
      if (href) {
        resolvedCount += 1;
        validateHrefOrNull(href, cfg.subject, grade, `topic=${topic}`);
      }
    }

    const practiceMap = cfg.getPracticeMap?.(grade);
    if (practiceMap) {
      for (const [pageId, practice] of Object.entries(practiceMap)) {
        const topic = practice.topic;
        const href = cfg.getBookHref(grade, topic);
        if (!href) {
          fail(
            "explain.practice",
            `${cfg.subject} ${grade}: practice page ${pageId} topic ${topic} has no bookTopicHref`
          );
          setResult(cfg.subject, grade, "explain", "FAIL");
          continue;
        }
        const pageFromHref = href.split("/").pop();
        validateBookPageHref(href, cfg.subject, grade, pageFromHref);
      }
    }

    if (mappableCount > 0 && resolvedCount === 0) {
      setResult(cfg.subject, grade, "explain", "NOT_APPLICABLE");
    }
  }
}

function verifyMoledetGeographyBooks() {
  const masterSrc = readMaster("pages/learning/moledet-geography-master.js");
  if (!masterSrc) return;

  if (!masterSrc.includes("LearningBookIndexTile")) {
    fail("main.ui", "moledet-geography: master missing LearningBookIndexTile");
  }
  if (!masterSrc.includes("getLearningBookIndexHref")) {
    fail("main.ui", "moledet-geography: master missing getLearningBookIndexHref call");
  }
  if (!masterSrc.includes("bookSubjectForGrade")) {
    fail("main.ui", "moledet-geography: master missing bookSubjectForGrade");
  }
  if (!masterSrc.includes("bookTopicHref")) {
    fail("explain.ui", "moledet-geography: master missing bookTopicHref");
  }
  if (!masterSrc.includes("הסבר בספר")) {
    fail("explain.ui", "moledet-geography: master missing הסבר בספר label");
  }
  if (!masterSrc.includes("bookTopicHref ?")) {
    fail("explain.ui", "moledet-geography: master must gate הסבר בספר on bookTopicHref");
  }

  for (const forbiddenSubject of ["moledet", "geography"]) {
    if (hasLearningBook(forbiddenSubject, "g1")) {
      fail("scope.g1", `${forbiddenSubject} g1 must not be authored`);
    }
    if (getLearningBookIndexHref(forbiddenSubject, "g1")) {
      fail("scope.g1", `${forbiddenSubject} g1 must not expose index href`);
    }
    setResult(forbiddenSubject, "g1", "main", "NOT_APPLICABLE");
    setResult(forbiddenSubject, "g1", "explain", "NOT_APPLICABLE");
  }

  for (const grade of MOLEDET_BOOK_GRADES) {
    setResult("geography", grade, "main", "NOT_APPLICABLE");
    setResult("geography", grade, "explain", "NOT_APPLICABLE");
  }
  for (const grade of GEOGRAPHY_BOOK_GRADES) {
    setResult("moledet", grade, "main", "NOT_APPLICABLE");
    setResult("moledet", grade, "explain", "NOT_APPLICABLE");
  }

  for (const grade of MG_PUBLISHED_GRADES) {
    const subject = getMoledetGeographyBookSubjectForGrade(grade);
    if (!subject) {
      fail("main.subject", `moledet-geography ${grade}: missing book subject mapping`);
      continue;
    }

    setResult(subject, grade, "main", "PASS");
    setResult(subject, grade, "explain", "PASS");

    const expectedIndex = `/learning/book/${subject}/${grade}`;
    const indexHref = getLearningBookIndexHref(subject, grade);

    if (!hasLearningBook(subject, grade)) {
      fail("main.catalog", `${subject} ${grade}: not authored in catalog meta`);
      setResult(subject, grade, "main", "FAIL");
    }
    if (indexHref !== expectedIndex) {
      fail("main.route", `${subject} ${grade}: index ${indexHref} != ${expectedIndex}`);
      setResult(subject, grade, "main", "FAIL");
    }

    const entry = getLearningBookEntry(subject, grade);
    if (!entry) {
      fail("main.load", `${subject} ${grade}: getLearningBookEntry returned null`);
      setResult(subject, grade, "main", "FAIL");
    } else if (entry.meta?.routeBase !== expectedIndex) {
      fail(
        "main.route",
        `${subject} ${grade}: catalog routeBase ${entry.meta?.routeBase} != ${expectedIndex}`
      );
      setResult(subject, grade, "main", "FAIL");
    } else if (!entry.registry.pageOrder?.length) {
      fail("main.load", `${subject} ${grade}: empty page order`);
      setResult(subject, grade, "main", "FAIL");
    }

    const topics = MG_GRADES[grade]?.topics || [];
    let mappableCount = 0;
    let resolvedCount = 0;

    for (const topic of topics) {
      const href = getMoledetGeographyBookHref({ grade, topic, kind: null });
      if (EXEMPT_TOPIC_KEYS.has(topic)) {
        if (href) {
          fail("explain.exempt", `${subject} ${grade} topic ${topic} must not resolve (got ${href})`);
          setResult(subject, grade, "explain", "FAIL");
        }
        continue;
      }
      mappableCount += 1;
      if (href) {
        resolvedCount += 1;
        validateHrefOrNull(href, subject, grade, `topic=${topic}`);
      }
    }

    const practiceMap = MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE[grade] || {};
    for (const [pageId, practice] of Object.entries(practiceMap)) {
      const topic = practice.topic;
      const href = getMoledetGeographyBookHref({ grade, topic, kind: null });
      if (!href) {
        fail(
          "explain.practice",
          `${subject} ${grade}: practice page ${pageId} topic ${topic} has no bookTopicHref`
        );
        setResult(subject, grade, "explain", "FAIL");
        continue;
      }
      const pageFromHref = href.split("/").pop();
      validateBookPageHref(href, subject, grade, pageFromHref);
    }

    if (mappableCount > 0 && resolvedCount === 0) {
      setResult(subject, grade, "explain", "NOT_APPLICABLE");
    }
  }
}

function runAllChecks() {
  verifySubject({
    subject: "math",
    masterPath: "pages/learning/math-master.js",
    tileSubjectAttr: "math",
    getTopics: (grade) => MATH_GRADES[grade]?.operations || [],
    getBookHref: (grade, operation) =>
      getMathBookHref(grade, { grade, operation, kind: null }),
  });

  verifySubject({
    subject: "geometry",
    masterPath: "pages/learning/geometry-master.js",
    tileSubjectAttr: "geometry",
    getTopics: (grade) => GEOMETRY_GRADES[grade]?.topics || [],
    getBookHref: (grade, topic) => getGeometryBookHref(grade, topic),
    getPracticeMap: (grade) => GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE[grade] || {},
  });

  verifySubject({
    subject: "science",
    masterPath: "pages/learning/science-master.js",
    tileSubjectAttr: "science",
    getTopics: (grade) => SCIENCE_GRADES[grade]?.topics || [],
    getBookHref: (grade, topic) => getScienceBookHref(grade, topic),
    getPracticeMap: (grade) => SCIENCE_PAGE_TO_PRACTICE_BY_GRADE[grade] || {},
  });

  verifySubject({
    subject: "hebrew",
    masterPath: "pages/learning/hebrew-master.js",
    tileSubjectAttr: "hebrew",
    getTopics: (grade) => HEBREW_GRADES[grade]?.topics || [],
    getBookHref: (grade, operation) => getHebrewBookHref(grade, operation),
    getPracticeMap: (grade) => HEBREW_PAGE_TO_PRACTICE_BY_GRADE[grade] || {},
  });

  verifySubject({
    subject: "english",
    masterPath: "pages/learning/english-master.js",
    tileSubjectAttr: "english",
    getTopics: (grade) => ENGLISH_GRADES[grade]?.topics || [],
    getBookHref: (grade, topic) => getEnglishBookHref(grade, topic),
    getPracticeMap: (grade) => ENGLISH_PAGE_TO_PRACTICE_BY_GRADE[grade] || {},
  });

  verifyMoledetGeographyBooks();
}

function printResults() {
  console.log("\n=== Learning book buttons — subject × grade ===\n");
  console.log("subject\tgrade\tmain_index\texplain_in_book");
  for (const subject of ["math", "geometry", "science", "hebrew", "english", "moledet", "geography"]) {
    for (const grade of GRADE_KEYS) {
      const r = results[key(subject, grade)] || { main: "FAIL", explain: "FAIL" };
      console.log(`${subject}\t${grade}\t${r.main}\t${r.explain}`);
    }
  }

  if (failures.length) {
    console.error(`\nFAIL (${failures.length}):`);
    for (const f of failures) console.error(" ", f);
    process.exit(1);
  }

  console.log(`\nPASS: all learning-book buttons verified (${GRADE_KEYS.length * 5 + MG_PUBLISHED_GRADES.length} books)`);
  process.exit(0);
}

runAllChecks();
printResults();
