import {
  MIN_PATTERN_FAMILY_FOR_DIAGNOSIS,
  MIN_MISTAKES_FOR_STRONG_RECOMMENDATION,
  normalizeMistakeEvent,
  mistakePatternClusterKey,
} from "./mistake-event.js";
import {
  weaknessLabelHe,
  sessionRowLabelHe,
  GENERIC_WEAKNESS_HE,
} from "./diagnostic-labels-he.js";
import {
  CONCLUSION_FRESHNESS_LABEL_HE,
  EXPECTED_VS_OBSERVED_MATCH_LABEL_HE,
  FOLLOW_THROUGH_SIGNAL_LABEL_HE,
  GATE_STATE_LABEL_HE,
  DEPENDENCY_STATE_LABEL_HE,
  FOUNDATIONAL_BLOCKER_LABEL_HE,
  INTERVENTION_TYPE_LABEL_HE,
  LEARNING_STAGE_LABEL_HE,
  MISTAKE_PATTERN_LABEL_HE,
  NEXT_BEST_SEQUENCE_STEP_LABEL_HE,
  NEXT_CYCLE_DECISION_FOCUS_LABEL_HE,
  PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE,
  RECALIBRATION_NEED_LABEL_HE,
  RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE,
  RECOMMENDATION_MEMORY_STATE_LABEL_HE,
  RECOMMENDATION_ROTATION_NEED_LABEL_HE,
  RESPONSE_TO_INTERVENTION_LABEL_HE,
  ROOT_CAUSE_LABEL_HE,
  SUPPORT_ADJUSTMENT_NEED_LABEL_HE,
  SUPPORT_SEQUENCE_STATE_LABEL_HE,
  TARGET_EVIDENCE_TYPE_LABEL_HE,
  TARGET_OBSERVATION_WINDOW_LABEL_HE,
} from "./parent-report-ui-explain-he.js";
import { PARENT_DIAGNOSTIC_TYPE_LABEL_HE } from "./parent-report-language/parent-report-hebrew-copy-spec.js";
import { pickRecommendedInterventionType } from "./topic-next-step-phase2.js";
import { mathReportBaseOperationKey, canonicalParentReportGradeKey } from "./math-report-generator.js";
import {
  splitTopicRowKey,
  mistakeMathScopeComplete,
  mathScopeLevelFromField,
  normalizeMistakeModeField,
} from "./parent-report-row-diagnostics.js";
import { applyMathScopedParentDisplayNames } from "./math-topic-parent-display.js";
import { normalizeParentFacingHe } from "./parent-report-language/parent-facing-normalize-he.js";
import { mergeSubjectConclusionReadinessContract } from "./minimal-safe-scope-enforcement.js";

/**
 * מזהה נושא עקבי לצורך reconciliation (אותו bucket כמו בטעויות / שורת דוח).
 * @param {string} subjectId
 * @param {string} topicRowKey
 * @param {Record<string, unknown>|null|undefined} row
 */
function stableTopicBucketBase(subjectId, topicRowKey, row) {
  const bk =
    row && typeof row === "object" && row.bucketKey != null && row.bucketKey !== ""
      ? String(row.bucketKey)
      : splitTopicRowKey(String(topicRowKey)).bucketKey;
  if (subjectId === "math") return mathReportBaseOperationKey(bk);
  return String(bk || "").trim();
}

/**
 * תואם סף "חוזקה" ב-buildSessionBands: דיוק גבוה + מספיק שאלות, בלי needsPractice.
 */
function isHighAccuracySessionRow(row) {
  if (!row || typeof row !== "object") return false;
  const q = Number(row.questions) || 0;
  const acc = Number(row.accuracy) || 0;
  if (q < 8) return false;
  if (row.needsPractice) return false;
  if (row.excellent && q >= 10) return true;
  return acc >= 87;
}

/** דיוק נמוך לצורך true_weakness כשיש דפוס טעויות */
function isLowAccuracySessionRow(row) {
  if (!row || typeof row !== "object") return false;
  const acc = Number(row.accuracy) || 0;
  if (row.needsPractice) return true;
  return acc < 70;
}

function bucketBaseFromMistakeSample(subjectId, sampleEv) {
  if (!sampleEv || typeof sampleEv !== "object") return "";
  if (subjectId === "math") {
    return mathReportBaseOperationKey(
      String(sampleEv.bucketKey || sampleEv.topicOrOperation || "")
    );
  }
  return String(sampleEv.topicOrOperation || sampleEv.bucketKey || "").trim();
}

function findWeaknessCandidateForTopWeakness(weaknessCandidates, w) {
  const found = weaknessCandidates.find(
    (c) => c.labelHe === w.labelHe && c.mistakeCount === w.mistakeCount
  );
  if (found) return found;
  const m = /^[^:]+:w:(\d+)$/.exec(String(w.id || ""));
  if (m) {
    const idx = Number(m[1]);
    if (Number.isFinite(idx) && weaknessCandidates[idx]) return weaknessCandidates[idx];
  }
  return null;
}

function buildStrengthWithCautionLines(row, mistakeCount) {
  const label = normalizeParentFacingHe(String(row?.displayName || "הנושא").trim() || "הנושא");
  const acc = Number(row?.accuracy) || 0;
  const q = Number(row?.questions) || 0;
  const n = Number(mistakeCount) || 0;
  return [
    `ב${label} נראית שליטה טובה בתקופה שנבחרה: כ ${acc}% נכון מתוך ${q} שאלות.`,
    `כשיש טעות, לפעמים חוזר אותו דפוס (${n} מקרים דומים בתקופה שנבחרה) - כדאי לעצור רגע על דוגמה אחת ביחד.`,
    `מה כדאי לעשות ביחד: לבחור תרגיל אחד קצר, לעבור עליו בקול צעד אחר צעד, ואז לתת לילד לנסות שוב בעצמו.`,
  ];
}

/**
 * מונע חפיפה בין חולשה ראשית לבין שורת נושא עם דיוק גבוה (Batch 1 — לוגיקה בלבד, ללא שינוי UI).
 * @returns {{
 *   topWeaknesses: object[],
 *   parentTopicToneByKey: Record<string, string>,
 *   parentStrengthWithCautionLinesByKey: Record<string, string[]>,
 *   suppressedCautionByBucket: Map<string, { mistakeCount: number, lines: string[] }>,
 * }}
 */
function reconcileParentFacingTopicSignals(
  subjectId,
  report,
  weaknessCandidates,
  topWeaknessesPre
) {
  const rowsKey = REPORT_ROWS_KEY[subjectId];
  const map =
    rowsKey && report && typeof report === "object" && report[rowsKey] && typeof report[rowsKey] === "object"
      ? report[rowsKey]
      : {};

  /** @type {Map<string, { mistakeCount: number, lines: string[] }>} */
  const suppressedCautionByRowKey = new Map();
  const filteredWeaknesses = [];

  function mathWeaknessSampleMatchesRow(topicRowKey, sampleEv) {
    if (subjectId !== "math") return true;
    const ev = sampleEv && typeof sampleEv === "object" ? sampleEv : null;
    if (!mistakeMathScopeComplete(ev)) return false;
    const parts = splitTopicRowKey(String(topicRowKey));
    if (parts.gradeScope == null || parts.levelScope == null) return false;
    const g = canonicalParentReportGradeKey(ev.grade);
    const l = mathScopeLevelFromField(ev.level);
    const m = normalizeMistakeModeField(ev.mode);
    return (
      parts.gradeScope === g &&
      parts.levelScope === l &&
      (parts.modeKey || "learning") === m
    );
  }

  for (const w of topWeaknessesPre) {
    const cand = findWeaknessCandidateForTopWeakness(weaknessCandidates, w);
    const bucket = bucketBaseFromMistakeSample(subjectId, cand?.sampleEvent);
    if (!bucket) {
      filteredWeaknesses.push(w);
      continue;
    }
    const rowKeys = Object.keys(map).filter((k) => {
      const row = map[k];
      if (!row || typeof row !== "object") return false;
      if ((Number(row.questions) || 0) <= 0) return false;
      if (stableTopicBucketBase(subjectId, k, row) !== bucket) return false;
      return mathWeaknessSampleMatchesRow(k, cand?.sampleEvent);
    });
    const hasHigh = rowKeys.some((k) => isHighAccuracySessionRow(map[k]));
    if (hasHigh) {
      let bestKey = rowKeys[0];
      let bestAcc = -1;
      for (const k of rowKeys) {
        const r = map[k];
        if (!isHighAccuracySessionRow(r)) continue;
        const a = Number(r.accuracy) || 0;
        if (a > bestAcc) {
          bestAcc = a;
          bestKey = k;
        }
      }
      const bestRow = map[bestKey];
      const lines = buildStrengthWithCautionLines(bestRow, cand?.mistakeCount ?? w.mistakeCount);
      suppressedCautionByRowKey.set(String(bestKey), {
        mistakeCount: cand?.mistakeCount ?? w.mistakeCount,
        lines,
      });
      continue;
    }
    filteredWeaknesses.push(w);
  }

  const parentTopicToneByKey = {};
  const parentStrengthWithCautionLinesByKey = {};

  for (const k of Object.keys(map)) {
    const row = map[k];
    if (!row || typeof row !== "object") continue;
    if ((Number(row.questions) || 0) <= 0) continue;
    if (suppressedCautionByRowKey.has(String(k))) {
      parentTopicToneByKey[k] = "strength_with_caution";
      const pack = suppressedCautionByRowKey.get(String(k));
      if (pack?.lines && !parentStrengthWithCautionLinesByKey[k]) {
        parentStrengthWithCautionLinesByKey[k] = pack.lines;
      }
    }
  }

  const weaknessTargetRowKeys = new Set();
  for (const w of filteredWeaknesses) {
    const cand = findWeaknessCandidateForTopWeakness(weaknessCandidates, w);
    const bucket = bucketBaseFromMistakeSample(subjectId, cand?.sampleEvent);
    if (!bucket) continue;
    for (const k of Object.keys(map)) {
      const row = map[k];
      if (!row || typeof row !== "object") continue;
      if ((Number(row.questions) || 0) <= 0) continue;
      if (stableTopicBucketBase(subjectId, k, row) !== bucket) continue;
      if (!mathWeaknessSampleMatchesRow(k, cand?.sampleEvent)) continue;
      weaknessTargetRowKeys.add(String(k));
    }
  }

  for (const k of Object.keys(map)) {
    const row = map[k];
    if (!row || typeof row !== "object") continue;
    if ((Number(row.questions) || 0) <= 0) continue;
    if (parentTopicToneByKey[k]) continue;
    if (weaknessTargetRowKeys.has(String(k)) && isLowAccuracySessionRow(row)) {
      parentTopicToneByKey[k] = "true_weakness";
    } else if (isHighAccuracySessionRow(row)) {
      parentTopicToneByKey[k] = "strength";
    } else {
      parentTopicToneByKey[k] = "stable_monitor";
    }
  }

  return {
    topWeaknesses: filteredWeaknesses,
    parentTopicToneByKey,
    parentStrengthWithCautionLinesByKey,
    suppressedCautionByBucket: suppressedCautionByRowKey,
  };
}

function mergeParentActionWithCautionBlocks(parentActionHe, parentStrengthWithCautionLinesByKey) {
  const keys = Object.keys(parentStrengthWithCautionLinesByKey || {});
  if (!keys.length) return parentActionHe || null;
  const firstKey = keys[0];
  const lines = parentStrengthWithCautionLinesByKey[firstKey];
  if (!Array.isArray(lines) || lines.length < 3) return parentActionHe || null;
  const block = lines.join(" ").trim();
  const base = typeof parentActionHe === "string" ? parentActionHe.trim() : "";
  if (!base) return block;
  if (base.includes(lines[0])) return base;
  return `${block} ${base}`.trim();
}
/**
 * סיווג גס לסגנון פעולה בבית — לפי תווית חולשה בעברית בלבד.
 * @returns {"wording"|"careless"|"foundation"}
 */
function inferWeaknessKindHe(labelHe) {
  const s = String(labelHe || "").toLowerCase();
  const h = `${labelHe || ""}`;
  if (
    /ניסוח|הבנה|הוראות|משימה|קריאה|מילולי|משפט|חיבור|הבנת הנקרא|האזנה/i.test(h) ||
    s.includes("reading") ||
    s.includes("listening")
  ) {
    return "wording";
  }
  if (/איות|דיוק|רשלנות|תשומת לב|שגיא|טעות|חוסר/i.test(h) || s.includes("spelling")) {
    return "careless";
  }
  return "foundation";
}

/**
 * === Subject narrative payload (patternDiagnostics.subjects[subjectId]) ===
 *
 * A) Shape (extends legacy fields; narrative is the source of truth for UI):
 * - subject, subjectLabelHe
 * - summaryHe: string | null
 * - topStrengths: Array<{ id, labelHe, questions, accuracy, confidence, needsPractice, excellent, tierHe }>
 * - topWeaknesses: Array<{ id, labelHe, mistakeCount, confidence, tierHe }>
 * - parentTopicToneByKey: Record<topicRowKey, "strength"|"strength_with_caution"|"stable_monitor"|"true_weakness"> - reconciliation מול שורות דוח
 * - parentStrengthWithCautionLinesByKey: Record<topicRowKey, [string,string,string]> — חיובי, הסתייגות על דפוס בטעויות, כיוון לבית (רק ב strength_with_caution)
 * - stableExcellence: Array<{ id, labelHe, questions, accuracy, confidence, needsPractice, excellent, tierHe }> — סף גבוה, נפרד מ maintain
 * - maintain, improving: session bands + tierHe על כל שורה
 * - parentActionHe: string | null  (max 1 concrete home action)
 * - nextWeekGoalHe: string | null   (חיזוק + שימור when data allows)
 * - evidenceExamples: Array<{ type: "mistake"|"success", ... }>  (max 2; only moderate/high confidence)
 *
 * B) Ranking:
 * - Weaknesses: clusters by mistakePatternClusterKey, sort by mistakeCount desc → top 3 (≥ MIN_PATTERN_FAMILY).
 * - topStrengths: merge excellent-pool + strengths-pool (disjoint), sort by
 *   (excellent desc, accuracy desc, questions desc) → top 3.
 * - stableExcellence / maintain / improving: סריקת שורות דוח (ממוין דיוק) לדליים נפרדים — stableExcellence קודם (סף גבוה), אחר כך excellent/strengths/maintain/improving (ללא כפילויות).
 *
 * C) summaryHe: 1–2 Hebrew sentences — positives (stableExcellence, topStrengths, maintain), risks (topWeaknesses or improving),
 *    stability note if mistakeCount ≥ MIN_MISTAKES_FOR_STRONG_RECOMMENDATION, sparse-data note if needed.
 *
 * D) parentActionHe: one imperative block with duration + focus + method; prefers top weakness, else improving, else maintain.
 *    nextWeekGoalHe: optional "יעד לחיזוק" from top weakness or improving + "יעד לשימור" from topStrengths[0] or maintain[0]
 *    when questions ≥ 8 or excellent.
 *
 * E) UI: parent-report maps each tierHe to the card subtitle (not everything is "חולשה"; maintain → "שמירה על רמה טובה"; stableExcellence → "הילד מצליח בנושא הזה לאורך זמן").
 */

