import { useMemo } from "react";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { resolveSoloGameShellUi } from "../../lib/student-ui/student-theme-resolver.client.js";

export function useSoloGameShellUi() {
  const { theme } = useStudentTheme();
  return useMemo(() => resolveSoloGameShellUi(theme), [theme]);
}
