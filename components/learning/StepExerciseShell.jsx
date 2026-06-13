import React from "react";
import { useStepExerciseUi } from "../../contexts/StepExerciseUiContext";

export default function StepExerciseShell({ step, stepIndex = 0, className = "", children }) {
  const ex = useStepExerciseUi();
  const stepKey = step?.id ?? `step-${stepIndex}`;
  return (
    <div className={`mb-4 w-full ${className}`.trim()} data-step-id={stepKey}>
      <div className={ex.panel}>{children}</div>
    </div>
  );
}
