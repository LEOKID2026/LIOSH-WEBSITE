/** Preset profile circle backgrounds (stored as `profile.avatarBackgroundKey`). */

export const DEFAULT_PROFILE_BACKGROUND_KEY = "sky";

/** @type {{ id: string, labelHe: string, background: string }[]} */
export const PROFILE_BACKGROUND_OPTIONS = [
  { id: "sky", labelHe: "שמיים", background: "linear-gradient(135deg, #bae6fd 0%, #38bdf8 55%, #0284c7 100%)" },
  { id: "sunset", labelHe: "שקיעה", background: "linear-gradient(135deg, #fde68a 0%, #fb923c 50%, #f97316 100%)" },
  { id: "ocean", labelHe: "ים", background: "linear-gradient(135deg, #67e8f9 0%, #06b6d4 50%, #0891b2 100%)" },
  { id: "forest", labelHe: "יער", background: "linear-gradient(135deg, #bbf7d0 0%, #34d399 50%, #059669 100%)" },
  { id: "lavender", labelHe: "סגול", background: "linear-gradient(135deg, #e9d5ff 0%, #c084fc 50%, #9333ea 100%)" },
  { id: "sunshine", labelHe: "שמש", background: "linear-gradient(135deg, #fef08a 0%, #facc15 50%, #eab308 100%)" },
  { id: "rose", labelHe: "ורוד", background: "linear-gradient(135deg, #fbcfe8 0%, #f472b6 50%, #db2777 100%)" },
  { id: "mint", labelHe: "מנטה", background: "linear-gradient(135deg, #a7f3d0 0%, #2dd4bf 50%, #0d9488 100%)" },
  { id: "peach", labelHe: "אפרסק", background: "linear-gradient(135deg, #fed7aa 0%, #fb7185 55%, #f43f5e 100%)" },
  { id: "rainbow", labelHe: "קשת", background: "linear-gradient(135deg, #fca5a5 0%, #fcd34d 25%, #86efac 50%, #93c5fd 75%, #c4b5fd 100%)" },
  { id: "night", labelHe: "לילה", background: "linear-gradient(135deg, #312e81 0%, #4338ca 45%, #6366f1 100%)" },
  { id: "candy", labelHe: "ממתק", background: "linear-gradient(135deg, #f9a8d4 0%, #a78bfa 50%, #60a5fa 100%)" },
];

export const PROFILE_BACKGROUND_OPTION_IDS = new Set(PROFILE_BACKGROUND_OPTIONS.map((option) => option.id));
