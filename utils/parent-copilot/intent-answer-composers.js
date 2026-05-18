/**
 * Intent-specific Parent Copilot answer composers (not shared FAQ/metric blocks).
 */

import {
  findTopicRowByKey,
  listCopilotAnchoredTopicRows,
  normalizeSubjectId,
  subjectLabelHe,
  SUBJECT_ORDER,
} from "./contract-reader.js";
import { resolveReportRowFromUtterance } from "./report-row-resolver.js";
import { findDiagnosticUnitForIntelligence } from "./truth-packet-v1.js";
import { extractMistakePatternHeFromUnit, isMistakePatternQuestion } from "./topic-evidence-answer.js";
import {
  classifyPracticePolarity,
  meaningHeForPolarity,
  POLARITY,
  textViolatesPolarityForEvidence,
} from "./evidence-polarity.js";
import { parentFacingTopicRowLabelHe } from "../parent-report-topic-evidence.js";
import {
  classifySubjectEvidenceTier,
  SUBJECT_EVIDENCE_TIER,
  zeroEvidenceSubjectCopilotHe,
} from "../parent-report-language/subject-evidence-policy.js";
import { ANSWER_CONTRACT, resolveAnswerContract, subjectQuestionCountFromPayload } from "./intent-answer-contract.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";

const STRONG_ACC_MIN = 75;
const STRONG_Q_MIN = 8;
const WEAK_ACC_MAX = 54;

/**
 * @param {unknown} tr
 */
function rowMetrics(tr) {
  const q = Math.max(0, Number(tr?.questions ?? tr?.questionCount) || 0);
  const acc = Math.max(0, Math.min(100, Math.round(Number(tr?.accuracy) || 0)));
  const sid = normalizeSubjectId(tr?.subjectId || tr?.contractsV1?.evidence?.subjectId || "");
  const topicRowKey = String(tr?.topicRowKey || tr?.topicKey || "").trim();
  const displayName = String(tr?.displayName || "נושא").trim();
  const riv = tr?.rowIdentityV1 && typeof tr.rowIdentityV1 === "object" ? tr.rowIdentityV1 : {};
  return {
    q,
    acc,
    sid,
    topicRowKey,
    displayName,
    contentGradeKey: riv.contentGradeKey ?? null,
    gradeRelation: riv.gradeRelation ?? null,
    label: parentFacingTopicRowLabelHe({
      displayName,
      contentGradeKey: riv.contentGradeKey,
      gradeRelation: riv.gradeRelation,
      topicRowKey,
      registeredGradeKey: null,
    }),
  };
}

/**
 * All in-window topic rows with practice (matches real detailed-report UI rows).
 * @param {unknown} payload
 */
function collectPracticeMetrics(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  /** @type {ReturnType<typeof rowMetrics>[]} */
  const metas = [];
  for (const sp of profiles) {
    const sid = normalizeSubjectId(sp?.subject);
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const m = rowMetrics({ ...tr, subjectId: sid });
      if (m.q > 0) metas.push(m);
    }
  }
  if (metas.length) return metas;
  const anchored = listCopilotAnchoredTopicRows(payload);
  for (const { subject, tr } of anchored) {
    const m = rowMetrics({ ...tr, subjectId: subject });
    if (m.q > 0) metas.push(m);
  }
  return metas;
}

/**
 * Focus topic for mistake/home/topic contracts when scope is executive or inherited.
 * @param {object} params
 */
