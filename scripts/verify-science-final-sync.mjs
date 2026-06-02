#!/usr/bin/env node
/**
 * Science G1–G6 final product sync verifier.
 * Run: node scripts/verify-science-final-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SCIENCE_GRADES } from "../data/science-curriculum.js";
import {
  SCIENCE_PAGE_ORDER_BY_GRADE,
  SCIENCE_PAGE_TO_PRACTICE_BY_GRADE,
  resolveSciencePracticeTarget,
} from "../lib/learning-book/science-book-practice-map.js";
import {
  SCIENCE_G1_PAGE_ORDER,
  SCIENCE_G1_BOOK_META,
  SCIENCE_G1_BOOK_BATCHES,
} from "../lib/learning-book/science-g1-registry.js";
import {
  SCIENCE_G2_PAGE_ORDER,
  SCIENCE_G2_BOOK_META,
  SCIENCE_G2_BOOK_BATCHES,
} from "../lib/learning-book/science-g2-registry.js";
import {
  SCIENCE_G3_PAGE_ORDER,
  SCIENCE_G3_BOOK_META,
  SCIENCE_G3_BOOK_BATCHES,
} from "../lib/learning-book/science-g3-registry.js";
import {
  SCIENCE_G4_PAGE_ORDER,
  SCIENCE_G4_BOOK_META,
  SCIENCE_G4_BOOK_BATCHES,
} from "../lib/learning-book/science-g4-registry.js";
import {
  SCIENCE_G5_PAGE_ORDER,
  SCIENCE_G5_BOOK_META,
  SCIENCE_G5_BOOK_BATCHES,
} from "../lib/learning-book/science-g5-registry.js";
import {
  SCIENCE_G6_PAGE_ORDER,
  SCIENCE_G6_BOOK_META,
  SCIENCE_G6_BOOK_BATCHES,
} from "../lib/learning-book/science-g6-registry.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { scienceTopicOptionsForGrade } from "../lib/teacher-portal/teacher-class-topic-options.js";
import { resolveClassroomSkillLabelHe } from "../lib/classroom-activities/classroom-skill-labels-he.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";
import {
  assertAllScienceCurriculumPlacements,
  assertAllScienceGradesTopicPolicy,
  maxGradeForScienceTopicKey,
  minGradeForScienceTopicKey,
} from "../utils/science-grade-topic-policy.js";
import {
  verifyScienceBookRuntime,
  assertScienceMasterPath,
} from "./lib/verify-science-book-runtime-lib.mjs";
import { verifyBookSequenceEnforced, verifyGlobalSequenceEnforcement } from "./lib/verify-learning-book-sequence-lib.mjs";

const ROOT = process.cwd();
const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

const BOOK_SPECS = [
  {
    grade: "g1",
    pageOrder: SCIENCE_G1_PAGE_ORDER,
    batches: SCIENCE_G1_BOOK_BATCHES,
    bookMeta: SCIENCE_G1_BOOK_META,
    batchCount: 2,
    mustExcludeExperiments: true,
    mustIncludePlants: true,
  },
  {
    grade: "g2",
    pageOrder: SCIENCE_G2_PAGE_ORDER,
    batches: SCIENCE_G2_BOOK_BATCHES,
    bookMeta: SCIENCE_G2_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustIncludePlants: true,
  },
  {
    grade: "g3",
    pageOrder: SCIENCE_G3_PAGE_ORDER,
    batches: SCIENCE_G3_BOOK_BATCHES,
    bookMeta: SCIENCE_G3_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustIncludePlants: true,
  },
  {
    grade: "g4",
    pageOrder: SCIENCE_G4_PAGE_ORDER,
    batches: SCIENCE_G4_BOOK_BATCHES,
    bookMeta: SCIENCE_G4_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustExcludePlants: true,
  },
  {
    grade: "g5",
    pageOrder: SCIENCE_G5_PAGE_ORDER,
    batches: SCIENCE_G5_BOOK_BATCHES,
    bookMeta: SCIENCE_G5_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustExcludePlants: true,
  },
  {
    grade: "g6",
    pageOrder: SCIENCE_G6_PAGE_ORDER,
    batches: SCIENCE_G6_BOOK_BATCHES,
    bookMeta: SCIENCE_G6_BOOK_META,
    batchCount: 3,
    mustIncludeExperiments: true,
    mustExcludePlants: true,
  },
];

/** @type {string[]} */
const failures = [];