const SUBJECT_IDS = [
  "math",
  "geometry",
  "english",
  "science",
  "history",
  "hebrew",
  "moledet-geography",
];

const REPORT_ROWS_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historySubtopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

const SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  history: "היסטוריה",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
  moledet: "מולדת",
  geography: "גאוגרפיה",
};

/** Narrative caps (professional profile) */
const MAX_TOP_WEAKNESSES = 3;
const MAX_TOP_STRENGTHS = 3;
const MAX_MAINTAIN = 2;
const MAX_IMPROVING = 2;
/** עד כמה שורות "הילד מצליח בנושא הזה לאורך זמן" (נפרד מ maintain / חוזקות מובילות) */
const MAX_STABLE_EXCELLENCE = 3;
/** סף הצלחה לאורך זמן: לא מכריזים מהר — דיוק גבוה + מספיק שאלות בטווח */
const STABLE_EXCELLENCE_MIN_ACCURACY = 92;
const STABLE_EXCELLENCE_MIN_QUESTIONS = 22;
/** Internal pool before merge/rank */
const INTERNAL_SESSION_POOL = 12;

/** ברירת מחדל לשורת סשן בלי שם בעברית — בכרטיס "מגמת שיפור" מוצגת מילה קצרה */
const IMPROVING_GENERIC_PRACTICE_LABEL_ALIASES = new Set(["בנושא תרגול", "נושא בתרגול"]);

/**
 * תווית לתצוגה בכרטיסי "תחום במגמת שיפור" (ולדוחות ישנים במטמון).
 * @param {string|null|undefined} labelHe
 */
export function improvingDiagnosticsDisplayLabelHe(labelHe) {
  const lab = String(labelHe || "").trim();
  if (IMPROVING_GENERIC_PRACTICE_LABEL_ALIASES.has(lab)) return "תרגול";
  return lab;
}

/**
 * ניסוח קצר להורה מכל תווית חולשה - "בנושא חיבור" במקום "קושי נקודתי בחיבור" / "סביב הנושא …".
 * @param {string|null|undefined} labelHe
 */
function parentCopyTopicPhraseHe(labelHe) {
  const s = String(labelHe || "").trim();
  if (!s) return "בנושא שנבחר בתרגול";
  if (s === GENERIC_WEAKNESS_HE) return "בנושא שזוהה בתרגול";
  if (/^בנושא(\s|\/)/u.test(s)) return s;

  const tailed = [
    /^קושי נקודתי ב(.+)$/u,
    /^קושי חוזר \/ קושי שחוזר ב(.+)$/u,
    /^קושי חוזר ב(.+)$/u,
  ];
  for (const re of tailed) {
    const m = s.match(re);
    if (m) return `בנושא ${m[1].trim()}`;
  }

  const dePattern = s.replace(/^דפוס שגיאות:\s*/u, "").trim();
  if (dePattern && dePattern !== s) return `בנושא ${dePattern}`;

  if (s.startsWith("בלבול")) return `בנושא ${s}`;

  if (/^קושי\s+/u.test(s)) {
    const rest = s.replace(/^קושי\s+/u, "").trim();
    if (/^בנושא(\s|\/)/u.test(rest)) return rest;
    return `בנושא ${rest}`;
  }

  return `בנושא ${s}`;
}

/** לניסוח "מומלץ להתמקד…" — נקודתיים אחרי "בנושא" / "בנושא/ים" */
function parentCopyTopicPhraseForFocusHe(labelHe) {
  return parentCopyTopicPhraseHe(labelHe)
    .replace(/^בנושא\/ים\s+/u, "בנושא/ים: ")
    .replace(/^בנושא\s+/u, "בנושא: ");
}

/** משפט יעד לחיזוק מנקודת מבט של הצלחה, לא "לצמצם טעויות בדפוס" */
function successRateImprovementGoalHe(labelHe) {
  const ph = parentCopyTopicPhraseHe(labelHe);
  const core = ph
    .replace(/^בנושא\/ים\s+/u, "")
    .replace(/^בנושא\s+/u, "")
    .trim() || ph;
  if (!core) return "להעלות את אחוזי ההצלחה במקצוע";
  if (/^ב/u.test(core)) return `להעלות את אחוזי ההצלחה ${core}`;
  return `להעלות את אחוזי ההצלחה ב${core}`;
}

function recStrength(mistakeCount) {
  if (mistakeCount >= MIN_MISTAKES_FOR_STRONG_RECOMMENDATION) return "strong";
  if (mistakeCount >= MIN_PATTERN_FAMILY_FOR_DIAGNOSIS) return "moderate";
  return "tentative";
}

function rowConfidenceFromSessions(row) {
  const q = Number(row?.questions) || 0;
  if (q >= 24) return "high";
  if (q >= 10) return "moderate";
  return "low";
}

function formatSessionBand(subjectId, row, rowKey) {
  return {
    id: `${subjectId}:${String(rowKey).slice(0, 120)}`,
    labelHe: sessionRowLabelHe(subjectId, row),
    questions: Number(row?.questions) || 0,
    accuracy: Number(row?.accuracy) || 0,
    confidence: rowConfidenceFromSessions(row),
    needsPractice: !!row?.needsPractice,
    excellent: !!row?.excellent,
  };
}

function joinHebrewList(items) {
  const xs = (items || []).map((s) => String(s || "").trim()).filter(Boolean);
  if (!xs.length) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} ו${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")} ו${xs[xs.length - 1]}`;
}

function strengthTierHe(row) {
  const q = Number(row?.questions) || 0;
  const acc = Number(row?.accuracy) || 0;
  if (row?.excellent && q >= 20 && acc >= 90) return "נושא שהילד מצליח בו יותר כרגע";
  if (row?.excellent) return "נושא חזק כרגע";
  if (acc >= 92 && q >= 14) return "נושא חזק כרגע";
  return "נושא חזק כרגע";
}

function weaknessTierHe(labelHe, mistakeCount, confidence) {
  const lab = String(labelHe || "").trim();
  if (!lab || lab === GENERIC_WEAKNESS_HE) return "תחום לחיזוק";
  if (mistakeCount >= MIN_MISTAKES_FOR_STRONG_RECOMMENDATION) {
    return "כרגע בתרגול נראה שכדאי לחזק";
  }
  if (mistakeCount >= MIN_PATTERN_FAMILY_FOR_DIAGNOSIS) {
    if (confidence === "high") return "כרגע בתרגול נראה שכדאי לחזק";
    return "נראה שכדאי לחזק בתרגול";
  }
  return "תחום לחיזוק";
}

function buildTopStrengthsMerged(excellent, strengths, max) {
  const combined = [...(excellent || []), ...(strengths || [])];
  combined.sort((a, b) => {
    const ex = (x) => (x.excellent ? 1 : 0);
    if (ex(b) !== ex(a)) return ex(b) - ex(a);
    const acc = (x) => Number(x.accuracy) || 0;
    if (acc(b) !== acc(a)) return acc(b) - acc(a);
    return (Number(b.questions) || 0) - (Number(a.questions) || 0);
  });
  return combined.slice(0, max).map((row) => ({
    ...row,
    tierHe: strengthTierHe(row),
  }));
}

/**
 * מחלק שורות דוח אל stableExcellence / excellent / strengths / maintain / improving (ללא כפילויות לפי מפתח שורה).
 * אוסף בריכה פנימית גדולה יותר לצורך דירוג לפני חיתוך אל topStrengths וכו׳.
 */
function buildSessionBands(subjectId, report) {
  const rowsKey = REPORT_ROWS_KEY[subjectId];
  const map = rowsKey && report[rowsKey] ? report[rowsKey] : {};
  const entries = Object.entries(map || {})
    .map(([rowKey, row]) => ({ rowKey, row }))
    .sort((a, b) => {
      const acc = (x) => Number(x.row?.accuracy) || 0;
      const q = (x) => Number(x.row?.questions) || 0;
      return acc(b) - acc(a) || q(b) - q(a);
    });

  const used = new Set();
  const take = (predicate, max) => {
    const out = [];
    for (const { rowKey, row } of entries) {
      if (out.length >= max) break;
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q < 5) continue;
      if (used.has(rowKey)) continue;
      if (!predicate(row, q)) continue;
      used.add(rowKey);
      out.push(formatSessionBand(subjectId, row, rowKey));
    }
    return out;
  };

  const stableExcellenceRaw = take(
    (row, q) => {
      if (row.needsPractice) return false;
      const acc = Number(row.accuracy) || 0;
      if (acc < STABLE_EXCELLENCE_MIN_ACCURACY) return false;
      if (q < STABLE_EXCELLENCE_MIN_QUESTIONS) return false;
      return true;
    },
    MAX_STABLE_EXCELLENCE
  );

  const stableExcellenceOut = stableExcellenceRaw.map((r) => ({
    ...r,
    tierHe: "הילד מצליח בנושא הזה לאורך זמן",
  }));

  const excellent = take(
    (row, q) => row.excellent && q >= 10,
    INTERNAL_SESSION_POOL
  );

  const strengths = take(
    (row, q) =>
      !row.excellent &&
      Number(row.accuracy) >= 87 &&
      q >= 8 &&
      !row.needsPractice,
    INTERNAL_SESSION_POOL
  );

  const maintain = take(
    (row, q) => {
      const acc = Number(row.accuracy) || 0;
      return !row.needsPractice && acc >= 80 && acc < 93 && q >= 6;
    },
    INTERNAL_SESSION_POOL
  );

  const improving = take(
    (row, q) => {
      const acc = Number(row.accuracy) || 0;
      if (row.needsPractice && acc >= 55 && acc < 78) return true;
      if (!row.excellent && acc >= 68 && acc <= 82 && q >= 6) return true;
      return false;
    },
    INTERNAL_SESSION_POOL
  );

  const topStrengths = buildTopStrengthsMerged(
    excellent,
    strengths,
    MAX_TOP_STRENGTHS
  );

  const excellentOut = topStrengths.filter((r) => r.excellent);
  const strengthsOut = topStrengths.filter((r) => !r.excellent);

  const maintainOut = maintain
    .slice(0, MAX_MAINTAIN)
    .map((r) => ({ ...r, tierHe: "שמירה על רמה טובה" }));
  const improvingOut = improving
    .slice(0, MAX_IMPROVING)
    .map((r) => ({
      ...r,
      tierHe: "נושא שעדיין מתחזק",
      labelHe: improvingDiagnosticsDisplayLabelHe(r.labelHe),
    }));

  return {
    stableExcellence: stableExcellenceOut,
    excellent: excellentOut,
    strengths: strengthsOut,
    maintain: maintainOut,
    improving: improvingOut,
    topStrengths,
  };
}

function buildEvidenceMistakeFromEvent(ev, confidence) {
  if (!ev) return null;
  const ex = String(ev.exerciseText || "").trim();
  if (ex.length > 220) return null;
  if (!ex && ev.userAnswer == null) return null;
  if (confidence !== "high" && confidence !== "moderate") return null;
  return {
    exerciseText: ex || null,
    questionLabel: ev.questionLabel || null,
    correctAnswer: ev.correctAnswer ?? null,
    userAnswer: ev.userAnswer ?? null,
    confidence,
  };
}

function buildEvidenceSuccessFromPick(pick) {
  if (!pick) return null;
  if (pick.questions < 8) return null;
  const conf =
    pick.confidence === "high" || pick.questions >= 20 ? "high" : "moderate";
  return {
    titleHe: "מה שהילד עושה טוב בתרגול",
    bodyHe: `בנושא ${pick.labelHe} יש הצלחה טובה בתקופה שנבחרה: כ ${pick.accuracy}% נכון מתוך ${pick.questions} שאלות.`,
    confidence: conf,
  };
}

function buildSummaryHe(
  subjectLabelHe,
  stableExcellence,
  topStrengths,
  topWeaknesses,
  maintain,
  improving,
  wrongCount,
  mistakeEventCount,
  diagnosticSparseNoteHe
) {
  const label = subjectLabelHe || "המקצוע";
  const opening = `לגבי ${label}:`;

  if (
    !stableExcellence.length &&
    !topStrengths.length &&
    !topWeaknesses.length &&
    !maintain.length &&
    !improving.length
  ) {
    if (diagnosticSparseNoteHe) return `${opening} ${diagnosticSparseNoteHe}`;
    if (wrongCount > 0 && !topWeaknesses.length) {
      return `${opening} יש כאן כמה טעויות בלי דפוס חוזר ברור - עדיף לא למהר למסקנות; כדאי להמשיך בתרגול רגוע ולצבור עוד דוגמאות.`;
    }
    if (mistakeEventCount >= 0 && mistakeEventCount < 5) {
      return `${opening} עדיין מעט מידע בתקופה שנבחרה - אחרי עוד קצת תרגול אפשר יהיה לנסח תמונה מלאה יותר.`;
    }
    return null;
  }

  const parts = [];
  if (stableExcellence.length) {
    const exNames = joinHebrewList(stableExcellence.map((s) => s.labelHe));
    parts.push(
      stableExcellence.length > 1
        ? `נראה שהילד מצליח ב${exNames} לאורך זמן.`
        : `נראה שהילד מצליח ב${stableExcellence[0].labelHe} לאורך זמן.`
    );
  }
  if (topStrengths.length) {
    const names = joinHebrewList(topStrengths.map((s) => s.labelHe));
    parts.push(
      topStrengths.length > 1
        ? `רואים נושאים חזקים ב${names}.`
        : `רואים נושא חזק ב${names}.`
    );
  } else if (!stableExcellence.length && maintain.length) {
    parts.push(
      `רואים שמירה טובה על הרמה ב ${joinHebrewList(maintain.map((m) => m.labelHe))}.`
    );
  } else if (stableExcellence.length && maintain.length) {
    parts.push(
      `רואים גם שמירה טובה על הרמה ב ${joinHebrewList(maintain.map((m) => m.labelHe))}.`
    );
  }

  if (topWeaknesses.length) {
    const names = joinHebrewList(
      topWeaknesses.map((w) => parentCopyTopicPhraseHe(w.labelHe))
    );
    let s =
      topWeaknesses.length > 1
        ? `יש גם כמה תחומים שכדאי לחזק: ${names}.`
        : `יש גם מקום לחיזוק ${parentCopyTopicPhraseHe(topWeaknesses[0].labelHe)}.`;
    if (
      topWeaknesses.some(
        (w) => w.mistakeCount >= MIN_MISTAKES_FOR_STRONG_RECOMMENDATION
      )
    ) {
      s += " זה חוזר מספיק כדי ששווה לגשת אליו מוקדם - בלי לחץ, עם תרגול קצר ומסודר.";
    }
    parts.push(s);
  } else if (wrongCount > 0) {
    parts.push(
      "הטעויות שיש עדיין לא מספרות סיפור אחד ברור - זה בסדר; נמשיך לעקוב."
    );
  }

  if (!topWeaknesses.length && improving.length) {
    parts.push(
      `רואים גם נושאים שעדיין מתחזקים: ${joinHebrewList(improving.map((x) => x.labelHe))}.`
    );
  }

  const text = parts.join(" ").trim();
  return text || null;
}