export function resolveFocusTopicContext(params) {
  const payload = params?.payload;
  const truthPacket = params?.truthPacket;
  const conv = params?.conversationState;

  if (String(truthPacket?.scopeType || "") === "topic" && truthPacket?.scopeId) {
    const subjectId = String(truthPacket.surfaceFacts?.subjectId || "").trim();
    const hit = findTopicRowByKey(payload, String(truthPacket.scopeId), subjectId);
    if (hit?.tr) {
      const m = rowMetrics({ ...hit.tr, subjectId: hit.subject || subjectId });
      return {
        topicRowKey: m.topicRowKey,
        subjectId: m.sid,
        displayName: m.displayName,
        gradeSplitTopicRowKeys: Array.isArray(truthPacket.gradeSplitTopicRowKeys)
          ? truthPacket.gradeSplitTopicRowKeys
          : [],
      };
    }
  }

  const lastTopic = String(conv?.lastResolvedTopic || "").trim();
  if (lastTopic) {
    const hit = findTopicRowByKey(payload, lastTopic);
    if (hit?.tr) {
      const m = rowMetrics({ ...hit.tr, subjectId: hit.subject });
      return { topicRowKey: m.topicRowKey, subjectId: m.sid, displayName: m.displayName, gradeSplitTopicRowKeys: [] };
    }
  }

  const metas = collectPracticeMetrics(payload);
  const weak = pickWeakestRow(metas) || metas.sort((a, b) => b.q - a.q)[0];
  if (!weak) return null;
  const sameName = metas.filter((m) => m.displayName === weak.displayName && m.sid === weak.sid);
  const gradeSplitTopicRowKeys =
    sameName.length >= 2 ? sameName.map((m) => m.topicRowKey).filter(Boolean) : [];
  return {
    topicRowKey: weak.topicRowKey,
    subjectId: weak.sid,
    displayName: weak.displayName,
    gradeSplitTopicRowKeys,
  };
}

/**
 * @param {string} contract
 */
function contractNeedsTopicFocus(contract) {
  return (
    contract === ANSWER_CONTRACT.mistake_pattern ||
    contract === ANSWER_CONTRACT.topic_problem ||
    contract === ANSWER_CONTRACT.home_practice ||
    contract === ANSWER_CONTRACT.topic_lookup
  );
}

/**
 * @param {unknown} payload
 */
function unpracticedSubjectLabels(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  /** @type {string[]} */
  const out = [];
  for (const sid of SUBJECT_ORDER) {
    const sp = profiles.find((p) => normalizeSubjectId(p?.subject) === sid);
    if (!sp) continue;
    const q = subjectQuestionCountFromPayload(payload, sid);
    if (classifySubjectEvidenceTier(q) === SUBJECT_EVIDENCE_TIER.none) {
      out.push(subjectLabelHe(sid));
    }
  }
  return out;
}

/**
 * @param {object} params
 */
function gatherTopicRowMetrics(params) {
  const payload = params.payload;
  const truthPacket = params.truthPacket;
  const subjectId =
    String(truthPacket?.surfaceFacts?.subjectId || "").trim() ||
    String(params?.subjectId || "").trim();
  const splitKeys = Array.isArray(truthPacket?.gradeSplitTopicRowKeys)
    ? truthPacket.gradeSplitTopicRowKeys.map((k) => String(k || "").trim()).filter(Boolean)
    : [];
  /** @type {ReturnType<typeof rowMetrics>[]} */
  const rows = [];
  if (splitKeys.length >= 2) {
    for (const key of splitKeys) {
      const hit = findTopicRowByKey(payload, key, subjectId);
      if (hit?.tr) rows.push(rowMetrics({ ...hit.tr, subjectId: hit.subject || subjectId }));
    }
  } else {
    const scopeId = String(truthPacket?.scopeId || "").trim();
    const hit = findTopicRowByKey(payload, scopeId, subjectId);
    if (hit?.tr) rows.push(rowMetrics({ ...hit.tr, subjectId: hit.subject || subjectId }));
  }
  return rows;
}

/**
 * @param {ReturnType<typeof rowMetrics>[]} rows
 */
function pickWeakestRow(rows) {
  const withQ = rows.filter((r) => r.q >= STRONG_Q_MIN);
  if (!withQ.length) return rows[0] || null;
  return [...withQ].sort((a, b) => a.acc - b.acc || b.q - a.q)[0];
}

/**
 * @param {ReturnType<typeof rowMetrics>[]} rows
 */
