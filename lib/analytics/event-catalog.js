export const ANALYTICS_EVENT_CATALOG = Object.freeze({
  parent_login: { family: "auth", featureKey: "parent_auth" },
  teacher_login: { family: "auth", featureKey: "teacher_auth" },
  teacher_dashboard_opened: { family: "navigation", featureKey: "teacher_dashboard" },
  teacher_report_opened: { family: "report", featureKey: "teacher_report" },
  teacher_activity_created: { family: "activity", featureKey: "teacher_activity" },
  teacher_worksheet_created: { family: "worksheet", featureKey: "teacher_worksheet" },
  parent_dashboard_opened: { family: "navigation", featureKey: "parent_dashboard" },
  child_created: { family: "activity", featureKey: "child_management" },
  parent_report_opened: { family: "report", featureKey: "parent_report" },
  parent_report_pdf_exported: { family: "report", featureKey: "parent_report_pdf" },
  personal_activity_created: { family: "activity", featureKey: "parent_activity" },
  personal_activity_results_opened: { family: "activity", featureKey: "parent_activity_results" },
  student_login: { family: "auth", featureKey: "student_auth" },
  student_home_opened: { family: "navigation", featureKey: "student_home" },
  subject_opened: { family: "navigation", featureKey: "subject" },
  topic_opened: { family: "navigation", featureKey: "topic" },
  practice_started: { family: "learning", featureKey: "practice" },
  question_answered: { family: "learning", featureKey: "practice_question" },
  practice_completed: { family: "learning", featureKey: "practice" },
  practice_abandoned: { family: "learning", featureKey: "practice" },
  book_opened: { family: "book", featureKey: "learning_book" },
  book_section_opened: { family: "book", featureKey: "learning_book_section" },
  audio_played: { family: "audio", featureKey: "learning_audio" },
  explanation_opened: { family: "learning", featureKey: "explanation" },
  worksheet_opened: { family: "worksheet", featureKey: "worksheet_pdf" },
  personal_activity_started: { family: "activity", featureKey: "parent_activity" },
  personal_activity_completed: { family: "activity", featureKey: "parent_activity" },
  reward_earned: { family: "reward", featureKey: "coins_rewards" },
  admin_analytics_opened: { family: "admin", featureKey: "admin_analytics" },
  analytics_truth_check_run: { family: "admin", featureKey: "admin_analytics_truth" },
  analytics_event_ingestion_error: { family: "system", featureKey: "analytics_ingestion" },
  public_worksheet_page_viewed: { family: "worksheet", featureKey: "public_worksheet_generator" },
  public_worksheet_generated: { family: "worksheet", featureKey: "public_worksheet_generator" },
});

export const ANALYTICS_EVENT_NAMES = Object.freeze(Object.keys(ANALYTICS_EVENT_CATALOG));

export function analyticsEventDefaults(eventName) {
  return ANALYTICS_EVENT_CATALOG[eventName] || { family: null, featureKey: null };
}
