import { Fragment } from "react";
import {
  bookLabelIsolateStyle,
  bookMathIsolateStyle,
  isMathLikeText,
  splitHebrewMathRuns,
  splitTextAndMathRuns,
} from "../../lib/learning-book/book-math-display";
import { parseBookLineStructure, splitMixedBodyClauses } from "../../lib/learning-book/book-line-structure";
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
  const mathOnly =
    isMathLikeText(cleaned) && !HEBREW_CHAR.test(cleaned.replace(/\*\*/g, ""));

  if (type === "bold") {
    if (mathOnly) {
      return (
        <strong className="font-bold text-white">
          <MathSpan
            value={value}
            sourceText={sourceText}
            start={sourceOffset}
            end={sourceOffset + value.length}
          />
        </strong>
      );
    }
    return <strong className="font-bold text-white">{content}</strong>;
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

function renderMixedBodyInner(text) {
  const input = String(text || "");
  const segments = splitTextAndMathRuns(input);

  return segments.map((segment, i) => {
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
  });
}

function renderMixedClause(clause, keyPrefix) {
  const structure = parseBookLineStructure(clause);
  if (structure?.body) {
    return (
      <>
        <BookLineLabel label={structure.label} />
        {" "}
        <span className="book-line-body inline">
          {renderMixedBodyInner(structure.body)}
        </span>
      </>
    );
  }
  return renderMixedBodyInner(clause);
}

function renderMixedBody(text) {
  const clauses = splitMixedBodyClauses(text);
  return clauses.map((clause, i) => (
    <Fragment key={i}>
      {i > 0 ? " " : null}
      {renderMixedClause(clause, String(i))}
    </Fragment>
  ));
}

function BookLineLabel({ label }) {
  const cleaned = stripStrayMarkdown(String(label || ""));
  if (!cleaned) return null;

  return (
    <span
      className="book-line-label inline font-bold text-white"
      style={bookLabelIsolateStyle}
    >
      {cleaned}
    </span>
  );
}

/**
 * Render Hebrew text with math isolated first, then markdown in prose segments.
 */
export default function MixedHebrewMathText({ text, className = "" }) {
  const input = String(text || "");
  const structure = parseBookLineStructure(input);

  if (structure) {
    return (
      <span
        className={`book-mixed-hebrew-math book-structured-line inline ${className}`.trim()}
        dir="rtl"
      >
        <BookLineLabel label={structure.label} />
        {structure.body ? (
          <>
            {" "}
            <span className="book-line-body inline">{renderMixedBody(structure.body)}</span>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <span
      dir="rtl"
      className={`book-mixed-hebrew-math inline ${className}`.trim()}
    >
      {renderMixedBody(input)}
    </span>
  );
}
