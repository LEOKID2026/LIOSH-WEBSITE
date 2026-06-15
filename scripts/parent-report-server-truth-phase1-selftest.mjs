/**
 * Phase 1 — Server truth for official parent reports.
 * Run: npm run test:parent-report-server-truth-phase1
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

// --- 1. Product pages must not build from browser localStorage ---
{
  const shortSrc = readSrc("pages/learning/parent-report.js");
  const detailedSrc = readSrc("pages/learning/parent-report-detailed.js");

  assert.ok(!shortSrc.includes("buildLocalParentReports"), "parent-report.js must not define buildLocalParentReports");
  assert.ok(!shortSrc.includes('localStorage.getItem("mleo_player_name")'), "parent-report.js must not read mleo_player_name");
  assert.ok(!shortSrc.includes("generateParentReportV2"), "parent-report.js must not call generateParentReportV2");
  assert.ok(shortSrc.includes("parent-report-portal-gate"), "parent-report.js must render portal gate");
  assert.ok(shortSrc.includes("runParentReportGenerationFromApiBody"), "parent-report.js must use API bridge");

  assert.ok(!detailedSrc.includes('localStorage.getItem("mleo_player_name")'), "parent-report-detailed.js must not read mleo_player_name");
  assert.ok(!detailedSrc.includes("generateParentReportV2"), "parent-report-detailed.js must not call generateParentReportV2");
  assert.ok(detailedSrc.includes("parent-report-detailed-portal-gate"), "parent-report-detailed.js must render portal gate");
  assert.ok(detailedSrc.includes("runParentReportGenerationFromApiBody"), "parent-report-detailed.js must use API bridge");
}

// --- 2. Remote source + API URL ---
{
  const { parseParentReportRemoteSource, parentReportRemoteDataUrl } = await load(
    "lib/teacher-portal/parent-report-remote-source.js"
  );
  const parentRemote = parseParentReportRemoteSource({
    isReady: true,
    query: { source: "parent", studentId: "abc-123" },
  });
  assert.equal(parentRemote.isRemote, true);
  assert.equal(parentRemote.isParent, true);
  assert.equal(parentRemote.studentId, "abc-123");

  const noRemote = parseParentReportRemoteSource({
    isReady: true,
    query: { source: "parent" },
  });
  assert.equal(noRemote.isRemote, false, "source=parent without studentId is not remote");

  const bare = parseParentReportRemoteSource({ isReady: true, query: {} });
  assert.equal(bare.isRemote, false, "bare /learning/parent-report is not remote");

  const qs = new URLSearchParams({ from: "2026-05-01", to: "2026-05-07" });
  const url = parentReportRemoteDataUrl("parent", "abc-123", qs);
  assert.ok(url.includes("/api/parent/students/abc-123/report-data"), "parent API path");
  assert.ok(url.includes("from=2026-05-01"), "range query preserved");
}

// --- 3. Dev/test local path isolated ---
{
  const { buildLocalParentReportsForDevTest } = await load("lib/learning-supabase/parent-report-local-dev.js");
  assert.equal(typeof buildLocalParentReportsForDevTest, "function", "dev/test builder exported separately");
  assert.ok(!readSrc("pages/learning/parent-report.js").includes("parent-report-local-dev"), "product page must not import dev builder");
}

// --- 4. Adapter + seed provenance: no estimated duration in seed ---
{
  const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
  const { seedLocalStorageFromDbReportInput } = await load("lib/learning-supabase/seed-db-report-local-storage.js");

  const body = {
    student: { id: "s1", full_name: "P1", grade_level: "g3", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-07" },
    summary: { totalAnswers: 10, correctAnswers: 8, wrongAnswers: 2, totalDurationSeconds: 0 },
    subjects: {
      math: {
        answers: 10,
        correct: 8,
        wrong: 2,
        durationSeconds: 0,
        topics: {
          addition: { answers: 10, correct: 8, wrong: 2, durationSeconds: 0 },
        },
      },
      geometry: { answers: 0, correct: 0, wrong: 0, topics: {} },
      english: { answers: 0, correct: 0, wrong: 0, topics: {} },
      hebrew: { answers: 0, correct: 0, wrong: 0, topics: {} },
      science: { answers: 0, correct: 0, wrong: 0, topics: {} },
      moledet_geography: { answers: 0, correct: 0, wrong: 0, topics: {} },
    },
  };

  const dbInput = buildReportInputFromDbData(body, { period: "week", timezone: "UTC" });
  const mathTopics = dbInput.subjects.math.topics;
  const topicKey = Object.keys(mathTopics)[0];
  const topic = mathTopics[topicKey];
  assert.equal(topic.durationSeconds, 0);
  assert.equal(topic._bridgeFieldProvenance.duration.source, "unavailable");
  assert.equal(topic._bridgeFieldProvenance.mode.source, "unavailable");
  assert.equal(topic._bridgeFieldProvenance.level.source, "unavailable");

  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  const tracking = JSON.parse(store.get("mleo_time_tracking"));
  const sessions = tracking.operations[topicKey.split("::grade:")[0]]?.sessions || Object.values(tracking.operations)[0]?.sessions;
  assert.ok(Array.isArray(sessions) && sessions.length === 1);
  assert.equal(sessions[0].duration, undefined, "seed must not invent duration");
  assert.equal(sessions[0].mode, undefined, "seed must not default mode to learning");
  assert.equal(sessions[0].level, undefined, "seed must not default level to medium");
  assert.equal(sessions[0]._bridgeFieldProvenance.duration.source, "unavailable");
}

// --- 5. Bridge post-process: server summary time + zero client estimate ---
{
  const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
  const { applyBridgeProvenanceToGeneratedReport } = await load(
    "lib/learning-supabase/bridge-report-provenance.js"
  );

  const body = {
    student: { id: "s1", full_name: "P1", grade_level: "g3", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-07" },
    summary: { totalAnswers: 10, correctAnswers: 8, totalDurationSeconds: 600 },
    subjects: {
      math: {
        answers: 10,
        correct: 8,
        durationSeconds: 0,
        topics: { addition: { answers: 10, correct: 8, durationSeconds: 0 } },
      },
      geometry: { answers: 0, topics: {} },
      english: { answers: 0, topics: {} },
      hebrew: { answers: 0, topics: {} },
      science: { answers: 0, topics: {} },
      moledet_geography: { answers: 0, topics: {} },
    },
  };
  const dbInput = buildReportInputFromDbData(body);
  const fakeReport = {
    summary: { totalTimeMinutes: 99, totalTimeHours: "1.65", totalQuestions: 0, totalCorrect: 0 },
    math: [{ timeMinutes: 99, modeKey: "learning", levelKey: "medium", gradeKey: "g3" }],
    allBySubject: { math: { k1: { timeMinutes: 99, modeKey: "learning", levelKey: "medium" } } },
  };
  applyBridgeProvenanceToGeneratedReport(fakeReport, dbInput, body);
  assert.equal(fakeReport._reportDataAuthority, "server");
  assert.equal(fakeReport.summary.totalQuestions, 10, "uses server totalAnswers not client bridge count");
  assert.equal(fakeReport.summary.totalCorrect, 8, "uses server correctAnswers not client bridge count");
  assert.equal(fakeReport.summary.overallAccuracy, 80, "uses server summary accuracy");
  assert.equal(fakeReport.summary.mathQuestions, 10, "uses server subject answer count");
  assert.equal(fakeReport.summary.totalTimeMinutes, 10, "uses server totalDurationSeconds not client estimate");
  assert.equal(fakeReport.math[0].timeMinutes, 0, "row time zeroed when duration unavailable in bridge");
  assert.equal(fakeReport.math[0].modeKey, null);
  assert.equal(fakeReport.math[0].modeStr, "לא זמין");
  assert.equal(fakeReport.math[0].levelKey, null);
}

// --- 5b. Bridge must not zero subject cards when diagnosticAnswers is explicitly 0 ---
{
  const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
  const { applyBridgeProvenanceToGeneratedReport } = await load(
    "lib/learning-supabase/bridge-report-provenance.js"
  );

  const body = {
    student: { id: "s1", full_name: "P1", grade_level: "g3", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-07" },
    summary: { totalAnswers: 10, correctAnswers: 8, diagnosticAnswers: 0, totalDurationSeconds: 600 },
    subjects: {
      math: {
        diagnosticAnswers: 0,
        answers: 10,
        correct: 8,
        durationSeconds: 0,
        topics: { addition: { answers: 10, correct: 8, durationSeconds: 0 } },
      },
      geometry: { diagnosticAnswers: 0, answers: 0, topics: {} },
      english: { diagnosticAnswers: 0, answers: 0, topics: {} },
      hebrew: { diagnosticAnswers: 0, answers: 0, topics: {} },
      science: { diagnosticAnswers: 0, answers: 0, topics: {} },
      moledet_geography: { diagnosticAnswers: 0, answers: 0, topics: {} },
    },
  };
  const dbInput = buildReportInputFromDbData(body);
  const fakeReport = {
    summary: {
      totalTimeMinutes: 99,
      totalQuestions: 99,
      mathQuestions: 99,
      geometryQuestions: 0,
    },
  };
  applyBridgeProvenanceToGeneratedReport(fakeReport, dbInput, body);
  assert.equal(fakeReport.summary.mathQuestions, 10, "learning practice count when diagnosticAnswers=0");
  assert.equal(fakeReport.summary.mathCorrect, 8);
  assert.equal(fakeReport.summary.geometryQuestions, 0, "zero practice stays zero");
}

// --- 6. API failure must not reference mleo fallback in product pages ---
{
  const shortSrc = readSrc("pages/learning/parent-report.js");
  assert.ok(!shortSrc.includes("mleo_"), "parent-report.js product page must not reference mleo_* keys");
  const detailedSrc = readSrc("pages/learning/parent-report-detailed.js");
  assert.ok(!detailedSrc.includes("mleo_"), "parent-report-detailed.js product page must not reference mleo_* keys");
}

// --- 7. parent-report-from-api-payload wires provenance ---
{
  const src = readSrc("lib/learning-supabase/parent-report-from-api-payload.js");
  assert.ok(src.includes("applyBridgeProvenanceToGeneratedReport"), "API bridge applies provenance pass");
  assert.ok(src.includes("applyServerParentFacingAuthorityToClientReport"), "server parentFacing authority kept");
}

process.stdout.write("OK parent-report-server-truth-phase1-selftest\n");
