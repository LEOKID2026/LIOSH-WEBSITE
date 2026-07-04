/**
 * LPD-safe parent-facing copy helpers — subject-agnostic.
 */
import { buildLearningPatternDecision } from "./build-learning-pattern-decision.js";
import { findForbiddenParentWords } from "./build-parent-visible-finding.js";
import { rowNeedsPracticeFromLpd } from "./apply-learning-pattern-decision.js";

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
  const existing = getLpdFromRow(row);
  if (existing) return existing;

  const subjectId = String(row.subjectId || row.subject || "").trim();
  const topicKey = String(row.topicKey || row.bucketKey || row.label || "").trim();
  const q = Math.max(0, Number(row.questions) || 0);
  if (!subjectId || q <= 0) return null;

  const accRaw = Number(row.accuracy);
  const cExplicit = Number(row.correct);
  const wExplicit = Number(row.wrong);
  const c = Number.isFinite(cExplicit)
    ? Math.max(0, cExplicit)
    : Number.isFinite(accRaw)
      ? Math.round((q * accRaw) / 100)
      : 0;
  const w = Number.isFinite(wExplicit) ? Math.max(0, wExplicit) : Math.max(0, q - c);
  const accuracy = Number.isFinite(accRaw) ? accRaw : q > 0 ? (c / q) * 100 : 0;
  const name = String(row.label || row.displayName || topicKey).trim() || topicKey;

  return buildLearningPatternDecision({
    subjectId,
    topicRowKey: topicKey,
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
  const finding = guardParentFacingText(lpd.parentVisibleFinding);
  if (!finding) return "";
  const enriched = { ...row, learningPatternDecision: lpd };
  return buildLpdParentInsightLineHe(enriched);
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
  if (subj && label) return guardParentFacingText(`${subj} — «${label}»: ${finding}`);
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

  const topicLine = topicLabelFn(weakTopic.subject, topicKey);
  const topicName = String(topicLine || "").replace(/^[^\s]+\s*/, "").trim() || topicKey;
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
 * @param {Record<string, unknown>|null|undefined} row
 */
export function resolveParentExplainRowCopy(row) {
  const lpd = resolveOrBuildLpdOnRow(row);
  const q = Number(row?.questions ?? lpd?.practicedQuestions) || 0;

  if (q <= 0) {
    return {
      hasLpd: !!lpd,
      primaryFinding: "",
      suppressEngineCopy: true,
      parentWordingLevel: "no_parent_text",
      showTrend: false,
    };
  }

  if (!lpd || lpd.topicStatus === "not_practiced") {
    return {
      hasLpd: false,
      primaryFinding: "",
      suppressEngineCopy: true,
      parentWordingLevel: "no_parent_text",
      showTrend: false,
    };
  }

  const primaryFinding = guardParentFacingText(lpd.parentVisibleFinding);
  const isInitial =
    lpd.topicStatus === "initial_data" || lpd.findingType === "initial_topic_data";

  return {
    hasLpd: true,
    primaryFinding,
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
