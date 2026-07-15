/**
 * אותות דיאגנוסטיים לשורת דוח V2 — מקור אחד אל parent-report-v2 ואל topic-next-step-engine.
 * ללא תלות ב parent-report-v2 (מניעת מעגל ייבוא).
 */

import { mathReportBaseOperationKey, canonicalParentReportGradeKey } from "./math-report-generator.js";
import { DEFAULT_TOPIC_NEXT_STEP_CONFIG } from "./topic-next-step-config.js";
import { TOPIC_EVIDENCE_THRESHOLDS } from "./parent-report-topic-evidence.js";
import { buildEvidenceContractV1, validateEvidenceContractV1 } from "./contracts/parent-report-contracts-v1.js";
export const TRACK_ROW_MODE_SEP = "\u0001";

/** placeholder פנימי לסשנים/טעויות בלי כיתה או בלי רמה — לא מאחדים כמה ערכים אמיתיים */
export const MATH_SCOPE_UNKNOWN = "unknown";

/** סיומת מפתח אגרגציה לטעויות מתמטיקה בלי scope מלא — לא נשענים עליו לשורה scoped */
export const MATH_MISTAKE_UNSCOPED_MARKER = "__UNSCOPED__";

/**
 * מתמטיקה: מפתח שורה = operation + mode + grade + level (4 מקטעים).
 * שאר המקצועות: operation/topic + mode (2 מקטעים) — תאימות לאחור.
 */
export function splitTopicRowKey(itemKey) {
  const raw = String(itemKey ?? "");
  const parts = raw.split(TRACK_ROW_MODE_SEP);
  if (parts.length >= 4) {
    return {
      bucketKey: parts[0],
      modeKey: parts[1] || null,
      gradeScope: parts[2] || MATH_SCOPE_UNKNOWN,
      levelScope: parts[3] || MATH_SCOPE_UNKNOWN,
    };
  }
  if (parts.length === 2) {
    return { bucketKey: parts[0], modeKey: parts[1] || null, gradeScope: null, levelScope: null };
  }
  if (parts.length === 1 && parts[0]) {
    return { bucketKey: parts[0], modeKey: null, gradeScope: null, levelScope: null };
  }
  return { bucketKey: raw, modeKey: null, gradeScope: null, levelScope: null };
}

/** מפרק מפתח שורה — bucket + mode (תאימות); למתמטיקה מלאה השתמשו ב splitTopicRowKey */
export function splitBucketModeRowKey(itemKey) {
  const s = splitTopicRowKey(itemKey);
  return { bucketKey: s.bucketKey, modeKey: s.modeKey };
}

/** @param {unknown} session */
export function normalizeSessionModeForMath(session) {
  if (!session || typeof session !== "object") return "learning";
  const m = session.mode;
  if (m == null || m === "") return "learning";
  const t = String(m).trim();
  return t || "learning";
}

/** @param {unknown} session */
export function mathScopeGradeFromSession(session) {
  const c = canonicalParentReportGradeKey(session?.grade);
  return c || MATH_SCOPE_UNKNOWN;
}

/** @param {unknown} session */
export function mathScopeLevelFromSession(session) {
  if (!session || typeof session !== "object") return MATH_SCOPE_UNKNOWN;
  const lv = session.level != null && session.level !== "" ? String(session.level).trim().toLowerCase() : "";
  if (lv === "easy" || lv === "medium" || lv === "hard") return lv;
  return MATH_SCOPE_UNKNOWN;
}

/** @param {unknown} level */
export function mathScopeLevelFromField(level) {
  if (level == null || level === "") return MATH_SCOPE_UNKNOWN;
  const lv = String(level).trim().toLowerCase();
  if (lv === "easy" || lv === "medium" || lv === "hard") return lv;
  return MATH_SCOPE_UNKNOWN;
}

/** @param {unknown} mode */
export function normalizeMistakeModeField(mode) {
  if (mode == null || mode === "") return "learning";
  const t = String(mode).trim();
  return t || "learning";
}

/**
 * טעות מתמטיקה עם grade+level תקפים (לא unknown) — רק כאלה נכנסות לשורה scoped.
 * @param {Record<string, unknown>|null|undefined} ev
 */
export function mistakeMathScopeComplete(ev) {
  if (!ev || typeof ev !== "object") return false;
  const g = canonicalParentReportGradeKey(ev.grade);
  const l = mathScopeLevelFromField(ev.level);
  return !!(g && l && l !== MATH_SCOPE_UNKNOWN);
}

