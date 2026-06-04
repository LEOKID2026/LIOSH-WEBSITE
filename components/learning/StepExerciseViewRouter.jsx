import React from "react";
import { EXERCISE_VIEWS, resolveExerciseView } from "../../utils/learning-step-exercise-types";
import StepVerticalExerciseView from "./StepVerticalExerciseView";
import StepMultiplicationExerciseView from "./StepMultiplicationExerciseView";
import StepLongDivisionExerciseView from "./StepLongDivisionExerciseView";
import StepFractionExerciseView from "./StepFractionExerciseView";
import StepExpressionExerciseView from "./StepExpressionExerciseView";
import StepWordProblemExerciseView from "./StepWordProblemExerciseView";

const EXERCISE_PANEL_CLASS =
  "rounded-lg bg-emerald-900/50 px-3 py-2 max-w-full overflow-x-hidden overflow-y-visible";

function DivisionPreFallback({ step }) {
  if (!step?.pre) return null;
  const raw = String(step.pre).replace(/\u2066|\u2069/g, "");
  const lines = raw.split("\n");
  const firstLine = lines[0] ?? "";
  const rest = lines.slice(1).join("\n");
  return (
    <div className="mb-4 w-full max-w-full">
      <div className={EXERCISE_PANEL_CLASS}>
        <div className="flex flex-col items-center w-full max-w-full">
          <pre
            dir="ltr"
            className="text-center font-mono text-lg whitespace-pre-wrap text-emerald-100 w-full max-w-full"
            style={{ unicodeBidi: "plaintext", margin: 0, transform: "translateY(6px)" }}
          >
            {`\u2066${firstLine}\u2069`}
          </pre>
          <pre
            dir="ltr"
            className="text-center font-mono text-lg leading-relaxed whitespace-pre-wrap text-emerald-100 w-full max-w-full"
            style={{ unicodeBidi: "plaintext", margin: 0 }}
          >
            {`\u2066${rest}\u2069`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function PreFallback({ step }) {
  if (!step?.pre) return null;
  return (
    <div className="mb-4 w-full max-w-full">
      <div className={EXERCISE_PANEL_CLASS}>
        <pre
          dir="ltr"
          className="text-center font-mono text-lg leading-relaxed whitespace-pre-wrap text-emerald-100 w-full max-w-full"
          style={{ unicodeBidi: "plaintext" }}
        >
          {step.pre}
        </pre>
      </div>
    </div>
  );
}

export default function StepExerciseViewRouter({
  step,
  question,
  layoutProps = {},
  stepIndex = 0,
  className = "",
}) {
  const view =
    step?.exerciseView ||
    resolveExerciseView(step, question, question?.operation);

  const common = {
    step,
    stepIndex,
    className,
    pre: step?.pre,
  };

  switch (view) {
    case EXERCISE_VIEWS.placeValue:
      return (
        <StepVerticalExerciseView
          key={step?.id ?? `step-${stepIndex}`}
          topValue={layoutProps.topValue}
          bottomValue={layoutProps.bottomValue}
          answerValue={layoutProps.answerValue}
          operator={layoutProps.operator}
          step={step}
          pre={step?.pre}
          stepIndex={stepIndex}
          isDecimal={layoutProps.isDecimal}
          className={className}
        />
      );

    case EXERCISE_VIEWS.multiplication:
      return <StepMultiplicationExerciseView {...common} />;

    case EXERCISE_VIEWS.longDivision:
      if (step?.type === "division" && step?.pre) {
        return (
          <StepLongDivisionExerciseView
            {...common}
            dividend={step.dividend ?? layoutProps.topValue}
            divisor={step.divisor ?? layoutProps.bottomValue}
            quotient={step.quotient ?? layoutProps.answerValue}
          />
        );
      }
      if (step?.type === "division" && typeof step.pre === "string") {
        return <DivisionPreFallback step={step} />;
      }
      return (
        <StepLongDivisionExerciseView
          {...common}
          dividend={layoutProps.topValue}
          divisor={layoutProps.bottomValue}
          quotient={layoutProps.answerValue}
        />
      );

    case EXERCISE_VIEWS.fraction:
      return <StepFractionExerciseView {...common} />;

    case EXERCISE_VIEWS.wordProblem:
      return <StepWordProblemExerciseView step={step} className={className} />;

    case EXERCISE_VIEWS.expression:
      if (!step?.pre) return null;
      return <StepExpressionExerciseView step={step} className={className} />;

    default:
      if (step?.type === "division" && typeof step?.pre === "string") {
        return <DivisionPreFallback step={step} />;
      }
      if (step?.pre) return <PreFallback step={step} />;
      return null;
  }
}
