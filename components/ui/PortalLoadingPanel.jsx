import { getPortalLoadingTheme } from "../../lib/ui/portal-loading-theme.client.js";

/**
 * Themed loading panel — bright mode uses site sky gradient (same as Layout).
 * @param {{ isBright?: boolean, message: string, fullPage?: boolean, reportPage?: boolean, className?: string, textClassName?: string }} props
 */
export default function PortalLoadingPanel({
  isBright = false,
  message,
  fullPage = false,
  reportPage = false,
  className = "",
  textClassName = "",
}) {
  const L = getPortalLoadingTheme(isBright);
  const shell = reportPage ? L.reportShell : fullPage ? L.fullShell : L.inlineShell;
  const useBrightBg = isBright && fullPage && L.fullShellStyle;

  return (
    <div
      className={`${shell} ${className}`.trim()}
      style={useBrightBg ? L.fullShellStyle : undefined}
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
