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
  pickStableTopicForProgress,
  pickStableSubjectForProgress,
  resolveContextTopicMetrics,
  topicAnchorFields,
} from "./pattern-topic-metrics.js";
import { findTopicRowByKey } from "./contract-reader.js";
import {
  exportTrendEvidence,
  exportParentActivityEvidence,
  exportSpeedEvidence,
  isRealTrendLineHe,
  hasProgressComparisonTrend,
} from "./no-data-request-response.js";
import { detectAggregateQuestionClass } from "./semantic-question-class.js";

const WHERE_HELP_RE = /איפה\s+(?:ה(?:וא|יא)|(?:הילד|הילדה))\s+צ(?:ר|ר)יך\s+עזרה/u;
const THREE_THINGS_RE = /(?:מה\s+)?(?:שלוש(?:ת)?|3)\s*(?:ה)?דברים(?:\s+הכי\s+חשוב(?:ים)?)?(?:\s+להורה)?/u;
const OPEN_ACTIVITY_RE = /על\s+איזה\s+נושא\s+ל(?:פתוח|התחיל)(?:\s+(?:ל(?:ו|ה)|פעילות))?/u;
const TREND_RE =
  /מה\s+השתנה|משבוע\s+קודם|מהשבוע\s+קודם|השבוע\s+קודם|האם\s+(?:הוא|היא)\s+מתקדם|יש\s+שיפור|התקדמות/u;
const PARENT_ACTIVITY_RE = /הפעילות\s+.*השפיע|האם\s+הפעילות\s+.*השפיע|מה\s+נתתי\s+ל(?:ו|ה)/u;
const SPEED_RE =
  /האם\s+ז(?:ה|ו)\s+בגלל\s+לחץ\s+זמן|אולי\s+ז(?:ה|ו)\s+בגלל\s+מהירות|האם\s+(?:הוא|היא)\s+טע(?:ה|תה)\s+כי\s+עבד(?:ה)?\s+מהר|לחץ\s+זמן|עונה\s+מהר|מהר\s+מדי/u;
const HOME_TODAY_RE =
  /(?:^|\s)(?:מה\s+לעשות\s+(?:אית(?:ו|ה|ם)|עמ(?:ו|ה))(?:\s+בבית)?\s+היום|מה\s+לעשות\s+בבית(?:\s+היום)?|מה\s+עושים\s+עכשיו|ו?מה\s+לעשות\s+(?:עם\s+ז(?:ה|ו)\s+)?בבית)(?:\s*[.?؟]*)?$/u;
const ASK_AT_HOME_RE = /מה\s+לשאול\s+(?:אות(?:ו|ה)|את(?:ו|ה))\s+בבית/u;
const WHAT_NOT_INFER_RE = /מה\s+לא\s+כדאי\s+(?:לי\s+)?להסיק(?:\s+עדיין)?/u;
const PROGRESS_WHERE_RE =
  /איפה\s+רואים(?:\s+(?:ש(?:יפור|התקדמות)|(?:ש(?:ה)?)?מצב\s+טוב\s+יותר))?/u;
const IMPORTANT_NOW_RE =
  /מה\s+ה(?:כי\s+)?חשוב(?:\s+(?:כרגע|לי(?:\s+ל)?דעת(?:\s+השבוע)?|עכשיו))?|במה\s+להתמקד\s+(?:עכשיו|השבוע)?|מה\s+העיקר|מה\s+חשוב\s+עכשיו/u;
const AVOID_NOW_RE =
  /מה\s+כדאי\s+להימנע(?:\s+ממנ(?:ו|ה))?(?:\s+עכשיו)?|ממה\s+להימנע|מה\s+לא\s+(?:כדאי\s+)?(?:ל)?עשות|מה\s+לא\s+כדאי\s+(?:לי\s+)?להסיק/u;
const LEARNING_SEVERITY_FOLLOWUP_RE = /^(?:ז(?:ה|ו)\s+)?חמור\s*\??$/u;
const EXPLAIN_REPORT_SIMPLE_RE =
  /תסביר\s+לי\s+א(?:ת|ת)?\s+הדוח\s+במילים\s+פשוטות|במילים\s+פשוטות.*(?:א(?:ת|ת)?\s+)?(?:ה)?דוח|תסביר.*(?:א(?:ת|ת)?\s+)?(?:ה)?דוח.*(?:במילים\s+פשוטות|פשוט)/u;

