import React from "react";
import { buildGeometryTextHighlightState } from "../../../utils/learning-step-geometry-text";
import { GEOMETRY_HIGHLIGHT_STYLE } from "../../../utils/geometry-step-highlight-styles";
import { normalizeHebrewWordNumberSpacing } from "../../../utils/learning-hebrew-number-spacing";

function kindStyle(kind) {
  if (kind === "formula" || kind === "keyword") {
    return { ...GEOMETRY_HIGHLIGHT_STYLE, fontWeight: 600 };
  }
  if (kind === "number" || kind === "unit") {
    return { ...GEOMETRY_HIGHLIGHT_STYLE, fontVariantNumeric: "tabular-nums" };
  }
  return GEOMETRY_HIGHLIGHT_STYLE;
}

export default function StepGeometryTextHighlights({ step, text, className = "" }) {
  const plain = normalizeHebrewWordNumberSpacing(
    String(text || step?.plainText || step?.text || "").replace(/\u2066|\u2069/g, "")
  );
  if (!plain) return null;

  const { ranges } = buildGeometryTextHighlightState(step, plain);
  if (!ranges.length) {
    return (
      <p
        className={className}
        dir="rtl"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.75 }}
      >
        {plain}
      </p>
    );
  }

  const parts = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) {
      parts.push(<span key={`t-${i}`}>{plain.slice(cursor, r.start)}</span>);
    }
    parts.push(
      <mark key={`h-${i}`} style={kindStyle(r.kind)}>
        {plain.slice(r.start, r.end)}
      </mark>
    );
    cursor = r.end;
  });
  if (cursor < plain.length) {
    parts.push(<span key="tail">{plain.slice(cursor)}</span>);
  }

  return (
    <p
      className={className}
      dir="rtl"
      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.75 }}
    >
      {parts}
    </p>
  );
}
