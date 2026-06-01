import { createContext, useContext, useMemo } from "react";
import {
  DEFAULT_BOOK_GRADE,
  getBookGradeTheme,
} from "../../lib/learning-book/book-grade-themes";

/** @type {import("react").Context<import("../../lib/learning-book/book-grade-themes").BookGradeTheme|null>} */
const BookGradeThemeContext = createContext(null);

/**
 * @param {{ grade?: string, children: import("react").ReactNode }} props
 */
export function BookGradeThemeProvider({ grade = DEFAULT_BOOK_GRADE, children }) {
  const theme = useMemo(() => getBookGradeTheme(grade), [grade]);

  return (
    <BookGradeThemeContext.Provider value={theme}>
      <div style={theme.cssVars} className="book-grade-theme-root contents">
        {children}
      </div>
    </BookGradeThemeContext.Provider>
  );
}

export function useBookGradeTheme() {
  const theme = useContext(BookGradeThemeContext);
  return theme ?? getBookGradeTheme(DEFAULT_BOOK_GRADE);
}
