import {
  STUDENT_THEME_BRIGHT,
  STUDENT_THEME_CLASSIC,
  isStudentThemeBright,
} from "./student-theme-preference.client.js";
import {
  STUDENT_BRIGHT,
  LEARNING_PAGE_SHELL,
  SUBJECT_HUB_CARD,
  SUBJECT_ACCENT_BAR,
} from "./student-bright-theme.client.js";
import {
  STUDENT_CLASSIC,
  CLASSIC_LEARNING_PAGE_SHELL,
  SUBJECT_HUB_CARD_CLASSIC,
  SUBJECT_ACCENT_BAR_CLASSIC,
  STUDENT_HOME_MODAL_BRIGHT,
  STUDENT_HOME_MODAL_CLASSIC,
} from "./student-classic-theme.client.js";
import { MATH_BRIGHT } from "./student-bright-math-ui.client.js";
import { MATH_CLASSIC } from "./student-classic-math-ui.client.js";
import {
  STEP_EXERCISE_UI_BRIGHT,
  STEP_EXERCISE_UI_CLASSIC,
} from "./step-exercise-ui.client.js";
import * as classicLearningModals from "../../utils/learning-ui-classes.js";
import * as brightLearningModals from "./student-bright-math-ui.client.js";

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveStudentUiBundle(theme) {
  const isBright = isStudentThemeBright(theme);
  return {
    theme,
    isBright,
    tokens: isBright ? STUDENT_BRIGHT : STUDENT_CLASSIC,
    subjectHubCard: isBright ? SUBJECT_HUB_CARD : SUBJECT_HUB_CARD_CLASSIC,
    subjectAccentBar: isBright ? SUBJECT_ACCENT_BAR : SUBJECT_ACCENT_BAR_CLASSIC,
    homeModalShell: isBright ? STUDENT_HOME_MODAL_BRIGHT : STUDENT_HOME_MODAL_CLASSIC,
    layoutShell: isBright ? "bright" : "classic",
    learningShell: isBright ? LEARNING_PAGE_SHELL : CLASSIC_LEARNING_PAGE_SHELL,
  };
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveMathMasterUi(theme) {
  const isBright = isStudentThemeBright(theme);
  const modals = isBright ? brightLearningModals : classicLearningModals;
  return {
    MB: isBright ? MATH_BRIGHT : MATH_CLASSIC,
    learningModalOverlay: modals.learningModalOverlay,
    learningModalPanel: modals.learningModalPanel,
    learningModalHeader: modals.learningModalHeader,
    learningModalCloseBtn: modals.learningModalCloseBtn,
    learningModalTitle: modals.learningModalTitle,
    learningModalFooter: modals.learningModalFooter,
    learningStepNavRow: modals.learningStepNavRow,
    learningStepNavBtn: modals.learningStepNavBtn,
    learningStepNavBtnPlay: modals.learningStepNavBtnPlay,
    learningStepCounter: modals.learningStepCounter,
    learningQuestionBox: modals.learningQuestionBox,
    learningQuestionText: modals.learningQuestionText,
    learningExplTitle: modals.learningExplTitle,
    learningExplBody: modals.learningExplBody,
    learningStepSection: modals.learningStepSection,
    learningModalScrollBody: modals.learningModalScrollBody,
    stepExerciseUi: isBright ? STEP_EXERCISE_UI_BRIGHT : STEP_EXERCISE_UI_CLASSIC,
    learningPrimaryCloseBtn: modals.learningPrimaryCloseBtn,
    learningHintTriggerBtn: modals.learningHintTriggerBtn,
    learningExplainOpenBtn: modals.learningExplainOpenBtn,
  };
}

export { STUDENT_THEME_BRIGHT, STUDENT_THEME_CLASSIC };
