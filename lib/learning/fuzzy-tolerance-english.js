/**
 * English diagnostics — exact TEPs (same-slot forms, phonics, tense alts, lemma).
 * Structural edit-distance only after exact; far wrongs → null (0 FP).
 */

import { EVIDENCE_TYPES } from "./answer-evidence-contract.js";

/** @param {unknown} s */
export function normalizeEnglishText(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** @param {string} a @param {string} b */
export function englishEditDistance(a, b) {
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
  return list.map((w) => normalizeEnglishText(w)).filter(Boolean);
}

/**
 * Same-slot grammar forms: am/is/are, prep sets, etc.
 * @param {object} p
 */
export function proveEnglishSameSlotForm(p) {
  const user = normalizeEnglishText(p?.userAnswer);
  const expected = normalizeEnglishText(p?.expectedAnswer ?? p?.correctForm);
  if (!user || !expected || user === expected) return null;

  let slot = asNormList(p?.sameSlotForms || p?.wrongForms);
  if (!slot.length && Array.isArray(p?.answers)) {
    slot = asNormList(p.answers);
  }
  if (!slot.length && Array.isArray(p?.options)) {
    slot = asNormList(p.options);
  }
  if (slot.length < 2) return null;
  if (!slot.includes(expected) || !slot.includes(user)) return null;

  const pf = String(p?.patternFamily || p?.kind || "").toLowerCase();
  const tags = Array.isArray(p?.expectedErrorTags)
    ? p.expectedErrorTags.map((t) => String(t).toLowerCase())
    : [];

  // Preposition / article slots
  if (
    pf.includes("preposition") ||
    pf.includes("article") ||
    tags.some((t) => t.includes("preposition") || t.includes("article")) ||
    p?.correctPrep != null
  ) {
    return hit(
      "preposition_error",
      { user, expected, sameSlotForms: slot, mode: "prep_slot" },
      "english_exact:preposition_error",
      0.92,
    );
  }

  // Phrasal verbs
  if (pf.includes("phrasal") || tags.some((t) => t.includes("phrasal"))) {
    return hit(
      "phrasal_verb_error",
      { user, expected, sameSlotForms: slot, mode: "phrasal_slot" },
      "english_exact:phrasal_verb_error",
      0.9,
    );
  }

  // Be / agreement / grammar slot
  if (
    pf.includes("be_") ||
    pf.includes("agreement") ||
    pf.includes("grammar") ||
    tags.some((t) => t.includes("grammar") || t.includes("agreement") || t.includes("tense"))
  ) {
    const beSet = new Set(["am", "is", "are", "was", "were", "be", "been", "being"]);
    if (beSet.has(user) && beSet.has(expected)) {
      return hit(
        "agreement_error",
        { user, expected, sameSlotForms: slot, mode: "be_slot", alias: "grammar_error" },
        "english_exact:agreement_error:be",
        0.92,
      );
    }
    return hit(
      "grammar_error",
      { user, expected, sameSlotForms: slot, mode: "same_slot" },
      "english_exact:grammar_error:slot",
      0.9,
    );
  }

  // Generic same-slot when explicitly provided
  if (Array.isArray(p?.sameSlotForms) && p.sameSlotForms.length >= 2) {
    return hit(
      "grammar_error",
      { user, expected, sameSlotForms: slot, mode: "explicit_slot" },
      "english_exact:grammar_error:explicit",
      0.88,
    );
  }
  return null;
}

/**
 * Phonics: single grapheme substitution (Hamming distance 1), kind-gated.
 * @param {object} p
 */
export function proveEnglishPhonicsMinimalPair(p) {
  const user = normalizeEnglishText(p?.userAnswer);
  const expected = normalizeEnglishText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;
  if (user.length !== expected.length || user.length < 2) return null;

  const kind = String(p?.kind || "").toLowerCase();
  const itemType = String(p?.itemType || p?.phonicsDiagnosticEvidence?.itemType || "").toLowerCase();
  const pf = String(p?.patternFamily || "").toLowerCase();
  const phonicsGate =
    kind.includes("phonics") ||
    itemType.includes("early_word") ||
    itemType.includes("cvc") ||
    pf.includes("phonics") ||
    pf.includes("cvc") ||
    !!p?.phonicsDiagnosticEvidence;
  if (!phonicsGate) return null;

  let diffs = 0;
  for (let i = 0; i < user.length; i++) {
    if (user[i] !== expected[i]) diffs += 1;
  }
  if (diffs !== 1) return null;

  return hit(
    "phonics_minimal_pair_error",
    { user, expected, mode: "single_grapheme", length: user.length },
    "english_exact:phonics_minimal_pair_error",
    0.94,
  );
}

/**
 * Explicit tense alternatives list, or gated suffix identity.
 * @param {object} p
 */
export function proveEnglishTenseAlt(p) {
  const user = normalizeEnglishText(p?.userAnswer);
  const expected = normalizeEnglishText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const alts = asNormList(p?.tenseAlts);
  if (alts.includes(user)) {
    return hit(
      "tense_error",
      { user, expected, tenseAlts: alts, mode: "explicit_alt" },
      "english_exact:tense_error:list",
      0.92,
    );
  }

  const pf = String(p?.patternFamily || p?.kind || "").toLowerCase();
  const tags = Array.isArray(p?.expectedErrorTags)
    ? p.expectedErrorTags.map((t) => String(t).toLowerCase())
    : [];
  const tenseGate =
    pf.includes("tense") ||
    tags.some((t) => t.includes("tense")) ||
    Array.isArray(p?.tenseAlts);
  if (!tenseGate && !p?.allowTenseSuffixProve) return null;

  const stem = expected.replace(/(ed|ing|es|s)$/i, "");
  if (stem.length < 3) return null;
  for (const suf of ["ed", "ing", "s", "es"]) {
    const alt = stem + suf;
    if (user === alt && alt !== expected) {
      return hit(
        "tense_error",
        { user, expected, stem, suffix: suf, mode: "suffix_alt" },
        "english_exact:tense_error:suffix",
        0.85,
      );
    }
  }
  return null;
}

/**
 * Lemma confusion: user typed lemma instead of inflected form.
 * @param {object} p
 */
export function proveEnglishLemmaError(p) {
  const user = normalizeEnglishText(p?.userAnswer);
  const expected = normalizeEnglishText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;
  if (p?.expectedLemma == null) return null;
  if (normalizeEnglishText(p.expectedLemma) === user) {
    return hit(
      "grammar_error",
      { user, expected, expectedLemma: p.expectedLemma, mode: "lemma" },
      "english_exact:grammar_error:lemma",
      0.88,
    );
  }
  return null;
}

/**
 * Known misspellings list.
 * @param {object} p
 */
export function proveEnglishKnownMisspelling(p) {
  const user = normalizeEnglishText(p?.userAnswer);
  const expected = normalizeEnglishText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;
  const known = asNormList(p?.knownMisspellings);
  if (known.includes(user)) {
    return hit(
      "spelling_error",
      { user, expected, mode: "known_misspelling" },
      "english_exact:spelling_error:known",
      0.92,
    );
  }
  return null;
}

/**
 * Structural spelling tier after exact TEPs.
 * @param {object} p
 */
export function proveEnglishSpellingStructural(p) {
  const user = normalizeEnglishText(p?.userAnswer);
  const expected = normalizeEnglishText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;
  const dist = englishEditDistance(user, expected);
  const len = Math.max(user.length, expected.length);
  if (dist === 1 && len >= 2 && len <= 20) {
    return hit(
      "spelling_error",
      { user, expected, editDistance: dist, tier: "structural" },
      "english_structural:spelling_error",
      0.9,
    );
  }
  if (dist === 2 && len <= 12) {
    return hit(
      "writing_error",
      { user, expected, editDistance: dist, tier: "structural" },
      "english_structural:writing_error",
      0.82,
    );
  }
  return null;
}

/**
 * @param {object} p
 */
export function classifyEnglishAnswer(p) {
  const exact = [
    proveEnglishPhonicsMinimalPair,
    proveEnglishSameSlotForm,
    proveEnglishTenseAlt,
    proveEnglishLemmaError,
    proveEnglishKnownMisspelling,
  ];
  for (const fn of exact) {
    const r = fn(p);
    if (r) return r;
  }
  // Tense suffix as secondary exact-ish when writing/grammar typed (legacy typed behavior)
  const tenseLegacy = proveEnglishTenseAlt({ ...p, allowTenseSuffixProve: true });
  if (tenseLegacy && tenseLegacy.details?.mode === "suffix_alt") return tenseLegacy;
  return proveEnglishSpellingStructural(p);
}
