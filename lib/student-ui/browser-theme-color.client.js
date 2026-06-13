import {
  isStudentThemeBright,
  STUDENT_THEME_STORAGE_KEY,
} from "./student-theme-preference.client.js";

/** Android Chrome / mobile browser status bar — bright student UI */
export const BROWSER_THEME_COLOR_BRIGHT = "#c9f4ff";

/** Android Chrome / mobile browser status bar — classic dark UI */
export const BROWSER_THEME_COLOR_CLASSIC = "#0b1020";

/** @param {'bright' | 'classic'} theme */
export function resolveBrowserThemeColor(theme) {
  return isStudentThemeBright(theme)
    ? BROWSER_THEME_COLOR_BRIGHT
    : BROWSER_THEME_COLOR_CLASSIC;
}

/** Inline script: apply saved theme before React hydrates (reduces yellow flash). */
export const BROWSER_THEME_COLOR_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("${STUDENT_THEME_STORAGE_KEY}");var c=(t==="classic")?"${BROWSER_THEME_COLOR_CLASSIC}":"${BROWSER_THEME_COLOR_BRIGHT}";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c);var w=document.querySelector('meta[name="msapplication-TileColor"]');if(w)w.setAttribute("content",c);}catch(e){}})();`;