/**
 * מפתח אגרגציה לטעויות מתמטיקה (תואם מפתח שורת דוח scoped).
 * @param {Record<string, unknown>|null|undefined} ev
 * @returns {string|null} null אם חסרים נתוני scope — הקורא יפנה אל UNSCOPED
 */
export function buildMathScopedMistakeAggregationKey(ev) {
  if (!ev || typeof ev !== "object") return null;
  const op = mathReportBaseOperationKey(String(ev.topicOrOperation || ev.bucketKey || ""));
  if (!op) return null;
  if (!mistakeMathScopeComplete(ev)) return null;
  const g = canonicalParentReportGradeKey(ev.grade);
  const l = mathScopeLevelFromField(ev.level);
  const m = normalizeMistakeModeField(ev.mode);
  return `${op}${TRACK_ROW_MODE_SEP}${m}${TRACK_ROW_MODE_SEP}${g}${TRACK_ROW_MODE_SEP}${l}`;
}

export function canonicalMistakeLookupKeyForDiagnostics(subjectId, rawKey) {
  const s = String(rawKey ?? "").trim();
  if (!s) return "";
  if (subjectId === "math") {
    if (s.endsWith(MATH_MISTAKE_UNSCOPED_MARKER)) return s;
    const parts = s.split(TRACK_ROW_MODE_SEP);
    if (parts.length >= 4) return s;
    return mathReportBaseOperationKey(s);
  }
  if (/^[a-z0-9_\-.]+$/i.test(s)) return s.toLowerCase();
  return s;
}

export function aggregateMistakeCountsByCanonicalKey(subjectId, mistakesByBucket) {
  const out = {};
  if (!mistakesByBucket || typeof mistakesByBucket !== "object") return out;
  for (const [k, v] of Object.entries(mistakesByBucket)) {
    const c = canonicalMistakeLookupKeyForDiagnostics(subjectId, k);
    if (!c) continue;
    const n = Number(v?.count) || 0;
    out[c] = (out[c] || 0) + n;
  }
  return out;
}

/**
 * ספירת אירועי טעות לשורה — תואם אל resolveMistakeEventCount ב topic-next-step-engine.
 */
export function rowMistakeEventCount(subjectId, mistakesByBucket, bucketKey, topicRowKey, row) {
  const byCanon = aggregateMistakeCountsByCanonicalKey(subjectId, mistakesByBucket);
  if (subjectId === "math") {
    const pk = String(topicRowKey || "");
    const parts = splitTopicRowKey(pk);
    if (parts.gradeScope != null && parts.levelScope != null) {
      return byCanon[pk] || 0;
    }
  }
  const candidates = new Set();
  if (bucketKey) candidates.add(canonicalMistakeLookupKeyForDiagnostics(subjectId, bucketKey));
  const split = splitBucketModeRowKey(String(topicRowKey || ""));
  if (split.bucketKey) candidates.add(canonicalMistakeLookupKeyForDiagnostics(subjectId, split.bucketKey));
  if (row?.displayName) candidates.add(canonicalMistakeLookupKeyForDiagnostics(subjectId, String(row.displayName)));
  if (subjectId === "math" && topicRowKey) {
    const noMode = String(topicRowKey).split(TRACK_ROW_MODE_SEP)[0];
    if (noMode) candidates.add(canonicalMistakeLookupKeyForDiagnostics(subjectId, noMode));
  }
  let total = 0;
  const seen = new Set();
  for (const c of candidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    total += byCanon[c] || 0;
  }
  return total;
}

/**
 * האם אירוע טעות (מתמטיקה) שייך לשורת דוח scoped לפי כיתה+רמה+מצב.
 * @param {string} topicRowKey
 * @param {Record<string, unknown>|null|undefined} ev
 */
export function mathMistakeEventMatchesScopedRow(topicRowKey, ev) {
  const parts = splitTopicRowKey(String(topicRowKey || ""));
  if (parts.gradeScope == null || parts.levelScope == null) return false;
  if (!mistakeMathScopeComplete(ev)) return false;
  const g = canonicalParentReportGradeKey(ev.grade);
  const l = mathScopeLevelFromField(ev.level);
  const m = normalizeMistakeModeField(ev.mode);
  return (
    g === parts.gradeScope &&
    l === parts.levelScope &&
    m === (parts.modeKey || "learning")
  );
}

/**
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} cfg
 */
