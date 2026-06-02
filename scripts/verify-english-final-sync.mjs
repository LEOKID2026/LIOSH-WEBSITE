#!/usr/bin/env node
/**
 * English G1–G6 final product sync verifier.
 * Run: node scripts/verify-english-final-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { ENGLISH_GRADES } from "../data/english-curriculum.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { hasLearningBook, getLearningBookIndexHref, getVisibleLearningBooks, getDynamicRouteBookMetaList } from "../lib/learning-book/learning-book-catalog-meta.js";
import { englishTopicOptionsForGrade } from "../lib/teacher-portal/teacher-class-topic-options.js";
import { resolveClassroomSkillLabelHe } from "../lib/classroom-activities/classroom-skill-labels-he.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";
import {
  assertAllEnglishCurriculumPlacements,
  assertAllEnglishGradesTopicPolicy,
  maxGradeForEnglishTopicKey,
  minGradeForEnglishTopicKey,
} from "../utils/english-grade-topic-policy.js";
import {
  ENGLISH_MASTER_SCOPE,
  ENGLISH_SUBJECT_KEY,
} from "./lib/english-learning-book-master-scope-manifest.mjs";
import {
  ENGLISH_G1_PAGE_ORDER,
  ENGLISH_G1_BOOK_META,
  ENGLISH_G1_BOOK_BATCHES,
} from "../lib/learning-book/english-g1-registry.js";
import {
  ENGLISH_G2_PAGE_ORDER,
  ENGLISH_G2_BOOK_META,
  ENGLISH_G2_BOOK_BATCHES,
} from "../lib/learning-book/english-g2-registry.js";
import {
  ENGLISH_G3_PAGE_ORDER,
  ENGLISH_G3_BOOK_META,
  ENGLISH_G3_BOOK_BATCHES,
} from "../lib/learning-book/english-g3-registry.js";
import {
  ENGLISH_G4_PAGE_ORDER,
  ENGLISH_G4_BOOK_META,
  ENGLISH_G4_BOOK_BATCHES,
} from "../lib/learning-book/english-g4-registry.js";
import {
  ENGLISH_G5_PAGE_ORDER,
  ENGLISH_G5_BOOK_META,
  ENGLISH_G5_BOOK_BATCHES,
} from "../lib/learning-book/english-g5-registry.js";
import {
  ENGLISH_G6_PAGE_ORDER,
  ENGLISH_G6_BOOK_META,
  ENGLISH_G6_BOOK_BATCHES,
} from "../lib/learning-book/english-g6-registry.js";
import {
  verifyEnglishBookRuntime,
  assertEnglishMasterPath,
  checkEnglishLearningPageIdCollisions,
} from "./lib/verify-english-book-runtime-lib.mjs";
import { verifyBookSequenceEnforced, verifyGlobalSequenceEnforcement } from "./lib/verify-learning-book-sequence-lib.mjs";

const ROOT = process.cwd();
const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

const BOOK_SPECS = [
  {
    grade: "g1",
    pageOrder: ENGLISH_G1_PAGE_ORDER,
    batches: ENGLISH_G1_BOOK_BATCHES,
    bookMeta: ENGLISH_G1_BOOK_META,
    batchCount: ENGLISH_G1_BOOK_BATCHES.length,
  },
  {
    grade: "g2",
    pageOrder: ENGLISH_G2_PAGE_ORDER,
    batches: ENGLISH_G2_BOOK_BATCHES,
    bookMeta: ENGLISH_G2_BOOK_META,
    batchCount: ENGLISH_G2_BOOK_BATCHES.length,
  },
  {
    grade: "g3",
    pageOrder: ENGLISH_G3_PAGE_ORDER,
    batches: ENGLISH_G3_BOOK_BATCHES,
    bookMeta: ENGLISH_G3_BOOK_META,
    batchCount: ENGLISH_G3_BOOK_BATCHES.length,
  },
  {
    grade: "g4",
    pageOrder: ENGLISH_G4_PAGE_ORDER,
    batches: ENGLISH_G4_BOOK_BATCHES,
    bookMeta: ENGLISH_G4_BOOK_META,
    batchCount: ENGLISH_G4_BOOK_BATCHES.length,
  },
  {
    grade: "g5",
    pageOrder: ENGLISH_G5_PAGE_ORDER,
    batches: ENGLISH_G5_BOOK_BATCHES,
    bookMeta: ENGLISH_G5_BOOK_META,
    batchCount: ENGLISH_G5_BOOK_BATCHES.length,
  },
  {
    grade: "g6",
    pageOrder: ENGLISH_G6_PAGE_ORDER,
    batches: ENGLISH_G6_BOOK_BATCHES,
    bookMeta: ENGLISH_G6_BOOK_META,
    batchCount: ENGLISH_G6_BOOK_BATCHES.length,
  },
];

/** Topics that must not be assignable below this grade (product gates). */
const GRADE_TOPIC_GATES = {
  g1: { disallow: ["grammar", "translation", "sentences", "writing", "mixed"] },
  g2: { disallow: ["grammar", "sentences", "mixed"] },
};

