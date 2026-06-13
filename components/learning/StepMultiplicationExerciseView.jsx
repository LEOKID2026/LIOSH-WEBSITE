import React from "react";
import StepExerciseShell from "./StepExerciseShell";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";
import { DigitCell } from "./StepHighlightCells";
import {
  DIGIT_COL_WIDTH,
  gridColumns,
  OP_COL_WIDTH,
} from "../../utils/learning-step-highlight-styles";
import {
  buildMultiplicationHighlightState,
  buildMultiplicationLayout,
  parseMultiplicationPre,
} from "../../utils/learning-step-multiplication-exercise";

function Row({ width, digits, highlights, op = null, stepKey, prefix }) {
  return (
    <div className="grid gap-x-1 mb-1" style={{ gridTemplateColumns: gridColumns(width) }}>
      <span className="w-4 text-center text-2xl font-bold">{op ?? ""}</span>
      {digits.map((digit, idx) => (
        <DigitCell key={`${stepKey}-${prefix}-${idx}`} highlighted={highlights?.[idx]}>
          {digit.trim() || /\d/.test(digit) ? digit : "\u00A0"}
        </DigitCell>
      ))}
    </div>
  );
}

export default function StepMultiplicationExerciseView({
  step,
  pre,
  stepIndex = 0,
  className = "",
}) {
  const ex = useStepExerciseUi();
  const parsed = parseMultiplicationPre(pre || step?.pre);
  if (!parsed) return null;

  const layout = buildMultiplicationLayout(parsed);
  const hl = buildMultiplicationHighlightState(step, layout);
  const stepKey = step?.id ?? `mult-${stepIndex}`;

  return (
    <StepExerciseShell step={step} stepIndex={stepIndex} className={className}>
      <div
        className={`flex flex-col items-center font-mono text-2xl leading-[1.8] max-w-full ${ex.monoText}`}
        style={{ direction: "ltr" }}
      >
        <Row
          width={layout.width}
          digits={layout.topDigits}
          highlights={hl.top}
          stepKey={stepKey}
          prefix="a"
        />
        <Row
          width={layout.width}
          digits={layout.bottomDigits}
          highlights={hl.bottom}
          op="×"
          stepKey={stepKey}
          prefix="b"
        />
        <div
          className={`h-[2px] ${ex.divider} my-2`}
          style={{
            width: `calc(${OP_COL_WIDTH} + ${layout.width} * ${DIGIT_COL_WIDTH} + ${Math.max(0, layout.width - 1)} * 0.25rem)`,
          }}
        />
        {layout.partialRows.map((row, ri) => (
          <Row
            key={`${stepKey}-p-${ri}`}
            width={layout.width}
            digits={row}
            highlights={hl.partials[ri]}
            stepKey={stepKey}
            prefix={`p${ri}`}
          />
        ))}
        {layout.inProgressDigits && (
          <Row
            width={layout.width}
            digits={layout.inProgressDigits}
            highlights={hl.inProgress}
            stepKey={stepKey}
            prefix="ip"
          />
        )}
        {layout.sumDigits && (
          <>
            <div
              className={`h-[2px] ${ex.divider} my-2`}
              style={{
                width: `calc(${OP_COL_WIDTH} + ${layout.width} * ${DIGIT_COL_WIDTH} + ${Math.max(0, layout.width - 1)} * 0.25rem)`,
              }}
            />
            <Row
              width={layout.width}
              digits={layout.sumDigits.map((d, idx) => {
                const columnFromRight = layout.width - idx - 1;
                if (columnFromRight < hl.revealDigits || hl.revealDigits === 0) {
                  return d;
                }
                return hl.revealDigits > 0 ? d : " ";
              })}
              highlights={hl.sum}
              stepKey={stepKey}
              prefix="sum"
            />
          </>
        )}
      </div>
    </StepExerciseShell>
  );
}
