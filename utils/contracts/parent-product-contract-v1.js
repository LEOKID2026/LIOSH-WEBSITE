/**
 * Parent Product Contract V1
 * Deterministic parent-facing summary envelope for detailed report payloads.
 */

export const PARENT_PRODUCT_CONTRACT_VERSION = "v1";
export const PRODUCT_CONTRACT_MIN_EVIDENCE_QUESTIONS = 8;
export const PRODUCT_CONTRACT_MIN_TREND_POINTS = 3;

export const FORBIDDEN_INTERNAL_PARENT_TERMS = [
  "P1",
  "P2",
  "P3",
  "P4",
  "gate",
  "canonical",
  "actionState",
  "confidenceBand",
  "evidence contract",
  "withhold",
  "probe_only",
  "remediate_same_level",
  "maintain_and_strengthen",
  "decisionTier",
  "outputGating",
  "rowSignals",
];

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeForbiddenTerms(text) {
  let out = cleanText(text);
  for (const token of FORBIDDEN_INTERNAL_PARENT_TERMS) {
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "");
  }
  return cleanText(out);
}

export function getTrendEvidenceCounters(row) {
  const trend = row?.trend && typeof row.trend === "object" ? row.trend : null;
  const directPoints = Number(trend?.trendEvidencePoints);
  const nestedPoints = Number(trend?.evidence?.trendEvidencePoints);
  const points = Number.isFinite(directPoints)
    ? directPoints
    : Number.isFinite(nestedPoints)
      ? nestedPoints
      : 0;
  const directMin = Number(trend?.minTrendPointsRequired);
  const nestedMin = Number(trend?.evidence?.minTrendPointsRequired);
  const minRequired = Number.isFinite(directMin)
    ? directMin
    : Number.isFinite(nestedMin)
      ? nestedMin
      : PRODUCT_CONTRACT_MIN_TREND_POINTS;
  const validCurrentSessionCount = Number(
    trend?.validCurrentSessionCount ?? trend?.evidence?.validCurrentSessionCount
  );
  const validPreviousSessionCount = Number(
    trend?.validPreviousSessionCount ?? trend?.evidence?.validPreviousSessionCount
  );
  const statusRaw = cleanText(trend?.trendEvidenceStatus);
  const trendEvidenceStatus =
    statusRaw ||
    (points >= minRequired && points > 0 ? "sufficient" : "insufficient");
  return {
    trendEvidencePoints: Number.isFinite(points) ? points : 0,
    minTrendPointsRequired:
      Number.isFinite(minRequired) && minRequired > 0
        ? minRequired
        : PRODUCT_CONTRACT_MIN_TREND_POINTS,
    validCurrentSessionCount: Number.isFinite(validCurrentSessionCount)
      ? validCurrentSessionCount
      : 0,
    validPreviousSessionCount: Number.isFinite(validPreviousSessionCount)
      ? validPreviousSessionCount
      : 0,
    trendEvidenceStatus,
  };
}

function firstNonEmpty(...values) {
  for (const v of values) {
    const t = cleanText(v);
    if (t) return t;
  }
  return "";
}

function confidenceLabelHe(row) {
  const c = String(row?.confidenceLevel || "").toLowerCase();
  if (row?.thinEvidenceDowngraded || row?.gateReadiness === "insufficient") {
    return "כמה אפשר לסמוך על זה: עדיין לא גבוה - צריך עוד תרגול לפני שסוגרים תמונה ברורה.";
  }
  if (c === "high") return "כמה אפשר לסמוך על זה: די גבוה יחסית למידע שנאסף.";
  if (c === "moderate") return "כמה אפשר לסמוך על זה: בינוני - יש כיוון ברור, אבל כדאי לבדוק שוב אחרי עוד תרגול.";
  return "כמה אפשר לסמוך על זה: עדיין לא גבוה - כדאי להמשיך לתרגל ולבדוק שוב.";
}

function trendSummaryHe(row) {
  const trend = row?.trend && typeof row.trend === "object" ? row.trend : null;
  if (!trend) return "אין כרגע נתון מגמה מספק.";
  const counters = getTrendEvidenceCounters(row);
  if (counters.trendEvidenceStatus !== "sufficient") {
    return "אין מספיק נתוני מגמה תקינים כדי לקבוע כיוון שינוי.";
  }
  const dir = String(trend.accuracyDirection || "unknown");
  if (dir === "up") return "נראית מגמת שיפור מבוססת.";
  if (dir === "down") return "נראית ירידה לאחרונה - שווה לשים לב בשבוע הקרוב.";
  if (dir === "flat") return "נראית יציבות יחסית ללא שינוי מהותי.";
  return "אין כרגע נתון מגמה מספק.";
}

