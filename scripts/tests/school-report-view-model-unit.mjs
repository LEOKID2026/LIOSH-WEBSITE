import assert from "node:assert/strict";
import {
  formatTopicLineHe,
  formatTopicRecommendationLineHe,
  resolveTopicLabelHe,
} from "../../lib/teacher-portal/teacher-ui.he.js";
import {
  mergeSubjectGuidanceReinforcementUnits,
  parseClassReportViewModel,
  parsePhysicalClassReportViewModel,
} from "../../lib/school-portal/school-report-view-model.js";
import { CLASS_WEAK_TOPICS_FALLBACK_BANNER } from "../../lib/teacher-portal/teacher-ui.he.js";

assert.equal(formatTopicLineHe("math", "math"), null);
assert.equal(formatTopicLineHe("math", "geometry"), null);
assert.equal(formatTopicLineHe("geometry", "geometry"), null);
assert.equal(resolveTopicLabelHe("math", "angles"), null);
assert.equal(resolveTopicLabelHe("geometry", "angles"), "זוויות");
assert.ok(formatTopicRecommendationLineHe("math", "fractions")?.includes("שברים"));

const classBody = {
  cohortSummary: { totalAnswers: 200, studentsWithActivity: 5, accuracy: 70, correctAnswers: 140, wrongAnswers: 60 },
  roster: { studentCount: 5, activeMemberCount: 5 },
  students: [
    {
      studentId: "s1",
      studentFullName: "יעל כהן",
      studentFullNameMasked: "י*** כ***",
      summary: { totalAnswers: 80, accuracy: 75, totalSessions: 8 },
    },
  ],
  weaknessTopics: [
    { subject: "math", topic: "math", wrong: 10, answers: 20, studentCount: 2, studentIds: ["s1"] },
    {
      subject: "math",
      topic: "fractions",
      wrong: 8,
      answers: 15,
      studentCount: 2,
      studentIds: ["s1"],
    },
  ],
  teacherGuidanceBlock: {
    suggestedGroups: {
      struggling: [{ studentId: "s1", studentFullNameMasked: "י*** כ***", totalAnswers: 80, accuracy: 40 }],
      on_track: [],
      advanced: [],
    },
    attentionStudents: [
      {
        studentId: "s1",
        studentFullNameMasked: "י*** כ***",
        totalAnswers: 80,
        accuracy: 40,
        reasons: ["low_accuracy"],
      },
    ],
    priorityTopics: [{ subject: "math", topic: "math", wrong: 10, answers: 20, studentCount: 2 }],
  },
};

const vm = parseClassReportViewModel(classBody, {
  name: "כיתה א׳ 2",
  subjectFocus: "geometry",
  memberCount: 5,
});
assert.ok(vm.sections.students.items[0].studentId === "s1");
assert.ok(vm.sections.attention.items[0].studentId === "s1");
assert.ok(!vm.sections.focus.items.some((f) => f.label.includes("math")));
assert.ok(vm.sections.focus.items.some((f) => f.label.includes("שברים")));
assert.ok(vm.drilldowns.distribution.struggling?.items?.length === 1);
assert.ok(vm.sections.attention.items[0].detail.includes("קשיים"));

// H1–H2 — class insight and subject focus at 61%
{
  const weakClassBody = {
    cohortSummary: {
      totalAnswers: 100,
      studentsWithActivity: 10,
      accuracy: 61,
    },
    roster: { studentCount: 10, activeMemberCount: 10 },
    students: [],
    weaknessTopics: [],
    teacherGuidanceBlock: {
      version: "v2",
      guidanceSeverityTier: "class_needs_reinforcement",
      teacherSummary: {
        classHealthSignal: "needs_reinforcement",
        cohortAccuracy: 61,
      },
      classRecommendationUnits: [
        {
          level: "subject",
          subject: "hebrew",
          headlineHe: "עברית — קושי ברמת מקצוע בכיתה",
          affectedStudentCount: 10,
          cohortAccuracyPct: 61,
          topicLabelHe: null,
        },
      ],
    },
  };
  const vmWeak = parseClassReportViewModel(weakClassBody, { name: "כיתה ב", memberCount: 10 });
  assert.ok(!vmWeak.insight.includes("מתקדמת כסדרה"), "H1: no progressing insight at 61%");
  assert.ok(
    vmWeak.sections.focus.items.some((f) => f.label.includes("קושי ברמת מקצוע")),
    "H2: subject headline in focus"
  );
}

