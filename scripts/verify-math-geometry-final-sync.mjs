#!/usr/bin/env node
/**
 * Math + Geometry G1–G6 final product sync verifier.
 * Run: node scripts/verify-math-geometry-final-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_PAGE_ORDER_BY_GRADE,
  GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE,
  resolveGeometryPracticeTarget,
} from "../lib/learning-book/geometry-book-practice-map.js";
import {
  getGeometryG6AccessiblePageOrder,
  GEOMETRY_G6_PAGE_ORDER,
} from "../lib/learning-book/geometry-g6-registry.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import {
  mathTopicOptionsForGrade,
  geometryTopicOptionsForGrade,
} from "../lib/teacher-portal/teacher-class-topic-options.js";
import { resolveClassroomSkillLabelHe } from "../lib/classroom-activities/classroom-skill-labels-he.js";
import { isPrismVolumeTriangleAllowed } from "../utils/geometry-curriculum-gates.js";
import { GRADES as MATH_GRADES } from "../utils/math-constants.js";
import { GRADES as GEOMETRY_GRADES } from "../utils/geometry-constants.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";
import { verifyBookSequenceEnforced, verifyGlobalSequenceEnforcement } from "./lib/verify-learning-book-sequence-lib.mjs";

const ROOT = process.cwd();
const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** @type {string[]} */
const failures = [];

function fail(code, detail) {
  failures.push(`${code}: ${detail}`);
}

async function importDefault(rel) {
  return import(pathToFileURL(path.join(ROOT, rel)).href);
}

/** @param {{ subject: "math"|"geometry", gradeKey: string }} cfg */
async function loadBookConfig({ subject, gradeKey }) {
  const regMod = await importDefault(
    `lib/learning-book/${subject}-${gradeKey}-registry.js`
  );
  const pageOrderKey =
    subject === "math"
      ? `MATH_${gradeKey.toUpperCase()}_PAGE_ORDER`
      : gradeKey === "g6" && subject === "geometry"
        ? null
        : `GEOMETRY_${gradeKey.toUpperCase()}_PAGE_ORDER`;
  const batchesKey =
    subject === "math"
      ? `MATH_${gradeKey.toUpperCase()}_BOOK_BATCHES`
      : `GEOMETRY_${gradeKey.toUpperCase()}_BOOK_BATCHES`;

  let pageOrder =
    subject === "geometry" && gradeKey === "g6"
      ? getGeometryG6AccessiblePageOrder()
      : regMod[pageOrderKey];

  const batches = regMod[batchesKey];
  const meta = regMod[`${subject === "math" ? "MATH" : "GEOMETRY"}_${gradeKey.toUpperCase()}_BOOK_META`];
  const draftsDir = path.join(ROOT, meta?.draftsDir || "");

  let resolvePractice = null;
  let resolverSrc = null;
  if (subject === "math") {
    const resolverPath = path.join(
      ROOT,
      `lib/learning-book/resolve-math-${gradeKey}-practice-target.js`
    );
    if (fs.existsSync(resolverPath)) {
      resolverSrc = fs.readFileSync(resolverPath, "utf8");
    }
  }

  return { pageOrder, batches, meta, draftsDir, resolvePractice, resolverSrc };
}

/** @param {{ subject: "math"|"geometry", gradeKey: string }} cfg */
function checkCatalogEntry({ subject, gradeKey }) {
  const entry = getLearningBookEntry(subject, gradeKey);
  if (!entry) {
    fail("book.catalog", `${subject} ${gradeKey} missing catalog entry`);
    return false;
  }
  if (entry.status !== "authored") {
    fail("book.catalog", `${subject} ${gradeKey} status=${entry.status}, expected authored`);
    return false;
  }
  if (!entry.features?.practice) {
    fail("book.catalog", `${subject} ${gradeKey} practice feature disabled`);
    return false;
  }
  return true;
}

/** @param {{ subject: "math"|"geometry", gradeKey: string, pageOrder: string[], batches: object[], draftsDir: string, resolvePractice?: Function|null }} cfg */
function checkBookPages(cfg) {
  const { subject, gradeKey, pageOrder, batches, draftsDir } = cfg;
  if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
    fail("book.order", `${subject} ${gradeKey} empty page order`);
    return;
  }

  const flat = batches?.flatMap((b) => b.pages) || [];
  if (flat.join(",") !== pageOrder.join(",")) {
    fail(
      "book.order",
      `${subject} ${gradeKey} PAGE_ORDER mismatch vs batch flatMap`
    );
  }

  if (new Set(pageOrder).size !== pageOrder.length) {
    fail("book.order", `${subject} ${gradeKey} duplicate page IDs in order`);
  }

  for (const pageId of pageOrder) {
    const filePath = path.join(draftsDir, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      fail("book.missing_page", `${subject} ${gradeKey} missing ${pageId}.md`);
      continue;
    }
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const page = parseLearningPageMarkdown(raw, pageId);
      assertMathG1PageSections(page);
    } catch (err) {
      fail("book.parse", `${subject} ${gradeKey} ${pageId}: ${err.message}`);
    }
  }

  for (const err of verifyBookSequenceEnforced(subject, gradeKey, pageOrder, batches)) {
    fail("book.sequence", err);
  }
}

