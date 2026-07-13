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
import { MATH_BRIGHT, LEARNING_MASTER_BRIGHT } from "./student-bright-math-ui.client.js";
import { MATH_CLASSIC, LEARNING_MASTER_CLASSIC } from "./student-classic-math-ui.client.js";
import { GAMES_HUB_BRIGHT } from "./student-bright-games-hub.client.js";
import { GAMES_HUB_CLASSIC } from "./student-classic-games-hub.client.js";
import { SOLO_SHELL_BRIGHT } from "./student-bright-solo-games.client.js";
import { SOLO_SHELL_CLASSIC } from "./student-classic-solo-games.client.js";
import { GALLERY_BRIGHT } from "./student-bright-gallery.client.js";
import { GALLERY_CLASSIC } from "./student-classic-gallery.client.js";
import { SHARED_SHELL_BRIGHT } from "./student-bright-shared-shell.client.js";
import { SHARED_SHELL_CLASSIC } from "./student-classic-shared-shell.client.js";
import {
  STEP_EXERCISE_UI_BRIGHT,
  STEP_EXERCISE_UI_CLASSIC,
} from "./step-exercise-ui.client.js";
import * as classicLearningModals from "../../utils/learning-ui-classes.js";
import * as brightLearningModals from "./student-bright-math-ui.client.js";
import {
  STUDENT_BRIGHT_MASTER_SHELL_LAYOUT,
  studentBrightPageBgStyle,
} from "./student-bright-page-background.client.js";
import {
  STUDENT_ACTIVITY_LAYOUT,
  STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES,
} from "../classroom-activities/student-activity-layout.client.js";
import {
  STUDENT_ACTIVITY_LAYOUT_BRIGHT,
  STUDENT_ACTIVITY_LAYOUT_BRIGHT_TEXTUAL_OVERRIDES,
} from "./student-bright-activity-layout.client.js";

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
    pageBackgroundStyle: studentBrightPageBgStyle(isBright),
  };
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveMathMasterUi(theme) {
  return resolveLearningMasterUi(theme);
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveLearningMasterUi(theme) {
  const isBright = isStudentThemeBright(theme);
  const modals = isBright ? brightLearningModals : classicLearningModals;
  const MB = isBright ? MATH_BRIGHT : MATH_CLASSIC;
  return {
    MB,
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
    learningExplBodyGeometry: modals.learningExplBodyGeometry,
    learningStepSection: modals.learningStepSection,
    learningModalScrollBody: modals.learningModalScrollBody,
    stepExerciseUi: isBright ? STEP_EXERCISE_UI_BRIGHT : STEP_EXERCISE_UI_CLASSIC,
    learningPrimaryCloseBtn: modals.learningPrimaryCloseBtn,
    learningHintTriggerBtn: modals.learningHintTriggerBtn,
    learningExplainOpenBtn: modals.learningExplainOpenBtn,
    shellClass: isBright ? STUDENT_BRIGHT_MASTER_SHELL_LAYOUT : MB.shell,
    shellBgStyle: studentBrightPageBgStyle(isBright),
  };
}

/**
 * @param {'bright' | 'classic'} theme
 * @param {{ textualAssigned?: boolean }} [options]
 */
export function resolveStudentActivityUi(theme, options = {}) {
  const isBright = isStudentThemeBright(theme);
  const MB = isBright ? MATH_BRIGHT : MATH_CLASSIC;
  const textualAssigned = Boolean(options.textualAssigned);
  const base = isBright ? STUDENT_ACTIVITY_LAYOUT_BRIGHT : STUDENT_ACTIVITY_LAYOUT;
  const overrides = textualAssigned
    ? isBright
      ? STUDENT_ACTIVITY_LAYOUT_BRIGHT_TEXTUAL_OVERRIDES
      : STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES
    : null;
  return {
    theme,
    isBright,
    textualAssigned,
    L: overrides ? { ...base, ...overrides } : base,
    MB,
  };
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveGamesHubUi(theme) {
  const isBright = isStudentThemeBright(theme);
  return {
    GH: isBright ? GAMES_HUB_BRIGHT : GAMES_HUB_CLASSIC,
    isBright,
    pageBgStyle: studentBrightPageBgStyle(isBright),
  };
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveSoloGameShellUi(theme) {
  const hub = resolveGamesHubUi(theme);
  const { tokens } = resolveStudentUiBundle(theme);
  return {
    ...hub,
    tokens,
    SG: hub.isBright ? SOLO_SHELL_BRIGHT : SOLO_SHELL_CLASSIC,
  };
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveGalleryUi(theme) {
  const isBright = isStudentThemeBright(theme);
  return {
    GL: isBright ? GALLERY_BRIGHT : GALLERY_CLASSIC,
    isBright,
  };
}

/**
 * @param {'bright' | 'classic'} theme
 */
export function resolveSharedShellUi(theme) {
  const isBright = isStudentThemeBright(theme);
  return {
    SP: isBright ? SHARED_SHELL_BRIGHT : SHARED_SHELL_CLASSIC,
    isBright,
  };
}

export { STUDENT_THEME_BRIGHT, STUDENT_THEME_CLASSIC, LEARNING_MASTER_BRIGHT, LEARNING_MASTER_CLASSIC };
