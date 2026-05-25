export const ACTIVITY_MODE_LABEL_HE = {
  live_lesson: "שיעור חי",
  guided_practice: "תרגול מודרך",
  quiz: "בוחן",
  homework: "שיעורי בית",
};

export const ACTIVITY_STATUS_LABEL_HE = {
  draft: "טיוטה",
  active: "פעיל",
  paused: "מושהה",
  closed: "סגור",
  archived: "בארכיון",
};

export const STUDENT_ACTIVITY_STATUS_LABEL_HE = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  submitted: "הוגש",
  timed_out: "נגמר הזמן",
};

export function activityModeLabelHe(mode) {
  return ACTIVITY_MODE_LABEL_HE[mode] || mode;
}

export function activityStatusLabelHe(status) {
  return ACTIVITY_STATUS_LABEL_HE[status] || status;
}

export function studentActivityStatusLabelHe(status) {
  return STUDENT_ACTIVITY_STATUS_LABEL_HE[status] || status;
}

export function isClassroomActivitiesEnabled() {
  return process.env.NEXT_PUBLIC_ACTIVITIES_ENABLED === "true";
}
