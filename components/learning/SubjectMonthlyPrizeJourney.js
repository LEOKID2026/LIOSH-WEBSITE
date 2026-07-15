/**
 * Phase 2.8 — Subject lobby monthly prize journey (read-only, automatic tiers).
 * Preserves existing 4-box grid + progress bar layout from master pages.
 */

import { splitRewardAmountLabel } from "../../utils/dashboard-setup-ui";

const PRIZE_COIN_ICON = "🪙";

function tierBoxClass(state) {
  if (state === "awarded") {
    return "border-amber-400/70 bg-amber-500/25 shadow-md shadow-amber-900/30 ring-2 ring-amber-400/40";
  }
  if (state === "reached") {
    return "border-emerald-400/60 bg-emerald-500/15 shadow-sm shadow-emerald-900/20 ring-1 ring-emerald-400/30";
  }
  return "border-white/15 bg-black/30 opacity-75";
}

/** @param {{ view: object | null }} props */
export default function SubjectMonthlyPrizeJourney({ view }) {
  if (!view) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-md md:rounded-lg px-2 pt-2.5 pb-3 md:px-4 md:py-4 lg:py-5 mb-3 md:mb-4 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto opacity-90 md:min-h-[12.5rem] lg:min-h-[13rem]">
        <p className="text-center text-white/60 text-sm py-6">טוען התקדמות חודשית...</p>
      </div>
    );
  }

  const {
    currentMinutes,
    goalMinutes,
    progressPct,
    encouragementHe,
    tiers,
    alreadyAwarded,
  } = view;

  return (
    <div className="bg-white/5 border border-white/10 rounded-md md:rounded-lg px-2 pt-2.5 pb-3 md:px-4 md:py-4 lg:py-5 mb-3 md:mb-4 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto opacity-90 md:min-h-[12.5rem] lg:min-h-[13rem]">
      <div className="flex items-center justify-between text-[10px] md:text-xs lg:text-sm text-white/82 md:text-white/90 lg:text-white/95 mb-1 md:mb-1.5 lg:mb-2 leading-tight font-semibold md:font-bold">
        <span>🎁 מסע פרס חודשי</span>
        <span>
          {Math.round(currentMinutes)} / {goalMinutes} דק׳
        </span>
      </div>
      <p className="text-[10px] md:text-xs lg:text-sm text-white/82 md:text-white/88 lg:text-white/92 mb-1 md:mb-1.5 lg:mb-2 text-center leading-snug">
        {encouragementHe}
      </p>
      <div className="w-full bg-white/10 rounded-full h-1.5 md:h-2 overflow-hidden mb-2.5 md:mb-3">
        <div
          className="h-1.5 md:h-2 bg-emerald-400 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 md:gap-2 lg:gap-2.5 w-full">
        {tiers.map((tier) => {
          const rewardParts = splitRewardAmountLabel(tier.label);
          const isAwardedBox = tier.isAwardedBox && alreadyAwarded;
          return (
            <div
              key={tier.minutes}
              className={[
                "rounded-lg md:rounded-xl border px-1 py-2 md:px-2 md:py-2.5 flex flex-col items-center justify-center gap-0.5 min-h-[4.25rem] md:min-h-[5rem] transition-all",
                tierBoxClass(tier.state),
              ].join(" ")}
              aria-label={`${tier.minutes} דקות - ${tier.label}`}
            >
              <span className="text-lg md:text-xl leading-none" aria-hidden>
                {PRIZE_COIN_ICON}
              </span>
              <span className="text-[9px] md:text-[10px] lg:text-xs font-bold text-white/95 text-center leading-tight">
                {rewardParts.amount}
              </span>
              <span className="text-[8px] md:text-[9px] text-white/70 text-center leading-tight">
                {rewardParts.name || "מטבעות"}
              </span>
              {isAwardedBox ? (
                <span className="text-[8px] md:text-[9px] text-amber-200 font-bold mt-0.5">קיבלת פרס</span>
              ) : tier.state === "reached" ? (
                <span className="text-[8px] md:text-[9px] text-emerald-300 font-semibold mt-0.5">הגעת!</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
