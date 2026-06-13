import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  getStudentAdSlotClasses,
  STUDENT_AD_LABEL,
} from "../../lib/student-ui/student-ad-slot.client.js";

/**
 * Reserved ad placement — small centered placeholder box only.
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
export default function StudentAdSlot({
  variant = "inline",
  theme: themeProp,
  slotClassName,
  labelClassName,
  wrapClassName,
  className = "",
  dataAdSlot = "student-ad-reserved",
}) {
  let ctxTheme = null;
  const ctx = useStudentTheme();
  ctxTheme = ctx?.theme;

  const palette =
    themeProp ||
    (variant === "dvh" ? "arcade" : ctxTheme === "bright" ? "bright" : "classic");

  const resolvedVariant = variant === "immersive-fixed" ? "inline" : variant;
  const styles = getStudentAdSlotClasses(resolvedVariant, palette);
  const wrapCls = [styles.wrap, wrapClassName, className].filter(Boolean).join(" ");
  const slotCls = [styles.slot, slotClassName].filter(Boolean).join(" ");
  const labelCls = [styles.label, labelClassName].filter(Boolean).join(" ");

  return (
    <aside
      role="complementary"
      aria-label={STUDENT_AD_LABEL}
      data-ad-slot={dataAdSlot}
      className={wrapCls}
    >
      <div className={slotCls}>
        <span className={labelCls}>{STUDENT_AD_LABEL}</span>
      </div>
    </aside>
  );
}
