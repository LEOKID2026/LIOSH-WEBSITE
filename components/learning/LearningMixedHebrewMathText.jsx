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
  if (runs.length === 1 && runs[0].type === "prose") {
    return (
      <bdi dir="rtl" style={learningProseIsolateStyle}>
        {runs[0].value}
      </bdi>
    );
  }

  return runs.map((run, idx) => {
    if (run.type === "math") {
      return (
        <bdi key={`math-${idx}`} dir="ltr" style={learningMathIsolateStyle}>
          {run.value}
        </bdi>
      );
    }
    return (
      <bdi key={`prose-${idx}`} dir="rtl" style={learningProseIsolateStyle}>
        {run.value}
      </bdi>
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
    <p className={className} style={learningMixedHebrewMathStyle}>
      {renderInlineMixedRuns(text)}
    </p>
  );
}

/**
 * Step-by-step explanation with separate instruction / equation / explanation lines.
 */
export default function LearningMixedHebrewMathText({ text, className = "" }) {
  return renderLearningMixedHebrewMathText(text, className);
}
