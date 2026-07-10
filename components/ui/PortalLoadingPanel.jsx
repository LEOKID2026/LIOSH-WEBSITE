import { getPortalLoadingTheme } from "../../lib/ui/portal-loading-theme.client.js";

/**
 * Themed loading panel — bright mode uses site sky gradient (same as Layout).
 * @param {{ isBright?: boolean, message: string, fullPage?: boolean, reportPage?: boolean, hubGrid?: boolean, className?: string, textClassName?: string }} props
 */
export default function PortalLoadingPanel({
  isBright = false,
  message,
  fullPage = false,
  reportPage = false,
  hubGrid = false,
  className = "",
  textClassName = "",
}) {
  const L = getPortalLoadingTheme(isBright);
  const shell = hubGrid
    ? L.hubGridShell
    : reportPage
      ? L.reportShell
      : fullPage
        ? L.fullShell
        : L.inlineShell;
  const shellStyle = isBright ? L.pageBackgroundStyle : undefined;

  return (
    <div
      className={`${shell} ${className}`.trim()}
      style={shellStyle}
      dir="rtl"
      lang="he"
      role="status"
      aria-live="polite"
    >
      <div className={L.spinner} aria-hidden />
      <p className={textClassName || L.text}>{message}</p>
    </div>
  );
}
