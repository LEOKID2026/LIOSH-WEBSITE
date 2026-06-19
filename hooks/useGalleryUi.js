import { useMemo } from "react";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { resolveGalleryUi } from "../lib/student-ui/student-theme-resolver.client.js";

export function useGalleryUi() {
  const { theme } = useStudentTheme();
  return useMemo(() => resolveGalleryUi(theme), [theme]);
}