/** @param {{ subject: "math"|"geometry", gradeKey: string, pageOrder: string[], resolverSrc?: string|null }} cfg */
function checkPracticeMappings(cfg) {
  const { subject, gradeKey, pageOrder, resolverSrc } = cfg;

  if (subject === "math") {
    const allowed = new Set(MATH_GRADES[gradeKey]?.operations || []);
    if (!resolverSrc) {
      fail("practice.cta", `math ${gradeKey} missing resolve-math-${gradeKey}-practice-target.js`);
      return;
    }
    for (const pageId of pageOrder) {
      const keyPattern = new RegExp(`\\b${pageId}\\s*:\\s*\\{\\s*operation:\\s*"([^"]+)"`);
      const match = resolverSrc.match(keyPattern);
      if (!match) {
        fail("practice.cta", `math ${gradeKey} ${pageId} unresolved practice target`);
        continue;
      }
      if (!allowed.has(match[1])) {
        fail(
          "practice.grade",
          `math ${gradeKey} ${pageId} operation ${match[1]} not in GRADES`
        );
      }
    }
    return;
  }

  const topics = new Set(GEOMETRY_GRADES[gradeKey]?.topics || []);
  const map = GEOMETRY_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  for (const pageId of pageOrder) {
    if (!map[pageId]) {
      fail("practice.cta", `geometry ${gradeKey} ${pageId} missing PAGE_TO_PRACTICE`);
      continue;
    }
    if (!topics.has(map[pageId].topic)) {
      fail(
        "practice.grade",
        `geometry ${gradeKey} ${pageId} topic ${map[pageId].topic} not in GRADES`
      );
    }
    const resolved = resolveGeometryPracticeTarget(gradeKey, pageId);
    if (!resolved) {
      fail("practice.cta", `geometry ${gradeKey} ${pageId} resolve returned null`);
    }
  }

  for (const pageId of Object.keys(map)) {
    if (pageOrder.includes(pageId)) continue;
    if (
      gradeKey === "g6" &&
      pageId === "prism_volume_triangle" &&
      !isPrismVolumeTriangleAllowed()
    ) {
      continue;
    }
    fail("practice.stale", `geometry ${gradeKey} stale practice map for ${pageId}`);
  }
}

/** @param {"math"|"geometry"} subject @param {string} gradeKey */
function checkAssignmentTopics(subject, gradeKey) {
  const opts =
    subject === "math"
      ? mathTopicOptionsForGrade(gradeKey)
      : geometryTopicOptionsForGrade(gradeKey);
  const allowed =
    subject === "math"
      ? (MATH_GRADES[gradeKey]?.operations || []).filter((t) => t !== "mixed")
      : (GEOMETRY_GRADES[gradeKey]?.topics || []).filter((t) => t !== "mixed");

  const optKeys = opts.map((o) => o.key).sort();
  const allowedSorted = [...allowed].sort();
  if (optKeys.join(",") !== allowedSorted.join(",")) {
    fail(
      "assignment.topics",
      `${subject} ${gradeKey} picker [${optKeys}] != GRADES [${allowedSorted}]`
    );
  }
}

/** @param {"math"|"geometry"} subject @param {string} gradeKey */
async function checkActivityGeneration(subject, gradeKey) {
  const topic =
    subject === "math"
      ? (MATH_GRADES[gradeKey]?.operations || []).find((t) => t !== "mixed") || "addition"
      : (GEOMETRY_GRADES[gradeKey]?.topics || []).find((t) => t !== "mixed") || "area";

  try {
    const qs = await generateActivityQuestionSetClient({
      subject,
      gradeLevel: gradeKey,
      topic,
      difficulty: "easy",
      count: 3,
    });
    if (qs.length < 3) {
      fail("activity.generate", `${subject} ${gradeKey} ${topic} returned ${qs.length} questions`);
    }
  } catch (err) {
    fail("activity.generate", `${subject} ${gradeKey} ${topic}: ${err.message}`);
  }

  if (subject === "geometry" && gradeKey === "g1") {
    try {
      await generateActivityQuestionSetClient({
        subject: "geometry",
        gradeLevel: "g1",
        topic: "pythagoras",
        difficulty: "easy",
        count: 3,
      });
      fail("activity.grade_gate", "geometry g1 pythagoras should throw");
    } catch {
      // expected
    }
  }
}

