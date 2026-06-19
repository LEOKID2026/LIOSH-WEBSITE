/** Diagonal "נעול" stamp for cards not owned by the student. */

export function lockedCardDimClassName(compact = false) {
  return compact ? "brightness-[0.87] opacity-[0.88]" : "brightness-[0.88] opacity-[0.92]";
}

export function lockedCardImageClassName(compact = false) {
  return `w-full h-full object-cover pointer-events-none ${lockedCardDimClassName(compact)}`;
}

export default function RewardCardLockedStamp({ compact = false }) {
  return (
    <>
      <div className="absolute inset-0 bg-black/12 pointer-events-none" aria-hidden />
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        aria-hidden
      >
        <span
          className={
            compact
              ? "font-bold tracking-wide text-white border border-white/70 rounded bg-black/45 shadow-sm select-none -rotate-[22deg] text-[8px] sm:text-[9px] px-1 py-px leading-tight"
              : "font-bold tracking-wide text-white border border-white/70 rounded-md bg-black/45 shadow-md select-none -rotate-[22deg] text-xs sm:text-sm px-2.5 py-0.5 leading-tight"
          }
        >
          נעול
        </span>
      </div>
    </>
  );
}
