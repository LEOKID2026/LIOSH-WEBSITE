/**
 * Split mixed Hebrew + math strings for step-by-step explanation lines.
 * Delegates to shared BiDi policy in lib/bidi/mixed-hebrew-math-runs.js.
 */

import {
  splitMixedHebrewMathRuns,
  detectMixedMathRenderIssues,
} from "../lib/bidi/mixed-hebrew-math-runs.js";

/** @typedef {{ type: "math" | "prose", value: string }} LearningMixedRun */

/** @typedef {{ instruction: string, equation: string, explanation: string }} StepExplanationBlocks */

const STEP_EQUATION_BODY =
  String.raw`\d[\d\s]*(?:[+\-−×÷]\s*\d[\d\s]*)*\s*=\s*\d[\d\s]*`;

export { detectMixedMathRenderIssues };

export const LEARNING_MATH_RUN_RE =
  /(\d[\d\s.,]*\s*(?:%|(?:\/\s*\d)|[+\-−×÷=<>])\s*[\d\s.,]+(?:\s*(?:%|(?:\/\s*\d)|[+\-−×÷=<>])\s*[\d\s.,]+)*)/g;

/**
 * @param {string|null|undefined} text
 * @returns {LearningMixedRun[]}
 */
export function splitLearningMixedHebrewMathRuns(text) {
  return splitMixedHebrewMathRuns(text);
}

export const learningMathIsolateStyle = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
  display: "inline-block",
  verticalAlign: "baseline",
});

export const learningProseIsolateStyle = Object.freeze({
  direction: "rtl",
  unicodeBidi: "isolate",
  display: "inline-block",
  verticalAlign: "baseline",
  whiteSpace: "pre-wrap",
});

export const learningProseBlockStyle = Object.freeze({
  direction: "rtl",
  unicodeBidi: "isolate",
  display: "block",
  whiteSpace: "pre-wrap",
});

export const learningMathBlockStyle = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
  display: "block",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "100%",
});

/**
 * Split a step explanation into instruction / equation / explanation lines.
 *
 * @param {string|null|undefined} text
 * @returns {StepExplanationBlocks|null}
 */
export function parseStepExplanationThreeLines(text) {
  const input = String(text || "").trim();
  if (!input) return null;

  let match = input.match(
    new RegExp(`^(.+?:\\s*)(${STEP_EQUATION_BODY})\\s*\\.\\s*(.+)$`, "u")
  );
  if (match) {
    return {
      instruction: match[1].trimEnd(),
      equation: match[2].trim(),
      explanation: match[3].trim(),
    };
  }

  match = input.match(new RegExp(`^(.+?:\\s*)(${STEP_EQUATION_BODY})\\s*\\.\\s*$`, "u"));
  if (match) {
    return {
      instruction: match[1].trimEnd(),
      equation: match[2].trim(),
      explanation: "",
    };
  }

  match = input.match(
    new RegExp(`^(.+?:\\s*)(${STEP_EQUATION_BODY})\\s+וכותבים\\s+(.+)$`, "u")
  );
  if (match) {
    return {
      instruction: match[1].trimEnd(),
      equation: match[2].trim(),
      explanation: `כותבים ${match[3].trim()}`,
    };
  }

  return null;
}
