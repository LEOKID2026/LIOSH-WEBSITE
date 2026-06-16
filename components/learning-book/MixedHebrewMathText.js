import { Fragment } from "react";
import {
  bookLabelBodyGapStyle,
  bookLabelIsolateStyle,
  bookMathIsolateStyle,
  bookProseIsolateStyle,
  isMathLikeText,
} from "../../lib/learning-book/book-math-display";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs";
import {
  splitCommaSeparatedFormulaDisplay,
  splitCommaVavEquationDisplay,
  splitInlineHebrewTaskEquation,
} from "../../lib/learning-book/book-bidi-render";
import { parseBookLineStructure, splitMixedBodyClauses } from "../../lib/learning-book/book-line-structure";
import {
  parseInlineMarkdown,
  stripStrayMarkdown,
} from "../../lib/learning-book/parse-inline-markdown";
import { useBookGradeTheme } from "./BookGradeThemeContext";

const HEBREW_CHAR = /[\u0590-\u05FF]/;

function MathSpan({ value, className = "" }) {
  const { classes: theme } = useBookGradeTheme();
  const display = stripStrayMarkdown(value).trim();

  return (
    <span
      dir="ltr"
      style={bookMathIsolateStyle}
      className={`book-math-isolate font-semibold tabular-nums ${theme.mathText} ${className}`.trim()}
      data-book-math-run="true"
    >
      {display}
    </span>
  );
}

function MixedLineBody({ children, className = "" }) {
  return (
    <span className={`book-mixed-line-body block max-w-full ${className}`.trim()} dir="rtl">
      {children}
    </span>
  );
}

function ProseSpan({ children, className = "" }) {
  return (
    <span
      dir="rtl"
      style={bookProseIsolateStyle}
      className={`book-prose-isolate ${className}`.trim()}
      data-book-prose-run="true"
    >
      {children}
    </span>
  );
}

/**
 * Unified BiDi policy: one LTR island per math run, RTL prose — no digit/token splitting.
 */
function renderUnifiedMixedRuns(text, keyPrefix = "") {
  const input = String(text || "");
  const runs = splitMixedHebrewMathRuns(input);

  return runs.map((run, i) => {
    const key = `${keyPrefix}${run.type}-${i}`;
    if (run.value === "\n") {
      return <br key={key} />;
    }
    if (run.type === "math") {
      return <MathSpan key={key} value={run.value} />;
    }
    const prose = stripStrayMarkdown(run.value);
    if (!prose) return null;
    return (
      <ProseSpan key={key}>{prose}</ProseSpan>
    );
  });
}

function renderProseText(value) {
  const cleaned = stripStrayMarkdown(value);
  if (!cleaned) return null;
  return <ProseSpan>{cleaned}</ProseSpan>;
}

function renderFormattedSegment(type, value, sourceText) {
  const { classes: theme } = useBookGradeTheme();
  const cleaned = stripStrayMarkdown(value);
  const content = renderUnifiedMixedRuns(value, `${type}-`);
  const mathOnly =
    isMathLikeText(cleaned) && !HEBREW_CHAR.test(cleaned.replace(/\*\*/g, ""));

  if (type === "bold") {
    if (mathOnly) {
      return (
        <strong className="font-bold text-white">
          <MathSpan value={value} />
        </strong>
      );
    }
    return (
      <strong className="font-bold text-white">
        {content}
      </strong>
    );
  }

  if (type === "italic") {
    return (
      <em className="text-white/85">
        {content}
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

  return tokens.map((token, i) => (
    <Fragment key={`${keyPrefix}-${i}`}>
      {renderFormattedSegment(token.type, token.value, sourceText)}
    </Fragment>
  ));
}

function renderInlineHebrewTaskEquation(text) {
  const split = splitInlineHebrewTaskEquation(text);
  if (!split) return null;

  return (
    <>
      <ProseSpan>{split.prefix}</ProseSpan>
      <LabelBodyGap />
      <MathSpan value={split.equation} />
    </>
  );
}

function renderMixedBodyInner(text) {
  const input = String(text || "");

  const inlineTask = renderInlineHebrewTaskEquation(input);
  if (inlineTask) {
    return inlineTask;
  }

  const vavRows = splitCommaVavEquationDisplay(input);
  if (vavRows) {
    return vavRows.map((row, i) => (
      <span key={i} className="book-equation-display-row block w-full">
        {renderMixedBodyInnerSingle(row)}
      </span>
    ));
  }

  const commaRows = splitCommaSeparatedFormulaDisplay(input);
  if (commaRows) {
    return commaRows.map((row, i) => (
      <span key={i} className="book-equation-display-row block w-full">
        {renderMixedBodyInnerSingle(row)}
      </span>
    ));
  }

  return renderMixedBodyInnerSingle(input);
}

function renderVavPrefixedMathRow(text) {
  const input = String(text || "").trim();
  const match = input.match(/^(ו-)(\d[\s\S]+)$/u);
  if (!match?.[2]) return null;

  return (
    <MathSpan
      value={`${match[1]}${stripStrayMarkdown(match[2])}`}
      className="book-vav-math-row"
    />
  );
}

function renderMixedBodyInnerSingle(text) {
  const input = String(text || "");
  const vavRow = renderVavPrefixedMathRow(input);
  if (vavRow) {
    return vavRow;
  }

  const hasMarkdown = /[*`_]/.test(input);
  if (hasMarkdown) {
    return renderProseSegment(input, input, "md-");
  }

  return renderUnifiedMixedRuns(input);
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
