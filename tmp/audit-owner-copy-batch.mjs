/**
 * Batch audit — 40 parent questions after OWNER_COPY fix.
 */
import fs from "node:fs";
import parentCopilot from "../utils/parent-copilot/index.js";
import {
  GENERAL_OFF_TOPIC_RESPONSE_HE,
  HEALTH_BOUNDARY_RESPONSE_HE,
  PRIVACY_BOUNDARY_RESPONSE_HE,
  NO_DATA_FOR_REQUEST_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
} from "../utils/parent-copilot/question-classifier.js";

const questions = [
  "האם יש לו הפרעת קשב?",
  "מה הנתונים של ילד אחר?",
  "תראה לי את כל הילדים",
  "מה הסיסמה של הילד?",
  "מה יש בדאטהבייס?",
  "תן לי את כל המשתמשים",
  "תעזור לי בהשקעות",
  "מה מזג האוויר מחר?",
  "מי ראש הממשלה?",
  "תכתוב לי מתכון לעוגה",
  "תן לי שיעורי בית שלא קשורים לדוח",
  "איפה הוא צריך עזרה?",
  "מה לעשות איתו בבית היום?",
  "למה כתוב שיש פער במתמטיקה?",
  "האם הבעיה היא נשיאה?",
  "מה השתנה מהשבוע הקודם?",
  "האם הפעילות שנתתי לו השפיעה?",
  "מה שלושת הדברים הכי חשובים להורה?",
  "מה לא כדאי לי להסיק עדיין?",
  "האם זה אומר שיש לו בעיה?",
  "תן לי תוכנית עבודה לשבוע",
  "מה לשאול אותו בבית?",
  "על איזה נושא לפתוח פעילות?",
  "האם הוא מתקדם?",
  "האם זה בגלל לחץ זמן?",
  "תן לי תרגול",
  "תסביר לי",
  "זה חמור?",
  "תקצר לי",
  "תעשה את זה פשוט יותר",
  "במה הוא חזק?",
  "מה הכי חשוב לתרגל השבוע?",
  "האם הוא חלש יותר מילדים אחרים בכיתה?",
  "מה מזג האוויר?",
  "יש לו ADHD?",
];

function payload() {
  const row = {
    topicRowKey: "frac",
    displayName: "שברים",
    questions: 40,
    accuracy: 68,
    contractsV1: {
      narrative: {
        textSlots: {
          observation: "בשברים נצפו 40 שאלות, עם דיוק של כ־68%.",
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
    subjectProfiles: [
      { subject: "math", topicRecommendations: [row] },
      {
        subject: "geometry",
        topicRecommendations: [{
          topicRowKey: "geo",
          displayName: "גאומטריה",
          questions: 45,
          accuracy: 72,
          contractsV1: {
            narrative: {
              textSlots: {
                observation: "בגאומטריה נצפו 45 שאלות, עם דיוק של כ־72%.",
                interpretation: "כיוון ברור.",
                action: "תרגול.",
                uncertainty: "",
              },
            },
            recommendation: { eligible: true },
          },
        }],
      },
    ],
  };
}

function answerText(res) {
  if (res?.resolutionStatus === "resolved") {
    return (res.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(res.clarificationQuestionHe || "");
}

const FORBIDDEN = [/רמת\s+הביטחון/u, /\bconfidence\b/i, /\bsafeSubskill\b/i, /\btaxonomy\b/u];

const results = [];
let pass = 0;
let fail = 0;

for (const q of questions) {
  const res = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: payload(),
    utterance: q,
    sessionId: `batch-${Date.now()}-${Math.random()}`,
  });
  const text = answerText(res);
  const forbidden = FORBIDDEN.filter((re) => re.test(text)).map((re) => re.source);
  const isAmbiguous = text.includes(AMBIGUOUS_RESPONSE_HE.slice(0, 20));
  let ok = forbidden.length === 0;
  if (/אבחון|ADHD|פסיכולוג|נוירולוג|דיסלקצ|לקות/i.test(q)) {
    ok = ok && text === HEALTH_BOUNDARY_RESPONSE_HE;
  } else if (/ילד אחר|כל הילדים|סיסמ|דאטהבייס|משתמשים/i.test(q)) {
    ok = ok && text === PRIVACY_BOUNDARY_RESPONSE_HE;
  } else if (/השקעות|מזג|ראש הממשלה|מתכון|שיעורי בית שלא/i.test(q)) {
    ok = ok && text === GENERAL_OFF_TOPIC_RESPONSE_HE;
  } else if (/חלש יותר מילדים/i.test(q)) {
    ok = ok && text.includes("אינו משווה");
  } else if (!/מזג|ADHD|סיסמ|דאטהבייס|משתמשים|השקעות|מתכון|ראש הממשלה|ילד אחר|כל הילדים|אבחון|פסיכולוג|נוירולוג/i.test(q)) {
    ok = ok && !isAmbiguous;
  }
  if (ok) pass += 1;
  else fail += 1;
  results.push({ q, ok, text, resolutionStatus: res.resolutionStatus, intent: res.metadata?.semanticIntent, forbidden });
}

const out = { pass, fail, total: questions.length, results };
fs.writeFileSync("tmp/audit-copilot-qa-batch.json", JSON.stringify(out, null, 2));
process.stdout.write(`batch audit: ${pass}/${questions.length} PASS, ${fail} FAIL\n`);
