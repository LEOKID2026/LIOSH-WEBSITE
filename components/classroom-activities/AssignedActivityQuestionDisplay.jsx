import StudentQuestionDisplay from "../learning/StudentQuestionDisplay.jsx";
import { extractAssignedActivityQuestionFields } from "../../lib/classroom-activities/assigned-activity-question-display.client.js";
import {
  getStudentActivityEquationFontStyle,
  getStudentActivityQuestionFontStyle,
} from "../../lib/classroom-activities/student-activity-question-ui.client.js";
import { STUDENT_ACTIVITY_LAYOUT } from "../../lib/classroom-activities/student-activity-layout.client.js";

const COMPACT_CLASSES_DARK = {
  leadClassName:
    "text-sm text-center text-white/90 mb-1 break-words overflow-wrap-anywhere max-w-full",
  bodyClassName: "text-sm text-center text-white font-semibold max-w-full break-words",
  formulaClassName:
    "text-sm text-center text-white font-bold font-mono max-w-full leading-snug",
  wrapperClassName: "w-full flex flex-col items-stretch justify-start gap-0.5",
};

const PREVIEW_CLASSES_DARK = {
  leadClassName:
    "text-sm text-white/80 mb-0.5 break-words overflow-wrap-anywhere max-w-full text-right",
  bodyClassName: "text-sm text-white/95 font-medium max-w-full break-words text-right",
  formulaClassName:
    "text-sm text-white/95 font-bold font-mono max-w-full leading-snug text-center",
  wrapperClassName: "inline-flex flex-col items-stretch gap-0.5 max-w-full",
};

const COMPACT_CLASSES_LIGHT = {
  leadClassName:
    "text-sm text-center text-slate-600 mb-1 break-words overflow-wrap-anywhere max-w-full",
  bodyClassName: "text-sm text-center text-slate-900 font-semibold max-w-full break-words",
  formulaClassName:
    "text-sm text-center text-slate-900 font-bold font-mono max-w-full leading-snug",
  wrapperClassName: "w-full flex flex-col items-stretch justify-start gap-0.5",
};

const PREVIEW_CLASSES_LIGHT = {
  leadClassName:
    "text-sm text-slate-600 mb-0.5 break-words overflow-wrap-anywhere max-w-full text-right",
  bodyClassName: "text-sm text-slate-900 font-medium max-w-full break-words text-right",
  formulaClassName:
    "text-sm text-slate-900 font-bold font-mono max-w-full leading-snug text-center",
  wrapperClassName: "inline-flex flex-col items-stretch gap-0.5 max-w-full",
};

/**
 * Shared assigned-activity question rendering with safe Hebrew RTL + math LTR isolation.
 *
 * @param {{
 *   question: string | Record<string, unknown> | null | undefined,
 *   variant?: "compact" | "preview" | "stage",
 *   tone?: "dark" | "light",
 *   testId?: string,
 *   className?: string,
 * }} props
 */
export default function AssignedActivityQuestionDisplay({
  question,
  variant = "compact",
  tone = "dark",
  testId,
  className = "",
}) {
  const fields = extractAssignedActivityQuestionFields(question);

  if (variant === "stage") {
    const L = STUDENT_ACTIVITY_LAYOUT;
    return (
      <div className={className}>
        <StudentQuestionDisplay
          {...fields}
          testId={testId}
          leadClassName={L.questionLead}
          bodyClassName={L.questionBody}
          formulaClassName={L.questionFormula}
          wrapperClassName="w-full flex flex-col items-center justify-center gap-1 overflow-visible"
          getQuestionFontStyle={getStudentActivityQuestionFontStyle}
          getEquationFontStyle={getStudentActivityEquationFontStyle}
        />
      </div>
    );
  }

  const isLight = tone === "light";
  const classes =
    variant === "preview"
      ? isLight
        ? PREVIEW_CLASSES_LIGHT
        : PREVIEW_CLASSES_DARK
      : isLight
        ? COMPACT_CLASSES_LIGHT
        : COMPACT_CLASSES_DARK;

  return (
    <div className={className}>
      <StudentQuestionDisplay
        {...fields}
        testId={testId}
        {...classes}
        getQuestionFontStyle={getStudentActivityQuestionFontStyle}
        getEquationFontStyle={getStudentActivityEquationFontStyle}
      />
    </div>
  );
}
