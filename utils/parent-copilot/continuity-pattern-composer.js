/**
 * Approved continuity follow-up composers (round 3).
 */

import { buildTruthPacketV1 } from "./truth-packet-v1.js";
import { NO_DATA_FOR_REQUEST_RESPONSE_HE } from "./question-classifier.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import {
  collectTopicMetrics,
  pickStrongestTopic,
  pickWeakestTopic,
  resolveLastTopicMetrics,
  topicAnchorFields,
  STRONG_ACC_MIN,
  STRONG_Q_MIN,
} from "./pattern-topic-metrics.js";

const WHAT_NOW_RE = /^(?:אז\s+)?מה\s+עושים(?:\s+עכשיו)?\s*\??$/u;
const PRESERVE_RE = /^איך\s+לשמר(?:\s+א(?:ת|ת)?\s+ז(?:ה|ו))?\s*\??$/u;
const IF_WRONG_RE = /^ו?מה\s+אם\s+(?:ה(?:וא|יא)|(?:הילד|הילדה))\s+טוע(?:ה|ים|ות)\s*(?:ב(?:זה|נושא))?\s*\??$/u;
const SIMPLER_RE = /^(?:תסביר\s+)?(?:פשוט\s+יותר|תעש(?:ה|י)\s+.*\s+פשוט\s+יותר)\s*\??$/u;
const SHORTEN_RE = /^(?:תקצר\s+לי|תעש(?:ה|י)\s+.*\s+קצר)\s*\??$/u;
const WHY_RE = /^למה\s*\??$/u;
const THEN_ACTIVITY_RE = /^אז\s+לפתוח\s+פעילות\s*\??$/u;
const WHICH_TOPIC_RE = /^באיזה\s+נושא\s*\??$/u;
const THEN_AFTER_RE = /^ו?מה\s+אחר(?:\s+כך)?\s*\??$/u;

/**
 * @param {string} utterance
 */
export function matchesContinuityFollowUp(utterance) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (!t || t.length > 48) return false;
  return (
    WHAT_NOW_RE.test(t) ||
    PRESERVE_RE.test(t) ||
    IF_WRONG_RE.test(t) ||
    SIMPLER_RE.test(t) ||
    SHORTEN_RE.test(t) ||
    WHY_RE.test(t) ||
    THEN_ACTIVITY_RE.test(t) ||
    WHICH_TOPIC_RE.test(t) ||
    THEN_AFTER_RE.test(t)
  );
}

/**
 * @param {string} utterance
 */
export function classifyContinuityFollowUp(utterance) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (WHAT_NOW_RE.test(t) || THEN_ACTIVITY_RE.test(t)) return "what_now";
  if (PRESERVE_RE.test(t)) return "preserve";
  if (IF_WRONG_RE.test(t)) return "if_wrong";
  if (SIMPLER_RE.test(t)) return "simpler";
  if (SHORTEN_RE.test(t)) return "shorten";
  if (WHY_RE.test(t)) return "why";
  if (WHICH_TOPIC_RE.test(t) || THEN_AFTER_RE.test(t)) return "what_now";
  return null;
}

function hasConversationContext(conv) {
  return (
    String(conv?.lastResolvedTopic || "").trim() ||
    String(conv?.lastResolvedSubject || "").trim() ||
    (Array.isArray(conv?.priorScopes) && conv.priorScopes.length > 0) ||
    String(conv?.lastAnswerSummary || "").trim().length > 12
  );
}

/**
 * @param {ReturnType<typeof topicAnchorFields>} a
 * @param {string} utterance
 * @param {string} plannerIntent
 * @param {unknown} payload
 */
function continuityDraft(textHe, a, utterance, plannerIntent, payload) {
  const truthPacket = buildTruthPacketV1(payload, {
    scopeType: "topic",
    scopeId: a.topicRowKey,
    scopeLabel: a.displayName || a.topicLabel,
    canonicalIntent: plannerIntent,
    parentUtterance: utterance,
  });
  if (!truthPacket) return null;
  return {
    answerBlocks: [{ type: "observation", textHe: String(textHe || "").trim(), source: "continuity_pattern_composer" }],
    plannerIntent,
    truthPacket,
    scopeMeta: {
      generationPath: "pattern_composer",
      continuityPattern: true,
      intentReason: "continuity:approved_pattern",
      scopeConfidence: 0.9,
      scopeReason: "continuity_followup",
    },
  };
}

