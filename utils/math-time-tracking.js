// מערכת מעקב זמן לפי פעולה/נושא, כיתה ורמה (חשבון וגאומטריה)

import {
  isTrackingDebugEnabled,
  trackingDebugRecordTrack,
} from "./tracking-debug.js";

const TIME_TRACKING_KEY = "mleo_time_tracking";
const GEOMETRY_TIME_TRACKING_KEY = "mleo_geometry_time_tracking";

/**
 * Optional session metadata for Parent Report V2 (backward compatible).
 * @typedef {{ mode?: string, correct?: number, total?: number, baseOperation?: string, kind?: string }} TrackSessionMeta
 */

/**
 * מפתח אחסון לדוח הורים: פעולה בסיסית, או פעולה::סוג שאלה (params.kind) כשקיים.
 * תאימות לאחור: בלי kind נשאר המפתח הישן (למשל addition).
 */
export function buildMathReportStorageKey(baseOperation, questionLike) {
  const base =
    baseOperation != null && String(baseOperation).trim()
      ? String(baseOperation).trim()
      : "";
  if (!base) return base;
  const rawKind = questionLike?.params?.kind;
  const kind =
    rawKind != null && String(rawKind).trim()
      ? String(rawKind).trim().replace(/::/g, "_")
      : "";
  if (!kind || kind === base) return base;
  return `${base}::${kind}`;
}

