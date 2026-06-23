/**
 * Approved round-3 pattern answer composers (exact owner-provided Hebrew templates).
 */

import { buildTruthPacketV1 } from "./truth-packet-v1.js";
import { NO_DATA_FOR_REQUEST_RESPONSE_HE } from "./question-classifier.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import { normalizeSubjectId, subjectLabelHe, SUBJECT_ORDER } from "./contract-reader.js";
import {
  collectTopicMetrics,
  pickWeakestTopic,
  pickWeakestTopics,
  pickStrongForThreeThings,
  pickWeakForThreeThings,
  topicAnchorFields,
} from "./pattern-topic-metrics.js";
import {
  exportTrendEvidence,
  exportParentActivityEvidence,
  exportSpeedEvidence,
  isRealTrendLineHe,
} from "./no-data-request-response.js";

const WHERE_HELP_RE = /איפה\s+(?:ה(?:וא|יא)|(?:הילד|הילדה))\s+צ(?:ר|ר)יך\s+עזרה/u;
const THREE_THINGS_RE = /(?:מה\s+)?(?:שלוש(?:ת)?|3)\s*(?:ה)?דברים(?:\s+הכי\s+חשוב(?:ים)?)?(?:\s+להורה)?/u;
const OPEN_ACTIVITY_RE = /על\s+איזה\s+נושא\s+ל(?:פתוח|התחיל)(?:\s+(?:ל(?:ו|ה)|פעילות))?/u;
const TREND_RE =
  /מה\s+השתנה|משבוע\s+קודם|מהשבוע\s+קודם|השבוע\s+קודם|האם\s+(?:הוא|היא)\s+מתקדם|יש\s+שיפור|התקדמות/u;
const PARENT_ACTIVITY_RE = /הפעילות\s+.*השפיע|האם\s+הפעילות\s+.*השפיע|מה\s+נתתי\s+ל(?:ו|ה)/u;
const SPEED_RE =
  /האם\s+ז(?:ה|ו)\s+בגלל\s+לחץ\s+זמן|אולי\s+ז(?:ה|ו)\s+בגלל\s+מהירות|האם\s+(?:הוא|היא)\s+טע(?:ה|תה)\s+כי\s+עבד(?:ה)?\s+מהר|לחץ\s+זמן|עונה\s+מהר|מהר\s+מדי/u;
const LEARNING_SEVERITY_FOLLOWUP_RE = /^(?:ז(?:ה|ו)\s+)?חמור\s*\??$/u;

/**
 * @param {string} utterance
 */
export function classifyApprovedPatternQuestion(utterance) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (!t) return null;
  if (WHERE_HELP_RE.test(t)) return "where_help";
  if (THREE_THINGS_RE.test(t)) return "three_things";
  if (OPEN_ACTIVITY_RE.test(t)) return "open_activity";
  if (TREND_RE.test(t)) return "trend";
  if (PARENT_ACTIVITY_RE.test(t)) return "parent_activity";
  if (SPEED_RE.test(t)) return "speed";
  if (LEARNING_SEVERITY_FOLLOWUP_RE.test(t)) return "learning_severity_followup";
  return null;
}

/**
 * @param {ReturnType<typeof topicAnchorFields>} a
 */
function buildTopicTruthPacket(payload, a, utterance, plannerIntent) {
  if (!a?.topicRowKey) return null;
  return buildTruthPacketV1(payload, {
    scopeType: "topic",
    scopeId: a.topicRowKey,
    scopeLabel: a.displayName || a.topicLabel,
    canonicalIntent: plannerIntent,
    parentUtterance: utterance,
  });
}

/**
 * @param {string} textHe
 * @param {object} focus
 */
function patternDraft(textHe, focus, plannerIntent) {
  return {
    answerBlocks: [{ type: "observation", textHe: String(textHe || "").trim(), source: "pattern_composer" }],
    plannerIntent,
    focusTopic: focus,
    answerComposerUsed: "pattern_composer",
  };
}

function composeWhereHelp(payload) {
  const weakTopics = pickWeakestTopics(collectTopicMetrics(payload), 2);
  if (!weakTopics.length) return null;
  const first = topicAnchorFields(weakTopics[0]);
  let text = `לפי הדוח, המקום הראשון שכדאי לחזק הוא ${first.subjectLabel} — ${first.topicLabel}: ${first.questionCount} שאלות, ${first.accuracyPercent}% הצלחה. זה הנושא שהכי כדאי להתחיל ממנו כי הוא גם מופיע בדוח וגם נותן כיוון ברור לתרגול קצר בבית.`;
  if (weakTopics.length >= 2) {
    const second = topicAnchorFields(weakTopics[1]);
    text += ` אחריו אפשר לשים לב גם ל־${second.subjectLabel} — ${second.topicLabel}: ${second.questionCount} שאלות, ${second.accuracyPercent}% הצלחה.`;
  }
  text += ` הצעד המעשי: לפתוח פעילות קצרה אחת בנושא הראשון, 5–10 דקות, ואז לבדוק אם התשובות הבאות יציבות יותר.`;
  return patternDraft(text, first, "what_is_still_difficult");
}