// PHYS-1 — physical V2 focus includes math/geometry guidance
{
  const physicalBody = {
    reportMeta: { version: "v2" },
    physicalClassGuidanceSeverityTier: "class_needs_reinforcement",
    cohortSummary: { totalAnswers: 200, studentsWithActivity: 10, accuracy: 58 },
    rosterSummary: { studentCount: 10 },
    roster: [],
    students: [],
    subjectBreakdown: [
      { classId: "c-math", subjectFocus: "math", subjectLabelHe: "מתמטיקה", teacherId: "t1" },
      { classId: "c-geo", subjectFocus: "geometry", subjectLabelHe: "גאומטריה", teacherId: "t2" },
    ],
    subjectGuidanceBlocks: [
      {
        subjectFocus: "math",
        subjectLabelHe: "מתמטיקה",
        guidanceSeverityTier: "class_needs_reinforcement",
        classRecommendationUnits: [
          {
            level: "subject",
            subject: "math",
            headlineHe: "מתמטיקה — קושי ברמת מקצוע בכיתה",
            topicLabelHe: "מתמטיקה — קושי ברמת מקצוע בכיתה",
            cohortAccuracyPct: 55,
            affectedStudentCount: 8,
          },
        ],
      },
      {
        subjectFocus: "geometry",
        subjectLabelHe: "גאומטריה",
        guidanceSeverityTier: "class_needs_reinforcement",
        classRecommendationUnits: [
          {
            level: "subject",
            subject: "geometry",
            headlineHe: "גאומטריה — קושי ברמת מקצוע בכיתה",
            topicLabelHe: "גאומטריה — קושי ברמת מקצוע בכיתה",
            cohortAccuracyPct: 52,
            affectedStudentCount: 7,
          },
        ],
      },
    ],
    weaknessTopics: [],
    attentionList: [],
    recentActivities: [],
  };
  const vm = parsePhysicalClassReportViewModel(physicalBody, {
    physicalClassName: "כיתה ג׳ 3",
    gradeLevel: "g3",
  });
  assert.equal(vm.sections.focus.items.length, 2, "PHYS-1: math + geometry focus items");
  const labels = vm.sections.focus.items.map((f) => f.label).join(" ");
  assert.ok(labels.includes("מתמטיקה"), "PHYS-1: math visible");
  assert.ok(labels.includes("גאומטריה"), "PHYS-1: geometry visible");
}

// PHYS-2 — insight uses physicalClassGuidanceSeverityTier
{
  const physicalBody = {
    reportMeta: { version: "v2" },
    physicalClassGuidanceSeverityTier: "class_needs_reinforcement",
    cohortSummary: { totalAnswers: 100, studentsWithActivity: 8, accuracy: 60 },
    rosterSummary: { studentCount: 8 },
    subjectGuidanceBlocks: [
      {
        subjectFocus: "math",
        subjectLabelHe: "מתמטיקה",
        guidanceSeverityTier: "class_needs_reinforcement",
        classRecommendationUnits: [
          {
            level: "subject",
            subject: "math",
            headlineHe: "מתמטיקה — קושי ברמת מקצוע בכיתה",
            topicLabelHe: "מתמטיקה — קושי ברמת מקצוע בכיתה",
          },
        ],
      },
    ],
    roster: [],
    students: [],
    subjectBreakdown: [],
    weaknessTopics: [],
    attentionList: [],
    recentActivities: [],
  };
  const vm = parsePhysicalClassReportViewModel(physicalBody);
  assert.ok(!vm.insight.includes("תשובות/הגשות"), "PHYS-2: not generic activity summary");
  assert.ok(vm.insight.includes("קושי"), "PHYS-2: tier-based insight");
}

