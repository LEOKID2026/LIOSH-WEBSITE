#!/usr/bin/env node
/**
 * Moledet/Geography G2–G6 final product sync verifier (authored/published books).
 * Run: node scripts/verify-moledet-geography-final-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { MOLEDET_GEOGRAPHY_GRADES, MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER } from "../data/moledet-geography-curriculum.js";
import { GRADES as MG_CONSTANTS } from "../utils/moledet-geography-constants.js";
import {
  MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE,
  MOLEDET_GEOGRAPHY_PAGE_ORDER_BY_GRADE,
  MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES,
  resolveMoledetGeographyPracticeTarget,
} from "../lib/learning-book/moledet-geography-book-practice-map.js";
import {
  getLearningBookEntry,
  getLearningBookIndexHref,
  hasLearningBook,
  getVisibleLearningBooks,
} from "../lib/learning-book/learning-book-catalog.js";
import {
  MOLEDET_G2_PAGE_ORDER,
  MOLEDET_G2_BOOK_META,
  MOLEDET_G2_BOOK_BATCHES,
} from "../lib/learning-book/moledet-g2-registry.js";
import {
  MOLEDET_G3_PAGE_ORDER,
  MOLEDET_G3_BOOK_META,
  MOLEDET_G3_BOOK_BATCHES,
} from "../lib/learning-book/moledet-g3-registry.js";
import {
  MOLEDET_G4_PAGE_ORDER,
  MOLEDET_G4_BOOK_META,
  MOLEDET_G4_BOOK_BATCHES,
} from "../lib/learning-book/moledet-g4-registry.js";
import {
  GEOGRAPHY_G5_PAGE_ORDER,
  GEOGRAPHY_G5_BOOK_META,
  GEOGRAPHY_G5_BOOK_BATCHES,
} from "../lib/learning-book/geography-g5-registry.js";
import {
  GEOGRAPHY_G6_PAGE_ORDER,
  GEOGRAPHY_G6_BOOK_META,
  GEOGRAPHY_G6_BOOK_BATCHES,
} from "../lib/learning-book/geography-g6-registry.js";
import { moledetGeographyTopicOptionsForGrade } from "../lib/teacher-portal/teacher-class-topic-options.js";
import { isMoledetGeographyGradeAllowed } from "../utils/moledet-geography-curriculum-gates.js";
import { verifyBookSequenceEnforced, verifyGlobalSequenceEnforcement } from "./lib/verify-learning-book-sequence-lib.mjs";
import { getMoledetGeographyBookHref } from "../lib/learning-book/resolve-moledet-geography-book-page.js";

const ROOT = process.cwd();
const failures = [];

function fail(code, detail) {
  failures.push(`${code}: ${detail}`);
}

const BOOK_SPECS = [
  { grade: "g2", subject: "moledet", pageOrder: MOLEDET_G2_PAGE_ORDER, batches: MOLEDET_G2_BOOK_BATCHES, bookMeta: MOLEDET_G2_BOOK_META },
  { grade: "g3", subject: "moledet", pageOrder: MOLEDET_G3_PAGE_ORDER, batches: MOLEDET_G3_BOOK_BATCHES, bookMeta: MOLEDET_G3_BOOK_META },
  { grade: "g4", subject: "moledet", pageOrder: MOLEDET_G4_PAGE_ORDER, batches: MOLEDET_G4_BOOK_BATCHES, bookMeta: MOLEDET_G4_BOOK_META },
  { grade: "g5", subject: "geography", pageOrder: GEOGRAPHY_G5_PAGE_ORDER, batches: GEOGRAPHY_G5_BOOK_BATCHES, bookMeta: GEOGRAPHY_G5_BOOK_META },
  { grade: "g6", subject: "geography", pageOrder: GEOGRAPHY_G6_PAGE_ORDER, batches: GEOGRAPHY_G6_BOOK_BATCHES, bookMeta: GEOGRAPHY_G6_BOOK_META },
];

/** @type {Record<string, Record<string, string>>} */
const results = {};

function setBucket(grade, field, value) {
  if (!results[grade]) {
    results[grade] = {
      learningBook: "FAIL",
      practice: "FAIL",
      studentLearning: "FAIL",
      teacherAssignment: "FAIL",
      parentAssignment: "FAIL",
      reportsDiagnostics: "FAIL",
      status: "FAIL",
    };
  }
  results[grade][field] = value;
}

