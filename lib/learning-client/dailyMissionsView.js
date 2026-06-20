/**
 * Shared daily-missions view model (Phase 2) — used by home dashboard and subject modals.
 */

/** @returns {string} YYYY-MM-DD in Asia/Jerusalem */
export function getTodayIsraelDateString() {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  } catch {
    return "";
  }
}

/**
 * Build display-ready daily missions from `student_learning_state.challenges`.
 * @param {Record<string, unknown> | null | undefined} challenges
 */
export function buildDailyMissionsView(challenges) {
  const daily =
    challenges?.daily && typeof challenges.daily === "object" && !Array.isArray(challenges.daily)
      ? challenges.daily
      : null;

  const todayIsrael = getTodayIsraelDateString();
  if (!daily || daily.date !== todayIsrael || !Array.isArray(daily.missions) || daily.missions.length === 0) {
    return null;
  }

  const missions = daily.missions.map((m) => {
    const tgt = Number(m.target) || 0;
    const prog = Math.min(Number(m.progress) || 0, tgt);
    return {
      id: String(m.id || ""),
      textHe: String(m.textHe || ""),
      type: String(m.type || ""),
      target: tgt,
      progress: prog,
      completed: Boolean(m.completed),
      coinAwarded: Boolean(m.coinAwarded),
      rewardCoins: Number.isFinite(Number(m.rewardCoins)) ? Number(m.rewardCoins) : null,
      progressPct: tgt > 0 ? Math.min(100, Math.round((prog / tgt) * 100)) : 0,
    };
  });

  return {
    date: daily.date,
    missions,
    totalCompleted: missions.filter((m) => m.completed).length,
    allCompleted: missions.length > 0 && missions.every((m) => m.completed),
  };
}