function gradeSplitNarrativeHe(rows) {
  if (rows.length < 2) return "";
  const parts = rows
    .filter((r) => r.q > 0)
    .map((r) => `${r.label}: ${r.q} שאלות, דיוק כ־${r.acc}%`)
    .join("; ");
  const weak = pickWeakestRow(rows);
  if (!parts) return "";
  let text = `באותו נושא יש תרגול בכמה רמות כיתה — ${parts}.`;
  if (weak) {
    text += ` הקו החלש יותר הוא ${weak.label} (דיוק ${weak.acc}%).`;
  }
  return text;
}

/**
 * @param {object} params
 */
function buildEvidenceUsed(params) {
  const truthPacket = params.truthPacket;
  const payload = params.payload;
  const subjectId = String(truthPacket?.surfaceFacts?.subjectId || "").trim();
  const scopeId = String(truthPacket?.scopeId || "").trim();
  const unit = findDiagnosticUnitForIntelligence(payload, subjectId, scopeId);
  const patternHe = extractMistakePatternHeFromUnit(unit);
  const diagLine = String(unit?.diagnosis?.lineHe || "").trim();
  return {
    questions: Number(truthPacket?.surfaceFacts?.questions) || 0,
    accuracy: Number(truthPacket?.surfaceFacts?.accuracy) || 0,
    grade: truthPacket?.surfaceFacts?.contentGradeKey ?? null,
    gradeRelation: truthPacket?.surfaceFacts?.gradeRelation ?? null,
    patternHe: patternHe || null,
    diagnosisLine: diagLine || null,
    recommendation: String(truthPacket?.contracts?.narrative?.textSlots?.action || "").trim() || null,
    noData:
      classifySubjectEvidenceTier(subjectQuestionCountFromPayload(payload, subjectId)) ===
      SUBJECT_EVIDENCE_TIER.none,
    rowSourceIds: Array.isArray(truthPacket?.gradeSplitTopicRowKeys)
      ? truthPacket.gradeSplitTopicRowKeys
      : scopeId
        ? [scopeId]
        : [],
  };
}

/**
 * @param {object} params
 */
function composeReportExplanation(params) {
  const payload = params.payload;
  const metas = collectPracticeMetrics(payload);
  const totalQ = metas.reduce((s, m) => s + m.q, 0);
  const subjectsPracticed = new Set(metas.map((m) => m.sid));
  const subjectLabels = [...subjectsPracticed].map((sid) => subjectLabelHe(sid));
  const strong = metas
    .filter((m) => m.q >= STRONG_Q_MIN && m.acc >= STRONG_ACC_MIN)
    .sort((a, b) => b.acc - a.acc || b.q - a.q)
    .slice(0, 2);
  const weak = metas
    .filter((m) => m.q >= STRONG_Q_MIN && m.acc <= WEAK_ACC_MAX)
    .sort((a, b) => a.acc - b.acc || b.q - a.q)
    .slice(0, 2);
  const unpracticed = unpracticedSubjectLabels(payload);

  const practicedPhrase =
    subjectLabels.length > 0
      ? `בטווח התקופה נרשם תרגול ב${subjectLabels.join(", ")} — סה״כ כ־${totalQ} שאלות.`
      : totalQ > 0
        ? `בטווח התקופה נרשמו כ־${totalQ} שאלות תרגול.`
        : "בטווח התקופה יש עדיין מעט מאוד תרגול — התמונה כללית עדיין חלקית.";

  /** @type {string[]} */
  const meaningParts = [];
  if (strong.length) {
    meaningParts.push(
      `מה שעובד יחסית טוב: ${strong.map((m) => `${subjectLabelHe(m.sid)} — ${m.displayName} (כ־${m.acc}% על ${m.q} שאלות)`).join("; ")}.`,
    );
  }
  if (weak.length) {
    const lead =
      weak.length === 1
        ? `הדבר המרכזי שדורש תשומת לב כרגע הוא ${subjectLabelHe(weak[0].sid)} — ${weak[0].displayName}`
        : `מקומות שדורשים חיזוק: ${weak.map((m) => `${subjectLabelHe(m.sid)} — ${m.displayName} (כ־${m.acc}%)`).join("; ")}`;
    meaningParts.push(`${lead}.`);
  } else if (!strong.length && metas.length) {
    meaningParts.push("אין עדיין קו חזק מאוד בולט — כדאי להמשיך תרגול קצר ולעקוב אחרי יציבות.");
  }
  if (unpracticed.length) {
    meaningParts.push(`מקצועות שלא תורגלו בתקופה: ${unpracticed.join(", ")}.`);
  }

  const action =
    weak.length > 0
      ? `השבוע: תרגול ממוקד 5–10 דקות ביום סביב ${weak[0].displayName}, ואז לבדוק אם הדיוק עולה.`
      : strong.length > 0
        ? "השבוע: לשמר תרגול קצר ושגרתי בנושאים החזקים, ולעקוב שהכיוון נשמר."
        : "השבוע: להוסיף תרגול קצר ממוקד בנושא אחד, ואז לחזור לשאול שוב על הדוח.";

  return {
    answerBlocks: [
      { type: "observation", textHe: practicedPhrase, source: "intent_composer" },
      { type: "meaning", textHe: meaningParts.join(" "), source: "intent_composer" },
      { type: "action", textHe: action, source: "intent_composer" },
    ],
    plannerIntent: "explain_report",
    answerComposerUsed: ANSWER_CONTRACT.report_explanation,
  };
}

