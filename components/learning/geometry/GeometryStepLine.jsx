import React from "react";
import { learningMathIsolateStyle } from "../../../utils/learning-mixed-hebrew-math-render";
import { normalizeHebrewWordNumberSpacing } from "../../../utils/learning-hebrew-number-spacing";

function stripBidiMarks(text) {
  return normalizeHebrewWordNumberSpacing(String(text).replace(/\u2066|\u2069/g, ""));
}

/**
 * Geometry step lines: keep Hebrew prose flowing inline.
 * Break to a new line only for a full formula after נציב/נחשב, or before ", ואז".
 */
export default function GeometryStepLine({ text, stepKey }) {
  const stripped = stripBidiMarks(text).trim();
  if (!stripped) return null;

  const baseClass = "geometry-step-line mb-2 last:mb-0 leading-7";
  const baseStyle = {
    direction: "rtl",
    unicodeBidi: "plaintext",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const andThenIdx = stripped.indexOf(", ואז ");
  if (andThenIdx > 0) {
    const head = stripped.slice(0, andThenIdx + 1);
    const tail = stripped.slice(andThenIdx + 2);
    return (
      <p key={stepKey} className={baseClass} style={baseStyle}>
        {head}
        <br />
        {tail}
      </p>
    );
  }

  const formulaMatch = stripped.match(/^(.+?(?:נציב|נחשב):\s*)(.+)$/u);
  if (formulaMatch) {
    const [, lead, formula] = formulaMatch;
    const looksLikeFormula =
      /[=×÷+\-−]/.test(formula) &&
      !/זווית\s*\d/.test(formula) &&
      formula.length >= 8;
    if (looksLikeFormula) {
      return (
        <p key={stepKey} className={baseClass} style={baseStyle}>
          {lead}
          <br />
          <span style={learningMathIsolateStyle}>{formula}</span>
        </p>
      );
    }
  }

  return (
    <p key={stepKey} className={baseClass} style={baseStyle}>
      {stripped}
    </p>
  );
}
