/**
 * Strict allowlisted projection of the Insight Packet that the AI narrative writer is allowed to
 * see. This is the ONLY object passed to the LLM. Privacy / safety invariants enforced here:
 *
 *  - Strips raw English topic keys from any user-visible field. Only `sourceId` carries them, and
 *    sourceId is opaque to the model (it is restricted to a closed enum in the JSON Schema).
 *  - Drops `clientMeta`, `prompt`, `expectedAnswer`, `userAnswer`, DB ids, student id, etc.
 *  - Drops `mode`/`level` count maps when too sparse to be safely anonymous (< 2 events total).
 *  - Hard caps the projection at MAX_PROMPT_INPUT_CHARS bytes; the LLM client must trip the
 *    fallback if exceeded.
 */

export const MAX_PROMPT_INPUT_CHARS = 4000;

function bandFromAccuracy(acc) {
  const a = Math.max(0, Math.min(100, Number(acc) || 0));
  if (a >= 85) return "high";
  if (a >= 70) return "moderate";
  if (a >= 50) return "mixed";
  return "low";
}

function summarizeCounts(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const out = {};
  let totalKnown = 0;
  for (const k of Object.keys(map)) {
    if (k === "unknown") continue;
    const v = Math.max(0, Math.round(Number(map[k]) || 0));
    if (v > 0) {
      out[k] = v;
      totalKnown += v;
    }
  }
  return totalKnown >= 2 ? out : null;
}

function trimText(value, max) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Deterministic safe Hebrew caution sentence for the AI to copy verbatim into `cautionNote`
 * when the packet has thin-data warnings. ALL branches contain "כיוון ראשוני" so the result
 * is guaranteed to satisfy the validator's `SAFE_THIN_DATA_HINTS_RE` (step 7) regardless of
 * the warning scope. Returning `null` when no thin-data warnings exist signals the prompt
 * that the AI may leave `cautionNote` empty.
 *
 * Length: each branch ≤ 280 chars (cautionMaxChars).
 */
function deriveRequiredCautionNoteHe(thinDataWarnings) {
  if (!Array.isArray(thinDataWarnings) || thinDataWarnings.length === 0) return null;
  const hasOverall = thinDataWarnings.some((w) => w?.scope === "overall");
  if (hasOverall) {
    return "חשוב לזכור שהנתונים בתקופה זו מועטים - מדובר בכיוון ראשוני בלבד וכדאי להימנע ממסקנות חזקות.";
  }
  const subjects = thinDataWarnings
    .filter(
      (w) =>
        w?.scope === "subject" &&
        typeof w?.displayNameHe === "string" &&
        w.displayNameHe.trim()
    )
    .map((w) => w.displayNameHe.trim())
    .slice(0, 3);
  if (subjects.length === 0) {
    return "חשוב לזכור שהנתונים בחלק מהתחומים מצומצמים - מדובר בכיוון ראשוני בלבד.";
  }
  return `חשוב לזכור שבמקצועות ${subjects.join(", ")} הנתונים מצומצמים בתקופה זו - מדובר בכיוון ראשוני בלבד.`;
}

