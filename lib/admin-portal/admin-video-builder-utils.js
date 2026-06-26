/** Client-safe helpers for admin video builder (no Node imports). */

export function computePreviewTotalDurationSec(scenes) {
  if (!Array.isArray(scenes)) return 0;
  return scenes.reduce((sum, s) => sum + (Number(s?.durationSec) || 0), 0);
}

export const VB_BG_PREVIEW_CLASS = {
  light: "bg-[#f5f5f5] text-gray-900",
  colorful: "bg-indigo-500 text-white",
  dark: "bg-[#1e1e2e] text-white",
};

export const VB_ANIM_PREVIEW_CLASS = {
  none: "",
  fade: "animate-vb-fade-in",
  zoom: "animate-vb-zoom-in",
};