function fail(code, detail) {
  failures.push(`${code}: ${detail}`);
}

function checkOracleBacking() {
  const matrixPath = path.join(ROOT, "data/curriculum-oracle/v1/ministry-matrix.draft.json");
  if (!fs.existsSync(matrixPath)) {
    fail("oracle.missing", "ministry-matrix.draft.json not found");
    return;
  }
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const scienceRows = (matrix.rows || []).filter((r) => r.subject === "science");
  if (scienceRows.length === 0) {
    fail("oracle.empty", "no science rows in ministry matrix");
  }
}

function checkSpineTopicSpans() {
  const spinePath = path.join(ROOT, "data/curriculum-spine/v1/skills.json");
  const spine = JSON.parse(fs.readFileSync(spinePath, "utf8"));
  const scienceSkills = (spine.skills || []).filter((s) => s.subject === "science");

  for (const skill of scienceSkills) {
    const { topic, minGrade, maxGrade } = skill;
    const minCur = minGradeForScienceTopicKey(topic);
    const maxCur = maxGradeForScienceTopicKey(topic);
    if (minCur != null && minGrade < minCur) {
      fail("spine.grade", `${skill.skill_id} minGrade ${minGrade} < curriculum min ${minCur}`);
    }
    if (maxCur != null && maxGrade > maxCur) {
      fail("spine.grade", `${skill.skill_id} maxGrade ${maxGrade} > curriculum max ${maxCur}`);
    }
  }

  for (const gk of GRADE_KEYS) {
    const topics = SCIENCE_GRADES[gk]?.topics || [];
    for (const topic of topics) {
      const hasSkill = scienceSkills.some(
        (s) => s.topic === topic && s.minGrade <= Number(gk.replace("g", "")) && s.maxGrade >= Number(gk.replace("g", ""))
      );
      if (!hasSkill) {
        fail("spine.coverage", `science ${gk} topic "${topic}" has no spanning spine skill`);
      }
    }
  }
}

function checkAssignmentTopics(gradeKey) {
  const opts = scienceTopicOptionsForGrade(gradeKey);
  const allowed = (SCIENCE_GRADES[gradeKey]?.topics || []).slice().sort();
  const optKeys = opts.map((o) => o.key).sort();
  if (optKeys.join(",") !== allowed.join(",")) {
    fail(
      "assignment.topics",
      `science ${gradeKey} picker [${optKeys}] != SCIENCE_GRADES [${allowed}]`
    );
  }
}

function checkPracticeMappings(gradeKey) {
  const pageOrder = SCIENCE_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = SCIENCE_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  const topics = new Set(SCIENCE_GRADES[gradeKey]?.topics || []);

  for (const pageId of pageOrder) {
    if (!map[pageId]) {
      fail("practice.cta", `science ${gradeKey} ${pageId} missing PAGE_TO_PRACTICE`);
      continue;
    }
    if (!topics.has(map[pageId].topic)) {
      fail(
        "practice.grade",
        `science ${gradeKey} ${pageId} topic ${map[pageId].topic} not in SCIENCE_GRADES`
      );
    }
    if (!resolveSciencePracticeTarget(gradeKey, pageId)) {
      fail("practice.cta", `science ${gradeKey} ${pageId} resolveSciencePracticeTarget null`);
    }
  }

  for (const pageId of Object.keys(map)) {
    if (!pageOrder.includes(pageId)) {
      fail("practice.stale", `science ${gradeKey} stale practice map for ${pageId}`);
    }
  }

  if (gradeKey === "g1" && pageOrder.includes("experiments")) {
    fail("book.gate", "science g1 must not include experiments page");
  }
  if (["g4", "g5", "g6"].includes(gradeKey) && pageOrder.includes("plants")) {
    fail("book.gate", `science ${gradeKey} must not include plants page`);
  }
}

