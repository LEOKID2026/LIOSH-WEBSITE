/**
 * Re-exports for non-math renderers.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

export { GeometryTextRenderer } from "./GeometryTextRenderer.jsx";
export { GeometryDiagramPrintRenderer } from "./GeometryDiagramPrintRenderer.jsx";
export { HebrewMcqRenderer } from "./HebrewMcqRenderer.jsx";
export { HebrewPassageRenderer } from "./HebrewPassageRenderer.jsx";
export { HebrewLongPassageRenderer } from "./HebrewLongPassageRenderer.jsx";
export { HebrewOpenAnswerRenderer } from "./HebrewOpenAnswerRenderer.jsx";
export { HebrewNikudRenderer } from "./HebrewNikudRenderer.jsx";
export { EnglishMcqRenderer } from "./EnglishMcqRenderer.jsx";
export { EnglishPhonicsRenderer } from "./EnglishPhonicsRenderer.jsx";
export { EnglishLtrBlock } from "./EnglishLtrBlock.jsx";
export { EnglishTranslationRenderer } from "./EnglishTranslationRenderer.jsx";
export { EnglishSentenceRenderer } from "./EnglishSentenceRenderer.jsx";
export { EnglishOpenAnswerRenderer } from "./EnglishOpenAnswerRenderer.jsx";

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function GenericMcqRenderer({ question }) {
  return (
    <div className="worksheet-renderer generic-mcq">
      <p className="worksheet-stem">{question.stemHe}</p>
      <WorksheetOptionsGrid optionsHe={question.optionsHe} />
    </div>
  );
}

export { MathPlainRenderer } from "./MathPlainRenderer.jsx";
export { MathFractionRenderer } from "./MathFractionRenderer.jsx";
export { MathVerticalLayoutRenderer } from "./MathVerticalLayoutRenderer.jsx";
export { MathWordProblemRenderer } from "./MathWordProblemRenderer.jsx";