function buildParentActionHe(
  subjectLabelHe,
  topWeaknesses,
  improving,
  maintain,
  topStrengths
) {
  const subj = subjectLabelHe || "המקצוע";
  const tp = parentCopyTopicPhraseHe;
  const w0 = topWeaknesses[0];
  const i0 = improving[0];
  const m0 = maintain[0];
  const s0 = topStrengths[0];
  if (w0) {
    const kind = inferWeaknessKindHe(w0.labelHe);
    if (kind === "wording") {
      return `כדאי פעמיים בשבוע, כרבע שעה ב${subj} ${tp(w0.labelHe)} - לקרוא יחד את הניסוח, לפרק למשפטים קצרים, ורק אז לנסח תשובה.`;
    }
    if (kind === "careless") {
      return `פעמיים בשבוע, רבע שעה ב${subj} ${tp(w0.labelHe)} - עצירה קצרה לפני שליחה: "האם עניתי על מה שנשאלתי?".`;
    }
    return `פעמיים בשבוע, רבע שעה: תרגול ב${subj} ממוקד ${tp(w0.labelHe)} - לחזור על שאלות בתרגול ממוקד, להמשיך לאט עד שהנושא מובן, ואז לזהות שיפור קטן.`;
  }
  if (i0) {
    return `פעמיים בשבוע, רבע שעה: תרגול קצר ב${subj} ${tp(i0.labelHe)} (כרגע דיוק כ ${i0.accuracy}%) - לנסח קודם, לבדוק אחר כך.`;
  }
  const pick = m0 || s0;
  if (pick) {
    return `פעם בשבוע, עשר דקות: לתרגל את המקצוע ${subj} ${tp(pick.labelHe)} - תרגול וחזרה קצרה על החומר הנלמד.`;
  }
  return null;
}

function buildNextWeekGoalHe(subjectLabelHe, topWeaknesses, improving, topStrengths, maintain, stableExcellence) {
  const subj = subjectLabelHe || "המקצוע";
  const w0 = topWeaknesses[0];
  const preserve =
    stableExcellence[0] ||
    topStrengths.find((t) => t.excellent || t.questions >= 8) ||
    maintain.find((m) => m.questions >= 8) ||
    topStrengths[0] ||
    maintain[0];
  const preserveLabel = preserve?.labelHe;
  const tp = parentCopyTopicPhraseHe;
  const goals = [];
  if (w0) {
    if (inferWeaknessKindHe(w0.labelHe) === "wording") {
      goals.push(
        `מומלץ לבחור כמה דוגמאות לעבור ביחד עם הילד צעד צעד, ולנסות השבוע להעלות את אחוזי ההצלחה - מספיק אפילו שיפור קטן באחוזי ההצלחה.`
      );
    } else {
      goals.push(
        `ב${subj} ${tp(w0.labelHe)} - לנסות שבוע אחד ${successRateImprovementGoalHe(w0.labelHe)} - מספיק אפילו שיפור קטן באחוזי ההצלחה.`
      );
    }
  } else if (improving?.[0]) {
    const i0 = improving[0];
    goals.push(
      `שבועיים קצרים סביב ${i0.labelHe} - ${successRateImprovementGoalHe(i0.labelHe)} - שני מפגשים קטנים, לא תרגול ארוך.`
    );
  }
  if (preserveLabel) {
    goals.push(`להמשיך בשבוע הבא באותו קצב סביב ${tp(preserveLabel)} - לשמור על הרמה הטובה.`);
  }
  if (!goals.length) return null;
  return goals.join(" ");
}

function buildEvidenceExamples(evidenceMistake, evidenceSuccess) {
  const out = [];
  if (evidenceMistake) {
    out.push({ type: "mistake", ...evidenceMistake });
  }
  if (evidenceSuccess) {
    out.push({
      type: "success",
      titleHe: evidenceSuccess.titleHe,
      bodyHe: evidenceSuccess.bodyHe,
      confidence: evidenceSuccess.confidence,
    });
  }
  return out.slice(0, 2);
}

/**
 * מקטעים מובנים לדוח מקיף — מבוסס על אותם דליים כמו הכרטיסים הקיימים, בלי טקסט דמה.
 */
function buildDiagnosticSectionsHe({
  stableExcellence,
  topStrengths,
  maintain,
  improving,
  topWeaknesses,
  insufficientData,
  diagnosticSparseNoteHe,
  parentActionHe,
  nextWeekGoalHe,
}) {
  const strongHe = [];
  for (const x of stableExcellence) {
    strongHe.push(`${x.labelHe} - דיוק כ ${x.accuracy}% (${x.questions} שאלות)`);
  }
  for (const x of topStrengths) {
    if (strongHe.length >= 6) break;
    strongHe.push(`${x.labelHe} - דיוק כ ${x.accuracy}% (${x.questions} שאלות)`);
  }

  const maintainHe = (maintain || []).map(
    (x) => `${x.labelHe} - דיוק ${x.accuracy}% (${x.questions} שאלות; מומלץ לשמר קצב)`
  );

  const improveHe = (improving || []).map(
    (x) =>
      `${improvingDiagnosticsDisplayLabelHe(x.labelHe)} - דיוק ${x.accuracy}% (${x.questions} שאלות)`
  );

  const urgentAttentionHe = topWeaknesses.map((w) =>
    `${w.labelHe}${
      typeof w.mistakeCount === "number" ? ` - כ ${w.mistakeCount} טעויות דומות בתקופה שנבחרה` : ""
    }`
  );

  const insufficientDataHe = [];
  if (diagnosticSparseNoteHe) insufficientDataHe.push(diagnosticSparseNoteHe);
  for (const u of insufficientData.slice(0, 5)) {
    insufficientDataHe.push(u.note || "נתונים חלקיים לדפוס מסוים.");
  }
  const insufficientDataNoteHe =
    insufficientData.length > 8
      ? "יש עוד אזורים עם טעויות מפוזרות שלא הגיעו לסף דפוס שחוזר מספיק - התמונה בהם עדיין חלקית."
      : null;
  if (insufficientDataNoteHe) insufficientDataHe.push(insufficientDataNoteHe);

  return {
    strongHe,
    maintainHe,
    improveHe,
    urgentAttentionHe,
    insufficientDataHe,
    concreteHomeActionHe: parentActionHe || null,
    nextShortGoalHe: nextWeekGoalHe || null,
  };
}

function buildSubSkillInsightsHe(topWeaknesses) {
  return topWeaknesses.slice(0, 4).map((w) => ({
    lineHe: w.labelHe,
    evidenceNoteHe:
      typeof w.mistakeCount === "number" && w.mistakeCount >= MIN_MISTAKES_FOR_STRONG_RECOMMENDATION
        ? "דפוס שחוזר בתקופה שנבחרה."
        : typeof w.mistakeCount === "number" && w.mistakeCount >= MIN_PATTERN_FAMILY_FOR_DIAGNOSIS
          ? "דפוס חוזר בינוני - שווה לשים לב."
          : "סימן ראשוני בלבד - עדיין מוקדם לסיכום חד משמעי.",
  }));
}

const RISK_BEHAVIOR_TYPES = new Set([
  "knowledge_gap",
  "speed_pressure",
  "instruction_friction",
  "careless_pattern",
  "fragile_success",
]);

function emptyRiskOr() {
  return {
    falsePromotionRisk: false,
    falseRemediationRisk: false,
    speedOnlyRisk: false,
    hintDependenceRisk: false,
    insufficientEvidenceRisk: false,
    recentTransitionRisk: false,
  };
}

/**
 * Phase 8 — סולם עדיפות הורית ברמת מקצוע.
 * @param {string} subjectId
 * @param {object} args
 */
function computeSubjectPriorityFieldsPhase8(subjectId, args) {
  const {
    dominantLearningRisk,
    dominantSuccessPattern,
    subjectConclusionReadiness,
    dominantRootCause,
    riskOr,
    stableMasteryRowCount,
    fragileSuccessRowCount,
    recommendedHomeMethodHe,
    strongRowCount,
  } = args;
  const lab = SUBJECT_LABEL_HE[subjectId] || "המקצוע";
  const home =
    recommendedHomeMethodHe && String(recommendedHomeMethodHe).trim()
      ? String(recommendedHomeMethodHe).trim()
      : "";

  if (subjectConclusionReadiness === "not_ready" || dominantRootCause === "insufficient_evidence") {
    return {
      subjectPriorityLevel: "monitor",
      subjectPriorityReasonHe: `ב${lab} המידע עדיין חלקי - עדיף תרגול קל ובדיקה חוזרת, לא שינוי גדול מדי.`,
      subjectImmediateActionHe: `ב${lab}: שני מפגשים קצרים (5–8 דקות) באותה רמת קושי - לצפות ולתעד בלבד.`,
      subjectDeferredActionHe: `ב${lab}: לדחות שינוי רמה/כיתה ותוכנית ארוכה עד שיתייצב נתון.`,
      subjectMonitoringOnly: true,
      subjectDoNowHe: "תרגול קצר וקבוע; משימה אחת ברורה לכל מפגש.",
      subjectAvoidNowHe: "לא להסיק מסקנות חזקות ולא להעמיס סדרת חיזוקים.",
    };
  }

  if (
    subjectConclusionReadiness === "ready" &&
    dominantRootCause === "knowledge_gap" &&
    (strongRowCount || 0) >= 1
  ) {
    return {
      subjectPriorityLevel: "immediate",
      subjectPriorityReasonHe: `ב${lab} ${ROOT_CAUSE_LABEL_HE.knowledge_gap} מומלץ להתחיל בתרגול קצר וממוקד.`,
      subjectImmediateActionHe: home || `ב${lab}: משימה אחת קצרה עם חזרה על טעות טיפוסית באותה רמה.`,
      subjectDeferredActionHe: `ב${lab}: להמתין עם הרחבת נושאים עד שייצבו הצלחות קטנות חוזרות.`,
      subjectMonitoringOnly: false,
      subjectDoNowHe: "חיזוק ממוקד באותה רמה; פחות נושאים במקביל.",
      subjectAvoidNowHe: "לא לדחוף עלייה מהירה מדי ברמה בבית; לא לדלג על טעויות חוזרות.",
    };
  }

  if (
    subjectConclusionReadiness === "ready" &&
    fragileSuccessRowCount >= 1 &&
    riskOr?.hintDependenceRisk
  ) {
    return {
      subjectPriorityLevel: "immediate",
      subjectPriorityReasonHe: `ב${lab} יש הצלחה עם הילד עדיין נעזר ברמזים - כדאי לעבוד עכשיו על מעבר הדרגתי לעצמאות.`,
      subjectImmediateActionHe: home || `ב${lab}: משימה קצרה - ניסיון עצמאי קטן ואז בדיקה יחד.`,
      subjectDeferredActionHe: `ב${lab}: לדחות עלייה מהירה מדי ברמה עד שיורדת התלות מעט.`,
      subjectMonitoringOnly: false,
      subjectDoNowHe: "להפריד בין ניסיון עצמאי קצר לבין בדיקה בסוף.",
      subjectAvoidNowHe: "לא להפסיק עזרה פתאום; לא להסביר ארוך מדי בזמן התרגול.",
    };
  }

  if (
    dominantSuccessPattern === "stable_mastery" &&
    stableMasteryRowCount >= 2 &&
    dominantLearningRisk !== "knowledge_gap" &&
    dominantRootCause !== "knowledge_gap"
  ) {
    return {
      subjectPriorityLevel: "maintain",
      subjectPriorityReasonHe: `ב${lab} נראה שהרמה נשמרת טוב יחסית - להישאר על שגרה רגועה.`,
      subjectImmediateActionHe: home || `ב${lab}: להמשיך עם שני תרגולים קצרים בשבוע סביב הנושאים שבהם נראות תוצאות טובות יחסית.`,
      subjectDeferredActionHe: `ב${lab}: לדחות הרחבות או הקשחה לפני צורך ברור.`,
      subjectMonitoringOnly: false,
      subjectDoNowHe: "להמשיך קצב קבוע; לשבח התמדה קטנה.",
      subjectAvoidNowHe: "לא להוסיף עומס בבית כשאין לכך סימן ברור.",
    };
  }

  if (subjectConclusionReadiness === "partial" || dominantRootCause === "mixed_signal") {
    return {
      subjectPriorityLevel: "soon",
      subjectPriorityReasonHe: `ב${lab} תמונה אמצעית - שינוי קטן עכשיו, החלטות גדולות אחר כך.`,
      subjectImmediateActionHe: home || `ב${lab}: מפגש קצר אחד השבוע עם מיקוד אחד בלבד.`,
      subjectDeferredActionHe: `ב${lab}: לדחות החלטה סופית כשהנתונים עדיין מעורבים.`,
      subjectMonitoringOnly: false,
      subjectDoNowHe: "לעקוב אחרי דיוק באותה רמה לפני שמוסיפים משתנים.",
      subjectAvoidNowHe: "לא לנעול הסבר יחיד כשיש כמה כיוונים סבירים.",
    };
  }

  return {
    subjectPriorityLevel: "soon",
    subjectPriorityReasonHe: `ב${lab}: עדיפות בינונית - תרגול קצר וקבוע.`,
    subjectImmediateActionHe: home || `ב${lab}: שני מפגשים קצרים בשבוע באותה רמה.`,
    subjectDeferredActionHe: `ב${lab}: לדחות שינויים דרמטיים עד שיתבהר הכיוון.`,
    subjectMonitoringOnly: false,
    subjectDoNowHe: "תרגול קצר וקבוע; משימה ברורה.",
    subjectAvoidNowHe: "לא להחמיר רמה בלי שני מפגשים טובים ברצף.",
  };
}

/**
 * סינתזה ברמת מקצוע משורות דוח מועשרות (Phase 1–2) — רק כשיש נתונים בשורה.
 * @param {string} subjectId
 * @param {Record<string, unknown>} report
 */
