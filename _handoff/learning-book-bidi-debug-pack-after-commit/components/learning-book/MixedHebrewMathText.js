import { Fragment } from "react";
import {
  bookLabelBodyGapStyle,
  bookLabelIsolateStyle,
  bookMathIsolateStyle,
  bookProseIsolateStyle,
  isFormulaLikeBody,
  isMathLikeText,
  splitFormulaTokens,
  splitHebrewMathRuns,
  splitTextAndMathRuns,
} from "../../lib/learning-book/book-math-display";
import { splitProseForBidiRendering, splitCommaVavEquationDisplay } from "../../lib/learning-book/book-bidi-render";
import { parseBookLineStructure, splitMixedBodyClauses } from "../../lib/learning-book/book-line-structure";
import {
  parseInlineMarkdown,
  stripStrayMarkdown,
} from "../../lib/learning-book/parse-inline-markdown";
import { interRunGapText } from "../../lib/learning-book/book-visible-text-render";
import { useBookGradeTheme } from "./BookGradeThemeContext";

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
  const { classes: theme } = useBookGradeTheme();
  const display = stripStrayMarkdown(value).trim();
  const padBefore = needsSpaceBefore(sourceText, start);
  const padAfter = needsSpaceAfter(sourceText, end - 1);

  return (
    <>
      {padBefore ? " " : null}
      <bdi
        dir="ltr"
        style={bookMathIsolateStyle}
        className={`book-math-isolate font-semibold tabular-nums ${theme.mathText}`}
        data-book-math-run="true"
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
        data-book-digit="true"
      >
        {value}
      </bdi>
      {padAfter ? " " : null}
    </>
  );
}

const MIXED_LINE_CLASS =
  "inline-flex max-w-full flex-wrap items-baseline [direction:rtl]";

function MixedLineBody({ children, className = "" }) {
  return (
    <span className={`book-mixed-line-body ${MIXED_LINE_CLASS} ${className}`.trim()} dir="rtl">
      {children}
    </span>
  );
}

function ProseSpan({ children, className = "" }) {
  return (
    <bdi
      dir="rtl"
      style={bookProseIsolateStyle}
      className={`book-prose-isolate ${className}`.trim()}
      data-book-prose-run="true"
    >
      {children}
    </bdi>
  );
}

function renderProseText(value) {
  const cleaned = stripStrayMarkdown(value);
  if (!cleaned) return null;

  const chunks = splitProseForBidiRendering(cleaned);
  if (chunks.length <= 1) {
    return <ProseSpan>{cleaned}</ProseSpan>;
  }

  return chunks.map((chunk, i) => (
    <ProseSpan key={i}>{stripStrayMarkdown(chunk.value)}</ProseSpan>
  ));
}

function renderContentRuns(text, sourceText, sourceOffset = 0) {
  const runs = splitHebrewMathRuns(text);
  const scopedSource = sourceText || text;

  return runs.map((run, i) => {
    const relStart = run.start ?? 0;
    const relEnd = run.end ?? relStart + run.value.length;
    const start = sourceOffset + relStart;
    const end = sourceOffset + relEnd;
    const gap =
      i > 0
        ? interRunGapText(
            scopedSource,
            sourceOffset +
              (runs[i - 1].end ??
                (runs[i - 1].start ?? 0) + runs[i - 1].value.length),
            start
          )
        : "";

    const runNode =
      run.type === "math" ? (
        <MathSpan
          key={i}
          value={run.value}
          sourceText={scopedSource}
          start={start}
          end={end}
        />
      ) : run.type === "digit" ? (
        <DigitSpan
          key={i}
          value={run.value}
          sourceText={scopedSource}
          start={start}
          end={end}
        />
      ) : (
        renderProseText(run.value)
      );

    return (
      <Fragment key={i}>
        {gap || null}
        {runNode}
      </Fragment>
    );
  });
}