/**
 * @param {object} params
 */
function composeTopicProblem(params) {
  const truthPacket = params.truthPacket;
  const payload = params.payload;
  const scopeType = String(truthPacket?.scopeType || "");
  let rowMetricsList = gatherTopicRowMetrics(params);
  if (scopeType === "subject") {
    const sid = normalizeSubjectId(truthPacket.scopeId);
    rowMetricsList = collectPracticeMetrics(payload).filter((m) => m.sid === sid);
  }
  const primary = pickWeakestRow(rowMetricsList) || rowMetricsList[0];
  if (!primary) return null;

  const displayName = String(truthPacket?.scopeLabel || primary.displayName || "הנושא").trim();
  const q = primary.q;
  const acc = primary.acc;
  const polarity = classifyPracticePolarity(q, acc);
  const unit = findDiagnosticUnitForIntelligence(payload, primary.sid, primary.topicRowKey);
  const patternHe = extractMistakePatternHeFromUnit(unit);
  const gradeNote = gradeSplitNarrativeHe(rowMetricsList);

  const registered = String(
    truthPacket?.surfaceFacts?.registeredGradeKey || payload?.registeredGradeKey || "",
  ).trim();

  /** @type {string[]} */
  const meaningParts = [];
  if (gradeNote) meaningParts.push(gradeNote);
  if (registered && primary.gradeRelation === "higher") {
    meaningParts.push(`חלק מהתרגול בוצע מעל הכיתה הרשומה (${registered}) — כדאי לקרוא את זה בנפרד מביצוע בכיתה הרשומה.`);
  } else if (primary.gradeRelation === "lower") {
    meaningParts.push("חלק מהתרגול בוצע ברמת בסיס/כיתה נמוכה — זה יכול להסביר פער מול תוכן כיתה רשומה.");
  }
  if (polarity === POLARITY.support_needed) {
    meaningParts.push(
      patternHe
        ? `ב${displayName} יש ${q} שאלות עם דיוק כ־${acc}% — נראה קושי חוזר: ${patternHe}. מבחינה לימודית, זה אומר שהבסיס עדיין לא יציב מספיק לפני שמוסיפים קושי.`
        : meaningHeForPolarity(displayName, q, acc) +
            " מבחינה לימודית, זה אומר שכדאי לחזק לפני שמסיקים שהכול יציב.",
    );
  } else if (polarity === POLARITY.thin) {
    meaningParts.push(`ב${displayName} יש עדיין מעט תרגול (${q} שאלות) — מוקדם לסגור מסקנה חדה.`);
  } else {
    meaningParts.push(
      `ב${displayName} נראית יציבות יחסית (${acc}% על ${q} שאלות) — עדיין כדאי לוודא שזה חוזר.`,
    );
  }

  const observation =
    rowMetricsList.length >= 2
      ? `ב${displayName} יש תרגול בכמה רמות כיתה בתקופה — להלן הפירוט לפי שורות בדוח.`
      : `ב${primary.label} בתקופה הזו יש ${q} שאלות, עם דיוק של כ־${acc}%.`;

  const action =
    polarity === POLARITY.support_needed
      ? `כדאי להתחיל בחיזוק ממוקד ב${displayName}: 5–10 דקות ביום, אותו סוג שאלה, ובדיקה אם הדיוק עולה לפני שמוסיפים רמה.`
      : `כדאי לשמר תרגול קצר ב${displayName} ולעקוב שהיציבות נשמרת.`;

  return {
    answerBlocks: [
      { type: "observation", textHe: observation, source: "intent_composer" },
      { type: "meaning", textHe: meaningParts.join(" "), source: "intent_composer" },
      { type: "action", textHe: action, source: "intent_composer" },
    ],
    plannerIntent: "what_is_still_difficult",
    answerComposerUsed: ANSWER_CONTRACT.topic_problem,
  };
}

