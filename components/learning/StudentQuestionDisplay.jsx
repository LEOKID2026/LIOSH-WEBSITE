import {
  resolveStudentQuestionDisplayParts,
  isLikelyVerbalInstruction,
} from "../../utils/student-question-display";
import {
  getCompactEquationFontStyle,
  getQuestionFontStyle,
  getVerbalInstructionStyle,
  getVerbalPassageStyle,
  getVerbalFinalQuestionStyle,
  getVerbalSingleStyle,
  getVerbalFinalQuestionPanelClassName,
  getVerbalFinalQuestionPanelStyle,
  isVerbalQuestionBodyKind,
} from "../../utils/learning-question-font";
import { resolveVerbalQuestionHierarchy } from "../../utils/verbal-question-hierarchy.client";
import { useMobileViewport } from "../../hooks/useMobileViewport";
import { renderLearningMixedHebrewMathText } from "./LearningMixedHebrewMathText";
import { learningProseIsolateStyle } from "../../utils/learning-mixed-hebrew-math-render";
import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math";

const proseBlockClass =
  "block max-w-full text-center break-words overflow-wrap-anywhere";

/** Layout-only classes for verbal hierarchy — no subject text color/size overrides. */
const VERBAL_INSTRUCTION_CLASS =
  "text-center break-words overflow-wrap-anywhere max-w-full px-2 w-full";
const VERBAL_PASSAGE_CLASS =
  "text-center break-words overflow-wrap-anywhere max-w-full px-2 w-full mx-auto";

/**
 * Student-facing question: instruction (RTL) + body (LTR for equations/formulas).
 * Verbal reading questions use a 3-tier hierarchy when structure is clear.
 */