export function matchesExplainReportSimpleWordsUtterance(utterance) {
  return EXPLAIN_REPORT_SIMPLE_RE.test(foldUtteranceForHeMatch(String(utterance || "")));
}

function globalReportQuestionCount(payload) {
  const s = payload?.summary || payload?.practiceSummary || {};
  const os = payload?.overallSnapshot && typeof payload.overallSnapshot === "object" ? payload.overallSnapshot : {};
  return Math.max(
    0,
    Number(s.totalAnswers ?? s.totalQuestions ?? os.totalQuestions ?? 0) || 0,
  );
}

function subjectRowsFromPayload(payload) {
  const coverage = payload?.overallSnapshot?.subjectCoverage;
  if (Array.isArray(coverage) && coverage.length) {
    return coverage
      .map((row) => ({
        sid: normalizeSubjectId(row?.subject),
        q: Math.max(0, Number(row?.questionCount ?? row?.answers ?? 0) || 0),
        acc: Math.max(0, Math.min(100, Math.round(Number(row?.accuracy ?? 0)))),
      }))
      .filter((r) => r.sid && r.q > 0);
  }
  const subjects = payload?.subjects && typeof payload.subjects === "object" ? payload.subjects : null;
  if (subjects && Object.keys(subjects).length) {
    return Object.entries(subjects).map(([sid, row]) => ({
      sid: normalizeSubjectId(sid),
      q: Math.max(0, Number(row?.answers ?? row?.questions ?? 0) || 0),
      acc: Math.max(0, Math.min(100, Math.round(Number(row?.accuracy ?? 0)))),
    })).filter((r) => r.sid && r.q > 0);
  }
  /** @type {Map<string, { q: number; correct: number }>} */
  const bySid = new Map();
  for (const m of collectTopicMetrics(payload)) {
    if (!m.sid) continue;
    const prev = bySid.get(m.sid) || { q: 0, correct: 0 };
    prev.q += m.q;
    prev.correct += Math.round((m.q * m.acc) / 100);
    bySid.set(m.sid, prev);
  }
  return [...bySid.entries()].map(([sid, v]) => ({
    sid,
    q: v.q,
    acc: v.q ? Math.round((v.correct / v.q) * 100) : 0,
  }));
}

function hasEnoughReportVolumeForSimpleExplain(payload) {
  if (globalReportQuestionCount(payload) >= 30) return true;
  return subjectRowsFromPayload(payload).some((r) => r.q >= 20);
}

/**
 * @param {unknown} payload
 * @param {string} excludeSid
 */
function stableSubjectPhraseList(payload, excludeSid) {
  const rows = subjectRowsFromPayload(payload)
    .filter((r) => r.sid !== excludeSid && r.q >= 8)
    .sort((a, b) => b.acc - a.acc || b.q - a.q);
  if (!rows.length) return "";
  return rows
    .slice(0, 4)
    .map((r) => `${subjectLabelHe(r.sid)} עם ${r.q} שאלות ו-${r.acc}%`)
    .join(", ");
}

function composeExplainReportSimpleWords(payload) {
  const weak = pickWeakestTopic(collectTopicMetrics(payload));
  if (!weak?.q) return null;
  const a = topicAnchorFields(weak);
  const stableList = stableSubjectPhraseList(payload, a.subjectId || "");
  let text =
    `במילים פשוטות: יש מספיק תרגול כדי לראות איפה להתחיל. הנקודה המרכזית היא ${a.subjectLabel} - ${a.topicLabel}: ${a.questionCount} שאלות עם ${a.accuracyPercent}% הצלחה. זה הנושא הראשון שכדאי לחזק.`;
  if (stableList) {
    text += ` לצד זה, יש תחומים שנראים יציבים יותר בתקופה הזו: ${stableList}.`;
  }
  text += ` לכן ההמלצה היא לא לפזר את התרגול: להתחיל ב${a.subjectLabel} - ${a.topicLabel}, 5–10 דקות, 3–5 שאלות בכל פעם, ואז לבדוק אם התשובות יציבות יותר.`;
  return patternDraft(text, a, "explain_report");
}

/**
 * Approved narrative for "תסביר לי את הדוח במילים פשוטות" when report volume is sufficient.
 * Not routed via classifyApprovedPatternQuestion — invoked explicitly from index.js.
 */
