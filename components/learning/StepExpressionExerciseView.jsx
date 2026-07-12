import React from "react";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";
import { learningMathBlockStyle } from "../../utils/learning-mixed-hebrew-math-render";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse";
import { renderStackedFractionFragment } from "./MathFractionExpression";

export default function StepExpressionExerciseView({ step, className = "" }) {
  const ex = useStepExerciseUi();
  const pre = String(step?.pre || "").replace(/\u2066|\u2069/g, "");
  if (!pre.trim()) return null;

  const lines = pre.split("\n").filter((line) => line.length > 0);

  return (
    <div className={`w-full max-w-full ${className}`.trim()}>
      {lines.map((line, li) => (
        <p
          key={`expr-line-${li}`}
          dir="ltr"
          className={`text-center font-mono text-lg leading-relaxed my-1 ${ex.monoText}`}
          style={{ ...learningMathBlockStyle, fontFamily: "ui-monospace, monospace" }}
        >
          {hasStackedFractionToken(line) ? renderStackedFractionFragment(line) : line}
        </p>
      ))}
    </div>
  );
}
