import { Fragment } from "react";
import {
  bookMathIsolateStyle,
  isMathLikeText,
  splitHebrewMathRuns,
} from "../../lib/learning-book/book-math-display";

function renderBoldItalicInline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Fragment key={key++}>{text.slice(last, match.index)}</Fragment>
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      const inner = token.slice(2, -2);
      const innerNode = isMathLikeText(inner) ? (
        <span style={bookMathIsolateStyle} dir="ltr">
          {inner}
        </span>
      ) : (
        inner
      );
      parts.push(
        <strong key={key++} className="font-bold text-white">
          {innerNode}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-violet-900/40 px-1.5 py-0.5 text-[0.95em] font-semibold text-emerald-100"
          style={bookMathIsolateStyle}
          dir="ltr"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }

  return parts.length ? parts : text;
}

/**
 * Render Hebrew text with isolated LTR math runs.
 */
export default function MixedHebrewMathText({ text, className = "" }) {
  const runs = splitHebrewMathRuns(text);

  return (
    <span className={className}>
      {runs.map((run, i) =>
        run.type === "math" ? (
          <span
            key={i}
            dir="ltr"
            style={bookMathIsolateStyle}
            className="font-semibold text-emerald-50 tabular-nums"
          >
            {run.value}
          </span>
        ) : (
          <Fragment key={i}>{renderBoldItalicInline(run.value)}</Fragment>
        )
      )}
    </span>
  );
}
