import React from "react";
import StepExerciseShell from "./StepExerciseShell";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";
import { ExpressionSpan } from "./StepHighlightCells";
import {
  highlightFractionLine,
  parseFractionPreLines,
} from "../../utils/learning-step-fraction-exercise";
import {
  hasStackedFractionToken,
} from "../../utils/math-fraction-expression-parse";
import { renderStackedFractionFragment } from "./MathFractionExpression";

export default function StepFractionExerciseView({ step, pre, stepIndex = 0, className = "" }) {
  const ex = useStepExerciseUi();
  const lines = parseFractionPreLines(pre || step?.pre);
  const highlights = Array.isArray(step?.highlights) ? step.highlights : [];
  const stepKey = step?.id ?? `frac-${stepIndex}`;

  if (!lines.length) return null;

  const renderSegText = (text) =>
    hasStackedFractionToken(text) ? renderStackedFractionFragment(text) : text;

  return (
    <StepExerciseShell step={step} stepIndex={stepIndex} className={className}>
      <div
        className={`flex flex-col items-center font-mono text-xl leading-relaxed gap-1 w-full max-w-full ${ex.monoText}`}
        style={{ direction: "ltr", unicodeBidi: "isolate" }}
      >
        {lines.map((line, li) => {
          const segments = highlightFractionLine(line, highlights);
          return (
            <div key={`${stepKey}-line-${li}`} className="whitespace-pre">
              {segments.map((seg, si) =>
                seg.highlighted ? (
                  <ExpressionSpan key={`${stepKey}-${li}-${si}`} highlighted>
                    {renderSegText(seg.text)}
                  </ExpressionSpan>
                ) : (
                  <span key={`${stepKey}-${li}-${si}`}>{renderSegText(seg.text)}</span>
                )
              )}
            </div>
          );
        })}
      </div>
    </StepExerciseShell>
  );
}
