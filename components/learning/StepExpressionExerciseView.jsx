import React from "react";
import { learningMathBlockStyle } from "../../utils/learning-mixed-hebrew-math-render";

export default function StepExpressionExerciseView({ step, className = "" }) {
  const pre = String(step?.pre || "").replace(/\u2066|\u2069/g, "");
  if (!pre.trim()) return null;

  const lines = pre.split("\n").filter((line) => line.length > 0);

  return (
    <div className={`w-full max-w-full ${className}`.trim()}>
      {lines.map((line, li) => (
        <p
          key={`expr-line-${li}`}
          dir="ltr"
          className="text-center font-mono text-lg leading-relaxed text-emerald-100 my-1"
          style={{ ...learningMathBlockStyle, fontFamily: "ui-monospace, monospace" }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}