/**
 * @param {object} params
 */
function composeMistakePattern(params) {
  const truthPacket = params.truthPacket;
  const payload = params.payload;
  const scopeType = String(truthPacket?.scopeType || "");
  let subjectId = String(truthPacket?.surfaceFacts?.subjectId || "").trim();
  let scopeId = String(truthPacket?.scopeId || "").trim();
  let displayName = String(truthPacket?.scopeLabel || truthPacket?.surfaceFacts?.displayName || "הנושא").trim();

  if (scopeType === "subject") {
    subjectId = String(truthPacket.scopeId || subjectId).trim();
    const rows = collectPracticeMetrics(payload)
      .filter((m) => m.sid === subjectId && m.q >= STRONG_Q_MIN)
      .sort((a, b) => a.acc - b.acc || b.q - a.q);
    const weak = rows[0];
    if (weak) {
      scopeId = weak.topicRowKey;
      displayName = weak.displayName;
    }
  }

  const unit = findDiagnosticUnitForIntelligence(payload, subjectId, scopeId);
  const patternHe = extractMistakePatternHeFromUnit(unit);
  const diagLine =
    unit?.diagnosis?.allowed !== false ? String(unit?.diagnosis?.lineHe || "").trim() : "";

  if (patternHe || diagLine) {
    const mistakeText = patternHe || diagLine;
    return {
      answerBlocks: [
        {
          type: "observation",
          textHe: `ב${displayName}, לפי מה שמופיע בדוח על דפוסי טעות:`,
          source: "intent_composer",
        },
        {
          type: "meaning",
          textHe: `הטעות הבולטת שחוזרת היא ${mistakeText}. זה סוג טעות שכדאי לזהות בזמן תרגול — לא רק לספור נכון/לא נכון.`,
          source: "intent_composer",
        },
        {
          type: "action",
          textHe: `תרגול ממוקד: 2–3 שאלות מאותו סוג, בלי לדלג על שלב — ולשאול את הילד לומר בקול מה הוא עושה לפני התשובה.`,
          source: "intent_composer",
        },
      ],
      plannerIntent: "what_is_still_difficult",
      answerComposerUsed: ANSWER_CONTRACT.mistake_pattern,
    };
  }

  return {
    answerBlocks: [
      {
        type: "observation",
        textHe: `ב${displayName} יש מספיק נתוני תרגול כדי לראות שיש קושי, אבל הדוח לא מפרט את סוג הטעות.`,
        source: "intent_composer",
      },
      {
        type: "meaning",
        textHe:
          "בדוח יש מספיק מידע על מצב הנושא, אבל אין פירוט מספיק כדי לזהות את סוג הטעות המדויק.",
        source: "intent_composer",
      },
      {
        type: "action",
        textHe:
          "כדי לאסוף את זה: בזמן תרגול, לרשום משפט אחד על מה הילד עשה לפני שטעה — אחרי 3–4 פעמים יופיע דפוס.",
        source: "intent_composer",
      },
    ],
    plannerIntent: "what_is_still_difficult",
    answerComposerUsed: ANSWER_CONTRACT.mistake_pattern,
  };
}

/**
 * @param {object} params
 */
