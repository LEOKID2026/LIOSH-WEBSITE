import { Fragment } from "react";
import {
  bookMathIsolateStyle,
  isMathLikeText,
  splitHebrewMathRuns,
  splitTextAndMathRuns,
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

function MathSpan({ value, sourceText, start, end }) {
  const display = stripStrayMarkdown(value).trim();
  const padBefore = needsSpaceBefore(sourceText, start);
  const padAfter = needsSpaceAfter(sourceText, end - 1);

  return (
    <>
      {padBefore ? " " : null}
      <bdi
        dir="ltr"
        style={bookMathIsolateStyle}
        className="book-math-isolate font-semibold tabular-nums text-emerald-50"
      >
        {display}
      </bdi>
      {padAfter ? " " : null}
    </>
  );
}

function DigitSpan({ value, sourceText, start, end }) {
  const padBefore = needsSpaceBefore(sourceText, start);
  const padAfter = needsSpaceAfter(sourceText, end - 1);

  return (
    <>
      {padBefore ? " " : null}
      <bdi
        dir="ltr"
        style={bookMathIsolateStyle}
        className="book-digit-isolate tabular-nums"
      >
        {value}
      </bdi>
      {padAfter ? " " : null}
    </>
  );
}

function renderContentRuns(text, sourceText, sourceOffset = 0) {
  const runs = splitHebrewMathRuns(text);

  return runs.map((run, i) => {
    const start = run.start ?? sourceOffset;
    const end = run.end ?? start + run.value.length;

    if (run.type === "math") {
      return (
        <MathSpan
          key={i}
          value={run.value}
          sourceText={sourceText}
          start={start}
          end={end}
        />
      );
    }
    if (run.type === "digit") {
      return (
        <DigitSpan
          key={i}
          value={run.value}
          sourceText={sourceText}
          start={start}
          end={end}
        />
      );
    }
    return (
      <Fragment key={i}>{stripStrayMarkdown(run.value)}</Fragment>
    );
  });
}

function renderFormattedSegment(type, value, sourceText, sourceOffset = 0) {
  const cleaned = stripStrayMarkdown(value);
  const content = renderContentRuns(value, sourceText, sourceOffset);

  if (type === "bold") {
    const wrapLtr =
      isMathLikeText(cleaned) ||
      (/[+\-−=×÷?_]/.test(cleaned) && /\d/.test(cleaned));

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

function renderProseSegment(text, sourceText, keyPrefix) {
  const tokens = parseInlineMarkdown(text);

  return tokens.map((token, i) => {
    const tokenStart = sourceText.indexOf(token.value);
    const offset = tokenStart >= 0 ? tokenStart : 0;
    return (
      <Fragment key={`${keyPrefix}-${i}`}>
        {renderFormattedSegment(token.type, token.value, sourceText, offset)}
      </Fragment>
    );
  });
}

/**
 * Render Hebrew text with math isolated first, then markdown in prose segments.
 */
export default function MixedHebrewMathText({ text, className = "" }) {
  const input = String(text || "");
  const segments = splitTextAndMathRuns(input);

  return (
    <span
      dir="rtl"
      className={`book-mixed-hebrew-math ${className}`.trim()}
      style={{ unicodeBidi: "plaintext" }}
    >
      {segments.map((segment, i) => {
        if (segment.type === "math") {
          return (
            <MathSpan
              key={i}
              value={segment.value}
              sourceText={input}
              start={segment.start}
              end={segment.end}
            />
          );
        }
        return (
          <Fragment key={i}>
            {renderProseSegment(segment.value, input, String(i))}
          </Fragment>
        );
      })}
    </span>
  );
}
