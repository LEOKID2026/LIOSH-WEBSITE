/**
 * Performance-safe parity tests for IL load fixes (TRY).
 * Run: node --test tests/perf/il-load-parity.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateRuleProgressFromCache,
  cardRulesAllMatchFromCache,
  cardRulesAllMatch,
} from "../../lib/rewards/server/card-acquisition-engine.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("il-load: computeStudentLearningDerived parallelization", () => {
  test("derived uses Promise.all for independent fetches", () => {
    const src = readFileSync(
      join(ROOT, "lib/learning-supabase/student-learning-profile.server.js"),
      "utf8"
    );
    assert.match(src, /await Promise\.all\(\[/);
    assert.match(src, /sumStudentLearningCreditedMinutesInIsraelMonth/);
    assert.match(src, /sumParentActivityVisitMsBySubjectInRange/);
    // Still selects answer_payload for subject bucketing (no schema subject column).
    assert.match(src, /select\("is_correct,answer_payload,answered_at"\)/);
  });
});

describe("il-load: parent report derived cache path", () => {
  test("report-data loads derived in parallel with aggregate and passes it through", () => {
    const route = readFileSync(
      join(ROOT, "pages/api/parent/students/[studentId]/report-data.js"),
      "utf8"
    );
    const attach = readFileSync(
      join(ROOT, "lib/parent-server/parent-report-account-attachment.server.js"),
      "utf8"
    );
    assert.match(route, /loadStudentLearningDerivedCached/);
    assert.match(route, /Promise\.all\(\[\s*aggregateParentReportPayload/);
    assert.match(attach, /loadStudentLearningDerivedCached/);
    assert.match(attach, /opts\.derived/);
    assert.doesNotMatch(attach, /computeStudentLearningDerived\(/);
  });
});

describe("il-load: achievement grants progressCache", () => {
  test("evaluateAndGrantAcquisitionCards builds progressCache before card loop", () => {
    const src = readFileSync(
      join(ROOT, "lib/rewards/server/card-acquisition-engine.server.js"),
      "utf8"
    );
    assert.match(src, /buildStudentRuleProgressCache\(supabase, studentId, byCard, ctx\)/);
    assert.match(src, /cardRulesAllMatch\(\s*supabase,\s*studentId,\s*cardRules,\s*ctx,\s*progressCache/);
  });

  test("cache path matches live semantics for total/weekly/subject/streak rules", async () => {
    const ctx = { gradeBand: "g3", monthlyMinutes: 120 };
    const progressCache = {
      totalQuestions: 50,
      weeklyQuestions: 12,
      subjectQuestions: new Map([["math", 20]]),
      subjectAccuracy: new Map([["math||", { total: 20, accuracy: 80 }]]),
      learningStreakDays: 5,
      parentActivities: 2,
      dailyMissionCounts: new Map([["__any__", 1]]),
      queryCount: 4,
    };

    const rules = [
      {
        rule_type: "total_questions",
        is_active: true,
        grant_enabled: true,
        params_json: { min_questions: 40 },
      },
      {
        rule_type: "weekly_questions",
        is_active: true,
        grant_enabled: true,
        params_json: { min_questions: 10 },
      },
      {
        rule_type: "subject_questions",
        is_active: true,
        grant_enabled: true,
        params_json: { subject: "math", min_questions: 15 },
      },
      {
        rule_type: "learning_streak_days",
        is_active: true,
        grant_enabled: true,
        params_json: { min_streak_days: 3 },
      },
      {
        rule_type: "monthly_learning_minutes",
        is_active: true,
        grant_enabled: true,
        params_json: { min_learning_minutes_monthly: 100 },
      },
    ];

    for (const rule of rules) {
      const fromCache = evaluateRuleProgressFromCache(rule, ctx, progressCache);
      assert.equal(fromCache.matches, true, `expected match for ${rule.rule_type}`);
      assert.equal(fromCache.hasProgress, true);
    }

    const allMatch = cardRulesAllMatchFromCache(rules, ctx, progressCache);
    assert.equal(allMatch.matches, true);

    // cardRulesAllMatch with cache must not hit supabase
    const boom = {
      from() {
        throw new Error("supabase should not be called when progressCache is set");
      },
    };
    const viaWrapper = await cardRulesAllMatch(boom, "sid", rules, ctx, progressCache);
    assert.equal(viaWrapper.matches, true);

    const failRule = {
      rule_type: "total_questions",
      is_active: true,
      grant_enabled: true,
      params_json: { min_questions: 999 },
    };
    assert.equal(evaluateRuleProgressFromCache(failRule, ctx, progressCache).matches, false);
  });
});

describe("il-load: student home non-blocking analytics", () => {
  test("home sets profilePhase ok from summary and keeps local analytics loading for progress panel", () => {
    const src = readFileSync(join(ROOT, "pages/student/home.js"), "utf8");
    assert.match(src, /setProfilePhase\("ok"\)/);
    assert.match(src, /void loadHomeAnalytics/);
    assert.match(src, /void loadHomeAchievementGrants/);
    assert.match(src, /analyticsPhase === "loading"/);
    assert.match(src, /טוען התקדמות חודשית/);
    // Full-page loader only for auth, not analytics
    assert.match(src, /authPhase === "checking" \|\| authPhase === "anon"/);
  });
});

describe("il-load: parent activities polling", () => {
  test("poll interval is 30s and gated on open activities", () => {
    const src = readFileSync(
      join(ROOT, "components/parent/ParentSentActivitiesPanel.jsx"),
      "utf8"
    );
    assert.match(src, /const POLL_MS = 30_000/);
    assert.match(src, /activityMayStillChange/);
    assert.match(src, /document\.visibilityState === "hidden"/);
    assert.doesNotMatch(src, /const POLL_MS = 8000/);
  });
});
