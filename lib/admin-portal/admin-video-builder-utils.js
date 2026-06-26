/** Client-safe helpers for admin video builder (no Node imports). */

export function computePreviewTotalDurationSec(scenes) {
  if (!Array.isArray(scenes)) return 0;
  return scenes.reduce((sum, s) => sum + (Number(s?.durationSec) || 0), 0);
}
