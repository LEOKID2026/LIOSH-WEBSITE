/**
 * Factual observations for parent reports — separate from DE2 detectedPattern claims.
 * Does not mutate taxonomy / blockPatternClaim / engineDecision / ADC.
 */
import { mistakePatternClusterKey, mistakeTimestampMs } from "../mistake-event.js";
import { normalizeToCanonicalTag } from "../../lib/learning/taxonomy-tag-normalizer.js";
import {
  parentFacingErrorPatternLabelHe,
  isApprovedFactualObservationTag,
} from "./parent-facing-error-pattern-he.js";

/**
 * Final recurrence ladder for a single factual observation (product policy 2026-07-26).
 * @param {{ count: number, totalQuestions: number, totalErrors: number }} p
 * @returns {"none"|"observed"|"repeated"|"consistent"|"strong"}
 */
export function resolveFactualRecurrenceLevel(p) {
  const count = Math.max(0, Math.floor(Number(p?.count) || 0));
  const q = Math.max(0, Math.floor(Number(p?.totalQuestions) || 0));
  const errors = Math.max(0, Math.floor(Number(p?.totalErrors) || 0));
  if (count < 1 || q < 1) return "none";

  const ratioOfErrors = errors > 0 ? count / errors : 0;
  const ratioOfQuestions = count / q;

  // strong / central
  if (
    q >= 10 &&
    count >= 5 &&
    ratioOfErrors >= 0.5 &&
    ratioOfQuestions >= 0.2
  ) {
    return "strong";
  }
  // consistent
  if (
    q >= 5 &&
    count >= 3 &&
    ratioOfErrors >= 0.4 &&
    ratioOfQuestions >= 0.15
  ) {
    return "consistent";
  }
  // repeated — count only, no ratio gate
  if (count >= 2) return "repeated";
  // observed
  if (count === 1) return "observed";
  return "none";
}

/**
 * Top-of-list observedPatternLevel from factual observations (new ladder).
 * @param {ReturnType<typeof buildFactualObservations>} observations
 * @param {number} questionCount
 */
export function resolveObservedPatternLevelFromFactualObservations(observations, questionCount) {
  const q = Math.max(0, Number(questionCount) || 0);
  if (!Array.isArray(observations) || !observations.length || q === 0) return "none";
  const top = observations[0];
  return String(top.recurrenceLevel || "none");
}

function stripPrefix(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/^(mt|pf|st|ct|k|to):/i, "");
}

/**
 * @param {string} clusterKey
 */
export function canonicalKeyFromPatternKey(clusterKey) {
  const stripped = stripPrefix(clusterKey);
  return normalizeToCanonicalTag(stripped) || stripped;
}

function sessionIdOf(ev) {
  return (
    String(ev?.sessionId || ev?.metadata?.sessionId || ev?.session_id || "").trim() || null
  );
}

