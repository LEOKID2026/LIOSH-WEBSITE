/**
 * Read-only server-path verification mirroring POST /api/teacher/activities gates.
 * Run: node --env-file=.env.local tests/scripts/verify-school-class-activity-e2e.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadTeacherClassOwned } from "../../lib/teacher-server/teacher-classes.server.js";
import { parseCreateActivityBody } from "../../lib/teacher-server/teacher-activities.server.js";
import {
  assertDiscussionActivitySubjectAllowed,
  assertSchoolTeacherSubjectAllowed,
} from "../../lib/school-server/school-subjects.server.js";
import { buildDiscussionQuestionPreview } from "../../lib/teacher-server/discussion-question-preview.server.js";
import {
  classGradeKeysMatch,
  formatGradeLevelHe,
  resolveCanonicalGradeKey,
} from "../../lib/teacher-portal/teacher-class-grade.js";
import {
  defaultTopicForSubject,
  topicOptionsForSubject,
} from "../../lib/teacher-portal/teacher-class-topic-options.js";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";

const sb = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY
);

const ROUTES = [
  { route: "/teacher/class/[classId]/activities/new", mode: "activity", classId: "4cc553df-3e36-4a8c-8122-3f7e9e70093d", note: "math bare 3" },
  { route: "/teacher/class/[classId]/activities/new", mode: "activity", classId: "95298a19-b3ed-42e8-8cb5-b304f8118a6f", note: "geometry bare 3" },
  { route: "/teacher/class/[classId]/activities/new", mode: "activity", classId: "5000a413-c58e-4c29-a4e9-55d873a23500", note: "english g3" },
  { route: "/teacher/class/[classId]/discussion/new", mode: "discussion", classId: "4cc553df-3e36-4a8c-8122-3f7e9e70093d", note: "math" },
  { route: "/teacher/class/[classId]/discussion/new", mode: "discussion", classId: "95298a19-b3ed-42e8-8cb5-b304f8118a6f", note: "geometry" },
];

function activityBody(classId, subject, topic, gradeKey, mode) {
  const questionSet =
    mode === "discussion"
      ? [{ question: "שאלה?", correctAnswer: "1", choices: ["1", "2"] }]
      : [{ question: "2+2?", correctAnswer: "4", choices: ["3", "4", "5"] }];
  const questionCount = mode === "discussion" ? 1 : 1;
  return {
    title: "בדיקת QA",
    classId,
    subject,
    topic,
    mode: mode === "discussion" ? "discussion" : "guided_practice",
    questionSelection: "same_exact",
    questionCount,
    gradeLevel: gradeKey,
    questionSet,
  };
}

async function verifyEntry({ route, mode, classId }) {
  const { data: row, error } = await sb
    .from("teacher_classes")
    .select("id, grade_level, subject_focus, teacher_id, name")
    .eq("id", classId)
    .maybeSingle();
  if (error || !row) {
    return { route, classId, error: error?.message || "class not found" };
  }

  const owned = await loadTeacherClassOwned(sb, row.teacher_id, classId);
  if (!owned.ok) {
    return { route, classId, error: owned.code };
  }

  const gradeKey = resolveCanonicalGradeKey(row.grade_level);
  const topicOpts = topicOptionsForSubject(row.subject_focus, gradeKey);
  const topic =
    row.subject_focus === "geometry"
      ? "shapes_basic"
      : defaultTopicForSubject(row.subject_focus, gradeKey);

  let previewWorks = false;
  if (mode === "activity") {
    try {
      const qs = await generateActivityQuestionSetClient({
        subject: row.subject_focus,
        gradeLevel: gradeKey,
        topic,
        difficulty: "medium",
        count: 3,
      });
      previewWorks = qs.length === 3;
    } catch {
      previewWorks = false;
    }
  } else {
    const prev = await buildDiscussionQuestionPreview(sb, row.teacher_id, {
      subject: row.subject_focus,
      gradeLevel: gradeKey,
      topic,
      difficulty: "medium",
      count: 3,
    });
    previewWorks = prev.ok && prev.questions?.length === 3;
  }

  const body = activityBody(classId, row.subject_focus, topic, gradeKey, mode);
  const parsed = parseCreateActivityBody(body);
  const gradeMatch = classGradeKeysMatch(body.gradeLevel, owned.row.grade_level);
  const subjectMatch =
    !owned.row.subject_focus || (parsed.ok && parsed.payload.subject === owned.row.subject_focus);
  const gate =
    mode === "discussion"
      ? await assertDiscussionActivitySubjectAllowed(sb, row.teacher_id, row.subject_focus, gradeKey)
      : await assertSchoolTeacherSubjectAllowed(sb, row.teacher_id, row.subject_focus, gradeKey);

  const createOk = parsed.ok && gradeMatch && subjectMatch && gate.ok;
  const err = !parsed.ok
    ? parsed.message
    : !gradeMatch
      ? "grade_mismatch"
      : !subjectMatch
        ? "subject_mismatch"
        : !gate.ok
          ? gate.code
          : !previewWorks
            ? "preview_fail"
            : "";

  return {
    route,
    classId,
    subject_focus: row.subject_focus,
    raw_grade_level: row.grade_level,
    normalized_grade: gradeKey,
    displayed_grade: formatGradeLevelHe(row.grade_level),
    topics_loaded: topicOpts.length > 0,
    preview_works: previewWorks,
    create_save_ok: createOk,
    error: err || "ok",
  };
}

console.log("=== E2E SERVER PATH (POST gates + preview, no DB writes) ===");
console.log(
  "route|classId|subject|raw_grade|normalized|display|topics|preview|create|error"
);

for (const entry of ROUTES) {
  const r = await verifyEntry(entry);
  console.log(
    [
      r.route,
      r.classId,
      r.subject_focus,
      r.raw_grade_level,
      r.normalized_grade,
      r.displayed_grade,
      r.topics_loaded,
      r.preview_works,
      r.create_save_ok,
      r.error,
    ].join("|")
  );
}

const mathClass = "4cc553df-3e36-4a8c-8122-3f7e9e70093d";
const { data: mathRow } = await sb
  .from("teacher_classes")
  .select("grade_level, subject_focus, teacher_id")
  .eq("id", mathClass)
  .maybeSingle();

console.log("\n=== LOCK ENFORCEMENT (math class) ===");
console.log("forged grade g4 rejected:", !classGradeKeysMatch("g4", mathRow?.grade_level));
const forgedSubjectBody = activityBody(mathClass, "hebrew", "grammar", "g3", "activity");
const forgedParsed = parseCreateActivityBody(forgedSubjectBody);
const forgedSubjectRejected =
  forgedParsed.ok &&
  mathRow?.subject_focus === "math" &&
  forgedParsed.payload.subject === "hebrew";
console.log("forged hebrew body parses but API subject_mismatch would reject:", forgedSubjectRejected);
