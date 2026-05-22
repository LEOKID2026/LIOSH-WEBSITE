/**
 * Phase 2.5 — Child-friendly daily missions panel (display only).
 */

function missionTypeIcon(type) {
  if (type === "questions") return "📝";
  if (type === "minutes") return "⏱️";
  if (type === "subjects") return "📚";
  return "⭐";
}

function missionProgressLabel(m) {
  if (m.completed) return "הושלם";
  if (m.type === "minutes") {
    const prog = Math.round(m.progress * 10) / 10;
    return `${prog} / ${m.target} דק׳`;
  }
  return `${m.progress} / ${m.target}`;
}

function MissionCardHeader({ completed, type, textHe }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
          completed ? "bg-emerald-500/25" : "bg-white/8",
        ].join(" ")}
        aria-hidden
      >
        {completed ? "✓" : missionTypeIcon(type)}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={[
            "text-sm md:text-base font-semibold leading-snug",
            completed ? "text-emerald-100/90" : "text-white",
          ].join(" ")}
        >
          {textHe}
        </p>
        {completed ? (
          <p className="text-emerald-400/80 text-xs mt-1 font-medium">הושלם</p>
        ) : null}
      </div>
    </div>
  );
}

function MissionCard({ mission, index }) {
  const { completed, textHe, type, progressPct, rewardCoins, coinAwarded, target } = mission;

  return (
    <article
      className={[
        "relative rounded-2xl border p-4 flex flex-col gap-3 text-right transition-all duration-300 min-w-0",
        completed
          ? "border-emerald-400/50 bg-gradient-to-br from-emerald-900/40 to-emerald-950/30 shadow-lg shadow-emerald-900/20"
          : "border-white/12 bg-white/[0.04] hover:border-emerald-500/25 hover:bg-white/[0.06]",
      ].join(" ")}
      aria-label={`משימה ${index + 1}: ${textHe}`}
    >
      {completed ? (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-l from-emerald-400 to-teal-400" aria-hidden />
      ) : null}

      <MissionCardHeader completed={completed} type={type} textHe={textHe} />

      {!completed && target > 0 ? (
        <div className="space-y-1.5">
          <div className="h-2.5 rounded-full bg-black/50 overflow-hidden border border-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progressPct > 0 ? 4 : 0, progressPct)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-white/45 tabular-nums">
            <span>{missionProgressLabel(mission)}</span>
            <span>{progressPct}%</span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 mt-auto">
        {completed ? (
          <span className="text-emerald-300 text-sm font-bold">
            {coinAwarded ? "כל הכבוד! קיבלת את הפרס" : "הושלם"}
          </span>
        ) : (
          <span className="text-white/45 text-xs">המשיכו ללמוד כדי להשלים</span>
        )}
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
            completed
              ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
              : "bg-amber-500/10 text-amber-300/90 border border-amber-500/20",
          ].join(" ")}
        >
          +{rewardCoins} מטבעות
        </span>
      </div>
    </article>
  );
}

export default function StudentDailyMissionsPanel({ dailyMissions }) {
  if (!dailyMissions?.missions?.length) return null;

  const { missions, totalCompleted, allCompleted } = dailyMissions;
  const total = missions.length;

  return (
    <section
      className="rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/50 via-[#0a1628] to-teal-950/30 p-4 sm:p-5 md:p-7 shadow-xl shadow-black/30 overflow-hidden"
      aria-labelledby="daily-missions-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-5">
        <h2 id="daily-missions-heading" className="text-lg md:text-xl font-extrabold text-white text-right">
          המשימות שלי להיום
        </h2>
        <span
          className={[
            "self-start sm:self-auto rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
            allCompleted
              ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
              : "bg-white/8 text-white/60 border border-white/10",
          ].join(" ")}
        >
          {totalCompleted}/{total} הושלמו
        </span>
      </div>

      {allCompleted ? (
        <div
          className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-center text-emerald-100 text-sm font-semibold"
          role="status"
        >
          כל הכבוד! סיימת את כל המשימות להיום
        </div>
      ) : (
        <p className="text-white/55 text-sm text-right mb-4 leading-relaxed">
          השלימו משימות על ידי למידה אמיתית — כל משימה שווה מטבעות
        </p>
      )}

      <div className="grid gap-3 sm:gap-4">
        {missions.map((m, i) => (
          <MissionCard key={m.id || i} mission={m} index={i} />
        ))}
      </div>
    </section>
  );
}
