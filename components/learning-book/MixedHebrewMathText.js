import { Fragment } from "react";
import {
  bookLabelBodyGapStyle,
  bookLabelIsolateStyle,
  bookMathIsolateStyle,
  bookProseIsolateStyle,
  isFullEquationLine,
  isMathLikeText,
  stripTrailingEquationPeriod,
} from "../../lib/learning-book/book-math-display";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs";
import { parseTemplateRuns } from "../../lib/learning-book/learning-math-line-templates";
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
  const display = stripTrailingEquationPeriod(stripStrayMarkdown(value).trim());

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
  if (!runs.length) return input;
  const leadingSpace =
    /^\s+/.test(input) && !/^\s/.test(runs[0]?.value || "")
      ? input.match(/^\s+/)?.[0] || ""
      : "";
  const trailingSpace =
    /\s+$/.test(input) && !/\s$/.test(runs[runs.length - 1]?.value || "")
      ? input.match(/\s+$/)?.[0] || ""
      : "";

  const nodes = runs.map((run, i) => {
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
  if (leadingSpace) nodes.unshift(<Fragment key={`${keyPrefix}leading-space`}>{leadingSpace}</Fragment>);
  if (trailingSpace) nodes.push(<Fragment key={`${keyPrefix}trailing-space`}>{trailingSpace}</Fragment>);
  return nodes;
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
        <strong className="font-bold text-[color:var(--book-text)]">
          <MathSpan value={value} />
        </strong>
      );
    }
    return (
      <strong className="font-bold text-[color:var(--book-text)]">
        {content}
      </strong>
    );
  }

  if (type === "italic") {
    return (
      <em className="text-[color:var(--book-text-muted)]">
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
  // Only a real vav-prefixed equation, not a sentence that happens to start "ו-2 …".
  const body = stripStrayMarkdown(match[2]);
  if (/[\u0590-\u05FF]+\s+[\u0590-\u05FF]+/u.test(body)) return null;

  return (
    <MathSpan
      value={`${match[1]}${body}`}
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

  const stripped = stripStrayMarkdown(input);
  const strippedIsMathLine =
    isFullEquationLine(stripped) ||
    (isMathLikeText(stripped) && !HEBREW_CHAR.test(stripped));
  if (strippedIsMathLine || parseTemplateRuns(stripped) || parseTemplateRuns(input)) {
    return renderUnifiedMixedRuns(stripped);
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
      className="book-line-label inline font-bold text-[color:var(--book-text)]"
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
      style={bookLabelBodyGapStyle}
      data-book-label-gap="true"
    >
      {"\u00a0"}
    </span>
  );
}

function DiagramLabelSpacer() {
  return (
    <>
      <span aria-hidden="true" className="inline-block w-[3rem] shrink-0" />
      <span aria-hidden="true" className="inline-block w-[0.25em] shrink-0" />
    </>
  );
}

function DiagramBodySlot({ children }) {
  return (
    <span
      className="book-diagram-body-slot min-w-0 flex-1 [margin-inline-start:0.15em]"
      data-book-diagram-body="true"
    >
      {children}
    </span>
  );
}

function wrapDiagramBody(content, diagramLayout) {
  if (!diagramLayout) return content;
  return <DiagramBodySlot>{content}</DiagramBodySlot>;
}

function renderLabelWithBody(label, body, diagramLayout = false) {
  const normalizedBody = stripTrailingEquationPeriod(String(body || "").trim());
  return (
    <>
      <BookLineLabel label={label} />
      <LabelBodyGap />
      {wrapDiagramBody(renderMixedBodyInner(normalizedBody), diagramLayout)}
    </>
  );
}

/**
 * Render Hebrew text with math isolated first, then markdown in prose segments.
 * @param {{ text: string, className?: string, diagramLayout?: boolean }} props
 */
export default function MixedHebrewMathText({ text, className = "", diagramLayout = false }) {
  const input = String(text || "");
  const structure = parseBookLineStructure(input);

  if (structure?.label) {
    return (
      <MixedLineBody
        className={`book-mixed-hebrew-math book-structured-line ${className}`.trim()}
      >
        {structure.body
          ? renderLabelWithBody(structure.label, structure.body, diagramLayout)
          : <BookLineLabel label={structure.label} />}
      </MixedLineBody>
    );
  }

  const clauses = splitMixedBodyClauses(input);
  if (clauses.length <= 1) {
    return (
      <MixedLineBody className={`book-mixed-hebrew-math ${className}`.trim()}>
        {diagramLayout ? (
          <>
            <DiagramLabelSpacer />
            {wrapDiagramBody(renderMixedBodyInner(input), true)}
          </>
        ) : (
          renderMixedBodyInner(input)
        )}
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
              ? renderLabelWithBody(sub.label, sub.body, diagramLayout)
              : diagramLayout ? (
                <>
                  <DiagramLabelSpacer />
                  {wrapDiagramBody(renderMixedBodyInner(sub?.body ?? clause), true)}
                </>
              ) : (
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
