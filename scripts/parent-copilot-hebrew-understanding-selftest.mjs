/**
 * Parent Copilot Hebrew understanding — report-row-first routing regression.
 * Run: npx tsx scripts/parent-copilot-hebrew-understanding-selftest.mjs
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

async function load(rel) {
  const m = await import(pathToFileURL(join(ROOT, "..", rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { classifyParentQuestionDeterministic, AMBIGUOUS_RESPONSE_HE } = await load(
  "utils/parent-copilot/question-classifier.js"
);
const { routeParentQuestion } = await load("utils/parent-copilot/question-router.js");
const { resolveScope } = await load("utils/parent-copilot/scope-resolver.js");
const { runParentCopilotTurn } = await load("utils/parent-copilot/index.js");
const { buildTopicClarificationQuestionHe } = await load("utils/parent-copilot/report-row-resolver.js");

function makeContract(topicRowKey, subjectId, displayName, qCount = 12, acc = 72) {
  return {
    topicRowKey,
    displayName,
    questions: qCount,
    accuracy: acc,
    contractsV1: {
      narrative: {
        textSlots: {
          observation: `ב${displayName} נצפו ${qCount} שאלות עם דיוק של ${acc}%.`,
          interpretation: `${displayName} דורש תרגול ממוקד.`,
          action: `מומלץ לתרגל ${displayName}.`,
          uncertainty: "",
        },
      },
      decision: { cannotConcludeYet: false },
      readiness: { readiness: "emerging" },
      confidence: { confidenceBand: "medium" },
      recommendation: { eligible: true, intensity: "RI2" },
    },
  };
}

function richPayload() {
  return {
    registeredGradeKey: "g4",
    gradePracticeMeta: {
      registeredGradeKey: "g4",
      mixedGradePractice: true,
      mixedGradePracticeNoteHe:
        "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד.",
    },
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [
          makeContract("fractions::grade:g4", "math", "שברים", 20, 55),
          makeContract("fractions::grade:g5", "math", "שברים", 18, 40),
          makeContract("multiplication", "math", "כפל", 15, 70),
          makeContract("division", "math", "חילוק", 12, 68),
        ],
      },
      {
        subject: "english",
        topicRecommendations: [makeContract("grammar", "english", "דקדוק", 10, 80)],
      },
      {
        subject: "hebrew",
        topicRecommendations: [
          makeContract("reading", "hebrew", "הבנת הנקרא", 14, 65),
        ],
      },
      {
        subject: "science",
        topicRecommendations: [makeContract("life", "science", "מדעים כללי", 8, 75)],
      },
      {
        subject: "geometry",
        topicRecommendations: [makeContract("shapes", "geometry", "צורות", 9, 78)],
      },
      {
        subject: "moledet-geography",
        topicRecommendations: [makeContract("israel", "moledet-geography", "מולדת", 6, 82)],
      },
    ],
  };
}

const payload = richPayload();
let sid = 0;
const freshSid = () => `heb-${++sid}`;

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(res.clarificationQuestionHe || "");
}

const mustBeReportRelated = [
  "תסביר לי על שברים מה הבעיה",
  "חשבון שברים",
  "מה הבעיה?",
  "מה לעשות בבית?",
  "איך הוא בחשבון?",
  "איך הוא בהבנת הנקרא?",
  "מה הכי חשוב לתרגל השבוע?",
  "למה יש שתי כיתות באותו נושא?",
  "מה הבעיה בכפל?",
  "איך הוא בחילוק?",
  "מה עם דקדוק?",
  "איך הוא בגיאומטריה?",
  "מה לעשות במדעים?",
  "איך הוא בעברית?",
  "איך הוא באנגלית?",
  "איך הוא במולדת?",
];

for (const q of mustBeReportRelated) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload });
  assert.equal(det.bucket, "report_related", `classifier report_related :: ${q} got ${det.bucket}`);
}

const vagueTopic = "אני רוצה לדעת על נושא מסויים";
const routeVague = routeParentQuestion(vagueTopic, payload);
assert.equal(routeVague.exitEarly, true);
assert.ok(
  String(routeVague.deterministicResponse || "").includes("על איזה נושא"),
  "vague topic uses short clarification"
);
assert.ok(
  !String(routeVague.deterministicResponse || "").includes(AMBIGUOUS_RESPONSE_HE.slice(0, 24)),
  "vague topic must not use long generic ambiguous copy"
);

const scopeFrac = resolveScope({ payload, utterance: "תסביר לי על שברים מה הבעיה" });
assert.equal(scopeFrac.resolutionStatus, "resolved");
assert.equal(scopeFrac.scope?.scopeType, "topic");
assert.match(String(scopeFrac.scope?.scopeLabel || ""), /שברים/);

const scopeMath = resolveScope({ payload, utterance: "איך הוא בחשבון?" });
assert.equal(scopeMath.resolutionStatus, "resolved");
assert.equal(scopeMath.scope?.scopeType, "subject");
assert.equal(scopeMath.scope?.scopeId, "math");

const turn = runParentCopilotTurn({
  audience: "parent",
  payload,
  utterance: "תסביר לי על שברים מה הבעיה",
  sessionId: freshSid(),
});
assert.equal(turn.resolutionStatus, "resolved", "topic question must resolve with report data");
const turnText = answerText(turn);
assert.ok(turnText.includes("שברים") || /\d/.test(turnText), "answer references topic or metrics");
assert.ok(
  !turnText.includes(AMBIGUOUS_RESPONSE_HE.slice(0, 20)),
  "must not leak generic ambiguous help after real question"
);

const clarify = buildTopicClarificationQuestionHe(payload);
assert.ok(clarify.includes("שברים") || clarify.includes("חשבון"));

process.stdout.write("OK parent-copilot-hebrew-understanding-selftest\n");
