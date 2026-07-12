import StudentAdSlot from "./StudentAdSlot.jsx";
import SiteLegalFooterBar from "../layout/SiteLegalFooterBar.jsx";
import { STUDENT_BRIGHT_SITE_CHROME_BG } from "../../lib/student-ui/student-bright-page-background.client.js";

/**
 * Fixed bottom ad + legal chrome — same placement as Layout chrome pages.
 * Use on immersive paths where Layout returns children-only (no site footer).
 */
export default function StudentFixedBottomAdChrome({
  theme = "classic",
  className = "no-pdf",
}) {
  const isBright = theme === "bright";
  const footerClass = isBright
    ? `border-t border-sky-100 ${STUDENT_BRIGHT_SITE_CHROME_BG} shrink-0`
    : "border-t border-white/10 bg-black/40 shrink-0";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col ${className}`.trim()}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="student-fixed-bottom-ad-chrome"
    >
      <StudentAdSlot variant="layout" theme={theme} />
      <footer className={footerClass}>
        <SiteLegalFooterBar isStudentBright={isBright} />
      </footer>
    </div>
  );
}