async function checkActivityGeneration(gradeKey) {
  const topic = (SCIENCE_GRADES[gradeKey]?.topics || [])[0];
  if (!topic) {
    fail("activity.generate", `science ${gradeKey} has no topics`);
    return;
  }

  try {
    const qs = await generateActivityQuestionSetClient({
      subject: "science",
      gradeLevel: gradeKey,
      topic,
      difficulty: "easy",
      count: 3,
    });
    if (qs.length < 3) {
      fail("activity.generate", `science ${gradeKey} ${topic} returned ${qs.length} questions`);
    }
  } catch (err) {
    fail("activity.generate", `science ${gradeKey} ${topic}: ${err.message}`);
  }

  if (gradeKey === "g1") {
    try {
      await generateActivityQuestionSetClient({
        subject: "science",
        gradeLevel: "g1",
        topic: "experiments",
        difficulty: "easy",
        count: 3,
      });
      fail("activity.grade_gate", "science g1 experiments should throw");
    } catch {
      // expected
    }
  }

  if (["g4", "g5", "g6"].includes(gradeKey)) {
    const plantsOpts = scienceTopicOptionsForGrade(gradeKey).some((o) => o.key === "plants");
    if (plantsOpts) {
      fail("assignment.grade_gate", `science ${gradeKey} must not offer plants in picker`);
    }
  }
}

function checkDiagnosticLabels() {
  const generic = resolveClassroomSkillLabelHe("sci_unknown_skill_xyz", {
    subject: "science",
    gradeLevel: "g3",
  });
  if (generic !== "מיומנות במדעים") {
    fail("diagnostic.label", `science unknown skill fallback wrong: ${generic}`);
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
const failuresByGrade = Object.fromEntries(GRADE_KEYS.map((g) => [`science:${g}`, []]));

checkOracleBacking();
checkSpineTopicSpans();

const policy = assertAllScienceGradesTopicPolicy();
if (!policy.ok) {
  for (const v of policy.violations) fail("runtime.policy", v);
}
const placement = assertAllScienceCurriculumPlacements();
if (!placement.ok) {
  for (const v of placement.violations) fail("runtime.placement", v);
}

for (const err of assertScienceMasterPath()) fail("book.catalog", err);

for (const spec of BOOK_SPECS) {
  const bucket = `science:${spec.grade}`;
  const before = failures.length;

  for (const err of verifyScienceBookRuntime(spec)) {
    fail("book.runtime", err);
  }
  for (const err of verifyBookSequenceEnforced(
    "science",
    spec.grade,
    spec.pageOrder,
    spec.batches
  )) {
    fail("book.sequence", err);
  }
  checkPracticeMappings(spec.grade);
  checkAssignmentTopics(spec.grade);
  await checkActivityGeneration(spec.grade);

  failuresByGrade[bucket].push(...failures.slice(before));
}

checkDiagnosticLabels();

const globalSeq = verifyGlobalSequenceEnforcement();
if (!globalSeq.ok) {
  for (const v of globalSeq.violations) fail("book.sequence.global", v);
}

const catalogEntry = (gk) => getLearningBookEntry("science", gk);
for (const gk of GRADE_KEYS) {
  const entry = catalogEntry(gk);
  if (!entry || entry.status !== "authored") {
    fail("book.catalog", `science ${gk} not authored/visible`);
  }
}

const scienceStatus = {};
for (const gk of GRADE_KEYS) {
  scienceStatus[gk] = gradeStatus(gk, failuresByGrade[`science:${gk}`]);
}

console.log(JSON.stringify({ science: scienceStatus }, null, 2));

if (failures.length > 0) {
  console.error(`\nverify-science-final-sync: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nverify-science-final-sync: all checks passed");