function composeHomePractice(params) {
  const truthPacket = params.truthPacket;
  const displayName = String(truthPacket?.scopeLabel || truthPacket?.surfaceFacts?.displayName || "הנושא").trim();
  const utterance = foldUtteranceForHeMatch(String(params?.utteranceStr || ""));
  const duration =
    /כמה\s*זמן/u.test(utterance) ? "5–10 דקות ביום, לא יותר" : "בערך 5–10 דקות ביום";

  return {
    answerBlocks: [
      {
        type: "observation",
        textHe: `תכנית בית מעשית סביב ${displayName}:`,
        source: "intent_composer",
      },
      {
        type: "meaning",
        textHe: `${duration}: (1) 2–3 שאלות מאותו סוג בלי עזרה; (2) בדיקה קצרה יחד אחרי כל שאלה — מה עשית לפני התשובה; (3) לשים לב אם אותו סוג טעות חוזר.`,
        source: "intent_composer",
      },
      {
        type: "action",
        textHe: "לעקוב אחרי 3–4 ימים כאלה, ואז לבדוק בדוח אם הדיוק עולה או שהדפוס חוזר.",
        source: "intent_composer",
      },
    ],
    plannerIntent: /שבוע/u.test(utterance) ? "what_to_do_this_week" : "what_to_do_today",
    answerComposerUsed: ANSWER_CONTRACT.home_practice,
  };
}

/**
 * @param {object} params
 */
function composeStrength(params) {
  const payload = params.payload;
  const practicedSubjects = SUBJECT_ORDER.filter(
    (sid) => classifySubjectEvidenceTier(subjectQuestionCountFromPayload(payload, sid)) !== SUBJECT_EVIDENCE_TIER.none,
  );
  const metas = collectPracticeMetrics(payload)
    .filter((m) => m.q >= STRONG_Q_MIN && m.acc >= STRONG_ACC_MIN)
    .sort((a, b) => b.acc - a.acc || b.q - a.q)
    .slice(0, 3);

  if (practicedSubjects.length === 1 && metas.length === 0) {
    const sid = practicedSubjects[0];
    const subQ = subjectQuestionCountFromPayload(payload, sid);
    const subMetas = collectPracticeMetrics(payload).filter((m) => m.sid === sid);
    const best = [...subMetas].sort((a, b) => b.acc - a.acc || b.q - a.q)[0];
    return {
      answerBlocks: [
        {
          type: "observation",
          textHe: `בטווח התקופה תורגל רק ${subjectLabelHe(sid)} (${subQ} שאלות) — אין מספיק נתונים להשוואה בין מקצועות.`,
          source: "intent_composer",
        },
        {
          type: "meaning",
          textHe: best
            ? `לפי מה שיש בדוח, ${subjectLabelHe(sid)} הוא המקצוע היחיד עם תרגול — ${best.displayName} בכ־${best.acc}% על ${best.q} שאלות.`
            : `${subjectLabelHe(sid)} הוא המקצוע היחיד עם תרגול בטווח — אי אפשר לדרג «חזק/חלש» בין מקצועות.`,
          source: "intent_composer",
        },
      ],
      plannerIntent: "what_is_going_well",
      answerComposerUsed: ANSWER_CONTRACT.strength,
    };
  }

  if (!metas.length) {
    return {
      answerBlocks: [
        {
          type: "observation",
          textHe: "לפי מה שמופיע בדוח, אין עדיין נושא עם מספיק תרגול ודיוק גבוה כדי לקרוא לו «חזק» בביטחון.",
          source: "intent_composer",
        },
        {
          type: "meaning",
          textHe: "זה לא אומר שאין הצלחות — רק שעדיין מוקדם לסמן חוזק יציב לפי הנתונים בטווח.",
          source: "intent_composer",
        },
      ],
      plannerIntent: "what_is_going_well",
      answerComposerUsed: ANSWER_CONTRACT.strength,
    };
  }

  const list = metas
    .map((m) => `${subjectLabelHe(m.sid)} — ${m.displayName}: כ־${m.acc}% על ${m.q} שאלות`)
    .join("; ");

  const singleSubjectNote =
    practicedSubjects.length === 1
      ? `בטווח התקופה תורגל רק ${subjectLabelHe(practicedSubjects[0])} — אין מספיק נתונים להשוואה בין מקצועות. `
      : "";

  return {
    answerBlocks: [
      {
        type: "observation",
        textHe: `${singleSubjectNote}לפי נתוני התרגול בטווח, אלה התחומים החזקים יחסית בתוך מה שתורגל:`,
        source: "intent_composer",
      },
      { type: "meaning", textHe: list + ".", source: "intent_composer" },
      {
        type: "action",
        textHe: "כדאי לשמר תרגול קצר ושגרתי שם — בלי למהר להעלות רמה.",
        source: "intent_composer",
      },
    ],
    plannerIntent: "what_is_going_well",
    answerComposerUsed: ANSWER_CONTRACT.strength,
  };
}