function dayKeyOf(ev) {
  const ms = mistakeTimestampMs(ev);
  if (ms == null) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Build parent-facing factualObservations from wrong events.
 * Includes count>=1 when an approved Hebrew label exists. Merges aliases by canonicalKey.
 *
 * @param {object} p
 * @param {import("../mistake-event.js").MistakeEventV1[]} p.wrongEvents
 * @param {number} p.totalQuestions
 * @param {number} [p.totalErrors]
 */
export function buildFactualObservations(p) {
  const wrongs = Array.isArray(p?.wrongEvents)
    ? p.wrongEvents.filter((e) => e && !e.isCorrect)
    : [];
  const totalQuestions = Math.max(0, Math.floor(Number(p?.totalQuestions) || 0));
  const totalErrors = Math.max(
    0,
    Math.floor(Number(p?.totalErrors != null ? p.totalErrors : wrongs.length) || 0),
  );

  /** @type {Map<string, { keys: Set<string>, count: number, sessions: Set<string>, days: Set<string>, firstSeenAt: number|null, lastSeenAt: number|null }>} */
  const byCanon = new Map();

  for (const ev of wrongs) {
    const clusterKey = mistakePatternClusterKey(ev);
    const canon = canonicalKeyFromPatternKey(clusterKey);
    // Only classifier-proven approved tags may become factualObservations.
    if (!isApprovedFactualObservationTag(canon)) continue;
    const labelHe = parentFacingErrorPatternLabelHe(canon) || parentFacingErrorPatternLabelHe(clusterKey);
    if (!labelHe) continue;

    const prev =
      byCanon.get(canon) ||
      ({
        keys: new Set(),
        count: 0,
        sessions: new Set(),
        days: new Set(),
        firstSeenAt: null,
        lastSeenAt: null,
        labelHe,
      });
    prev.keys.add(clusterKey);
    prev.count += 1;
    const sid = sessionIdOf(ev);
    if (sid) prev.sessions.add(sid);
    const day = dayKeyOf(ev);
    if (day) prev.days.add(day);
    const ts = mistakeTimestampMs(ev);
    if (ts != null) {
      if (prev.firstSeenAt == null || ts < prev.firstSeenAt) prev.firstSeenAt = ts;
      if (prev.lastSeenAt == null || ts > prev.lastSeenAt) prev.lastSeenAt = ts;
    }
    byCanon.set(canon, prev);
  }

  const LEVEL_RANK = { strong: 4, consistent: 3, repeated: 2, observed: 1, none: 0 };

  const out = [];
  for (const [canonicalKey, agg] of byCanon) {
    const labelHe = parentFacingErrorPatternLabelHe(canonicalKey) || agg.labelHe;
    if (!labelHe) continue;
    const count = agg.count;
    const ratioOfQuestions = totalQuestions > 0 ? count / totalQuestions : 0;
    const ratioOfErrors = totalErrors > 0 ? count / totalErrors : 0;
    const recurrenceLevel = resolveFactualRecurrenceLevel({
      count,
      totalQuestions,
      totalErrors,
    });
    const key = [...agg.keys].sort()[0] || `mt:${canonicalKey}`;
    out.push({
      key,
      canonicalKey,
      labelHe,
      count,
      totalQuestions,
      totalErrors,
      ratioOfQuestions: Number(ratioOfQuestions.toFixed(4)),
      ratioOfErrors: Number(ratioOfErrors.toFixed(4)),
      distinctSessions: agg.sessions.size,
      distinctDays: agg.days.size,
      firstSeenAt: agg.firstSeenAt,
      lastSeenAt: agg.lastSeenAt,
      recurrenceLevel,
    });
  }

  out.sort((a, b) => {
    const lr = (LEVEL_RANK[b.recurrenceLevel] || 0) - (LEVEL_RANK[a.recurrenceLevel] || 0);
    if (lr) return lr;
    if (b.count !== a.count) return b.count - a.count;
    if (b.ratioOfQuestions !== a.ratioOfQuestions) return b.ratioOfQuestions - a.ratioOfQuestions;
    if (b.ratioOfErrors !== a.ratioOfErrors) return b.ratioOfErrors - a.ratioOfErrors;
    return String(a.canonicalKey).localeCompare(String(b.canonicalKey));
  });

  return out;
}

/**
 * Hebrew count phrase for observation sentences.
 * @param {number} count
 */
export function factualCountPhraseHe(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 1) return "בתשובה אחת הופיעה";
  if (n === 2) return "בשתי תשובות חזרה";
  return `ב-${n} תשובות חזרה`;
}

/**
 * @param {object} obs
 */
export function formatFactualObservationSentenceHe(obs) {
  const label = String(obs?.labelHe || "").trim();
  if (!label) return "";
  const count = Math.max(0, Math.floor(Number(obs?.count) || 0));
  if (count < 1) return "";
  let sentence = `${factualCountPhraseHe(count)} ${label}.`;
  const sessions = Math.max(0, Math.floor(Number(obs?.distinctSessions) || 0));
  const days = Math.max(0, Math.floor(Number(obs?.distinctDays) || 0));
  if (sessions >= 2 || days >= 2) {
    const sessPart =
      sessions >= 2 ? `ב-${sessions} מפגשים` : sessions === 1 ? "במפגש אחד" : "";
    const dayPart =
      days >= 2 ? `ב-${days} ימים שונים` : days === 1 ? "ביום אחד" : "";
    if (sessPart && dayPart) {
      sentence += ` הטעות הופיעה ${sessPart} שנערכו ${dayPart}.`;
    } else if (sessPart) {
      sentence += ` הטעות הופיעה ${sessPart}.`;
    } else if (dayPart) {
      sentence += ` הטעות הופיעה ${dayPart}.`;
    }
  }
  return sentence;
}
