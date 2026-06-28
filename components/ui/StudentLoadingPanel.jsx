import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PortalLoadingPanel from "./PortalLoadingPanel.jsx";

/**
 * Loading panel wired to student bright/classic theme preference.
 * @param {{ message?: string, fullPage?: boolean, reportPage?: boolean, hubGrid?: boolean, className?: string }} props
 */
export default function StudentLoadingPanel({
  message = "טוען…",
  fullPage = false,
  reportPage = false,
  hubGrid = false,
  className = "",
}) {
  const { isBright } = useStudentTheme();
  return (
    <PortalLoadingPanel
      isBright={isBright}
      message={message}
      fullPage={fullPage}
      reportPage={reportPage}
      hubGrid={hubGrid}
      className={className}
    />
  );
}
