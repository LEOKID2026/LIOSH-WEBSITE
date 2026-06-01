export {
  ACTIVITY_MODE_LABEL_HE,
  ACTIVITY_STATUS_LABEL_HE,
  STUDENT_ACTIVITY_STATUS_LABEL_HE,
  activityModeLabelHe,
  activityStatusLabelHe,
  studentActivityStatusLabelHe,
} from "../platform-ui/hebrew-display-labels.js";

export function isClassroomActivitiesEnabled() {
  // Enabled by default; only explicit "false" turns the student activity UI off (build-time env).
  return process.env.NEXT_PUBLIC_ACTIVITIES_ENABLED !== "false";
}
