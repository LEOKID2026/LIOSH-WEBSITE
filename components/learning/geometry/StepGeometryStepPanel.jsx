import React from "react";
import StepGeometryTextHighlights from "./StepGeometryTextHighlights";

export default function StepGeometryStepPanel({
  step,
  titleClassName = "",
  bodyClassName = "",
}) {
  if (!step) return null;

  return (
    <div key={step.id} data-geometry-step-id={step.id}>
      <h4 className={titleClassName}>{step.title || "הסבר"}</h4>
      {step.content ? (
        <div className={bodyClassName}>{step.content}</div>
      ) : (
        <StepGeometryTextHighlights step={step} className={bodyClassName} />
      )}
    </div>
  );
}
