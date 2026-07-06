import assert from "node:assert/strict";
import parentCopilot from "../utils/parent-copilot/index.js";
import guardrail from "../utils/parent-copilot/guardrail-validator.js";

function mkTopic(subjectId, topicRowKey, displayName, questions, accuracy, opts = {}) {
  const readiness = opts.readiness || "forming";
  const confidenceBand = opts.confidenceBand || "medium";
  const cannotConcludeYet = opts.cannotConcludeYet === true;
  const eligible = opts.eligible !== false;
  const intensity = opts.intensity || "RI1";
  return {
    topicRowKey,
    displayName,
    questions,
    accuracy,
    contractsV1: {
      evidence: { contractVersion: "v1", topicKey: topicRowKey, subjectId },
      decision: { contractVersion: "v1", topicKey: topicRowKey, subjectId, decisionTier: cannotConcludeYet ? 0 : 2, cannotConcludeYet },
      readiness: { contractVersion: "v1", topicKey: topicRowKey, subjectId, readiness },
      confidence: { contractVersion: "v1", topicKey: topicRowKey, subjectId, confidenceBand },
      recommendation: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        eligible,
        intensity: eligible ? intensity : "RI0",
        family: eligible ? "general_practice" : null,
        anchorEvidenceIds: [],
        forbiddenBecause: cannotConcludeYet ? ["cannot_conclude_yet"] : [],
      },
      narrative: {
        contractVersion: "v1",
        topicKey: topicRowKey,
        subjectId,
        wordingEnvelope: cannotConcludeYet ? "WE0" : "WE2",
        hedgeLevel: "light",
        allowedTone: "parent_professional_warm",
        forbiddenPhrases: ["בטוח לחלוטין"],
        requiredHedges: ["נכון לעכשיו"],
        allowedSections: ["summary", "finding", "recommendation", "limitations"],
        recommendationIntensityCap: eligible ? intensity : "RI0",
        textSlots: {
          observation: `נכון לעכשיו ב${displayName} נצפו ${questions} שאלות עם דיוק של כ־${accuracy}%.`,
          interpretation: `נכון לעכשיו זה מתאר תמונת מצב ראשונית ב${displayName}.`,
          action: eligible ? "נכון לעכשיו אפשר לתרגל צעד קצר." : null,
          uncertainty: "נכון לעכשיו כדאי להמשיך לעקוב.",
        },
      },
    },
  };
}

function payloadOneSubject() {
  return {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [mkTopic("math", "m-add", "חיבור", 24, 78, { readiness: "emerging", confidenceBand: "medium" })],
      },
    ],
    executiveSummary: { majorTrendsHe: [] },
  };
}

function payloadMultiSubject() {
  return {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [mkTopic("math", "m-mul", "כפל", 30, 60, { readiness: "forming", confidenceBand: "low", cannotConcludeYet: true, eligible: false })],
      },
      {
        subject: "english",
        topicRecommendations: [mkTopic("english", "e-voc", "אוצר מילים", 18, 92, { readiness: "ready", confidenceBand: "high", cannotConcludeYet: false, eligible: true, intensity: "RI2" })],
      },
      {
        subject: "hebrew",
        topicRecommendations: [mkTopic("hebrew", "h-gram", "דקדוק", 12, 45, { readiness: "insufficient", confidenceBand: "low", cannotConcludeYet: true, eligible: false })],
      },
    ],
    executiveSummary: { majorTrendsHe: [] },
  };
}

function payloadSparseData() {
  return {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [mkTopic("math", "m-sparse", "סדר פעולות", 0, 0, { readiness: "insufficient", confidenceBand: "low", cannotConcludeYet: true, eligible: false })],
      },
      {
        subject: "english",
        topicRecommendations: [mkTopic("english", "e-sparse", "הבנת הנקרא", 2, 50, { readiness: "insufficient", confidenceBand: "low", cannotConcludeYet: true, eligible: false })],
      },
    ],
    executiveSummary: { majorTrendsHe: [] },
  };
}

