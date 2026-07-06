/**
 * Additive parent diagnostic explanation — parent report surfaces only.
 */
import React from "react";

/**
 * @param {{ explanationV1: { explanationHe?: string; exampleHe?: string | null } | null | undefined; className?: string }} props
 */
export function ParentDiagnosticExplanationBlock({ explanationV1, className = "" }) {
  const explanationHe = String(explanationV1?.explanationHe || "").trim();
  if (!explanationHe) return null;
  const exampleHe = explanationV1?.exampleHe != null ? String(explanationV1.exampleHe).trim() : "";
  const wrap = ["parent-diagnostic-explanation-block", className].filter(Boolean).join(" ");

  return (
    <div className={wrap}>
      <p className="parent-diagnostic-explanation-text text-[10px] md:text-[11px] text-white/72 leading-snug m-0 mt-1.5">
        {explanationHe}
      </p>
      {exampleHe ? (
        <p className="parent-diagnostic-explanation-example text-[10px] md:text-[11px] text-white/65 leading-snug m-0 mt-1">
          <span className="text-white/45 font-semibold">דוגמה כללית: </span>
          <bdi className="parent-diagnostic-explanation-example-ltr" dir="auto">
            {exampleHe}
          </bdi>
        </p>
      ) : null}
    </div>
  );
}
