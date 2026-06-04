import {
  buildStepCellHighlightState,
  buildVerticalExerciseDigitLayout,
} from "../../utils/learning-step-vertical-exercise";

const OP_COL_WIDTH = "1rem";
const DIGIT_COL_WIDTH = "1.5ch";
const HIGHLIGHT_STYLE = {
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  boxShadow: "inset 0 0 0 1px rgba(251, 191, 36, 0.45)",
};

function gridColumns(maxLen) {
  return `${OP_COL_WIDTH} repeat(${maxLen}, ${DIGIT_COL_WIDTH})`;
}

function DigitCell({ children, highlighted }) {
  return (
    <span
      className="inline-block w-[1.5ch] text-center font-bold leading-none rounded-sm"
      style={highlighted ? HIGHLIGHT_STYLE : undefined}
    >
      {children}
    </span>
  );
}

function ColumnLabelRow({ maxLen, activeColumn, label, stepKey }) {
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
            className="inline-block w-[1.5ch] text-center text-[10px] leading-none text-emerald-300/75"
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
    <div className={`mb-4 w-full ${className}`.trim()} data-step-id={stepKey}>
      <div className="rounded-lg bg-emerald-900/50 px-3 py-2 overflow-x-auto">
        <div
          className="flex flex-col items-center font-mono text-2xl leading-[1.8]"
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
            className="h-[2px] bg-white my-2"
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
      </div>
    </div>
  );
}
