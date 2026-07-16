export const PUBLIC_WORKSHEET_PAGE_PATH = "/practice/worksheets";

export const PUBLIC_WORKSHEET_SESSION_STORAGE_KEY = "leo_public_worksheet_visit_session_id";

export const PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY = "leo_public_worksheet_page_view_sent";

/** @typedef {"leo_public_worksheet_visit_session_id" | "leo_public_worksheet_page_view_sent"} PublicWorksheetSessionStorageKey */

export const PUBLIC_WORKSHEET_ANALYTICS_EVENTS = Object.freeze([
  "public_worksheet_page_viewed",
  "public_worksheet_generated",
]);

export const PUBLIC_WORKSHEET_ANALYTICS_EVENT_SET = new Set(PUBLIC_WORKSHEET_ANALYTICS_EVENTS);
