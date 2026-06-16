import {
  learningMathBlockStyle,
  learningMathIsolateStyle,
  learningProseBlockStyle,
  learningProseIsolateStyle,
  parseStepExplanationThreeLines,
  splitLearningMixedHebrewMathRuns,
} from "../../utils/learning-mixed-hebrew-math-render";
import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math";
import {
  renderLearningMathLine,
  renderLearningMathRuns,
} from "../../utils/learning-math-line-render.js";
import { unwrapLearningRuns } from "../../lib/learning-book/learning-math-line-build.js";

export { renderLearningMathRuns, renderLearningMathLine };

function renderInlineMixedRuns(text) {
  const runs = splitLearningMixedHebrewMathRuns(text);
  if (runs.length === 0) return null;

  return runs.map((run, idx) => {
    if (run.value === "\n") {
      return <br key={`nl-${idx}`} />;
    }
    if (run.type === "math") {
      return (
        <span key={`math-${idx}`} style={learningMathIsolateStyle} dir="ltr">
          {run.value}
        </span>
      );
    }
    return (
      <span key={`prose-${idx}`} style={learningProseIsolateStyle} dir="rtl">
        {run.value}
      </span>
    );
  });
}

function renderThreeLineExplanation(blocks, className) {
  return (
    <div style={learningMixedHebrewMathStyle}>
      <p className={className} style={learningProseBlockStyle}>
        {blocks.instruction}
      </p>
      <p className={className} style={learningMathBlockStyle} dir="ltr">
        {blocks.equation}
      </p>
      {blocks.explanation ? (
        <p className={className} style={learningProseBlockStyle}>
          {blocks.explanation}
        </p>
      ) : null}
    </div>
  );
}

/**
 * @param {string|null|undefined} text
 * @param {string} [className]
 * @returns {import("react").ReactNode}
 */
export function renderLearningMixedHebrewMathText(text, className = "") {
  if (Array.isArray(text)) {
    return renderLearningMathRuns(text, className);
  }

  const unwrapped = unwrapLearningRuns(text);
  if (unwrapped.length) {
    return renderLearningMathRuns(unwrapped, className);
  }

  const blocks = parseStepExplanationThreeLines(text);
  if (blocks) {
    return renderThreeLineExplanation(blocks, className);
  }

  return renderLearningMathLine(text, className);
}

/**
 * Step-by-step explanation with separate instruction / equation / explanation lines.
 */
export default function LearningMixedHebrewMathText({ text, className = "" }) {
  return renderLearningMixedHebrewMathText(text, className);
}
