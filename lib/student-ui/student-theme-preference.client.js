export const STUDENT_THEME_STORAGE_KEY = "liosh_student_ui_theme";

export const STUDENT_THEME_BRIGHT = "bright";
export const STUDENT_THEME_CLASSIC = "classic";

export const STUDENT_THEME_DEFAULT = STUDENT_THEME_BRIGHT;

/** @returns {'bright' | 'classic'} */
export function readStudentThemePreference() {
  if (typeof window === "undefined") return STUDENT_THEME_DEFAULT;
  try {
    const raw = localStorage.getItem(STUDENT_THEME_STORAGE_KEY);
    if (raw === STUDENT_THEME_CLASSIC) return STUDENT_THEME_CLASSIC;
    return STUDENT_THEME_BRIGHT;
  } catch {
    return STUDENT_THEME_DEFAULT;
  }
}

/** @param {'bright' | 'classic'} theme */
export function writeStudentThemePreference(theme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STUDENT_THEME_STORAGE_KEY,
      theme === STUDENT_THEME_CLASSIC ? STUDENT_THEME_CLASSIC : STUDENT_THEME_BRIGHT
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function isStudentThemeBright(theme) {
  return theme !== STUDENT_THEME_CLASSIC;
}