export function tryComposeExplainReportSimpleWordsDraft(params) {
  const utteranceStr = String(params?.utteranceStr || "");
  const payload = params?.payload;
  if (!matchesExplainReportSimpleWordsUtterance(utteranceStr)) return null;
  if (!hasEnoughReportVolumeForSimpleExplain(payload)) return null;
  const composed = composeExplainReportSimpleWords(payload);
  if (!composed) return null;

  const truthPacket = buildTruthPacketV1(payload, {
    scopeType: "topic",
    scopeId: composed.focusTopic?.topicRowKey || "explain-simple-words",
    scopeLabel: composed.focusTopic?.displayName || composed.focusTopic?.topicLabel || "סיכום דוח",
    canonicalIntent: "explain_report",
    parentUtterance: utteranceStr,
  });
  if (!truthPacket) return null;

  return {
    ...composed,
    patternId: "explain_report_simple_words",
    truthPacket,
    scopeMeta: {
      generationPath: "pattern_composer",
      patternId: "explain_report_simple_words",
      intentReason: "composer:explain_report_simple_words",
      scopeConfidence: 0.94,
      scopeReason: "approved_simple_explain_composer",
    },
  };
}

/**
 * @param {string} utterance
 */
export function classifyApprovedPatternQuestion(utterance) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (!t) return null;
  const aggregateClass = detectAggregateQuestionClass(utterance);
  if (aggregateClass === "recommendation_action" || aggregateClass === "improved") return null;
  if (PROGRESS_WHERE_RE.test(t)) return "progress_where";
  if (IMPORTANT_NOW_RE.test(t)) return "important_now";
  if (AVOID_NOW_RE.test(t)) return "avoid_now";
  if (HOME_TODAY_RE.test(t)) return "home_today";
  if (ASK_AT_HOME_RE.test(t)) return "ask_at_home";
  if (WHAT_NOT_INFER_RE.test(t)) return "what_not_infer";
  if (WHERE_HELP_RE.test(t)) return "where_help";
  if (THREE_THINGS_RE.test(t)) return "three_things";
  if (OPEN_ACTIVITY_RE.test(t)) return "open_activity";
  if (TREND_RE.test(t)) return "trend";
  if (PARENT_ACTIVITY_RE.test(t)) return "parent_activity";
  if (SPEED_RE.test(t)) return "speed";
  if (LEARNING_SEVERITY_FOLLOWUP_RE.test(t) && t.length <= 24) return "learning_severity_followup";
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
 */
function patternAnswerBlocks(textHe) {
  const text = String(textHe || "").trim();
  if (!text) return [];
  const sentenceBreak = text.search(/(?<=[.!?])\s+(?=\S)/u);
  if (sentenceBreak >= 12 && sentenceBreak < text.length - 12) {
    return [
      { type: "observation", textHe: text.slice(0, sentenceBreak).trim(), source: "pattern_composer" },
      { type: "meaning", textHe: text.slice(sentenceBreak).trim(), source: "pattern_composer" },
    ];
  }
  return [
    { type: "observation", textHe: text, source: "pattern_composer" },
    {
      type: "meaning",
      textHe: "זו תשובה ממוקדת לפי מה שמופיע בדוח בתקופה שנבחרה, בלי להסיק מעבר לנתונים שמוצגים.",
      source: "pattern_composer",
    },
  ];
}

/**
 * @param {string} textHe
 * @param {object} focus
 */
function patternDraft(textHe, focus, plannerIntent) {
  return {
    answerBlocks: patternAnswerBlocks(textHe),
    plannerIntent,
    focusTopic: focus,
    answerComposerUsed: "pattern_composer",
  };
}

