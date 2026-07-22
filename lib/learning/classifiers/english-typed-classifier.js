/**
 * Deterministic English typed-answer classifier.
 * No topic inference — case-insensitive exact match + edit distance only.
 */

import { EVIDENCE_TYPES } from "../answer-evidence-contract.js";

function normalizeEnglish(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

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

const TENSE_SUFFIXES = ["ed", "ing", "s", "es"];

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyEnglishTypedAnswer(userAnswer, expectedAnswer, params) {
  if (userAnswer == null || expectedAnswer == null) return null;
  const expected = normalizeEnglish(expectedAnswer);
  const user = normalizeEnglish(userAnswer);
  if (!expected || !user || user === expected) return null;

  const p = params && typeof params === "object" ? params : {};
  const dist = editDistance(user, expected);
  const len = Math.max(user.length, expected.length);

  if (dist === 1 && len >= 2 && len <= 20) {
    return {
      tag: "spelling_error",
      evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
      details: { user, expected, editDistance: dist },
      confidence: 0.9,
    };
  }

  if (dist === 2 && len <= 12) {
    return {
      tag: "writing_error",
      evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
      details: { user, expected, editDistance: dist },
      confidence: 0.82,
    };
  }

  const stem = expected.replace(/(ed|ing|es|s)$/i, "");
  if (stem.length >= 3) {
    for (const suf of TENSE_SUFFIXES) {
      const alt = stem + suf;
      if (user === alt && alt !== expected) {
        return {
          tag: "tense_error",
          evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
          details: { user, expected, stem, suffix: suf },
          confidence: 0.85,
        };
      }
    }
  }

  if (p.expectedLemma && normalizeEnglish(p.expectedLemma) === user && user !== expected) {
    return {
      tag: "grammar_error",
      evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
      details: { user, expected, expectedLemma: p.expectedLemma },
      confidence: 0.8,
    };
  }

  return null;
}