export function computeStability01(row, mistakeEventCount, cfg) {
  const q = Number(row?.questions) || 0;
  if (q <= 0) return 0;
  const wrong = Math.max(0, Number(row?.wrong) ?? q - (Number(row?.correct) || 0));
  const wrongRatio = wrong / q;
  const volume = Math.min(1, q / cfg.stabilityVolumeDivisor);
  const mistakePressure = Math.min(
    cfg.stabilityMistakePressureMax,
    (mistakeEventCount || 0) / Math.max(q, cfg.stabilityMistakeQDivisor) +
      wrongRatio * cfg.stabilityWrongPenaltyCoef
  );
  const raw = volume * (1 - mistakePressure);
  return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100;
}

/**
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} cfg
 */
export function computeConfidence01(row, mistakeEventCount, cfg) {
  const q = Number(row?.questions) || 0;
  if (q <= 0) return 0;
  const base = 1 - Math.exp(-q / cfg.confidenceExpDivisor);
  const m = Number(mistakeEventCount) || 0;
  const noise =
    m > q * cfg.confidenceMistakeRatioHigh
      ? cfg.confidenceNoiseHigh
      : m > q * cfg.confidenceMistakeRatioMid
        ? cfg.confidenceNoiseMid
        : 1;
  return Math.round(Math.max(0, Math.min(1, base * noise)) * 100) / 100;
}

/** 0–100 לפי מרחק בזמן מסוף תקופת הדוח (לא מ "עכשיו") */
export function computeRecencyScore(lastSessionMs, periodEndMs) {
  if (!Number.isFinite(periodEndMs)) return 55;
  if (!Number.isFinite(lastSessionMs)) return 55;
  const days = Math.max(0, (periodEndMs - lastSessionMs) / (24 * 60 * 60 * 1000));
  if (days <= 3) return 100;
  if (days <= 10) return 85;
  if (days <= 21) return 68;
  if (days <= 45) return 48;
  if (days <= 90) return 30;
  return 15;
}

export function computeMasteryScore(row) {
  const a = Math.round(Number(row?.accuracy) || 0);
  return Math.max(0, Math.min(100, a));
}

/**
 * @returns {"strong" | "medium" | "low"}
 */
export function computeEvidenceStrength(q, stability01, confidence01, recencyScore, wrongRatio) {
  const vol = q >= 18 ? 1 : q >= 10 ? 0.75 : q >= 5 ? 0.5 : 0.25;
  const stab = stability01 ?? 0;
  const conf = confidence01 ?? 0;
  const rec = (recencyScore ?? 0) / 100;
  const wr = wrongRatio ?? 0;
  const score = vol * 0.35 + stab * 0.25 + conf * 0.25 + rec * 0.1 - Math.min(0.2, wr * 0.25);
  if (score >= 0.62 && q >= 8) return "strong";
  if (score >= 0.38 && q >= 4) return "medium";
  return "low";
}

/**
 * @returns {{ level: "strong"|"medium"|"low", labelHe: string, suppressAggressiveStep: boolean }}
 */
export function evaluateDataSufficiency(q, evidenceStrength, confidence01) {
  if (q <= 0) {
    return {
      level: "low",
      labelHe: "לא נאספו שאלות בתקופה שנבחרה - אין בסיס נתונים לשורה זו.",
      suppressAggressiveStep: true,
    };
  }
  if (q < 4) {
    return {
      level: "low",
      labelHe: "מעט מדי שאלות בתקופה - ההסקות לשורה זו חלקיות מאוד.",
      suppressAggressiveStep: true,
    };
  }
  if (q >= 40) {
    return {
      level: "strong",
      labelHe: "נאספו הרבה שאלות - אפשר לסמוך יותר על מה שרואים בנושא הזה.",
      suppressAggressiveStep: false,
    };
  }
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate && evidenceStrength !== "low") {
    return {
      level: evidenceStrength === "strong" ? "strong" : "medium",
      labelHe:
        evidenceStrength === "strong"
          ? "יש מספיק שאלות - אפשר לסמוך יותר על מה שרואים בנושא הזה."
          : "יש מספיק שאלות לנושא הזה - שינויים זהירים בתת מיומנות בלבד.",
      suppressAggressiveStep: false,
    };
  }
  if (q >= 12 && evidenceStrength !== "low") {
    return {
      level: evidenceStrength === "strong" ? "strong" : "medium",
      labelHe:
        evidenceStrength === "strong"
          ? "יש מספיק שאלות - אפשר לסמוך יותר על מה שרואים בנושא הזה."
          : "יש מספיק שאלות לנושא הזה - שינויים זהירים בתת מיומנות בלבד.",
      suppressAggressiveStep: false,
    };
  }
  if (q < 8 || evidenceStrength === "low" || (confidence01 ?? 0) < 0.22) {
    return {
      level: "medium",
      labelHe: "המידע עדיין חלקי - לא משנים כיתה או רמה לפי שורה אחת בלבד.",
      suppressAggressiveStep: true,
    };
  }
  if (evidenceStrength === "strong" && q >= 12) {
    return {
      level: "strong",
      labelHe: "יש מספיק שאלות - אפשר לסמוך יותר על מה שרואים בנושא הזה.",
      suppressAggressiveStep: false,
    };
  }
  return {
    level: "medium",
    labelHe: "נתונים בינוניים - מומלץ שינויים זהירים בלבד.",
    suppressAggressiveStep: evidenceStrength === "low",
  };
}