function checkGeometrySequenceRules() {
  const g5Order = GEOMETRY_PAGE_ORDER_BY_GRADE.g5 || [];
  const hTri = g5Order.indexOf("heights_triangle");
  const triArea = g5Order.indexOf("triangle_area");
  if (hTri < 0 || triArea < 0 || hTri >= triArea) {
    fail(
      "book.sequence",
      `geometry g5 heights_triangle (${hTri}) must precede triangle_area (${triArea})`
    );
  }

  if ((GEOMETRY_GRADES.g6?.topics || []).includes("symmetry")) {
    fail("generator.policy", "geometry g6 must not expose symmetry topic");
  }

  if (!isPrismVolumeTriangleAllowed()) {
    fail("geometry.gate", "prism_volume_triangle expected unlocked when G5 triangle_area teach path exists");
  }

  const accessible = getGeometryG6AccessiblePageOrder();
  if (!accessible.includes("prism_volume_triangle")) {
    fail("geometry.gate", "prism_volume_triangle missing from G6 accessible page order");
  }
  if (
    accessible.length !== GEOMETRY_G6_PAGE_ORDER.length &&
    isPrismVolumeTriangleAllowed()
  ) {
    fail("geometry.gate", "G6 accessible order length mismatch while prism gate open");
  }

  const generic = resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
    subject: "geometry",
    gradeLevel: "g3",
  });
  if (generic !== "מיומנות בגאומטריה") {
    fail("diagnostic.label", `geo_area_triangle_formula g3 label not fail-closed: ${generic}`);
  }
  const specific = resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
    subject: "geometry",
    gradeLevel: "g5",
  });
  if (specific !== "שטח משולש") {
    fail("diagnostic.label", `geo_area_triangle_formula g5 label wrong: ${specific}`);
  }
}

/** @param {"math"|"geometry"} subject @param {string} gradeKey */
function checkRuntimeTopics(subject, gradeKey) {
  const list =
    subject === "math"
      ? MATH_GRADES[gradeKey]?.operations || []
      : GEOMETRY_GRADES[gradeKey]?.topics || [];
  if (!list.length) {
    fail("runtime.topics", `${subject} ${gradeKey} has no GRADES topics/operations`);
  }
}

/** @typedef {{ learningBook: string, practice: string, studentLearning: string, teacherAssignment: string, parentAssignment: string, reportsDiagnostics: string, status: string }} GradeStatus */

/** @param {"math"|"geometry"} subject @param {string} gradeKey @param {string[]} gradeFailures */
function gradeStatus(subject, gradeKey, gradeFailures) {
  const prefix = `${subject} ${gradeKey}`;
  const has = (p) => gradeFailures.some((f) => f.startsWith(p) || f.includes(prefix));
  if (gradeFailures.length === 0) {
    return {
      learningBook: "PASS",
      practice: "PASS",
      studentLearning: "PASS",
      teacherAssignment: "PASS",
      parentAssignment: "PASS",
      reportsDiagnostics: "PASS",
      status: "PASS",
    };
  }
  return {
    learningBook: has("book.") ? "FAIL" : "PASS",
    practice: has("practice.") ? "FAIL" : "PASS",
    studentLearning: has("runtime.") || has("activity.") ? "FAIL" : "PASS",
    teacherAssignment: has("assignment.") ? "FAIL" : "PASS",
    parentAssignment: has("assignment.") ? "FAIL" : "PASS",
    reportsDiagnostics: has("diagnostic.") ? "FAIL" : "PASS",
    status: "FAIL",
  };
}

const mathStatus = {};
const geometryStatus = {};
/** @type {Record<string, string[]>} */
const failuresByGrade = {};

for (const gradeKey of GRADE_KEYS) {
  failuresByGrade[`math:${gradeKey}`] = [];
  failuresByGrade[`geometry:${gradeKey}`] = [];
}

const startFailCount = 0;

for (const gradeKey of GRADE_KEYS) {
  for (const subject of /** @type {const} */ (["math", "geometry"])) {
    const bucket = `${subject}:${gradeKey}`;
    const before = failures.length;

    checkCatalogEntry({ subject, gradeKey });
    checkRuntimeTopics(subject, gradeKey);
    checkAssignmentTopics(subject, gradeKey);

    const cfg = await loadBookConfig({ subject, gradeKey });
    checkBookPages({ subject, gradeKey, ...cfg });
    checkPracticeMappings({ subject, gradeKey, ...cfg });

    await checkActivityGeneration(subject, gradeKey);

    failuresByGrade[bucket].push(...failures.slice(before));
  }
}

checkGeometrySequenceRules();

const globalSeq = verifyGlobalSequenceEnforcement();
if (!globalSeq.ok) {
  for (const v of globalSeq.violations) fail("book.sequence.global", v);
}

for (const gradeKey of GRADE_KEYS) {
  mathStatus[gradeKey] = gradeStatus("math", gradeKey, failuresByGrade[`math:${gradeKey}`]);
  geometryStatus[gradeKey] = gradeStatus("geometry", gradeKey, failuresByGrade[`geometry:${gradeKey}`]);
}

console.log(JSON.stringify({ math: mathStatus, geometry: geometryStatus }, null, 2));

if (failures.length > startFailCount) {
  console.error(`\nverify-math-geometry-final-sync: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nverify-math-geometry-final-sync: all checks passed");
