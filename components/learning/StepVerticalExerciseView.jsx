import {
  buildStepCellHighlightState,
  buildVerticalExerciseDigitLayout,
} from "../../utils/learning-step-vertical-exercise";
import {
  DIGIT_COL_WIDTH,
  gridColumns,
  OP_COL_WIDTH,
} from "../../utils/learning-step-highlight-styles";
import { DigitCell } from "./StepHighlightCells";
import StepExerciseShell from "./StepExerciseShell";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";

function ColumnLabelRow({ maxLen, activeColumn, label, stepKey }) {
  const ex = useStepExerciseUi();
  return (
    <div
      className="grid gap-x-1 mb-0.5 h-3"
      style={{ gridTemplateColumns: gridColumns(maxLen) }}
      aria-hidden
    >
      <span className="w-4" />
      {Array.from({ length: maxLen }, (_, idx) => {
        const columnFromRight = maxLen - idx - 1;
        const showLabel = activeColumn != null && label && columnFromRight === activeColumn;
        return (
          <span
            key={`${stepKey}-label-${idx}`}
            className={`inline-block w-[1.5ch] text-center text-[10px] leading-none ${ex.accentMuted}`}
          >
            {showLabel ? label : "\u00A0"}
          </span>
        );
      })}
    </div>
  );
}

function CarryRow({ maxLen, carryDigits, carryHighlight, stepKey }) {
  return (
    <div
      className="grid gap-x-1 mb-1"
      style={{ gridTemplateColumns: gridColumns(maxLen) }}
      aria-hidden={!carryDigits?.some((digit) => digit.trim())}
    >
      <span className="w-4" />
      {Array.from({ length: maxLen }, (_, idx) => {
        const digit = carryDigits?.[idx] ?? " ";
        return (
          <DigitCell key={`${stepKey}-carry-${idx}`} highlighted={carryHighlight[idx]}>
            {digit.trim() || "\u00A0"}
          </DigitCell>
        );
      })}
    </div>
  );
}

export default function StepVerticalExerciseView({
  topValue,
  bottomValue,
  answerValue,
  operator,
  step,
  pre,
  stepIndex = 0,
  isDecimal = false,
  className = "",
}) {
  const ex = useStepExerciseUi();
  const layout = buildVerticalExerciseDigitLayout({
    topValue,
    bottomValue,
    answerValue,
    isDecimal,
  });
  const highlightState = buildStepCellHighlightState(step, layout, pre);
  const { maxLen, topDigits, bottomDigits } = layout;
  const stepKey = highlightState.stepId ?? `step-${stepIndex}`;

  const visibleAnswerDigits = layout.answerDigits.map((digit, idx) => {
    const columnFromRight = maxLen - idx - 1;
    if (columnFromRight < highlightState.revealDigits) {
      return digit.trim() || "\u00A0";
    }
    return "\u00A0";
  });

  return (
    <StepExerciseShell step={step} stepIndex={stepIndex} className={className}>
        <div
          className={`flex flex-col items-center font-mono text-2xl leading-[1.8] max-w-full ${ex.monoText}`}
          style={{ direction: "ltr" }}
        >
          <ColumnLabelRow
            maxLen={maxLen}
            activeColumn={highlightState.activeColumn}
            label={highlightState.activeColumnLabel}
            stepKey={stepKey}
          />

          <CarryRow
            maxLen={maxLen}
            carryDigits={highlightState.carryDigits}
            carryHighlight={highlightState.carry}
            stepKey={stepKey}
          />

          <div
            className="grid gap-x-1 mb-1"
            style={{ gridTemplateColumns: gridColumns(maxLen) }}
          >
            <span className="w-4" />
            {topDigits.map((digit, idx) => (
              <DigitCell key={`${stepKey}-a-${idx}`} highlighted={highlightState.operandA[idx]}>
                {digit.trim() || "\u00A0"}
              </DigitCell>
            ))}
          </div>

          <div
            className="grid gap-x-1 mb-1"
            style={{ gridTemplateColumns: gridColumns(maxLen) }}
          >
            <span className="w-4 text-center text-2xl font-bold">{operator}</span>
            {bottomDigits.map((digit, idx) => (
              <DigitCell key={`${stepKey}-b-${idx}`} highlighted={highlightState.operandB[idx]}>
                {digit.trim() || "\u00A0"}
              </DigitCell>
            ))}
          </div>

          <div
            className={`h-[2px] ${ex.divider} my-2`}
            style={{
              width: `calc(${OP_COL_WIDTH} + ${maxLen} * ${DIGIT_COL_WIDTH} + ${maxLen - 1} * 0.25rem)`,
            }}
          />

          <div
            className="grid gap-x-1"
            style={{ gridTemplateColumns: gridColumns(maxLen) }}
          >
            <span className="w-4" />
            {visibleAnswerDigits.map((digit, idx) => (
              <DigitCell key={`${stepKey}-r-${idx}`} highlighted={highlightState.result[idx]}>
                {digit}
              </DigitCell>
            ))}
          </div>
        </div>
    </StepExerciseShell>
  );
}