/**
 * מסלול החלטה לביקורת JSON — ללא טקסט פדגוגי חדש מעבר לשדות הקיימים.
 * @param {object} ctx
 * @returns {Array<{ source: "diagnostics", phase: string, detailHe?: string, data: Record<string, unknown> }>}
 */
export function buildDiagnosticsDecisionTrace(ctx) {
  const {
    subjectId,
    topicRowKey,
    q,
    wrong,
    wrongRatio,
    mistakeEventCountResolved,
    stability01,
    confidence01,
    recencyScore,
    masteryScore,
    evidenceStrength,
    dataSufficiencyLevel,
    suppressAggressiveStep,
    isStablePattern,
    isEarlySignalOnly,
    cfgSnapshot,
  } = ctx;

  const data = (obj) => ({ source: "diagnostics", ...obj });

  return [
    data({
      phase: "inputs",
      detailHe: "קלטים לשורה לפני חישוב אותות.",
      data: {
        subjectId,
        topicRowKey: String(topicRowKey || ""),
        questions: q,
        wrong,
        wrongRatio: Math.round(wrongRatio * 1000) / 1000,
        mistakeEventCountResolved,
        periodEndMs: Number.isFinite(Number(ctx.periodEndMs)) ? ctx.periodEndMs : null,
        cfg: cfgSnapshot || null,
      },
    }),
    data({
      phase: "stability_01",
      data: { stability01, formula: "volume*(1-mistakePressure), mistakePressure from wrongRatio+mistake/q" },
    }),
    data({
      phase: "confidence_01",
      data: { confidence01, formula: "(1-exp(-q/divisor))*noise(mistakesVsQ)" },
    }),
    data({
      phase: "recency_score",
      data: { recencyScore, lastSessionMs: ctx.lastSessionMs ?? null },
    }),
    data({
      phase: "mastery_score",
      data: { masteryScore },
    }),
    data({
      phase: "evidence_strength",
      data: { evidenceStrength },
    }),
    data({
      phase: "data_sufficiency",
      detailHe: "כמות המידע משפיעה על מידת הזהירות בהמלצה הבאה.",
      data: {
        dataSufficiencyLevel,
        suppressAggressiveStep,
        labelHe: ctx.dataSufficiencyLabelHe ?? null,
      },
    }),
    data({
      phase: "pattern_flags",
      data: { isStablePattern, isEarlySignalOnly },
    }),
  ];
}

/**
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} [cfg]
 */