// שמירת זמן עבודה על פעולה ספציפית (חשבון) — המפתח הראשון הוא מפתח bucket ב saved.operations (יכול להיות מורכב לדוח)
export function trackOperationTime(storageBucketKey, grade, level, duration, meta = {}) {
  if (typeof window === "undefined") return;

  if (isTrackingDebugEnabled()) {
    trackingDebugRecordTrack(
      storageBucketKey,
      duration,
      meta?.mode,
      "trackOperationTime"
    );
  }

  try {
    const saved = JSON.parse(localStorage.getItem(TIME_TRACKING_KEY) || "{}");
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const baseOperationForSession =
      meta.baseOperation != null && String(meta.baseOperation).trim() !== ""
        ? String(meta.baseOperation).trim()
        : String(storageBucketKey).includes("::")
          ? String(storageBucketKey).split("::")[0]
          : String(storageBucketKey);
    
    // אתחול מבנה הנתונים
    if (!saved.operations) saved.operations = {};
    if (!saved.operations[storageBucketKey]) {
      saved.operations[storageBucketKey] = {
        total: 0, // סך הכל בשניות
        sessions: [],
        byGrade: {},
        byLevel: {}
      };
    }
    
    if (!saved.daily) saved.daily = {};
    if (!saved.daily[today]) {
      saved.daily[today] = {
        total: 0,
        operations: {},
        byGrade: {},
        byLevel: {}
      };
    }
    
    // עדכון סך הכל
    saved.operations[storageBucketKey].total += duration;
    
    // עדכון לפי כיתה
    if (!saved.operations[storageBucketKey].byGrade[grade]) {
      saved.operations[storageBucketKey].byGrade[grade] = 0;
    }
    saved.operations[storageBucketKey].byGrade[grade] += duration;
    
    // עדכון לפי רמה
    if (!saved.operations[storageBucketKey].byLevel[level]) {
      saved.operations[storageBucketKey].byLevel[level] = 0;
    }
    saved.operations[storageBucketKey].byLevel[level] += duration;
    
    // הוספת סשן (כולל mode / ניקוד לשורת דוח מסוננת) — מערך מלא, ללא קיצוץ
    saved.operations[storageBucketKey].sessions.push({
      date: today,
      duration,
      grade,
      level,
      operation: baseOperationForSession,
      mathReportBucket: storageBucketKey,
      kind: meta.kind !== undefined && meta.kind !== null ? String(meta.kind) : undefined,
      timestamp: Date.now(),
      mode: meta.mode != null ? String(meta.mode) : "learning",
      total: meta.total !== undefined ? Number(meta.total) : 1,
      correct:
        meta.correct !== undefined && meta.correct !== null
          ? Number(meta.correct)
          : undefined,
    });
    
    // עדכון יומי
    saved.daily[today].total += duration;
    if (!saved.daily[today].operations[storageBucketKey]) {
      saved.daily[today].operations[storageBucketKey] = 0;
    }
    saved.daily[today].operations[storageBucketKey] += duration;
    
    if (!saved.daily[today].byGrade[grade]) {
      saved.daily[today].byGrade[grade] = 0;
    }
    saved.daily[today].byGrade[grade] += duration;
    
    if (!saved.daily[today].byLevel[level]) {
      saved.daily[today].byLevel[level] = 0;
    }
    saved.daily[today].byLevel[level] += duration;
    
    // שמירה
    localStorage.setItem(TIME_TRACKING_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Error tracking time:", error);
  }
}

// קבלת זמן כולל לפי פעולה
export function getOperationTime(operation) {
  if (typeof window === "undefined") return { total: 0, minutes: 0, hours: 0 };
  
  try {
    const saved = JSON.parse(localStorage.getItem(TIME_TRACKING_KEY) || "{}");
    const total = saved.operations?.[operation]?.total || 0;
    
    return {
      total, // בשניות
      minutes: Math.round(total / 60),
      hours: (total / 3600).toFixed(2)
    };
  } catch {
    return { total: 0, minutes: 0, hours: 0 };
  }
}

// קבלת זמן לפי תקופה מותאמת אישית
export function getTimeByCustomPeriod(startDate, endDate) {
  if (typeof window === "undefined") return {};
  
  try {
    const saved = JSON.parse(localStorage.getItem(TIME_TRACKING_KEY) || "{}");
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const result = {
      total: 0,
      operations: {},
      daily: [],
      byGrade: {},
      byLevel: {}
    };
    
    // סיכום לפי ימים
    Object.entries(saved.daily || {}).forEach(([date, data]) => {
      const dateObj = new Date(date);
      if (dateObj >= start && dateObj <= end) {
        result.total += data.total || 0;
        result.daily.push({
          date,
          total: data.total || 0,
          operations: data.operations || {},
          byGrade: data.byGrade || {},
          byLevel: data.byLevel || {}
        });
        
        // סיכום לפי פעולות
        Object.entries(data.operations || {}).forEach(([op, time]) => {
          if (!result.operations[op]) result.operations[op] = 0;
          result.operations[op] += time;
        });
        
        // סיכום לפי כיתה
        Object.entries(data.byGrade || {}).forEach(([grade, time]) => {
          if (!result.byGrade[grade]) result.byGrade[grade] = 0;
          result.byGrade[grade] += time;
        });
        
        // סיכום לפי רמה
        Object.entries(data.byLevel || {}).forEach(([level, time]) => {
          if (!result.byLevel[level]) result.byLevel[level] = 0;
          result.byLevel[level] += time;
        });
      }
    });
    
    // המרה לדקות
    result.totalMinutes = Math.round(result.total / 60);
    result.totalHours = (result.total / 3600).toFixed(2);
    
    Object.keys(result.operations).forEach(op => {
      result.operations[op] = {
        seconds: result.operations[op],
        minutes: Math.round(result.operations[op] / 60),
        hours: (result.operations[op] / 3600).toFixed(2)
      };
    });
    
    return result;
  } catch {
    return { total: 0, totalMinutes: 0, operations: {}, daily: [], byGrade: {}, byLevel: {} };
  }
}

// קבלת זמן לפי תקופה (שבוע/חודש/שנה)
export function getTimeByPeriod(period = 'week') {
  if (typeof window === "undefined") return {};
  
  try {
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return getTimeByCustomPeriod(startDate, now);
  } catch {
    return { total: 0, totalMinutes: 0, operations: {}, daily: [], byGrade: {}, byLevel: {} };
  }
}

// קבלת כל הנתונים
export function getAllTimeTracking() {
  if (typeof window === "undefined") return null;
  
  try {
    return JSON.parse(localStorage.getItem(TIME_TRACKING_KEY) || "{}");
  } catch {
    return null;
  }
}

/**
 * נשמר לתאימות לאחור. אין מחיקת סשנים/ימים — היסטוריה מלאה; סינון לפי טווח בדוח בלבד.
 */
export function cleanOldTimeTracking() {
  if (typeof window === "undefined") return;
}

// ========== גאומטריה ==========

// שמירת זמן עבודה על נושא ספציפי (גאומטריה)
export function trackGeometryTopicTime(topic, grade, level, duration, meta = {}) {
  if (typeof window === "undefined") return;

  if (isTrackingDebugEnabled()) {
    trackingDebugRecordTrack(topic, duration, meta?.mode, "trackGeometryTopicTime");
  }

  try {
    const saved = JSON.parse(localStorage.getItem(GEOMETRY_TIME_TRACKING_KEY) || "{}");
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // אתחול מבנה הנתונים
    if (!saved.topics) saved.topics = {};
    if (!saved.topics[topic]) {
      saved.topics[topic] = {
        total: 0, // סך הכל בשניות
        sessions: [],
        byGrade: {},
        byLevel: {}
      };
    }
    
    if (!saved.daily) saved.daily = {};
    if (!saved.daily[today]) {
      saved.daily[today] = {
        total: 0,
        topics: {},
        byGrade: {},
        byLevel: {}
      };
    }
    
    // עדכון סך הכל
    saved.topics[topic].total += duration;
    
    // עדכון לפי כיתה
    if (!saved.topics[topic].byGrade[grade]) {
      saved.topics[topic].byGrade[grade] = 0;
    }
    saved.topics[topic].byGrade[grade] += duration;
    
    // עדכון לפי רמה
    if (!saved.topics[topic].byLevel[level]) {
      saved.topics[topic].byLevel[level] = 0;
    }
    saved.topics[topic].byLevel[level] += duration;
    
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
    
    // עדכון יומי
    saved.daily[today].total += duration;
    if (!saved.daily[today].topics[topic]) {
      saved.daily[today].topics[topic] = 0;
    }
    saved.daily[today].topics[topic] += duration;
    
    if (!saved.daily[today].byGrade[grade]) {
      saved.daily[today].byGrade[grade] = 0;
    }
    saved.daily[today].byGrade[grade] += duration;
    
    if (!saved.daily[today].byLevel[level]) {
      saved.daily[today].byLevel[level] = 0;
    }
    saved.daily[today].byLevel[level] += duration;
    
    // שמירה
    localStorage.setItem(GEOMETRY_TIME_TRACKING_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Error tracking geometry time:", error);
  }
}

// קבלת זמן לפי תקופה מותאמת אישית (גאומטריה)
export function getGeometryTimeByCustomPeriod(startDate, endDate) {
  if (typeof window === "undefined") return {};
  
  try {
    const saved = JSON.parse(localStorage.getItem(GEOMETRY_TIME_TRACKING_KEY) || "{}");
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const result = {
      total: 0,
      topics: {},
      daily: [],
      byGrade: {},
      byLevel: {}
    };
    
    // סיכום לפי ימים
    Object.entries(saved.daily || {}).forEach(([date, data]) => {
      const dateObj = new Date(date);
      if (dateObj >= start && dateObj <= end) {
        result.total += data.total || 0;
        result.daily.push({
          date,
          total: data.total || 0,
          topics: data.topics || {},
          byGrade: data.byGrade || {},
          byLevel: data.byLevel || {}
        });
        
        // סיכום לפי נושאים
        Object.entries(data.topics || {}).forEach(([topic, time]) => {
          if (!result.topics[topic]) result.topics[topic] = 0;
          result.topics[topic] += time;
        });
        
        // סיכום לפי כיתה
        Object.entries(data.byGrade || {}).forEach(([grade, time]) => {
          if (!result.byGrade[grade]) result.byGrade[grade] = 0;
          result.byGrade[grade] += time;
        });
        
        // סיכום לפי רמה
        Object.entries(data.byLevel || {}).forEach(([level, time]) => {
          if (!result.byLevel[level]) result.byLevel[level] = 0;
          result.byLevel[level] += time;
        });
      }
    });
    
    // המרה לדקות
    result.totalMinutes = Math.round(result.total / 60);
    result.totalHours = (result.total / 3600).toFixed(2);
    
    Object.keys(result.topics).forEach(topic => {
      result.topics[topic] = {
        seconds: result.topics[topic],
        minutes: Math.round(result.topics[topic] / 60),
        hours: (result.topics[topic] / 3600).toFixed(2)
      };
    });
    
    return result;
  } catch {
    return { total: 0, totalMinutes: 0, topics: {}, daily: [], byGrade: {}, byLevel: {} };
  }
}

// קבלת זמן לפי תקופה (גאומטריה)
export function getGeometryTimeByPeriod(period = 'week') {
  if (typeof window === "undefined") return {};
  
  try {
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return getGeometryTimeByCustomPeriod(startDate, now);
  } catch {
    return { total: 0, totalMinutes: 0, topics: {}, daily: [], byGrade: {}, byLevel: {} };
  }
}

