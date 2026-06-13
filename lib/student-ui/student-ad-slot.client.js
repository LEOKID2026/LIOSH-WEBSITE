/** Reserved student ad slot — placeholder box only (no live ads, no full-width band). */

export const STUDENT_AD_LABEL = "שמור לפרסומת";

/** Approximate compact legal footer block height in Layout. */
export const STUDENT_LAYOUT_FOOTER_H_PX = 28;

/** Ad slot + compact legal footer when both are fixed at bottom. */
export const STUDENT_LAYOUT_CHROME_BOTTOM_CSS =
  "calc(2.75rem + 1.75rem + env(safe-area-inset-bottom, 0px))";

const WRAP_CENTER = "w-full shrink-0 flex justify-center px-3 pointer-events-none bg-transparent";

const SLOT_SIZING =
  "w-[calc(100%-24px)] max-w-[520px] sm:max-w-[600px] md:max-w-[720px] h-9 md:h-10 min-h-[36px] md:min-h-[40px] max-h-[44px] md:max-h-[48px]";

const BRIGHT = {
  slot: `${SLOT_SIZING} rounded-md border border-dashed border-teal-300/40 bg-teal-50/15 flex items-center justify-center px-2`,
  label: "text-[11px] md:text-xs font-medium text-teal-700/50 select-none text-center",
};

const CLASSIC = {
  slot: `${SLOT_SIZING} rounded-md border border-dashed border-white/20 bg-white/[0.04] flex items-center justify-center px-2`,
  label: "text-[11px] md:text-xs font-medium text-white/35 select-none text-center",
};

const ARCADE = {
  slot: `${SLOT_SIZING} rounded-md border border-dashed border-white/15 bg-white/[0.05] flex items-center justify-center px-2`,
  label: "text-[11px] md:text-xs font-medium text-white/40 select-none text-center",
};

/**
 * @param {"inline"|"layout"|"dvh"|"immersive-fixed"} variant
 * @param {"bright"|"classic"|"arcade"} palette
 */
export function getStudentAdSlotClasses(variant, palette = "classic") {
  const t =
    palette === "bright" ? BRIGHT : palette === "arcade" ? ARCADE : CLASSIC;

  if (variant === "layout") {
    return {
      wrap: `${WRAP_CENTER} py-0 pb-0 pt-1`,
      slot: t.slot,
      label: t.label,
    };
  }

  if (variant === "dvh") {
    return {
      wrap: `${WRAP_CENTER} py-0 pt-0 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]`,
      slot: t.slot,
      label: t.label,
    };
  }

  return {
    wrap: `${WRAP_CENTER} py-1`,
    slot: t.slot,
    label: t.label,
  };
}
