#!/usr/bin/env node
/**
 * Hebrew G1–G6 final product sync verifier.
 * Run: node scripts/verify-hebrew-final-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { GRADES as HEBREW_GRADES } from "../utils/hebrew-constants.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { hasLearningBook } from "../lib/learning-book/learning-book-catalog-meta.js";
import { hebrewTopicOptionsForGrade } from "../lib/teacher-portal/teacher-class-topic-options.js";
import { resolveClassroomSkillLabelHe } from "../lib/classroom-activities/classroom-skill-labels-he.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";
import {
  assertAllGradesTopicPolicy,
} from "../utils/hebrew-grade-topic-policy.js";
import {
  HEBREW_G1_PAGE_ORDER,
  HEBREW_G1_BOOK_META,
  HEBREW_G1_BOOK_BATCHES,
} from "../lib/learning-book/hebrew-g1-registry.js";
import {
  HEBREW_G2_PAGE_ORDER,
  HEBREW_G2_BOOK_META,
  HEBREW_G2_BOOK_BATCHES,
} from "../lib/learning-book/hebrew-g2-registry.js";
import {
  HEBREW_G3_PAGE_ORDER,
  HEBREW_G3_BOOK_META,
  HEBREW_G3_BOOK_BATCHES,
} from "../lib/learning-book/hebrew-g3-registry.js";
import {
  HEBREW_G4_PAGE_ORDER,
  HEBREW_G4_BOOK_META,
  HEBREW_G4_BOOK_BATCHES,
} from "../lib/learning-book/hebrew-g4-registry.js";
import {
  HEBREW_G5_PAGE_ORDER,
  HEBREW_G5_BOOK_META,
  HEBREW_G5_BOOK_BATCHES,
} from "../lib/learning-book/hebrew-g5-registry.js";
import {
  HEBREW_G6_PAGE_ORDER,
  HEBREW_G6_BOOK_META,
  HEBREW_G6_BOOK_BATCHES,
} from "../lib/learning-book/hebrew-g6-registry.js";
import {
  verifyHebrewBookRuntime,
  assertHebrewMasterPath,
  checkHebrewLearningPageIdCollisions,
} from "./lib/verify-hebrew-book-runtime-lib.mjs";
import { verifyBookSequenceEnforced, verifyGlobalSequenceEnforcement } from "./lib/verify-learning-book-sequence-lib.mjs";

const ROOT = process.cwd();
const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

const BOOK_SPECS = [
  {
    grade: "g1",
    pageOrder: HEBREW_G1_PAGE_ORDER,
    batches: HEBREW_G1_BOOK_BATCHES,
    bookMeta: HEBREW_G1_BOOK_META,
    batchCount: HEBREW_G1_BOOK_BATCHES.length,
  },
  {
    grade: "g2",
    pageOrder: HEBREW_G2_PAGE_ORDER,
    batches: HEBREW_G2_BOOK_BATCHES,
    bookMeta: HEBREW_G2_BOOK_META,
    batchCount: HEBREW_G2_BOOK_BATCHES.length,
  },
  {
    grade: "g3",
    pageOrder: HEBREW_G3_PAGE_ORDER,
    batches: HEBREW_G3_BOOK_BATCHES,
    bookMeta: HEBREW_G3_BOOK_META,
    batchCount: HEBREW_G3_BOOK_BATCHES.length,
  },
  {
    grade: "g4",
    pageOrder: HEBREW_G4_PAGE_ORDER,
    batches: HEBREW_G4_BOOK_BATCHES,
    bookMeta: HEBREW_G4_BOOK_META,
    batchCount: HEBREW_G4_BOOK_BATCHES.length,
  },
  {
    grade: "g5",
    pageOrder: HEBREW_G5_PAGE_ORDER,
    batches: HEBREW_G5_BOOK_BATCHES,
    bookMeta: HEBREW_G5_BOOK_META,
    batchCount: HEBREW_G5_BOOK_BATCHES.length,
  },
  {
    grade: "g6",
    pageOrder: HEBREW_G6_PAGE_ORDER,
    batches: HEBREW_G6_BOOK_BATCHES,
    bookMeta: HEBREW_G6_BOOK_META,
    batchCount: HEBREW_G6_BOOK_BATCHES.length,
  },
];

/** @type {string[]} */
const failures = [];

function fail(code, detail) {
  failures.push(`${code}: ${detail}`);
}

function checkOracleBacking() {
  const matrixPath = path.join(ROOT, "data/curriculum-oracle/v1/ministry-matrix.draft.json");
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const hebrewRows = (matrix.rows || []).filter((r) => r.subject === "hebrew");
  if (hebrewRows.length === 0) {
    fail("oracle.empty", "no hebrew rows in ministry matrix");
  }
}

function checkSpineCoverage() {
  const spine = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/curriculum-spine/v1/skills.json"), "utf8")
  );
  const hebrewSkills = (spine.skills || []).filter((s) => s.subject === "hebrew");
  if (hebrewSkills.length < 135) {
    fail("spine.coverage", `expected >=135 hebrew spine skills, got ${hebrewSkills.length}`);
  }
}

