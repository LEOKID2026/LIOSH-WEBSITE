/**
 * MCQ obvious-answer risk heuristics (audit-only).
 * Categories A–G per docs/qa/MCQ_OBVIOUS_ANSWER_RISK_AUDIT.md
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const { extractMcqFields, normalizeOptionForCompare } = await import(
  pathToFileURL(join(ROOT, "utils/question-quality.js")).href
);

const NIQQUD_RE = /[\u0591-\u05C7]/g;
const UNIT_RE =
  /\b(cm|mm|km|m²|m³|kg|g|ml|°|ש\"ח|₪|%\s*$|\d+\s*(cm|mm|km|m|kg|g|ml))\b/i;
const LITER_UNIT_RE = /\d+\s*L\b/;
const PAREN_RE = /[()]/;
const SENTENCE_END_RE = /[.!?]/;
const ARTICLE_RE = /^(a|an|the)\s+/i;
const HEB_ARTICLE_RE = /^(ה|ב|ל|מ|ש)/;

/** @param {string} text */
function wordCount(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** @param {string} text */
function hasNiqqud(text) {
  return NIQQUD_RE.test(String(text ?? ""));
}

/** @param {string} text */
function isNumericLike(text) {
  const s = String(text ?? "").trim();
  return /^-?\d+([.,]\d+)?%?$/.test(s) || /^-?\d+\/\d+$/.test(s);
}

/** @param {number} n */
function parseNumeric(text) {
  const s = String(text ?? "")
    .replace(/[^\d.,\-/]/g, "")
    .replace(",", ".");
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/**
 * @param {unknown} q
 * @param {{ subject?: string, stem?: string }} [ctx]
 * @returns {Array<{ category: string, severity: string, explanation: string, suggestedFix: string }>}
 */
export function detectMcqObviousAnswerRisks(q, ctx = {}) {
  const { answers, correctIndex, correctAnswer } = extractMcqFields(q);
  if (answers.length < 2) return [];

  const stem = String(
    ctx.stem ?? q?.question ?? q?.exerciseText ?? q?.stem ?? q?.template ?? ""
  ).trim();
  const correct = String(correctAnswer ?? answers[correctIndex] ?? "").trim();
  const distractors = answers
    .map((a, i) => ({ text: String(a ?? "").trim(), index: i }))
    .filter((d) => d.index !== correctIndex);

  /** @type {Array<{ category: string, severity: string, explanation: string, suggestedFix: string }>} */
  const risks = [];

  const correctLen = correct.length;
  const distractorLens = distractors.map((d) => d.text.length).filter((n) => n > 0);
  const avgDist =
    distractorLens.length > 0
      ? distractorLens.reduce((a, b) => a + b, 0) / distractorLens.length
      : 0;

  if (correctLen > 0 && avgDist > 0) {
    if (correctLen >= avgDist * 2.2 && correctLen >= 12) {
      risks.push({
        category: "A_length_outlier",
        severity: correctLen >= avgDist * 3 ? "FAIL" : "WARN",
        explanation: `Correct option length ${correctLen} vs avg distractor ${avgDist.toFixed(1)}`,
        suggestedFix: "Balance option lengths; shorten correct or lengthen distractors",
      });
    }
    if (avgDist > 0 && correctLen <= avgDist * 0.45 && correctLen >= 1 && avgDist >= 8) {
      risks.push({
        category: "A_length_outlier",
        severity: "WARN",
        explanation: `Correct option much shorter than distractors (${correctLen} vs avg ${avgDist.toFixed(1)})`,
        suggestedFix: "Make distractors similarly concise",
      });
    }
  }

  const correctWords = wordCount(correct);
  const wrongWords = distractors.map((d) => wordCount(d.text));
  if (
    correctWords >= 5 &&
    wrongWords.length >= 2 &&
    wrongWords.every((w) => w <= 2) &&
    correctWords >= Math.max(...wrongWords) + 3
  ) {
    risks.push({
      category: "A_length_outlier",
      severity: "FAIL",
      explanation: "Correct option is a long phrase/sentence; distractors are one–two words",
      suggestedFix: "Use parallel phrase length across all options",
    });
  }

  const fmt = (text) => ({
    unit: UNIT_RE.test(text) || LITER_UNIT_RE.test(text),
    paren: PAREN_RE.test(text),
    sentence: SENTENCE_END_RE.test(text),
    article: ARTICLE_RE.test(text),
    hebPrefix: HEB_ARTICLE_RE.test(text),
    niqqud: hasNiqqud(text),
    numeric: isNumericLike(text),
    caps: /^[A-Z]/.test(text) && text.length > 1,
  });
  const cFmt = fmt(correct);
  for (const [key, label] of [
    ["unit", "unit/measure"],
    ["paren", "parentheses"],
    ["sentence", "sentence punctuation"],
    ["article", "English article"],
    ["hebPrefix", "Hebrew prefix"],
    ["niqqud", "Hebrew niqqud"],
    ["numeric", "numeric format"],
    ["caps", "capital letter"],
  ]) {
    const onlyCorrect = cFmt[key] && distractors.every((d) => !fmt(d.text)[key]);
    if (onlyCorrect) {
      risks.push({
        category: "B_format_outlier",
        severity: key === "unit" || key === "numeric" ? "FAIL" : "WARN",
        explanation: `Only correct option has ${label}`,
        suggestedFix: `Apply consistent ${label} treatment to distractors or remove from correct-only cue`,
      });
    }
  }

  const stemLower = stem.toLowerCase();
  if (/\b(a|an)\s+_+\s*$/i.test(stem) || /\b(a|an)\s+\.\.\./i.test(stem)) {
    risks.push({
      category: "C_grammar_agreement",
      severity: "WARN",
      explanation: "Stem uses a/an blank pattern — check distractor agreement",
      suggestedFix: "Ensure all distractors are grammatically plausible with stem",
    });
  }
  if (ARTICLE_RE.test(stem) && distractors.filter((d) => ARTICLE_RE.test(d.text)).length === 1) {
    const withArticle = distractors.filter((d) => ARTICLE_RE.test(d.text));
    if (withArticle.length === 0 && ARTICLE_RE.test(correct)) {
      risks.push({
        category: "C_grammar_agreement",
        severity: "WARN",
        explanation: "Only correct option matches stem article pattern",
        suggestedFix: "Add articles to distractors or remove from correct",
      });
    }
  }

  const subject = String(ctx.subject || q?.subject || "").toLowerCase();
  if (subject === "hebrew" || /[\u0590-\u05FF]/.test(stem)) {
    const generic = new Set([
      normalizeOptionForCompare("ילד משחק"),
      normalizeOptionForCompare("ילד כותב"),
      normalizeOptionForCompare("ילד אוכל"),
    ]);
    const absurd = distractors.filter((d) => generic.has(normalizeOptionForCompare(d.text)));
    if (absurd.length >= 2) {
      risks.push({
        category: "D_semantic_absurd",
        severity: "FAIL",
        explanation: "Generic unrelated Hebrew distractors (ילד משחק/כותב/אוכל)",
        suggestedFix: "Replace with plausible wrong answers from passage/topic",
      });
    }
  }

  if (
    ["math", "geometry", "science"].includes(subject) ||
    distractors.every((d) => isNumericLike(d.text) || isNumericLike(correct))
  ) {
    const cNum = parseNumeric(correct);
    const dNums = distractors.map((d) => parseNumeric(d.text)).filter((n) => n != null);
    if (cNum != null && dNums.length >= 2) {
      const ratios = dNums.map((n) => (n === 0 ? Infinity : Math.abs(cNum / n)));
      const allFar = ratios.every((r) => r > 50 || r < 0.02);
      if (allFar && Math.abs(cNum) > 0) {
        risks.push({
          category: "E_numeric_plausibility",
          severity: "WARN",
          explanation: "Distractors numerically far from correct answer (not plausible mistakes)",
          suggestedFix: "Use common-error or nearby values as distractors",
        });
      }
      const digitLens = [correct, ...distractors.map((d) => d.text)].map((t) =>
        String(t).replace(/\D/g, "").length
      );
      const correctDigits = digitLens[0];
      if (
        correctDigits > 0 &&
        digitLens.slice(1).every((d) => d > 0 && d !== correctDigits) &&
        distractors.length >= 3
      ) {
        risks.push({
          category: "E_numeric_plausibility",
          severity: "WARN",
          explanation: "Only correct answer has distinct digit count",
          suggestedFix: "Match digit-length patterns across options",
        });
      }
    }
  }

  const stemTokens = stem
    .toLowerCase()
    .split(/[\s,.;:!?()]+/)
    .filter((t) => t.length >= 4);

  const stemListsBinaryOptions =
    answers.length === 2 &&
    (() => {
      const m = String(stem).match(/\(\s*1\s*=\s*([^,]+)\s*,\s*2\s*=\s*([^)]+)\s*\)/u);
      if (!m) return false;
      const a = m[1].trim().toLowerCase();
      const b = m[2].trim().toLowerCase();
      const opts = answers.map((x) => String(x).trim().toLowerCase()).sort();
      return (
        (opts[0] === a && opts[1] === b) ||
        (opts[0] === b && opts[1] === a)
      );
    })();

  const stemListsEnumeratedOptions = (() => {
    const parts = [...String(stem).matchAll(/\d+\s*=\s*([^,)]+)/gu)]
      .map((m) => m[1].trim().toLowerCase())
      .filter(Boolean);
    if (parts.length < 2 || parts.length !== answers.length) return false;
    const opts = answers.map((x) => String(x).trim().toLowerCase()).sort();
    const exp = [...parts].sort();
    return opts.length === exp.length && opts.every((o, i) => o === exp[i]);
  })();

  for (const tok of stemTokens) {
    const inCorrect = correct.toLowerCase().includes(tok);
    const inAnyDist = distractors.some((d) => d.text.toLowerCase().includes(tok));
    if (inCorrect && !inAnyDist && tok.length >= 5) {
      if (/^(ראשוני|פריק|זוגי|אי)$/.test(tok) && /או/.test(stem)) continue;
      if (stemListsBinaryOptions || stemListsEnumeratedOptions) continue;
      if (
        answers.length === 2 &&
        distractors.some((d) => String(d.text).trim().toLowerCase() === tok)
      ) {
        continue;
      }
      risks.push({
        category: "F_stem_option_clue",
        severity: "FAIL",
        explanation: `Stem keyword "${tok}" appears only in correct option`,
        suggestedFix: "Remove unique stem keyword from correct or add to plausible distractors",
      });
      break;
    }
  }

  if (subject === "english" || /translate|תרג|מה פירוש/i.test(stem)) {
    const hebCount = [correct, ...distractors.map((d) => d.text)].filter((t) =>
      /[\u0590-\u05FF]/.test(t)
    ).length;
    const engCount = [correct, ...distractors.map((d) => d.text)].filter((t) =>
      /[a-zA-Z]/.test(t)
    ).length;
    if (hebCount === 1 || engCount === 1) {
      risks.push({
        category: "F_stem_option_clue",
        severity: "WARN",
        explanation: "Only one option uses expected language/script for translation item",
        suggestedFix: "Make all options same language/part-of-speech",
      });
    }
  }

  return risks;
}

/**
 * @param {number} correctIndex
 * @param {number} poolSize
 * @param {Record<string, number>} indexHistogram
 */
export function assessCorrectIndexPattern(correctIndex, poolSize, indexHistogram, sourceFile = "") {
  if (poolSize < 8 || !indexHistogram) return null;
  if (String(sourceFile || "").includes("data/") && !String(sourceFile || "").includes("generator")) {
    return null;
  }
  const total = Object.values(indexHistogram).reduce((a, b) => a + b, 0);
  if (total < 8) return null;
  for (const [idx, count] of Object.entries(indexHistogram)) {
    const pct = count / total;
    if (pct >= 0.55 && Number(idx) === correctIndex) {
      return {
        category: "G_option_pattern_clue",
        severity: "WARN",
        explanation: `${Math.round(pct * 100)}% of pool correct answers at index ${idx}`,
        suggestedFix: "Shuffle correct index when assembling MCQ",
      };
    }
  }
  return null;
}
