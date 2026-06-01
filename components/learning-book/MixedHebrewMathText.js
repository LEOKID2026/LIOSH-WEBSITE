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

const HEBREW_CHAR = /[\u0590-\u05FF]/;

function needsSpaceBefore(text, index) {
  if (index <= 0) return false;
  const prev = text[index - 1];
  if (/\s/.test(prev)) return false;
  return HEBREW_CHAR.test(prev) || /[,.:;!?)]/.test(prev);
}

function needsSpaceAfter(text, index) {
  if (index >= text.length - 1) return false;
  const next = text[index + 1];
  if (/\s/.test(next)) return false;
  return HEBREW_CHAR.test(next) || /[([״"']/.test(next);
}

function MathSpan({ value, padBefore = false, padAfter = false }) {
  return (
    <>
      {padBefore ? "\u2009" : null}
      <span
        dir="ltr"
        style={bookMathIsolateStyle}
        className="book-math-isolate font-semibold tabular-nums text-emerald-50"
      >
        {value}
      </span>
      {padAfter ? "\u2009" : null}
    </>
  );
}

function DigitSpan({ value, padBefore = false, padAfter = false }) {
  return (
    <>
      {padBefore ? "\u2009" : null}
      <span
        dir="ltr"
        style={bookMathIsolateStyle}
        className="book-digit-isolate tabular-nums"
      >
        {value}
      </span>
      {padAfter ? "\u2009" : null}
    </>
  );
}

function renderContentRuns(text) {
  const runs = splitHebrewMathRuns(text);

  return runs.map((run, i) => {
    const start = run.start ?? 0;
    const end = run.end ?? start + run.value.length;

    if (run.type === "math") {
      return (
        <MathSpan
          key={i}
          value={run.value}
          padBefore={needsSpaceBefore(text, start)}
          padAfter={needsSpaceAfter(text, end - 1)}
        />
      );
    }
    if (run.type === "digit") {
      return (
        <DigitSpan
          key={i}
          value={run.value}
          padBefore={needsSpaceBefore(text, start)}
          padAfter={needsSpaceAfter(text, end - 1)}
        />
      );
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
    <span className={`book-mixed-hebrew-math ${className}`.trim()}>
      {tokens.map((token, i) => (
        <Fragment key={i}>
          {renderFormattedSegment(token.type, token.value)}
        </Fragment>
      ))}
    </span>
  );
}