function composeWhereHelp(payload) {
  const weakTopics = pickWeakestTopics(collectTopicMetrics(payload), 2);
  if (!weakTopics.length) return null;
  const first = topicAnchorFields(weakTopics[0]);
  let text = `לפי הדוח, המקום הראשון שכדאי לחזק הוא ${first.subjectLabel} - ${first.topicLabel}: ${first.questionCount} שאלות, ${first.accuracyPercent}% הצלחה. זה הנושא שהכי כדאי להתחיל ממנו כי הוא גם מופיע בדוח וגם נותן כיוון ברור לתרגול קצר בבית.`;
  if (weakTopics.length >= 2) {
    const second = topicAnchorFields(weakTopics[1]);
    text += ` אחריו אפשר לשים לב גם ל-${second.subjectLabel} - ${second.topicLabel}: ${second.questionCount} שאלות, ${second.accuracyPercent}% הצלחה.`;
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
    text += `1. לשמר את מה שעובד: ${s.subjectLabel} - ${s.topicLabel}, עם ${s.questionCount} שאלות ו-${s.accuracyPercent}% הצלחה.\n\n`;
  } else {
    text += "1. קודם לצבור עוד תרגול קצר, כדי שהתמונה בדוח תהיה יציבה יותר.\n\n";
  }
  if (weak) {
    const w = topicAnchorFields(weak);
    text += `2. לחזק נקודה אחת: ${w.subjectLabel} - ${w.topicLabel}, עם ${w.questionCount} שאלות ו-${w.accuracyPercent}% הצלחה.\n\n`;
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

function composeAvoidNow(payload, utteranceStr = "") {
  let text =
    "כרגע כדאי להימנע משלושה דברים: לא להסיק מסקנה אישית על הילד, לא לפתוח הרבה נושאים יחד, ולא להחליט לפי שאלה אחת או שתיים. לפי הדוח, עדיף לבחור נושא אחד לתרגול קצר, לבדוק כמה תשובות ברצף, ואז לראות אם הכיוון חוזר גם בהמשך.";
  const weak = pickWeakestTopic(collectTopicMetrics(payload));
  if (weak?.q) {
    const a = topicAnchorFields(weak);
    text += ` הנושא להתחלה: ${a.subjectLabel} - ${a.topicLabel}.`;
    return patternDraft(text, a, "what_not_to_do_now");
  }
  const truthPacket = buildTruthPacketV1(payload, {
    scopeType: "executive",
    scopeId: "executive",
    scopeLabel: "סיכום דוח",
    canonicalIntent: "what_not_to_do_now",
    parentUtterance: utteranceStr,
  });
  if (!truthPacket) return null;
  return {
    answerBlocks: patternAnswerBlocks(text),
    plannerIntent: "what_not_to_do_now",
    focusTopic: null,
    answerComposerUsed: "pattern_composer",
    truthPacket,
  };
}

function composeImportantNow(payload) {
  const metas = collectTopicMetrics(payload);
  const weak = pickWeakestTopic(metas);
  if (weak?.q) {
    const a = topicAnchorFields(weak);
    const text = `הדבר הכי חשוב כרגע הוא לבחור נושא אחד לחיזוק ולא לפזר את התרגול. לפי הדוח, המקום הראשון להתחלה הוא ${a.subjectLabel} - ${a.topicLabel}: ${a.questionCount} שאלות, ${a.accuracyPercent}% הצלחה. כדאי לתרגל 5–10 דקות, 3–5 שאלות, ואז לבדוק אם התשובות יציבות יותר.`;
    return patternDraft(text, a, "what_is_most_important");
  }
  const stable = pickStableTopicForProgress(metas);
  if (stable?.q) {
    const a = topicAnchorFields(stable);
    const text = `הדבר הכי חשוב כרגע הוא לשמור על תרגול קצר וקבוע. לפי הדוח, הנושא שנראה יציב יותר בתקופה הזו הוא ${a.subjectLabel} - ${a.topicLabel}: ${a.questionCount} שאלות, ${a.accuracyPercent}% הצלחה. כדאי לתרגל 5–10 דקות, 3–5 שאלות, ואז לבדוק אם היציבות נשמרת.`;
    return patternDraft(text, a, "what_is_most_important");
  }
  return null;
}

function composeProgressWhere(payload) {
  const trend = hasProgressComparisonTrend(payload) ? composeTrend(payload) : null;
  if (trend) return { ...trend, patternId: "progress_where" };

  const metas = collectTopicMetrics(payload);
  const stableTopic = pickStableTopicForProgress(metas);
  if (stableTopic?.q) {
    const a = topicAnchorFields(stableTopic);
    const text = `בדוח הנוכחי לא מופיעה השוואה מספיקה שמוכיחה שינוי מהשבוע הקודם. כן אפשר לראות איפה התרגול נראה יציב יותר בתקופה הזו: ${a.subjectLabel} - ${a.topicLabel}, עם ${a.questionCount} שאלות ו-${a.accuracyPercent}% הצלחה. לכן כדאי להמשיך שם בתרגול קצר ולבדוק אם היציבות נשמרת גם בהמשך.`;
    return patternDraft(text, a, "explain_report");
  }

  const subjectAnchor = pickStableSubjectForProgress(payload);
  if (subjectAnchor?.questionCount) {
    const text = `בדוח הנוכחי לא מופיעה השוואה מספיקה שמוכיחה שינוי מהשבוע הקודם. כן אפשר לראות איפה התרגול נראה יציב יותר בתקופה הזו: ${subjectAnchor.subjectLabel}, עם ${subjectAnchor.questionCount} שאלות ו-${subjectAnchor.accuracyPercent}% הצלחה. לכן כדאי להמשיך שם בתרגול קצר ולבדוק אם היציבות נשמרת גם בהמשך.`;
    const truthPacket = buildTruthPacketV1(payload, {
      scopeType: "subject",
      scopeId: subjectAnchor.subjectId,
      scopeLabel: subjectAnchor.subjectLabel,
      canonicalIntent: "explain_report",
      parentUtterance: "",
    });
    if (!truthPacket) return null;
    return {
      answerBlocks: patternAnswerBlocks(text),
      plannerIntent: "explain_report",
      focusTopic: subjectAnchor,
      answerComposerUsed: "pattern_composer",
      truthPacket,
    };
  }

  return null;
}

function composeHomeToday(payload, conv) {
  const weak = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: true });
  if (!weak?.q) return null;
  const a = topicAnchorFields(weak);
  let text = `היום הייתי עושה דבר אחד: פעילות קצרה בנושא ${a.subjectLabel} - ${a.topicLabel}. בדוח מופיעות שם ${a.questionCount} שאלות עם ${a.accuracyPercent}% הצלחה, ולכן זה מקום טוב לתרגול ממוקד. לעשות 5–10 דקות בלבד, 3–5 שאלות, ובסוף לשאול את הילד: איך חשבת על התשובה?`;
  const hit = findTopicRowByKey(payload, a.topicRowKey, a.subjectId || undefined);
  const sub =
    hit?.tr?.contractsV1?.evidence?.safeSubskillHe ||
    hit?.tr?.safeSubskillHe ||
    hit?.tr?.contractsV1?.narrative?.safeSubskillHe;
  if (String(sub || "").trim().length >= 3) {
    text += " אם מופיעה בדוח תת-מיומנות ברורה, כדאי להתמקד בה ולא לפתוח כמה נושאים ביחד.";
  }
  return patternDraft(text, a, "what_to_do_today");
}

