/**
 * Open-answer line for printable math cards.
 */

export default function WorksheetMathAnswerLine() {
  return (
    <div className="worksheet-math-answer-line">
      <span className="worksheet-math-answer-line-label">תשובה:</span>
      <span className="worksheet-math-answer-line-blank" aria-hidden="true" />
    </div>
  );
}