function resolveStrongOrLast(payload, conv) {
  const last = resolveLastTopicMetrics(payload, conv);
  if (last && last.q >= STRONG_Q_MIN && last.acc >= STRONG_ACC_MIN) return topicAnchorFields(last);
  const strong = pickStrongestTopic(collectTopicMetrics(payload));
  return strong ? topicAnchorFields(strong) : last ? topicAnchorFields(last) : null;
}

/**
 * @param {object} params
 */
export function tryComposeContinuityPatternDraft(params) {
  const utteranceStr = String(params?.utteranceStr || "");
  const payload = params?.payload;
  const conv = params?.conversationState || {};
  if (!matchesContinuityFollowUp(utteranceStr)) return null;
  if (!hasConversationContext(conv)) return null;

  const kind = classifyContinuityFollowUp(utteranceStr);
  if (!kind) return null;

  const last = resolveLastTopicMetrics(payload, conv);
  const anchor = last ? topicAnchorFields(last) : null;

  switch (kind) {
    case "what_now": {
      if (!anchor) return { noData: true };
      const text = `הצעד הבא הוא תרגול קצר בנושא ${anchor.subjectLabel} — ${anchor.topicLabel}: 5–10 דקות, מעט שאלות, ואז בדיקה אם התשובות יציבות יותר. לא צריך לפתוח כמה נושאים יחד.`;
      return continuityDraft(text, anchor, utteranceStr, "what_to_do_now", payload);
    }
    case "preserve": {
      const strong = resolveStrongOrLast(payload, conv);
      if (!strong || strong.questionCount < 1) return { noData: true };
      const text = `כדי לשמר את ${strong.subjectLabel} — ${strong.topicLabel}, מספיק תרגול קצר פעם-פעמיים בשבוע. המטרה היא לשמור על רצף בלי להעמיס, ולבדוק שהדיוק נשאר יציב.`;
      return continuityDraft(text, strong, utteranceStr, "what_is_going_well", payload);
    }
    case "if_wrong": {
      if (!anchor) return { noData: true };
      const text = `אם הוא טועה בנושא ${anchor.subjectLabel} — ${anchor.topicLabel}, עדיף לעצור אחרי שאלה אחת או שתיים, לבקש ממנו להסביר איך חשב, ואז לפתור יחד שאלה דומה. המטרה היא להבין את הדרך, לא למהר לעוד הרבה שאלות.`;
      return continuityDraft(text, anchor, utteranceStr, "what_to_do_now", payload);
    }
    case "simpler": {
      if (!anchor) return { noData: true };
      const text = `במילים פשוטות: הנושא שכדאי להתמקד בו עכשיו הוא ${anchor.subjectLabel} — ${anchor.topicLabel}. כדאי לעשות תרגול קצר, לבדוק איך הוא עונה, ולא להסיק מעבר למה שמופיע בדוח.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    case "shorten": {
      if (!anchor) return { noData: true };
      const text = `בקצרה: להתמקד ב־${anchor.subjectLabel} — ${anchor.topicLabel}, לתרגל 5–10 דקות, ואז לבדוק אם יש שיפור בתשובות הבאות.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    case "why": {
      if (!anchor?.questionCount) return { noData: true };
      const text = `כי בדוח מופיעות ב־${anchor.subjectLabel} — ${anchor.topicLabel} ${anchor.questionCount} שאלות עם ${anchor.accuracyPercent}% הצלחה. זה הנתון שממנו מגיעה ההמלצה.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    default:
      return null;
  }
}

export function continuityNoDataResponseHe() {
  return NO_DATA_FOR_REQUEST_RESPONSE_HE;
}