function composeAskAtHome(payload, conv) {
  const weak = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: true });
  if (!weak?.q) return null;
  const a = topicAnchorFields(weak);
  const text = `אפשר לשאול אותו שלוש שאלות קצרות על ${a.subjectLabel} - ${a.topicLabel}:\n\n1. מה ביקשו ממך למצוא בשאלה?\n\n2. איך החלטת מה הצעד הראשון?\n\n3. איפה הרגשת שזה נהיה קשה?\n\nהמטרה היא להבין את דרך החשיבה שלו, לא לבחון אותו הרבה זמן.`;
  return patternDraft(text, a, "what_to_do_today");
}

function composeWhatNotInfer(payload, utterance) {
  const text =
    "לא כדאי להסיק מהדוח מסקנה אישית על הילד, ולא להשוות אותו לילדים אחרים. הדוח מציג רק את מה שקרה בתרגול באתר בתקופה שנבחרה: מקצועות, נושאים, כמות שאלות ודיוק. לכן נכון להתמקד בצעד לימודי קטן אחד לפי הנתונים, ולא להסיק מעבר למה שמופיע בדוח.";
  const truthPacket = buildTruthPacketV1(payload, {
    scopeType: "executive",
    scopeId: "executive",
    scopeLabel: "סיכום דוח",
    canonicalIntent: "report_trust_question",
    parentUtterance: utterance,
  });
  if (!truthPacket) return null;
  return {
    answerBlocks: patternAnswerBlocks(text),
    plannerIntent: "report_trust_question",
    focusTopic: null,
    answerComposerUsed: "pattern_composer",
    truthPacket,
    scopeMeta: {
      generationPath: "pattern_composer",
      patternId: "what_not_infer",
      intentReason: "pattern:what_not_infer",
      scopeConfidence: 0.95,
      scopeReason: "approved_pattern_composer",
    },
  };
}