function payloadWithTrends() {
  const p = payloadMultiSubject();
  p.executiveSummary = {
    majorTrendsHe: [
      "נראית התקדמות עקבית באנגלית לאורך התקופה",
      "נדרשת זהירות בפרשנות בחשבון בגלל תנודתיות",
      "קיים שיפור נקודתי בדיוק בקריאה",
    ],
  };
  return p;
}

function payloadWithoutTrends() {
  const p = payloadMultiSubject();
  p.executiveSummary = { majorTrendsHe: [] };
  return p;
}

function payloadImbalancedCounts() {
  return {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [mkTopic("math", "m-heavy", "כפל", 120, 70, { readiness: "forming", confidenceBand: "medium" })],
      },
      {
        subject: "english",
        topicRecommendations: [mkTopic("english", "e-light", "אוצר מילים", 8, 92, { readiness: "ready", confidenceBand: "high" })],
      },
      {
        subject: "hebrew",
        topicRecommendations: [mkTopic("hebrew", "h-tiny", "דקדוק", 3, 40, { readiness: "insufficient", confidenceBand: "low", cannotConcludeYet: true, eligible: false })],
      },
    ],
    executiveSummary: { majorTrendsHe: [] },
  };
}

const MATRIX_QUESTIONS = [
  "מה המקצוע החזק?",
  "מה המקצוע החלש?",
  "באיזה מקצוע הכי קשה?",
  "יש עוד מקצועות?",
  "מה הכי בולט בתקופה?",
  "חשבון מול אנגלית",
  "איפה יש הכי הרבה תרגול?",
  "איפה יש הכי מעט נתונים?",
  "מה השתפר?",
  "מה דורש תשומת לב?",
  "מה עדיין לא ברור?",
  "איזה מקצוע הכי יציב?",
];

const FAMILIES_WITHOUT_TOPIC_LEAK = new Set([
  "מה המקצוע החזק?",
  "מה המקצוע החלש?",
  "באיזה מקצוע הכי קשה?",
]);

const coachingPrefix = /^(מהצד ההורי|כהורה|לפי הדוח:\s*$|אם זה ברור)/;
const internalLeak = /(מבט על התקופה|scope|executive)/;

function expectedPatternForQuestion(q) {
  if (q === "מה המקצוע החזק?")
    return /המקצוע החזק ביותר|מקצוע אחד עם תרגול|יש כרגע בעיקר מקצוע אחד|מקצוע אחד עם מספיק|לא .*מספיק תרגול.*שני מקצועות|לא נדרגים כאן מקצועות|אין מספיק נתונים להשוואה בין מקצועות|תורגל רק|התחומים החזקים יחסית/;
  if (q === "מה המקצוע החלש?")
    return /המקצוע הנמוך ביותר|מקצוע אחד עם תרגול|מקצוע אחד עם נתונים|לא .*מספיק תרגול.*שני מקצועות|לא נדרגים כאן מקצועות|אין מספיק נתונים להשוואה בין מקצועות|תורגל רק|«הכי חלש» לא אומר|דורש חיזוק|הכי «קשה»/;
  if (q === "באיזה מקצוע הכי קשה?")
    return /המקצוע שבו הכי [«"]קשה[»"]|מקצוע אחד עם תרגול|מקצוע אחד עם נתונים|[«"]קשה[»"] מתורגם|[«"]הכי קשה[»"] מתייחס|לא .*מספיק תרגול.*שני מקצועות|לא נדרגים כאן מקצועות|אין מספיק נתונים להשוואה בין מקצועות|תורגל רק|דורש חיזוק/;
  if (q === "יש עוד מקצועות?")
    return /בדוח מופיעים המקצועות הבאים|לא מופיעים כרגע מקצועות|מקצוע אחד|תורגל רק|אין מספיק נתונים להשוואה/;
  if (q === "מה הכי בולט בתקופה?")
    return /מה שמסתמן|לפי שורות הסיכום|בולטים במיוחד|אין כרגע בדוח מספיק תרגול|הכי גבוהים|ממוצע|דירוג הדיוק|התקדמות|כיוון|בולט|סיכום התקופה/;
  if (q === "חשבון מול אנגלית")
    return /גבוה יותר|על אותו קו דיוק|חסרים מספיק נתוני תרגול|צריך לציין בבירור שני מקצועות|כדי להשוות בין שני מקצועות|צריך לציין את שני השמות|מעט נתוני תרגול|אין עדיין מספיק מידע|מה שעובד יחסית טוב|ההשוואה מבוססת/;
  if (q === "איפה יש הכי הרבה תרגול?")
    return /הכי הרבה תרגול|אין כרגע מקצועות פעילים|שאלות מתועדות/;
  if (q === "איפה יש הכי מעט נתונים?")
    return /הכי מעט נתונים|אין כרגע מקצועות פעילים|שאלות מתועדות|מעט מדי נתונים/;
  if (q === "מה השתפר?") return /סימני שיפור|אין שורת סיכום מפורשת|מה השתפר|כיוון/;
  if (q === "מה דורש תשומת לב?")
    return /דורש כרגע הכי הרבה תשומת לב|דורש.*חיזוק|המוקד שדורש|אין כרגע נתונים מספיקים/;
  if (q === "מה עדיין לא ברור?")
    return /עדיין לא ברור|אין כרגע בדוח|חוסר בהירות|מקצוע שלם|סימן מובהק|למקד את התרגול|עדיין לא מיושבים|הדוח מציג כמה תחומים/;
  if (q === "איזה מקצוע הכי יציב?")
    return /המקצוע היציב ביותר|מקצוע אחד בלבד|אין כרגע מספיק תרגול עקבי|אי אפשר להשוות יציבות/;
  return /.+/;
}