export function buildAiNarrativeInput(packet) {
  if (!packet || typeof packet !== "object") return null;

  const overall = packet.overall && typeof packet.overall === "object" ? packet.overall : {};
  const subjectsArr = Array.isArray(packet.subjects) ? packet.subjects : [];
  const strengthsArr = Array.isArray(packet.strengths) ? packet.strengths : [];
  const focusAreasArr = Array.isArray(packet.focusAreas) ? packet.focusAreas : [];
  const fluency = packet.fluencySignals && typeof packet.fluencySignals === "object" ? packet.fluencySignals : null;
  const trend = packet.trendSignals && typeof packet.trendSignals === "object" ? packet.trendSignals : null;
  const mistakes = Array.isArray(packet.mistakePatterns) ? packet.mistakePatterns : [];
  const recommendations = Array.isArray(packet.deterministicRecommendationsHe)
    ? packet.deterministicRecommendationsHe
    : [];
  const thinDataWarnings = Array.isArray(packet.thinDataWarnings) ? packet.thinDataWarnings : [];

  return {
    studentDisplayName: trimText(packet.student?.displayName, 80),
    gradeLevel: trimText(packet.student?.gradeLevel, 8) || "unknown",
    registeredGradeLevel: trimText(packet.student?.registeredGradeLevel, 8) || trimText(packet.student?.gradeLevel, 8) || "unknown",
    mixedGradePractice: packet.mixedGradePractice === true,
    mixedGradePracticeNoteHe: trimText(packet.mixedGradePracticeNoteHe, 220) || null,
    gradePracticeBreakdown: Array.isArray(packet.gradePracticeBreakdown)
      ? packet.gradePracticeBreakdown.slice(0, 24).map((row) => ({
          subjectKey: trimText(row?.subjectKey, 32),
          displayNameHe: trimText(row?.displayNameHe, 60),
          contentGradeLevel: trimText(row?.contentGradeLevel, 8),
          gradeRelation: trimText(row?.gradeRelation, 16) || "unknown",
          totalQuestions: Math.max(0, Math.round(Number(row?.totalQuestions) || 0)),
          accuracyPct: Math.max(0, Math.min(100, Math.round(Number(row?.accuracyPct) || 0))),
        }))
      : [],
    rangeLabel: trimText(packet.range?.label, 16),
    overall: {
      totalQuestions: Math.max(0, Math.round(Number(overall.totalQuestions) || 0)),
      accuracyBand: bandFromAccuracy(overall.accuracyPct),
      dataConfidence: trimText(overall.dataConfidence, 16) || "thin",
      avgTimePerQuestionSec:
        typeof overall.avgTimePerQuestionSec === "number" ? overall.avgTimePerQuestionSec : null,
      avgHintsPerQuestion:
        typeof overall.avgHintsPerQuestion === "number" ? overall.avgHintsPerQuestion : null,
      modeCounts: summarizeCounts(overall.modeCounts),
      levelCounts: summarizeCounts(overall.levelCounts),
    },
    subjects: subjectsArr.map((s) => ({
      sourceId: s.sourceId,
      displayNameHe: trimText(s.displayNameHe, 60),
      totalQuestions: Math.max(0, Math.round(Number(s.totalQuestions) || 0)),
      accuracyBand: bandFromAccuracy(s.accuracyPct),
      trend: trimText(s.trend, 24) || "insufficient_data",
      dataConfidence: trimText(s.dataConfidence, 16) || "thin",
    })),
    strengths: strengthsArr.map((s) => ({
      sourceId: s.sourceId,
      displayNameHe: trimText(s.displayNameHe, 60),
      evidenceHe: trimText(s.evidenceHe, 80),
    })),
    focusAreas: focusAreasArr.map((f) => ({
      sourceId: f.sourceId,
      displayNameHe: trimText(f.displayNameHe, 60),
      evidenceHe: trimText(f.evidenceHe, 80),
      thinData: f.thinData === true,
    })),
    availableStrengthSourceIds: strengthsArr
      .map((s) => s.sourceId)
      .filter((x) => typeof x === "string" && x.length > 0),
    availableFocusSourceIds: focusAreasArr
      .map((f) => f.sourceId)
      .filter((x) => typeof x === "string" && x.length > 0),
    fluency: fluency
      ? {
          correctSlowTopicsHe: (fluency.correctSlowTopicsHe || []).map((x) => trimText(x, 80)).filter(Boolean),
          correctManyHintsTopicsHe: (fluency.correctManyHintsTopicsHe || [])
            .map((x) => trimText(x, 80))
            .filter(Boolean),
          wrongFastTopicsHe: (fluency.wrongFastTopicsHe || []).map((x) => trimText(x, 80)).filter(Boolean),
        }
      : null,
    trend: trend
      ? {
          subjectTrends: (trend.subjectTrends || []).map((t) => ({
            subjectKey: trimText(t.subjectKey, 40),
            trend: trimText(t.trend, 24) || "insufficient_data",
          })),
        }
      : null,
    repeatedMistakes: mistakes.map((m) => ({
      topicDisplayHe: trimText(m.topicDisplayHe, 80),
      occurrences: Math.max(0, Math.round(Number(m.occurrences) || 0)),
    })),
    deterministicRecommendationsHe: recommendations.map((x) => trimText(x, 200)).filter(Boolean).slice(0, 6),
    thinDataWarnings: thinDataWarnings.map((w) => ({
      scope: trimText(w.scope, 16),
      displayNameHe: trimText(w.displayNameHe, 60),
      questionCount: Math.max(0, Math.round(Number(w.questionCount) || 0)),
    })),
    requiredCautionNoteHe: deriveRequiredCautionNoteHe(thinDataWarnings),
  };
}

export function aiNarrativeInputSizeChars(input) {
  if (!input) return 0;
  try {
    return JSON.stringify(input).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function isAiNarrativeInputWithinBudget(input) {
  return aiNarrativeInputSizeChars(input) <= MAX_PROMPT_INPUT_CHARS;
}
