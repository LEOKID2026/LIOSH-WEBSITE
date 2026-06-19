/** Soft "נעול" watermark for cards not owned by the student. */

export function lockedCardDimClassName(_compact = false) {
  return "";
}

export function lockedCardImageClassName(_compact = false) {
  return "w-full h-full object-cover pointer-events-none";
}

const WATERMARK_SHADOW = "0 2px 8px rgba(0,0,0,0.35)";
const WATERMARK_STROKE = "1px rgba(15, 23, 42, 0.45)";

/** @type {Record<string, { sizeClass: string; fontSize: string; opacity: number }>} */
const VARIANTS = {
  modal: {
    sizeClass: "text-[34cqw]",
    fontSize: "clamp(3rem, 34cqw, 11.5rem)",
    opacity: 0.54,
  },
  card: {
    sizeClass: "text-[30cqw]",
    fontSize: "clamp(2.1rem, 30cqw, 7rem)",
    opacity: 0.48,
  },
  compact: {
    sizeClass: "text-[26cqw]",
    fontSize: "clamp(1.05rem, 26cqw, 3.5rem)",
    opacity: 0.48,
  },
};

export default function RewardCardLockedStamp({ compact = false, modal = false }) {
  const key = modal ? "modal" : compact ? "compact" : "card";
  const variant = VARIANTS[key];

  return (
    <div
      className="@container absolute inset-0 size-full flex items-center justify-center pointer-events-none overflow-hidden"
      aria-hidden
    >
      <span
        className={`font-black tracking-[0.04em] select-none -rotate-12 text-[#FFF8E7] leading-none whitespace-nowrap ${variant.sizeClass}`}
        style={{
          fontSize: variant.fontSize,
          opacity: variant.opacity,
          textShadow: WATERMARK_SHADOW,
          WebkitTextStroke: WATERMARK_STROKE,
        }}
      >
        נעול
      </span>
    </div>
  );
}
