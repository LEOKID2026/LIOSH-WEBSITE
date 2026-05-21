import {
  isTrackingDebugEnabled,
  trackingDebugRecordTrack,
} from "./tracking-debug.js";

const ENGLISH_TIME_TRACKING_KEY = "mleo_english_time_tracking";

/**
 * Track time spent on an English topic (in seconds).
 * Stores aggregates per topic, grade, level and per-day totals.
 */
export function trackEnglishTopicTime(topic, grade, level, duration, meta = {}) {
  if (typeof window === "undefined") return;

  if (isTrackingDebugEnabled()) {
    trackingDebugRecordTrack(topic, duration, meta?.mode, "trackEnglishTopicTime");
  }

  if (!topic || !duration) return;

  try {
    const saved = JSON.parse(
      localStorage.getItem(ENGLISH_TIME_TRACKING_KEY) || "{}"
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

    // Update totals
    saved.topics[topic].total += duration;
    saved.topics[topic].byGrade[grade] =
      (saved.topics[topic].byGrade[grade] || 0) + duration;
    saved.topics[topic].byLevel[level] =
      (saved.topics[topic].byLevel[level] || 0) + duration;

    saved.topics[topic].sessions.push({
      date: today,
      duration,
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

    saved.daily[today].total += duration;
    saved.daily[today].topics[topic] =
      (saved.daily[today].topics[topic] || 0) + duration;
    saved.daily[today].byGrade[grade] =
      (saved.daily[today].byGrade[grade] || 0) + duration;
    saved.daily[today].byLevel[level] =
      (saved.daily[today].byLevel[level] || 0) + duration;

    localStorage.setItem(ENGLISH_TIME_TRACKING_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Error tracking English topic time:", error);
  }
}

export function getEnglishTimeByCustomPeriod(startDate, endDate) {
  if (typeof window === "undefined") return {};

  try {
    const saved = JSON.parse(
      localStorage.getItem(ENGLISH_TIME_TRACKING_KEY) || "{}"
    );
    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = {
      total: 0,
      topics: {},
      daily: [],
      byGrade: {},
      byLevel: {},
    };

    Object.entries(saved.daily || {}).forEach(([date, data]) => {
      const dateObj = new Date(date);
      if (dateObj >= start && dateObj <= end) {
        result.total += data.total || 0;
        result.daily.push({
          date,
          total: data.total || 0,
          topics: data.topics || {},
          byGrade: data.byGrade || {},
          byLevel: data.byLevel || {},
        });

        Object.entries(data.topics || {}).forEach(([topic, time]) => {
          result.topics[topic] = (result.topics[topic] || 0) + time;
        });

        Object.entries(data.byGrade || {}).forEach(([grade, time]) => {
          result.byGrade[grade] = (result.byGrade[grade] || 0) + time;
        });

        Object.entries(data.byLevel || {}).forEach(([lvl, time]) => {
          result.byLevel[lvl] = (result.byLevel[lvl] || 0) + time;
        });
      }
    });

    result.totalMinutes = Math.round(result.total / 60);
    result.totalHours = (result.total / 3600).toFixed(2);

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
      daily: [],
      byGrade: {},
      byLevel: {},
    };
  }
}

export function getEnglishTimeByPeriod(period = "week") {
  if (typeof window === "undefined") return {};
  try {
    const now = new Date();
    const days = period === "week" ? 7 : period === "month" ? 30 : 365;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return getEnglishTimeByCustomPeriod(start, now);
  } catch {
    return {
      total: 0,
      totalMinutes: 0,
      topics: {},
      daily: [],
      byGrade: {},
      byLevel: {},
    };
  }
}

/** Retained for API compatibility. Does not trim sessions or daily — full history preserved. */
export function cleanOldEnglishTimeTracking() {
  if (typeof window === "undefined") return;
}

