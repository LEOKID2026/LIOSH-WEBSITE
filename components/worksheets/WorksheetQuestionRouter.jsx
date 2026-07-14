/**
 * Route printable worksheet questions to subject renderers.
 */

import {
  EnglishMcqRenderer,
  EnglishOpenAnswerRenderer,
  EnglishPhonicsRenderer,
  EnglishSentenceRenderer,
  EnglishTranslationRenderer,
  GenericMcqRenderer,
  GeometryDiagramPrintRenderer,
  GeometryTextRenderer,
  HebrewLongPassageRenderer,
  HebrewMcqRenderer,
  HebrewNikudRenderer,
  HebrewOpenAnswerRenderer,
  HebrewPassageRenderer,
  MathFractionRenderer,
  MathPlainRenderer,
  MathVerticalLayoutRenderer,
  MathWordProblemRenderer,
} from "./renderers/WorksheetRenderers.jsx";

/**
 * @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export default function WorksheetQuestionRouter({ question }) {
  const { questionType, subject } = question;

  if (questionType === "word_problem") {
    return <MathWordProblemRenderer question={question} />;
  }
  if (questionType === "fraction") return <MathFractionRenderer question={question} />;
  if (questionType === "vertical_math") {
    return <MathVerticalLayoutRenderer question={question} />;
  }
  if (questionType === "diagram_mcq") {
    return <GeometryDiagramPrintRenderer question={question} />;
  }
  if (questionType === "passage_mcq") {
    if (subject === "hebrew") {
      if (question.longPassage) {
        return <HebrewLongPassageRenderer question={question} />;
      }
      return <HebrewPassageRenderer question={question} />;
    }
    return <GenericMcqRenderer question={question} />;
  }
  if (questionType === "translation") {
    return <EnglishTranslationRenderer question={question} />;
  }
  if (questionType === "open") {
    // Geometry open compute may still include a diagram.
    if (subject === "geometry") {
      if (question.diagramSpec) {
        return <GeometryDiagramPrintRenderer question={question} />;
      }
      return <GeometryTextRenderer question={question} />;
    }
    // Open writing always needs lines — even when nikud styling applies.
    if (subject === "hebrew") return <HebrewOpenAnswerRenderer question={question} />;
    if (subject === "english") return <EnglishOpenAnswerRenderer question={question} />;
    return <MathPlainRenderer question={question} />;
  }
  if (questionType === "mcq") {
    if (subject === "english") {
      if (question.englishPhonicsMode) return <EnglishPhonicsRenderer question={question} />;
      if (question.englishSentenceMode) return <EnglishSentenceRenderer question={question} />;
      return <EnglishMcqRenderer question={question} />;
    }
    if (subject === "geometry") return <GeometryTextRenderer question={question} />;
    if (subject === "hebrew") {
      if (question.hasNikud) return <HebrewNikudRenderer question={question} />;
      return <HebrewMcqRenderer question={question} />;
    }
    return <MathPlainRenderer question={question} />;
  }

  if (subject === "geometry") return <GeometryTextRenderer question={question} />;
  if (subject === "math") return <MathPlainRenderer question={question} />;
  return <GenericMcqRenderer question={question} />;
}
