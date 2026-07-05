import {
  getStudentAdSlotClasses,
} from "../../lib/student-ui/student-ad-slot.client.js";
import { STUDENT_AD_POLICY } from "../../lib/student-ui/student-ad-config.client.js";

/**
 * Reserved mount point for a future child-safe, non-personalized external ad provider.
 *
 * Does NOT load scripts, iframes, or tracking in this build.
 * Keeps the same dimensions as the placeholder so layout stays unchanged.
 *
 * @param {{
 *   variant?: "inline"|"layout"|"dvh"|"immersive-fixed",
 *   theme?: "bright"|"classic"|"arcade",
 *   wrapClassName?: string,
 *   className?: string,
 *   dataAdSlot?: string,
 * }} props
 */
export default function StudentExternalAdHost({
  variant = "inline",
  theme = "classic",
  wrapClassName,
  className = "",
  dataAdSlot = "student-ad-reserved",
}) {
  const resolvedVariant = variant === "immersive-fixed" ? "inline" : variant;
  const styles = getStudentAdSlotClasses(resolvedVariant, theme);
  const wrapCls = [styles.wrap, wrapClassName, className].filter(Boolean).join(" ");
  const slotCls = styles.slot;

  return (
    <aside
      role="complementary"
      aria-label="פרסומת"
      data-ad-slot={dataAdSlot}
      data-ad-render="external-host"
      data-ad-child-safe={STUDENT_AD_POLICY.childSafe ? "true" : "false"}
      data-ad-personalized={STUDENT_AD_POLICY.personalized ? "true" : "false"}
      className={wrapCls}
    >
      <div className={slotCls} data-ad-mount="external-provider" />
    </aside>
  );
}
