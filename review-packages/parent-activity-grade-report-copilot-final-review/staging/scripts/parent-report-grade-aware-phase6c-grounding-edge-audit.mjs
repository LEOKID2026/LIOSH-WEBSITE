/**
 * Phase 6-C — Edge audit: browser-held payload vs Copilot path, truth-packet executive/clipHe sources,
 * telemetry shape, redaction invariants. Writes reports under `reports/` (gitignored).
 *
 *   npx tsx scripts/parent-report-grade-aware-phase6c-grounding-edge-audit.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

/** Phase 6-C extended banned list (includes 6-B keys + audit checklist). */
const BANNED_SUBSTRINGS = [
  "ציר + סימבולי",
  "ציר + מרחק",
  "רגיסטר",
  "פרגמטיקה",
  "כלל מיני",
  "בעיה רפואית",
  "דיווח רפואי",
  "מורה חברתי",
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

function collectNarrativeStrings(tp) {
  const nar = tp?.contracts?.narrative;
  const slots = nar?.textSlots && typeof nar.textSlots === "object" ? nar.textSlots : {};
  const out = [];
  for (const k of ["observation", "interpretation", "action", "uncertainty"]) {
    const v = slots[k];
    if (typeof v === "string" && v.trim()) out.push(v);
  }
  const sf = tp?.surfaceFacts;
  if (sf && typeof sf === "object") {
    for (const k of ["relevantSummaryLines", "displayName", "weakFocusTopicDisplayNameHe", "weakFocusSubjectLabelHe"]) {
      const v = sf[k];
      if (Array.isArray(v)) out.push(...v.map(String));
      else if (typeof v === "string" && v.trim()) out.push(v);
    }
  }
  return out.join("\n");
}

const [detailedMod, truthMod, redactMod, llmMod, copilotMod] = await Promise.all([
  import(u("utils/detailed-parent-report.js")),
  import(u("utils/parent-copilot/truth-packet-v1.js")),
  import(u("utils/parent-copilot/redact-payload-for-copilot-grounding.js")),
  import(u("utils/parent-copilot/llm-orchestrator.js")),
  import(u("utils/parent-copilot/index.js")),
]);

const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { buildTruthPacketV1 } = truthMod;
const { redactPayloadForCopilotGrounding } = redactMod;
const { buildGroundedPrompt } = llmMod;
const { runParentCopilotTurn } = copilotMod;

const raw = buildBaseReportG4Subtraction();
const detailed = buildDetailedParentReportFromBaseReport(JSON.parse(JSON.stringify(raw)), { period: "week" });

const rawUnit = detailed?.diagnosticEngineV2?.units?.[0];
assert.ok(rawUnit?.taxonomy?.patternHe, "fixture: detailed payload retains raw taxonomy for UI audit");

const redacted = redactPayloadForCopilotGrounding(detailed);
const ru = redacted?.diagnosticEngineV2?.units?.[0];
assert.equal(ru?.taxonomy?.id, undefined, "raw taxonomy id must be stripped from Copilot input");
assert.equal(ru?.taxonomy?.patternHe, undefined, "raw patternHe key must be stripped from Copilot input");
assert.equal(ru?.taxonomy?.topicHe, undefined, "raw topicHe must be stripped from Copilot input");
assert.equal(ru?.intervention, undefined);
assert.equal(ru?.probe, undefined);
assert.equal(ru?.diagnosis?.taxonomyId, undefined, "raw diagnosis taxonomyId must be stripped from Copilot input");
assertNoBanned("redacted payload (Copilot engine input shape)", redacted);

const tpTopic = buildTruthPacketV1(redacted, {
  scopeType: "topic",
  scopeId: topicRowKey,
  scopeLabel: "חיסור",
});
assert.ok(tpTopic);
assert.equal(Object.prototype.hasOwnProperty.call(tpTopic, "debug"), false);
assertNoBanned("truth-packet topic narrative bundle", collectNarrativeStrings(tpTopic));
assertNoBanned("truth-packet topic JSON", tpTopic);

const tpExec = buildTruthPacketV1(redacted, {
  scopeType: "executive",
  scopeId: "executive",
  scopeLabel: "מבט על התקופה",
  canonicalIntent: "explain_report",
  parentUtterance: "מה קורה בדוח?",
});
if (tpExec) {
  assert.equal(Object.prototype.hasOwnProperty.call(tpExec, "debug"), false);
  assertNoBanned("truth-packet executive narrative bundle", collectNarrativeStrings(tpExec));
  assertNoBanned("truth-packet executive JSON", tpExec);
  const promptExec = buildGroundedPrompt("ספרי לי על הדוח בקצרה", tpExec, "explain_report");
  assertNoBanned("LLM prompt (executive scope)", promptExec);
  assert.ok(!promptExec.includes('"debug"'), "LLM prompt must not embed debug object");
}

const promptTopic = buildGroundedPrompt("מה לעשות היום?", tpTopic, "what_to_do_today");
assertNoBanned("LLM prompt (topic scope)", promptTopic);
assert.ok(!promptTopic.includes('"debug"'), "LLM prompt must not embed debug object");

const turn = runParentCopilotTurn({
  audience: "parent",
  utterance: "מה כדאי לתרגל?",
  sessionId: "phase6c-audit",
  payload: detailed,
});
assert.ok(turn && typeof turn === "object", "sync Copilot turn returns");
const turnJson = JSON.stringify(turn);
assert.ok(!turnJson.includes("patternHe"), "turn JSON must not leak raw diagnostic key names");
assert.ok(!turnJson.includes("ציר + סימבולי"), "turn JSON must not leak raw intervention Hebrew from fixture");

const audit = {
  schemaVersion: "phase6c-v1",
  generatedAt: new Date().toISOString(),
  browserHeldPayload: {
    finding:
      "Detailed JSON is built in-browser via generateDetailedParentReport / buildDetailedParentReportFromBaseReport and held in React state (e.g. parent-report-detailed payload; short-report copilotDetailedPayload). It retains full diagnosticEngineV2 for topic UI and charts.",
    copilotClientPath:
      "ParentCopilotPanel invokes runParentCopilotTurn(Async) with that payload. runDeterministicCore clones via redactPayloadForCopilotGrounding before truth-packet and composition — raw units are not used for Copilot logic on client or server.",
    serverShortReportPath:
      "When NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT is true, fetch posts body.payload; strict production rebuild ignores client payload for engine input; dev/emergency may use client body — transport may still carry raw JSON.",
    codeChanges: [],
  },
  clipHeExecutive: {
    finding:
      "buildAnchoredMetasForExecutive maps each anchored row to obs/interp/unc from contractsV1.narrative.textSlots only (truth-packet-v1.js). clipHe truncates whitespace; it does not read diagnosticEngineV2 taxonomy/probe/intervention. Synthetic aggregate rows use deterministic Hebrew templates in contract-reader.js when narrative slots are empty.",
    codeChanges: [],
  },
  telemetryLogging: {
    finding:
      "persistTelemetryBestEffort (index.js) passes only bounded metadata and llAttempt summaries to appendTurnTelemetryTrace — no input.payload or full truthPacket. buildTurnTelemetry uses truthPacket only inside measureGroundedness and does not persist the packet on the returned telemetry object. No console.* in utils/parent-copilot/. copilot-turn API does not log request bodies.",
    codeChanges: [],
  },
  newLeakFound: false,
  phase6Closeable: true,
  nextRecommendedPhase: "Phase 7 — broad rendered/PDF/corpus QA",
};

const md = `# Parent report — Phase 6-C grounding edge audit

Generated: ${audit.generatedAt}

## Summary

- **New leak found:** ${audit.newLeakFound ? "yes" : "no"}
- **Code changes:** none (audit-only closure)
- **Phase 6 closeable:** ${audit.phase6Closeable ? "yes" : "no"}
- **Next:** ${audit.nextRecommendedPhase}

## A. Browser-held detailed payload

${audit.browserHeldPayload.finding}

**Copilot client path:** ${audit.browserHeldPayload.copilotClientPath}

**Short-report POST:** ${audit.browserHeldPayload.serverShortReportPath}

## B. truth-packet \`clipHe\` / executive narrative

${audit.clipHeExecutive.finding}

## C. Telemetry / logging

${audit.telemetryLogging.finding}

## D. Verify script

This file is produced by \`scripts/parent-report-grade-aware-phase6c-grounding-edge-audit.mjs\` alongside \`reports/parent-report-grade-aware-phase6c-grounding-edge-audit.json\`.

`;

const reportsDir = join(ROOT, "reports");
try {
  fs.mkdirSync(reportsDir, { recursive: true });
} catch {
  /* ignore */
}
fs.writeFileSync(join(reportsDir, "parent-report-grade-aware-phase6c-grounding-edge-audit.json"), JSON.stringify(audit, null, 2), "utf8");
fs.writeFileSync(join(reportsDir, "parent-report-grade-aware-phase6c-grounding-edge-audit.md"), md, "utf8");

process.stdout.write("OK parent-report-grade-aware-phase6c-grounding-edge-audit\n");
process.stdout.write(`Wrote ${join(reportsDir, "parent-report-grade-aware-phase6c-grounding-edge-audit.{json,md}")}\n`);