export function computeRowDiagnosticSignals(subjectId, topicRowKey, row, mistakesByBucket, periodEndMs, cfg = DEFAULT_TOPIC_NEXT_STEP_CONFIG) {
  const q = Number(row?.questions) || 0;
  const wrong = Math.max(0, Number(row?.wrong) ?? (q > 0 ? q - (Number(row?.correct) || 0) : 0));
  const wrongRatio = q > 0 ? wrong / q : 0;
  const bucketKey = row?.bucketKey || splitBucketModeRowKey(String(topicRowKey || "")).bucketKey || null;
  const mC = rowMistakeEventCount(subjectId, mistakesByBucket, bucketKey, topicRowKey, row);
  const stability01 = computeStability01(row, mC, cfg);
  const confidence01 = computeConfidence01(row, mC, cfg);
  const lastMs = Number(row?.lastSessionMs);
  const recencyScore = computeRecencyScore(lastMs, periodEndMs);
  const masteryScore = computeMasteryScore(row);
  const stabilityScore = Math.round(stability01 * 100);
  const confidenceScore = Math.round(confidence01 * 100);
  const evidenceStrength = computeEvidenceStrength(q, stability01, confidence01, recencyScore, wrongRatio);
  const sufficiency = evaluateDataSufficiency(q, evidenceStrength, confidence01);

  const isStablePattern =
    evidenceStrength === "strong" && q >= 14 && stability01 >= 0.45 && confidence01 >= 0.35;
  const isEarlySignalOnly = sufficiency.level !== "strong" || evidenceStrength === "low";

  let patternStabilityHe = "עדיין מוקדם - לא ברור אם זה נשמר לאורך זמן רק מהנתונים כאן.";
  if (isStablePattern) {
    patternStabilityHe = "זה חוזר בכמה תרגולים - התמונה משקפת מגמה ולא רק מפגש בודד.";
  } else if (sufficiency.level === "medium") {
    patternStabilityHe = "יש כיוון חלקי - כדאי לאסוף עוד תרגול לפני שאומרים משהו חד משמעי.";
  }

  const decisionTrace = buildDiagnosticsDecisionTrace({
    subjectId,
    topicRowKey,
    q,
    wrong,
    wrongRatio,
    mistakeEventCountResolved: mC,
    stability01,
    confidence01,
    recencyScore,
    masteryScore,
    evidenceStrength,
    dataSufficiencyLevel: sufficiency.level,
    dataSufficiencyLabelHe: sufficiency.labelHe,
    suppressAggressiveStep: sufficiency.suppressAggressiveStep,
    isStablePattern,
    isEarlySignalOnly,
    lastSessionMs: Number.isFinite(lastMs) ? lastMs : null,
    periodEndMs,
    cfgSnapshot: {
      stabilityVolumeDivisor: cfg.stabilityVolumeDivisor,
      confidenceExpDivisor: cfg.confidenceExpDivisor,
    },
  });

  return {
    mistakeEventCountResolved: mC,
    masteryScore,
    stabilityScore,
    confidenceScore,
    recencyScore,
    evidenceStrength,
    dataSufficiencyLevel: sufficiency.level,
    dataSufficiencyLabelHe: sufficiency.labelHe,
    suppressAggressiveStep: sufficiency.suppressAggressiveStep,
    patternStabilityHe,
    isEarlySignalOnly,
    recommendationContextHe: isEarlySignalOnly
      ? "ההמלצה מבוססת על נתונים חלקיים; עדיף לא לעשות שינוי דרמטי בלי לבדוק שוב אחרי עוד תרגול."
      : "ההמלצה מבוססת על שילוב דיוק, כמות שאלות, טעויות ועדכניות בתקופה שנבחרה.",
    decisionTrace,
  };
}

/**
 * מעשיר אובייקטי שורות במפות נושאים (mathOperations וכו').
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, Record<string, { count?: number }>>} mistakesBySubject
 * @param {number} periodEndMs
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} [cfg]
 */
export function enrichTopicMapsWithRowDiagnostics(
  maps,
  mistakesBySubject,
  periodEndMs,
  cfg = DEFAULT_TOPIC_NEXT_STEP_CONFIG
) {
  const entries = Object.entries(maps || {});
  for (const [subjectId, topicMap] of entries) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const mistakesByBucket = mistakesBySubject?.[subjectId] || {};
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const signals = computeRowDiagnosticSignals(
        subjectId,
        topicRowKey,
        row,
        mistakesByBucket,
        periodEndMs,
        cfg
      );
      Object.assign(row, signals);
    }
  }
}

/**
 * Phase 1 additive evidence trace attachment.
 * Must run after trend + behavior enrichment so contract includes those signals.
 * Runtime is soft-validated: never throws, only records validation status.
 *
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {number} periodStartMs
 * @param {number} periodEndMs
 */
export function attachEvidenceContractsV1ToTopicMaps(maps, periodStartMs, periodEndMs) {
  const entries = Object.entries(maps || {});
  for (const [subjectId, topicMap] of entries) {
    if (!topicMap || typeof topicMap !== "object") continue;
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const evidenceContract = buildEvidenceContractV1({
        subjectId,
        topicKey: topicRowKey,
        periodStartMs,
        periodEndMs,
        row,
        signals: row,
        trend: row?.trend || null,
        behaviorProfile: row?.behaviorProfile || null,
      });
      const validation = validateEvidenceContractV1(evidenceContract);
      row.contractsV1 = {
        ...(row.contractsV1 && typeof row.contractsV1 === "object" ? row.contractsV1 : {}),
        evidence: evidenceContract,
        evidenceValidation: {
          ok: !!validation.ok,
          errors: Array.isArray(validation.errors) ? validation.errors : [],
        },
      };
    }
  }
}
