import { useMemo } from "react";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { resolveGamesHubUi } from "../lib/student-ui/student-theme-resolver.client.js";

export function useGamesHubUi() {
  const { theme } = useStudentTheme();
  return useMemo(() => resolveGamesHubUi(theme), [theme]);
}
