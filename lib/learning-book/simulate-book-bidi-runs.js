/**
 * Faithful, non-React mirror of <MixedHebrewMathText>.
 * Returns the dir-tagged runs ({ dir: "ltr" | "rtl", value }) that the component
 * renders, so audits/scanners can detect mixed Hebrew+math breakage exactly as a
 * child would see it (LTR math islands vs RTL prose), without a browser.
 *
 * Keep this in lock-step with components/learning-book/MixedHebrewMathText.js.
 */

import { isFullEquationLine, isMathLikeText } from "./book-math-display.js";
import { splitMixedHebrewMathRuns } from "../bidi/mixed-hebrew-math-runs.js";
import { parseTemplateRuns } from "./learning-math-line-templates.js";
import {
  splitCommaSeparatedFormulaDisplay,
  splitCommaVavEquationDisplay,
  splitInlineHebrewTaskEquation,
} from "./book-bidi-render.js";
import { parseBookLineStructure, splitMixedBodyClauses } from "./book-line-structure.js";
import { parseInlineMarkdown, stripStrayMarkdown } from "./parse-inline-markdown.js";

const HEBREW_CHAR = /[\u0590-\u05FF]/;

/** @typedef {{ dir: "ltr" | "rtl", value: string, role: string }} BidiRun */

/**
 * @param {BidiRun[]} out
 * @param {"ltr"|"rtl"} dir
 * @param {string} value
 * @param {string} role
 */
function push(out, dir, value, role) {
  const v = stripStrayMarkdown(String(value || "")).trim();
  if (!v) return;
  out.push({ dir, value: v, role });
}

/** Mirror of renderUnifiedMixedRuns. */
function unified(out, text, role = "body") {
  for (const run of splitMixedHebrewMathRuns(String(text || ""))) {
    if (run.value === "\n") continue;
    if (run.type === "math") push(out, "ltr", run.value, `${role}-math`);
    else push(out, "rtl", run.value, `${role}-prose`);
  }
}

/** Mirror of renderProseSegment + renderFormattedSegment. */
function proseSegment(out, text) {
  for (const token of parseInlineMarkdown(String(text || ""))) {
    const cleaned = stripStrayMarkdown(token.value);
    if (token.type === "code") {
      push(out, "ltr", cleaned, "code");
      continue;
    }
    if (token.type === "bold") {
      const mathOnly = isMathLikeText(cleaned) && !HEBREW_CHAR.test(cleaned.replace(/\*\*/g, ""));
      if (mathOnly) {
        push(out, "ltr", token.value, "bold-math");
        continue;
      }
    }
    unified(out, token.value, token.type);
  }
}

/** Mirror of renderMixedBodyInnerSingle. */
function mixedBodyInnerSingle(out, text) {
  const input = String(text || "");
  const vav = input.trim().match(/^(ו-)(\d[\s\S]+)$/u);
  if (vav?.[2]) {
    const vavBody = stripStrayMarkdown(vav[2]);
    if (!/[\u0590-\u05FF]+\s+[\u0590-\u05FF]+/u.test(vavBody)) {
      push(out, "ltr", `${vav[1]}${vavBody}`, "vav-math");
      return;
    }
  }
  const stripped = stripStrayMarkdown(input);
  const strippedIsMathLine =
    isFullEquationLine(stripped) ||
    (isMathLikeText(stripped) && !HEBREW_CHAR.test(stripped));
  if (strippedIsMathLine || parseTemplateRuns(stripped) || parseTemplateRuns(input)) {
    unified(out, stripped, "template");
    return;
  }
  if (/[*`_]/.test(input)) {
    proseSegment(out, input);
    return;
  }
  unified(out, input);
}

/** Mirror of renderMixedBodyInner. */
function mixedBodyInner(out, text) {
  const input = String(text || "");
  const inlineTask = splitInlineHebrewTaskEquation(input);
  if (inlineTask) {
    push(out, "rtl", inlineTask.prefix, "task-prefix");
    push(out, "ltr", inlineTask.equation, "task-equation");
    return;
  }
  const vavRows = splitCommaVavEquationDisplay(input);
  if (vavRows) {
    for (const row of vavRows) mixedBodyInnerSingle(out, row);
    return;
  }
  const commaRows = splitCommaSeparatedFormulaDisplay(input);
  if (commaRows) {
    for (const row of commaRows) mixedBodyInnerSingle(out, row);
    return;
  }
  mixedBodyInnerSingle(out, input);
}

function mixedClause(out, clause) {
  const structure = parseBookLineStructure(clause);
  if (structure?.body) {
    push(out, "rtl", structure.label, "label");
    mixedBodyInner(out, structure.body);
    return;
  }
  mixedBodyInner(out, clause);
}

/**
 * Return the dir-tagged runs a child sees for a single book line.
 * @param {string} line
 * @returns {BidiRun[]}
 */
export function simulateBookLineBidiRuns(line) {
  const input = String(line || "");
  /** @type {BidiRun[]} */
  const out = [];

  const structure = parseBookLineStructure(input);
  if (structure?.label) {
    push(out, "rtl", structure.label, "label");
    if (structure.body) mixedBodyInner(out, structure.body);
    return out;
  }

  const clauses = splitMixedBodyClauses(input);
  if (clauses.length <= 1) {
    mixedBodyInner(out, input);
    return out;
  }
  for (const clause of clauses) {
    const sub = parseBookLineStructure(clause);
    if (sub?.label && sub?.body) {
      push(out, "rtl", sub.label, "label");
      mixedBodyInner(out, sub.body);
    } else {
      if (sub?.label) push(out, "rtl", sub.label, "label");
      mixedBodyInner(out, sub?.body ?? clause);
    }
  }
  return out;
}

const STRANDED_EQ = /\d\s*[+−\-=×÷<>]\s*\d/;
const LIST_ONLY = /^[-•*\d.)\s]+$/u;
const HEBREW_PHRASE = /[\u0590-\u05FF]+\s+[\u0590-\u05FF]+/u;

/**
 * Detect real mixed Hebrew+math render breakage on one line.
 *  - equation-in-prose: an equation stranded inside an RTL run (digits glue / reverse)
 *  - hebrew-phrase-in-math: 2+ consecutive Hebrew words inside an LTR island (reverses)
 * @param {string} line
 * @returns {{ kind: string, run: string }|null}
 */
export function detectBookLineBidiBreakage(line) {
  for (const run of simulateBookLineBidiRuns(line)) {
    if (
      run.dir === "rtl" &&
      STRANDED_EQ.test(run.value) &&
      !LIST_ONLY.test(run.value.trim())
    ) {
      return { kind: "equation-in-prose", run: run.value };
    }
    if (run.dir === "ltr" && HEBREW_PHRASE.test(run.value)) {
      return { kind: "hebrew-phrase-in-math", run: run.value };
    }
  }
  return null;
}