/** @type {string[]} */
const failures = [];

function fail(code, detail) {
  failures.push(`${code}: ${detail}`);
}

function checkOracleBacking() {
  const matrixPath = path.join(ROOT, "data/curriculum-oracle/v1/ministry-matrix.draft.json");
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const englishRows = (matrix.rows || []).filter((r) => r.subject === "english");
  if (englishRows.length === 0) {
    fail("oracle.empty", "no english rows in ministry matrix");
  }
  const blockers = englishRows.filter((r) => r.status === "source_blocker");
  if (blockers.length > 0) {
    fail("oracle.blocker", `${blockers.length} english source_blocker rows remain`);
  }
}

function checkSpineTopicAccess() {
  const spine = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/curriculum-spine/v1/skills.json"), "utf8")
  );
  const englishSkills = (spine.skills || []).filter((s) => s.subject === ENGLISH_SUBJECT_KEY);

  for (const gk of GRADE_KEYS) {
    const gradeNum = Number(gk.replace("g", ""));
    const topics = (ENGLISH_GRADES[gk]?.topics || []).filter((t) => t !== "mixed");
    for (const topic of topics) {
      const skillId = `english:${gk}:topic:${topic}`;
      const skill = englishSkills.find((s) => s.skill_id === skillId);
      if (!skill) {
        fail("spine.coverage", `missing spine topic access skill ${skillId}`);
        continue;
      }
      if (skill.minGrade !== gradeNum || skill.maxGrade !== gradeNum) {
        fail(
          "spine.grade",
          `${skillId} span G${skill.minGrade}-${skill.maxGrade} expected G${gradeNum}`
        );
      }
    }
  }

  if (englishSkills.length !== ENGLISH_MASTER_SCOPE.totalEnglishSkills) {
    fail(
      "spine.manifest",
      `english skill count ${englishSkills.length} != manifest ${ENGLISH_MASTER_SCOPE.totalEnglishSkills}`
    );
  }
}

function checkAssignmentTopics(gradeKey) {
  const opts = englishTopicOptionsForGrade(gradeKey);
  const allowed = ENGLISH_GRADES[gradeKey]?.topics || [];
  const optKeys = opts.map((o) => o.key).sort();
  const allowedSorted = [...allowed].sort();
  if (optKeys.join(",") !== allowedSorted.join(",")) {
    fail(
      "assignment.topics",
      `english ${gradeKey} picker [${optKeys}] != ENGLISH_GRADES [${allowedSorted}]`
    );
  }

  const gates = GRADE_TOPIC_GATES[gradeKey];
  if (gates) {
    for (const bad of gates.disallow) {
      if (optKeys.includes(bad)) {
        fail("assignment.grade_gate", `english ${gradeKey} must not offer ${bad}`);
      }
    }
  }
}

async function checkActivityGeneration(gradeKey) {
  const topics = (ENGLISH_GRADES[gradeKey]?.topics || []).filter((t) => t !== "mixed");
  const topic = topics[0];
  if (!topic) {
    fail("activity.generate", `english ${gradeKey} has no topics`);
    return;
  }

  try {
    const qs = await generateActivityQuestionSetClient({
      subject: "english",
      gradeLevel: gradeKey,
      topic,
      difficulty: "easy",
      count: 3,
    });
    if (qs.length < 3) {
      fail("activity.generate", `english ${gradeKey} ${topic} returned ${qs.length}`);
    }
  } catch (err) {
    fail("activity.generate", `english ${gradeKey} ${topic}: ${err.message}`);
  }

  const gates = GRADE_TOPIC_GATES[gradeKey];
  if (gates) {
    for (const bad of gates.disallow) {
      try {
        await generateActivityQuestionSetClient({
          subject: "english",
          gradeLevel: gradeKey,
          topic: bad,
          difficulty: "easy",
          count: 3,
        });
        fail("activity.grade_gate", `english ${gradeKey} ${bad} should throw`);
      } catch {
        // expected
      }
    }
  }
}

function checkTopicPolicySpans() {
  for (const gk of GRADE_KEYS) {
    const topics = ENGLISH_GRADES[gk]?.topics || [];
    for (const t of topics) {
      if (t === "mixed") continue;
      const min = minGradeForEnglishTopicKey(t);
      const max = maxGradeForEnglishTopicKey(t);
      const g = Number(gk.replace("g", ""));
      if (min != null && g < min) {
        fail("runtime.policy", `${gk}: topic ${t} before min grade ${min}`);
      }
      if (max != null && g > max) {
        fail("runtime.policy", `${gk}: topic ${t} after max grade ${max}`);
      }
    }
  }
}

function checkDiagnosticLabels() {
  const generic = resolveClassroomSkillLabelHe("eng_unknown_skill_xyz", {
    subject: "english",
    gradeLevel: "g3",
  });
  if (generic !== "מיומנות באנגלית") {
    fail("diagnostic.label", `english unknown skill fallback wrong: ${generic}`);
  }
}