// PHYS-3 — geometry tier consistency (fixture)
{
  const tier = "class_needs_reinforcement";
  const physicalBody = {
    reportMeta: { version: "v2" },
    physicalClassGuidanceSeverityTier: tier,
    subjectGuidanceBlocks: [
      {
        subjectFocus: "geometry",
        subjectLabelHe: "גאומטריה",
        guidanceSeverityTier: tier,
        classRecommendationUnits: [
          {
            level: "subject",
            subject: "geometry",
            headlineHe: "גאומטריה — קושי ברמת מקצוע בכיתה",
            topicLabelHe: "גאומטריה — קושי ברמת מקצוע בכיתה",
          },
        ],
      },
    ],
    cohortSummary: { totalAnswers: 50, studentsWithActivity: 5, accuracy: 58 },
    rosterSummary: { studentCount: 5 },
    roster: [],
    students: [],
    subjectBreakdown: [],
    weaknessTopics: [],
    attentionList: [],
    recentActivities: [],
  };
  const vm = parsePhysicalClassReportViewModel(physicalBody);
  assert.ok(vm.insight.includes("קושי"), "PHYS-3: geometry severity reflected");
}

// PHYS-4 — focus not only science when math/geometry fallbacks present
{
  const physicalBody = {
    reportMeta: { version: "v2" },
    physicalClassGuidanceSeverityTier: "class_monitor",
    subjectGuidanceBlocks: [
      {
        subjectFocus: "science",
        subjectLabelHe: "מדעים",
        guidanceSeverityTier: "class_monitor",
        classRecommendationUnits: [
          {
            level: "topic",
            subject: "science",
            topic: "animals",
            topicLabelHe: "בעלי חיים",
            cohortAccuracyPct: 65,
            affectedStudentCount: 4,
          },
        ],
      },
      {
        subjectFocus: "math",
        subjectLabelHe: "מתמטיקה",
        guidanceSeverityTier: "class_needs_reinforcement",
        classRecommendationUnits: [
          {
            level: "subject",
            subject: "math",
            headlineHe: "מתמטיקה — קושי ברמת מקצוע בכיתה",
            topicLabelHe: "מתמטיקה — קושי ברמת מקצוע בכיתה",
          },
        ],
      },
    ],
    cohortSummary: { totalAnswers: 80, studentsWithActivity: 6, accuracy: 62 },
    rosterSummary: { studentCount: 6 },
    roster: [],
    students: [],
    subjectBreakdown: [],
    weaknessTopics: [{ subject: "science", topic: "animals", wrong: 5, answers: 10 }],
    attentionList: [],
    recentActivities: [],
  };
  const vm = parsePhysicalClassReportViewModel(physicalBody);
  const labels = vm.sections.focus.items.map((f) => f.label).join(" ");
  assert.ok(labels.includes("מתמטיקה"), "PHYS-4: math fallback in focus");
  assert.ok(labels.includes("בעלי חיים") || labels.includes("מדעים"), "PHYS-4: science topic present");
}

