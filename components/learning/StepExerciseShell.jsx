import React from "react";

export default function StepExerciseShell({ step, stepIndex = 0, className = "", children }) {
  const stepKey = step?.id ?? `step-${stepIndex}`;
  return (
    <div className={`mb-4 w-full ${className}`.trim()} data-step-id={stepKey}>
      <div className="rounded-lg bg-emerald-900/50 px-3 py-2 max-w-full overflow-x-hidden overflow-y-visible">
        {children}
      </div>
    </div>
  );
}