function checkDraftFilesOnDisk(spec) {
  const draftsDir = path.join(ROOT, spec.bookMeta.draftsDir);
  for (const pageId of spec.pageOrder) {
    const filePath = path.join(draftsDir, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      fail("book.missing", `english ${spec.grade} missing draft file ${pageId}.md`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    if (raw.includes("[DRAFT")) {
      fail("book.draft", `english ${spec.grade}/${pageId}: raw file contains DRAFT marker`);
    }
    if (/\|\s*\*\*approval_status\*\*\s*\|\s*draft\s*\|/.test(raw)) {
      fail("book.draft", `english ${spec.grade}/${pageId}: approval_status still draft`);
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
    learningBook: has("book.") || has("book.ui") ? "FAIL" : "PASS",
    practice: has("practice.") ? "FAIL" : "PASS",
    studentLearning: has("runtime.") || has("activity.") || has("spine.") ? "FAIL" : "PASS",
    teacherAssignment: has("assignment.") ? "FAIL" : "PASS",
    parentAssignment: has("assignment.") ? "FAIL" : "PASS",
    reportsDiagnostics: has("diagnostic.") ? "FAIL" : "PASS",
    status: "FAIL",
  };
}

function checkEnglishBookUiVisibility() {
  const masterPath = path.join(ROOT, "pages/learning/english-master.js");
  if (!fs.existsSync(masterPath)) {
    fail("book.ui", "missing pages/learning/english-master.js");
    return;
  }
  const masterSrc = fs.readFileSync(masterPath, "utf8");
  if (!masterSrc.includes("LearningBookIndexTile")) {
    fail("book.ui", "english-master.js must render LearningBookIndexTile");
  }
  if (!masterSrc.includes('getLearningBookIndexHref("english"')) {
    fail("book.ui", 'english-master.js must call getLearningBookIndexHref("english", grade)');
  }
  if (!masterSrc.includes('subject="english"')) {
    fail("book.ui", 'english-master.js LearningBookIndexTile must use subject="english"');
  }
  if (!masterSrc.includes("bookIndexHref")) {
    fail("book.ui", "english-master.js must gate tile on bookIndexHref");
  }

  const visible = getVisibleLearningBooks("english");
  if (visible.length !== GRADE_KEYS.length) {
    fail(
      "book.ui",
      `expected ${GRADE_KEYS.length} visible English books, got ${visible.length}`
    );
  }

  const dynamicEnglish = getDynamicRouteBookMetaList().filter((b) => b.subject === "english");
  if (dynamicEnglish.length !== GRADE_KEYS.length) {
    fail(
      "book.ui",
      `expected ${GRADE_KEYS.length} English books in dynamic route meta, got ${dynamicEnglish.length}`
    );
  }

  for (const gk of GRADE_KEYS) {
    const expected = `/learning/book/english/${gk}`;
    const href = getLearningBookIndexHref("english", gk);
    if (href !== expected) {
      fail("book.ui", `english ${gk} tile href ${href} != ${expected}`);
    }
    if (!hasLearningBook("english", gk)) {
      fail("book.ui", `english ${gk} not visible via hasLearningBook`);
    }
  }
}

/** @type {Record<string, string[]>} */
const failuresByGrade = Object.fromEntries(GRADE_KEYS.map((g) => [`english:${g}`, []]));

checkOracleBacking();
checkSpineTopicAccess();
checkTopicPolicySpans();

const policy = assertAllEnglishGradesTopicPolicy();
if (!policy.ok) {
  for (const v of policy.violations) fail("runtime.policy", v);
}
const placement = assertAllEnglishCurriculumPlacements();
if (!placement.ok) {
  for (const v of placement.violations) fail("runtime.placement", v);
}

for (const err of assertEnglishMasterPath()) fail("book.catalog", err);
for (const err of checkEnglishLearningPageIdCollisions(BOOK_SPECS)) {
  fail("book.collision", err);
}

checkEnglishBookUiVisibility();

for (const spec of BOOK_SPECS) {
  const bucket = `english:${spec.grade}`;
  const before = failures.length;

  if (!hasLearningBook("english", spec.grade)) {
    fail("book.catalog", `english ${spec.grade} not in catalog meta`);
  }

  const registryPath = path.join(ROOT, `lib/learning-book/english-${spec.grade}-registry.js`);
  if (!fs.existsSync(registryPath)) {
    fail("book.registry", `missing ${registryPath}`);
  }

  checkDraftFilesOnDisk(spec);
  for (const err of verifyEnglishBookRuntime(spec)) {
    fail("book.runtime", err);
  }
  for (const err of verifyBookSequenceEnforced(
    "english",
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
  const entry = getLearningBookEntry("english", gk);
  if (!entry || entry.status !== "authored") {
    fail("book.catalog", `english ${gk} not authored/visible`);
  }
}

const englishStatus = {};
for (const gk of GRADE_KEYS) {
  englishStatus[gk] = gradeStatus(gk, failuresByGrade[`english:${gk}`]);
}

console.log(JSON.stringify({ english: englishStatus }, null, 2));

if (failures.length > 0) {
  console.error(`\nverify-english-final-sync: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nverify-english-final-sync: all checks passed");
