/**
 * Convert baseReport topic maps → browser localStorage seed (mleo_* keys).
 */

function cleanText(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function rowToSession(row, now, idx = 0) {
  const total = Math.max(1, Number(row?.questions) || 1);
  const correct = Math.max(0, Math.min(total, Number(row?.correct) || 0));
  return {
    timestamp: now - idx * 60_000,
    total,
    correct,
    mode: row?.modeKey || "learning",
    grade: row?.gradeKey || "g4",
    level: "medium",
    duration: Math.max(60, Math.round((Number(row?.timeMinutes) || 1) * 60)),
  };
}

function topicMapToStorage(map) {
  const out = {};
  const rows = Object.entries(map || {});
  rows.forEach(([rowKey, row], idx) => {
    const key = cleanText(row?.bucketKey) || rowKey.split("::grade:")[0]?.split("\u0001")[0] || rowKey;
    if (!out[key]) out[key] = { sessions: [] };
    out[key].sessions.push(rowToSession(row, Date.now(), idx));
  });
  return out;
}

export function baseReportToLocalStorageSnapshot(baseReport, playerName = "SignoffRegression") {
  const emptyProgress = JSON.stringify({ progress: {}, stars: 0, playerLevel: 1, xp: 0, badges: [] });
  return {
    mleo_player_name: playerName,
    mleo_time_tracking: JSON.stringify({ operations: topicMapToStorage(baseReport?.mathOperations || {}) }),
    mleo_math_master_progress: emptyProgress,
    mleo_mistakes: "[]",
    mleo_geometry_time_tracking: JSON.stringify({ topics: topicMapToStorage(baseReport?.geometryTopics || {}) }),
    mleo_geometry_master_progress: emptyProgress,
    mleo_geometry_mistakes: "[]",
    mleo_english_time_tracking: JSON.stringify({ topics: topicMapToStorage(baseReport?.englishTopics || {}) }),
    mleo_english_master_progress: emptyProgress,
    mleo_english_mistakes: "[]",
    mleo_science_time_tracking: JSON.stringify({ topics: topicMapToStorage(baseReport?.scienceTopics || {}) }),
    mleo_science_master_progress: emptyProgress,
    mleo_science_mistakes: "[]",
    mleo_hebrew_time_tracking: JSON.stringify({ topics: topicMapToStorage(baseReport?.hebrewTopics || {}) }),
    mleo_hebrew_master_progress: emptyProgress,
    mleo_hebrew_mistakes: "[]",
    mleo_moledet_geography_time_tracking: JSON.stringify({
      topics: topicMapToStorage(baseReport?.moledetGeographyTopics || {}),
    }),
    mleo_moledet_geography_master_progress: emptyProgress,
    mleo_moledet_geography_mistakes: "[]",
    mleo_daily_challenge: JSON.stringify({ questions: 0, correct: 0, bestScore: 0 }),
    mleo_weekly_challenge: JSON.stringify({ current: 0, target: 100, completed: false }),
  };
}

export default { baseReportToLocalStorageSnapshot };
