/**
 * LPD-safe parent-facing copy helpers — subject-agnostic.
 */
import { sanitizeParentPatternLabel, isBlockedParentPatternLabel } from "./parent-pattern-label.js";
import { resolveParentFacingPatternLabelHe, parentFacingErrorPatternMeaningHe } from "./parent-facing-error-pattern-he.js";
import { buildLearningPatternDecision } from "./build-learning-pattern-decision.js";
import { findForbiddenParentWords } from "./build-parent-visible-finding.js";
import { rowNeedsPracticeFromLpd } from "./apply-learning-pattern-decision.js";
import {
  lpdFindingNeedsRebuild,
  normalizeParentVisibleMetrics,
  buildParentMetricsDataLineHe,
} from "./normalize-parent-practice-metrics.js";
import {
  resolveTopicExplainOwnerSectionsHe,
  resolveTopicPrimaryFindingOwnerCopyHe,
} from "./resolve-topic-owner-copy.js";

/** @typedef {{ identified: string, data: string, pattern: string, meaning: string, action: string }} LpdExplainSections */

/** @type {readonly [string, string][]} */
const ROW_KEY_SUBJECT_PREFIXES = [
  ["moledet_", "moledet-geography"],
  ["math_", "math"],
  ["geometry_", "geometry"],
  ["english_", "english"],
  ["science_", "science"],
  ["history_", "history"],
  ["hebrew_", "hebrew"],
];

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
function inferSubjectIdFromRow(row) {
  const direct = String(row?.subjectId || row?.subject || "").trim();
  if (direct) return direct.replace(/_/g, "-");
  const rk = String(row?.rowKey || "");
  for (const [prefix, sid] of ROW_KEY_SUBJECT_PREFIXES) {
    if (rk.startsWith(prefix)) return sid;
  }
  return "";
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
function inferTopicKeyFromRow(row) {
  const direct = String(row?.topicKey || row?.bucketKey || "").trim();
  if (direct) return direct.split("\u0001")[0];
  const trk = String(row?.topicRowKey || "").trim();
  if (trk) return trk.split("\u0001")[0];
  const rk = String(row?.rowKey || "");
  for (const [prefix] of ROW_KEY_SUBJECT_PREFIXES) {
    if (rk.startsWith(prefix)) {
      return rk.slice(prefix.length).split("\u0001")[0];
    }
  }
  return "";
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
function inferTopicRowKeyFromRow(row) {
  const explicit = String(row?.topicRowKey || "").trim();
  if (explicit) return explicit;
  const rk = String(row?.rowKey || "");
  for (const [prefix] of ROW_KEY_SUBJECT_PREFIXES) {
    if (rk.startsWith(prefix)) return rk.slice(prefix.length);
  }
  const topicKey = inferTopicKeyFromRow(row);
  const subjectId = inferSubjectIdFromRow(row);
  return topicKey || subjectId ? `${subjectId}:${topicKey}` : "";
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function getLpdFromRow(row) {
  const lpd = row?.learningPatternDecision;
  return lpd && typeof lpd === "object" ? lpd : null;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function guardParentFacingText(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (findForbiddenParentWords(t).length) return "";
  return t;
}

/**
 * Build LPD from topic row stats when not already attached (production-safe fallback).
 * @param {Record<string, unknown>} row
 * @param {unknown[]} [rawMistakes]
 */
export function resolveOrBuildLpdOnRow(row, rawMistakes = []) {
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const q = metrics.questions;
  if (q <= 0) return null;

  const { correct: c, wrong: w, accuracy } = metrics;

  const existing = getLpdFromRow(row);
  if (existing && !lpdFindingNeedsRebuild(existing, metrics)) return existing;

  const subjectId = inferSubjectIdFromRow(row);
  const topicKey = inferTopicKeyFromRow(row);
  const topicRowKey = inferTopicRowKeyFromRow(row) || topicKey;
  if (!subjectId || !topicKey) return existing || null;

  const name = String(row.label || row.displayName || topicKey).trim() || topicKey;

  return buildLearningPatternDecision({
    subjectId,
    topicRowKey,
    row: {
      bucketKey: topicKey,
      displayName: name,
      questions: q,
      correct: c,
      wrong: w,
      accuracy,
    },
    rawMistakes: Array.isArray(rawMistakes) ? rawMistakes : [],
    startMs: 0,
    endMs: Date.now(),
  });
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape|null|undefined} lpd
 */
export function lpdHasParentTopicInsight(lpd) {
  if (!lpd || typeof lpd !== "object") return false;
  if (lpd.topicStatus === "not_practiced" || (lpd.practicedQuestions || 0) <= 0) return false;
  return !!String(lpd.parentVisibleFinding || "").trim();
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string}
 */
export function lpdParentVisibleFindingFromRow(row) {
  const lpd = resolveOrBuildLpdOnRow(row);
  if (!lpd) return "";
  if (lpd.topicStatus === "not_practiced" || (lpd.practicedQuestions || 0) <= 0) return "";
  return guardParentFacingText(lpd.parentVisibleFinding);
}

/**
 * When LPD is present, legacy engine diagnostic copy must not surface to parents.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function shouldSuppressLegacyEngineParentCopy(row) {
  const q = Number(row?.questions) || 0;
  return q > 0;
}

/**
 * Topic-level parent insight — always LPD-backed; never legacy engine diagnostics.
 * @param {Record<string, unknown>} row
 * @param {unknown[]} [rawMistakes]
 * @returns {string}
 */
export function buildLpdSafeTopicInsightLineHe(row, rawMistakes = []) {
  const lpd = resolveOrBuildLpdOnRow(row, rawMistakes);
  if (!lpd || !lpdHasParentTopicInsight(lpd)) return "";
  const ownerFinding = resolveTopicPrimaryFindingOwnerCopyHe({ ...row, learningPatternDecision: lpd });
  const finding = guardParentFacingText(ownerFinding || lpd.parentVisibleFinding);
  if (!finding) return "";
  const enriched = { ...row, learningPatternDecision: lpd };
  return buildLpdParentInsightLineHe({ ...enriched, learningPatternDecision: { ...lpd, parentVisibleFinding: finding } });
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function buildLpdParentInsightLineHe(row) {
  const finding = lpdParentVisibleFindingFromRow(row);
  if (!finding) return "";

  const subj = String(row.subjectLabelHe || row.subject || "").trim();
  const label = String(row.label || row.displayName || "").trim();
  if (subj && label) return guardParentFacingText(`${subj} - «${label}»: ${finding}`);
  if (label) return guardParentFacingText(`«${label}»: ${finding}`);
  return finding;
}

/**
 * Server aggregate payload — build LPD-backed topic insight (replaces topicAttentionInsightHe).
 * @param {Record<string, unknown>} payload
 * @param {{ subject: string, topicKey: string, accuracy: number, answers: number }} weakTopic
 * @param {(subjectId: string, topicKey: string) => string} topicLabelFn
 * @param {(subjectId: string) => string} subjectLabelFn
 */
export function buildLpdSafeTopicInsightFromWeakTopic(
  payload,
  weakTopic,
  topicLabelFn,
  subjectLabelFn,
) {
  const subjectId = String(weakTopic.subject || "").replace(/_/g, "-");
  const topicKey = String(weakTopic.topicKey || "");
  const q = Math.max(0, Number(weakTopic.answers) || 0);
  if (q <= 0) return "";

  // topicLabelFn (topicLabelHe) already returns only the Hebrew topic name
  // (no subject prefix), so no stripping is needed here. If no Hebrew label
  // can be resolved, never fall back to the raw internal topicKey (English) —
  // suppress this insight line instead (safe fallback, no technical leak).
  const topicLine = topicLabelFn(weakTopic.subject, topicKey);
  const topicName = String(topicLine || "").trim();
  if (!topicName) return "";
  const acc = Math.round(Number(weakTopic.accuracy) || 0);
  const c = Math.round((q * acc) / 100);
  const w = Math.max(0, q - c);

  const rawMistakes = rawMistakesForTopicFromPayload(payload, weakTopic.subject, topicKey);

  return buildLpdSafeTopicInsightLineHe(
    {
      subjectId,
      subjectLabelHe: subjectLabelFn(weakTopic.subject),
      topicKey,
      label: topicName,
      displayName: topicName,
      questions: q,
      correct: c,
      wrong: w,
      accuracy: acc,
    },
    rawMistakes,
  );
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string} subjectId
 * @param {string} topicKey
 * @returns {unknown[]}
 */
export function rawMistakesForTopicFromPayload(payload, subjectId, topicKey) {
  const mistakes = payload?.recentMistakes;
  if (!Array.isArray(mistakes)) return [];

  const canon = (s) => String(s || "").replace(/_/g, "-").trim();
  const wantSubject = canon(subjectId);
  const wantTopic = String(topicKey || "").trim();

  return mistakes
    .filter((m) => {
      if (!m || typeof m !== "object") return false;
      if (canon(m.subject) !== wantSubject) return false;
      return String(m.topic || m.topicKey || "").trim() === wantTopic;
    })
    .map((m, i) => ({
      bucketKey: wantTopic,
      mode: m.mode || "practice",
      isCorrect: false,
      patternFamily: m.patternFamily || m.patternId || `pf:recent:${i}`,
      timestamp: Date.parse(m.answeredAt || m.timestamp || 0) || Date.now() - i * 3600_000,
    }));
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape} lpd
 * @param {string} topicName
 */
function lpdMeaningLineHe(lpd, topicName) {
  const q = Number(lpd.practicedQuestions) || 0;
  if (q <= 2) return "";

  const ts = String(lpd.topicStatus || "");
  const ft = String(lpd.findingType || "");
  const templateId = String(lpd.templateId || "");

  if (ts === "mixed" || ft === "mixed_pattern") {
    return `מה זה אומר: יש בסיס מסוים, אבל ${topicName} עדיין לא יציב לגמרי.`;
  }
  if (ts.startsWith("positive") || ft === "success_pattern") {
    return `מה זה אומר: ${topicName} נראה יציב יחסית עכשיו. כדאי לשמור עליו עם תרגול קצר מדי פעם.`;
  }
  if (
    (ts === "difficulty_repeated" || templateId.startsWith("difficulty_repeated")) &&
    !isBlockedParentPatternLabel(String(lpd.repeatedMistakePatterns?.[0]?.label || ""))
  ) {
    const rawPattern = String(lpd.repeatedMistakePatterns?.[0]?.label || "");
    const specific = parentFacingErrorPatternMeaningHe(rawPattern);
    if (specific) return `מה זה אומר: ${specific}`;
    return "מה זה אומר: אותה טעות חוזרת כמה פעמים, ולכן כדאי לעצור ולתרגל אותה בנפרד.";
  }
  if (
    ts === "difficulty_observed" ||
    ts === "practice_focus" ||
    ft === "practice_focus" ||
    ft === "difficulty_pattern" ||
    templateId.includes("difficulty") ||
    templateId.includes("practice_focus")
  ) {
    return `מה זה אומר: כדאי לחזק את ${topicName} לפני שממשיכים לנושאים קשים יותר.`;
  }

  const finding = guardParentFacingText(lpd.parentVisibleFinding);
  if (finding && q >= 3 && q <= 4) {
    const core = finding.replace(/\s*מבוסס על \d+ שאלות שנפתרו בנושא\.?\s*$/u, "").trim();
    if (core) return `מה זה אומר: ${core}.`;
  }
  return "";
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape} lpd
 */
function lpdPatternLineHe(lpd) {
  const q = Number(lpd.practicedQuestions) || 0;
  if (q < 5) return "";

  const blocked = new Set(Array.isArray(lpd.blockedClaims) ? lpd.blockedClaims : []);
  if (blocked.has("no_repeated_wording") || blocked.has("no_specific_pattern_claim")) return "";

  const patterns = Array.isArray(lpd.repeatedMistakePatterns) ? lpd.repeatedMistakePatterns : [];
  if (!patterns.length) return "";

  const label = sanitizeParentPatternLabel(String(patterns[0]?.label || "").trim());
  if (label) return `הטעות שחוזרת: ${label}.`;
  return "";
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape} lpd
 * @param {string} topicName
 */
function lpdHomeActionLineHe(lpd, topicName) {
  const q = Number(lpd.practicedQuestions) || 0;
  if (q <= 2) return "";

  const blocked = new Set(Array.isArray(lpd.blockedClaims) ? lpd.blockedClaims : []);
  if (blocked.has("no_final_claim")) return "";

  const needsPractice = rowNeedsPracticeFromLpd({ learningPatternDecision: lpd });
  const hasFocus = !!String(lpd.recommendedFocus || "").trim();
  const ts = String(lpd.topicStatus || "");
  const ft = String(lpd.findingType || "");

  if (ts === "mixed" || ft === "mixed_pattern") {
    return `מה כדאי לעשות ביחד: לבחור 5–8 שאלות בנושא ${topicName}, לשלב שאלות קלות ובינוניות, ולעצור בכל טעות כדי להבין מה קרה.`;
  }
  if (ts.startsWith("positive") || ft === "success_pattern") {
    return `מה כדאי לעשות ביחד: להמשיך מדי פעם בתרגול קצר ב${topicName}, כדי לשמור על מה שכבר עובד.`;
  }
  if (needsPractice || hasFocus) {
    return `מה כדאי לעשות ביחד: לתרגל כמה שאלות קצרות ב${topicName}, ולבקש מהילד להסביר את הדרך בקול.`;
  }
  return "";
}

/**
 * Per-topic explain sections — LPD-only (no legacy engine bypass).
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {LpdExplainSections|null}
 */
export function buildLpdSafeTopicExplainSectionsHe(row) {
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const lpd = resolveOrBuildLpdOnRow({ ...row, parentVisibleMetrics: metrics });
  const q = metrics.questions;
  if (q <= 0 || !lpd || lpd.topicStatus === "not_practiced") return null;

  const ownerSections = resolveTopicExplainOwnerSectionsHe({
    ...row,
    parentVisibleMetrics: metrics,
    learningPatternDecision: lpd,
  });
  if (ownerSections) {
    return {
      identified: guardParentFacingText(ownerSections.identified),
      data: guardParentFacingText(ownerSections.data),
      pattern: guardParentFacingText(ownerSections.pattern),
      meaning: guardParentFacingText(ownerSections.meaning),
      action: guardParentFacingText(ownerSections.action),
    };
  }

  const topicName =
    String(row?.label || row?.displayName || lpd.recommendedFocus || "").trim() || "הנושא";
  const acc = metrics.accuracy;
  const w = metrics.wrong;

  const contract =
    lpd.engineDecisionContract ||
    row?.engineDecisionContract ||
    null;

  if (contract?.parentSafeFinding && q >= 3) {
    const patternLabel = resolveParentFacingPatternLabelHe(contract.detectedPattern);
    const pattern =
      patternLabel && q >= 5
        ? guardParentFacingText(`הטעות שחוזרת: ${patternLabel}.`)
        : "";
    const meaning =
      contract.engineDecision === "clear_topic_gap" ||
      contract.engineDecision === "topic_needs_strengthening"
        ? guardParentFacingText(
            `מה זה אומר: כדאי לחזק את ${topicName} לפני שממשיכים לנושאים קשים יותר.`,
          )
        : guardParentFacingText(lpdMeaningLineHe(lpd, topicName));
    const action =
      contract.recommendedAction === "remediate_same_level"
        ? guardParentFacingText(
            `מה כדאי לעשות ביחד: לתרגל כמה שאלות קצרות ב${topicName}, ולבקש מהילד להסביר את הדרך בקול.`,
          )
        : guardParentFacingText(lpdHomeActionLineHe(lpd, topicName));

    return {
      identified: guardParentFacingText(`מה רואים: ${contract.parentSafeFinding}`),
      data: guardParentFacingText(
        contract.dataText || buildParentMetricsDataLineHe(metrics, topicName),
      ),
      pattern,
      meaning,
      action,
    };
  }

  const finding = guardParentFacingText(lpd.parentVisibleFinding);
  const isInitial = q <= 2;

  let data = guardParentFacingText(buildParentMetricsDataLineHe(metrics, topicName));

  if (isInitial) {
    const topicShort = topicName.replace(/\s*-\s*כיתה\s*[א-ט״']+\s*$/u, "").trim() || topicName;
    return {
      identified: guardParentFacingText(`מה רואים: יש כרגע מעט שאלות בנושא ${topicShort}.`),
      data: guardParentFacingText(
        buildParentMetricsDataLineHe({ ...metrics, questions: q, accuracy: acc }, topicShort),
      ),
      pattern: "",
      meaning: guardParentFacingText("מה זה אומר: עדיין מוקדם להסיק מסקנה ברורה. צריך עוד כמה שאלות בנושא."),
      action: guardParentFacingText(
        "מה כדאי לעשות ביחד: להמשיך לתרגל מעט, בלי להסיק עדיין שיש קושי קבוע.",
      ),
    };
  }

  const identified = finding
    ? `מה רואים: ${finding}`
    : `מה רואים: מיקוד בנושא ${topicName}.`;

  const pattern = q >= 5 ? guardParentFacingText(lpdPatternLineHe(lpd)) : "";
  let meaning = guardParentFacingText(lpdMeaningLineHe(lpd, topicName));
  if (!meaning && !isInitial && w > 0 && q >= 3) {
    meaning = guardParentFacingText(
      "מה זה אומר: כדאי לחזק את הנושא לפני שממשיכים לנושאים קשים יותר.",
    );
  }
  let action =
    q >= 3 ? guardParentFacingText(lpdHomeActionLineHe(lpd, topicName)) : "";
  if (!action && !isInitial && w > 0 && q >= 3) {
    action = guardParentFacingText(
      `מה כדאי לעשות ביחד: לפתור כמה שאלות קצרות בנושא ${topicName}, בקצב רגוע, ולבקש מהילד להסביר את שלבי הפתרון.`,
    );
  }

  const sections = {
    identified: guardParentFacingText(identified),
    data,
    pattern,
    meaning,
    action,
  };

  if (!sections.identified && !sections.data && !sections.meaning && !sections.action) {
    return sections.data ? { identified: "", data: sections.data, pattern: "", meaning: "", action: "" } : null;
  }

  return sections;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function resolveParentExplainRowCopy(row) {
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const lpd = resolveOrBuildLpdOnRow({ ...row, parentVisibleMetrics: metrics });
  const q = metrics.questions;

  if (q <= 0) {
    return {
      hasLpd: !!lpd,
      primaryFinding: "",
      explainSections: null,
      suppressEngineCopy: true,
      parentWordingLevel: "no_parent_text",
      showTrend: false,
    };
  }

  const explainSections = buildLpdSafeTopicExplainSectionsHe({ ...row, parentVisibleMetrics: metrics });

  if (!lpd || lpd.topicStatus === "not_practiced") {
    return {
      hasLpd: false,
      primaryFinding: "",
      explainSections,
      suppressEngineCopy: true,
      parentWordingLevel: "no_parent_text",
      showTrend: false,
    };
  }

  const ownerPrimaryFinding = resolveTopicPrimaryFindingOwnerCopyHe({
    ...row,
    parentVisibleMetrics: metrics,
    learningPatternDecision: lpd,
  });
  const primaryFinding = guardParentFacingText(ownerPrimaryFinding || lpd.parentVisibleFinding);
  const isInitial = q <= 2;

  return {
    hasLpd: true,
    primaryFinding,
    explainSections,
    suppressEngineCopy: true,
    parentWordingLevel: String(lpd.parentWordingLevel || "factual_observation"),
    showTrend: !isInitial && q >= 5 && !rowNeedsPracticeFromLpd({ learningPatternDecision: lpd }),
    findingType: String(lpd.findingType || ""),
    topicStatus: String(lpd.topicStatus || ""),
  };
}

/**
 * @deprecated topicAttentionInsightHe — use buildLpdSafeTopicInsightLineHe for parent-facing topic copy.
 */
export const LEGACY_TOPIC_ATTENTION_INSIGHT_DISABLED =
  "topicAttentionInsightHe is not used for parent-facing output; use LPD parentVisibleFinding.";
