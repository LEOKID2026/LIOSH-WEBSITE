import React from "react";
import {
  learningMathIsolateStyle,
  learningProseIsolateStyle,
  splitLearningMixedHebrewMathRuns,
} from "../../../utils/learning-mixed-hebrew-math-render";
import { learningMixedHebrewMathStyle } from "../../../utils/learning-mixed-hebrew-math";
import { normalizeHebrewWordNumberSpacing } from "../../../utils/learning-hebrew-number-spacing";

function stripBidiMarks(text) {
  return normalizeHebrewWordNumberSpacing(String(text).replace(/\u2066|\u2069/g, ""));
}

function renderMixedRuns(text) {
  const runs = splitLearningMixedHebrewMathRuns(text);
  return runs.map((run, idx) => {
    if (run.value === "\n") {
      return <br key={`nl-${idx}`} />;
    }
    if (run.type === "math") {
      return (
        <span key={`math-${idx}`} style={learningMathIsolateStyle} dir="ltr">
          {run.value}
        </span>
      );
    }
    return (
      <span key={`prose-${idx}`} style={learningProseIsolateStyle} dir="rtl">
        {run.value}
      </span>
    );
  });
}

/**
 * Geometry step lines: unified Hebrew + math BiDi via shared splitter.
 */
export default function GeometryStepLine({ text, stepKey }) {
  const stripped = stripBidiMarks(text).trim();
  if (!stripped) return null;

  const baseClass = "geometry-step-line mb-2 last:mb-0 leading-7";
  const baseStyle = {
    ...learningMixedHebrewMathStyle,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const andThenIdx = stripped.indexOf(", ואז ");
  if (andThenIdx > 0) {
    const head = stripped.slice(0, andThenIdx + 1);
    const tail = stripped.slice(andThenIdx + 2);
    return (
      <p key={stepKey} className={baseClass} style={baseStyle}>
        {renderMixedRuns(head)}
        <br />
        {renderMixedRuns(tail)}
      </p>
    );
  }

  return (
    <p key={stepKey} className={baseClass} style={baseStyle}>
      {renderMixedRuns(stripped)}
    </p>
  );
}
