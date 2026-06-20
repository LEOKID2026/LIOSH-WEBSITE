/**
 * Stage A + scope + withhold + parent detailed forbidden surfaces.
 * Run: npm run test:parent-copilot-product-behavior
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { STAGE_A_PARAPHRASE_CLUSTERS } = await import(
  pathToFileURL(join(ROOT, "tests/fixtures/parent-copilot-stage-a-paraphrase-bank.mjs")).href
);
const { interpretFreeformStageA, CANONICAL_PARENT_INTENTS } = await import(
  pathToFileURL(join(ROOT, "utils/parent-copilot/stage-a-freeform-interpretation.js")).href
);
const { resolveScope } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/scope-resolver.js")).href);
const { buildTruthPacketV1 } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/truth-packet-v1.js")).href);
const { planConversation } = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/conversation-planner.js")).href);
const parentCopilot = await import(pathToFileURL(join(ROOT, "utils/parent-copilot/index.js")).href);
const runTurn = parentCopilot.default?.runParentCopilotTurn ?? parentCopilot.runParentCopilotTurn;

const PARAPHRASE_BANK = STAGE_A_PARAPHRASE_CLUSTERS;

for (const [intent, phrases] of Object.entries(PARAPHRASE_BANK)) {
  assert.ok(phrases.length >= 8, `${intent}: need >=8 paraphrases`);
  for (const p of phrases) {
    const r = interpretFreeformStageA(p, null);
    assert.equal(
      r.canonicalIntent,
      intent,
      `paraphrase cluster: "${p.slice(0, 40)}..." -> expected ${intent}, got ${r.canonicalIntent}`
    );
  }
}

const EQUIVALENCE = [
  ["מה רואים בנתונים?", "מה כתוב בדוח?", "מה המצב בדוח?"],
  ["מה לעשות היום בבית?", "מה עושים היום?", "צעד קטן להיום"],
  ["מה לעשות השבוע?", "מה לעשות בשבוע הזה?", "מה הכי חשוב עכשיו בבית?", "מה היית מציע לנו לימים הקרובים?"],
  ["למה לא להתקדם?", "למה אתה לא ממליץ להעלות רמה?", "למה לעצור כאן?", "מה הסיבה שלא ממשיכים?"],
  ["מה טוב ומה חלש?", "איפה הוא מצליח ואיפה פחות?", "מה עובד טוב ומה דורש חיזוק?", "תסכם לי חוזקות מול קושי"],
  ["איך להגיד את זה לילד?", "איך להסביר לו את זה?", "באיזה ניסוח לדבר איתו?", "מה לומר לו בלי להלחיץ?"],
  ["מה לשאול את המורה?", "יש משהו שכדאי לשאול את המורה?", "איך לנסח שאלה למורה?", "מה חשוב לברר מול המורה?"],
  ["האם צריך התערבות?", "זה דורש עזרה מעבר לבית?", "יש פה משהו מדאיג?", "צריך לפנות למורה או לאיש מקצוע?"],
  ["מה זה אומר?", "תסביר לי את המושג הזה", "מה המשמעות של זה?", "לא הבנתי את הניסוח הזה"],
];
for (const cluster of EQUIVALENCE) {
  const parsed = cluster.map((u) => interpretFreeformStageA(u, null));
  const intents = new Set(parsed.map((p) => p.canonicalIntent));
  const scopeClasses = new Set(parsed.map((p) => p.scopeClass));
  const basePlan = planConversation(parsed[0].canonicalIntent, buildTruthPacketV1(payloadIneligibleRec(), { scopeType: "topic", scopeId: "t1", scopeLabel: "שברים", scopeClass: parsed[0].scopeClass }), {
    continuityRepeat: false,
    turnOrdinal: 0,
    scopeType: "topic",
  }).blockPlan.join("|");
  const sameStructure = parsed.every((p) => {
    const blockPlan = planConversation(p.canonicalIntent, buildTruthPacketV1(payloadIneligibleRec(), { scopeType: "topic", scopeId: "t1", scopeLabel: "שברים", scopeClass: p.scopeClass }), {
      continuityRepeat: false,
      turnOrdinal: 0,
      scopeType: "topic",
    }).blockPlan.join("|");
    return blockPlan === basePlan;
  });
  assert.equal(intents.size, 1, `equivalence cluster should map to one intent: ${[...intents].join(",")}`);
  assert.equal(scopeClasses.size, 1, `equivalence cluster should map to one scopeClass: ${[...scopeClasses].join(",")}`);
  assert.ok(sameStructure, "equivalence cluster should map to materially equivalent answer structure");
}

/** Withhold next_step: narrative allows action but recommendation ineligible */
function payloadIneligibleRec() {
  const narrative = {
    contractVersion: "v1",
    topicKey: "t1",
    subjectId: "math",
    wordingEnvelope: "WE2",
    hedgeLevel: "light",
    allowedTone: "parent_professional_warm",
    forbiddenPhrases: [],
    requiredHedges: ["נכון לעכשיו"],
    allowedSections: ["summary", "finding", "recommendation", "limitations"],
    recommendationIntensityCap: "RI0",
    textSlots: {
      observation: "בנושא נצפו 6 שאלות.",
      interpretation: "נכון לעכשיו התמונה עדיין רכה.",
      action: "להמשיך בתרגול קצר ומדוד.",
      uncertainty: "נכון לעכשיו כדאי לאסוף עוד תרגול לפני כיוון ברור.",
    },
  };
  const tr = {
    topicRowKey: "t1",
    displayName: "שברים",
    questions: 6,
    accuracy: 70,
    contractsV1: {
      narrative,
      decision: { contractVersion: "v1", topicKey: "t1", subjectId: "math", decisionTier: 1, cannotConcludeYet: true },
      readiness: { contractVersion: "v1", topicKey: "t1", subjectId: "math", readiness: "insufficient" },
      confidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math", confidenceBand: "low" },
      recommendation: {
        contractVersion: "v1",
        topicKey: "t1",
        subjectId: "math",
        eligible: false,
        intensity: "RI0",
        family: "none",
        anchorEvidenceIds: [],
        rationaleCodes: [],
        forbiddenBecause: [],
      },
      evidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math" },
    },
  };
  return { version: 2, subjectProfiles: [{ subject: "math", topicRecommendations: [tr] }] };
}

