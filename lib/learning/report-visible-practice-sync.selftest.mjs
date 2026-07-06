#!/usr/bin/env node
/**
 * Unit selftest for report-visible-practice-sync (no DB).
 * Run: node lib/learning/report-visible-practice-sync.selftest.mjs
 */
import assert from "node:assert/strict";
import { buildNormalizedSubjectPracticeFromApiPayload } from "./normalized-subject-practice.js";
import {
  buildChartDailyActivityFromApiPayload,
  buildTopicMapsFromDbInput,
  syncReportVisiblePracticeFromServer,
} from "./report-visible-practice-sync.js";
import { buildReportInputFromDbData } from "../learning-supabase/report-data-adapter.js";

const apiPayload = {
  summary: {
    totalAnswers: 60,
    correctAnswers: 53,
    wrongAnswers: 7,
    totalDurationSeconds: 3600,
    diagnosticAnswers: 0,
  },
  subjects: {
    math: { answers: 30, correct: 28, accuracy: 93.33, durationSeconds: 2000, diagnosticAnswers: 0 },
    geometry: { answers: 20, correct: 17, accuracy: 85, durationSeconds: 1600, diagnosticAnswers: 0 },
    english: { answers: 0, correct: 0, accuracy: 0, durationSeconds: 0, diagnosticAnswers: 0 },
    science: { answers: 0, correct: 0, accuracy: 0, durationSeconds: 0, diagnosticAnswers: 0 },
    hebrew: { answers: 0, correct: 0, accuracy: 0, durationSeconds: 0, diagnosticAnswers: 0 },
    history: { answers: 10, correct: 8, accuracy: 80, durationSeconds: 600, diagnosticAnswers: 0 },
    moledet_geography: { answers: 0, correct: 0, accuracy: 0, durationSeconds: 0, diagnosticAnswers: 0 },
  },
  dailyActivity: [
    { date: "2026-03-01", sessions: 1, answers: 30, correct: 28, wrong: 2, durationSeconds: 2000 },
    { date: "2026-03-02", sessions: 1, answers: 20, correct: 17, wrong: 3, durationSeconds: 1600 },
  ],
  dailyActivityBySubject: {
    "2026-03-01": {
      math: { sessions: 1, answers: 30, correct: 28, wrong: 2, durationSeconds: 2000, topicCount: 2 },
    },
    "2026-03-02": {
      geometry: { sessions: 1, answers: 20, correct: 17, wrong: 3, durationSeconds: 1600, topicCount: 1 },
    },
  },
  range: { from: "2026-03-01", to: "2026-03-02" },
  student: { id: "s1", full_name: "Test", grade_level: "3" },
};

const dbInput = buildReportInputFromDbData(apiPayload, { period: "custom", timezone: "UTC" });
dbInput.subjects.math.topics = {
  addition: {
    topicBaseKey: "addition",
    total: 30,
    correct: 28,
    wrong: 2,
    accuracy: 93.33,
    durationSeconds: 2000,
    timeMsSum: 1800000,
    timeMsCount: 30,
    dominantMode: "learning",
    dominantLevel: "medium",
    contentGradeLevel: "g3",
    latestActivityMs: Date.parse("2026-03-01T10:00:00.000Z"),
  },
};
dbInput.subjects.geometry.topics = {
  shapes: {
    topicBaseKey: "shapes",
    total: 20,
    correct: 17,
    wrong: 3,
    accuracy: 85,
    durationSeconds: 1600,
    timeMsSum: 960000,
    timeMsCount: 20,
    dominantMode: "learning",
    dominantLevel: "easy",
    contentGradeLevel: "g1",
    latestActivityMs: Date.parse("2026-03-02T14:30:00.000Z"),
  },
};
dbInput.subjects.geometry.durationSeconds = 1600;
dbInput.subjects.geometry.total = 20;

const normalized = buildNormalizedSubjectPracticeFromApiPayload(apiPayload);
assert.equal(normalized.math.questions, 30);
assert.equal(normalized.geometry.questions, 20);
assert.equal(normalized.history.questions, 10);
assert.equal(normalized.english.questions, 0);

const chartDaily = buildChartDailyActivityFromApiPayload(apiPayload);
assert.equal(chartDaily.length, 2);
assert.equal(chartDaily[0].questions, 30);
assert.equal(chartDaily[0].mathTopics, 2);
assert.equal(chartDaily[1].geometryTopics, 1);

const topicMaps = buildTopicMapsFromDbInput(dbInput);
assert.ok(topicMaps.mathOperations.addition);
assert.equal(topicMaps.mathOperations.addition.questions, 30);
assert.equal(topicMaps.mathOperations.addition.timeMinutes, 30);
assert.equal(topicMaps.mathOperations.addition.mode, "למידה");
assert.equal(topicMaps.mathOperations.addition.level, "רגיל");
assert.ok(topicMaps.mathOperations.addition.lastSessionAt);
assert.ok(topicMaps.mathOperations.addition.grade && topicMaps.mathOperations.addition.grade !== "לא זמין");
assert.equal(topicMaps.geometryTopics.shapes.timeMinutes, 16);
assert.equal(topicMaps.geometryTopics.shapes.mode, "למידה");
assert.ok(topicMaps.geometryTopics.shapes.lastSessionAt);

const orphanDbInput = buildReportInputFromDbData(apiPayload, { period: "custom", timezone: "UTC" });
orphanDbInput.subjects.geometry = {
  total: 99,
  correct: 93,
  wrong: 6,
  accuracy: 94,
  durationSeconds: 8910,
  topics: {
    "shapes_basic::grade:g1": {
      topicBaseKey: "shapes_basic",
      total: 99,
      correct: 93,
      wrong: 6,
      accuracy: 94,
      durationSeconds: 0,
      timeMsSum: 61428,
      timeMsCount: 99,
      dominantMode: "learning",
      dominantLevel: "easy",
      contentGradeLevel: "g1",
      latestActivityMs: Date.parse("2026-03-30T06:21:22.500Z"),
      lastAnswerMs: Date.parse("2026-03-30T06:21:22.500Z"),
    },
  },
};
const orphanMaps = buildTopicMapsFromDbInput(orphanDbInput);
assert.equal(orphanMaps.geometryTopics["shapes_basic::grade:g1"].timeMinutes, 1);

const report = {
  summary: {
    mathQuestions: 0,
    geometryQuestions: 0,
    diagnosticOverviewHe: {
      notPracticedSubjectsSummaryHe: "מקצועות שלא תורגלו בתקופה: חשבון, גאומטריה.",
    },
  },
  mathOperations: {},
  geometryTopics: {},
  englishTopics: {},
  scienceTopics: {},
  hebrewTopics: {},
  historyTopics: {},
  moledetGeographyTopics: {},
  dailyActivity: [],
};

syncReportVisiblePracticeFromServer(report, { apiPayload, dbInput });
assert.equal(report.summary.mathQuestions, 30);
assert.equal(report.summary.geometryQuestions, 20);
assert.equal(report.summary.historyQuestions, 10);
assert.equal(report.summary.totalQuestions, 60);
assert.equal(report._practiceVisibilityAuthority, "server");
assert.ok(!String(report.summary.diagnosticOverviewHe.notPracticedSubjectsSummaryHe || "").includes("חשבון"));
assert.ok(!String(report.summary.diagnosticOverviewHe.notPracticedSubjectsSummaryHe || "").includes("גאומטריה"));
assert.equal(report.dailyActivity.length, 2);
assert.equal(Object.keys(report.mathOperations).length, 1);

console.log("report-visible-practice-sync.selftest: PASS");
