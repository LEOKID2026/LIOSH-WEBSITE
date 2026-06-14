/**
 * Phase 6-B — Copilot / truth-packet / LLM grounding must not carry raw diagnostic taxonomy,
 * probe/intervention strings, or truthPacket.debug. Narrow substring guard + M-09 fixture.
 *
 *   npx tsx scripts/parent-report-grade-aware-phase6b-copilot-grounding-verify.mjs
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const EXPECTED_M09_ACTION =
  "כדאי לתרגל חיסור במאונך עם פריטה, תוך הקפדה על ערך הספרות בכל עמודה. אחרי כל תרגיל בקשו מהילד לבדוק את התשובה בעזרת חיבור הפוך.";

/** Substrings that must not appear in Copilot-facing blobs (Hebrew phrases + internal JSON keys). */
const BANNED_SUBSTRINGS = [
  "ציר + סימבולי",
  "ציר + מרחק",
  "רגיסטר",
  "פרגמטיקה",
  "כלל מיני",
  "בעיה רפואית",
  "דיווח רפואי",
  "מורה חברתי",
  "ערכים אישיים",
  "טבלת תכונה/תהליך",
  "דיאגרמת מצבים",
  "דעות קדומות",
  "בעיה חברתית",
  "סרגל + יחידות",
  "ציר פיזי + כרטיסיות",
  "סימבולים בקבוצות קטנות",
  "patternHe",
  "probeHe",
  "interventionHe",
  "doNotConcludeHe",
  "escalationHe",
  "competitorsHe",
  "rootsHe",
];

/** English pedagogy — avoid substring false positives on internal tokens like `cross_session_inference`. */
const BANNED_ENGLISH_RES = [
  /\binference\b/i,
  /\bcollocation\b/i,
  /\bpreposition\b/i,
  /\bfalse\s+friend\b/i,
  /\bhe\/she\/it\b/i,
  /\bpast\/present\b/i,
];

const topicRowKey = "subtraction\u0001learning\u0001g4\u0001easy";

function buildBaseReportG4Subtraction() {
  return {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicRowKey]: {
        bucketKey: "subtraction",
        displayName: "חיסור",
        questions: 12,
        correct: 8,
        wrong: 4,
        accuracy: 67,
        gradeKey: "g4",
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicRowKey}`,
          subjectId: "math",
          topicRowKey,
          bucketKey: "subtraction",
          displayName: "חיסור",
          diagnosis: { allowed: true, taxonomyId: "M-09", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "ציר + סימבולי",
            shortPracticeHe: "ציר + מרחק",
            taxonomyId: "M-09",
          },
          taxonomy: {
            id: "M-09",
            patternHe: "דפוס",
            topicHe: "חיסור",
            subskillHe: "חיסור",
          },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
          strengthProfile: { tags: [], dominantBehavior: null },
          outputGating: {
            interventionAllowed: true,
            diagnosisAllowed: true,
            probeOnly: false,
            cannotConcludeYet: false,
            additiveCautionAllowed: false,
            positiveAuthorityLevel: "none",
          },
          probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
          explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_test",
            stateHash: "h1",
          },
        },
      ],
    },
  };
}

function assertNoBanned(label, blob) {
  const s = typeof blob === "string" ? blob : JSON.stringify(blob);
  for (const f of BANNED_SUBSTRINGS) {
    if (s.includes(f)) throw new Error(`${label} contains banned fragment: ${f}`);
  }
  for (const re of BANNED_ENGLISH_RES) {
    if (re.test(s)) throw new Error(`${label} contains banned English pattern: ${re}`);
  }
}

const [detailedMod, truthMod, redactMod, llmMod] = await Promise.all([
  import(u("utils/detailed-parent-report.js")),
  import(u("utils/parent-copilot/truth-packet-v1.js")),
  import(u("utils/parent-copilot/redact-payload-for-copilot-grounding.js")),
  import(u("utils/parent-copilot/llm-orchestrator.js")),
]);

const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { buildTruthPacketV1 } = truthMod;
const { redactPayloadForCopilotGrounding } = redactMod;
const { buildGroundedPrompt } = llmMod;

const raw = buildBaseReportG4Subtraction();
const detailed = buildDetailedParentReportFromBaseReport(JSON.parse(JSON.stringify(raw)), { period: "week" });

const mathProfile = detailed?.subjectProfiles?.find((p) => p.subject === "math");
const subTr = (mathProfile?.topicRecommendations || []).find(
  (t) => String(t.topicRowKey || t.topicKey) === topicRowKey,
);
assert.ok(subTr, "topic recommendation row for M-09");
assert.equal(subTr.doNowHe, EXPECTED_M09_ACTION, "M-09 g4 doNowHe must be grade-aware template");
assert.equal(subTr.whyThisRecommendationHe, null, "whyThisRecommendationHe must omit raw diagnostic explanation");

const redacted = redactPayloadForCopilotGrounding(detailed);
assertNoBanned("redacted Copilot payload JSON", redacted);

const u0 = redacted?.diagnosticEngineV2?.units?.[0];
assert.ok(u0 && typeof u0 === "object", "redacted unit exists");
assert.equal(u0.intervention, undefined, "raw intervention must be stripped from Copilot grounding payload");
assert.equal(u0.taxonomy?.id, undefined, "raw taxonomy id must be stripped");
assert.equal(u0.taxonomy?.patternHe, undefined, "raw patternHe key must be stripped");
assert.equal(u0.taxonomy?.topicHe, undefined, "raw topicHe must be stripped");
assert.equal(u0.probe, undefined, "raw probe must be stripped");
assert.equal(u0.diagnosis?.taxonomyId, undefined, "raw diagnosis taxonomyId must be stripped");

const tp = buildTruthPacketV1(redacted, {
  scopeType: "topic",
  scopeId: topicRowKey,
  scopeLabel: "חיסור",
});
assert.ok(tp, "truth packet");
assert.equal(Object.prototype.hasOwnProperty.call(tp, "debug"), false, "truthPacket must not expose debug");
assertNoBanned("truthPacket JSON", tp);

const nar = tp?.contracts?.narrative?.textSlots || {};
assert.ok(typeof nar.observation === "string" || nar.observation === null, "textSlots.observation present");
assert.ok(typeof nar.interpretation === "string" || nar.interpretation === null, "textSlots.interpretation present");

const prompt = buildGroundedPrompt("מה כדאי לעשות היום בבית?", tp, "what_to_do_today");
assert.ok(prompt.includes("FACTS_JSON:"), "LLM prompt must include FACTS_JSON");
assertNoBanned("LLM grounded prompt", prompt);
const factsJson = prompt.split("FACTS_JSON:")[1] || "";
assert.ok(
  factsJson.includes("חיסור") || factsJson.includes("שאלות"),
  "LLM FACTS_JSON should include topic- or volume-grounded Hebrew from truth packet slots",
);

process.stdout.write("OK parent-report-grade-aware-phase6b-copilot-grounding-verify\n");
