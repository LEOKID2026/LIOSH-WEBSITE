import MixedHebrewMathText from "../learning-book/MixedHebrewMathText";
import {
  assignedActivityInlineTextProps,
  assignedActivityTextIsMixedHebrewMath,
} from "../../lib/classroom-activities/assigned-activity-question-display.client.js";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse.js";
import { renderMaybeStackedFractionText } from "../learning/MathFractionExpression.jsx";

/**
 * Safe bidi rendering for assigned-activity inline strings (choices, answers, previews).
 *
 * @param {{ text: unknown, className?: string, as?: keyof JSX.IntrinsicElements }} props
 */
export default function AssignedActivityBidiText({
  text,
  className = "",
  as: Tag = "span",
}) {
  const value = String(text ?? "");
  if (!value) return null;

  if (hasStackedFractionToken(value)) {
    return (
      <Tag className={className}>
        {renderMaybeStackedFractionText(value, className)}
      </Tag>
    );
  }

  if (assignedActivityTextIsMixedHebrewMath(value)) {
    return (
      <Tag className={className}>
        <MixedHebrewMathText text={value} className={className} />
      </Tag>
    );
  }

  const inlineProps = assignedActivityInlineTextProps(value);
  return (
    <Tag className={className} dir={inlineProps.dir} style={inlineProps.style}>
      {value}
    </Tag>
  );
}
