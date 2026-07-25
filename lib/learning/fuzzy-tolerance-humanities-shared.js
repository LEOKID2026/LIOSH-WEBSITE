/**
 * Shared helpers for science / history / moledet exact TEPs (0 FP).
 */

import { EVIDENCE_TYPES } from "./answer-evidence-contract.js";
import { normalizeToCanonicalTag } from "./taxonomy-tag-normalizer.js";

/** @param {unknown} s */
export function normalizeHumanitiesText(s) {
  return String(s || "")
    .trim()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[״"']/g, "")
    .toLowerCase();
}

/** @param {string} a @param {string} b */
export function humanitiesEditDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  /** @type {number[][]} */
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * @param {string} tag
 * @param {object} details
 * @param {string} ruleId
 * @param {number} [confidence]
 */
export function humanitiesHit(tag, details, ruleId, confidence = 0.9) {
  return {
    tag: normalizeToCanonicalTag(tag) || tag,
    evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
    details,
    confidence,
    ruleId,
  };
}

/** @param {unknown} list */
export function asNormHumanitiesList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((w) => normalizeHumanitiesText(w)).filter(Boolean);
}

/**
 * Collect wrong-form candidates from explicit lists / answers / options.
 * @param {object} p
 * @param {string} expected
 */
export function collectWrongForms(p, expected) {
  let wrong = asNormHumanitiesList(p?.wrongForms || p?.knownMisconceptions || p?.nearMissAnswers);
  if (!wrong.length && Array.isArray(p?.answers)) {
    wrong = asNormHumanitiesList(p.answers).filter((w) => w !== expected);
  }
  if (!wrong.length && Array.isArray(p?.options)) {
    wrong = asNormHumanitiesList(p.options).filter((w) => w !== expected);
  }
  if (!wrong.length && Array.isArray(p?.choices)) {
    wrong = asNormHumanitiesList(p.choices).filter((w) => w !== expected);
  }
  return wrong;
}

/**
 * Explicit confusion pair: both user and expected must be in the pair.
 * @param {object} p
 * @param {string} user
 * @param {string} expected
 */
export function matchesConfusionPair(p, user, expected) {
  const pair = asNormHumanitiesList(p?.confusionPair || p?.homophonePair || p?.unitConfusionPair);
  return pair.length >= 2 && pair.includes(user) && pair.includes(expected);
}

/**
 * Resolve canonical tag from params (never invent from free text alone).
 * @param {object} p
 * @param {string} fallback
 * @param {Record<string, string>} [patternMap]
 */
export function resolveListedTag(p, fallback, patternMap = {}) {
  const explicit =
    normalizeToCanonicalTag(p?.misconceptionTag) ||
    normalizeToCanonicalTag(p?.distractorFamily);
  if (explicit && explicit !== "unknown" && explicit !== "generic_proximity") return explicit;

  if (Array.isArray(p?.expectedErrorTags)) {
    for (const t of p.expectedErrorTags) {
      const tag = normalizeToCanonicalTag(t);
      if (tag && tag !== "unknown") return tag;
    }
  }

  const pf = String(p?.patternFamily || p?.kind || "").trim();
  if (pf && patternMap[pf]) return normalizeToCanonicalTag(patternMap[pf]) || patternMap[pf];
  const pfLower = pf.toLowerCase();
  for (const [k, v] of Object.entries(patternMap)) {
    if (pfLower.includes(k.toLowerCase()) || k.toLowerCase().includes(pfLower)) {
      return normalizeToCanonicalTag(v) || v;
    }
  }
  return normalizeToCanonicalTag(fallback) || fallback;
}

/**
 * Typed spelling gate — structural edit-distance only under this.
 * @param {object} p
 */
export function isHumanitiesSpellingGate(p) {
  const mode = String(p?.answerMode || p?.runtimeAnswerMode || "").toLowerCase();
  const pf = String(p?.patternFamily || p?.kind || "").toLowerCase();
  return (
    mode.includes("typ") ||
    mode.includes("spell") ||
    pf.includes("spell") ||
    p?.checkSpelling === true ||
    !!p?.expectedWord
  );
}
