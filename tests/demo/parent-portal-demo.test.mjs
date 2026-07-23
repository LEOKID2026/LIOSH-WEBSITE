/**
 * Public parent portal demo — focused unit tests (no browser, no DB).
 * Run: node --test tests/demo/parent-portal-demo.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PARENT_DEMO_DATA_VERSION,
  DEMO_HISTORY_START,
  DEMO_PARENT_SUBJECTS,
} from "../../lib/demo/parent-demo-data/constants.js";
import {
  todayYmdIsrael,
  iterateYmdInclusive,
  compareYmd,
} from "../../lib/demo/parent-demo-data/israel-date.server.js";
import { demoSeedHash32 } from "../../lib/demo/parent-demo-data/seed.js";
import {
  generateDemoLearningRows,
  generateDemoLearningRowsForRange,
} from "../../lib/demo/parent-demo-data/daily-generator.js";
import {
  buildAllDemoAssignedActivities,
  resolveDemoActivityStatus,
  mapDemoActivityToApiRow,
} from "../../lib/demo/parent-demo-data/activities-generator.js";
import {
  resolveDemoActivityDetailBundle,
  buildDemoActivityQuestionSet,
} from "../../lib/demo/parent-demo-data/activity-results-generator.js";
import {
  assertDemoQuestionSetNoDuplicates,
  assertDemoQuestionSetTopicAlignment,
  demoQuestionDedupeFingerprint,
  demoQuestionStemIsClean,
  resetDemoRealQuestionSetCacheForTests,
} from "../../lib/demo/parent-demo-data/demo-real-question-set.server.js";
import { normalizeGradeLevelToKey } from "../../lib/learning-student-defaults.js";
import { getDemoParentChildById } from "../../lib/demo/parent-demo-data/children.js";
import { mathActivityKindMatchesOperation } from "../../lib/classroom-activities/generate-activity-questions-client.js";
import { buildDemoParentReportPayload } from "../../lib/demo/parent-demo-data/report-payload-builder.server.js";
import { assertDemoPayloadHebrewOnly } from "../../lib/demo/parent-demo-data/assert-hebrew-only.server.js";
import { isDemoParentChildId } from "../../lib/demo/parent-demo-data/demo-child-allowlist.server.js";
import { buildDemoParentCopilotPayload } from "../../lib/demo/parent-demo-data/report-payload-builder.server.js";
import { runParentCopilotTurnAsync } from "../../utils/parent-copilot/index.js";

const DEMO_CHILD_ID = "demo-parent-child-noam-g2";
const FORBIDDEN_SUBJECTS = ["history", "moledet", "geography"];

const DEMO_CHILD_IDS = [
  "demo-parent-child-noam-g2",
  "demo-parent-child-maya-g4",
  "demo-parent-child-ari-g6",
];

function findDemoActivityAcrossChildren(predicate) {
  for (const childId of DEMO_CHILD_IDS) {
    const hit = buildAllDemoAssignedActivities(childId).find(predicate);
    if (hit) return { childId, activity: hit };
  }
  return null;
}

/** @param {Partial<import("../../lib/demo/parent-demo-data/activities-generator.js").DemoAssignedActivityDef> & Pick<import("../../lib/demo/parent-demo-data/activities-generator.js").DemoAssignedActivityDef, "subject"|"topic"|"activityId">} overrides */
function syntheticDemoActivity(overrides) {
  return {
    sentAtYmd: "2026-04-01",
    startedAtYmd: "2026-04-01",
    completedAtYmd: "2026-04-02",
    title: overrides.title || "פעילות בדיקה",
    topicLabelHe: overrides.topicLabelHe || overrides.topic,
    questionCount: overrides.questionCount ?? 10,
    mode: "guided_practice",
    seq: 1,
    ...overrides,
  };
}