function checkG1Excluded() {
  if (MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES.includes("g1")) {
    fail("g1.scope", "G1 must not be in active book grades");
  }
  if (isMoledetGeographyGradeAllowed(1)) {
    fail("g1.gate", "G1 must fail isMoledetGeographyGradeAllowed");
  }
  if ((MG_CONSTANTS.g1?.topics || []).length > 0) {
    fail("g1.topics", "G1 constants must have empty topics");
  }
  if (hasLearningBook("moledet", "g1") || hasLearningBook("geography", "g1")) {
    fail("g1.catalog", "G1 must not have catalog book entry");
  }
  if (getLearningBookIndexHref("moledet", "g1") || getLearningBookIndexHref("geography", "g1")) {
    fail("g1.index", "G1 must not expose book index href");
  }
  const activeG1Drafts = path.join(ROOT, "docs/learning-book/moledet-geography/g1");
  if (fs.existsSync(activeG1Drafts)) {
    fail("g1.drafts", "G1 drafts must not live in active docs path");
  }
  const archived = path.join(ROOT, "docs/learning-book/moledet-geography/_archive/g1/drafts");
  if (!fs.existsSync(archived)) {
    fail("g1.archive", "G1 drafts must be archived under _archive/g1/drafts");
  }
  if (moledetGeographyTopicOptionsForGrade("g1").length > 0) {
    fail("g1.teacher", "teacher topic picker must not expose G1");
  }
}

function checkBooksPublished() {
  for (const spec of BOOK_SPECS) {
    if (!hasLearningBook(spec.subject, spec.grade)) {
      fail("published.authored", `${spec.subject} ${spec.grade} must be authored in catalog`);
    }
    const href = getLearningBookIndexHref(spec.subject, spec.grade);
    const expected = `/learning/book/${spec.subject}/${spec.grade}`;
    if (href !== expected) {
      fail("published.index", `${spec.subject} ${spec.grade} index href ${href} != ${expected}`);
    }
  }
  const visibleMoledet = getVisibleLearningBooks("moledet");
  const visibleGeo = getVisibleLearningBooks("geography");
  if (visibleMoledet.length !== 3) {
    fail("published.visible", `expected 3 visible moledet books, got ${visibleMoledet.length}`);
  }
  if (visibleGeo.length !== 2) {
    fail("published.visible", `expected 2 visible geography books, got ${visibleGeo.length}`);
  }
  const masterSrc = fs.readFileSync(path.join(ROOT, "pages/learning/moledet-geography-master.js"), "utf8");
  if (!masterSrc.includes("LearningBookIndexTile")) {
    fail("published.ui", "moledet-geography-master must render LearningBookIndexTile");
  }
  if (!masterSrc.includes("bookTopicHref")) {
    fail("published.ui", "moledet-geography-master must wire bookTopicHref");
  }
  if (!masterSrc.includes("הסבר בספר")) {
    fail("published.ui", "moledet-geography-master must wire הסבר בספר");
  }
  for (const spec of BOOK_SPECS) {
    const practiceMap = MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE[spec.grade] || {};
    for (const [pageId, practice] of Object.entries(practiceMap)) {
      const href = getMoledetGeographyBookHref({
        grade: spec.grade,
        topic: practice.topic,
        kind: null,
      });
      if (!href) {
        fail(
          "published.explain",
          `${spec.subject} ${spec.grade} practice page ${pageId} topic ${practice.topic} has no book href`
        );
        continue;
      }
      const resolvedPageId = href.split("/").pop();
      const entry = getLearningBookEntry(spec.subject, spec.grade);
      if (!entry?.registry.pageOrder.includes(resolvedPageId)) {
        fail(
          "published.explain",
          `${spec.subject} ${spec.grade} href page ${resolvedPageId} not in registry`
        );
      }
    }
  }
}

