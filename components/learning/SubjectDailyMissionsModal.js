/**
 * Phase 2.8 - Read-only daily missions modal for subject lobby "אתגרים".
 * Keeps existing modal shell; body shows Phase 2 missions (same as /student/home).
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

function CompactMissionRow({ mission, index }) {
  const { completed, textHe, type, progressPct, rewardCoins, coinAwarded, target } = mission;

  return (
    <article
      className={[
        "rounded-xl border p-3 flex flex-col gap-2 text-right min-w-0",
        completed
          ? "border-emerald-400/45 bg-emerald-900/25"
          : 'border-white/12 bg-black/30',
      ].join(" ")}
      aria-label={`משימה ${index + 1}: ${textHe}`}
    >
      <div className="flex items-start gap-2">
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
            completed ? "bg-emerald-500/25" : "bg-white/8",
          ].join(" ")}
          aria-hidden
        >
          {completed ? "✓" : missionTypeIcon(type)}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${completed ? "text-emerald-100" : "text-white"}`}>
            {textHe}
          </p>
        </div>
      </div>

      {!completed && target > 0 ? (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${Math.max(progressPct > 0 ? 4 : 0, progressPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/50 tabular-nums">
            <span>{missionProgressLabel(mission)}</span>
            <span>{progressPct}%</span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-xs">
        {completed ? (
          <span className="text-emerald-300 font-bold">
            {coinAwarded ? "קיבלת את הפרס" : "הושלם"}
          </span>
        ) : (
          <span className="text-white/45">המשיכו ללמוד</span>
        )}
        <span className="rounded-full px-2 py-0.5 bg-amber-500/15 text-amber-200 border border-amber-400/25 font-bold tabular-nums">
          +{rewardCoins} מטבעות
        </span>
      </div>
    </article>
  );
}

/** @param {{ open: boolean, onClose: () => void, dailyMissions: object | null, loading?: boolean }} props */
export default function SubjectDailyMissionsModal({ open, onClose, dailyMissions, loading = false }) {
  if (!open) return null;

  const missions = dailyMissions?.missions ?? [];
  const totalCompleted = dailyMissions?.totalCompleted ?? 0;
  const total = missions.length;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-blue-400/60 rounded-2xl p-6 max-w-md w-full text-sm text-white max-h-[90vh] overflow-y-auto"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold mb-1 text-center">📅 אתגרים</h2>
        <p className="text-white/60 text-xs text-center mb-4">המשימות היומיות שלך</p>

        {loading ? (
          <p className="text-center text-white/70 py-8">טוען משימות...</p>
        ) : total > 0 ? (
          <>
            <div className="flex justify-center mb-3">
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white/8 text-white/70 border border-white/10 tabular-nums">
                {totalCompleted}/{total} הושלמו
              </span>
            </div>
            {dailyMissions.allCompleted ? (
              <p className="text-emerald-300 text-sm text-center font-semibold mb-3">
                כל הכבוד! סיימת את כל המשימות להיום
              </p>
            ) : (
              <p className="text-white/55 text-xs text-center mb-3">
                השלימו משימות על ידי למידה - כל משימה שווה מטבעות
              </p>
            )}
            <div className="space-y-2 mb-4">
              {missions.map((m, i) => (
                <CompactMissionRow key={m.id || i} mission={m} index={i} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-white/60 py-8 text-sm">
            אין משימות זמינות כרגע. נסו שוב בעוד רגע.
          </p>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-sm"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