/**
 * @param {object} params
 */
/**
 * @param {object} params
 */
function composeTopicLookup(params) {
  const payload = params.payload;
  const utteranceStr = String(params?.utteranceStr || "");
  const rowRes = resolveReportRowFromUtterance(utteranceStr, payload);
  const best = rowRes.best;
  const label = String(best?.displayName || "").trim();

  if (!best?.topicRowKey) {
    const tail = utteranceStr.replace(/^מה\s*(?:לגבי|עם)\s+/u, "").trim();
    return {
      answerBlocks: [
        {
          type: "observation",
          textHe: tail
            ? `בתקופה הזו אין נתוני תרגול על ${tail} בדוח הנוכחי.`
            : "בתקופה הזו אין נתוני תרגול על הנושא הזה בדוח הנוכחי.",
          source: "intent_composer",
        },
        {
          type: "meaning",
          textHe: "אפשר לבחור נושא אחר מהדוח, או לצבור תרגול בנושא הזה ולשאול שוב.",
          source: "intent_composer",
        },
      ],
      plannerIntent: "ask_topic_specific",
      answerComposerUsed: ANSWER_CONTRACT.topic_lookup,
    };
  }

  const hit = findTopicRowByKey(payload, best.topicRowKey, rowRes.subjectId || "");
  const m = hit?.tr ? rowMetrics({ ...hit.tr, subjectId: hit.subject }) : null;
  const q = m?.q ?? 0;
  if (q === 0) {
    return {
      answerBlocks: [
        {
          type: "observation",
          textHe: `בתקופה הזו אין נתוני תרגול על ${label || "הנושא"} בדוח הנוכחי.`,
          source: "intent_composer",
        },
        {
          type: "meaning",
          textHe: "הנושא מופיע ברשימה, אבל לא נספרו בו שאלות בטווח התאריכים.",
          source: "intent_composer",
        },
      ],
      plannerIntent: "ask_topic_specific",
      answerComposerUsed: ANSWER_CONTRACT.topic_lookup,
    };
  }

  return composeTopicProblem({
    ...params,
    truthPacket: {
      ...params.truthPacket,
      scopeType: "topic",
      scopeId: best.topicRowKey,
      scopeLabel: label,
      surfaceFacts: {
        ...(params.truthPacket?.surfaceFacts || {}),
        subjectId: m?.sid || rowRes.subjectId,
        displayName: label,
        questions: q,
        accuracy: m?.acc ?? 0,
      },
    },
  });
}

function composeZeroEvidence(params) {
  const subjectId = String(params?.subjectId || params?.truthPacket?.scopeId || "").trim();
  const label = subjectLabelHe(subjectId);
  return {
    answerBlocks: [
      {
        type: "observation",
        textHe: zeroEvidenceSubjectCopilotHe(label),
        source: "intent_composer",
      },
      {
        type: "meaning",
        textHe: "לכן אי אפשר להסיק מסקנה מהדוח הנוכחי על ביצועים במקצוע הזה.",
        source: "intent_composer",
      },
    ],
    plannerIntent: "explain_report",
    answerComposerUsed: ANSWER_CONTRACT.zero_evidence,
  };
}

/**
 * @param {object} params
 */
