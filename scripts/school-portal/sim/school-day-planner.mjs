/**
 * Daily school schedule: class × subject × hour.
 */
import {
  PHYSICAL_CLASSES,
  TIMETABLE_BY_DAY,
  classRecordKey,
  physicalClassName,
  teacherKeyForSubject,
} from "../demo-school-data.mjs";
import { activityModeForSlot, resolveSlotSubject } from "./school-sim-config.mjs";

const START_DATE = "2025-09-01";

export function schoolDayToWeekday(schoolDay) {
  const start = new Date(`${START_DATE}T12:00:00Z`);
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + schoolDay);
  let dow = d.getUTCDay();
  while (dow === 5 || dow === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
    dow = d.getUTCDay();
  }
  return dow;
}

export function weekdayToTimetableIndex(dow) {
  if (dow === 0) return 0;
  if (dow >= 1 && dow <= 4) return dow;
  return null;
}

/**
 * @param {object} state sim-state with classIds, teacherIds
 * @param {number} schoolDay 1-based simulated day
 */
export function generateDailyPlan(state, schoolDay) {
  const dow = schoolDayToWeekday(schoolDay);
  const ttIndex = weekdayToTimetableIndex(dow);
  if (ttIndex == null) {
    return { schoolDay, weekday: dow, skipped: true, slots: [], plannedActivities: 0 };
  }

  const rawSlots = TIMETABLE_BY_DAY[ttIndex];
  const slots = [];

  for (const pc of PHYSICAL_CLASSES) {
    const physicalName = physicalClassName(pc.grade, pc.section);
    for (let hour = 0; hour < rawSlots.length; hour++) {
      const rawSubject = rawSlots[hour];
      const subject = resolveSlotSubject(rawSubject, pc.grade, hour);
      const classId = state.classIds[classRecordKey(pc.grade, pc.section, subject)];
      if (!classId) continue;
      const teacherKey = teacherKeyForSubject(pc.grade, subject);
      const teacherId = state.teacherIds[teacherKey];
      const hour1 = hour + 1;
      slots.push({
        physicalName,
        grade: pc.grade,
        section: pc.section,
        subject,
        rawSubject,
        classId,
        teacherId,
        teacherKey,
        hour: hour1,
        mode: activityModeForSlot({ subject, hour: hour1, weekdayIndex: ttIndex }),
        title: `יום ${schoolDay} שעה ${hour1} — ${subject}`,
        schoolDay,
      });
    }
  }

  return {
    schoolDay,
    weekday: dow,
    weekdayIndex: ttIndex,
    skipped: false,
    slots,
    plannedActivities: slots.length,
  };
}
