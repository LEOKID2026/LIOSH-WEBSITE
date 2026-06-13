import React from "react";
import StepExerciseShell from "./StepExerciseShell";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";
import { DigitCell } from "./StepHighlightCells";
import {
  computeDivisionSteps,
  parseDivisionPre,
  resolveDivisionHighlightKeys,
} from "../../utils/learning-step-division-exercise";

export default function StepLongDivisionExerciseView({
  step,
  pre,
  dividend,
  divisor,
  quotient,
  stepIndex = 0,
  className = "",
}) {
  const ex = useStepExerciseUi();
  const parsed = parseDivisionPre(pre || step?.pre);
  const divStr = String(dividend ?? parsed?.dividend ?? "");
  const divVal = Number(divisor ?? parsed?.divisor ?? 0);
  const quotVal = quotient ?? parsed?.quotientLine?.replace(/\(\d+\)/, "").trim();

  if (!divStr || !divVal) return null;

  const divSteps = computeDivisionSteps(Number(divStr), divVal);
  const quotientDigitsArray = divSteps.map((s) => String(s.qDig));
  const dividendDigitsArray = divStr.split("");
  const divisorStr = String(divVal);

  const highlights = resolveDivisionHighlightKeys(step?.highlights, divStr.length);
  const currentStepIndex = typeof step?.stepIndex === "number" ? step.stepIndex : -1;
  const revealQuotientCount = step?.revealDigits ?? 0;
  const isSubtractStep = step?.id?.includes("subtract");
  const isBringDownStep = step?.id?.includes("bring-down");

  const isHighlighted = (key) =>
    Array.isArray(step?.highlights) && step.highlights.includes(key);

  const divisorPadding = divisorStr.length + 2;
  const stepKey = step?.id ?? `div-${stepIndex}`;

  return (
    <StepExerciseShell step={step} stepIndex={stepIndex} className={className}>
      <div
        className={`flex flex-col items-start font-mono text-xl leading-[1.6] ${ex.monoText}`}
        style={{ direction: "ltr", maxWidth: "100%" }}
      >
        <div className="mb-1 flex" style={{ paddingLeft: `${divisorPadding * 1.5}ch` }}>
          <div
            className="grid gap-x-1"
            style={{ gridTemplateColumns: `repeat(${Math.max(quotientDigitsArray.length, 1)}, 1.5ch)` }}
          >
            {quotientDigitsArray.map((d, idx) => (
              <DigitCell
                key={`${stepKey}-q-${idx}`}
                highlighted={
                  highlights.resultAll ||
                  highlights.quotientCols.has(idx) ||
                  isHighlighted(`result${idx}`)
                }
              >
                {idx < revealQuotientCount ? d : "\u00A0"}
              </DigitCell>
            ))}
          </div>
        </div>

        <div className="mb-1 flex" style={{ paddingLeft: `${divisorPadding * 1.5}ch` }}>
          <div
            className={`h-[2px] ${ex.divider}`}
            style={{ width: `${dividendDigitsArray.length * 1.5}ch` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{divVal}</span>
          <span className="text-xl font-bold">│</span>
          <div
            className="grid gap-x-1"
            style={{ gridTemplateColumns: `repeat(${dividendDigitsArray.length}, 1.5ch)` }}
          >
            {dividendDigitsArray.map((d, idx) => (
              <DigitCell
                key={`${stepKey}-d-${idx}`}
                highlighted={
                  highlights.dividendCols.has(idx) ||
                  isHighlighted(`a${idx}`) ||
                  isHighlighted("aAll")
                }
              >
                {d}
              </DigitCell>
            ))}
          </div>
        </div>

        {currentStepIndex >= 0 && divSteps[currentStepIndex] && (() => {
          const ds = divSteps[currentStepIndex];
          const showWorkingNum = isSubtractStep || isHighlighted(`workingNum${currentStepIndex}`);
          const showProduct = isSubtractStep || isHighlighted(`product${currentStepIndex}`);
          const showRemainder = isSubtractStep || isHighlighted(`remainder${currentStepIndex}`);
          const wNumStr = String(ds.wNum);
          const prodStr = String(ds.prod);
          const remStr = String(ds.rem);
          const alignmentOffset = divisorPadding + (ds.startPos || 0);

          return (
            <div className="mt-2 flex flex-col gap-1">
              {showWorkingNum && (
                <div className="flex" style={{ paddingLeft: `${alignmentOffset * 1.5}ch` }}>
                  <div
                    className="grid gap-x-1"
                    style={{ gridTemplateColumns: `repeat(${wNumStr.length}, 1.5ch)` }}
                  >
                    {wNumStr.split("").map((d, idx) => (
                      <span key={`${stepKey}-wn-${idx}`} className={`text-center ${ex.accent}`}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {showProduct && (
                <div
                  className="flex"
                  style={{
                    paddingLeft: `${(alignmentOffset + wNumStr.length - prodStr.length) * 1.5}ch`,
                  }}
                >
                  <div
                    className="grid gap-x-1"
                    style={{ gridTemplateColumns: `repeat(${prodStr.length}, 1.5ch)` }}
                  >
                    {prodStr.split("").map((d, idx) => (
                      <span key={`${stepKey}-prod-${idx}`} className="text-center font-bold text-red-300">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {showProduct && (
                <div
                  className="flex"
                  style={{
                    paddingLeft: `${(alignmentOffset + wNumStr.length - prodStr.length) * 1.5}ch`,
                  }}
                >
                  <div
                    className={`h-[1px] ${ex.dividerThin}`}
                    style={{ width: `${Math.max(prodStr.length, wNumStr.length) * 1.5}ch` }}
                  />
                </div>
              )}
              {showRemainder && ds.rem >= 0 && (
                <div
                  className="flex"
                  style={{
                    paddingLeft: `${(alignmentOffset + wNumStr.length - remStr.length) * 1.5}ch`,
                  }}
                >
                  <div
                    className="grid gap-x-1"
                    style={{ gridTemplateColumns: `repeat(${remStr.length}, 1.5ch)` }}
                  >
                    {remStr.split("").map((d, idx) => (
                      <span key={`${stepKey}-rem-${idx}`} className="text-center font-bold text-blue-300">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isBringDownStep && currentStepIndex < divSteps.length - 1 && step?.nextDigit !== undefined && (
                <div
                  className="flex items-center gap-1 mt-1"
                  style={{ paddingLeft: `${(divisorPadding + (ds.pos + 1)) * 1.5}ch` }}
                >
                  <span className="text-blue-300 font-bold text-sm">↓</span>
                  <span className={`${ex.accent} text-sm`}>{step.nextDigit}</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </StepExerciseShell>
  );
}
