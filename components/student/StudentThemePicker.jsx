import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  STUDENT_THEME_BRIGHT,
  STUDENT_THEME_CLASSIC,
} from "../../lib/student-ui/student-theme-preference.client.js";

/**
 * Toggle between bright and classic student UI themes.
 * @param {'default' | 'icon'} [variant] — `icon` for compact emoji-only (no labels).
 * @param {'default' | 'nav'} [iconSize] — `nav` matches math-master back/nav button height.
 */
export default function StudentThemePicker({
  className = "",
  variant = "default",
  iconSize = "default",
}) {
  const { theme, setTheme, isBright } = useStudentTheme();
  const isIcon = variant === "icon";
  const isNavIcon = isIcon && iconSize === "nav";

  const shellClass = isIcon
    ? isNavIcon
      ? "flex gap-1 shrink-0 items-center"
      : "flex gap-1 shrink-0 h-11 items-center"
    : "rounded-xl border p-1 flex gap-1";

  const baseBtn = isIcon
    ? isNavIcon
      ? "flex items-center justify-center w-8 h-8 rounded-lg text-sm leading-none font-bold transition border shrink-0"
      : "flex items-center justify-center w-11 h-11 rounded-xl text-xl leading-none font-bold transition border shrink-0"
    : "flex-1 min-h-10 px-3 py-2 rounded-lg text-sm font-bold transition border";

  const shellThemeClass = isIcon
    ? ""
    : isBright
    ? "border-sky-200 bg-sky-50/80"
    : "border-white/15 bg-white/[0.04]";

  function btnClass(isActive, isBrightButton) {
    if (isActive) {
      return isBrightButton
        ? "bg-sky-600 text-white border-sky-700 shadow-sm"
        : "bg-emerald-600 text-white border-emerald-500 shadow-sm";
    }
    return isBright
      ? "bg-white text-slate-600 border-slate-200 hover:bg-sky-50"
      : "bg-white/5 text-white/70 border-white/15 hover:bg-white/10";
  }

  return (
    <div
      className={`${shellClass} ${className} ${shellThemeClass}`}
      role="group"
      aria-label="בחירת עיצוב מסך"
    >
      <button
        type="button"
        onClick={() => setTheme(STUDENT_THEME_BRIGHT)}
        aria-pressed={theme === STUDENT_THEME_BRIGHT}
        aria-label="עיצוב בהיר"
        title="עיצוב בהיר"
        className={`${baseBtn} ${btnClass(theme === STUDENT_THEME_BRIGHT, true)}`}
      >
        {isIcon ? "🌞" : "🌞 בהיר"}
      </button>
      <button
        type="button"
        onClick={() => setTheme(STUDENT_THEME_CLASSIC)}
        aria-pressed={theme === STUDENT_THEME_CLASSIC}
        aria-label="עיצוב קלאסי"
        title="עיצוב קלאסי"
        className={`${baseBtn} ${btnClass(theme === STUDENT_THEME_CLASSIC, false)}`}
      >
        {isIcon ? "🌙" : "🌙 קלאסי"}
      </button>
    </div>
  );
}