function renderFormattedSegment(type, value, sourceText, sourceOffset = 0) {
  const { classes: theme } = useBookGradeTheme();
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
    return (
      <strong className="font-bold text-white">
        <ProseSpan>{content}</ProseSpan>
      </strong>
    );
  }

  if (type === "italic") {
    return (
      <em className="text-white/85">
        <ProseSpan>{content}</ProseSpan>
      </em>
    );
  }

  if (type === "code") {
    return (
      <code
        className={`rounded-md px-1.5 py-0.5 text-[0.95em] font-semibold ${theme.inlineCodeBg} ${theme.inlineCodeText}`}
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

function renderFormulaBody(text) {
  const tokens = splitFormulaTokens(text);
  return tokens.map((token, i) => {
    if (token.type === "space") {
      return token.value;
    }
    if (token.type === "op") {
      return (
        <bdi
          key={i}
          dir="ltr"
          style={bookMathIsolateStyle}
          className="book-formula-op font-semibold tabular-nums"
          data-book-formula-op="true"
        >
          {token.value}
        </bdi>
      );
    }
    return (
      <bdi
        key={i}
        dir="rtl"
        style={bookLabelIsolateStyle}
        className="book-formula-term"
        data-book-formula-term="true"
      >
        {token.value}
      </bdi>
    );
  });
}

function renderMixedBodyInner(text) {
  const input = String(text || "");
  if (isFormulaLikeBody(input)) {
    return renderFormulaBody(input);
  }

  const displayRows = splitCommaVavEquationDisplay(input);
  if (displayRows) {
    return displayRows.map((row, i) => (
      <span key={i} className="book-equation-display-row block w-full">
        {renderMixedBodyInnerSingle(row)}
      </span>
    ));
  }

  return renderMixedBodyInnerSingle(input);
}

function renderMixedBodyInnerSingle(text) {
  const input = String(text || "");
  const segments = splitTextAndMathRuns(input);

  return segments.map((segment, i) => {
    const gap =
      i > 0 ? interRunGapText(input, segments[i - 1].end, segment.start) : "";

    const segmentNode =
      segment.type === "math" ? (
        <MathSpan
          key={i}
          value={segment.value}
          sourceText={input}
          start={segment.start}
          end={segment.end}
        />
      ) : (
        renderProseSegment(segment.value, input, String(i))
      );

    return (
      <Fragment key={i}>
        {gap || null}
        {segmentNode}
      </Fragment>
    );
  });
}

function renderMixedClause(clause) {
  const structure = parseBookLineStructure(clause);
  if (structure?.body) {
    return renderLabelWithBody(structure.label, structure.body);
  }
  return renderMixedBodyInner(clause);
}

function renderMixedBody(text) {
  const clauses = splitMixedBodyClauses(text);
  return clauses.map((clause, i) => (
    <Fragment key={i}>
      {i > 0 ? " " : null}
      {renderMixedClause(clause)}
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
      data-book-label="true"
    >
      {cleaned}
    </span>
  );
}

function LabelBodyGap() {
  return (
    <span
      className="book-label-body-gap"
      aria-hidden="true"
      style={bookLabelBodyGapStyle}
      data-book-label-gap="true"
    />
  );
}

function renderLabelWithBody(label, body) {
  return (
    <>
      <BookLineLabel label={label} />
      <LabelBodyGap />
      {renderMixedBodyInner(body)}
    </>
  );
}

/**
 * Render Hebrew text with math isolated first, then markdown in prose segments.
 */
export default function MixedHebrewMathText({ text, className = "" }) {
  const input = String(text || "");
  const structure = parseBookLineStructure(input);

  if (structure?.label) {
    return (
      <MixedLineBody
        className={`book-mixed-hebrew-math book-structured-line ${className}`.trim()}
      >
        {structure.body
          ? renderLabelWithBody(structure.label, structure.body)
          : <BookLineLabel label={structure.label} />}
      </MixedLineBody>
    );
  }

  const clauses = splitMixedBodyClauses(input);
  if (clauses.length <= 1) {
    return (
      <MixedLineBody className={`book-mixed-hebrew-math ${className}`.trim()}>
        {renderMixedBodyInner(input)}
      </MixedLineBody>
    );
  }

  return (
    <>
      {clauses.map((clause, i) => {
        const sub = parseBookLineStructure(clause);
        return (
          <MixedLineBody
            key={i}
            className={`book-mixed-hebrew-math ${className}`.trim()}
          >
            {sub?.label && sub?.body
              ? renderLabelWithBody(sub.label, sub.body)
              : (
                <>
                  {sub?.label ? <BookLineLabel label={sub.label} /> : null}
                  {renderMixedBodyInner(sub?.body ?? clause)}
                </>
              )}
          </MixedLineBody>
        );
      })}
    </>
  );
}
