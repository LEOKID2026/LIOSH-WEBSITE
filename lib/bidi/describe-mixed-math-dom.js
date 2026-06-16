/**
 * DOM contract description for mixed Hebrew + math (verification without browser).
 * Every math run → single LTR isolate; prose → RTL isolate.
 */

import { splitMixedHebrewMathRuns } from "./mixed-hebrew-math-runs.js";
import { stripStrayMarkdown } from "../learning-book/parse-inline-markdown.js";

const MATH_STYLE = "direction:ltr;unicode-bidi:isolate;display:inline-block";
const PROSE_STYLE = "direction:rtl;unicode-bidi:isolate;display:inline-block";

/**
 * @param {string|null|undefined} sourceText
 * @returns {{ sourceText: string, nodes: { role: "math"|"prose", dir: "ltr"|"rtl", unicodeBidi: "isolate", textContent: string, html: string }[] }}
 */
export function describeMixedMathDomContract(sourceText) {
  const source = String(sourceText ?? "");
  const runs = splitMixedHebrewMathRuns(source);
  const nodes = runs
    .filter((r) => r.value && r.value !== "\n")
    .map((run) => {
      const textContent = stripStrayMarkdown(run.value).trim();
      if (!textContent) return null;
      const isMath = run.type === "math";
      const dir = isMath ? "ltr" : "rtl";
      const html = `<span dir="${dir}" style="${isMath ? MATH_STYLE : PROSE_STYLE}">${textContent}</span>`;
      return {
        role: isMath ? "math" : "prose",
        dir,
        unicodeBidi: "isolate",
        textContent,
        html,
      };
    })
    .filter(Boolean);

  return { sourceText: source, nodes };
}

/**
 * @param {string|null|undefined} sourceText
 * @returns {boolean}
 */
export function hasForbiddenTokenSplit(sourceText) {
  const runs = splitMixedHebrewMathRuns(sourceText);
  return runs.some(
    (r) =>
      r.type === "prose" &&
      /\d\s*[+−\-=×÷→←<>]\s*\d/.test(r.value) &&
      !/^[-•*\d.)]+\s*$/.test(r.value.trim())
  );
}
