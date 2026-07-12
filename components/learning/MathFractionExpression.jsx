import { useMemo } from "react";
import {
  hasStackedFractionToken,
  parseMathFractionExpression,
} from "../../utils/math-fraction-expression-parse.js";
import {
  learningMathIsolateStyle,
  learningProseIsolateStyle,
  splitLearningMixedHebrewMathRuns,
} from "../../utils/learning-mixed-hebrew-math-render.js";
import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math.js";
import { unwrapLearningRuns } from "../../lib/learning-book/learning-math-line-build.js";
import { renderLearningMixedHebrewMathText } from "./LearningMixedHebrewMathText";

/**
 * Compact stacked fraction — inherits parent font size; does not resize page layout.
 */
export function FractionDisplay({
  numerator,
  denominator,
  sign = "",
  whole = null,
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center align-middle ${className}`.trim()}
      dir="ltr"
      style={{
        unicodeBidi: "isolate",
        verticalAlign: "middle",
        lineHeight: 1.05,
      }}
      data-testid="math-fraction-display"
    >
      {sign ? <span style={{ lineHeight: 1 }}>{sign}</span> : null}
      {whole != null && String(whole) !== "" ? (
        <span style={{ lineHeight: 1, marginInlineEnd: "0.15em" }}>{whole}</span>
      ) : null}
      <span
        className="inline-flex flex-col items-center justify-center"
        style={{
          verticalAlign: "middle",
          lineHeight: 1,
          paddingInline: "0.12em",
        }}
      >
        <span style={{ lineHeight: 1, fontWeight: 700 }}>{numerator}</span>
        <span
          aria-hidden
          style={{
            display: "block",
            width: "100%",
            minWidth: "0.85em",
            borderTop: "1.5px solid currentColor",
            marginTop: "0.06em",
            marginBottom: "0.06em",
            lineHeight: 0,
          }}
        />
        <span style={{ lineHeight: 1, fontWeight: 700 }}>{denominator}</span>
      </span>
    </span>
  );
}

/**
 * Inline math expression with stacked fractions; plain numbers stay plain.
 */
export function MathFractionExpression({ text, value, className = "" }) {
  const raw = String((text ?? value) ?? "");
  const tokens = useMemo(() => parseMathFractionExpression(raw), [raw]);

  if (!raw) return null;

  if (!hasStackedFractionToken(raw)) {
    return (
      <span
        className={className || undefined}
        dir="ltr"
        style={{ unicodeBidi: "isolate", verticalAlign: "middle" }}
      >
        {raw}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center ${className}`.trim()}
      dir="ltr"
      style={{
        unicodeBidi: "isolate",
        verticalAlign: "middle",
        gap: "0.12em",
        lineHeight: 1.15,
      }}
      data-testid="math-fraction-expression"
    >
      {tokens.map((tok, idx) => {
        if (tok.type === "fraction") {
          return (
            <FractionDisplay
              key={`f-${idx}`}
              sign={tok.sign}
              whole={tok.whole}
              numerator={tok.numerator}
              denominator={tok.denominator}
            />
          );
        }
        if (tok.type === "space") {
          return <span key={`s-${idx}`}>{"\u00a0"}</span>;
        }
        return (
          <span key={`t-${idx}`} style={{ lineHeight: 1, verticalAlign: "middle" }}>
            {tok.value}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Merge "1 " + "7/8" split runs back into a mixed-number math island.
 * @param {{ type: string, value: string }[]} runs
 */
function coalesceMixedNumberRuns(runs) {
  if (!Array.isArray(runs) || runs.length < 2) return runs || [];
  /** @type {{ type: string, value: string }[]} */
  const out = [];
  for (let i = 0; i < runs.length; i += 1) {
    const cur = runs[i];
    const next = runs[i + 1];
    if (
      cur?.type === "prose" &&
      next?.type === "math" &&
      hasStackedFractionToken(next.value) &&
      !/^\d+\s+\d+\s*\/\s*\d+/.test(String(next.value).trim())
    ) {
      const m = String(cur.value).match(/^(.*?)(\d+)\s+$/);
      if (m) {
        const head = m[1];
        const whole = m[2];
        if (head) out.push({ type: "prose", value: head });
        out.push({ type: "math", value: `${whole} ${String(next.value).trim()}` });
        i += 1;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}

/** Render a single math/prose string fragment with stacked fractions when needed. */
export function renderStackedFractionFragment(text) {
  if (text == null) return text;
  const raw = String(text);
  if (!raw) return raw;
  if (!hasStackedFractionToken(raw)) return raw;
  if (/[\u0590-\u05FF]/.test(raw)) return renderMathFractionAwareText(raw);
  return <MathFractionExpression text={raw} />;
}

/**
 * Hebrew prose + stacked fractions only inside math runs.
 */
export function renderMathFractionAwareText(text, className = "") {
  if (text == null) return null;
  const raw = String(text);
  if (!hasStackedFractionToken(raw)) {
    return (
      <span className={className || undefined} style={learningMixedHebrewMathStyle}>
        {raw}
      </span>
    );
  }

  if (!/[\u0590-\u05FF]/.test(raw)) {
    return <MathFractionExpression text={raw} className={className} />;
  }

  const runs = coalesceMixedNumberRuns(splitLearningMixedHebrewMathRuns(raw));
  if (!runs.length) {
    return <MathFractionExpression text={raw} className={className} />;
  }

  return (
    <span className={className || undefined} style={learningMixedHebrewMathStyle}>
      {runs.map((run, idx) => {
        if (run.value === "\n") return <br key={`nl-${idx}`} />;
        if (run.type === "math") {
          if (hasStackedFractionToken(run.value)) {
            return <MathFractionExpression key={`math-${idx}`} text={run.value} />;
          }
          return (
            <span key={`math-${idx}`} style={learningMathIsolateStyle} dir="ltr">
              {run.value}
            </span>
          );
        }
        if (hasStackedFractionToken(run.value)) {
          return (
            <span key={`prose-${idx}`} style={learningProseIsolateStyle} dir="rtl">
              {renderStackedFractionFragment(run.value)}
            </span>
          );
        }
        return (
          <span key={`prose-${idx}`} style={learningProseIsolateStyle} dir="rtl">
            {run.value}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Same outer structure as renderLearningMathRuns, but math (and fraction-bearing prose)
 * use stacked fraction display.
 * @param {{ type: string, value: string }[]} runs
 * @param {string} [className]
 */
export function renderLearningMathRunsWithStackedFractions(runs, className = "") {
  if (!runs?.length) return null;

  return (
    <div className={className || undefined} style={learningMixedHebrewMathStyle}>
      {runs.map((run, idx) => {
        if (run.value === "\n") return <br key={`nl-${idx}`} />;
        if (run.type === "math") {
          return (
            <span key={`math-${idx}`} style={learningMathIsolateStyle} dir="ltr">
              {hasStackedFractionToken(run.value) ? (
                <MathFractionExpression text={run.value} />
              ) : (
                run.value
              )}
            </span>
          );
        }
        return (
          <span key={`prose-${idx}`} style={learningProseIsolateStyle} dir="rtl">
            {hasStackedFractionToken(run.value)
              ? renderStackedFractionFragment(run.value)
              : run.value}
          </span>
        );
      })}
    </div>
  );
}

/** Drop-in text node: stacked fractions when present, otherwise original string/node. */
export function renderMaybeStackedFractionText(text, className = "") {
  if (text == null || text === "") return text;
  if (typeof text !== "string") return text;
  if (!hasStackedFractionToken(text)) {
    return className ? <span className={className}>{text}</span> : text;
  }
  if (/[\u0590-\u05FF]/.test(text)) return renderMathFractionAwareText(text, className);
  return <MathFractionExpression text={text} className={className} />;
}

/**
 * Math-master / step text entrypoint: strings, __learningRuns, or run arrays.
 * Falls back to the existing mixed Hebrew/math renderer when no fractions.
 */
export function renderMaybeStackedFractionOrMixed(text, className = "") {
  const unwrapped = unwrapLearningRuns(text);
  if (unwrapped.length) {
    const hasFrac = unwrapped.some((run) => hasStackedFractionToken(run?.value));
    if (hasFrac) {
      return renderLearningMathRunsWithStackedFractions(
        coalesceMixedNumberRuns(unwrapped),
        className
      );
    }
    return renderLearningMixedHebrewMathText(text, className);
  }

  if (typeof text === "string" && hasStackedFractionToken(text)) {
    return renderMaybeStackedFractionText(text, className);
  }

  return renderLearningMixedHebrewMathText(text, className);
}

export default MathFractionExpression;
