/**
 * Read-only matrix verification for school class activity contract.
 * Run: node --env-file=.env.local tests/scripts/verify-school-class-activity-matrix.mjs
 */
import { createClient } from "@supabase/supabase-js";
import {
  classGradeKeysMatch,
  formatGradeLevelHe,
  resolveCanonicalGradeKey,
  schoolSubjectGradeKeysMatch,
} from "../../lib/teacher-portal/teacher-class-grade.js";
import {
  defaultTopicForSubject,
  topicOptionsForSubject,
} from "../../lib/teacher-portal/teacher-class-topic-options.js";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";

const SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
];

const sb = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY
);

const { data: classes, error } = await sb
  .from("teacher_classes")
  .select("id, name, grade_level, subject_focus, teacher_id")
  .eq("is_archived", false);

if (error) {
  console.error(error);
  process.exit(1);
}

const gradeLevels = new Map();
const subjects = new Map();
for (const c of classes || []) {
  const g = c.grade_level == null ? "(null)" : String(c.grade_level);
  gradeLevels.set(g, (gradeLevels.get(g) || 0) + 1);
  const s = c.subject_focus == null ? "(null)" : String(c.subject_focus);
  subjects.set(s, (subjects.get(s) || 0) + 1);
}

console.log("=== TEACHER CLASS DATA INVENTORY ===");
console.log("grade_level distinct:", [...gradeLevels.entries()].sort());
console.log("subject_focus distinct:", [...subjects.entries()].sort());

const previewTopicBySubject = {
  math: (g) => ({ topic: "addition", difficulty: "easy" }),
  geometry: (g) => ({ topic: "shapes_basic", difficulty: "medium" }),
  hebrew: () => ({ topic: "grammar", difficulty: "easy" }),
  english: () => ({ topic: "grammar", difficulty: "easy" }),
  science: () => ({ topic: "body", difficulty: "easy" }),
  moledet_geography: () => ({ topic: "homeland", difficulty: "easy" }),
};

console.log("\n=== MATRIX (one g3-class per subject when available) ===");
console.log(
  "classId|subject|raw_grade|normalized|display|topics|preview|gradeGate|permGate|error"
);

for (const subject of SUBJECTS) {
  const sample =
    (classes || []).find(
      (c) =>
        c.subject_focus === subject &&
        resolveCanonicalGradeKey(c.grade_level) === "g3"
    ) ||
    (classes || []).find((c) => c.subject_focus === subject);

  if (!sample) {
    console.log(`-|${subject}|-|-|-|-|-|-|-|-|no class in DB`);
    continue;
  }

  const normalized = resolveCanonicalGradeKey(sample.grade_level);
  const displayed = formatGradeLevelHe(sample.grade_level);
  const topicOpts = topicOptionsForSubject(subject, normalized);
  const topicsLoaded = topicOpts.length > 0;
  let previewWorks = false;
  let previewError = "";
  try {
    const cfg = previewTopicBySubject[subject](normalized);
    const qs = await generateActivityQuestionSetClient({
      subject,
      gradeLevel: normalized,
      topic: cfg.topic,
      difficulty: cfg.difficulty,
      count: 3,
    });
    previewWorks = qs.length === 3;
  } catch (e) {
    previewError = e.message;
  }

  const bodyGrade = normalized || "g3";
  const gradeGate = classGradeKeysMatch(bodyGrade, sample.grade_level);
  const permGate = schoolSubjectGradeKeysMatch("3", bodyGrade);
  const err = !normalized
    ? "invalid class grade"
    : !topicsLoaded
      ? "empty topics"
      : !gradeGate
        ? "grade gate fail"
        : !permGate
          ? "permission gate fail"
          : !previewWorks
            ? previewError || "preview fail"
            : "";

  console.log(
    [
      sample.id,
      subject,
      sample.grade_level,
      normalized,
      displayed,
      topicsLoaded,
      previewWorks,
      gradeGate,
      permGate,
      err || "ok",
    ].join("|")
  );
}

console.log("\n=== AUTHORIZATION REGRESSION ===");
console.log("wrong grade g4 vs DB 3:", classGradeKeysMatch("g4", "3"));
console.log("missing grade:", classGradeKeysMatch(undefined, "3"));
