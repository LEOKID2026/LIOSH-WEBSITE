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
  resolveTopicRecommendationOwnerCopyHe,
} from "./resolve-topic-owner-copy.js";
import { EDC_CONTRACT_KEY } from "./engine-decision-codes.js";
import { buildParentSystemActionLineHe } from "../action-decision-contract/parent-action-decision-translations-he.js";

/** @typedef {{ identified: string, data: string, pattern: string, meaning: string, action: string, systemAction?: string }} LpdExplainSections */

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
 * Prefer LPD/DE2 explain sections over legacy topicEngineRowSignals copy on detailed report rows.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function shouldSuppressLegacyEngineParentCopy(row) {
  const lpd = getLpdFromRow(row);
  if (lpd && lpd.topicStatus !== "not_practiced") return true;
  const contract = readEngineContractFromRow(row);
  if (String(contract?.parentSafeFinding || "").trim()) return true;
  if (String(contract?.detectedPattern || "").trim()) return true;
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {Record<string, unknown>|null|undefined}
 */
function readEngineContractFromRow(row) {
  const lpd = getLpdFromRow(row);
  return (
    row?.[EDC_CONTRACT_KEY] ||
    row?.engineDecisionContract ||
    lpd?.[EDC_CONTRACT_KEY] ||
    lpd?.engineDecisionContract ||
    null
  );
}

/**
 * DE2 is the authority for parent finding text; LPD only guards unsupported wording.
 * @param {Record<string, unknown>|null|undefined} row
 * @param {unknown[]} [rawMistakes]
 * @returns {string}
 */
export function resolveTopicParentFindingHe(row, rawMistakes = []) {
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const q = metrics.questions;
  if (q <= 0) return "";

  const lpd = resolveOrBuildLpdOnRow({ ...row, parentVisibleMetrics: metrics }, rawMistakes);
  const enriched = { ...row, parentVisibleMetrics: metrics, learningPatternDecision: lpd };
  const contract = readEngineContractFromRow(enriched);

  const safeFinding = guardParentFacingText(String(contract?.parentSafeFinding || "").trim());
  if (safeFinding) return safeFinding;

  const patternLabel = resolveParentFacingPatternLabelHe(contract?.detectedPattern);
  if (patternLabel) {
    const topicName =
      String(row?.label || row?.displayName || row?.narrativeTitleHe || "").trim() || "הנושא";
    return guardParentFacingText(`ב${topicName} נצפה דפוס: ${patternLabel}.`);
  }

  const ownerFinding = resolveTopicPrimaryFindingOwnerCopyHe(enriched);
  if (ownerFinding) return guardParentFacingText(ownerFinding);

  if (lpd?.parentVisibleFinding) return guardParentFacingText(lpd.parentVisibleFinding);
  return "";
}

/**
 * LPD-only evidence wording: initial vs recurring — never deletes the finding.
 * @param {Record<string, unknown>|null|undefined} row
 * @param {import("./schema.js").LearningPatternDecisionShape|null|undefined} [lpd]
 * @returns {string}
 */
export function resolveTopicEvidenceBasisHe(row, lpd = null) {
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const q = metrics.questions;
  if (q <= 0) return "";

  const resolvedLpd =
    lpd || resolveOrBuildLpdOnRow({ ...row, parentVisibleMetrics: metrics });
  const topicName =
    String(row?.label || row?.displayName || row?.narrativeTitleHe || "").trim() || "הנושא";
  const contract = readEngineContractFromRow({ ...row, learningPatternDecision: resolvedLpd });
  if (contract?.dataText) {
    return guardParentFacingText(String(contract.dataText));
  }

  const base = buildParentMetricsDataLineHe(metrics, topicName);
  const patterns = Array.isArray(resolvedLpd?.repeatedMistakePatterns)
    ? resolvedLpd.repeatedMistakePatterns
    : [];
  const patternHits = patterns.reduce(
    (sum, p) => sum + Math.max(0, Number(p?.count) || 0),
    0,
  );
  const strength = String(resolvedLpd?.evidenceStrength || contract?.evidenceStrength || "");
  const recurring =
    patternHits >= 2 ||
    strength === "supported" ||
    strength === "strong" ||
    String(resolvedLpd?.topicStatus || "") === "difficulty_repeated";

  if (q <= 2) return guardParentFacingText(`${base} זהו ממצא ראשוני.`);
  if (recurring) {
    return guardParentFacingText(`${base} הדפוס חוזר בכמה מהתשובות.`);
  }
  return guardParentFacingText(`${base} זהו ממצא ראשוני.`);
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {unknown[]} [rawMistakes]
 */
export function buildTopicParentReportBundleHe(row, rawMistakes = []) {
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const lpd = resolveOrBuildLpdOnRow({ ...row, parentVisibleMetrics: metrics }, rawMistakes);
  const enriched = { ...row, parentVisibleMetrics: metrics, learningPatternDecision: lpd };
  const topicName =
    String(row?.label || row?.displayName || row?.narrativeTitleHe || "").trim() || "הנושא";

  const finding = resolveTopicParentFindingHe(enriched, rawMistakes);
  const evidence = resolveTopicEvidenceBasisHe(enriched, lpd);
  const adcContract =
    row?.actionDecisionContract ||
    readEngineContractFromRow(enriched)?.actionDecisionContract ||
    null;
  const systemAction = guardParentFacingText(
    buildParentSystemActionLineHe(adcContract, { topicLabel: topicName }),
  );
  const homeRecommendation = guardParentFacingText(
    resolveTopicRecommendationOwnerCopyHe(enriched, "doNow") ||
      lpdHomeActionLineHe(lpd, topicName),
  );

  return {
    finding,
    evidence,
    systemAction,
    homeRecommendation,
  };
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
  const finding = resolveTopicParentFindingHe(
    { ...row, learningPatternDecision: lpd },
    rawMistakes,
  );
  if (!finding) return "";
  return buildLpdParentInsightLineHe({ ...row, learningPatternDecision: { ...lpd, parentVisibleFinding: finding } });
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

  const enriched = { ...row, parentVisibleMetrics: metrics, learningPatternDecision: lpd };
  const topicName =
    String(row?.label || row?.displayName || lpd.recommendedFocus || "").trim() || "הנושא";
  const bundle = buildTopicParentReportBundleHe(enriched);
  const contract = readEngineContractFromRow(enriched);
  const patternLabel = resolveParentFacingPatternLabelHe(contract?.detectedPattern);
  const patternFromLpd = guardParentFacingText(lpdPatternLineHe(lpd));
  const pattern =
    patternFromLpd ||
    (patternLabel && q >= 5 ? guardParentFacingText(`הטעות שחוזרת: ${patternLabel}.`) : "");

  if (q <= 2) {
    const topicShort = topicName.replace(/\s*-\s*כיתה\s*[א-ט״']+\s*$/u, "").trim() || topicName;
    return {
      identified: guardParentFacingText(`מה נמצא: יש כרגע מעט שאלות בנושא ${topicShort}.`),
      data: guardParentFacingText(
        bundle.evidence ||
          buildParentMetricsDataLineHe({ ...metrics, questions: q }, topicShort),
      ),
      pattern: "",
      meaning: guardParentFacingText("מה זה אומר: עדיין מוקדם להסיק מסקנה ברורה. צריך עוד כמה שאלות בנושא."),
      action: guardParentFacingText(
        bundle.homeRecommendation ||
          "מה כדאי לעשות ביחד: להמשיך לתרגל מעט, בלי להסיק עדיין שיש קושי קבוע.",
      ),
      systemAction: bundle.systemAction
        ? guardParentFacingText(`מה המערכת עושה: ${bundle.systemAction}`)
        : "",
    };
  }

  const ownerSections = resolveTopicExplainOwnerSectionsHe(enriched);
  const identified = bundle.finding
    ? guardParentFacingText(`מה נמצא: ${bundle.finding}`)
    : guardParentFacingText(ownerSections?.identified || `מה נמצא: מיקוד בנושא ${topicName}.`);
  const data = guardParentFacingText(
    bundle.evidence
      ? `על מה זה מבוסס: ${bundle.evidence}`
      : ownerSections?.data || buildParentMetricsDataLineHe(metrics, topicName),
  );
  const meaning = guardParentFacingText(
    ownerSections?.meaning || lpdMeaningLineHe(lpd, topicName),
  );
  const homeAction = guardParentFacingText(
    ownerSections?.action ||
      bundle.homeRecommendation ||
      lpdHomeActionLineHe(lpd, topicName),
  );
  const systemAction = bundle.systemAction
    ? guardParentFacingText(`מה המערכת עושה: ${bundle.systemAction}`)
    : "";

  return {
    identified,
    data,
    pattern,
    meaning,
    action: homeAction,
    systemAction,
  };
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
  const primaryFinding = guardParentFacingText(
    resolveTopicParentFindingHe(
      { ...row, parentVisibleMetrics: metrics, learningPatternDecision: lpd },
    ) || ownerPrimaryFinding || lpd.parentVisibleFinding,
  );
  const isInitial = q <= 2;

  return {
    hasLpd: true,
    primaryFinding,
    explainSections,
    suppressEngineCopy: false,
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