function nextCheckHe(row) {
  const q = Number(row?.questions) || 0;
  const counters = getTrendEvidenceCounters(row);
  if (q < PRODUCT_CONTRACT_MIN_EVIDENCE_QUESTIONS) {
    return `לאסוף לפחות ${PRODUCT_CONTRACT_MIN_EVIDENCE_QUESTIONS} שאלות איכותיות בנושא הזה לפני החלטת קושי.`;
  }
  if (
    counters.trendEvidencePoints > 0 &&
    counters.trendEvidencePoints < counters.minTrendPointsRequired
  ) {
    return `נדרשים לפחות ${counters.minTrendPointsRequired} מפגשים תקינים להשוואת מגמה אמינה.`;
  }
  return "להמשיך לתרגל עוד קצת ולבדוק יציבות לפני שינוי משמעותי.";
}

function buildEvidenceSummaryHe(row) {
  const q = Number(row?.questions) || 0;
  const acc = Math.round(Number(row?.accuracy) || 0);
  const t = Number(row?.timeMinutes) || 0;
  const trendLine = trendSummaryHe(row);
  return cleanText(`נאספו ${q} שאלות, דיוק ${acc}%, זמן תרגול ${t} דקות. ${trendLine}`);
}

function buildContractRow(row, subjectProfile) {
  const doNow = firstNonEmpty(row?.doNowHe, subjectProfile?.subjectDoNowHe, subjectProfile?.parentActionHe);
  const avoidNow = firstNonEmpty(row?.avoidNowHe, subjectProfile?.subjectAvoidNowHe);
  const why = firstNonEmpty(
    row?.whyThisRecommendationHe,
    row?.recommendationReasoningHe,
    subjectProfile?.summaryHe
  );
  const mainStatus = firstNonEmpty(
    subjectProfile?.summaryHe,
    `ב${subjectProfile?.subjectLabelHe || "המקצוע"} כדאי תרגול ממוקד וזהיר בשלב הזה.`
  );
  const mainPriority = firstNonEmpty(doNow, "להמשיך תרגול קצר ומדויק עם משימה אחת ברורה.");
  return {
    mainStatusHe: removeForbiddenTerms(mainStatus),
    mainPriorityHe: removeForbiddenTerms(mainPriority),
    whyHe: removeForbiddenTerms(why || "ההמלצה מבוססת על דיוק, כמות שאלות ודפוס עבודה בפועל."),
    doNowHe: removeForbiddenTerms(doNow || "לקבוע תרגול קצר וממוקד ולוודא הבנה לפני מעבר למשימה הבאה."),
    avoidNowHe: removeForbiddenTerms(avoidNow || "לא להעלות קושי לפני שמתקבלת יציבות עקבית."),
    confidenceHe: removeForbiddenTerms(confidenceLabelHe(row)),
    evidenceSummaryHe: removeForbiddenTerms(buildEvidenceSummaryHe(row)),
    nextCheckHe: removeForbiddenTerms(nextCheckHe(row)),
    evidence: {
      questionCount: Number(row?.questions) || 0,
      ...getTrendEvidenceCounters(row),
      thinEvidenceDowngraded: !!row?.thinEvidenceDowngraded,
    },
  };
}

function pickPrimaryRecommendation(subjectProfiles) {
  const all = [];
  for (const sp of Array.isArray(subjectProfiles) ? subjectProfiles : []) {
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const r of recs) all.push({ subjectProfile: sp, row: r });
  }
  if (all.length === 0) {
    const sps = Array.isArray(subjectProfiles) ? subjectProfiles : [];
    if (sps.length === 0) return null;
    const picked = [...sps].sort(
      (a, b) => (Number(b?.subjectQuestionCount) || 0) - (Number(a?.subjectQuestionCount) || 0)
    )[0];
    return {
      subjectProfile: picked,
      row: {
        questions: Number(picked?.subjectQuestionCount) || 0,
        accuracy: Number(picked?.subjectAccuracy) || 0,
        timeMinutes: 0,
        confidenceLevel: "low",
        gateReadiness: "insufficient",
        thinEvidenceDowngraded: true,
        doNowHe: firstNonEmpty(picked?.subjectDoNowHe, picked?.parentActionHe),
        avoidNowHe: firstNonEmpty(picked?.subjectAvoidNowHe),
        whyThisRecommendationHe: firstNonEmpty(picked?.summaryHe),
        trend: null,
      },
    };
  }
  const sorted = [...all].sort((a, b) => {
    const am = a.row?.isMainActionable === true ? 1 : 0;
    const bm = b.row?.isMainActionable === true ? 1 : 0;
    if (bm !== am) return bm - am;
    const ap = Number(a.row?._priorityScore) || 0;
    const bp = Number(b.row?._priorityScore) || 0;
    if (bp !== ap) return bp - ap;
    const aq = Number(a.row?.questions) || 0;
    const bq = Number(b.row?.questions) || 0;
    return bq - aq;
  });
  return sorted[0];
}

