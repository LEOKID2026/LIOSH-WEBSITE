/**
 * Intent-specific Parent Copilot answer composers (not shared FAQ/metric blocks).
 */

import {
  findTopicRowByKey,
  listAllAnchoredTopicRows,
  normalizeSubjectId,
  subjectLabelHe,
  SUBJECT_ORDER,
} from "./contract-reader.js";
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
 * @param {unknown} payload
 */
function collectAnchoredMetrics(payload) {
  const rows = listAllAnchoredTopicRows(payload);
  /** @type {ReturnType<typeof rowMetrics>[]} */
  const metas = [];
  for (const { subject, tr } of rows) {
    const m = rowMetrics({ ...tr, subjectId: subject });
    if (m.q > 0) metas.push(m);
  }
  return metas;
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
  const metas = collectAnchoredMetrics(payload);
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
    rowMetricsList = collectAnchoredMetrics(payload).filter((m) => m.sid === sid);
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
    const rows = collectAnchoredMetrics(payload)
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
  const metas = collectAnchoredMetrics(payload)
    .filter((m) => m.q >= STRONG_Q_MIN && m.acc >= STRONG_ACC_MIN)
    .sort((a, b) => b.acc - a.acc || b.q - a.q)
    .slice(0, 3);

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

  return {
    answerBlocks: [
      {
        type: "observation",
        textHe: `לפי נתוני התרגול בטווח, אלה התחומים החזקים יחסית:`,
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
  const truthPacket = params?.truthPacket;
  if (!truthPacket) return null;

  const utteranceStr = String(params?.utteranceStr || "");
  const payload = params?.payload;
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

  if (contract === ANSWER_CONTRACT.report_explanation && scopeType !== "executive") return null;

  if (
    contract === ANSWER_CONTRACT.mistake_pattern &&
    scopeType !== "topic" &&
    scopeType !== "subject"
  ) {
    return null;
  }

  if (
    contract === ANSWER_CONTRACT.topic_problem &&
    scopeType !== "topic" &&
    scopeType !== "subject"
  ) {
    return null;
  }

  if (contract === ANSWER_CONTRACT.zero_evidence && scopeType !== "subject") return null;

  const base = {
    utteranceStr,
    truthPacket,
    payload,
    subjectId: String(truthPacket.surfaceFacts?.subjectId || truthPacket.scopeId || "").trim(),
  };

  let composed = null;
  switch (contract) {
    case ANSWER_CONTRACT.report_explanation:
      composed = composeReportExplanation(base);
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
