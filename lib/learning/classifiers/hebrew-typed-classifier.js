/**
 * Deterministic Hebrew typed-answer classifier.
 * No topic inference — only string/nikud comparison when expected answer is known.
 */

import { EVIDENCE_TYPES } from "../answer-evidence-contract.js";

/** Strip Hebrew nikud and normalize whitespace */
function normalizeHebrew(s) {
  return String(s || "")
    .trim()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[״"']/g, "")
    .toLowerCase();
}

/** Levenshtein distance for short Hebrew words */
function editDistance(a, b) {
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
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyHebrewTypedAnswer(userAnswer, expectedAnswer, params) {
  if (userAnswer == null || expectedAnswer == null) return null;
  const expected = normalizeHebrew(expectedAnswer);
  const user = normalizeHebrew(userAnswer);
  if (!expected || !user || user === expected) return null;

  const p = params && typeof params === "object" ? params : {};
  const answerMode = String(p.answerMode || p.kind || "").toLowerCase();
  const isSpelling =
    answerMode.includes("spell") ||
    answerMode.includes("typing") ||
    String(p.patternFamily || "").includes("spelling") ||
    p.checkSpelling === true;

  if (!isSpelling && !p.expectedWord) return null;

  const dist = editDistance(user, expected);
  const len = Math.max(user.length, expected.length);

  if (dist === 0) return null;

  if (Array.isArray(p.homophonePair) && p.homophonePair.length >= 2) {
    const pair = p.homophonePair.map((w) => normalizeHebrew(w));
    if (pair.includes(user) && pair.includes(expected) && user !== expected) {
      return {
        tag: "homophone_confusion",
        evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
        details: { user, expected, homophonePair: pair },
        confidence: 0.9,
      };
    }
  }

  const pf = String(p.patternFamily || "").toLowerCase();
  if (
    (pf.includes("homophone") || pf.includes("homograph") || p.isHomophone === true) &&
    dist >= 1 &&
    dist <= 2 &&
    len >= 2
  ) {
    return {
      tag: "homophone_confusion",
      evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
      details: { user, expected, patternFamily: pf, editDistance: dist },
      confidence: 0.86,
    };
  }

  if (dist === 1 && len >= 2 && len <= 12) {
    return {
      tag: "spelling_pattern_error",
      evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
      details: { user, expected, editDistance: dist },
      confidence: 0.88,
    };
  }

  if (dist >= 2 && dist <= 3 && len <= 8) {
    return {
      tag: "writing_pattern_error",
      evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
      details: { user, expected, editDistance: dist },
      confidence: 0.75,
    };
  }

  return null;
}
