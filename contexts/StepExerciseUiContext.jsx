import { createContext, useContext } from "react";
import { STEP_EXERCISE_UI_CLASSIC } from "../lib/student-ui/step-exercise-ui.client.js";

const StepExerciseUiContext = createContext(STEP_EXERCISE_UI_CLASSIC);

export function StepExerciseUiProvider({ value = STEP_EXERCISE_UI_CLASSIC, children }) {
  return (
    <StepExerciseUiContext.Provider value={value}>{children}</StepExerciseUiContext.Provider>
  );
}

export function useStepExerciseUi() {
  return useContext(StepExerciseUiContext);
}
