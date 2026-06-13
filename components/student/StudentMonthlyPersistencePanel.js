/**
 * Phase 2.5 — Child-friendly monthly persistence progress (display only).
 */

function TierMilestone({ tier, currentMinutes }) {
  const done = currentMinutes >= tier.minutes;

  return (
    <div className="flex flex-col items-center min-w-0 flex-1">
      <div
        className={[
          "relative z-10 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 text-xs sm:text-sm font-bold transition-all duration-500",
          done
            ? "border-amber-400 bg-amber-100 text-amber-800 shadow-md"
            : "border-slate-200 bg-white text-slate-400",
        ].join(" ")}
        aria-hidden
      >
        {done ? "✓" : tier.minutes}
      </div>
      <p className={`mt-2 text-[10px] sm:text-xs text-center leading-tight ${done ? "text-amber-700 font-semibold" : "text-slate-500"}`}>
        {tier.minutes} דק׳
      </p>
      <p className={`text-[10px] sm:text-xs text-center mt-0.5 tabular-nums ${done ? "text-amber-600" : "text-slate-400"}`}>
        {tier.label.replace(" מטבעות", "")}
      </p>
    </div>
  );
}

export default function StudentMonthlyPersistencePanel({ monthlyPersistence }) {
  if (!monthlyPersistence?.tiers?.length) return null;

  const {
    currentMinutes,
    tiers,
    nextTier,
    progressToNextTierPct,
    nextTierEncouragementHe,
  } = monthlyPersistence;

  const allDone = !nextTier;

  return (
    <section
      className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 p-4 sm:p-5 md:p-7 shadow-md overflow-hidden"
      aria-labelledby="monthly-persistence-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5 md:mb-6">
        <div className="text-right min-w-0">
          <h2 id="monthly-persistence-heading" className="text-lg md:text-xl font-extrabold text-slate-800">
            ההתקדמות החודשית שלי
          </h2>
          <p className="text-slate-600 text-sm mt-1 leading-relaxed">
            למדו דקות אמיתיות החודש וקבלו מטבעות למידה
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-center shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">דקות החודש</p>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600 tabular-nums leading-tight">
            {currentMinutes}
          </p>
        </div>
      </div>

      <div className="hidden sm:flex relative items-start justify-between gap-1 mb-6 px-2">
        <div className="absolute top-5 sm:top-6 left-8 right-8 h-0.5 bg-slate-200" aria-hidden />
        {tiers.map((tier) => (
          <TierMilestone
            key={tier.minutes}
            tier={tier}
            currentMinutes={currentMinutes}
          />
        ))}
      </div>

      <div className="sm:hidden space-y-2 mb-5">
        {tiers.map((tier) => {
          const done = currentMinutes >= tier.minutes;
          return (
            <div
              key={tier.minutes}
              className={[
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm border min-w-0",
                done
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <span className={`flex items-center gap-2 ${done ? "text-amber-800 font-semibold" : "text-slate-600"}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs border border-current/30">
                  {done ? "✓" : "○"}
                </span>
                {tier.minutes} דקות
              </span>
              <span className={`tabular-nums text-xs font-bold ${done ? "text-amber-600" : "text-slate-400"}`}>
                {tier.label}
              </span>
            </div>
          );
        })}
      </div>

      {allDone ? (
        <div
          className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-center text-amber-900 text-sm font-semibold"
          role="status"
        >
          השגת את כל פרסי החודש! כל הכבוד!
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-slate-700 text-sm text-right font-medium">
            {nextTierEncouragementHe || `עוד ${Math.ceil(nextTier.minutes - currentMinutes)} דקות לפרס הבא`}
          </p>
          <p className="text-slate-500 text-xs text-right">
            היעד הבא: {nextTier.minutes} דקות → {nextTier.label}
          </p>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden border border-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-l from-amber-400 via-yellow-400 to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progressToNextTierPct > 0 ? 3 : 0, progressToNextTierPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 text-left tabular-nums">
            {currentMinutes} / {nextTier.minutes} דק׳ ({progressToNextTierPct}%)
          </p>
        </div>
      )}
    </section>
  );
}
