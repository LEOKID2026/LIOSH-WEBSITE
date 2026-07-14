/**
 * English stem with LTR Latin runs inside an RTL worksheet page.
 */

import { EnglishLtrBlock } from "./renderers/EnglishLtrBlock.jsx";

/**
 * @param {{
 *   stemHe?: string,
 *   ltrSpans?: import("../../lib/worksheets/worksheet-question-types.js").WorksheetLtrSpan[],
 *   className?: string,
 * }} props
 */
export default function EnglishStemText({ stemHe = "", ltrSpans = [], className = "worksheet-stem" }) {
  const text = String(stemHe || "");
  if (!ltrSpans?.length) {
    return <p className={className}>{text}</p>;
  }

  const sorted = [...ltrSpans].sort((a, b) => a.start - b.start);
  /** @type {import("react").ReactNode[]} */
  const parts = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start < cursor) continue;
    if (span.start > cursor) {
      parts.push(text.slice(cursor, span.start));
    }
    const display = text.slice(span.start, span.end);
    parts.push(
      <EnglishLtrBlock key={`${span.start}-${span.end}`}>{display}</EnglishLtrBlock>
    );
    cursor = span.end;
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <p className={className}>{parts}</p>;
}