function topicDisplayNames(payload) {
  const out = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const dn = String(tr?.displayName || "").trim();
      if (dn) out.push(dn);
    }
  }
  return out;
}

function assertSemanticAnswerShape(payloadName, payload, question, response) {
  assert.equal(response.resolutionStatus, "resolved", `${payloadName}: "${question}" must resolve`);
  assert.ok(guardrail.validateParentCopilotResponseV1(response).ok, `${payloadName}: "${question}" guardrail invalid`);
  assert.ok(Array.isArray(response.answerBlocks) && response.answerBlocks.length >= 2, `${payloadName}: "${question}" answer must have at least 2 blocks`);
  assert.equal(response.answerBlocks[0]?.type, "observation", `${payloadName}: "${question}" first block must be observation`);
  assert.equal(response.suggestedFollowUp, null, `${payloadName}: "${question}" should not emit follow-up`);

  const first = String(response.answerBlocks[0]?.textHe || "").trim();
  const joined = response.answerBlocks.map((b) => String(b.textHe || "")).join(" ");
  assert.ok(first.length > 10, `${payloadName}: "${question}" first block too short`);
  assert.ok(!coachingPrefix.test(first), `${payloadName}: "${question}" must be answer-first, not coaching-first`);
  assert.ok(!internalLeak.test(joined), `${payloadName}: "${question}" leaked internal label`);
  assert.ok(expectedPatternForQuestion(question).test(joined), `${payloadName}: "${question}" wrong answer class content`);

  if (FAMILIES_WITHOUT_TOPIC_LEAK.has(question) && payloadName === "multi-subject-report") {
    const topics = topicDisplayNames(payload);
    const hasTopicLeak = topics.some((dn) => joined.includes(dn));
    assert.equal(hasTopicLeak, false, `${payloadName}: "${question}" leaked topic-row phrasing`);
  }
}

function runCase(payloadName, payloadFactory) {
  const payload = payloadFactory();
  for (const q of MATRIX_QUESTIONS) {
    const sessionId = `matrix-${payloadName}-${Buffer.from(q).toString("base64url").slice(0, 18)}`;
    const res = parentCopilot.runParentCopilotTurn({
      audience: "parent",
      payload,
      utterance: q,
      sessionId,
      selectedContextRef: null,
    });
    assertSemanticAnswerShape(payloadName, payload, q, res);
  }
}

runCase("one-subject-report", payloadOneSubject);
runCase("multi-subject-report", payloadMultiSubject);
runCase("sparse-data-report", payloadSparseData);
runCase("with-major-trends-report", payloadWithTrends);
runCase("without-major-trends-report", payloadWithoutTrends);
runCase("imbalanced-question-count-report", payloadImbalancedCounts);

console.log("parent-copilot-executive-answer-safe-matrix: OK");