function isMonitoringOrInsufficientAction(text) {
  const t = cleanText(text);
  if (!t) return false;
  return ["מעקב", "ניטור", "איסוף", "נתונים", "אין מספיק"].some((w) => t.includes(w));
}

/**
 * @param {Record<string, unknown>} detailedReport
 */
export function buildParentProductContractV1(detailedReport) {
  const profiles = Array.isArray(detailedReport?.subjectProfiles)
    ? detailedReport.subjectProfiles
    : [];
  const pickedPrimary = pickPrimaryRecommendation(profiles);
  const executiveTopSubject = cleanText(
    detailedReport?.executiveSummary?.parentPriorityLadder?.rankedSubjects?.[0]?.subject
  );
  const executiveAction = cleanText(detailedReport?.executiveSummary?.topImmediateParentActionHe);
  let primary = pickedPrimary;
  if (
    executiveTopSubject &&
    !isMonitoringOrInsufficientAction(executiveAction) &&
    executiveTopSubject !== cleanText(pickedPrimary?.subjectProfile?.subject)
  ) {
    const matched = profiles.find((sp) => cleanText(sp?.subject) === executiveTopSubject);
    if (matched) {
      const recs = Array.isArray(matched?.topicRecommendations) ? matched.topicRecommendations : [];
      primary = {
        subjectProfile: matched,
        row: recs[0] || {
          questions: Number(matched?.subjectQuestionCount) || 0,
          accuracy: Number(matched?.subjectAccuracy) || 0,
          timeMinutes: 0,
          confidenceLevel: "low",
          gateReadiness: "insufficient",
          thinEvidenceDowngraded: true,
          doNowHe: firstNonEmpty(matched?.subjectDoNowHe, matched?.parentActionHe),
          avoidNowHe: firstNonEmpty(matched?.subjectAvoidNowHe),
          whyThisRecommendationHe: firstNonEmpty(matched?.summaryHe),
          trend: null,
        },
      };
    }
  }
  const top = primary
    ? buildContractRow(primary.row, primary.subjectProfile)
    : {
        mainStatusHe: "אין עדיין מספיק נתונים כדי לקבוע תמונת מצב מקצועית.",
        mainPriorityHe: "להתחיל בתרגול קצר ועקבי כדי לבנות בסיס מדידה.",
        whyHe: "נפח הנתונים הנוכחי נמוך ולכן אין בסיס לכיוון ברור.",
        doNowHe: "לבחור נושא אחד ולתרגל 10–15 דקות בכל מפגש.",
        avoidNowHe: "לא לשנות רמת קושי על בסיס מעט נתונים.",
        confidenceHe: "כמה אפשר לסמוך על זה: עדיין לא גבוה בשלב זה.",
        evidenceSummaryHe: "הנתונים הקיימים עדיין חלקיים.",
        nextCheckHe: `לאסוף לפחות ${PRODUCT_CONTRACT_MIN_EVIDENCE_QUESTIONS} שאלות לפני החלטה.`,
        evidence: {
          questionCount: 0,
          trendEvidencePoints: 0,
          trendEvidenceStatus: "insufficient",
          thinEvidenceDowngraded: true,
        },
      };

  const subjects = {};
  for (const sp of profiles) {
    const sid = String(sp?.subject || "");
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    const first = recs[0] || null;
    subjects[sid] = first
      ? buildContractRow(first, sp)
      : {
          mainStatusHe: removeForbiddenTerms(firstNonEmpty(sp?.summaryHe, "אין כרגע מספיק נתונים בנושא זה.")),
          mainPriorityHe: "להמשיך איסוף נתונים בסיסי.",
          whyHe: "אין עדיין מספיק נתון כדי להגדיר כיוון ברור.",
          doNowHe: "תרגול קצר וממוקד בנושא אחד.",
          avoidNowHe: "לא להסיק מסקנות חזקות ממספר קטן של שאלות.",
          confidenceHe: "כמה אפשר לסמוך על זה: עדיין לא גבוה.",
          evidenceSummaryHe: "נתון חסר או חלקי.",
          nextCheckHe: `לצבור לפחות ${PRODUCT_CONTRACT_MIN_EVIDENCE_QUESTIONS} שאלות לפני שינוי.`,
          evidence: {
            questionCount: Number(sp?.subjectQuestionCount) || 0,
            trendEvidencePoints: 0,
            trendEvidenceStatus: "insufficient",
            thinEvidenceDowngraded: true,
          },
        };
  }

  return {
    version: PARENT_PRODUCT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    primarySubjectId: String(primary?.subjectProfile?.subject || ""),
    top,
    subjects,
  };
}

export default {
  buildParentProductContractV1,
  PARENT_PRODUCT_CONTRACT_VERSION,
  PRODUCT_CONTRACT_MIN_EVIDENCE_QUESTIONS,
  PRODUCT_CONTRACT_MIN_TREND_POINTS,
  FORBIDDEN_INTERNAL_PARENT_TERMS,
};

