/**
 * API → strip → adapter → seed → enrichTopicMapsWithTrendV1 pipeline for trendV1.
 * Run: node --test tests/learning/parent-report-trend-v1-api-pipeline.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { stripInternalReportPayloadFields } from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../../lib/learning-supabase/seed-db-report-local-storage.js";
import {
  enrichTopicMapsWithTrendV1,
  loadTopicAnswerEventsFromReportStorage,
  PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY,
  shouldShowTrendV1Line,
} from "../../utils/parent-report-topic-trend-v1.js";
import { syncReportVisiblePracticeFromServer } from "../../lib/learning/report-visible-practice-sync.js";
import { EVIDENCE_SOURCE } from "../../lib/learning-supabase/evidence-source.js";

const DAY = 24 * 60 * 60 * 1000;
const baseMs = Date.UTC(2026, 2, 1, 12, 0, 0);

/** @param {number} i @param {boolean} correct @param {number} dayOffset */
function ev(i, correct, dayOffset = 0) {
  return {
    answeredAtMs: baseMs + dayOffset * DAY + i * 60_000,
    isCorrect: correct,
    evidenceSource: EVIDENCE_SOURCE.SELF_PRACTICE,
  };
}

function buildImprovingEvents() {
  return [
    ev(0, false, 0),
    ev(1, false, 0),
    ev(2, false, 0),
    ev(3, false, 0),
    ev(4, true, 1),
    ev(5, true, 1),
    ev(6, true, 1),
    ev(7, true, 2),
    ev(8, true, 2),
    ev(9, true, 2),
    ev(10, true, 3),
    ev(11, true, 3),
  ];
}

function makeMapStorage() {
  const data = new Map();
  const ls = {
    get(key) {
      return data.has(key) ? data.get(key) : null;
    },
    set(key, value) {
      data.set(key, value);
    },
    has(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
  return ls;
}

describe("parent-report trendV1 API pipeline", () => {
  test("strip preserves _internalTopicAnswerEvents → seed → enrich yields improving", () => {
    const topicKey = "fractions::grade:g5";
    const events = buildImprovingEvents();
    const aggregatePayload = {
      summary: { totalAnswers: 12, diagnosticAccuracy: 50 },
      subjects: {
        math: {
          answers: 12,
          correct: 8,
          wrong: 4,
          diagnosticAccuracy: 50,
          topics: {
            [topicKey]: {
              answers: 12,
              correct: 8,
              wrong: 4,
              diagnosticAccuracy: 50,
            },
          },
        },
      },
      _internalTopicAnswerEvents: {
        math: {
          [topicKey]: events,
        },
      },
    };

    const stripped = stripInternalReportPayloadFields(aggregatePayload);
    assert.ok(
      stripped._internalTopicAnswerEvents,
      "_internalTopicAnswerEvents must survive strip for parent trendV1 seed",
    );
    assert.deepEqual(stripped._internalTopicAnswerEvents.math[topicKey], events);

    const dbInput = buildReportInputFromDbData(stripped, { period: "custom", timezone: "Asia/Jerusalem" });
    assert.ok(dbInput._internalTopicAnswerEvents?.math?.[topicKey]?.length === 12);

    const store = makeMapStorage();
    seedLocalStorageFromDbReportInput(store, dbInput);

    const seededRaw = store.getItem(PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY);
    assert.ok(seededRaw, "seed must write topic answer events to localStorage");
    const seeded = JSON.parse(seededRaw);
    assert.equal(seeded.math[topicKey].length, 12);

    const prevLs = globalThis.localStorage;
    globalThis.localStorage = store;
    try {
      const loaded = loadTopicAnswerEventsFromReportStorage();
      assert.ok(loaded?.math?.[topicKey]?.length === 12);

      const maps = {
        math: {
          [topicKey]: {
            bucketKey: "fractions",
            topicRowKey: topicKey,
            questions: 12,
            correct: 8,
            wrong: 4,
          },
        },
      };
      enrichTopicMapsWithTrendV1(maps, loaded);

      const trendV1 = maps.math[topicKey].trendV1;
      assert.ok(trendV1, "trendV1 must be set on topic row");
      assert.equal(trendV1.direction, "improving");
      assert.equal(shouldShowTrendV1Line(trendV1), true);
      assert.ok(String(trendV1.parentLineHe || "").includes("מגמה בתקופה"));
    } finally {
      globalThis.localStorage = prevLs;
    }
  });

  test("enrich sets insufficient_data trendV1 when store is empty", () => {
    const maps = {
      math: {
        addition: { bucketKey: "addition", questions: 5, correct: 3, wrong: 2 },
      },
    };
    enrichTopicMapsWithTrendV1(maps, null);
    assert.equal(maps.math.addition.trendV1?.direction, "insufficient_data");
    assert.equal(shouldShowTrendV1Line(maps.math.addition.trendV1), false);
  });

  test("moledet-geography subject alias resolves events from moledet_geography store key", () => {
    const topicKey = "maps";
    const events = buildImprovingEvents();
    const maps = {
      "moledet-geography": {
        [topicKey]: { bucketKey: topicKey, questions: 12, correct: 8, wrong: 4 },
      },
    };
    enrichTopicMapsWithTrendV1(maps, {
      moledet_geography: {
        [topicKey]: events,
      },
    });
    assert.equal(maps["moledet-geography"][topicKey].trendV1?.direction, "improving");
  });

  test("syncReportVisiblePracticeFromServer preserves trendV1 on topic maps", () => {
    const topicKey = "fractions::grade:g5";
    const events = buildImprovingEvents();
    const dbInput = {
      student: { name: "Test" },
      subjects: {
        math: {
          topics: {
            [topicKey]: { total: 12, correct: 8, wrong: 4, topicBaseKey: "fractions", contentGradeLevel: "g5" },
          },
        },
      },
      _internalTopicAnswerEvents: { math: { [topicKey]: events } },
    };
    const report = {
      mathOperations: {
        [topicKey]: { bucketKey: "fractions", questions: 12, correct: 8, wrong: 4, trendV1: { direction: "improving" } },
      },
    };
    syncReportVisiblePracticeFromServer(report, { apiPayload: { subjects: { math: { answers: 12 } } }, dbInput });
    assert.equal(report.mathOperations[topicKey].trendV1?.direction, "improving");
    assert.equal(shouldShowTrendV1Line(report.mathOperations[topicKey].trendV1), true);
  });
});