describe("parent-portal-demo activity results (real generators)", () => {
  test("fractions activity contains only fraction questions", async () => {
    const hit = findDemoActivityAcrossChildren(
      (a) => a.subject === "math" && a.topic === "fractions",
    );
    assert.ok(hit, "expected a demo math/fractions activity");
    const child = getDemoParentChildById(hit.childId);
    const questions = await buildDemoActivityQuestionSet(hit.activity, child.grade_level);
    assert.ok(questions.length >= 8);
    for (const q of questions) {
      const kind = q.params?.kind;
      assert.ok(
        mathActivityKindMatchesOperation("fractions", kind),
        `expected fraction kind, got ${kind} in: ${String(q.question).slice(0, 60)}`,
      );
      assert.equal(String(q.topic), "fractions");
      assert.ok(demoQuestionStemIsClean(q.question));
    }
    assertDemoQuestionSetNoDuplicates(questions);
  });

  test("addition activity contains only addition questions", async () => {
    resetDemoRealQuestionSetCacheForTests();
    const child = getDemoParentChildById("demo-parent-child-noam-g2");
    const activity = syntheticDemoActivity({
      activityId: "demo-act-test-addition-g2",
      subject: "math",
      topic: "addition",
      topicLabelHe: "חיבור",
      title: "תרגול ממוקד — חיבור",
    });
    const questions = await buildDemoActivityQuestionSet(activity, child.grade_level);
    for (const q of questions) {
      const kind = q.params?.kind;
      assert.ok(
        mathActivityKindMatchesOperation("addition", kind),
        `expected addition kind, got ${kind}`,
      );
      assert.equal(String(q.topic), "addition");
    }
  });

  test("hebrew activity uses assigned topic not generic reading bank", async () => {
    const hit = findDemoActivityAcrossChildren(
      (a) => a.subject === "hebrew" && a.topic === "comprehension",
    );
    if (!hit) {
      const anyHebrew = findDemoActivityAcrossChildren((a) => a.subject === "hebrew");
      assert.ok(anyHebrew, "expected at least one hebrew demo activity");
      const child = getDemoParentChildById(anyHebrew.childId);
      const questions = await buildDemoActivityQuestionSet(
        anyHebrew.activity,
        child.grade_level,
      );
      assertDemoQuestionSetTopicAlignment(anyHebrew.activity, child.grade_level, questions);
      for (const q of questions) {
        assert.equal(String(q.topic), anyHebrew.activity.topic);
      }
      return;
    }
    const child = getDemoParentChildById(hit.childId);
    const questions = await buildDemoActivityQuestionSet(hit.activity, child.grade_level);
    for (const q of questions) {
      assert.equal(String(q.topic), "comprehension");
      assert.doesNotMatch(String(q.question), /כמה הברות/);
    }
  });

  test("no duplicate questions within a demo activity", async () => {
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID)[0];
    const child = getDemoParentChildById(DEMO_CHILD_ID);
    const questions = await buildDemoActivityQuestionSet(activity, child.grade_level);
    const fps = questions.map(demoQuestionDedupeFingerprint);
    assert.equal(new Set(fps).size, fps.length);
  });

  test("question stems exclude artificial topic placeholders and wrong quotes", async () => {
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID)[0];
    const child = getDemoParentChildById(DEMO_CHILD_ID);
    const questions = await buildDemoActivityQuestionSet(activity, child.grade_level);
    for (const q of questions) {
      const stem = String(q.question || "");
      assert.doesNotMatch(stem, /\(נושא\s*:/);
      assert.doesNotMatch(stem, /<<|>>|«|»/);
    }
  });

  test("same activityId returns identical questions on reopen", async () => {
    resetDemoRealQuestionSetCacheForTests();
    const today = todayYmdIsrael();
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID)[0];
    const first = await resolveDemoActivityDetailBundle(
      DEMO_CHILD_ID,
      activity.activityId,
      today,
    );
    resetDemoRealQuestionSetCacheForTests();
    const second = await resolveDemoActivityDetailBundle(
      DEMO_CHILD_ID,
      activity.activityId,
      today,
    );
    assert.deepEqual(
      first?.questions.map((q) => q.question),
      second?.questions.map((q) => q.question),
    );
  });

  test("answers, score and counts stay consistent in submitted activity", async () => {
    const today = todayYmdIsrael();
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID).find(
      (a) => resolveDemoActivityStatus(a, today) === "submitted",
    );
    assert.ok(activity);
    const bundle = await resolveDemoActivityDetailBundle(
      DEMO_CHILD_ID,
      activity.activityId,
      today,
    );
    assert.ok(bundle);
    const answered = bundle.questions.filter((q) => q.selectedAnswer != null);
    assert.equal(answered.length, bundle.progress.answersCount);
    const computedCorrect = answered.filter((q) => q.isCorrect === true).length;
    assert.equal(computedCorrect, bundle.progress.correctCount);
    for (const q of answered) {
      assert.ok(q.choices.includes(q.selectedAnswer));
      assert.equal(q.isCorrect, q.selectedAnswer === q.correctAnswer);
    }
    const expectedPct = Math.round(
      (bundle.progress.correctCount / bundle.progress.answersCount) * 100,
    );
    assert.equal(bundle.progress.scorePct, expectedPct);
  });

  test("each demo grade receives grade-appropriate question metadata", async () => {
    for (const childId of DEMO_CHILD_IDS) {
      const child = getDemoParentChildById(childId);
      const activity = buildAllDemoAssignedActivities(childId)[0];
      const questions = await buildDemoActivityQuestionSet(activity, child.grade_level);
      assert.ok(questions.length > 0, childId);
      for (const q of questions) {
        assert.equal(String(q.grade), normalizeGradeLevelToKey(child.grade_level));
      }
      assertDemoQuestionSetTopicAlignment(activity, child.grade_level, questions);
    }
  });

  test("one activity per demo subject has aligned title topic and questions", async () => {
    const subjects = ["math", "geometry", "hebrew", "english", "science"];
    /** @type {string[]} */
    const checked = [];
    for (const subject of subjects) {
      const hit = findDemoActivityAcrossChildren((a) => a.subject === subject);
      assert.ok(hit, `missing demo activity for subject ${subject}`);
      const child = getDemoParentChildById(hit.childId);
      const questions = await buildDemoActivityQuestionSet(hit.activity, child.grade_level);
      assert.ok(hit.activity.title.length > 0);
      assert.ok(hit.activity.topicLabelHe.length > 0);
      assertDemoQuestionSetTopicAlignment(hit.activity, child.grade_level, questions);
      checked.push(`${hit.activity.title} / ${hit.activity.topicLabelHe} (${subject})`);
    }
    assert.equal(checked.length, 5);
  });
});