const pInel = payloadIneligibleRec();
const scope = { scopeType: "topic", scopeId: "t1", scopeLabel: "שברים", scopeClass: "recommendation" };
const tp = buildTruthPacketV1(pInel, scope);
assert.ok(tp && tp.derivedLimits.recommendationEligible === false);
const plan = planConversation("what_to_do_today", tp, { continuityRepeat: false, turnOrdinal: 0, scopeType: "topic" });
assert.ok(
  !plan.blockPlan.includes("next_step") || tp.derivedLimits.recommendationEligible,
  "withhold: planner must not schedule next_step when recommendation ineligible"
);

const detailedSrc = readFileSync(join(ROOT, "pages/learning/parent-report-detailed.js"), "utf8");
const forbiddenSubstrings = [
  "AiHybridInternalReviewerPanel",
  "reviewHybrid",
  "ai-hybrid-internal-reviewer",
  "mleo_internal_hybrid_reviewer",
  "ביקורת פנימית",
];
for (const s of forbiddenSubstrings) {
  assert.ok(
    !detailedSrc.includes(s),
    `parent-report-detailed.js must not contain parent-facing internal surface token: ${s}`
  );
}

const hybridPanelSrc = readFileSync(join(ROOT, "components/ai-hybrid-internal-reviewer-panel.jsx"), "utf8");
assert.ok(
  /NEXT_PUBLIC_INTERNAL_HYBRID_REVIEWER/.test(hybridPanelSrc),
  "internal reviewer panel must be gated by NEXT_PUBLIC_INTERNAL_HYBRID_REVIEWER"
);
assert.ok(
  /INTERNAL_HYBRID_REVIEWER_UI/.test(hybridPanelSrc) && /return null/.test(hybridPanelSrc),
  "internal reviewer panel must return null when gate is off"
);

const mobileSnapshotHeuristic = detailedSrc.includes("max-w-4xl") && !detailedSrc.includes("ai-hybrid-internal-reviewer");
assert.ok(mobileSnapshotHeuristic, "detailed page source must not wire internal hybrid reviewer class");

assert.ok(CANONICAL_PARENT_INTENTS.includes("explain_report"), "canonical intent list must include explain_report");

const res = runTurn({
  audience: "parent",
  payload: pInel,
  utterance: "מה לעשות היום בשברים?",
  sessionId: "product-behavior-withhold",
});
assert.equal(res.resolutionStatus, "resolved");
assert.ok(
  !(res.answerBlocks || []).some((b) => b.type === "next_step" && /תרגול קצר ומדוד/u.test(String(b.textHe || ""))),
  "withhold: parent answer blocks should not push contract action as next_step when ineligible"
);

console.log("parent-copilot-product-behavior-suite: OK");
