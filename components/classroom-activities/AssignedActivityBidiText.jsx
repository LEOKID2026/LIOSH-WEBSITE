import MixedHebrewMathText from "../learning-book/MixedHebrewMathText";
import {
  assignedActivityInlineTextProps,
  assignedActivityTextIsMixedHebrewMath,
} from "../../lib/classroom-activities/assigned-activity-question-display.client.js";

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