function checkAssignmentTopics(gradeKey) {
  const opts = hebrewTopicOptionsForGrade(gradeKey);
  const allowed = HEBREW_GRADES[gradeKey]?.topics || [];
  const optKeys = opts.map((o) => o.key).sort();
  const allowedSorted = [...allowed].sort();
  if (optKeys.join(",") !== allowedSorted.join(",")) {
    fail(
      "assignment.topics",
      `hebrew ${gradeKey} picker [${optKeys}] != GRADES [${allowedSorted}]`
    );
  }
}

async function checkActivityGeneration(gradeKey) {
  const topics = (HEBREW_GRADES[gradeKey]?.topics || []).filter((t) => t !== "mixed");
  const topic = topics[0];
  if (!topic) {
    fail("activity.generate", `hebrew ${gradeKey} has no topics`);
    return;
  }

  try {
    const qs = await generateActivityQuestionSetClient({
      subject: "hebrew",
      gradeLevel: gradeKey,
      topic,
      difficulty: "easy",
      count: 3,
    });
    if (qs.length < 3) {
      fail("activity.generate", `hebrew ${gradeKey} ${topic} returned ${qs.length}`);
    }
  } catch (err) {
    fail("activity.generate", `hebrew ${gradeKey} ${topic}: ${err.message}`);
  }
}

function checkDiagnosticLabels() {
  const generic = resolveClassroomSkillLabelHe("hebrew_unknown_skill_xyz", {
    subject: "hebrew",
    gradeLevel: "g3",
  });
  if (generic !== "מיומנות בעברית") {
    fail("diagnostic.label", `hebrew unknown skill fallback wrong: ${generic}`);
  }
}

function checkDraftFilesOnDisk(spec) {
  const draftsDir = path.join(ROOT, spec.bookMeta.draftsDir);
  for (const pageId of spec.pageOrder) {
    const filePath = path.join(draftsDir, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      fail("book.missing", `hebrew ${spec.grade} missing draft file ${pageId}.md`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    if (raw.includes("[DRAFT")) {
      fail("book.draft", `hebrew ${spec.grade}/${pageId}: raw file contains DRAFT marker`);
    }
    if (/\|\s*\*\*approval_status\*\*\s*\|\s*draft\s*\|/.test(raw)) {
      fail("book.draft", `hebrew ${spec.grade}/${pageId}: approval_status still draft`);
    }
  }
}

/** @param {string} gradeKey @param {string[]} gradeFailures */
function gradeStatus(gradeKey, gradeFailures) {
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
  const has = (p) => gradeFailures.some((f) => f.startsWith(p));
  return {
    learningBook: has("book.") ? "FAIL" : "PASS",
    practice: has("practice.") ? "FAIL" : "PASS",
    studentLearning: has("runtime.") || has("activity.") || has("spine.") ? "FAIL" : "PASS",
    teacherAssignment: has("assignment.") ? "FAIL" : "PASS",
    parentAssignment: has("assignment.") ? "FAIL" : "PASS",
    reportsDiagnostics: has("diagnostic.") ? "FAIL" : "PASS",
    status: "FAIL",
  };
}

/** @type {Record<string, string[]>} */
const failuresByGrade = Object.fromEntries(GRADE_KEYS.map((g) => [`hebrew:${g}`, []]));

checkOracleBacking();
checkSpineCoverage();

const policy = assertAllGradesTopicPolicy();
if (!policy.ok) {
  for (const v of policy.violations) fail("runtime.policy", v);
}

for (const err of assertHebrewMasterPath()) fail("book.catalog", err);
for (const err of checkHebrewLearningPageIdCollisions(BOOK_SPECS)) {
  fail("book.collision", err);
}

for (const spec of BOOK_SPECS) {
  const bucket = `hebrew:${spec.grade}`;
  const before = failures.length;

  if (!hasLearningBook("hebrew", spec.grade)) {
    fail("book.catalog", `hebrew ${spec.grade} not in catalog meta`);
  }

  checkDraftFilesOnDisk(spec);
  for (const err of verifyHebrewBookRuntime(spec)) {
    fail("book.runtime", err);
  }
  for (const err of verifyBookSequenceEnforced(
    "hebrew",
    spec.grade,
    spec.pageOrder,
    spec.batches
  )) {
    fail("book.sequence", err);
  }
  checkAssignmentTopics(spec.grade);
  await checkActivityGeneration(spec.grade);

  failuresByGrade[bucket].push(...failures.slice(before));
}

checkDiagnosticLabels();

const globalSeq = verifyGlobalSequenceEnforcement();
if (!globalSeq.ok) {
  for (const v of globalSeq.violations.slice(0, 10)) fail("book.sequence", v);
}

for (const gk of GRADE_KEYS) {
  const entry = getLearningBookEntry("hebrew", gk);
  if (!entry || entry.status !== "authored") {
    fail("book.catalog", `hebrew ${gk} not authored/visible`);
  }
}

const hebrewStatus = {};
for (const gk of GRADE_KEYS) {
  hebrewStatus[gk] = gradeStatus(gk, failuresByGrade[`hebrew:${gk}`]);
}

console.log(JSON.stringify({ hebrew: hebrewStatus }, null, 2));

if (failures.length > 0) {
  console.error(`\nverify-hebrew-final-sync: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nverify-hebrew-final-sync: all checks passed");