function composeThreeThings(payload) {
  const metas = collectTopicMetrics(payload);
  const strong = pickStrongForThreeThings(metas);
  const weak = pickWeakForThreeThings(metas);
  if (!metas.length) return null;

  let text = "שלושת הדברים הכי חשובים כרגע הם:\n\n";
  if (strong) {
    const s = topicAnchorFields(strong);
    text += `1. לשמר את מה שעובד: ${s.subjectLabel} — ${s.topicLabel}, עם ${s.questionCount} שאלות ו־${s.accuracyPercent}% הצלחה.\n\n`;
  } else {
    text += "1. קודם לצבור עוד תרגול קצר, כדי שהתמונה בדוח תהיה יציבה יותר.\n\n";
  }
  if (weak) {
    const w = topicAnchorFields(weak);
    text += `2. לחזק נקודה אחת: ${w.subjectLabel} — ${w.topicLabel}, עם ${w.questionCount} שאלות ו־${w.accuracyPercent}% הצלחה.\n\n`;
    text += `3. לעשות צעד קטן בבית: פעילות קצרה אחת בנושא ${w.topicLabel}, בלי להעמיס הרבה נושאים ביחד.`;
    return patternDraft(text, w, "what_is_most_important");
  }
  text += "2. אין כרגע נושא אחד שבולט מספיק לחיזוק, לכן כדאי לשמור על תרגול קצר ומגוון.\n\n";
  const fallbackWeak = pickWeakestTopic(metas);
  const wLabel = fallbackWeak ? fallbackWeak.label || fallbackWeak.displayName : "נושא";
  text += `3. לעשות צעד קטן בבית: פעילות קצרה אחת בנושא ${wLabel}, בלי להעמיס הרבה נושאים ביחד.`;
  const focus = fallbackWeak ? topicAnchorFields(fallbackWeak) : strong ? topicAnchorFields(strong) : topicAnchorFields(metas[0]);
  return patternDraft(text, focus, "what_is_most_important");
}

function composeOpenActivity(payload) {
  const weak = pickWeakestTopic(collectTopicMetrics(payload));
  if (!weak) return null;
  const a = topicAnchorFields(weak);
  const text = `כדאי לפתוח פעילות קצרה בנושא ${a.subjectLabel} — ${a.topicLabel}. בדוח מופיעות שם ${a.questionCount} שאלות עם ${a.accuracyPercent}% הצלחה, ולכן זה נושא טוב לתרגול ממוקד עכשיו. מומלץ לבחור פעילות קצרה אחת בלבד, כדי לראות אם יש שיפור לפני שעוברים לנושא נוסף.`;
  return patternDraft(text, a, "what_to_do_now");
}

function findTrendAnchor(payload) {
  const trends = payload?.executiveSummary?.majorTrendsHe;
  if (!Array.isArray(trends) || !trends.length) return null;
  const metas = collectTopicMetrics(payload);
  for (const line of trends) {
    const trendText = String(line || "").trim();
    if (!isRealTrendLineHe(trendText)) continue;
    for (const m of metas) {
      if (m.displayName && trendText.includes(m.displayName)) {
        return { ...topicAnchorFields(m), trendText };
      }
    }
    for (const sid of SUBJECT_ORDER) {
      const label = subjectLabelHe(sid);
      if (trendText.includes(label)) {
        const topic = pickWeakestTopic(metas.filter((x) => x.sid === sid)) || metas.find((x) => x.sid === sid);
        if (topic) return { ...topicAnchorFields(topic), trendText };
      }
    }
  }
  const trendText = trends
    .map((x) => String(x || "").trim())
    .find((t) => isRealTrendLineHe(t));
  const weak = pickWeakestTopic(metas);
  if (trendText && weak) return { ...topicAnchorFields(weak), trendText };
  return null;
}

function composeTrend(payload) {
  if (!exportTrendEvidence(payload)) return null;
  const anchor = findTrendAnchor(payload);
  if (!anchor?.trendText) return null;
  const text = `בדוח מופיע שינוי ב־${anchor.subjectLabel} — ${anchor.topicLabel}: ${anchor.trendText}. לכן אפשר לומר שיש כאן כיוון בדוח, אבל עדיין כדאי לבדוק אותו בעוד תרגול קצר.`;
  return patternDraft(text, anchor, "explain_report");
}