// PHYS-MERGE — aggregate topic units from all subjects (not capped at 2 per subject)
{
  const blocks = [
    {
      subjectFocus: "math",
      classRecommendationUnits: [
        {
          level: "topic",
          subject: "math",
          topic: "addition",
          topicLabelHe: "חיבור",
          subtopicLabelHe: "נשיאה",
          cohortAccuracyPct: 58,
          affectedStudentCount: 22,
          affectedStudentIds: ["s1"],
        },
        {
          level: "topic",
          subject: "math",
          topic: "subtraction",
          topicLabelHe: "חיסור",
          subtopicLabelHe: "השלמה לעשר",
          cohortAccuracyPct: 57,
          affectedStudentCount: 22,
          affectedStudentIds: ["s1"],
        },
        {
          level: "topic",
          subject: "math",
          topic: "multiplication",
          topicLabelHe: "כפל",
          cohortAccuracyPct: 60,
          affectedStudentCount: 20,
          affectedStudentIds: ["s1"],
        },
      ],
    },
    {
      subjectFocus: "hebrew",
      classRecommendationUnits: [
        {
          level: "topic",
          subject: "hebrew",
          topic: "reading",
          topicLabelHe: "קריאה",
          cohortAccuracyPct: 55,
          affectedStudentCount: 18,
          affectedStudentIds: ["s2"],
        },
      ],
    },
  ];
  const merged = mergeSubjectGuidanceReinforcementUnits(blocks, 24);
  assert.equal(merged.length, 4, "PHYS-MERGE: all subject topic units included");

  const physicalBody = {
    reportMeta: { version: "v2" },
    physicalClassGuidanceSeverityTier: "class_needs_reinforcement",
    cohortSummary: { totalAnswers: 200, studentsWithActivity: 22, accuracy: 58 },
    rosterSummary: { studentCount: 22 },
    roster: [],
    students: [
      {
        studentId: "s1",
        studentFullNameMasked: "ת***",
        summary: { totalAnswers: 80, accuracy: 55 },
      },
    ],
    subjectBreakdown: [],
    subjectGuidanceBlocks: blocks,
    weaknessTopics: [],
    attentionList: [],
    recentActivities: [],
  };
  const vm = parsePhysicalClassReportViewModel(physicalBody);
  assert.equal(vm.sections.focus.items.length, 4, "PHYS-MERGE: physical focus lists merged topics");
  assert.equal(
    vm.sections.focus.preamble,
    CLASS_WEAK_TOPICS_FALLBACK_BANNER,
    "PHYS-MERGE: generic banner shown with concrete topics"
  );
  assert.equal(vm.navigation.find((n) => n.id === "focus")?.badge, "4 נושאים");
  const labels = vm.sections.focus.items.map((f) => f.label).join(" ");
  assert.ok(labels.includes("חיבור"), "PHYS-MERGE: math addition visible");
  assert.ok(labels.includes("חיסור"), "PHYS-MERGE: math subtraction visible");
  assert.ok(labels.includes("קריאה"), "PHYS-MERGE: hebrew topic visible");
}

// CLASS-NODATA — no-data cohort must not show misleading monitor status
{
  const vm = parseClassReportViewModel(
    {
      cohortSummary: { totalAnswers: 0, studentsWithActivity: 0, accuracy: null },
      roster: { activeMemberCount: 5, studentCount: 5 },
      teacherGuidanceBlock: {
        guidanceSeverityTier: null,
        cohortStats: { classHealthSignal: "no_data", guidanceSeverityTier: null },
      },
    },
    { name: "כיתה א׳", subjectFocus: "math" }
  );
  const statusChip = vm.header.chips.find((c) => c.label === "מצב כיתה");
  assert.equal(statusChip, undefined, "no-data class report must omit monitor status chip");

  const physicalVm = parsePhysicalClassReportViewModel({
    cohortSummary: { totalAnswers: 0, studentsWithActivity: 0, accuracy: null },
    physicalClassGuidanceSeverityTier: "class_monitor",
    rosterSummary: { studentCount: 5 },
    subjectBreakdown: [],
    roster: [],
  });
  const physicalStatusChip = physicalVm.header.chips.find((c) => c.label === "מצב כיתה");
  assert.notEqual(
    physicalStatusChip?.value,
    "במעקב",
    "no-data physical class must not display monitor label"
  );
}

console.log("school-report-view-model-unit: ok");