function composeOpenActivity(payload) {
  const weak = pickWeakestTopic(collectTopicMetrics(payload));
  if (!weak) return null;
  const a = topicAnchorFields(weak);
  const text = `כדאי לפתוח פעילות קצרה בנושא ${a.subjectLabel} - ${a.topicLabel}. בדוח מופיעות שם ${a.questionCount} שאלות עם ${a.accuracyPercent}% הצלחה, ולכן זה נושא טוב לתרגול ממוקד עכשיו. מומלץ לבחור פעילות קצרה אחת בלבד, כדי לראות אם יש שיפור לפני שעוברים לנושא נוסף.`;
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
  const text = `בדוח מופיע שינוי ב-${anchor.subjectLabel} - ${anchor.topicLabel}: ${anchor.trendText}. לכן אפשר לומר שיש כאן כיוון בדוח, אבל עדיין כדאי לבדוק אותו בעוד תרגול קצר.`;
  return patternDraft(text, anchor, "explain_report");
}

function composeParentActivity(payload) {
  const anchor = exportParentActivityEvidence(payload);
  if (!anchor) return null;
  const text = `בדוח מופיעה פעילות אישית בנושא ${anchor.subjectLabel} - ${anchor.topicLabel}. אחרי הפעילות מופיעות ${anchor.questionCount} שאלות עם ${anchor.accuracyPercent}% הצלחה. זה נותן כיוון ראשוני, אבל כדאי לבדוק עוד תרגול קצר לפני שמסיקים שינוי יציב.`;
  return patternDraft(text, anchor, "explain_report");
}

function composeSpeed(payload) {
  const anchor = exportSpeedEvidence(payload);
  if (!anchor) return null;
  const text = `בדוח מופיע סימן לכך שחלק מהתרגול היה במצב מהיר. לכן כדאי לבדוק את ${anchor.subjectLabel} - ${anchor.topicLabel} גם בתרגול רגיל, בלי לחץ זמן, ולראות אם התשובות יציבות יותר.`;
  return patternDraft(text, anchor, "explain_report");
}

function composeLearningSeverityFollowup(payload, conv) {
  const last = resolveLastTopicFromConv(payload, conv);
  if (!last?.questionCount) return null;
  const text = `מהדוח אפשר להתייחס לזה רק כנושא לימודי לתרגול. ב-${last.subjectLabel} - ${last.topicLabel} מופיעות ${last.questionCount} שאלות עם ${last.accuracyPercent}% הצלחה, ולכן ההמלצה היא להתחיל מתרגול קצר וממוקד, לא להסיק מעבר למה שהדוח מראה.`;
  return patternDraft(text, last, "explain_report");
}

/**
 * @param {unknown} payload
 * @param {object} conv
 */
function resolveLastTopicFromConv(payload, conv) {
  const ctx = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: false });
  if (ctx) return topicAnchorFields(ctx);
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
    case "progress_where":
      composed = composeProgressWhere(payload);
      break;
    case "important_now":
      composed = composeImportantNow(payload);
      break;
    case "avoid_now": {
      const fixed = composeAvoidNow(payload, utteranceStr);
      if (fixed?.truthPacket) return { ...fixed, patternId: "avoid_now" };
      composed = fixed;
      break;
    }
    case "home_today":
      composed = composeHomeToday(payload, conv);
      break;
    case "ask_at_home":
      composed = composeAskAtHome(payload, conv);
      break;
    case "what_not_infer": {
      const fixed = composeWhatNotInfer(payload, utteranceStr);
      if (fixed) return { ...fixed, patternId: "what_not_infer" };
      return { noData: true, patternId: pattern, plannerIntent: "report_trust_question" };
    }
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

  if (composed.truthPacket) {
    return {
      ...composed,
      patternId: pattern,
      scopeMeta: composed.scopeMeta || {
        generationPath: "pattern_composer",
        patternId: pattern,
        intentReason: `pattern:${pattern}`,
        scopeConfidence: 0.92,
        scopeReason: "approved_pattern_composer",
      },
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
