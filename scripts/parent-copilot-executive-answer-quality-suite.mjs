/**
 * Executive answer quality by **behavior class** (not phrase patches).
 * Run: npm run test:parent-copilot-executive-answer-quality
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { syntheticPayload } = await import(pathToFileURL(join(ROOT, "scripts/parent-copilot-test-fixtures.mjs")).href);
const { buildTruthPacketV1 } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/truth-packet-v1.js")).href);
const { selectFollowUp } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/followup-engine.js")).href);
const parentMod = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/index.js")).href);
const runParentCopilotTurn = parentMod.default?.runParentCopilotTurn ?? parentMod.runParentCopilotTurn;

const COUNT_FIRST_RE = /^(בדוח\s+התקופתי\s+נספרו|כ־\s*\d)/u;
const NAMED_CONTENT_RE = /שברים|דקדוק|חשבון|אנגלית|«[^»]+»/u;

function execScopeBase() {
  return {
    scopeType: "executive",
    scopeId: "executive",
    scopeLabel: "הדוח בתקופה הנבחרה",
    interpretationScope: "executive",
    scopeClass: "executive",
  };
}

function slotsForIntent(payload, canonicalIntent) {
  const tp = buildTruthPacketV1(payload, { ...execScopeBase(), canonicalIntent });
  assert.ok(tp);
  const ts = tp.contracts?.narrative?.textSlots || {};
  return { o: String(ts.observation || ""), i: String(ts.interpretation || "") };
}

// 1) Broad report class: resolved; observation must not open as raw count-summary; named anchors when present
const richPayload = syntheticPayload({ eligible: true });
const broadRes = runParentCopilotTurn({
  audience: "parent",
  payload: richPayload,
  utterance: "מה המשמעות הכללית של הדוח בתקופה הזאת?",
  sessionId: "exec-q-1",
  selectedContextRef: null,
});
assert.equal(broadRes.resolutionStatus, "resolved");
const firstBlock = String(broadRes.answerBlocks?.[0]?.textHe || "").trim();
assert.ok(!COUNT_FIRST_RE.test(firstBlock), "primary answer must not open with aggregate count-summary");
const joined = (broadRes.answerBlocks || []).map((b) => b.textHe).join(" ");
assert.ok(NAMED_CONTENT_RE.test(joined), "must surface named report content when payload has anchors");

// 2) Sparse executive: explicitly limited / partial; not numeric-only
const sparsePayload = {
  version: 2,
  subjectProfiles: [
    {
      subject: "math",
      topicRecommendations: [
        {
          topicRowKey: "tSparse",
          displayName: "יחידה קצרה",
          questions: 3,
          accuracy: 62,
          contractsV1: {
            narrative: {
              contractVersion: "v1",
              topicKey: "tSparse",
              subjectId: "math",
              wordingEnvelope: "WE1",
              hedgeLevel: "mandatory",
              allowedTone: "parent_professional_warm",
              forbiddenPhrases: [],
              requiredHedges: ["נכון לעכשיו"],
              allowedSections: ["summary", "finding"],
              recommendationIntensityCap: "RI0",
              textSlots: {
                observation: "נכון לעכשיו יש כאן רק מעט תרגול ביחידה הקצרה.",
                interpretation: "נכון לעכשיו עדיין מוקדם לקבוע כיוון עקבי.",
                action: null,
                uncertainty: "נכון לעכשיו כדאי להמשיך לאסוף עוד ניסיון לפני החלטה.",
              },
            },
            decision: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math", decisionTier: 0, cannotConcludeYet: true },
            readiness: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math", readiness: "insufficient" },
            confidence: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math", confidenceBand: "low" },
            recommendation: {
              contractVersion: "v1",
              topicKey: "tSparse",
              subjectId: "math",
              eligible: false,
              intensity: "RI0",
              family: null,
              anchorEvidenceIds: [],
              rationaleCodes: [],
              forbiddenBecause: [],
            },
            evidence: { contractVersion: "v1", topicKey: "tSparse", subjectId: "math" },
          },
        },
      ],
    },
  ],
  executiveSummary: { majorTrendsHe: [] },
};
const sparseExplain = slotsForIntent(sparsePayload, "explain_report");
assert.match(sparseExplain.o, /מצומצם|מעט|חלקית|מוגבל/u, "sparse report must read as limited material");
assert.ok(!/^\s*כ־\s*\d+\s*שאלות/u.test(sparseExplain.o), "sparse lead must not be digits-only summary");
assert.ok(/\D{6,}/u.test(sparseExplain.i), "interpretation must not be numbers-only");

// 3) "What appears" (unclear inventory) vs broad explanation (explain_report): materially different slots
const inv = slotsForIntent(richPayload, "unclear");
const exp = slotsForIntent(richPayload, "explain_report");
assert.notEqual(inv.o, exp.o, "inventory-style vs explanation observation must differ");
assert.notEqual(inv.i, exp.i, "inventory-style vs explanation interpretation must differ");
assert.match(inv.o, /מופיע|רשימת|מקורות/u, "inventory-class observation should describe what appears");
assert.match(exp.o, /מקצועות|ניסוח מעוגן|מוצג/u, "broad-explanation observation should frame report coverage");

// 4) Intent differentiation subset (executive entity fixed)
const intents = ["explain_report", "what_is_most_important", "strength_vs_weakness_summary", "what_is_going_well"];
const snaps = intents.map((c) => ({ c, ...slotsForIntent(richPayload, c) }));
for (let i = 0; i < snaps.length; i += 1) {
  for (let j = i + 1; j < snaps.length; j += 1) {
    const same = snaps[i].o === snaps[j].o && snaps[i].i === snaps[j].i;
    assert.ok(!same, `slots must not fully collapse: ${snaps[i].c} vs ${snaps[j].c}`);
  }
}

// 5) Follow-up gating when executive truth disallows recommendations
const ineligiblePayload = syntheticPayload({ eligible: false });
const inelTurn = runParentCopilotTurn({
  audience: "parent",
  payload: ineligiblePayload,
  utterance: "מה המשמעות של הדוח?",
  sessionId: "exec-q-inel",
  selectedContextRef: null,
});
assert.equal(inelTurn.resolutionStatus, "resolved");
const tpInel = buildTruthPacketV1(ineligiblePayload, { ...execScopeBase(), canonicalIntent: "explain_report" });
assert.ok(tpInel);
const fu = selectFollowUp({
  audience: "parent",
  intent: "explain_report",
  scopeType: "executive",
  scopeKey: "executive:executive",
  scopeLabelHe: tpInel.scopeLabel || "",
  answerBodyTextHe: "x",
  answerBlockTypes: ["observation", "meaning"],
  clickedFollowupFamilyThisTurn: null,
  omitFollowUpEntirely: false,
  truthPacket: {
    cannotConcludeYet: tpInel.derivedLimits.cannotConcludeYet,
    readiness: tpInel.derivedLimits.readiness,
    confidenceBand: tpInel.derivedLimits.confidenceBand,
    recommendationEligible: tpInel.derivedLimits.recommendationEligible,
    recommendationIntensityCap: tpInel.derivedLimits.recommendationIntensityCap,
    allowedFollowupFamilies: tpInel.allowedFollowupFamilies,
  },
  conversationState: {},
});
if (fu.selected) {
  assert.ok(
    !["action_today", "action_week", "advance_or_hold"].includes(fu.selected.family),
    "must not offer action/advance follow-ups when recommendations are not supported",
  );
}

console.log("parent-copilot-executive-answer-quality-suite: OK");