function synthesizeSubjectPhase3FromRows(subjectId, report) {
  const rowsKey = REPORT_ROWS_KEY[subjectId];
  const map =
    (rowsKey && report[rowsKey] ? report[rowsKey] : null) ||
    (subjectId === "history" && report.historyTopics ? report.historyTopics : {}) ||
    {};
  const entries = Object.entries(map || {}).filter(([, row]) => row && typeof row === "object");
  const rows = entries
    .map(([rowKey, row]) => ({ rowKey, row }))
    .filter(({ row }) => (Number(row.questions) || 0) > 0);

  if (!rows.length) {
    return {
      dominantLearningRisk: "none_sparse",
      dominantSuccessPattern: "none_sparse",
      trendNarrativeHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לזהות מגמה ברורה במקצוע זה.",
      confidenceSummaryHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לדעת עד כמה הכיוון ברור במקצוע הזה.",
      recommendedHomeMethodHe: null,
      whatNotToDoHe: "לא לבנות תוכנית ארוכה לפני שיש עוד תרגול בתקופה שנבחרה.",
      majorRiskFlagsAcrossRows: emptyRiskOr(),
      dominantBehaviorProfileAcrossRows: "undetermined",
      strongestPositiveTrendRowHe: null,
      strongestCautionTrendRowHe: null,
      fragileSuccessRowCount: 0,
      stableMasteryRowCount: 0,
      modeConcentrationNoteHe: null,
      improvingButSupportedHe: null,
      dominantLearningRiskLabelHe: null,
      dominantSuccessPatternLabelHe: null,
      dominantRootCause: "insufficient_evidence",
      dominantRootCauseLabelHe: ROOT_CAUSE_LABEL_HE.insufficient_evidence,
      secondaryRootCause: null,
      rootCauseDistribution: {},
      subjectDiagnosticRestraintHe:
        "בתקופה שנבחרה עדיין אין מספיק תרגול כדי להבין איפה מתחיל הקושי או להמליץ על שינוי גדול.",
      subjectConclusionReadiness: "not_ready",
      subjectInterventionPriorityHe: INTERVENTION_TYPE_LABEL_HE.monitor_before_escalation,
      subjectPriorityLevel: "monitor",
      subjectPriorityReasonHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לקבוע מה חשוב לתרגל קודם.",
      subjectImmediateActionHe: null,
      subjectDeferredActionHe: null,
      subjectMonitoringOnly: true,
      subjectDoNowHe: "לאסוף מעט תרגול קצר לפני החלטות.",
      subjectAvoidNowHe: "לא לבנות תוכנית ארוכה לפני שיש נתון.",
      dominantMistakePattern: "insufficient_mistake_evidence",
      dominantMistakePatternLabelHe: MISTAKE_PATTERN_LABEL_HE.insufficient_mistake_evidence,
      mistakePatternDistribution: {},
      subjectLearningStage: "insufficient_longitudinal_evidence",
      subjectLearningStageLabelHe: LEARNING_STAGE_LABEL_HE.insufficient_longitudinal_evidence,
      subjectRetentionRisk: "unknown",
      subjectTransferReadiness: "not_ready",
      subjectMemoryNarrativeHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לזהות טעות שחוזרת או שינוי לאורך זמן.",
      subjectReviewBeforeAdvanceHe: null,
      subjectResponseToIntervention: "not_enough_evidence",
      subjectResponseToInterventionLabelHe: RESPONSE_TO_INTERVENTION_LABEL_HE.not_enough_evidence,
      subjectSupportFit: "unknown",
      subjectSupportAdjustmentNeed: "monitor_only",
      subjectSupportAdjustmentNeedHe: SUPPORT_ADJUSTMENT_NEED_LABEL_HE.monitor_only,
      subjectConclusionFreshness: "low",
      subjectRecalibrationNeed: "do_not_rely_yet",
      subjectRecalibrationNeedHe: RECALIBRATION_NEED_LABEL_HE.do_not_rely_yet,
      subjectEffectivenessNarrativeHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לדעת אם העזרה שניתנה באמת עזרה.",
      subjectSupportSequenceState: "insufficient_sequence_evidence",
      subjectSupportSequenceStateLabelHe: SUPPORT_SEQUENCE_STATE_LABEL_HE.insufficient_sequence_evidence,
      subjectStrategyRepetitionRisk: "unknown",
      subjectStrategyFatigueRisk: "unknown",
      subjectNextBestSequenceStep: "observe_before_next_cycle",
      subjectNextBestSequenceStepHe: NEXT_BEST_SEQUENCE_STEP_LABEL_HE.observe_before_next_cycle,
      subjectAdviceNovelty: "unknown",
      subjectRecommendationRotationNeed: "do_not_repeat_yet",
      subjectSequenceNarrativeHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי להחליט מה הצעד הבא בתרגול.",
      subjectRecommendationMemoryState: "no_memory",
      subjectPriorRecommendationSignature: "unknown",
      subjectSupportHistoryDepth: "unknown",
      subjectRecommendationCarryover: "not_visible",
      subjectExpectedVsObservedMatch: "not_enough_evidence",
      subjectFollowThroughSignal: "not_inferable",
      subjectContinuationDecision: "continue_but_refine",
      subjectContinuationDecisionHe: RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE.continue_but_refine,
      subjectOutcomeNarrativeHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לדעת אם מה שניסינו לאחרונה עזר.",
      subjectGateState: "gates_not_ready",
      subjectGateStateLabelHe: GATE_STATE_LABEL_HE.gates_not_ready,
      subjectGateReadiness: "insufficient",
      subjectNextCycleDecisionFocus: "prove_current_direction",
      subjectNextCycleDecisionFocusHe: NEXT_CYCLE_DECISION_FOCUS_LABEL_HE.prove_current_direction,
      subjectEvidenceTargetType: "fresh_data_needed",
      subjectTargetObservationWindow: "unknown",
      subjectGateNarrativeHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי לקבל החלטה בטוחה.",
      subjectDependencyState: "insufficient_dependency_evidence",
      subjectDependencyStateLabelHe: DEPENDENCY_STATE_LABEL_HE.insufficient_dependency_evidence,
      subjectLikelyFoundationalBlocker: "unknown",
      subjectLikelyFoundationalBlockerLabelHe: FOUNDATIONAL_BLOCKER_LABEL_HE.unknown,
      subjectDownstreamSymptomRisk: "unknown",
      subjectFoundationFirstPriority: false,
      subjectFoundationFirstPriorityHe: "בתקופה שנבחרה עדיין אין מספיק תרגול כדי להבין מאיפה מתחיל הקושי.",
      subjectDependencyNarrativeHe: "כדאי לאסוף עוד תרגול לפני שמחליטים מה כדאי לחזק קודם.",
    };
  }

  const behaviorCounts = {};
  let fragileSuccessRowCount = 0;
  let stableMasteryRowCount = 0;
  const riskOr = emptyRiskOr();
  const modeKeys = [];
  const rootCauseRowCounts = {};
  let withheldStrengthRows = 0;
  let tentativeStrengthRows = 0;
  let moderateOrStrongRows = 0;

  let bestPositive = /** @type {{ labelHe: string, summaryHe: string, conf: number }|null} */ (null);
  let worstCaution = /** @type {{ labelHe: string, summaryHe: string, score: number }|null} */ (null);
  let improvingButSupportedHe = /** @type {string|null} */ (null);

  const mistakePatternRowCounts = {};
  const learningStageRowCounts = {};
  let maxRetentionRank = 0;
  const rrRank = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let minTransferScore = 99;
  const trScore = { not_ready: 0, limited: 1, emerging: 2, ready: 3, unknown: -1 };
  /** @type {string[]} */
  const reviewBeforeAdvanceRowHints = [];

  const rtiCounts = {};
  const RTI_SUBJECT_WORST_FIRST = [
    "regression_under_support",
    "stalled_response",
    "mixed_response",
    "over_supported_progress",
    "not_enough_evidence",
    "early_positive_response",
    "independence_growing",
  ];
  const fitRank = { unknown: 0, good_fit: 1, partial_fit: 2, poor_fit: 3 };
  let fitBest = 0;
  let subjectSupportFitAgg = "unknown";
  const adjRank = {
    monitor_only: 0,
    hold_course: 1,
    reduce_support: 2,
    tighten_focus: 3,
    increase_structure: 4,
    change_strategy: 5,
  };
  let adjBest = 0;
  let subjectSupportAdjustmentNeedAgg = "monitor_only";
  const cfRank = { high: 0, medium: 1, low: 2, expired: 3 };
  let cfBest = 0;
  let subjectConclusionFreshnessAgg = "medium";
  const recRank = { none: 0, light_review: 1, structured_recheck: 2, do_not_rely_yet: 3 };
  let recBest = 0;
  let subjectRecalibrationNeedAgg = "none";

  const SEQ_STATE_WORST_FIRST = [
    "sequence_exhausted",
    "sequence_stalled",
    "insufficient_sequence_evidence",
    "continuing_sequence",
    "early_sequence",
    "new_support_cycle",
    "sequence_ready_for_release",
  ];
  const seqStateCounts = {};
  const repRiskRankP11 = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let repBestP11 = 0;
  let subjectStrategyRepetitionRiskAgg = "unknown";
  const fatRiskRankP11 = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let fatBestP11 = 0;
  let subjectStrategyFatigueRiskAgg = "unknown";
  const rotRankP11 = { none: 0, light_variation: 1, meaningful_rotation: 2, do_not_repeat_yet: 3 };
  let rotBestP11 = 0;
  let subjectRecommendationRotationNeedAgg = "none";
  const noveltyRankWorst = { low: 0, medium: 1, high: 2, unknown: 3 };
  let noveltyWorstScore = 99;
  let subjectAdviceNoveltyAgg = "unknown";
  const NEXT_BEST_STEP_WORST_FIRST = [
    "switch_support_type",
    "reset_with_short_review",
    "tighten_same_goal",
    "observe_before_next_cycle",
    "begin_release_step",
    "continue_current_sequence",
  ];
  const nextBestStepCounts = {};

  const MEM_STATE_RANK = { no_memory: 0, light_memory: 1, usable_memory: 2, strong_memory: 3 };
  const DEPTH_RANK = { unknown: 0, single_window: 1, short_history: 2, multi_window: 3 };
  const CARRY_RANK = { not_visible: 0, unclear: 1, partly_visible: 2, clearly_visible: 3 };
  const MATCH_WORST_FIRST = ["misaligned", "not_enough_evidence", "partly_aligned", "aligned"];
  const FOLLOW_WORST_FIRST = ["not_inferable", "unclear", "possibly_followed", "likely_followed"];
  const CONTINUATION_WORST_FIRST = [
    "reset_and_rebuild_signal",
    "pivot_from_prior_path",
    "do_not_repeat_without_new_evidence",
    "continue_but_refine",
    "begin_controlled_release",
    "continue_with_same_core",
  ];
  let memRankBest = -1;
  let subjectRecommendationMemoryState = "no_memory";
  let depthRankBest = -1;
  let subjectSupportHistoryDepth = "unknown";
  let carryRankBest = -1;
  let subjectRecommendationCarryover = "not_visible";
  const priorSigCounts = {};
  const matchCounts = {};
  const followCounts = {};
  const continuationCounts = {};

  const GATE_STATE_PRIORITY = [
    "pivot_gate_visible",
    "recheck_gate_visible",
    "gates_not_ready",
    "mixed_gate_state",
    "release_gate_forming",
    "advance_gate_forming",
    "continue_gate_active",
  ];
  const gateStateCounts = {};
  const READINESS_WORST = ["insufficient", "low", "moderate", "high"];
  const readinessCounts = {};
  const nextFocusCounts = {};
  const TARGET_TYPE_PRIORITY = [
    "fresh_data_needed",
    "mixed_target",
    "response_confirmation",
    "mistake_reduction_confirmation",
    "retention_confirmation",
    "independence_confirmation",
    "accuracy_confirmation",
  ];
  const targetTypeCounts = {};
  const WINDOW_PRIORITY = ["needs_fresh_baseline", "next_two_cycles", "next_short_cycle", "unknown"];
  const windowCounts = {};
  const depStateCounts = {};
  const blockerRowCounts = {};
  const dlRank = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let worstDownstreamRank = 0;
  let foundationHeavyRows = 0;

  for (const { rowKey, row } of rows) {
    const bp = row.behaviorProfile && typeof row.behaviorProfile === "object" ? row.behaviorProfile : null;
    const dom = String(bp?.dominantType || "undetermined");
    behaviorCounts[dom] = (behaviorCounts[dom] || 0) + 1;
    if (dom === "fragile_success") fragileSuccessRowCount += 1;
    if (dom === "stable_mastery") stableMasteryRowCount += 1;

    const sig = row.topicEngineRowSignals && typeof row.topicEngineRowSignals === "object" ? row.topicEngineRowSignals : null;
    const rf = sig?.riskFlags && typeof sig.riskFlags === "object" ? sig.riskFlags : null;
    if (rf) {
      for (const k of Object.keys(riskOr)) {
        if (rf[k]) riskOr[k] = true;
      }
    }

    const rcId = String(sig?.rootCause || "").trim();
    if (rcId) rootCauseRowCounts[rcId] = (rootCauseRowCounts[rcId] || 0) + 1;
    const csRow = String(sig?.conclusionStrength || "").trim();
    if (csRow === "withheld") withheldStrengthRows += 1;
    else if (csRow === "tentative") tentativeStrengthRows += 1;
    else if (csRow === "moderate" || csRow === "strong") moderateOrStrongRows += 1;

    const mk = row.modeKey != null && String(row.modeKey).trim() !== "" ? String(row.modeKey).trim() : null;
    if (mk) modeKeys.push(mk);

    const trend = row.trend && typeof row.trend === "object" ? row.trend : null;
    const tConf = Number(trend?.confidence);
    const labelHe = sessionRowLabelHe(subjectId, row);
    const sumHe = String(trend?.summaryHe || "").trim();

    if (trend && (trend.accuracyDirection === "up" || trend.fluencyDirection === "up")) {
      const c = Number.isFinite(tConf) ? tConf : 0;
      if (!bestPositive || c > bestPositive.conf) {
        bestPositive = { labelHe, summaryHe: sumHe, conf: c };
      }
    }
    if (trend && (trend.accuracyDirection === "down" || trend.independenceDirection === "down")) {
      let score = 0;
      if (trend.accuracyDirection === "down") score += 2;
      if (trend.independenceDirection === "down") score += 1;
      if (trend.accuracyDirection === "up" && trend.independenceDirection === "down") score += 2;
      if (!worstCaution || score > worstCaution.score) {
        worstCaution = { labelHe, summaryHe: sumHe, score };
      }
    }
    if (
      trend &&
      trend.accuracyDirection === "up" &&
      trend.independenceDirection === "down" &&
      !improvingButSupportedHe
    ) {
      const subLab = SUBJECT_LABEL_HE[subjectId] || "המקצוע";
      improvingButSupportedHe = `ב${subLab} מופיעה לפחות שורה (${labelHe}) שבה הדיוק עולה אך העצמאות יורדת - ההתקדמות עדיין דורשת ליווי; עדיין לא שליטה עצמאית מלאה.`;
    }

    const dmp = String(sig?.dominantMistakePattern || "").trim();
    if (dmp) mistakePatternRowCounts[dmp] = (mistakePatternRowCounts[dmp] || 0) + 1;
    const lsg = String(sig?.learningStage || "").trim();
    if (lsg) learningStageRowCounts[lsg] = (learningStageRowCounts[lsg] || 0) + 1;
    const rrs = String(sig?.retentionRisk || "");
    if (rrRank[rrs] != null && rrRank[rrs] > maxRetentionRank) maxRetentionRank = rrRank[rrs];
    const trs = String(sig?.transferReadiness || "");
    if (trs && trScore[trs] != null && trScore[trs] >= 0 && trScore[trs] < minTransferScore) {
      minTransferScore = trScore[trs];
    }
    const rba = String(sig?.reviewBeforeAdvanceHe || "").trim();
    if (rba && reviewBeforeAdvanceRowHints.length < 4) reviewBeforeAdvanceRowHints.push(rba);

    const rtiRow = String(sig?.responseToIntervention || "").trim();
    if (rtiRow) rtiCounts[rtiRow] = (rtiCounts[rtiRow] || 0) + 1;
    const sf = String(sig?.supportFit || "").trim();
    if (fitRank[sf] != null && fitRank[sf] > fitBest) {
      fitBest = fitRank[sf];
      subjectSupportFitAgg = sf;
    }
    const adj = String(sig?.supportAdjustmentNeed || "").trim();
    if (adjRank[adj] != null && adjRank[adj] > adjBest) {
      adjBest = adjRank[adj];
      subjectSupportAdjustmentNeedAgg = adj;
    }
    const cf = String(sig?.conclusionFreshness || "").trim();
    if (cfRank[cf] != null && cfRank[cf] > cfBest) {
      cfBest = cfRank[cf];
      subjectConclusionFreshnessAgg = cf;
    }
    const rcn = String(sig?.recalibrationNeed || "").trim();
    if (recRank[rcn] != null && recRank[rcn] > recBest) {
      recBest = recRank[rcn];
      subjectRecalibrationNeedAgg = rcn;
    }

    const ssq = String(sig?.supportSequenceState || "").trim();
    if (ssq) seqStateCounts[ssq] = (seqStateCounts[ssq] || 0) + 1;
    const repP = String(sig?.strategyRepetitionRisk || "").trim();
    if (repRiskRankP11[repP] != null && repRiskRankP11[repP] > repBestP11) {
      repBestP11 = repRiskRankP11[repP];
      subjectStrategyRepetitionRiskAgg = repP;
    }
    const fatP = String(sig?.strategyFatigueRisk || "").trim();
    if (fatRiskRankP11[fatP] != null && fatRiskRankP11[fatP] > fatBestP11) {
      fatBestP11 = fatRiskRankP11[fatP];
      subjectStrategyFatigueRiskAgg = fatP;
    }
    const rotP = String(sig?.recommendationRotationNeed || "").trim();
    if (rotRankP11[rotP] != null && rotRankP11[rotP] > rotBestP11) {
      rotBestP11 = rotRankP11[rotP];
      subjectRecommendationRotationNeedAgg = rotP;
    }
    const advN = String(sig?.adviceNovelty || "").trim();
    const nvs = noveltyRankWorst[advN];
    if (nvs != null && nvs < noveltyWorstScore) {
      noveltyWorstScore = nvs;
      subjectAdviceNoveltyAgg = advN;
    }
    const nbs = String(sig?.nextBestSequenceStep || "").trim();
    if (nbs) nextBestStepCounts[nbs] = (nextBestStepCounts[nbs] || 0) + 1;

    const memSt = String(sig?.recommendationMemoryState || "").trim();
    if (MEM_STATE_RANK[memSt] != null && MEM_STATE_RANK[memSt] > memRankBest) {
      memRankBest = MEM_STATE_RANK[memSt];
      subjectRecommendationMemoryState = memSt;
    }
    const dep = String(sig?.supportHistoryDepth || "").trim();
    if (DEPTH_RANK[dep] != null && DEPTH_RANK[dep] > depthRankBest) {
      depthRankBest = DEPTH_RANK[dep];
      subjectSupportHistoryDepth = dep;
    }
    const car = String(sig?.recommendationCarryover || "").trim();
    if (CARRY_RANK[car] != null && CARRY_RANK[car] > carryRankBest) {
      carryRankBest = CARRY_RANK[car];
      subjectRecommendationCarryover = car;
    }
    const prs = String(sig?.priorRecommendationSignature || "").trim();
    if (prs) priorSigCounts[prs] = (priorSigCounts[prs] || 0) + 1;
    const mch = String(sig?.expectedVsObservedMatch || "").trim();
    if (mch) matchCounts[mch] = (matchCounts[mch] || 0) + 1;
    const flw = String(sig?.followThroughSignal || "").trim();
    if (flw) followCounts[flw] = (followCounts[flw] || 0) + 1;
    const cont = String(sig?.recommendationContinuationDecision || "").trim();
    if (cont) continuationCounts[cont] = (continuationCounts[cont] || 0) + 1;

    const gs = String(sig?.gateState || "").trim();
    if (gs) gateStateCounts[gs] = (gateStateCounts[gs] || 0) + 1;
    const gr = String(sig?.gateReadiness || "").trim();
    if (gr) readinessCounts[gr] = (readinessCounts[gr] || 0) + 1;
    const nf = String(sig?.nextCycleDecisionFocus || "").trim();
    if (nf) nextFocusCounts[nf] = (nextFocusCounts[nf] || 0) + 1;
    const tet = String(sig?.targetEvidenceType || "").trim();
    if (tet) targetTypeCounts[tet] = (targetTypeCounts[tet] || 0) + 1;
    const tow = String(sig?.targetObservationWindow || "").trim();
    if (tow) windowCounts[tow] = (windowCounts[tow] || 0) + 1;

    const depSt = String(sig?.dependencyState || "").trim();
    if (depSt) depStateCounts[depSt] = (depStateCounts[depSt] || 0) + 1;
    const lbk = String(sig?.likelyFoundationalBlocker || "").trim();
    if (lbk && lbk !== "unknown") blockerRowCounts[lbk] = (blockerRowCounts[lbk] || 0) + 1;
    const dsl = String(sig?.downstreamSymptomLikelihood || "").trim();
    const drk = dlRank[dsl] != null ? dlRank[dsl] : 0;
    if (drk > worstDownstreamRank) worstDownstreamRank = drk;
    if (sig?.foundationDecision === "stabilize_foundation_first" || sig?.shouldTreatAsFoundationFirst) {
      foundationHeavyRows += 1;
    }
  }

  const riskPool = {};
  for (const [k, n] of Object.entries(behaviorCounts)) {
    if (RISK_BEHAVIOR_TYPES.has(k)) riskPool[k] = n;
  }
  const riskEntries = Object.entries(riskPool)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  let dominantLearningRisk = "mixed";
  if (!riskEntries.length) {
    dominantLearningRisk = behaviorCounts.stable_mastery ? "none_observed" : "none_sparse";
  } else {
    const [topType, topN] = riskEntries[0];
    if (topN >= 2 || rows.length <= 4) dominantLearningRisk = topType;
    else if (rows.length >= 8 && topN === 1) dominantLearningRisk = "mixed_low_signal";
    else dominantLearningRisk = topType;
  }

  let dominantSuccessPattern = "mixed";
  if (stableMasteryRowCount >= 2 && stableMasteryRowCount >= fragileSuccessRowCount) {
    dominantSuccessPattern = "stable_mastery";
  } else if (fragileSuccessRowCount > stableMasteryRowCount && fragileSuccessRowCount >= 2) {
    dominantSuccessPattern = "fragile_success_cluster";
  } else if (stableMasteryRowCount > 0) {
    dominantSuccessPattern = "stable_mastery";
  } else if (fragileSuccessRowCount > 0) {
    dominantSuccessPattern = "fragile_success_cluster";
  }

  const modeDist = {};
  for (const m of modeKeys) modeDist[m] = (modeDist[m] || 0) + 1;
  const modeTop = Object.entries(modeDist).sort((a, b) => b[1] - a[1])[0];
  let modeConcentrationNoteHe = null;
  if (modeTop && modeKeys.length >= 4 && modeTop[1] / modeKeys.length >= 0.62) {
    modeConcentrationNoteHe = `רוב התרגול בתקופה שנבחרה במצב "${modeTop[0]}" - לא מכלילים אוטומטית לכל המקצוע.`;
  }

  const strongRows = rows.filter((r) => r.row.dataSufficiencyLevel === "strong" && r.row.evidenceStrength === "strong");
  const anyHighRisk = riskOr.falsePromotionRisk || riskOr.hintDependenceRisk || riskOr.recentTransitionRisk;
  const trendParts = [];
  if (bestPositive && bestPositive.summaryHe && (bestPositive.conf >= 0.35 || !Number.isFinite(bestPositive.conf))) {
    trendParts.push(`מגמה חיובית ב ${bestPositive.labelHe}: ${bestPositive.summaryHe}`);
  }
  if (worstCaution && worstCaution.summaryHe) {
    trendParts.push(`נקודת זהירות ב ${worstCaution.labelHe}: ${worstCaution.summaryHe}`);
  }
  if (modeConcentrationNoteHe) trendParts.push(modeConcentrationNoteHe);
  let trendNarrativeHe = trendParts.join(" ").trim();
  if (!trendNarrativeHe) {
    trendNarrativeHe =
      rows.some((r) => r.row.trend)
        ? "יש נתוני מגמה בשורות, אך אין עדיין סיפור מגמה אחיד ברמת המקצוע - כדאי לאסוף עוד תרגול."
        : "עדיין מעט נתונים על שינוי לאורך זמן - כדאי לבדוק שוב אחרי עוד תרגול.";
  }
  trendNarrativeHe = normalizeParentFacingHe(trendNarrativeHe);

  const suffStrong = rows.filter((r) => r.row.dataSufficiencyLevel === "strong").length;
  const suffMed = rows.filter((r) => r.row.dataSufficiencyLevel === "medium").length;
  const suffLow = rows.filter((r) => r.row.dataSufficiencyLevel === "low" || !r.row.dataSufficiencyLevel).length;
  const hiConf = rows.filter((r) => (Number(r.row.confidenceScore) || 0) >= 72).length;
  let confidenceSummaryHe = `לפי הנתונים שנאספו: ${suffStrong} שורות נותנות כיוון ברור, ${suffMed} שורות נותנות כיוון חלקי, ו ${suffLow} שורות עדיין עם מעט מידע; ${hiConf} נתונים ברורים יותר מתוך ${rows.length}.`;
  if (suffLow >= rows.length * 0.55) {
    confidenceSummaryHe += " התמונה במקצוע עדיין חלקית - נשארים בזהירות.";
  }
  if (anyHighRisk && strongRows.length >= 2) {
    confidenceSummaryHe += " למרות נתונים עם תוצאות טובות יחסית, מופיעות גם נקודות לתשומת לב - לא לסמן עדיין את הכול כיציב.";
  }

  const riskLabelHe = {
    ...PARENT_DIAGNOSTIC_TYPE_LABEL_HE,
    mixed: PARENT_DIAGNOSTIC_TYPE_LABEL_HE.mixed_signal,
    fragile_success: PARENT_DIAGNOSTIC_TYPE_LABEL_HE.fragile_success,
    none_sparse: "מעט מדי תרגול בשורות",
    none_observed: "לא זוהה סוג התנהגות חוזר אחד שבולט",
  };

  const successLabelHe = {
    stable_mastery: "שליטה טובה שנשמרת לאורך זמן בשורות",
    fragile_success_cluster: "הצלחה עם שבירות בעזרה/עצמאות",
    mixed: "תערובת הצלחות",
    none_sparse: "מעט מדי תרגול בשורות",
  };

  let recommendedHomeMethodHe = null;
  const domRiskHe = riskLabelHe[dominantLearningRisk] || dominantLearningRisk;
  if (dominantLearningRisk === "knowledge_gap") {
    recommendedHomeMethodHe = `מה לעשות בבית: חזרה איטית על הבסיס ב${domRiskHe} - משימה קצרה, בדיקה מול הפתרון, בלי עלייה מהירה מדי ברמה.`;
  } else if (dominantLearningRisk === "speed_pressure") {
    recommendedHomeMethodHe =
      "מה לעשות בבית: לפרק את הלחץ למהירות - תרגול באותה רמת קושי עם דגש על דיוק לפני מהירות, בלי להוריד רמה לכל המקצוע.";
  } else if (dominantLearningRisk === "instruction_friction") {
    recommendedHomeMethodHe =
      "מה לעשות בבית: קריאת משימה משותפת, זיהוי מה נשאל, ורק אז תשובה - לצמצם הילד עדיין נעזר ברמזים צעד אחר צעד.";
  } else if (dominantLearningRisk === "careless_pattern") {
    recommendedHomeMethodHe =
      "מה לעשות בבית: עצירה קצרה לפני שליחה, בדיקה מול הניסוח - לא מניחים מיד שזה קושי עמוק בבסיס.";
  } else if (dominantLearningRisk === "fragile_success") {
    recommendedHomeMethodHe =
      "מה לעשות בבית: לבנות עצמאות בהדרגה - תרגול קצר עם פחות עזרה אחרי שההבנה ברורה, בלי לדחוף עלייה מהירה מדי ברמה.";
  } else {
    recommendedHomeMethodHe =
      strongRows.length >= 1
        ? "מה לעשות בבית: לשמור על תרגול קצר וקבוע, ולבדוק שהרמה נשמרת לפני שינוי הגדרות."
        : "מה לעשות בבית: להמשיך לאסוף תרגול קצר עד שהתמונה במקצוע מתייצבת.";
  }

  const avoid = [];
  if (riskOr.falsePromotionRisk || dominantLearningRisk === "fragile_success") {
    avoid.push("לא לדחוף עלייה מהירה מדי ברמה או כיתה בבית בלי הצלחה שחוזרת ובלי ירידה בהילד עדיין נעזר ברמזים.");
  }
  if (riskOr.speedOnlyRisk || dominantLearningRisk === "speed_pressure") {
    avoid.push("לא להפוך קושי במצב מהירות לירידת רמה בכל המקצוע.");
  }
  if (riskOr.falseRemediationRisk || dominantLearningRisk === "careless_pattern") {
    avoid.push("לא לרדת מיד לרמה קלה בלי לנסות קודם חיזוק ממוקד באותה רמה.");
  }
  if (riskOr.hintDependenceRisk) {
    avoid.push("לא להפסיק פתאום עזרה - אלא לצמצם אותה בהדרגה כשההבנה משתפרת.");
  }
  if (worstCaution && worstCaution.score >= 3) {
    avoid.push("לא לפרש ירידה קצרה ככישלון קבוע - עדיף זהירות ובדיקה חוזרת.");
  }
  const whatNotToDoHe = avoid.length ? avoid.join(" ") : "לא לקבוע שינוי דרמטי בלי עוד תרגול בתקופה שנבחרה.";

  const rootEntries = Object.entries(rootCauseRowCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const nonInsEntries = rootEntries.filter(([k]) => k !== "insufficient_evidence");
  let dominantRootCause = "insufficient_evidence";
  let secondaryRootCause = null;
  if (rootEntries.length) {
    const top = rootEntries[0];
    if (top[0] === "insufficient_evidence" && nonInsEntries.length && nonInsEntries[0][1] >= top[1]) {
      dominantRootCause = nonInsEntries[0][0];
      secondaryRootCause = rootEntries.find(([k]) => k !== dominantRootCause)?.[0] ?? null;
    } else {
      dominantRootCause = top[0];
      secondaryRootCause = rootEntries[1]?.[0] ?? null;
    }
  }
  const dominantRootCauseLabelHe =
    ROOT_CAUSE_LABEL_HE[dominantRootCause] || ROOT_CAUSE_LABEL_HE.insufficient_evidence;

  const nR = rows.length;
  const wFrac = withheldStrengthRows / nR;
  const tFrac = tentativeStrengthRows / nR;
  let subjectConclusionReadiness = "ready";
  if (wFrac >= 0.38) subjectConclusionReadiness = "not_ready";
  else if (wFrac + tFrac >= 0.45) subjectConclusionReadiness = "partial";

  subjectConclusionReadiness = mergeSubjectConclusionReadinessContract({
    internalReadiness: subjectConclusionReadiness,
    rows,
    withheldStrengthRows,
    tentativeStrengthRows,
    rowCount: nR,
    hasCannotConcludeYet: false,
  });

  let subjectDiagnosticRestraintHe = "";
  if (subjectConclusionReadiness === "not_ready") {
    subjectDiagnosticRestraintHe =
      "ברוב נתוני המקצוע עדיין יש מעט מידע או מוקדם לקבוע - לא קובעים עדיין הסבר חד משמעי.";
  } else if (subjectConclusionReadiness === "partial") {
    subjectDiagnosticRestraintHe =
      "יש מידע מסוים, אבל גם נתונים שדורשים זהירות - כדאי לעקוב ולא למהר לקבוע כיוון חזק מדי.";
  } else if (moderateOrStrongRows >= Math.ceil(nR * 0.55)) {
    subjectDiagnosticRestraintHe = "יש כמה נתונים שמראים כיוון דומה - אפשר לסמוך יותר על הסיכום בתוך המקצוע.";
  } else {
    subjectDiagnosticRestraintHe = "התמונה במקצוע עדיין מעורבת - כדאי לעבור על הנושאים בנפרד.";
  }

  const intv = pickRecommendedInterventionType(dominantRootCause, "maintain_and_strengthen");
  const subjectInterventionPriorityHe = INTERVENTION_TYPE_LABEL_HE[intv] || INTERVENTION_TYPE_LABEL_HE.monitor_before_escalation;

  const priorityFields = computeSubjectPriorityFieldsPhase8(subjectId, {
    dominantLearningRisk,
    dominantSuccessPattern,
    subjectConclusionReadiness,
    dominantRootCause,
    riskOr,
    stableMasteryRowCount,
    fragileSuccessRowCount,
    recommendedHomeMethodHe,
    strongRowCount: strongRows.length,
  });

  const mpEntries = Object.entries(mistakePatternRowCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const nonInsMp = mpEntries.filter(([k]) => k !== "insufficient_mistake_evidence");
  let dominantMistakePattern = "insufficient_mistake_evidence";
  if (mpEntries.length) {
    const top = mpEntries[0];
    if (top[0] === "insufficient_mistake_evidence" && nonInsMp.length && nonInsMp[0][1] >= top[1]) {
      dominantMistakePattern = nonInsMp[0][0];
    } else {
      dominantMistakePattern = top[0];
    }
  }
  const dominantMistakePatternLabelHe =
    MISTAKE_PATTERN_LABEL_HE[dominantMistakePattern] || MISTAKE_PATTERN_LABEL_HE.insufficient_mistake_evidence;

  const STAGE_PRIORITY = [
    "regression_signal",
    "fragile_retention",
    "early_acquisition",
    "insufficient_longitudinal_evidence",
    "partial_stabilization",
    "transfer_emerging",
    "stable_control",
  ];
  let subjectLearningStage = "insufficient_longitudinal_evidence";
  for (const st of STAGE_PRIORITY) {
    if ((learningStageRowCounts[st] || 0) > 0) {
      subjectLearningStage = st;
      break;
    }
  }
  const subjectLearningStageLabelHe =
    LEARNING_STAGE_LABEL_HE[subjectLearningStage] || LEARNING_STAGE_LABEL_HE.insufficient_longitudinal_evidence;

  const subjectRetentionRisk =
    maxRetentionRank >= 3 ? "high" : maxRetentionRank === 2 ? "moderate" : maxRetentionRank === 1 ? "low" : "unknown";

  let subjectTransferReadiness = "not_ready";
  if (minTransferScore === 99) subjectTransferReadiness = "not_ready";
  else if (minTransferScore === 3) subjectTransferReadiness = "ready";
  else if (minTransferScore === 2) subjectTransferReadiness = "emerging";
  else if (minTransferScore === 1) subjectTransferReadiness = "limited";
  else subjectTransferReadiness = "not_ready";

  if (subjectLearningStage === "fragile_retention" || subjectLearningStage === "regression_signal") {
    if (subjectTransferReadiness === "ready") subjectTransferReadiness = "limited";
  }

  const subjectMemoryNarrativeHe = `${subjectLearningStageLabelHe} ברוב השורות - שימור: ${
    subjectRetentionRisk === "high"
      ? "עדיף חיזוק חוזר לפני הרחבה."
      : subjectRetentionRisk === "moderate"
        ? "כדאי לעקוב לפני שינוי מהותי."
        : "אפשר להמשיך בקצב קבוע ולשים לב לתוצאות."
  }`.trim();

  let subjectReviewBeforeAdvanceHe = null;
  if (subjectRetentionRisk === "high" || subjectLearningStage === "fragile_retention" || subjectLearningStage === "regression_signal") {
    subjectReviewBeforeAdvanceHe =
      "לעצור לרגע לפני קידום: לחזור על אותה רמה עם מפגשים קצרים עד שמתייצב דיוק.";
  } else if (reviewBeforeAdvanceRowHints.length) {
    subjectReviewBeforeAdvanceHe = reviewBeforeAdvanceRowHints[0];
  } else if (subjectTransferReadiness === "limited" || subjectTransferReadiness === "not_ready") {
    subjectReviewBeforeAdvanceHe = "לוודא חזרה על טעויות דומות באותה רמה לפני פתיחת נושא חדש.";
  }

  let subjectResponseToIntervention = "not_enough_evidence";
  const rtiSum = Object.values(rtiCounts).reduce((a, b) => a + b, 0);
  if (rtiSum > 0) {
    for (const id of RTI_SUBJECT_WORST_FIRST) {
      if ((rtiCounts[id] || 0) > 0) {
        subjectResponseToIntervention = id;
        break;
      }
    }
  }
  const subjectResponseToInterventionLabelHe =
    RESPONSE_TO_INTERVENTION_LABEL_HE[subjectResponseToIntervention] ||
    RESPONSE_TO_INTERVENTION_LABEL_HE.not_enough_evidence;
  const subjectSupportFit = subjectSupportFitAgg;
  const subjectSupportAdjustmentNeed = subjectSupportAdjustmentNeedAgg;
  const subjectSupportAdjustmentNeedHe =
    SUPPORT_ADJUSTMENT_NEED_LABEL_HE[subjectSupportAdjustmentNeed] ||
    SUPPORT_ADJUSTMENT_NEED_LABEL_HE.monitor_only;
  const subjectConclusionFreshness = subjectConclusionFreshnessAgg;
  const subjectRecalibrationNeed = subjectRecalibrationNeedAgg;
  const subjectRecalibrationNeedHe =
    RECALIBRATION_NEED_LABEL_HE[subjectRecalibrationNeed] || RECALIBRATION_NEED_LABEL_HE.none;
  const subLabAgg = SUBJECT_LABEL_HE[subjectId] || "המקצוע";
  const subjectEffectivenessNarrativeHe =
    `ב${subLabAgg}: ${subjectResponseToInterventionLabelHe}. ` +
    (subjectRecalibrationNeed !== "none" ? subjectRecalibrationNeedHe : subjectSupportAdjustmentNeedHe);

  let subjectSupportSequenceState = "insufficient_sequence_evidence";
  const seqStateSum = Object.values(seqStateCounts).reduce((a, b) => a + b, 0);
  if (seqStateSum > 0) {
    for (const id of SEQ_STATE_WORST_FIRST) {
      if ((seqStateCounts[id] || 0) > 0) {
        subjectSupportSequenceState = id;
        break;
      }
    }
  }
  const subjectSupportSequenceStateLabelHe =
    SUPPORT_SEQUENCE_STATE_LABEL_HE[subjectSupportSequenceState] ||
    SUPPORT_SEQUENCE_STATE_LABEL_HE.insufficient_sequence_evidence;

  let subjectNextBestSequenceStep = "observe_before_next_cycle";
  const nbsSum = Object.values(nextBestStepCounts).reduce((a, b) => a + b, 0);
  if (nbsSum > 0) {
    for (const id of NEXT_BEST_STEP_WORST_FIRST) {
      if ((nextBestStepCounts[id] || 0) > 0) {
        subjectNextBestSequenceStep = id;
        break;
      }
    }
  }
  const subjectNextBestSequenceStepHe =
    NEXT_BEST_SEQUENCE_STEP_LABEL_HE[subjectNextBestSequenceStep] ||
    NEXT_BEST_SEQUENCE_STEP_LABEL_HE.observe_before_next_cycle;

  const subjectSequenceNarrativeHe =
    `ב${subLabAgg}: ${subjectSupportSequenceStateLabelHe}. ${subjectNextBestSequenceStepHe} · ` +
    (RECOMMENDATION_ROTATION_NEED_LABEL_HE[subjectRecommendationRotationNeedAgg] ||
      RECOMMENDATION_ROTATION_NEED_LABEL_HE.none);

  const priorSigEntries = Object.entries(priorSigCounts)
    .filter(([k]) => k && k !== "unknown")
    .sort((a, b) => b[1] - a[1]);
  const priorSigAll = Object.entries(priorSigCounts).sort((a, b) => b[1] - a[1]);
  let subjectPriorRecommendationSignature = "unknown";
  if (priorSigEntries.length) subjectPriorRecommendationSignature = priorSigEntries[0][0];
  else if (priorSigAll.length) subjectPriorRecommendationSignature = priorSigAll[0][0];

  let subjectExpectedVsObservedMatch = "not_enough_evidence";
  const mSum = Object.values(matchCounts).reduce((a, b) => a + b, 0);
  if (mSum > 0) {
    for (const id of MATCH_WORST_FIRST) {
      if ((matchCounts[id] || 0) > 0) {
        subjectExpectedVsObservedMatch = id;
        break;
      }
    }
  }

  let subjectFollowThroughSignal = "not_inferable";
  const fSum = Object.values(followCounts).reduce((a, b) => a + b, 0);
  if (fSum > 0) {
    for (const id of FOLLOW_WORST_FIRST) {
      if ((followCounts[id] || 0) > 0) {
        subjectFollowThroughSignal = id;
        break;
      }
    }
  }

  let subjectContinuationDecision = "continue_but_refine";
  const cSum = Object.values(continuationCounts).reduce((a, b) => a + b, 0);
  if (cSum > 0) {
    for (const id of CONTINUATION_WORST_FIRST) {
      if ((continuationCounts[id] || 0) > 0) {
        subjectContinuationDecision = id;
        break;
      }
    }
  }
  const subjectContinuationDecisionHe =
    RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE[subjectContinuationDecision] ||
    RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE.continue_but_refine;

  const subjectOutcomeNarrativeHe =
    `ב${subLabAgg}: ${RECOMMENDATION_MEMORY_STATE_LABEL_HE[subjectRecommendationMemoryState] || RECOMMENDATION_MEMORY_STATE_LABEL_HE.no_memory} · ` +
    `${PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE[subjectPriorRecommendationSignature] || PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE.unknown} · ` +
    `${EXPECTED_VS_OBSERVED_MATCH_LABEL_HE[subjectExpectedVsObservedMatch] || EXPECTED_VS_OBSERVED_MATCH_LABEL_HE.not_enough_evidence} · ` +
    `${FOLLOW_THROUGH_SIGNAL_LABEL_HE[subjectFollowThroughSignal] || FOLLOW_THROUGH_SIGNAL_LABEL_HE.not_inferable} · ` +
    subjectContinuationDecisionHe;

  let subjectGateState = "gates_not_ready";
  const gSum = Object.values(gateStateCounts).reduce((a, b) => a + b, 0);
  if (gSum > 0) {
    for (const id of GATE_STATE_PRIORITY) {
      if ((gateStateCounts[id] || 0) > 0) {
        subjectGateState = id;
        break;
      }
    }
  }
  const subjectGateStateLabelHe = GATE_STATE_LABEL_HE[subjectGateState] || GATE_STATE_LABEL_HE.gates_not_ready;

  let subjectGateReadiness = "insufficient";
  const rSum = Object.values(readinessCounts).reduce((a, b) => a + b, 0);
  if (rSum > 0) {
    for (const id of READINESS_WORST) {
      if ((readinessCounts[id] || 0) > 0) {
        subjectGateReadiness = id;
        break;
      }
    }
  }

  let subjectNextCycleDecisionFocus = "prove_current_direction";
  const nfSum = Object.values(nextFocusCounts).reduce((a, b) => a + b, 0);
  if (nfSum > 0) {
    for (const id of [
      "refresh_baseline_before_decision",
      "test_if_path_is_working",
      "stabilize_before_advance",
      "check_independence_before_release",
      "prepare_for_controlled_release",
      "prove_current_direction",
    ]) {
      if ((nextFocusCounts[id] || 0) > 0) {
        subjectNextCycleDecisionFocus = id;
        break;
      }
    }
  }
  const subjectNextCycleDecisionFocusHe =
    NEXT_CYCLE_DECISION_FOCUS_LABEL_HE[subjectNextCycleDecisionFocus] ||
    NEXT_CYCLE_DECISION_FOCUS_LABEL_HE.prove_current_direction;

  let subjectEvidenceTargetType = "mixed_target";
  const tSum = Object.values(targetTypeCounts).reduce((a, b) => a + b, 0);
  if (tSum > 0) {
    for (const id of TARGET_TYPE_PRIORITY) {
      if ((targetTypeCounts[id] || 0) > 0) {
        subjectEvidenceTargetType = id;
        break;
      }
    }
  }

  let subjectTargetObservationWindow = "unknown";
  const wSum = Object.values(windowCounts).reduce((a, b) => a + b, 0);
  if (wSum > 0) {
    for (const id of WINDOW_PRIORITY) {
      if ((windowCounts[id] || 0) > 0) {
        subjectTargetObservationWindow = id;
        break;
      }
    }
  }

  const subjectGateNarrativeHe =
    `ב${subLabAgg}: ${subjectGateStateLabelHe} · ${subjectNextCycleDecisionFocusHe} · ` +
    `${TARGET_EVIDENCE_TYPE_LABEL_HE[subjectEvidenceTargetType] || TARGET_EVIDENCE_TYPE_LABEL_HE.mixed_target} · ` +
    `${TARGET_OBSERVATION_WINDOW_LABEL_HE[subjectTargetObservationWindow] || TARGET_OBSERVATION_WINDOW_LABEL_HE.unknown}`;

  const DEP_SUBJ_PRIORITY = [
    "likely_foundational_block",
    "mixed_dependency_signal",
    "insufficient_dependency_evidence",
    "likely_local_issue",
  ];
  let subjectDependencyState = "insufficient_dependency_evidence";
  const depStateSum = Object.values(depStateCounts).reduce((a, b) => a + b, 0);
  if (depStateSum > 0) {
    for (const id of DEP_SUBJ_PRIORITY) {
      if ((depStateCounts[id] || 0) > 0) {
        subjectDependencyState = id;
        break;
      }
    }
  }
  const nDepFound = depStateCounts.likely_foundational_block || 0;
  const nDepLocal = depStateCounts.likely_local_issue || 0;
  if (rows.length >= 4 && nDepFound === 1 && stableMasteryRowCount >= 2 && fragileSuccessRowCount <= 1) {
    subjectDependencyState = "likely_local_issue";
  }
  if (rows.length >= 3 && nDepLocal >= rows.length - 1 && nDepFound === 0) {
    subjectDependencyState = "likely_local_issue";
  }

  const BLOCK_SUBJ_PRIORITY = [
    "retention_instability",
    "independence_readiness_gap",
    "accuracy_foundation_gap",
    "instruction_language_load",
    "procedure_automaticity_gap",
    "unknown",
  ];
  let subjectLikelyFoundationalBlocker = "unknown";
  const blkSum = Object.values(blockerRowCounts).reduce((a, b) => a + b, 0);
  if (blkSum > 0) {
    for (const id of BLOCK_SUBJ_PRIORITY) {
      if ((blockerRowCounts[id] || 0) > 0) {
        subjectLikelyFoundationalBlocker = id;
        break;
      }
    }
  }

  let subjectDownstreamSymptomRisk = "unknown";
  if (worstDownstreamRank >= 3) subjectDownstreamSymptomRisk = "high";
  else if (worstDownstreamRank === 2) subjectDownstreamSymptomRisk = "moderate";
  else if (worstDownstreamRank === 1) subjectDownstreamSymptomRisk = "low";

  const subjectFoundationFirstPriority =
    subjectDependencyState === "likely_foundational_block" ||
    (subjectDependencyState === "mixed_dependency_signal" && foundationHeavyRows >= 1);
  const subjectFoundationFirstPriorityHe = subjectFoundationFirstPriority
    ? "כדאי לפתוח קודם ייצוב בסיס קצר במקצוע הזה - ורק אז להרחיב."
    : "אפשר להישאר עם תרגול ממוקד או קל במקביל - בלי להרחיב לסיפור רחב מיותר.";

  const subjectDependencyStateLabelHe =
    DEPENDENCY_STATE_LABEL_HE[subjectDependencyState] || DEPENDENCY_STATE_LABEL_HE.insufficient_dependency_evidence;
  const subjectLikelyFoundationalBlockerLabelHe =
    FOUNDATIONAL_BLOCKER_LABEL_HE[subjectLikelyFoundationalBlocker] || FOUNDATIONAL_BLOCKER_LABEL_HE.unknown;

  const subjectDependencyNarrativeHe =
    `ב${subLabAgg}: ${subjectDependencyStateLabelHe} · ${subjectLikelyFoundationalBlockerLabelHe} · ${subjectFoundationFirstPriorityHe}`;

  return {
    dominantLearningRisk,
    dominantSuccessPattern,
    trendNarrativeHe,
    confidenceSummaryHe,
    recommendedHomeMethodHe,
    whatNotToDoHe,
    majorRiskFlagsAcrossRows: riskOr,
    dominantBehaviorProfileAcrossRows: Object.keys(behaviorCounts).sort(
      (a, b) => (behaviorCounts[b] || 0) - (behaviorCounts[a] || 0)
    )[0] || "undetermined",
    strongestPositiveTrendRowHe: bestPositive
      ? normalizeParentFacingHe(`${bestPositive.labelHe}: ${bestPositive.summaryHe}`)
      : null,
    strongestCautionTrendRowHe: worstCaution
      ? normalizeParentFacingHe(`${worstCaution.labelHe}: ${worstCaution.summaryHe}`)
      : null,
    fragileSuccessRowCount,
    stableMasteryRowCount,
    modeConcentrationNoteHe,
    dominantLearningRiskLabelHe: normalizeParentFacingHe(
      riskLabelHe[dominantLearningRisk] || String(dominantLearningRisk || "")
    ),
    dominantSuccessPatternLabelHe: normalizeParentFacingHe(
      successLabelHe[dominantSuccessPattern] || String(dominantSuccessPattern || "")
    ),
    improvingButSupportedHe,
    dominantRootCause,
    dominantRootCauseLabelHe,
    secondaryRootCause,
    rootCauseDistribution: { ...rootCauseRowCounts },
    subjectDiagnosticRestraintHe,
    subjectConclusionReadiness,
    subjectInterventionPriorityHe,
    ...priorityFields,
    dominantMistakePattern,
    dominantMistakePatternLabelHe,
    mistakePatternDistribution: { ...mistakePatternRowCounts },
    subjectLearningStage,
    subjectLearningStageLabelHe,
    subjectRetentionRisk,
    subjectTransferReadiness,
    subjectMemoryNarrativeHe,
    subjectReviewBeforeAdvanceHe,
    subjectResponseToIntervention,
    subjectResponseToInterventionLabelHe,
    subjectSupportFit,
    subjectSupportAdjustmentNeed,
    subjectSupportAdjustmentNeedHe,
    subjectConclusionFreshness,
    subjectRecalibrationNeed,
    subjectRecalibrationNeedHe,
    subjectEffectivenessNarrativeHe,
    subjectSupportSequenceState,
    subjectSupportSequenceStateLabelHe,
    subjectStrategyRepetitionRisk: subjectStrategyRepetitionRiskAgg,
    subjectStrategyFatigueRisk: subjectStrategyFatigueRiskAgg,
    subjectNextBestSequenceStep,
    subjectNextBestSequenceStepHe,
    subjectAdviceNovelty: subjectAdviceNoveltyAgg,
    subjectRecommendationRotationNeed: subjectRecommendationRotationNeedAgg,
    subjectSequenceNarrativeHe,
    subjectRecommendationMemoryState,
    subjectPriorRecommendationSignature,
    subjectSupportHistoryDepth,
    subjectRecommendationCarryover,
    subjectExpectedVsObservedMatch,
    subjectFollowThroughSignal,
    subjectContinuationDecision,
    subjectContinuationDecisionHe,
    subjectOutcomeNarrativeHe,
    subjectGateState,
    subjectGateStateLabelHe,
    subjectGateReadiness,
    subjectNextCycleDecisionFocus,
    subjectNextCycleDecisionFocusHe,
    subjectEvidenceTargetType,
    subjectTargetObservationWindow,
    subjectGateNarrativeHe,
    subjectDependencyState,
    subjectDependencyStateLabelHe,
    subjectLikelyFoundationalBlocker,
    subjectLikelyFoundationalBlockerLabelHe,
    subjectDownstreamSymptomRisk,
    subjectFoundationFirstPriority,
    subjectFoundationFirstPriorityHe,
    subjectDependencyNarrativeHe,
  };
}

/**
 * @param {Record<string, unknown>} report
 * @param {Record<string, unknown[]>} [rawMistakesBySubject]
 */
export function analyzeLearningPatterns(report, rawMistakesBySubject = {}) {
  if (report?.mathOperations && typeof report.mathOperations === "object") {
    applyMathScopedParentDisplayNames(report.mathOperations);
  }
  const out = {
    version: 2,
    generatedAt: new Date().toISOString(),
    constants: {
      minMistakesPerPatternFamily: MIN_PATTERN_FAMILY_FOR_DIAGNOSIS,
      minMistakesForStrongRecommendation: MIN_MISTAKES_FOR_STRONG_RECOMMENDATION,
      maxWeaknesses: MAX_TOP_WEAKNESSES,
      maxStrengthRows: MAX_TOP_STRENGTHS,
      maxMaintain: MAX_MAINTAIN,
      maxImproving: MAX_IMPROVING,
      maxStableExcellence: MAX_STABLE_EXCELLENCE,
      stableExcellenceMinAccuracy: STABLE_EXCELLENCE_MIN_ACCURACY,
      stableExcellenceMinQuestions: STABLE_EXCELLENCE_MIN_QUESTIONS,
    },
    subjects: {},
  };

  if (!report || typeof report !== "object") return out;

  for (const sid of SUBJECT_IDS) {
    const rawList = Array.isArray(rawMistakesBySubject[sid])
      ? rawMistakesBySubject[sid]
      : [];
    const events = rawList.map((r) => normalizeMistakeEvent(r, sid));
    const wrong = events.filter((e) => !e.isCorrect);

    const clusters = {};
    wrong.forEach((ev) => {
      const key = mistakePatternClusterKey(ev);
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(ev);
    });

    const weaknessCandidates = [];
    const insufficientData = [];

    Object.entries(clusters).forEach(([, list]) => {
      const n = list.length;
      if (n < MIN_PATTERN_FAMILY_FOR_DIAGNOSIS) {
        if (insufficientData.length < 24) {
          insufficientData.push({
            mistakeCount: n,
            note: "פחות מ 5 טעויות באותו דפוס - עדיין מוקדם לקבוע קושי שחוזר",
          });
        }
        return;
      }
      const sample = list[list.length - 1];
      const labelHe = weaknessLabelHe(sid, sample);
      const rs = recStrength(n);
      weaknessCandidates.push({
        labelHe,
        mistakeCount: n,
        confidence: rs === "strong" ? "high" : "moderate",
        sampleEvent: sample,
      });
    });

    weaknessCandidates.sort((a, b) => b.mistakeCount - a.mistakeCount);
    const topWeaknessesPre = weaknessCandidates.slice(0, MAX_TOP_WEAKNESSES).map((w, i) => {
      const lab = w.labelHe || GENERIC_WEAKNESS_HE;
      return {
        id: `${sid}:w:${i}`,
        labelHe: lab,
        mistakeCount: w.mistakeCount,
        confidence: w.confidence,
        tierHe: weaknessTierHe(lab, w.mistakeCount, w.confidence),
      };
    });

    const {
      stableExcellence,
      excellent,
      strengths,
      maintain,
      improving,
      topStrengths,
    } = buildSessionBands(sid, report);

    const {
      topWeaknesses,
      parentTopicToneByKey,
      parentStrengthWithCautionLinesByKey,
    } = reconcileParentFacingTopicSignals(sid, report, weaknessCandidates, topWeaknessesPre);

    const weaknesses = topWeaknesses.map((w) => ({ ...w }));

    const studentRecommendationsImprove = [];
    const studentRecommendationsMaintain = [];
    const parentRecommendationsImprove = [];
    const parentRecommendationsMaintain = [];

    for (const w of topWeaknesses.slice(0, 2)) {
      const rs = recStrength(w.mistakeCount);
      studentRecommendationsImprove.push({
        id: `stu-imp:${w.id}`,
        textHe: `כדאי לתרגל עוד קצת ${parentCopyTopicPhraseForFocusHe(w.labelHe)} - נרשמו ${w.mistakeCount} טעויות דומות בתקופה שנבחרה. נשארים עם תרגול ממוקד ולא עם "לנסות לתקן הכול בבת אחת".`,
        strength: rs,
      });
    }

    const w0 = topWeaknesses[0];
    if (w0) {
      const rs = recStrength(w0.mistakeCount);
      parentRecommendationsImprove.push({
        id: `par-imp:${w0.id}`,
        textHe:
          rs === "strong"
            ? `חוזרת אותה טעות - ${parentCopyTopicPhraseHe(w0.labelHe)}. זה לא חירום, אבל שווה לטפל. מומלץ לשבת יחד על דוגמה אחת ולעבור עליה בקול צעד אחר צעד.`
            : `מתחילה חזרה על אותו סוג טעות - ${parentCopyTopicPhraseHe(w0.labelHe)}. לשבוע הקרוב מספיק מבט רגוע ותרגול קצר וממוקד.`,
        strength: rs,
      });
    }

    const topPositive =
      stableExcellence[0] || topStrengths[0] || excellent[0] || strengths[0];
    if (topPositive) {
      const rs =
        topPositive.confidence === "high" || topPositive.questions >= 18
          ? "strong"
          : "moderate";
      studentRecommendationsMaintain.push({
        id: `stu-maint:${topPositive.id}`,
        textHe: `להמשיך לתרגל בנוחות בנושא ${topPositive.labelHe} - הרמה שם נשמרת (דיוק כ ${topPositive.accuracy}%).`,
        strength: rs,
      });
      parentRecommendationsMaintain.push({
        id: `par-maint:${topPositive.id}`,
        textHe: `מומלץ לעודד על ההתמדה בנושא ${topPositive.labelHe} - רואים הצלחה חוזרת; שימור הרגל חיובי חשוב לא פחות מתיקון טעויות.`,
        strength: rs,
      });
    }

    let diagnosticSparseNoteHe = null;
    if (!topWeaknesses.length && wrong.length > 0) {
      diagnosticSparseNoteHe =
        "יש טעויות בודדות אך בלי דפוס שחוזר מספיק פעמים - עדיין לא ניתן לקבוע קושי שחוזר.";
      if (!parentRecommendationsImprove.length) {
        parentRecommendationsImprove.push({
          id: `par-imp:${sid}:sparse`,
          textHe: diagnosticSparseNoteHe,
          strength: "tentative",
        });
      }
    }

    let evidenceMistake = null;
    const wTopMatched =
      weaknessCandidates.find((c) =>
        topWeaknesses.some((w) => w.labelHe === c.labelHe && w.mistakeCount === c.mistakeCount)
      ) || null;
    if (wTopMatched && wTopMatched.sampleEvent) {
      evidenceMistake = buildEvidenceMistakeFromEvent(
        wTopMatched.sampleEvent,
        wTopMatched.confidence
      );
    }

    const evidenceSuccess = buildEvidenceSuccessFromPick(
      stableExcellence[0] || topStrengths[0]
    );
    const evidenceExamples = buildEvidenceExamples(evidenceMistake, evidenceSuccess);

    const summaryHe = buildSummaryHe(
      SUBJECT_LABEL_HE[sid],
      stableExcellence,
      topStrengths,
      topWeaknesses,
      maintain,
      improving,
      wrong.length,
      events.length,
      diagnosticSparseNoteHe
    );

    let parentActionHe = buildParentActionHe(
      SUBJECT_LABEL_HE[sid],
      topWeaknesses,
      improving,
      maintain,
      topStrengths
    );
    parentActionHe = mergeParentActionWithCautionBlocks(
      parentActionHe,
      parentStrengthWithCautionLinesByKey
    );

    const nextWeekGoalHe = buildNextWeekGoalHe(
      SUBJECT_LABEL_HE[sid],
      topWeaknesses,
      improving,
      topStrengths,
      maintain,
      stableExcellence
    );

    const diagnosticSectionsHe = buildDiagnosticSectionsHe({
      stableExcellence,
      topStrengths,
      maintain,
      improving,
      topWeaknesses,
      insufficientData,
      diagnosticSparseNoteHe,
      parentActionHe,
      nextWeekGoalHe,
    });
    const subSkillInsightsHe = buildSubSkillInsightsHe(topWeaknesses);

    const phase3Subject = synthesizeSubjectPhase3FromRows(sid, report);

    const hasAnySignal =
      stableExcellence.length > 0 ||
      topWeaknesses.length > 0 ||
      topStrengths.length > 0 ||
      maintain.length > 0 ||
      improving.length > 0 ||
      studentRecommendationsImprove.length > 0 ||
      studentRecommendationsMaintain.length > 0 ||
      parentRecommendationsImprove.length > 0 ||
      parentRecommendationsMaintain.length > 0 ||
      evidenceMistake != null ||
      evidenceSuccess != null ||
      !!summaryHe;

    out.subjects[sid] = {
      subject: sid,
      subjectLabelHe: SUBJECT_LABEL_HE[sid],
      mistakeEventCount: events.length,
      wrongCount: wrong.length,
      hasAnySignal,
      summaryHe,
      topStrengths,
      topWeaknesses,
      parentTopicToneByKey,
      parentStrengthWithCautionLinesByKey,
      parentActionHe,
      nextWeekGoalHe,
      evidenceExamples,
      weaknesses,
      strengths,
      stableExcellence,
      excellent,
      maintain,
      improving,
      studentRecommendationsImprove,
      studentRecommendationsMaintain,
      parentRecommendationsImprove,
      parentRecommendationsMaintain,
      evidenceMistake,
      evidenceSuccess,
      insufficientData,
      diagnosticSparseNoteHe,
      diagnosticSectionsHe,
      subSkillInsightsHe,
      ...phase3Subject,
    };
  }

  return out;
}

/** דוגמה סטטית לפי מבנה גרסה 2 */
export const EXAMPLE_PATTERN_DIAGNOSTICS_PAYLOAD = {
  version: 2,
  generatedAt: "2026-04-11T12:00:00.000Z",
  constants: {
    minMistakesPerPatternFamily: 5,
    minMistakesForStrongRecommendation: 10,
    maxWeaknesses: 3,
    maxStrengthRows: 3,
    maxMaintain: 2,
    maxImproving: 2,
    maxStableExcellence: 3,
    stableExcellenceMinAccuracy: 92,
    stableExcellenceMinQuestions: 22,
  },
  subjects: {
    math: {
      subject: "math",
      subjectLabelHe: "מתמטיקה",
      mistakeEventCount: 12,
      wrongCount: 12,
      hasAnySignal: true,
      summaryHe:
        "תמונת המקצוע במתמטיקה: הילד מצליח בחיבור לאורך זמן. יש גם מקום לחיזוק בהשוואת כמויות או מספרים.",
      stableExcellence: [
        {
          id: "math:addition:learning",
          labelHe: "חיבור",
          questions: 42,
          accuracy: 93,
          confidence: "high",
          needsPractice: false,
          excellent: true,
          tierHe: "הילד מצליח בנושא הזה לאורך זמן",
        },
      ],
      topStrengths: [],
      topWeaknesses: [
        {
          id: "math:w:0",
          labelHe: "קושי בהשוואת כמויות או מספרים",
          mistakeCount: 7,
          confidence: "moderate",
          tierHe: "קושי נקודתי",
        },
      ],
      parentTopicToneByKey: {},
      parentStrengthWithCautionLinesByKey: {},
      parentActionHe:
        "שלוש פעמים בשבוע, 15–20 דק׳ בכל מפגש: לבחור משימה אחת במתמטיקה בנושא בהשוואת כמויות או מספרים - לקרוא יחד את הניסוח, לנסח בקול מה נתון ומה מבקשים, לבצע צעד ראשון על דף טיוטה ורק אז לכתוב תשובה סופית ולבדוק מול הפתרון.",
      nextWeekGoalHe:
        "יעד לחיזוק: להעלות את אחוזי ההצלחה בהשוואת כמויות או מספרים (לפחות ניסיון אחד מוצלח יותר מהשבוע שעבר). יעד לשימור: להמשיך בשגרת תרגול נינוחה בנושא חיבור כדי לשמר את רמת הדיוק.",
      evidenceExamples: [
        {
          type: "mistake",
          exerciseText: "בכמה שקים המחיר של המחשב גבוה יותר?",
          questionLabel: null,
          correctAnswer: 120,
          userAnswer: 102,
          confidence: "moderate",
        },
        {
          type: "success",
          titleHe: "מה שהילד עושה טוב בתרגול",
          bodyHe:
            "בנושא חיבור יש הצלחה טובה בתקופה שנבחרה: כ 93% נכון מתוך 42 שאלות.",
          confidence: "high",
        },
      ],
      weaknesses: [
        {
          id: "math:w:0",
          labelHe: "קושי בהשוואת כמויות או מספרים",
          mistakeCount: 7,
          confidence: "moderate",
          tierHe: "קושי נקודתי",
        },
      ],
      strengths: [],
      excellent: [],
      maintain: [],
      improving: [],
      studentRecommendationsImprove: [
        {
          id: "stu-imp:math:w:0",
          textHe:
            "כדאי לתרגל עוד קצת בנושא: בהשוואת כמויות או מספרים - נרשמו 7 טעויות דומות בתקופה שנבחרה. נשארים עם תרגול ממוקד ולא עם \"לנסות לתקן הכול בבת אחת\".",
          strength: "moderate",
        },
      ],
      studentRecommendationsMaintain: [
        {
          id: "stu-maint:math:addition:learning",
          textHe:
            "להמשיך לתרגל בנוחות בנושא חיבור - הרמה שם נשמרת (דיוק כ 93%).",
          strength: "strong",
        },
      ],
      parentRecommendationsImprove: [
        {
          id: "par-imp:math:w:0",
          textHe:
            "מתחילה חזרה על אותו סוג טעות - בנושא בהשוואת כמויות או מספרים. לשבוע הקרוב מספיק מבט רגוע ותרגול קצר וממוקד.",
          strength: "moderate",
        },
      ],
      parentRecommendationsMaintain: [
        {
          id: "par-maint:math:addition:learning",
          textHe:
            "מומלץ לעודד על ההתמדה בנושא חיבור - רואים הצלחה חוזרת; שימור הרגל חיובי חשוב לא פחות מתיקון טעויות.",
          strength: "strong",
        },
      ],
      evidenceMistake: {
        exerciseText: "בכמה שקים המחיר של המחשב גבוה יותר?",
        questionLabel: null,
        correctAnswer: 120,
        userAnswer: 102,
        confidence: "moderate",
      },
      evidenceSuccess: {
        titleHe: "מה שהילד עושה טוב בתרגול",
        bodyHe:
          "בנושא חיבור יש הצלחה טובה בתקופה שנבחרה: כ 93% נכון מתוך 42 שאלות.",
        confidence: "high",
      },
      insufficientData: [
        {
          mistakeCount: 2,
          note: "פחות מ 5 טעויות באותו דפוס - עדיין מוקדם לקבוע קושי שחוזר",
        },
      ],
      diagnosticSparseNoteHe: null,
    },
    geometry: {
      subject: "geometry",
      subjectLabelHe: "גאומטריה",
      mistakeEventCount: 9,
      wrongCount: 9,
      hasAnySignal: true,
      summaryHe:
        "תמונת המקצוע בגאומטריה: יש גם מקום לחיזוק בנושא בלבול חוזר בין היקף לשטח.",
      topStrengths: [],
      stableExcellence: [],
      topWeaknesses: [
        {
          id: "geometry:w:0",
          labelHe: "בלבול חוזר בין היקף לשטח",
          mistakeCount: 6,
          confidence: "moderate",
          tierHe: "קושי נקודתי",
        },
      ],
      parentActionHe:
        "שלוש פעמים בשבוע, 15–20 דק׳ בכל מפגש: לבחור משימה אחת בגאומטריה בנושא בלבול חוזר בין היקף לשטח - לקרוא יחד את הניסוח, לנסח בקול מה נתון ומה מבקשים, לבצע צעד ראשון על דף טיוטה ורק אז לכתוב תשובה סופית ולבדוק מול הפתרון.",
      nextWeekGoalHe:
        "יעד לחיזוק: להעלות את אחוזי ההצלחה בלבול חוזר בין היקף לשטח (לפחות ניסיון אחד מוצלח יותר מהשבוע שעבר).",
      evidenceExamples: [
        {
          type: "mistake",
          exerciseText: "מה ההיקף של מלבן 5×3 ס״מ?",
          questionLabel: null,
          correctAnswer: "16 ס״מ",
          userAnswer: "15 ס״מ",
          confidence: "moderate",
        },
      ],
      weaknesses: [
        {
          id: "geometry:w:0",
          labelHe: "בלבול חוזר בין היקף לשטח",
          mistakeCount: 6,
          confidence: "moderate",
          tierHe: "קושי נקודתי",
        },
      ],
      strengths: [],
      excellent: [],
      maintain: [],
      improving: [],
      studentRecommendationsImprove: [
        {
          id: "stu-imp:geometry:w:0",
          textHe:
            "כדאי לתרגל עוד קצת בנושא: בלבול חוזר בין היקף לשטח - נרשמו 6 טעויות דומות בתקופה שנבחרה. נשארים עם תרגול ממוקד ולא עם \"לנסות לתקן הכול בבת אחת\".",
          strength: "moderate",
        },
      ],
      studentRecommendationsMaintain: [],
      parentRecommendationsImprove: [
        {
          id: "par-imp:geometry:w:0",
          textHe:
            "מתחילה חזרה על אותו סוג טעות - בנושא בלבול חוזר בין היקף לשטח. לשבוע הקרוב מספיק מבט רגוע ותרגול קצר וממוקד.",
          strength: "moderate",
        },
      ],
      parentRecommendationsMaintain: [],
      evidenceMistake: {
        exerciseText: "מה ההיקף של מלבן 5×3 ס״מ?",
        questionLabel: null,
        correctAnswer: "16 ס״מ",
        userAnswer: "15 ס״מ",
        confidence: "moderate",
      },
      evidenceSuccess: null,
      insufficientData: [],
      diagnosticSparseNoteHe: null,
    },
    english: {
      subject: "english",
      subjectLabelHe: "אנגלית",
      mistakeEventCount: 0,
      wrongCount: 0,
      hasAnySignal: false,
      summaryHe: null,
      topStrengths: [],
      stableExcellence: [],
      topWeaknesses: [],
      parentActionHe: null,
      nextWeekGoalHe: null,
      evidenceExamples: [],
      weaknesses: [],
      strengths: [],
      excellent: [],
      maintain: [],
      improving: [],
      studentRecommendationsImprove: [],
      studentRecommendationsMaintain: [],
      parentRecommendationsImprove: [],
      parentRecommendationsMaintain: [],
      evidenceMistake: null,
      evidenceSuccess: null,
      insufficientData: [],
      diagnosticSparseNoteHe: null,
    },
    science: {
      subject: "science",
      subjectLabelHe: "מדעים",
      mistakeEventCount: 0,
      wrongCount: 0,
      hasAnySignal: false,
      summaryHe: null,
      topStrengths: [],
      stableExcellence: [],
      topWeaknesses: [],
      parentActionHe: null,
      nextWeekGoalHe: null,
      evidenceExamples: [],
      weaknesses: [],
      strengths: [],
      excellent: [],
      maintain: [],
      improving: [],
      studentRecommendationsImprove: [],
      studentRecommendationsMaintain: [],
      parentRecommendationsImprove: [],
      parentRecommendationsMaintain: [],
      evidenceMistake: null,
      evidenceSuccess: null,
      insufficientData: [],
      diagnosticSparseNoteHe: null,
    },
    hebrew: {
      subject: "hebrew",
      subjectLabelHe: "עברית",
      mistakeEventCount: 11,
      wrongCount: 11,
      hasAnySignal: true,
      summaryHe:
        "תמונת המקצוע בעברית: יש גם מקום לחיזוק במילות יחס ובמבנה משפט.",
      topStrengths: [],
      stableExcellence: [],
      topWeaknesses: [
        {
          id: "hebrew:w:0",
          labelHe: "קושי במילות יחס ובמבנה משפט",
          mistakeCount: 6,
          confidence: "moderate",
          tierHe: "קושי נקודתי",
        },
      ],
      parentActionHe:
        "שלוש פעמים בשבוע, 15–20 דק׳ בכל מפגש: לבחור משימה אחת בעברית בנושא במילות יחס ובמבנה משפט - לקרוא יחד את הניסוח, לנסח בקול מה נתון ומה מבקשים, לבצע צעד ראשון על דף טיוטה ורק אז לכתוב תשובה סופית ולבדוק מול הפתרון.",
      nextWeekGoalHe:
        "יעד לחיזוק: להעלות את אחוזי ההצלחה במילות יחס ובמבנה משפט (לפחות ניסיון אחד מוצלח יותר מהשבוע שעבר).",
      evidenceExamples: [
        {
          type: "mistake",
          exerciseText: "השלימו: הילדים שיחקו ___ הזמן בגן.",
          questionLabel: null,
          correctAnswer: "בְּ",
          userAnswer: "לְ",
          confidence: "moderate",
        },
      ],
      weaknesses: [
        {
          id: "hebrew:w:0",
          labelHe: "קושי במילות יחס ובמבנה משפט",
          mistakeCount: 6,
          confidence: "moderate",
          tierHe: "קושי נקודתי",
        },
      ],
      strengths: [],
      excellent: [],
      maintain: [],
      improving: [],
      studentRecommendationsImprove: [
        {
          id: "stu-imp:hebrew:w:0",
          textHe:
            "כדאי לתרגל עוד קצת בנושא: במילות יחס ובמבנה משפט - נרשמו 6 טעויות דומות בתקופה שנבחרה. נשארים עם תרגול ממוקד ולא עם \"לנסות לתקן הכול בבת אחת\".",
          strength: "moderate",
        },
      ],
      studentRecommendationsMaintain: [],
      parentRecommendationsImprove: [
        {
          id: "par-imp:hebrew:w:0",
          textHe:
            "מתחילה חזרה על אותו סוג טעות - בנושא במילות יחס ובמבנה משפט. לשבוע הקרוב מספיק מבט רגוע ותרגול קצר וממוקד.",
          strength: "moderate",
        },
      ],
      parentRecommendationsMaintain: [],
      evidenceMistake: {
        exerciseText: "השלימו: הילדים שיחקו ___ הזמן בגן.",
        questionLabel: null,
        correctAnswer: "בְּ",
        userAnswer: "לְ",
        confidence: "moderate",
      },
      evidenceSuccess: null,
      insufficientData: [
        {
          mistakeCount: 3,
          note: "פחות מ 5 טעויות באותו דפוס - עדיין מוקדם לקבוע קושי שחוזר",
        },
      ],
      diagnosticSparseNoteHe: null,
    },
    "moledet-geography": {
      subject: "moledet-geography",
      subjectLabelHe: "מולדת וגאוגרפיה",
      mistakeEventCount: 0,
      wrongCount: 0,
      hasAnySignal: false,
      summaryHe: null,
      topStrengths: [],
      stableExcellence: [],
      topWeaknesses: [],
      parentActionHe: null,
      nextWeekGoalHe: null,
      evidenceExamples: [],
      weaknesses: [],
      strengths: [],
      excellent: [],
      maintain: [],
      improving: [],
      studentRecommendationsImprove: [],
      studentRecommendationsMaintain: [],
      parentRecommendationsImprove: [],
      parentRecommendationsMaintain: [],
      evidenceMistake: null,
      evidenceSuccess: null,
      insufficientData: [],
      diagnosticSparseNoteHe: null,
    },
  },
};
