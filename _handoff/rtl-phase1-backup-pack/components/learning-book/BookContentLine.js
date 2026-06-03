import MixedHebrewMathText from "./MixedHebrewMathText";
import BookExampleTitleLine from "./BookExampleTitleLine";
import BookPlaceValueEquation from "./BookPlaceValueEquation";
import BookVerticalArithmetic from "./BookVerticalArithmetic";
import { classifyBookLine } from "../../lib/learning-book/book-line-classifier";

/**
 * Book-only line dispatcher. Unrecognized lines fall back to MixedHebrewMathText unchanged.
 * @param {{ text: string, context?: 'prose'|'diagram'|'diagram_block' }} props
 */
export default function BookContentLine({ text, context = "prose" }) {
  const kind = classifyBookLine(text, { context });

  if (kind === "example_title") {
    return <BookExampleTitleLine text={text} />;
  }
  if (kind === "place_value_equation") {
    return <BookPlaceValueEquation text={text} />;
  }
  if (kind === "vertical_arithmetic_block") {
    return <BookVerticalArithmetic content={text} />;
  }

  return <MixedHebrewMathText text={text} />;
}
