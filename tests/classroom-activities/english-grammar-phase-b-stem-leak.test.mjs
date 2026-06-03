import test from "node:test";
import assert from "node:assert/strict";
import { GRAMMAR_POOLS_PHASE_B } from "../../data/english-questions/grammar-pools-phase-b.js";

function flatten(obj) {
  return Object.values(obj).flat();
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Phase B grammar items must not reveal the correct answer in the stem.
 * Sentence-choice items use a generic stem; word-choice items must not embed the answer.
 */
export function phaseBGrammarStemLeaks(item) {
  const stem = String(item.question || "").trim();
  const correct = String(item.correct || "").trim();
  if (!stem || !correct) return false;

  if (stem === "Choose the correct sentence:") {
    return false;
  }

  if (stem.includes(correct)) {
    return true;
  }

  if (correct.split(/\s+/).length === 1) {
    return new RegExp(`\\b${escapeRe(correct)}\\b`, "i").test(stem);
  }

  return false;
}

const grammarItems = flatten(GRAMMAR_POOLS_PHASE_B);

test("phase-b-grammar-stems-do-not-leak-correct-answer", () => {
  const leaks = grammarItems.filter(phaseBGrammarStemLeaks);
  assert.equal(
    leaks.length,
    0,
    `grammar stem leaks: ${leaks.map((q) => q.skillId || q.patternFamily).join(", ")}`
  );
});

test("phase-b-grammar-items-use-sentence-choice-format", () => {
  for (const item of grammarItems) {
    assert.equal(
      item.question,
      "Choose the correct sentence:",
      item.skillId || item.patternFamily
    );
    assert.ok(Array.isArray(item.options) && item.options.length >= 4);
    assert.ok(item.options.includes(item.correct), item.skillId || item.patternFamily);
  }
});
