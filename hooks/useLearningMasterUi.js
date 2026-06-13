import { useMemo } from "react";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { resolveLearningMasterUi } from "../lib/student-ui/student-theme-resolver.client.js";

export function useLearningMasterUi() {
  const { theme } = useStudentTheme();
  const ui = useMemo(() => resolveLearningMasterUi(theme), [theme]);
  const MB = ui.MB;
  return {
    theme,
    MB,
    ui,
    shellClass: ui.shellClass,
    shellBgStyle: ui.shellBgStyle,
  };
}
