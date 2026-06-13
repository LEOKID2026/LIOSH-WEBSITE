import { createContext, useContext, useMemo, useState } from "react";
import {
  readStudentThemePreference,
  writeStudentThemePreference,
  STUDENT_THEME_DEFAULT,
} from "../lib/student-ui/student-theme-preference.client.js";
import { resolveStudentUiBundle } from "../lib/student-ui/student-theme-resolver.client.js";

const StudentThemeContext = createContext(null);

function readInitialTheme() {
  if (typeof window === "undefined") return STUDENT_THEME_DEFAULT;
  return readStudentThemePreference();
}

export function StudentThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  const setTheme = (next) => {
    writeStudentThemePreference(next);
    setThemeState(next);
  };

  const bundle = useMemo(() => resolveStudentUiBundle(theme), [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      ...bundle,
    }),
    [theme, bundle]
  );

  return (
    <StudentThemeContext.Provider value={value}>{children}</StudentThemeContext.Provider>
  );
}

export function useStudentTheme() {
  const ctx = useContext(StudentThemeContext);
  if (!ctx) {
    const bundle = resolveStudentUiBundle(STUDENT_THEME_DEFAULT);
    return {
      ...bundle,
      setTheme: () => {},
    };
  }
  return ctx;
}
