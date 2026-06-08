/**
 * Split mixed Hebrew + math strings for step-by-step explanation lines.
 * Keeps expressions like "6 + 2 = 8" as one LTR run before Hebrew prose continues.
 */

/** @typedef {{ type: "math" | "prose", value: string }} LearningMixedRun */

/** @typedef {{ instruction: string, equation: string, explanation: string }} StepExplanationBlocks */

const STEP_EQUATION_BODY =
  String.raw`\d[\d\s]*(?:[+\-−×÷]\s*\d[\d\s]*)*\s*=\s*\d[\d\s]*`;

export const LEARNING_MATH_RUN_RE =
  /(\d[\d\s.,]*\s*(?:%|(?:\/\s*\d)|[+\-−×÷=<>])\s*[\d\s.,]+(?:\s*(?:%|(?:\/\s*\d)|[+\-−×÷=<>])\s*[\d\s.,]+)*)/g;

/**
 * @param {LearningMixedRun[]} runs
 * @returns {LearningMixedRun[]}
 */
function moveTrailingPunctuationFromMathToProse(runs) {
  /** @type {LearningMixedRun[]} */
  const fixed = [];
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    if (run.type !== "math") {
      fixed.push(run);
      continue;
    }

    const match = run.value.match(/^([\s\S]*?\d)(\s*[.,;:!?]+)(\s*)$/);
    if (!match) {
      fixed.push(run);
      continue;
    }

    fixed.push({ type: "math", value: match[1] });
    const tail = `${match[2]}${match[3] || ""}`;
    const nextRun = runs[i + 1];
    if (nextRun?.type === "prose") {
      fixed.push({ type: "prose", value: tail + nextRun.value });
      i += 1;
    } else {
      fixed.push({ type: "prose", value: tail });
    }
  }
  return fixed;
}

/**
 * @param {string|null|undefined} text
 * @returns {LearningMixedRun[]}
 */
export function splitLearningMixedHebrewMathRuns(text) {
  if (text == null || typeof text !== "string" || text === "") return [];

  // Strip LRI/PDI isolates before split — orphan markers break RTL/LTR runs and mirror < >.
  const normalized = String(text).replace(/\u2066|\u2067|\u2068|\u2069/g, "");

  const parts = normalized.split(LEARNING_MATH_RUN_RE);
  if (parts.length === 1) {
    return [{ type: "prose", value: normalized }];
  }

  /** @type {LearningMixedRun[]} */
  const runs = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;
    runs.push({ type: i % 2 === 1 ? "math" : "prose", value: part });
  }
  return moveTrailingPunctuationFromMathToProse(runs);
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
