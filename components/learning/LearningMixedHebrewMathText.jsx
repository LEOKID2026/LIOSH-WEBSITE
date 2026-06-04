import {
  learningMathBlockStyle,
  learningMathIsolateStyle,
  learningProseBlockStyle,
  learningProseIsolateStyle,
  parseStepExplanationThreeLines,
  splitLearningMixedHebrewMathRuns,
} from "../../utils/learning-mixed-hebrew-math-render";
import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math";

function renderInlineMixedRuns(text) {
  const runs = splitLearningMixedHebrewMathRuns(text);
  if (runs.length === 0) return null;

  return runs.map((run, idx) => {
    if (run.type === "math") {
      return (
        <p key={`math-${idx}`} className="my-1" style={learningMathBlockStyle} dir="ltr">
          {run.value}
        </p>
      );
    }
    return (
      <p key={`prose-${idx}`} className="my-0" style={learningProseBlockStyle} dir="rtl">
        {run.value}
      </p>
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
  const blocks = parseStepExplanationThreeLines(text);
  if (blocks) {
    return renderThreeLineExplanation(blocks, className);
  }

  return (
    <div className={className} style={learningMixedHebrewMathStyle}>
      {renderInlineMixedRuns(text)}
    </div>
  );
}

/**
 * Step-by-step explanation with separate instruction / equation / explanation lines.
 */
export default function LearningMixedHebrewMathText({ text, className = "" }) {
  return renderLearningMixedHebrewMathText(text, className);
}
