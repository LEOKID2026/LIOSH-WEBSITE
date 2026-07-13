import { useMemo } from "react";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { resolveSharedShellUi } from "../lib/student-ui/student-theme-resolver.client.js";

export function useSharedShellUi() {
  const { theme } = useStudentTheme();
  return useMemo(() => resolveSharedShellUi(theme), [theme]);
}
