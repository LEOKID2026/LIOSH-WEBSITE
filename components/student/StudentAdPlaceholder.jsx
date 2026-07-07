import {
  getStudentAdSlotClasses,
  STUDENT_AD_LABEL,
} from "../../lib/student-ui/student-ad-slot.client.js";

/**
 * Visual placeholder for reserved student ad areas (development / pre-provider).
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
export default function StudentAdPlaceholder({
  variant = "inline",
  theme = "classic",
  slotClassName,
  labelClassName,
  wrapClassName,
  className = "",
  dataAdSlot = "student-ad-reserved",
}) {
  const resolvedVariant = variant === "immersive-fixed" ? "inline" : variant;
  const styles = getStudentAdSlotClasses(resolvedVariant, theme);
  const wrapCls = [styles.wrap, wrapClassName, className].filter(Boolean).join(" ");
  const slotCls = [styles.slot, slotClassName].filter(Boolean).join(" ");

  return (
    <aside
      role="complementary"
      aria-label={STUDENT_AD_LABEL}
      data-ad-slot={dataAdSlot}
      data-ad-render="placeholder"
      className={wrapCls}
    >
      <div className={slotCls} />
    </aside>
  );
}
