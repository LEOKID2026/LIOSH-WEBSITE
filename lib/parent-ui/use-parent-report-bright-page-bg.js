import { useEffect } from "react";
import { STUDENT_BRIGHT_PAGE_BACKGROUND } from "../student-ui/student-bright-page-background.client.js";

/**
 * Parent reports skip Layout (immersive) — paint html/body/#__next with site sky gradient in bright mode.
 * @param {boolean} isBright
 */
export function useParentReportBrightPageBackground(isBright) {
  useEffect(() => {
    if (typeof document === "undefined" || !isBright) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const nextRoot = document.getElementById("__next");

    const prev = {
      htmlBg: html.style.background,
      bodyBg: body.style.background,
      nextBg: nextRoot?.style.background ?? "",
      bodyColor: body.style.color,
    };

    html.style.background = STUDENT_BRIGHT_PAGE_BACKGROUND;
    body.style.background = STUDENT_BRIGHT_PAGE_BACKGROUND;
    if (nextRoot) nextRoot.style.background = STUDENT_BRIGHT_PAGE_BACKGROUND;
    body.style.color = "#0f172a";

    return () => {
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
      if (nextRoot) nextRoot.style.background = prev.nextBg;
      body.style.color = prev.bodyColor;
    };
  }, [isBright]);
}
