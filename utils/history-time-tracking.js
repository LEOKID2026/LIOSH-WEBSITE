import {
  isTrackingDebugEnabled,
  trackingDebugRecordTrack,
} from "./tracking-debug.js";

const HISTORY_TIME_TRACKING_KEY = "mleo_history_time_tracking";

export function trackHistoryTopicTime(topic, grade, level, durationSeconds, meta = {}) {
  if (typeof window === "undefined") return;

  if (isTrackingDebugEnabled()) {
    trackingDebugRecordTrack(
      topic,
      durationSeconds,
      meta?.mode,
      "trackHistoryTopicTime"
    );
  }

  if (!topic || !durationSeconds) return;

  try {
    const saved = JSON.parse(
      localStorage.getItem(HISTORY_TIME_TRACKING_KEY) || "{}"
    );
    const today = new Date().toISOString().split("T")[0];

    if (!saved.topics) saved.topics = {};
    if (!saved.topics[topic]) {
      saved.topics[topic] = {
        total: 0,
        sessions: [],
        byGrade: {},
        byLevel: {},
      };
    }

    if (!saved.daily) saved.daily = {};
    if (!saved.daily[today]) {
      saved.daily[today] = {
        total: 0,
        topics: {},
        byGrade: {},
        byLevel: {},
      };
    }

    saved.topics[topic].total += durationSeconds;
    if (grade) {
      saved.topics[topic].byGrade[grade] =
        (saved.topics[topic].byGrade[grade] || 0) + durationSeconds;
    }
    if (level) {
      saved.topics[topic].byLevel[level] =
        (saved.topics[topic].byLevel[level] || 0) + durationSeconds;
    }

    saved.topics[topic].sessions.push({
      date: today,
      duration: durationSeconds,
      grade,
      level,
      topic,
      timestamp: Date.now(),
      mode: meta.mode != null ? String(meta.mode) : "learning",
      total: meta.total !== undefined ? Number(meta.total) : 1,
      correct:
        meta.correct !== undefined && meta.correct !== null
          ? Number(meta.correct)
          : undefined,
    });

    saved.daily[today].total += durationSeconds;
    saved.daily[today].topics[topic] =
      (saved.daily[today].topics[topic] || 0) + durationSeconds;
    if (grade) {
      saved.daily[today].byGrade[grade] =
        (saved.daily[today].byGrade[grade] || 0) + durationSeconds;
    }
    if (level) {
      saved.daily[today].byLevel[level] =
        (saved.daily[today].byLevel[level] || 0) + durationSeconds;
    }

    localStorage.setItem(HISTORY_TIME_TRACKING_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Error tracking history topic time:", error);
  }
}

export function getHistoryTimeByCustomPeriod(startDate, endDate) {
  if (typeof window === "undefined") return {};

  try {
    const saved = JSON.parse(
      localStorage.getItem(HISTORY_TIME_TRACKING_KEY) || "{}"
    );
    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = {
      total: 0,
      totalMinutes: 0,
      topics: {},
      daily: {},
      byGrade: {},
      byLevel: {},
    };

    Object.entries(saved.daily || {}).forEach(([date, data]) => {
      const dateObj = new Date(date);
      if (dateObj >= start && dateObj <= end) {
        result.total += data.total || 0;
        result.daily[date] = data;

        Object.entries(data.topics || {}).forEach(([topic, seconds]) => {
          result.topics[topic] = (result.topics[topic] || 0) + seconds;
        });

        Object.entries(data.byGrade || {}).forEach(([grade, seconds]) => {
          result.byGrade[grade] = (result.byGrade[grade] || 0) + seconds;
        });

        Object.entries(data.byLevel || {}).forEach(([lvl, seconds]) => {
          result.byLevel[lvl] = (result.byLevel[lvl] || 0) + seconds;
        });
      }
    });

    result.totalMinutes = Math.round(result.total / 60);

    Object.keys(result.topics).forEach((topic) => {
      const seconds = result.topics[topic];
      result.topics[topic] = {
        seconds,
        minutes: Math.round(seconds / 60),
        hours: (seconds / 3600).toFixed(2),
      };
    });

    return result;
  } catch {
    return {
      total: 0,
      totalMinutes: 0,
      topics: {},
      daily: {},
      byGrade: {},
      byLevel: {},
    };
  }
}

export function getHistoryTimeByPeriod(period = "week") {
  if (typeof window === "undefined") return {};
  try {
    const now = new Date();
    const days = period === "week" ? 7 : period === "month" ? 30 : 365;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return getHistoryTimeByCustomPeriod(start, now);
  } catch {
    return {
      total: 0,
      totalMinutes: 0,
      topics: {},
      daily: {},
      byGrade: {},
      byLevel: {},
    };
  }
}

/** Retained for API compatibility. Does not trim sessions or daily — full history preserved. */
export function cleanOldHistoryTimeTracking() {
  if (typeof window === "undefined") return;
}
