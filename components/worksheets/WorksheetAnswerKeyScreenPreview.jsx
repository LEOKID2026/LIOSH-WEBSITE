/**
 * Wide on-site answer key preview — visible on screen only.
 */

import WorksheetScreenHeader from "./WorksheetScreenHeader.jsx";
import WorksheetAnswerKeyList from "./WorksheetAnswerKeyList.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   answerKeyPayload: import("../../lib/worksheets/worksheet-question-types.js").AnswerKeyPayload,
 * }} props
 */
export default function WorksheetAnswerKeyScreenPreview({ answerKeyPayload }) {
  const { meta, answers } = answerKeyPayload;

  return (
    <div className="worksheet-screen-preview" aria-label="תצוגה מקדימה - דף תשובות">
      <WorksheetScreenHeader titleHe={WORKSHEET_UI_HE.answerKeyTitle} meta={meta} variant="answer-key" />
      <WorksheetAnswerKeyList answers={answers} mode="screen" />
    </div>
  );
}
