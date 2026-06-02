#!/usr/bin/env node
/**
 * English G1–G6 final product sync verifier.
 * Run: node scripts/verify-english-final-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { ENGLISH_GRADES } from "../data/english-curriculum.js";
import { hasLearningBook } from "../lib/learning-book/learning-book-catalog-meta.js";
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

const ROOT = process.cwd();
const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

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

  for (const skill of englishSkills) {
    if (skill.spine_layer !== "curriculum_topic_access") continue;
    const m = /^english:g([1-6]):topic:(\w+)$/.exec(skill.skill_id);
    if (!m) continue;
    const gk = `g${m[1]}`;
    const topic = m[2];
    const allowed = ENGLISH_GRADES[gk]?.topics || [];
    if (!allowed.includes(topic)) {
      fail("spine.policy", `${skill.skill_id} topic not in ENGLISH_GRADES.${gk}`);
    }
  }
}

function checkMasterScopeManifest() {
  const spine = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/curriculum-spine/v1/skills.json"), "utf8")
  );
  const englishSkills = (spine.skills || []).filter((s) => s.subject === ENGLISH_SUBJECT_KEY);
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

function learningBookStatus(gradeKey) {
  return hasLearningBook("english", gradeKey) ? "PASS" : "NOT READY";
}

/** @param {string} gradeKey @param {string[]} gradeFailures @param {string} bookStatus */
function gradeStatus(gradeKey, gradeFailures, bookStatus) {
  const runtimeFail = gradeFailures.some(
    (f) =>
      f.startsWith("runtime.") ||
      f.startsWith("activity.") ||
      f.startsWith("spine.") ||
      f.startsWith("oracle.")
  );
  const assignmentFail = gradeFailures.some((f) => f.startsWith("assignment."));
  const diagnosticFail = gradeFailures.some((f) => f.startsWith("diagnostic."));
  const bookFail = gradeFailures.some((f) => f.startsWith("book."));

  const overall =
    gradeFailures.length === 0 && bookStatus !== "FAIL" ? "PASS" : gradeFailures.length ? "FAIL" : "PASS";

  return {
    learningBook: bookFail ? "FAIL" : bookStatus,
    practice: runtimeFail ? "FAIL" : "PASS",
    studentLearning: runtimeFail ? "FAIL" : "PASS",
    teacherAssignment: assignmentFail ? "FAIL" : "PASS",
    parentAssignment: assignmentFail ? "FAIL" : "PASS",
    reportsDiagnostics: diagnosticFail ? "FAIL" : "PASS",
    status: overall,
  };
}

/** @type {Record<string, string[]>} */
const failuresByGrade = Object.fromEntries(GRADE_KEYS.map((g) => [`english:${g}`, []]));

checkOracleBacking();
checkMasterScopeManifest();
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

for (const gradeKey of GRADE_KEYS) {
  const bucket = `english:${gradeKey}`;
  const before = failures.length;

  if (hasLearningBook("english", gradeKey)) {
    fail(
      "book.exposed",
      `english ${gradeKey} learning book exposed but no authored registry — hide or implement`
    );
  }

  checkAssignmentTopics(gradeKey);
  await checkActivityGeneration(gradeKey);

  failuresByGrade[bucket].push(...failures.slice(before));
}

checkDiagnosticLabels();

const englishStatus = {};
for (const gk of GRADE_KEYS) {
  const bookStatus = learningBookStatus(gk);
  englishStatus[gk] = gradeStatus(gk, failuresByGrade[`english:${gk}`], bookStatus);
}

console.log(JSON.stringify({ english: englishStatus }, null, 2));

if (failures.length > 0) {
  console.error(`\nverify-english-final-sync: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nverify-english-final-sync: all checks passed");
console.log("Note: English learning books G1–G6 are NOT READY (not in student catalog); runtime surfaces verified.");
