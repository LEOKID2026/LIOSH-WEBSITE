import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display";

/**
 * Student-facing question: instruction (RTL) + body (LTR for equations/formulas).
 */
export default function StudentQuestionDisplay({
  question,
  questionLabel,
  exerciseText,
  testId,
  leadClassName = "text-2xl text-center text-white mb-2 break-words overflow-wrap-anywhere max-w-full px-2",
  bodyClassName = "text-4xl text-center text-white font-bold max-w-full px-2",
  formulaClassName = "text-3xl md:text-4xl text-center text-white font-bold font-mono max-w-full px-2 py-1",
  wrapperClassName = "w-full flex flex-col items-center justify-center gap-1",
  leadStyle,
  bodyStyle,
  getQuestionFontStyle,
}) {
  const parts = resolveStudentQuestionDisplayParts({
    question,
    questionLabel,
    exerciseText,
  });

  const fontLead =
    getQuestionFontStyle?.({ text: parts.leadText, kind: "label" }) || {};
  const fontBody =
    getQuestionFontStyle?.({ text: parts.bodyText }) || {};

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
          className={
            isEquation
              ? `w-full max-w-full overflow-x-auto flex justify-center ${formulaClassName}`
              : `w-full flex justify-center ${bodyClassName} break-words overflow-wrap-anywhere`
          }
          dir={isEquation ? "ltr" : "auto"}
          style={{
            direction: isEquation ? "ltr" : undefined,
            unicodeBidi: isEquation ? "isolate" : "plaintext",
            whiteSpace: isEquation ? "nowrap" : undefined,
            ...fontBody,
            ...bodyStyle,
          }}
        >
          {parts.bodyText}
        </div>
      ) : null}
    </div>
  );
}
