import React from "react";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";
import { ExpressionSpan } from "./StepHighlightCells";
import { buildWordProblemHighlightRanges } from "../../utils/learning-step-word-problem-exercise";
import {
  learningMathBlockStyle,
  learningProseBlockStyle,
  splitLearningMixedHebrewMathRuns,
} from "../../utils/learning-mixed-hebrew-math-render";

function renderWordProblemText(text, ranges) {
  const runs = splitLearningMixedHebrewMathRuns(text);
  if (!ranges.length) {
    return runs.map((run, idx) =>
      run.type === "math" ? (
        <p key={`math-${idx}`} dir="ltr" className="my-1" style={learningMathBlockStyle}>
          {run.value}
        </p>
      ) : (
        <p key={`prose-${idx}`} dir="rtl" className="my-0" style={learningProseBlockStyle}>
          {run.value}
        </p>
      )
    );
  }

  return (
    <p dir="rtl" className="my-0" style={learningProseBlockStyle}>
      {(() => {
        const parts = [];
        let cursor = 0;
        ranges.forEach((range, idx) => {
          if (range.start > cursor) {
            parts.push(<span key={`pre-${idx}`}>{text.slice(cursor, range.start)}</span>);
          }
          parts.push(
            <ExpressionSpan key={`hl-${idx}`} highlighted>
              {text.slice(range.start, range.end)}
            </ExpressionSpan>
          );
          cursor = range.end;
        });
        if (cursor < text.length) {
          parts.push(<span key="tail">{text.slice(cursor)}</span>);
        }
        return parts;
      })()}
    </p>
  );
}

export default function StepWordProblemExerciseView({ step, className = "" }) {
  const ex = useStepExerciseUi();
  const text = String(step?.text || "").replace(/\u2066|\u2069/g, "");
  if (!text) return null;

  const ranges = buildWordProblemHighlightRanges(step, step?.params);
  const runs = splitLearningMixedHebrewMathRuns(text);
  const hasMathRun = runs.some((r) => r.type === "math");

  if (hasMathRun && ranges.length === 0) {
    return (
      <div className={`mb-2 w-full max-w-full ${ex.monoText} ${className}`.trim()}>
        {runs.map((run, idx) =>
          run.type === "math" ? (
            <p key={`math-${idx}`} dir="ltr" className="my-1" style={learningMathBlockStyle}>
              {run.value}
            </p>
          ) : (
            <p key={`prose-${idx}`} dir="rtl" className="my-0" style={learningProseBlockStyle}>
              {run.value}
            </p>
          )
        )}
      </div>
    );
  }

  return (
    <div className={`mb-2 w-full max-w-full ${ex.monoText} ${className}`.trim()}>
      {renderWordProblemText(text, ranges)}
    </div>
  );
}