export function tryComposeIntentAnswer(params) {
  const truthPacketIn = params?.truthPacket;
  if (!truthPacketIn) return null;

  const utteranceStr = String(params?.utteranceStr || "");
  const payload = params?.payload;
  const conv = params?.conversationState;
  let truthPacket = truthPacketIn;
  const scopeType = String(truthPacket.scopeType || "");
  const stageAIntent = String(params?.plannerIntent || params?.stageAIntent || "");
  const inheritedScope = !!params?.inheritedScope;

  const contract = resolveAnswerContract({
    utteranceStr,
    scopeType,
    stageAIntent,
    truthPacket,
    payload,
    subjectId: truthPacket.scopeType === "subject" ? truthPacket.scopeId : truthPacket.surfaceFacts?.subjectId,
  });

  if (!contract) return null;

  if (
    (contract === ANSWER_CONTRACT.report_explanation || contract === ANSWER_CONTRACT.important_focus) &&
    scopeType !== "executive"
  ) {
    return null;
  }

  if (contract === ANSWER_CONTRACT.zero_evidence && scopeType !== "subject") return null;

  if (contractNeedsTopicFocus(contract) && scopeType !== "topic") {
    const focus = resolveFocusTopicContext({ payload, truthPacket, conversationState: conv });
    if (!focus?.topicRowKey) return null;
    truthPacket = {
      ...truthPacket,
      scopeType: "topic",
      scopeId: focus.topicRowKey,
      scopeLabel: focus.displayName,
      gradeSplitTopicRowKeys: focus.gradeSplitTopicRowKeys,
      surfaceFacts: {
        ...(truthPacket.surfaceFacts || {}),
        subjectId: focus.subjectId,
        displayName: focus.displayName,
        questions:
          collectPracticeMetrics(payload).find((m) => m.topicRowKey === focus.topicRowKey)?.q ??
          truthPacket.surfaceFacts?.questions,
        accuracy:
          collectPracticeMetrics(payload).find((m) => m.topicRowKey === focus.topicRowKey)?.acc ??
          truthPacket.surfaceFacts?.accuracy,
      },
    };
  }

  const base = {
    utteranceStr,
    truthPacket,
    payload,
    conversationState: conv,
    subjectId: String(truthPacket.surfaceFacts?.subjectId || truthPacket.scopeId || "").trim(),
  };

  let composed = null;
  switch (contract) {
    case ANSWER_CONTRACT.report_explanation:
    case ANSWER_CONTRACT.important_focus:
      composed = composeReportExplanation(base);
      if (composed && contract === ANSWER_CONTRACT.important_focus) {
        composed.answerComposerUsed = ANSWER_CONTRACT.important_focus;
        composed.plannerIntent = "what_is_most_important";
      }
      break;
    case ANSWER_CONTRACT.topic_lookup:
      composed = composeTopicLookup(base);
      break;
    case ANSWER_CONTRACT.topic_problem:
      composed = composeTopicProblem(base);
      break;
    case ANSWER_CONTRACT.mistake_pattern:
      composed = composeMistakePattern(base);
      break;
    case ANSWER_CONTRACT.home_practice:
      composed = composeHomePractice(base);
      break;
    case ANSWER_CONTRACT.strength:
      composed = composeStrength(base);
      break;
    case ANSWER_CONTRACT.zero_evidence:
      composed = composeZeroEvidence({
        ...base,
        subjectId: String(truthPacket.scopeId || "").trim(),
      });
      break;
    default:
      return null;
  }

  if (!composed?.answerBlocks?.length) return null;

  const evidenceUsed = buildEvidenceUsed(base);
  return {
    ...composed,
    answerContract: contract,
    evidenceUsed,
    inheritedScope,
    resolvedIntent: stageAIntent,
    resolvedScope: `${scopeType}:${truthPacket.scopeId || ""}`,
  };
}

/**
 * @param {object} draft
 */
export function fingerprintAnswerHe(draft) {
  const text = (draft?.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  return text
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export default {
  tryComposeIntentAnswer,
  fingerprintAnswerHe,
  ANSWER_CONTRACT,
};