function composeParentActivity(payload) {
  const anchor = exportParentActivityEvidence(payload);
  if (!anchor) return null;
  const text = `בדוח מופיעה פעילות אישית בנושא ${anchor.subjectLabel} — ${anchor.topicLabel}. אחרי הפעילות מופיעות ${anchor.questionCount} שאלות עם ${anchor.accuracyPercent}% הצלחה. זה נותן כיוון ראשוני, אבל כדאי לבדוק עוד תרגול קצר לפני שמסיקים שינוי יציב.`;
  return patternDraft(text, anchor, "explain_report");
}

function composeSpeed(payload) {
  const anchor = exportSpeedEvidence(payload);
  if (!anchor) return null;
  const text = `בדוח מופיע סימן לכך שחלק מהתרגול היה במצב מהיר. לכן כדאי לבדוק את ${anchor.subjectLabel} — ${anchor.topicLabel} גם בתרגול רגיל, בלי לחץ זמן, ולראות אם התשובות יציבות יותר.`;
  return patternDraft(text, anchor, "explain_report");
}

function composeLearningSeverityFollowup(payload, conv) {
  const last = resolveLastTopicFromConv(payload, conv);
  if (!last?.questionCount) return null;
  const text = `מהדוח אפשר להתייחס לזה רק כנושא לימודי לתרגול. ב־${last.subjectLabel} — ${last.topicLabel} מופיעות ${last.questionCount} שאלות עם ${last.accuracyPercent}% הצלחה, ולכן ההמלצה היא להתחיל מתרגול קצר וממוקד, לא להסיק מעבר למה שהדוח מראה.`;
  return patternDraft(text, last, "explain_report");
}

/**
 * @param {unknown} payload
 * @param {object} conv
 */
function resolveLastTopicFromConv(payload, conv) {
  const topicKey = String(conv?.lastResolvedTopic || "").trim();
  const subjectId = String(conv?.lastResolvedSubject || "").trim();
  if (topicKey) {
    const metas = collectTopicMetrics(payload);
    const hit = metas.find((m) => m.topicRowKey === topicKey);
    if (hit) return topicAnchorFields(hit);
  }
  const weak = pickWeakestTopic(collectTopicMetrics(payload));
  return weak ? topicAnchorFields(weak) : null;
}

/**
 * @param {object} params
 */
export function tryComposePatternAnswerDraft(params) {
  const utteranceStr = String(params?.utteranceStr || "");
  const payload = params?.payload;
  const conv = params?.conversationState || {};
  const pattern = classifyApprovedPatternQuestion(utteranceStr);
  if (!pattern) return null;

  if (pattern === "learning_severity_followup") {
    const hasCtx =
      String(conv.lastResolvedTopic || "").trim() ||
      String(conv.lastResolvedSubject || "").trim() ||
      (Array.isArray(conv.priorScopes) && conv.priorScopes.length > 0);
    if (!hasCtx) return null;
  }

  /** @type {null|ReturnType<typeof patternDraft>} */
  let composed = null;
  switch (pattern) {
    case "where_help":
      composed = composeWhereHelp(payload);
      break;
    case "three_things":
      composed = composeThreeThings(payload);
      break;
    case "open_activity":
      composed = composeOpenActivity(payload);
      break;
    case "trend":
      composed = composeTrend(payload);
      break;
    case "parent_activity":
      composed = composeParentActivity(payload);
      break;
    case "speed":
      composed = composeSpeed(payload);
      break;
    case "learning_severity_followup":
      composed = composeLearningSeverityFollowup(payload, conv);
      break;
    default:
      break;
  }

  if (!composed) {
    return {
      noData: true,
      patternId: pattern,
      plannerIntent: "unknown_report_question",
    };
  }

  const truthPacket = buildTopicTruthPacket(payload, composed.focusTopic, utteranceStr, composed.plannerIntent);
  if (!truthPacket) {
    return {
      noData: true,
      patternId: pattern,
      plannerIntent: composed.plannerIntent,
    };
  }

  return {
    ...composed,
    patternId: pattern,
    truthPacket,
    scopeMeta: {
      generationPath: "pattern_composer",
      patternId: pattern,
      intentReason: `pattern:${pattern}`,
      scopeConfidence: 0.92,
      scopeReason: "approved_pattern_composer",
    },
  };
}

export function patternNoDataResponseHe() {
  return NO_DATA_FOR_REQUEST_RESPONSE_HE;
}
