import MixedHebrewMathText from "./MixedHebrewMathText";
import BookExampleTitleLine from "./BookExampleTitleLine";
import BookPlaceValueEquation from "./BookPlaceValueEquation";
import BookVerticalArithmetic from "./BookVerticalArithmetic";
import { classifyBookLine } from "../../lib/learning-book/book-line-classifier";
import { canonicalizePlaceValueDecomposition } from "../../lib/learning-book/place-value-equation-order";

/**
 * Book-only line dispatcher. Unrecognized lines fall back to MixedHebrewMathText unchanged.
 * @param {{ text: string, context?: 'prose'|'diagram'|'diagram_block' }} props
 */
export default function BookContentLine({ text, context = "prose" }) {
  const normalized = canonicalizePlaceValueDecomposition(String(text || ""));
  const kind = classifyBookLine(normalized, { context });

  if (kind === "example_title") {
    return <BookExampleTitleLine text={normalized} />;
  }
  if (kind === "place_value_equation") {
    return <BookPlaceValueEquation text={normalized} />;
  }
  if (kind === "vertical_arithmetic_block") {
    return <BookVerticalArithmetic content={normalized} />;
  }

  return <MixedHebrewMathText text={normalized} diagramLayout={context === "diagram"} />;
}
