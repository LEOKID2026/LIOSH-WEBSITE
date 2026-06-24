#!/usr/bin/env node
/**
 * Round-3 approved pattern composer selftest.
 */
import assert from "node:assert/strict";
import { tryComposePatternAnswerDraft } from "../utils/parent-copilot/pattern-answer-composers.js";
import { tryComposeContinuityPatternDraft } from "../utils/parent-copilot/continuity-pattern-composer.js";
import { NO_DATA_FOR_REQUEST_RESPONSE_HE } from "../utils/parent-copilot/question-classifier.js";

function samplePayload() {
  return {
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [
          {
            topicRowKey: "math:frac-add",
            displayName: "חיבור שברים",
            questions: 24,
            accuracy: 48,
            contractsV1: { narrative: { textSlots: { observation: "חלק מהתרגול היה במצב מהיר" } } },
          },
          {
            topicRowKey: "math:mult",
            displayName: "כפל",
            questions: 30,
            accuracy: 82,
          },
        ],
      },
    ],
    executiveSummary: {
      majorTrendsHe: ["בחשבון יש שיפור קל בחיבור שברים לעומת התקופה הקודמת."],
    },
    summary: { parentActivityAttemptsCount: 2, totalAnswers: 54 },
  };
}

function main() {
  const payload = samplePayload();

  const where = tryComposePatternAnswerDraft({
    utteranceStr: "איפה הוא צריך עזרה?",
    payload,
    conversationState: {},
  });
  assert.ok(where?.answerBlocks?.[0]?.textHe.includes("24 שאלות"));
  assert.ok(where.answerBlocks[0].textHe.includes("48%"));

  const three = tryComposePatternAnswerDraft({
    utteranceStr: "מה שלושת הדברים הכי חשובים להורה?",
    payload,
    conversationState: {},
  });
  assert.ok(three?.answerBlocks?.[0]?.textHe.includes("שלושת הדברים"));

  const open = tryComposePatternAnswerDraft({
    utteranceStr: "על איזה נושא לפתוח לו פעילות?",
    payload,
    conversationState: {},
  });
  assert.ok(open?.answerBlocks?.[0]?.textHe.includes("5–10") || open?.answerBlocks?.[0]?.textHe.includes("פעילות קצרה"));

  const speed = tryComposePatternAnswerDraft({
    utteranceStr: "האם זה בגלל לחץ זמן?",
    payload,
    conversationState: {},
  });
  assert.ok(speed?.answerBlocks?.[0]?.textHe.includes("לחץ זמן") || speed?.answerBlocks?.[0]?.textHe.includes("מהיר"));

  const emptyPayload = { subjectProfiles: [] };
  const noDataTrend = tryComposePatternAnswerDraft({
    utteranceStr: "מה השתנה מהשבוע הקודם?",
    payload: emptyPayload,
    conversationState: {},
  });
  assert.equal(noDataTrend?.noData, true);

  const conv = {
    priorScopes: ["topic:math:frac-add"],
    lastResolvedTopic: "math:frac-add",
    lastResolvedSubject: "math",
  };
  const cont = tryComposeContinuityPatternDraft({
    utteranceStr: "אז מה עושים?",
    payload,
    conversationState: conv,
  });
  assert.ok(cont?.answerBlocks?.[0]?.textHe.includes("הצעד הבא"));

  const englishConv = {
    priorScopes: ["subject:english"],
    lastResolvedSubject: "english",
    lastAnswerSummary: "באנגלית מופיע נושא מילים עם דיוק נמוך יחסית.",
  };
  const severity = tryComposeContinuityPatternDraft({
    utteranceStr: "זה חמור?",
    payload: {
      subjectProfiles: [
        {
          subject: "english",
          topicRecommendations: [
            { topicRowKey: "english:vocab", displayName: "מילים", questions: 12, accuracy: 40 },
          ],
        },
        {
          subject: "math",
          topicRecommendations: [
            { topicRowKey: "math:geom", displayName: "גאומטריה", questions: 20, accuracy: 35 },
          ],
        },
      ],
    },
    conversationState: englishConv,
  });
  assert.ok(severity?.answerBlocks?.[0]?.textHe.includes("אנגלית"));
  assert.ok(!severity?.answerBlocks?.[0]?.textHe.includes("גאומטריה"));

  const home = tryComposePatternAnswerDraft({
    utteranceStr: "מה לעשות בבית?",
    payload,
    conversationState: {},
  });
  assert.ok(home?.answerBlocks?.[0]?.textHe.includes("היום הייתי עושה"));

  const askHome = tryComposePatternAnswerDraft({
    utteranceStr: "מה לשאול אותו בבית?",
    payload,
    conversationState: {},
  });
  assert.ok(askHome?.answerBlocks?.[0]?.textHe.includes("שלוש שאלות"));

  const notInfer = tryComposePatternAnswerDraft({
    utteranceStr: "מה לא כדאי להסיק?",
    payload,
    conversationState: {},
  });
  assert.ok(notInfer?.answerBlocks?.[0]?.textHe.includes("כרגע כדאי להימנע משלושה דברים"));

  const whyNotInfer = tryComposeContinuityPatternDraft({
    utteranceStr: "למה?",
    payload,
    conversationState: {
      lastTurnWasWhatNotInfer: true,
      lastAnswerSummary: notInfer.answerBlocks[0].textHe,
    },
  });
  assert.ok(whyNotInfer?.answerBlocks?.[0]?.textHe.includes("כי הדוח מציג רק נתוני תרגול"));

  const preserve = tryComposeContinuityPatternDraft({
    utteranceStr: "איך לשמר?",
    payload,
    conversationState: {
      priorScopes: ["topic:math:mult"],
      lastResolvedTopic: "math:mult",
      lastPlannerIntent: "what_is_going_well",
    },
  });
  assert.ok(preserve?.answerBlocks?.[0]?.textHe.includes("לשמר"));

  assert.equal(NO_DATA_FOR_REQUEST_RESPONSE_HE.length > 20, true);
  console.log("OK parent-copilot-pattern-round3-selftest");
}

main();
