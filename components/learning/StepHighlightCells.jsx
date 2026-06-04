import React from "react";
import { HIGHLIGHT_STYLE } from "../../utils/learning-step-highlight-styles";

export function DigitCell({ children, highlighted }) {
  return (
    <span
      className="inline-block w-[1.5ch] text-center font-bold leading-none rounded-sm"
      style={highlighted ? HIGHLIGHT_STYLE : undefined}
    >
      {children}
    </span>
  );
}

export function ExpressionSpan({ children, highlighted, className = "" }) {
  return (
    <span
      className={`rounded-sm px-0.5 ${className}`.trim()}
      style={highlighted ? HIGHLIGHT_STYLE : undefined}
    >
      {children}
    </span>
  );
}
