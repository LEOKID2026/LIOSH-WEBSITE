import {
  isTrackingDebugEnabled,
  trackingDebugRecordTrack,
} from "./tracking-debug.js";

const MOLEDET_GEOGRAPHY_TIME_TRACKING_KEY = "mleo_moledet_geography_time_tracking";

/**
 * Track time spent on a Moledet & Geography topic (in seconds).
 * Stores aggregates per topic, grade, level and per-day totals.
 */
export function trackMoledetGeographyTopicTime(topic, grade, level, duration, meta = {}) {
  if (typeof window === "undefined") return;

  if (isTrackingDebugEnabled()) {
    trackingDebugRecordTrack(
      topic,
      duration,
      meta?.mode,
      "trackMoledetGeographyTopicTime"
    );
  }

  if (!topic || !duration) return;

  try {
    const saved = JSON.parse(
      localStorage.getItem(MOLEDET_GEOGRAPHY_TIME_TRACKING_KEY) || "{}"
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

    localStorage.setItem(MOLEDET_GEOGRAPHY_TIME_TRACKING_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Error tracking Moledet & Geography topic time:", error);
  }
}

export function getMoledetGeographyTimeByCustomPeriod(startDate, endDate) {
  if (typeof window === "undefined") return {};

  try {
    const saved = JSON.parse(
      localStorage.getItem(MOLEDET_GEOGRAPHY_TIME_TRACKING_KEY) || "{}"
    );
    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = {
      total: 0,
      topics: {},
      daily: {},
      byGrade: {},
      byLevel: {},
      totalMinutes: 0,
    };

    Object.entries(saved.daily || {}).forEach(([date, data]) => {
      const dateObj = new Date(date);
      if (dateObj >= start && dateObj <= end) {
        result.total += data.total || 0;
        result.daily[date] = {
          total: data.total || 0,
          topics: data.topics || {},
          byGrade: data.byGrade || {},
          byLevel: data.byLevel || {},
        };

        Object.entries(data.topics || {}).forEach(([topic, time]) => {
          if (!result.topics[topic]) {
            result.topics[topic] = { seconds: 0, minutes: 0 };
          }
          result.topics[topic].seconds += time;
          result.topics[topic].minutes = Math.round(
            result.topics[topic].seconds / 60
          );
        });
      }
    });

    result.totalMinutes = Math.round(result.total / 60);

    // Convert topics to minutes format for compatibility
    Object.keys(result.topics).forEach((topic) => {
      if (result.topics[topic].minutes !== undefined) {
        result.topics[topic] = {
          minutes: result.topics[topic].minutes,
          seconds: result.topics[topic].seconds,
        };
      } else {
        result.topics[topic] = {
          minutes: Math.round(result.topics[topic] / 60),
          seconds: result.topics[topic],
        };
      }
    });

    return result;
  } catch (error) {
    console.error("Error getting Moledet & Geography time by period:", error);
    return {};
  }
}

