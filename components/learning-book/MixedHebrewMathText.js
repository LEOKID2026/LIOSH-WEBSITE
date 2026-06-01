import { Fragment } from "react";
import {
  bookMathIsolateStyle,
  isMathLikeText,
  splitHebrewMathRuns,
} from "../../lib/learning-book/book-math-display";
import {
  parseInlineMarkdown,
  stripStrayMarkdown,
} from "../../lib/learning-book/parse-inline-markdown";

function MathSpan({ value, className = "" }) {
  return (
    <span
      dir="ltr"
      style={bookMathIsolateStyle}
      className={`font-semibold tabular-nums text-emerald-50 ${className}`}
    >
      {value}
    </span>
  );
}

function DigitSpan({ value }) {
  return (
    <span dir="ltr" style={bookMathIsolateStyle} className="tabular-nums">
      {value}
    </span>
  );
}

function renderContentRuns(text) {
  const runs = splitHebrewMathRuns(text);

  return runs.map((run, i) => {
    if (run.type === "math") {
      return <MathSpan key={i} value={run.value} />;
    }
    if (run.type === "digit") {
      return <DigitSpan key={i} value={run.value} />;
    }
    return (
      <Fragment key={i}>{stripStrayMarkdown(run.value)}</Fragment>
    );
  });
}

function renderFormattedSegment(type, value) {
  const cleaned = stripStrayMarkdown(value);
  const content = renderContentRuns(value);

  if (type === "bold") {
    const wrapLtr =
      isMathLikeText(cleaned) ||
      (/[+\-−=×÷?]/.test(cleaned) && /\d/.test(cleaned));

    if (wrapLtr) {
      return (
        <strong
          className="font-bold text-white"
          dir="ltr"
          style={bookMathIsolateStyle}
        >
          {cleaned}
        </strong>
      );
    }

    return (
      <strong className="font-bold text-white">{content}</strong>
    );
  }

  if (type === "italic") {
    return <em className="text-white/85">{content}</em>;
  }

  if (type === "code") {
    return (
      <code
        className="rounded-md bg-violet-900/40 px-1.5 py-0.5 text-[0.95em] font-semibold text-emerald-100"
        style={bookMathIsolateStyle}
        dir="ltr"
      >
        {cleaned}
      </code>
    );
  }

  return <>{content}</>;
}

/**
 * Render Hebrew text with markdown parsed first, then LTR math isolation.
 */
export default function MixedHebrewMathText({ text, className = "" }) {
  const tokens = parseInlineMarkdown(text);

  return (
    <span className={className}>
      {tokens.map((token, i) => (
        <Fragment key={i}>
          {renderFormattedSegment(token.type, token.value)}
        </Fragment>
      ))}
    </span>
  );
}
