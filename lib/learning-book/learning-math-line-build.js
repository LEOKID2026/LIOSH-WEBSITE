/**
 * Build structured learning math lines (prose RTL + math LTR runs).
 * Generators must use these helpers — not free mixed Hebrew+math strings.
 */

import {
  proseRun,
  mathRun,
  buildComparisonConclusionRuns,
  flattenTemplateRuns,
} from "./learning-math-line-templates.js";

export { proseRun, mathRun, buildComparisonConclusionRuns, flattenTemplateRuns };

/** @typedef {{ __learningRuns: import("./learning-math-line-templates.js").TemplateRun[] }} LearningMixedLine */

/**
 * Embed a math expression inside a mixed line (use inside `mix` templates).
 * @param {string|number} expr
 */
export function M(expr) {
  return { __mathEmbed: String(expr) };
}

/** @deprecated use M() */
export const mathEmbed = M;

/**
 * Tagged template: builds explicit prose/math runs from a step line.
 * @param {TemplateStringsArray} strings
 * @param {...(string|number|{ __mathEmbed: string }|null|undefined)} values
 * @returns {LearningMixedLine}
 */
export function mix(strings, ...values) {
  /** @type {import("./learning-math-line-templates.js").TemplateRun[]} */
  const runs = [];
  let proseBuf = "";

  const flushProse = () => {
    if (!proseBuf) return;
    runs.push(proseRun(proseBuf));
    proseBuf = "";
  };

  for (let i = 0; i < strings.length; i += 1) {
    proseBuf += strings[i];
    const v = values[i];
    if (v != null && typeof v === "object" && "__mathEmbed" in v) {
      flushProse();
      runs.push(mathRun(v.__mathEmbed));
    } else if (v != null && v !== false) {
      proseBuf += String(v);
    }
  }
  flushProse();

  return { __learningRuns: runs };
}

/**
 * @param {LearningMixedLine|import("./learning-math-line-templates.js").TemplateRun[]|null|undefined} line
 * @returns {import("./learning-math-line-templates.js").TemplateRun[]}
 */
export function unwrapLearningRuns(line) {
  if (!line) return [];
  if (Array.isArray(line)) return line;
  if (line.__learningRuns) return line.__learningRuns;
  return [];
}

/**
 * @param {string} label without trailing colon
 * @param {string} math
 */
export function buildLabeledMathRuns(label, math) {
  const lbl = String(label || "").trim().replace(/:$/, "");
  return [proseRun(`${lbl}:`), mathRun(math)];
}

/**
 * @param {number|string} step
 * @param {string} proseLabel
 * @param {string} [mathExpr]
 * @param {string} [trailingProse]
 */
export function buildStepRuns(step, proseLabel, mathExpr, trailingProse) {
  /** @type {import("./learning-math-line-templates.js").TemplateRun[]} */
  const runs = [proseRun(`${step}. ${proseLabel}`)];
  if (mathExpr) runs.push(mathRun(mathExpr));
  if (trailingProse) runs.push(proseRun(trailingProse));
  return runs;
}

/**
 * @param {string} mathWithArrow e.g. "8 + 7 = 15 → 5"
 * @param {string} carryProse e.g. "נשיאה 1"
 */
export function buildCarryRuns(mathWithArrow, carryProse) {
  return [mathRun(mathWithArrow), proseRun(carryProse.startsWith(",") ? carryProse : `, ${carryProse}`)];
}

/**
 * Attach structured runs to animation / step objects (keeps legacy text for audits).
 * @param {Record<string, unknown>} step
 * @param {LearningMixedLine|import("./learning-math-line-templates.js").TemplateRun[]} line
 */
export function withLearningRuns(step, line) {
  const runs = unwrapLearningRuns(line);
  return {
    ...step,
    runs,
    text: flattenTemplateRuns(runs),
  };
}

/**
 * Spread into animation/solution step objects instead of `text: "mixed string"`.
 * @param {LearningMixedLine|import("./learning-math-line-templates.js").TemplateRun[]} line
 */
export function learningStepFields(line) {
  const runs = unwrapLearningRuns(line);
  return {
    runs,
    text: flattenTemplateRuns(runs),
  };
}

/**
 * Push animation step with structured runs (replaces steps.push({ text: `...` })).
 * @param {object[]} steps
 * @param {Record<string, unknown>} props
 * @param {LearningMixedLine|import("./learning-math-line-templates.js").TemplateRun[]} line
 */
export function pushLearningAnimStep(steps, props, line) {
  steps.push(withLearningRuns(props, line));
}

/**
 * Animation step with explicit prose + math + optional trailing prose (no free mixed strings).
 * @param {Record<string, unknown>} props
 * @param {string} proseBefore RTL prose before math
 * @param {string|number} mathExpr LTR math expression
 * @param {string} [proseAfter] RTL prose after math
 */
export function learningAnimStep(props, proseBefore, mathExpr, proseAfter = "") {
  /** @type {import("./learning-math-line-templates.js").TemplateRun[]} */
  const runs = [];
  if (proseBefore) runs.push(proseRun(String(proseBefore)));
  if (mathExpr != null && mathExpr !== "") runs.push(mathRun(String(mathExpr)));
  if (proseAfter) runs.push(proseRun(String(proseAfter)));
  return withLearningRuns(props, { __learningRuns: runs });
}

/**
 * Animation step with prose only.
 * @param {Record<string, unknown>} props
 * @param {string} prose
 */
export function learningAnimProse(props, prose) {
  return withLearningRuns(props, mix`${prose}`);
}

/**
 * Pure LTR math display (vertical exercise, pre blocks) — ASCII/math only, not mixed Hebrew prose.
 * @param {string|number} expr
 */
export function pureMathLtrDisplay(expr) {
  return `\u2066${expr}\u2069`;
}

/**
 * @param {string[]|string} lines
 */
export function pureMathLtrBlock(lines) {
  const raw = Array.isArray(lines) ? lines.join("\n") : String(lines);
  return pureMathLtrDisplay(raw);
}

/**
 * Strip legacy LRI/PDI and parse into runs (migration shim — avoid in new code).
 * @param {string} raw
 */
export function parseLegacyLtrMarkedString(raw) {
  const source = String(raw || "");
  if (!source) return [];

  /** @type {import("./learning-math-line-templates.js").TemplateRun[]} */
  const runs = [];
  const re = /\u2066([^\u2069]*)\u2069/g;
  let last = 0;
  let m;
  while ((m = re.exec(source))) {
    if (m.index > last) runs.push(proseRun(source.slice(last, m.index)));
    runs.push(mathRun(m[1]));
    last = m.index + m[0].length;
  }
  if (last < source.length) runs.push(proseRun(source.slice(last)));
  return runs.length ? runs : [proseRun(source)];
}
