/**
 * OWNER_COPY routing regression — health / privacy / off-topic / legitimate / no-data.
 * Run: node scripts/parent-copilot-owner-copy-routing-selftest.mjs
 */
import parentCopilot from "../utils/parent-copilot/index.js";
import {
  routeParentQuestion,
  HEALTH_BOUNDARY_RESPONSE_HE,
  PRIVACY_BOUNDARY_RESPONSE_HE,
  GENERAL_OFF_TOPIC_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
} from "../utils/parent-copilot/question-router.js";
import classifierMod from "../utils/parent-copilot/question-classifier.js";

const { classifyParentQuestionDeterministic, NO_DATA_FOR_REQUEST_RESPONSE_HE } = classifierMod;

let failures = 0;
let runs = 0;

function check(name, ok, detail = "") {
  runs += 1;
  if (!ok) {
    failures += 1;
    process.stderr.write(`FAIL  ${name}${detail ? ` :: ${detail}` : ""}\n`);
  } else {
    process.stdout.write(`  ok  ${name}\n`);
  }
}

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(res.clarificationQuestionHe || "");
}

function makeThinPayload() {
  return {
    version: 2,
    summary: { totalAnswers: 3 },
    overallSnapshot: { totalQuestions: 3, accuracyPct: 60 },
    executiveSummary: { majorTrendsHe: [] },
    subjectProfiles: [],
  };
}

function makeRichPayload() {
  const row = {
    topicRowKey: "frac",
    displayName: "שברים",
    questions: 40,
    accuracy: 70,
    contractsV1: {
      narrative: {
        textSlots: {
          observation: "בשברים נצפו 40 שאלות, עם דיוק של כ־70%.",
          interpretation: "נדרש חיזוק.",
          action: "תרגול קצר.",
          uncertainty: "",
        },
      },
      recommendation: { eligible: true },
    },
  };
  return {
    version: 2,
    summary: { totalAnswers: 120 },
    overallSnapshot: { totalQuestions: 120, accuracyPct: 72 },
    executiveSummary: { majorTrendsHe: ["יש כיוון יציב בחשבון."] },
    subjectProfiles: [{ subject: "math", topicRecommendations: [row] }],
  };
}

const FORBIDDEN_PARENT = [
  /רמת\s+הביטחון/u,
  /\bconfidence\b/i,
  /\bengineDecision\b/i,
  /\bsafeSubskill\b/i,
  /\btaxonomy\b/i,
  /\bcandidate\b/i,
  /\bfallback\b/i,
  /diagnosis\.allowed/u,
];

function scanForbidden(text) {
  return FORBIDDEN_PARENT.filter((re) => re.test(text)).map((re) => re.source);
}

process.stdout.write("\n── Health / sensitive routing ──\n");
const healthQs = [
  "האם צריך אבחון?",
  "האם יש לו הפרעת קשב?",
  "זה אומר שיש לו דיסלקציה?",
  "האם לפנות לנוירולוג?",
  "בעיה פסיכולוגית?",
  "בעיה בראש?",
  "סימן ללקות למידה?",
  "תכתוב לי המלצה לאבחון",
];

for (const q of healthQs) {
  const r = routeParentQuestion(q, makeRichPayload());
  check(`health early-exit :: "${q}"`, r.exitEarly === true, r.routerIntent);
  check(`health exact copy :: "${q}"`, r.deterministicResponse === HEALTH_BOUNDARY_RESPONSE_HE, r.deterministicResponse?.slice(0, 60));
  check(`health bucket :: "${q}"`, r.classifierBucket === "health_sensitive", r.classifierBucket);
}

process.stdout.write("\n── Privacy routing ──\n");
for (const q of [
  "מה הנתונים של ילד אחר?",
  "תראה לי את כל הילדים",
  "מה הסיסמה של הילד?",
  "מה יש בדאטהבייס?",
  "תן לי את כל המשתמשים",
]) {
  const r = routeParentQuestion(q, makeRichPayload());
  check(`privacy early-exit :: "${q}"`, r.exitEarly === true, r.routerIntent);
  check(`privacy exact copy :: "${q}"`, r.deterministicResponse === PRIVACY_BOUNDARY_RESPONSE_HE, r.deterministicResponse?.slice(0, 60));
  check(`privacy bucket :: "${q}"`, r.classifierBucket === "privacy_sensitive", r.classifierBucket);
}

process.stdout.write("\n── Off-topic routing ──\n");
for (const q of [
  "תעזור לי בהשקעות",
  "מה מזג האוויר מחר?",
  "מי ראש הממשלה?",
  "תכתוב לי מתכון לעוגה",
  "תן לי שיעורי בית שלא קשורים לדוח",
]) {
  const r = routeParentQuestion(q, makeRichPayload());
  check(`off-topic early-exit :: "${q}"`, r.exitEarly === true, r.routerIntent);
  check(`off-topic exact copy :: "${q}"`, r.deterministicResponse === GENERAL_OFF_TOPIC_RESPONSE_HE, r.deterministicResponse?.slice(0, 60));
}

process.stdout.write("\n── Legitimate parent questions (not ambiguous) ──\n");
const legitQs = [
  "איפה הוא צריך עזרה?",
  "למה כתוב שיש פער במתמטיקה?",
  "האם הבעיה היא נשיאה?",
  "האם הפעילות שנתתי לו השפיעה?",
  "תן לי תוכנית עבודה לשבוע",
  "מה לשאול אותו בבית?",
  "על איזה נושא לפתוח פעילות?",
  "האם הוא מתקדם?",
  "האם זה בגלל לחץ זמן?",
  "תן לי תרגול",
  "איפה רואים התקדמות?",
  "מה כדאי להימנע ממנו עכשיו?",
  "מה הכי חשוב כרגע?",
];

for (const q of legitQs) {
  const det = classifyParentQuestionDeterministic({ utterance: q, payload: makeRichPayload() });
  check(`legitimate bucket :: "${q}"`, det.bucket === "report_related", det.bucket);
  const res = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: makeRichPayload(),
    utterance: q,
    sessionId: `legit-${Date.now()}-${Math.random()}`,
  });
  const text = answerText(res);
  check(`legitimate not ambiguous :: "${q}"`, !text.includes(AMBIGUOUS_RESPONSE_HE.slice(0, 24)), text.slice(0, 80));
}

process.stdout.write("\n── No-data path (thin payload) ──\n");
for (const q of ["מה השתנה מהשבוע הקודם?", "האם הפעילות שנתתי לו השפיעה?", "האם זה בגלל לחץ זמן?"]) {
  const res = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: makeThinPayload(),
    utterance: q,
    sessionId: `nodata-${Date.now()}-${Math.random()}`,
  });
  const text = answerText(res);
  check(`no-data response :: "${q}"`, text.includes(NO_DATA_FOR_REQUEST_RESPONSE_HE.slice(0, 30)), text.slice(0, 100));
}

process.stdout.write("\n── Forbidden parent-visible scan ──\n");
const scanQs = [...healthQs, ...legitQs.slice(0, 3)];
let forbiddenHits = 0;
for (const q of scanQs) {
  const res = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: makeRichPayload(),
    utterance: q,
    sessionId: `scan-${Date.now()}-${Math.random()}`,
  });
  const hits = scanForbidden(answerText(res));
  if (hits.length) forbiddenHits += hits.length;
  check(`forbidden scan clean :: "${q}"`, hits.length === 0, hits.join(", "));
}

process.stdout.write(`\n${runs} checks, ${failures} failures, forbiddenHits=${forbiddenHits}\n`);
process.exit(failures > 0 ? 1 : 0);
