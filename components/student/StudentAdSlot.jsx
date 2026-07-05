import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { resolveStudentAdRenderMode } from "../../lib/student-ui/student-ad-config.client.js";
import { sanitizeStudentAdProps } from "../../lib/student-ui/student-ad-props.client.js";
import StudentAdPlaceholder from "./StudentAdPlaceholder.jsx";
import StudentExternalAdHost from "./StudentExternalAdHost.jsx";

/**
 * Reserved ad placement wrapper for child-facing pages.
 *
 * Accepts only layout/theme/slot identifiers — never student or learning data.
 * Renders a placeholder in development; external host is wired but inactive until
 * a child-safe provider is enabled in student-ad-config.
 *
 * @param {{
 *   variant?: "inline"|"layout"|"dvh"|"immersive-fixed",
 *   theme?: "bright"|"classic"|"arcade",
 *   slotClassName?: string,
 *   labelClassName?: string,
 *   wrapClassName?: string,
 *   className?: string,
 *   dataAdSlot?: string,
 * }} props
 */
export default function StudentAdSlot(rawProps) {
  const safeProps = sanitizeStudentAdProps(rawProps);
  const {
    variant = "inline",
    theme: themeProp,
    slotClassName,
    labelClassName,
    wrapClassName,
    className = "",
    dataAdSlot = "student-ad-reserved",
  } = safeProps;

  let ctxTheme = null;
  const ctx = useStudentTheme();
  ctxTheme = ctx?.theme;

  const palette =
    themeProp ||
    (variant === "dvh" ? "arcade" : ctxTheme === "bright" ? "bright" : "classic");

  const shared = {
    variant,
    theme: palette,
    wrapClassName,
    className,
    dataAdSlot,
  };

  const mode = resolveStudentAdRenderMode();

  if (mode === "external") {
    return <StudentExternalAdHost {...shared} />;
  }

  return (
    <StudentAdPlaceholder
      {...shared}
      slotClassName={slotClassName}
      labelClassName={labelClassName}
    />
  );
}
