/**
 * Hebrew diagnostics — exact TEPs (homophone, agreement, punctuation, known misspellings).
 * Structural edit-distance only after exact; far wrongs → null (0 FP).
 */

import { EVIDENCE_TYPES } from "./answer-evidence-contract.js";

/** @param {unknown} s */
export function normalizeHebrewText(s) {
  return String(s || "")
    .trim()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[״"']/g, "")
    .toLowerCase();
}

/** @param {string} a @param {string} b */
export function hebrewEditDistance(a, b) {
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

function hit(tag, details, ruleId, confidence = 0.9) {
  return {
    tag,
    evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
    details,
    confidence,
    ruleId,
  };
}

/** @param {unknown} list */
function asNormList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((w) => normalizeHebrewText(w)).filter(Boolean);
}

/**
 * @param {object} p
 */
export function proveHebrewHomophonePair(p) {
  const user = normalizeHebrewText(p?.userAnswer);
  const expected = normalizeHebrewText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;
  const pair = asNormList(p?.homophonePair);
  if (pair.length < 2) return null;
  if (pair.includes(user) && pair.includes(expected)) {
    return hit(
      "homophone_confusion",
      { user, expected, homophonePair: pair, mode: "explicit_pair" },
      "hebrew_exact:homophone_confusion:pair",
      0.92,
    );
  }
  return null;
}

/**
 * Agreement / gender-number: user ∈ wrongForms, expected === correctForm.
 * @param {object} p
 */
export function proveHebrewAgreementSlot(p) {
  const user = normalizeHebrewText(p?.userAnswer);
  const expected = normalizeHebrewText(p?.expectedAnswer ?? p?.correctForm);
  if (!user || !expected || user === expected) return null;

  const pf = String(p?.patternFamily || p?.kind || "").toLowerCase();
  const tags = Array.isArray(p?.expectedErrorTags)
    ? p.expectedErrorTags.map((t) => String(t).toLowerCase())
    : [];
  const agreementContext =
    pf.includes("agreement") ||
    pf.includes("gender") ||
    pf.includes("number") ||
    tags.some((t) => t.includes("agreement") || t.includes("gender")) ||
    Array.isArray(p?.wrongForms);

  if (!agreementContext) return null;

  let wrongForms = asNormList(p?.wrongForms);
  if (!wrongForms.length && Array.isArray(p?.answers)) {
    wrongForms = asNormList(p.answers).filter((w) => w !== expected);
  }
  if (!wrongForms.length && Array.isArray(p?.options)) {
    wrongForms = asNormList(p.options).filter((w) => w !== expected);
  }
  if (!wrongForms.includes(user)) return null;

  return hit(
    "grammar_agreement_error",
    {
      user,
      expected,
      wrongForms,
      mode: "agreement_slot",
      alias: "gender_number_agreement",
    },
    "hebrew_exact:grammar_agreement_error",
    0.92,
  );
}

/**
 * Punctuation identity slips (end mark / missing mark).
 * @param {object} p
 */
export function proveHebrewPunctuationIdentity(p) {
  const userRaw = String(p?.userAnswer ?? "").trim();
  const expectedRaw = String(p?.expectedAnswer ?? "").trim();
  if (!userRaw || !expectedRaw || userRaw === expectedRaw) return null;

  const pf = String(p?.patternFamily || p?.kind || "").toLowerCase();
  const tags = Array.isArray(p?.expectedErrorTags)
    ? p.expectedErrorTags.map((t) => String(t).toLowerCase())
    : [];
  const punctContext =
    pf.includes("punct") ||
    tags.some((t) => t.includes("punct")) ||
    Array.isArray(p?.wrongForms);

  if (!punctContext) return null;

  const user = normalizeHebrewText(userRaw);
  const expected = normalizeHebrewText(expectedRaw);
  // Same letters, different punctuation only
  const stripPunct = (s) => s.replace(/[?.!,؛׃]/g, "").trim();
  if (stripPunct(user) === stripPunct(expected) && user !== expected) {
    return hit(
      "punctuation_error",
      { user: userRaw, expected: expectedRaw, mode: "end_mark" },
      "hebrew_exact:punctuation_error",
      0.9,
    );
  }

  let wrongForms = asNormList(p?.wrongForms);
  if (!wrongForms.length && Array.isArray(p?.answers)) {
    wrongForms = asNormList(p.answers).filter((w) => w !== expected);
  }
  if (wrongForms.includes(user)) {
    return hit(
      "punctuation_error",
      { user: userRaw, expected: expectedRaw, mode: "listed_wrong_form" },
      "hebrew_exact:punctuation_error:list",
      0.9,
    );
  }
  return null;
}

/**
 * Known misspelling list (explicit near-miss only).
 * @param {object} p
 */
export function proveHebrewKnownMisspelling(p) {
  const user = normalizeHebrewText(p?.userAnswer);
  const expected = normalizeHebrewText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;
  const known = asNormList(p?.knownMisspellings || p?.knownNearMiss);
  if (known.includes(user)) {
    return hit(
      "spelling_pattern_error",
      { user, expected, mode: "known_misspelling" },
      "hebrew_exact:spelling_pattern_error:known",
      0.9,
    );
  }
  return null;
}

/**
 * Structural spelling tier — edit-distance 1 under spelling gate only.
 * @param {object} p
 */
export function proveHebrewSpellingStructural(p) {
  const user = normalizeHebrewText(p?.userAnswer);
  const expected = normalizeHebrewText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const answerMode = String(p?.answerMode || p?.kind || "").toLowerCase();
  const isSpelling =
    answerMode.includes("spell") ||
    answerMode.includes("typing") ||
    String(p?.patternFamily || "").includes("spelling") ||
    p?.checkSpelling === true ||
    !!p?.expectedWord;
  if (!isSpelling) return null;

  const dist = hebrewEditDistance(user, expected);
  const len = Math.max(user.length, expected.length);
  if (dist === 1 && len >= 2 && len <= 12) {
    return hit(
      "spelling_pattern_error",
      { user, expected, editDistance: dist, tier: "structural" },
      "hebrew_structural:spelling_pattern_error",
      0.88,
    );
  }
  if (dist >= 2 && dist <= 3 && len <= 8) {
    return hit(
      "writing_pattern_error",
      { user, expected, editDistance: dist, tier: "structural" },
      "hebrew_structural:writing_pattern_error",
      0.75,
    );
  }

  // Homophone family without explicit pair (gated)
  const pf = String(p?.patternFamily || "").toLowerCase();
  if (
    (pf.includes("homophone") || pf.includes("homograph") || p?.isHomophone === true) &&
    dist >= 1 &&
    dist <= 2 &&
    len >= 2
  ) {
    return hit(
      "homophone_confusion",
      { user, expected, patternFamily: pf, editDistance: dist, tier: "structural" },
      "hebrew_structural:homophone_confusion",
      0.86,
    );
  }
  return null;
}

/**
 * @param {object} p
 */
export function classifyHebrewAnswer(p) {
  const exact = [
    proveHebrewHomophonePair,
    proveHebrewAgreementSlot,
    proveHebrewPunctuationIdentity,
    proveHebrewKnownMisspelling,
  ];
  for (const fn of exact) {
    const r = fn(p);
    if (r) return r;
  }
  return proveHebrewSpellingStructural(p);
}