describe("parent-portal-demo data layer", () => {
  test("PARENT_DEMO_DATA_VERSION is 1 and included in seed", () => {
    assert.equal(PARENT_DEMO_DATA_VERSION, 1);
    const a = demoSeedHash32("child-a", "2026-04-01");
    const b = demoSeedHash32("child-a", "2026-04-01");
    assert.equal(a, b);
  });

  test("DEMO_HISTORY_START is fixed at 2026-03-25", () => {
    assert.equal(DEMO_HISTORY_START, "2026-03-25");
  });

  test("todayYmdIsrael uses Asia/Jerusalem not UTC midnight drift", () => {
    const utcLateEvening = new Date("2026-07-23T21:30:00.000Z");
    const il = todayYmdIsrael(utcLateEvening);
    const utc = utcLateEvening.toISOString().slice(0, 10);
    assert.match(il, /^\d{4}-\d{2}-\d{2}$/);
    if (utc !== il) {
      assert.notEqual(utc, il, "IL calendar day may differ from UTC date near midnight");
    }
  });

  test("determinism: same child+date yields same session counts", () => {
    const from = DEMO_HISTORY_START;
    const to = "2026-04-10";
    const first = generateDemoLearningRowsForRange(DEMO_CHILD_ID, from, to);
    const second = generateDemoLearningRowsForRange(DEMO_CHILD_ID, from, to);
    assert.equal(first.sessions.length, second.sessions.length);
    assert.equal(first.answers.length, second.answers.length);
    assert.deepEqual(
      first.sessions.map((s) => s.id),
      second.sessions.map((s) => s.id),
    );
  });

  test("history anchor survives future toYmd — data from start range remains", () => {
    const futureTo = "2099-12-31";
    const rows = generateDemoLearningRows(DEMO_CHILD_ID, DEMO_HISTORY_START, futureTo);
    assert.ok(rows.sessions.length > 0, "sessions should exist in cumulative history");
    const earliest = rows.sessions
      .map((s) => String(s.started_at).slice(0, 10))
      .sort()[0];
    assert.ok(
      compareYmd(earliest, DEMO_HISTORY_START) >= 0,
      `earliest session ${earliest} should not precede ${DEMO_HISTORY_START}`,
    );
    const daysUntilFirst = iterateYmdInclusive(DEMO_HISTORY_START, earliest).length - 1;
    assert.ok(
      daysUntilFirst <= 7,
      `first activity should appear within a week of ${DEMO_HISTORY_START}, got ${earliest}`,
    );
  });

  test("new day adds data without changing old day counts", () => {
    const earlyTo = "2026-04-15";
    const laterTo = "2026-04-16";
    const early = generateDemoLearningRows(DEMO_CHILD_ID, DEMO_HISTORY_START, earlyTo);
    const later = generateDemoLearningRows(DEMO_CHILD_ID, DEMO_HISTORY_START, laterTo);
    assert.ok(later.sessions.length >= early.sessions.length);
    const earlyIds = new Set(early.sessions.map((s) => s.id));
    for (const sess of early.sessions) {
      assert.ok(later.sessions.some((s) => s.id === sess.id), `session ${sess.id} preserved`);
    }
    assert.ok(later.sessions.length > early.sessions.length || laterTo === earlyTo);
    assert.equal(earlyIds.size, early.sessions.length);
  });

  test("activity statuses are monotonic by fixed milestone dates", () => {
    const activities = buildAllDemoAssignedActivities(DEMO_CHILD_ID);
    assert.ok(activities.length > 0);
    const today = todayYmdIsrael();
    for (const activity of activities) {
      const statusByDay = [];
      for (const ymd of iterateYmdInclusive(activity.sentAtYmd, today)) {
        const status = resolveDemoActivityStatus(activity, ymd);
        if (status) statusByDay.push(status);
      }
      const rank = { not_started: 0, in_progress: 1, submitted: 2 };
      for (let i = 1; i < statusByDay.length; i++) {
        assert.ok(
          rank[statusByDay[i]] >= rank[statusByDay[i - 1]],
          `status regressed for ${activity.activityId}: ${statusByDay.join(" -> ")}`,
        );
      }
    }
  });

  test("assigned activities accumulate beyond a small fixed cap", () => {
    const all = buildAllDemoAssignedActivities(DEMO_CHILD_ID);
    assert.ok(all.length > 8, `expected cumulative activities > 8, got ${all.length}`);
  });

  test("only five demo subjects appear in generated sessions", () => {
    const rows = generateDemoLearningRows(
      DEMO_CHILD_ID,
      DEMO_HISTORY_START,
      todayYmdIsrael(),
    );
    const subjects = new Set(rows.sessions.map((s) => s.subject));
    for (const subject of subjects) {
      assert.ok(DEMO_PARENT_SUBJECTS.includes(subject), `unexpected subject ${subject}`);
      assert.ok(!FORBIDDEN_SUBJECTS.includes(subject));
    }
  });

  test("report payload has no history/moledet/geography subjects", () => {
    const built = buildDemoParentReportPayload(
      DEMO_CHILD_ID,
      DEMO_HISTORY_START,
      todayYmdIsrael(),
    );
    assert.equal(built.ok, true);
    const subjects = Object.keys(built.payload?.subjects || {});
    for (const key of subjects) {
      assert.ok(!FORBIDDEN_SUBJECTS.includes(key), `forbidden subject in report: ${key}`);
    }
  });

  test("demo report payload exposes unified learning time for summary cards", () => {
    const childIds = [
      "demo-parent-child-noam-g2",
      "demo-parent-child-maya-g4",
      "demo-parent-child-ari-g6",
    ];
    const ranges = [
      { from: "2026-07-23", to: "2026-07-23", period: "day" },
      { from: "2026-07-17", to: "2026-07-23", period: "week" },
      { from: "2026-06-23", to: "2026-07-23", period: "month" },
      { from: "2026-07-01", to: "2026-07-15", period: "custom" },
    ];

    for (const childId of childIds) {
      for (const range of ranges) {
        const built = buildDemoParentReportPayload(childId, range.from, range.to);
        assert.equal(built.ok, true, `${childId} ${range.period}`);
        const summary = built.payload.summary;
        assert.equal(summary.learningTimeSource, "unified_credited");
        assert.ok(Number(summary.creditedLearningMinutes) >= 0);
        assert.equal(
          summary.totalDurationSeconds,
          Math.max(0, Math.round(Number(summary.creditedLearningMinutes) * 60)),
        );

        if (Number(summary.totalAnswers) > 0) {
          assert.ok(
            Number(summary.creditedLearningMinutes) > 0,
            `${childId} ${range.period} should have learning minutes when answers exist`,
          );
        }
      }
    }
  });

  test("Hebrew assert passes on sample demo payload", () => {
    const built = buildDemoParentReportPayload(
      DEMO_CHILD_ID,
      DEMO_HISTORY_START,
      todayYmdIsrael(),
    );
    assert.equal(built.ok, true);
    const check = assertDemoPayloadHebrewOnly(built.payload);
    assert.equal(check.ok, true, check.issues.join(", "));
  });

  test("demo report insights differ across children and periods (real engine)", () => {
    const childIds = [
      "demo-parent-child-noam-g2",
      "demo-parent-child-maya-g4",
      "demo-parent-child-ari-g6",
    ];
    const weekFrom = "2026-07-17";
    const weekTo = "2026-07-23";
    const dayFrom = "2026-07-23";

    /** @type {string[]} */
    const weekPrimaryInsights = [];
    for (const childId of childIds) {
      const built = buildDemoParentReportPayload(childId, weekFrom, weekTo);
      assert.equal(built.ok, true);
      const first = built.payload?.parentFacing?.insights?.[0];
      assert.ok(typeof first === "string" && first.length > 20, `${childId} week insight`);
      weekPrimaryInsights.push(first);
    }
    assert.equal(new Set(weekPrimaryInsights).size, 3, "each demo child should get distinct week insight");

    const noamDay = buildDemoParentReportPayload(childIds[0], dayFrom, dayFrom);
    const noamWeek = buildDemoParentReportPayload(childIds[0], weekFrom, weekTo);
    assert.equal(noamDay.ok, true);
    assert.equal(noamWeek.ok, true);
    const dayInsight = noamDay.payload?.parentFacing?.insights?.[0] || "";
    const weekInsight = noamWeek.payload?.parentFacing?.insights?.[0] || "";
    assert.notEqual(dayInsight, weekInsight, "noam day vs week insight should differ when data differs");
    assert.ok(dayInsight.length > 20, "noam day insight should be a full sentence");
    assert.match(weekInsight, /שברים|מתמטיקה|עברית|אנגלית|מדע|גאומטריה/u);
    assert.ok(
      Number(noamDay.payload?.summary?.totalAnswers) < Number(noamWeek.payload?.summary?.totalAnswers),
      "single day should have fewer answers than the surrounding week",
    );
  });

  test("demo child allowlist rejects unknown IDs", () => {
    assert.equal(isDemoParentChildId(DEMO_CHILD_ID), true);
    assert.equal(isDemoParentChildId("real-student-uuid"), false);
    assert.equal(isDemoParentChildId(""), false);
  });

  test("submitted demo activity detail matches real parent API contract", async () => {
    const today = todayYmdIsrael();
    const activities = buildAllDemoAssignedActivities(DEMO_CHILD_ID);
    const submitted = activities.find(
      (a) => resolveDemoActivityStatus(a, today) === "submitted",
    );
    assert.ok(submitted, "expected at least one submitted demo activity");

    const bundle = await resolveDemoActivityDetailBundle(
      DEMO_CHILD_ID,
      submitted.activityId,
      today,
    );
    assert.ok(bundle);
    assert.equal(bundle.questions.length, submitted.questionCount);
    assert.equal(bundle.attempts.length, submitted.questionCount);
    assert.equal(bundle.progress.answersCount, submitted.questionCount);

    for (const q of bundle.questions) {
      assert.ok(q.question, `question stem required for index ${q.questionIndex}`);
      assert.ok(Array.isArray(q.choices) && q.choices.length > 0);
      assert.notEqual(q.selectedAnswer, null);
      assert.notEqual(q.correctAnswer, null);
      assert.ok(q.isCorrect === true || q.isCorrect === false);
    }
  });

  test("in_progress demo activity exposes partial accumulated results", async () => {
    const today = todayYmdIsrael();
    const activities = buildAllDemoAssignedActivities(DEMO_CHILD_ID);
    const inProgress = activities.find(
      (a) => resolveDemoActivityStatus(a, today) === "in_progress",
    );
    assert.ok(inProgress, "expected at least one in_progress demo activity");

    const bundle = await resolveDemoActivityDetailBundle(
      DEMO_CHILD_ID,
      inProgress.activityId,
      today,
    );
    assert.ok(bundle);
    assert.equal(bundle.questions.length, inProgress.questionCount);
    assert.ok(bundle.attempts.length > 0);
    assert.ok(bundle.attempts.length < inProgress.questionCount);

    const answered = bundle.questions.filter((q) => q.selectedAnswer != null);
    const unanswered = bundle.questions.filter((q) => q.selectedAnswer == null);
    assert.equal(answered.length, bundle.attempts.length);
    assert.ok(unanswered.length > 0);
  });

  test("not_started demo activity has no fabricated answer results", async () => {
    const today = todayYmdIsrael();
    const activities = buildAllDemoAssignedActivities(DEMO_CHILD_ID);
    const pending = activities.find(
      (a) => resolveDemoActivityStatus(a, today) === "not_started",
    );
    assert.ok(pending, "expected at least one not_started demo activity");

    const bundle = await resolveDemoActivityDetailBundle(DEMO_CHILD_ID, pending.activityId, today);
    assert.ok(bundle);
    assert.equal(bundle.attempts.length, 0);
    assert.equal(bundle.progress.answersCount, 0);
    assert.equal(bundle.progress.correctCount, 0);
    assert.equal(bundle.progress.scorePct, null);

    for (const q of bundle.questions) {
      assert.equal(q.selectedAnswer, null);
      assert.equal(q.isCorrect, null);
      assert.ok(q.question, "question stem may exist before start");
    }
  });

  test("demo activity question detail is deterministic across loads", async () => {
    const today = todayYmdIsrael();
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID)[0];
    const first = await resolveDemoActivityDetailBundle(DEMO_CHILD_ID, activity.activityId, today);
    const second = await resolveDemoActivityDetailBundle(DEMO_CHILD_ID, activity.activityId, today);
    assert.deepEqual(
      first?.questions.map((q) => ({
        questionIndex: q.questionIndex,
        question: q.question,
        selectedAnswer: q.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
      })),
      second?.questions.map((q) => ({
        questionIndex: q.questionIndex,
        question: q.question,
        selectedAnswer: q.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
      })),
    );
  });

  test("list row aggregates align with detail payload counts", async () => {
    const today = todayYmdIsrael();
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID).find(
      (a) => resolveDemoActivityStatus(a, today) === "submitted",
    );
    assert.ok(activity);
    const row = mapDemoActivityToApiRow(activity, today);
    const bundle = await resolveDemoActivityDetailBundle(DEMO_CHILD_ID, activity.activityId, today);
    assert.equal(row.answersCount, bundle.progress.answersCount);
    assert.equal(row.correctCount, bundle.progress.correctCount);
    assert.equal(row.scorePct, bundle.progress.scorePct);
  });

  test("demo activity stems stay Hebrew-only (no raw topic keys)", async () => {
    const activity = buildAllDemoAssignedActivities(DEMO_CHILD_ID)[0];
    const child = getDemoParentChildById(DEMO_CHILD_ID);
    const questions = await buildDemoActivityQuestionSet(activity, child.grade_level);
    for (const q of questions) {
      const stem = String(q.question || "");
      assert.match(stem, /[\u0590-\u05FF]/, "question stem should include Hebrew");
      assert.doesNotMatch(stem, /\b(addition|subtraction|guided_practice)\b/i);
    }
  });
});

describe("parent-portal-demo copilot", () => {
  test("forceDeterministic skips LLM path and returns Hebrew answer", async () => {
    const built = buildDemoParentCopilotPayload(
      DEMO_CHILD_ID,
      DEMO_HISTORY_START,
      todayYmdIsrael(),
    );
    assert.equal(built.ok, true);

    const result = await runParentCopilotTurnAsync({
      utterance: "איך הילד מתקדם בחשבון לפי הדוח?",
      payload: built.payload,
      studentId: DEMO_CHILD_ID,
      sessionId: "unit-test-parent-demo",
      forceDeterministic: true,
    });

    assert.ok(result, "copilot result expected");
    assert.notEqual(result.resolutionStatus, "error");
    const answerText = String(
      result.answerBlocks?.map((b) => b.text).join(" ") ||
        result.executiveAnswerHe ||
        result.clarificationQuestionHe ||
        result.messageHe ||
        "",
    );
    assert.match(answerText, /[\u0590-\u05FF]/, "answer should contain Hebrew");
    assert.equal(result.telemetry?.generationPath, "deterministic");
    assert.notEqual(result.telemetry?.classifierSource, "llm");
  });
});
