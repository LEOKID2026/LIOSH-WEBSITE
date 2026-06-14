import { useMemo } from "react";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { resolveStudentActivityUi } from "../lib/student-ui/student-theme-resolver.client.js";

export function useStudentActivityUi() {
  const { theme } = useStudentTheme();
  return useMemo(() => resolveStudentActivityUi(theme), [theme]);
}