export default function StudentQuestionDisplay({
  question,
  questionLabel,
  exerciseText,
  testId,
  leadClassName = "text-2xl text-center text-white mb-2 break-words overflow-wrap-anywhere max-w-full px-2",
  bodyClassName = "text-4xl text-center text-white font-bold max-w-full px-2",
  formulaClassName = "text-center text-white font-bold font-mono max-w-full px-2 py-1 leading-snug",
  wrapperClassName = "w-full flex flex-col items-center justify-center gap-2 max-w-full",
  leadStyle,
  bodyStyle,
  getQuestionFontStyle: getQuestionFontStyleProp,
  getEquationFontStyle = getCompactEquationFontStyle,
  resolveVerbalSingleStyle: resolveVerbalSingleStyleProp,
  /** Optional body text color only — no other typography changes. */
  bodyTextColor,
}) {
  const isMobileViewport = useMobileViewport();
  const resolveQuestionFontStyle = getQuestionFontStyleProp || getQuestionFontStyle;
  const resolveVerbalSingleStyle =
    resolveVerbalSingleStyleProp || getVerbalSingleStyle;
  const bodyColorOnly = bodyTextColor ? { color: bodyTextColor } : null;

  const parts = resolveStudentQuestionDisplayParts({
    question,
    questionLabel,
    exerciseText,
  });

  const hierarchy = isVerbalQuestionBodyKind(parts.bodyKind)
    ? resolveVerbalQuestionHierarchy({
        question,
        questionLabel,
        exerciseText,
        leadText: parts.leadText,
        bodyText: parts.bodyText,
        bodyKind: parts.bodyKind,
      })
    : null;

  const fontLead = parts.leadText
    ? {
        ...(resolveQuestionFontStyle?.({ text: parts.leadText, kind: "label" }) || {}),
      }
    : {};

  const isVerbalBody = parts.bodyText && isVerbalQuestionBodyKind(parts.bodyKind);

  const fontBody = parts.bodyText
    ? parts.bodyKind === "equation" || parts.bodyKind === "mixed"
      ? getEquationFontStyle?.({ text: parts.bodyText }) ||
        resolveQuestionFontStyle?.({ text: parts.bodyText }) ||
        {}
      : {
          ...(isMobileViewport
            ? {}
            : resolveQuestionFontStyle?.({ text: parts.bodyText }) || {}),
        }
    : {};

  const isEquation =
    parts.bodyKind === "equation" ||
    (parts.bodyKind === "mixed" && /[=×÷+\-*/()]/.test(parts.bodyText));
  const isSplit = Boolean(parts.leadText && parts.bodyText);

  const verbalClassName = bodyClassName;
  const hierarchyInstructionClass = VERBAL_INSTRUCTION_CLASS;
  const hierarchyPassageClass = VERBAL_PASSAGE_CLASS;
  const useVerbalHierarchyPath =
    isVerbalQuestionBodyKind(parts.bodyKind) && hierarchy != null;
  const showVerbalHierarchy = hierarchy?.mode === "hierarchy";
  const showVerbalSingle =
    hierarchy?.mode === "single" && Boolean(hierarchy.text);

  const instructionLeadOnly =
    parts.leadText &&
    parts.bodyText &&
    !isVerbalQuestionBodyKind(parts.bodyKind);

  const verbalInstructionLead =
    parts.leadText &&
    isVerbalBody &&
    isLikelyVerbalInstruction(parts.leadText.replace(/:$/, ""));

  return (
    <div
      data-testid={testId}
      className={wrapperClassName}
      data-display-split={isSplit ? "true" : "false"}
      data-body-kind={parts.bodyKind}
      data-verbal-hierarchy={showVerbalHierarchy ? "true" : "false"}
    >
      {useVerbalHierarchyPath && showVerbalHierarchy ? (
        <>
          {hierarchy.instruction ? (
            <p
              data-testid="student-question-instruction"
              className={`${hierarchyInstructionClass} max-md:mb-1 mb-1.5`.trim()}
              dir="rtl"
              style={{
                direction: "rtl",
                unicodeBidi: "isolate",
                ...getVerbalInstructionStyle({
                  text: hierarchy.instruction,
                  isMobileViewport,
                }),
              }}
            >
              {hierarchy.instruction}
            </p>
          ) : null}

          {hierarchy.passage ? (
            <p
              data-testid="student-question-passage"
              className={`${hierarchyPassageClass} max-md:mb-2 mb-2`.trim()}
              dir="rtl"
              style={{
                direction: "rtl",
                unicodeBidi: "isolate",
                ...learningProseIsolateStyle,
                ...getVerbalPassageStyle({
                  text: hierarchy.passage,
                  isMobileViewport,
                }),
                ...bodyColorOnly,
              }}
            >
              {hierarchy.passage}
            </p>
          ) : null}

          {hierarchy.finalQuestion ? (
            <div
              data-testid="student-question-final"
              className={`${getVerbalFinalQuestionPanelClassName()} max-md:mt-1 mt-1.5`.trim()}
              dir="rtl"
              style={getVerbalFinalQuestionPanelStyle()}
            >
              <p
                className="m-0"
                style={{
                  direction: "rtl",
                  unicodeBidi: "isolate",
                  ...learningProseIsolateStyle,
                  ...getVerbalFinalQuestionStyle({
                    text: hierarchy.finalQuestion,
                    isMobileViewport,
                  }),
                }}
              >
                {hierarchy.finalQuestion}
              </p>
            </div>
          ) : null}
        </>
      ) : useVerbalHierarchyPath && showVerbalSingle ? (
        <p
          data-testid="student-question-body"
          className={verbalClassName}
          dir="rtl"
          style={{
            direction: "rtl",
            unicodeBidi: "isolate",
            ...learningProseIsolateStyle,
            ...bodyStyle,
            ...resolveVerbalSingleStyle({
              text: hierarchy.text,
              isMobileViewport,
              className: verbalClassName,
            }),
            ...bodyColorOnly,
          }}
        >
          {hierarchy.text}
        </p>
      ) : (
        <>
          {parts.leadText ? (
            <p
              data-testid="student-question-lead"
              className={leadClassName}
              dir="rtl"
              style={{
                direction: "rtl",
                unicodeBidi: "isolate",
                ...fontLead,
                ...leadStyle,
                ...(instructionLeadOnly || verbalInstructionLead
                  ? getVerbalInstructionStyle({
                      text: parts.leadText,
                      isMobileViewport,
                      className: leadClassName,
                    })
                  : isVerbalBody && !parts.bodyText
                    ? resolveVerbalSingleStyle({
                        text: parts.leadText,
                        isMobileViewport,
                        className: leadClassName,
                      })
                    : {}),
              }}
            >
              {parts.leadText}
            </p>
          ) : null}

          {parts.bodyText ? (
            parts.bodyKind === "mixed" ? (
              <div
                data-testid="student-question-body"
                className={`w-full max-w-full flex justify-center overflow-visible ${bodyClassName} break-words`}
                style={{
                  ...learningMixedHebrewMathStyle,
                  ...fontBody,
                  ...bodyStyle,
                  ...bodyColorOnly,
                }}
              >
                {renderLearningMixedHebrewMathText(parts.bodyText)}
              </div>
            ) : (
              <div
                data-testid="student-question-body"
                className={`w-full max-w-full flex justify-center overflow-visible ${
                  isEquation ? formulaClassName : `${bodyClassName} break-words`
                }`}
                dir={isEquation ? "ltr" : "rtl"}
                style={{
                  direction: isEquation ? "ltr" : "rtl",
                  unicodeBidi: "isolate",
                  ...fontBody,
                  ...bodyStyle,
                  ...(isVerbalBody
                    ? verbalInstructionLead
                      ? getVerbalPassageStyle({
                          text: parts.bodyText,
                          isMobileViewport,
                          className: bodyClassName,
                        })
                      : resolveVerbalSingleStyle({
                          text: parts.bodyText,
                          isMobileViewport,
                          className: bodyClassName,
                        })
                    : {}),
                  ...bodyColorOnly,
                }}
              >
                <span
                  className={
                    isEquation
                      ? "inline-block max-w-full text-center whitespace-normal [word-spacing:normal] [letter-spacing:normal]"
                      : proseBlockClass
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
                      : learningProseIsolateStyle
                  }
                >
                  {parts.bodyText}
                </span>
              </div>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
