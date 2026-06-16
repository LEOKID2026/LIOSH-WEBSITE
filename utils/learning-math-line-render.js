import React from "react";
import {
  learningMathIsolateStyle,
  learningProseIsolateStyle,
} from "./learning-mixed-hebrew-math-render.js";
import { learningMixedHebrewMathStyle } from "./learning-mixed-hebrew-math.js";
import {
  unwrapLearningRuns,
  flattenTemplateRuns,
  parseLegacyLtrMarkedString,
} from "../lib/learning-book/learning-math-line-build.js";
import { parseTemplateRuns } from "../lib/learning-book/learning-math-line-templates.js";

/**
 * @param {import("../lib/learning-book/learning-math-line-templates.js").TemplateRun[]} runs
 * @param {string} [className]
 */
export function renderLearningMathRuns(runs, className = "") {
  if (!runs?.length) return null;

  return React.createElement(
    "div",
    { className, style: learningMixedHebrewMathStyle },
    runs.map((run, idx) => {
      if (run.value === "\n") {
        return React.createElement("br", { key: `nl-${idx}` });
      }
      if (run.type === "math") {
        return React.createElement(
          "span",
          { key: `math-${idx}`, style: learningMathIsolateStyle, dir: "ltr" },
          run.value
        );
      }
      return React.createElement(
        "span",
        { key: `prose-${idx}`, style: learningProseIsolateStyle, dir: "rtl" },
        run.value
      );
    })
  );
}

/**
 * Accept structured runs, mix line object, or legacy string (shim).
 * @param {unknown} input
 * @param {string} [className]
 */
export function renderLearningMathLine(input, className = "") {
  if (input == null) return null;

  const unwrapped = unwrapLearningRuns(
    /** @type {any} */ (input)?.__learningRuns ? input : input
  );
  if (unwrapped.length) {
    return renderLearningMathRuns(unwrapped, className);
  }

  const text = String(input);
  const parsed = parseTemplateRuns(text);
  if (parsed?.length) {
    return renderLearningMathRuns(parsed, className);
  }

  if (/\u2066/.test(text)) {
    return renderLearningMathRuns(parseLegacyLtrMarkedString(text), className);
  }

  return renderLearningMathRuns([{ type: "prose", value: text }], className);
}

/**
 * @param {unknown} line
 * @param {string|number} key
 */
export function learningStepDiv(line, key) {
  const flat = flattenTemplateRuns(unwrapLearningRuns(line));
  return React.createElement(
    "div",
    { key, className: "mb-1", "data-learning-flat": flat },
    renderLearningMathLine(line)
  );
}
