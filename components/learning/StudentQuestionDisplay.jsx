import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display";
import { getCompactEquationFontStyle } from "../../utils/learning-question-font";

/**
 * Student-facing question: instruction (RTL) + body (LTR for equations/formulas).
 * No horizontal scroll — compact inline exercise lines with safe wrap.
 */
export default function StudentQuestionDisplay({
  question,
  questionLabel,
  exerciseText,
  testId,
  leadClassName = "text-2xl text-center text-white mb-2 break-words overflow-wrap-anywhere max-w-full px-2",
  bodyClassName = "text-4xl text-center text-white font-bold max-w-full px-2",
  formulaClassName = "text-center text-white font-bold font-mono max-w-full px-2 py-1 leading-snug",
  wrapperClassName = "w-full flex flex-col items-center justify-center gap-1",
  leadStyle,
  bodyStyle,
  getQuestionFontStyle,
  getEquationFontStyle = getCompactEquationFontStyle,
}) {
  const parts = resolveStudentQuestionDisplayParts({
    question,
    questionLabel,
    exerciseText,
  });

  const fontLead =
    getQuestionFontStyle?.({ text: parts.leadText, kind: "label" }) || {};
  const fontBody = parts.bodyText
    ? parts.bodyKind === "equation" || parts.bodyKind === "mixed"
      ? getEquationFontStyle?.({ text: parts.bodyText }) ||
        getQuestionFontStyle?.({ text: parts.bodyText }) ||
        {}
      : getQuestionFontStyle?.({ text: parts.bodyText }) || {}
    : {};

  const isEquation =
    parts.bodyKind === "equation" ||
    (parts.bodyKind === "mixed" && /[=×÷+\-*/()]/.test(parts.bodyText));
  const isSplit = Boolean(parts.leadText && parts.bodyText);

  return (
    <div
      data-testid={testId}
      className={wrapperClassName}
      data-display-split={isSplit ? "true" : "false"}
      data-body-kind={parts.bodyKind}
    >
      {parts.leadText ? (
        <p
          data-testid="student-question-lead"
          className={leadClassName}
          dir="rtl"
          style={{
            direction: "rtl",
            unicodeBidi: "plaintext",
            ...fontLead,
            ...leadStyle,
          }}
        >
          {parts.leadText}
        </p>
      ) : null}

      {parts.bodyText ? (
        <div
          data-testid="student-question-body"
          className={`w-full max-w-full flex justify-center overflow-visible ${
            isEquation ? formulaClassName : `${bodyClassName} break-words`
          }`}
          dir={isEquation ? "ltr" : "auto"}
          style={{
            direction: isEquation ? "ltr" : undefined,
            unicodeBidi: isEquation ? "isolate" : "plaintext",
            ...fontBody,
            ...bodyStyle,
          }}
        >
          <span
            className={
              isEquation
                ? "inline-block max-w-full text-center whitespace-normal [word-spacing:normal] [letter-spacing:normal]"
                : "block max-w-full text-center break-words overflow-wrap-anywhere"
            }
            style={
              isEquation
                ? {
                    direction: "ltr",
                    unicodeBidi: "isolate",
                    textAlign: "center",
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                  }
                : undefined
            }
          >
            {parts.bodyText}
          </span>
        </div>
      ) : null}
    </div>
  );
}