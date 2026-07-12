import { useMemo } from "react";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { useStudentActivityLayoutVariant } from "../contexts/StudentActivityLayoutVariantContext.jsx";
import { resolveStudentActivityUi } from "../lib/student-ui/student-theme-resolver.client.js";

export function useStudentActivityUi() {
  const { theme } = useStudentTheme();
  const { textualAssigned } = useStudentActivityLayoutVariant();
  return useMemo(
    () => resolveStudentActivityUi(theme, { textualAssigned }),
    [theme, textualAssigned]
  );
}