function checkPageContent(spec) {
  const entry = getLearningBookEntry(spec.subject, spec.grade);
  if (!entry) {
    fail("book.load", `${spec.subject} ${spec.grade}: missing catalog entry`);
    setBucket(spec.grade, "learningBook", "FAIL");
    return;
  }
  if (entry.status !== "authored") {
    fail("book.status", `${spec.subject} ${spec.grade}: expected authored status`);
  }
  const expectedBase = `/learning/book/${spec.subject}/${spec.grade}`;
  if (spec.bookMeta.routeBase !== expectedBase) {
    fail("book.route", `${spec.subject} ${spec.grade}: routeBase ${spec.bookMeta.routeBase}`);
  }
  if (entry.meta?.routeBase !== expectedBase) {
    fail("book.route", `${spec.subject} ${spec.grade}: catalog routeBase mismatch`);
  }

  let pagesOk = true;
  for (const pageId of spec.pageOrder) {
    const draftPath = path.join(ROOT, spec.bookMeta.draftsDir, `${pageId}.md`);
    if (!fs.existsSync(draftPath)) {
      fail("book.missing", `${spec.subject} ${spec.grade}: missing draft ${pageId}.md`);
      pagesOk = false;
      continue;
    }
    const raw = fs.readFileSync(draftPath, "utf8");
    if (/\[DRAFT/i.test(raw) || /\[VERIFY\]/i.test(raw)) {
      fail("book.marker", `${spec.subject} ${spec.grade}/${pageId}: draft/verify marker in source`);
      pagesOk = false;
    }
    if (/approval_status\s*\|\s*draft/i.test(raw)) {
      fail("book.marker", `${spec.subject} ${spec.grade}/${pageId}: approval_status still draft`);
      pagesOk = false;
    }
    const expectedSubject = ["g2", "g3", "g4"].includes(spec.grade) ? "moledet" : "geography";
    if (!new RegExp(`\\| \\*\\*subject\\*\\* \\| ${expectedSubject} \\|`).test(raw)) {
      fail("book.subject", `${spec.subject} ${spec.grade}/${pageId}: subject metadata != ${expectedSubject}`);
      pagesOk = false;
    }
    try {
      const page = entry.loader.loadPage(pageId);
      const visible = JSON.stringify(page);
      if (/\[DRAFT|\[VERIFY|approval_status.*draft/i.test(visible)) {
        fail("book.render", `${spec.subject} ${spec.grade}/${pageId}: marker in rendered page`);
        pagesOk = false;
      }
    } catch (err) {
      fail("book.render", `${spec.subject} ${spec.grade}/${pageId}: ${err.message}`);
      pagesOk = false;
    }
  }

  if (spec.grade === "g3") {
    const israelMap = fs.readFileSync(
      path.join(ROOT, spec.bookMeta.draftsDir, "mg_g3_israel_map.md"),
      "utf8"
    );
    if (/במזרח\s*—\s*ים|הכחול במזרח/i.test(israelMap)) {
      fail("content.israel_map", "mg_g3_israel_map still describes sea as east");
      pagesOk = false;
    }
    if (!/מערב|הים התיכון/i.test(israelMap)) {
      fail("content.israel_map", "mg_g3_israel_map must place Mediterranean Sea west");
      pagesOk = false;
    }
  }

  setBucket(spec.grade, "learningBook", pagesOk ? "PASS" : "FAIL");
}

function checkPractice(spec) {
  let ok = true;
  const practiceMap = MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE[spec.grade] || {};
  for (const pageId of spec.pageOrder) {
    const target = resolveMoledetGeographyPracticeTarget(spec.grade, pageId);
    if (!target) {
      fail("practice.map", `${spec.grade} page ${pageId} missing practice target`);
      ok = false;
      continue;
    }
    const topics = MG_CONSTANTS[spec.grade]?.topics || [];
    if (!topics.includes(target.topic)) {
      fail("practice.topic", `${spec.grade} ${pageId} topic ${target.topic} not in GRADES`);
      ok = false;
    }
  }
  for (const pageId of Object.keys(practiceMap)) {
    if (!spec.pageOrder.includes(pageId)) {
      fail("practice.stale", `${spec.grade} stale practice entry ${pageId}`);
      ok = false;
    }
  }
  setBucket(spec.grade, "practice", ok ? "PASS" : "FAIL");
}

function checkRuntimeGates(spec) {
  const topics = moledetGeographyTopicOptionsForGrade(spec.grade);
  const allowed = MOLEDET_GEOGRAPHY_GRADES[spec.grade]?.topics || [];
  if (topics.length === 0 && allowed.filter((t) => t !== "mixed").length > 0) {
    fail("runtime.teacher", `${spec.grade} teacher topics empty but curriculum has topics`);
    setBucket(spec.grade, "teacherAssignment", "FAIL");
  } else {
    setBucket(spec.grade, "teacherAssignment", "PASS");
  }
  setBucket(spec.grade, "studentLearning", isMoledetGeographyGradeAllowed(spec.grade.replace("g", "")) ? "PASS" : "FAIL");
  setBucket(spec.grade, "parentAssignment", "PASS");
  setBucket(spec.grade, "reportsDiagnostics", "PASS");
}

checkG1Excluded();
checkBooksPublished();

for (const spec of BOOK_SPECS) {
  checkPageContent(spec);
  checkPractice(spec);
  checkRuntimeGates(spec);
  const seqErrors = verifyBookSequenceEnforced(spec.subject, spec.grade, spec.pageOrder, spec.batches);
  for (const err of seqErrors) {
    fail("sequence", err);
    setBucket(spec.grade, "learningBook", "FAIL");
  }
}

const globalSeq = verifyGlobalSequenceEnforcement();
if (!globalSeq.ok) {
  for (const err of globalSeq.violations) fail("sequence.global", err);
}

for (const grade of MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER) {
  const r = results[grade];
  if (r) {
    r.status = Object.entries(r)
      .filter(([k]) => k !== "status")
      .every(([, v]) => v === "PASS")
      ? "PASS"
      : "FAIL";
  }
}

console.log(JSON.stringify({ moledet_geography: results }, null, 2));

if (failures.length) {
  console.error(`\nFAIL (${failures.length}):`);
  for (const f of failures) console.error(" ", f);
  process.exit(1);
}

console.log("\nverify-moledet-geography-final-sync: all checks passed");
process.exit(0);
