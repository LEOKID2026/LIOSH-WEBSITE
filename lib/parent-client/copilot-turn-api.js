import { getLearningSupabaseBrowserClient } from "../learning-supabase/client.js";

/**
 * Same bearer resolution as parent report remote load (dashboard / teacher link).
 * @returns {Promise<string | null>}
 */
export async function resolveParentReportBearerToken() {
  if (typeof window === "undefined") return null;
  const supabase = getLearningSupabaseBrowserClient();
  const { data: sessData } = await supabase.auth.getSession();
  let token = sessData?.session?.access_token || null;
  if (!token && window.__parentReportPlaywrightE2eSession === true) {
    token = "playwright-e2e-parent-report";
  }
  return token;
}

/** @type {Record<string, string>} */
const CODE_MESSAGES_HE = {
  STUDENT_ID_REQUIRED: "לא ניתן לזהות את הילד/ה לשאלה על הדוח. רעננו את הדף ונסו שוב.",
  INVALID_REPORT_RANGE: "טווח התאריכים של הדוח אינו תקין. בחרו תקופה מחדש ונסו שוב.",
  SERVER_SNAPSHOT_UNAVAILABLE:
    "לא ניתן להתחבר כרגע לשירות השאלות על הדוח. הדוח עצמו זמין.",
  monthly_ai_limit_exceeded: "הגעתם למכסת השאלות לחודש זה.",
  not_authenticated: "נדרשת התחברות מחדש כהורה.",
  feature_not_enabled: "שאלות על הדוח אינן זמינות לחשבון זה כרגע.",
  parent_account_inactive: "חשבון ההורה אינו פעיל. פנו לתמיכה אם הבעיה נמשכת.",
  not_a_parent: "אין הרשאת הורה לשאול על דוח זה.",
  STUDENT_SESSION_MISMATCH:
    "השאלה חייבת להתייחס לילד/ה המחובר/ת כעת. רעננו את הדף ונסו שוב.",
  STUDENT_NOT_FOUND: "לא נמצא דוח לילד/ה שבחרתם.",
  PARENT_OWNERSHIP_DENIED: "אין הרשאה לשאול על דוח זה.",
};

/**
 * @param {{ ok?: boolean; error?: string; code?: string; errorCode?: string; message?: string }} payload
 * @param {number} status
 * @returns {string}
 */
export function mapParentCopilotTurnErrorHe(payload, status) {
  const code = String(payload?.code || payload?.errorCode || "").trim();
  const err = String(payload?.error || payload?.message || "").trim();

  if (code && CODE_MESSAGES_HE[code]) return CODE_MESSAGES_HE[code];
  if (err && CODE_MESSAGES_HE[err]) return CODE_MESSAGES_HE[err];

  if (status === 401) return CODE_MESSAGES_HE.not_authenticated;
  if (status === 400) {
    if (/studentId is required/i.test(err)) return CODE_MESSAGES_HE.STUDENT_ID_REQUIRED;
    if (/Invalid custom range/i.test(err)) return CODE_MESSAGES_HE.INVALID_REPORT_RANGE;
    if (/Missing payload/i.test(err)) return CODE_MESSAGES_HE.SERVER_SNAPSHOT_UNAVAILABLE;
  }
  if (status === 403) {
    if (/not allowed in unauthenticated dev/i.test(err)) return CODE_MESSAGES_HE.not_authenticated;
    if (/studentId must match/i.test(err)) {
      return "השאלה חייבת להתייחס לילד/ה המחובר/ת כעת. רעננו את הדף ונסו שוב.";
    }
    if (/Student not found/i.test(err)) return "לא נמצא דוח לילד/ה שבחרתם.";
    if (/verify student ownership/i.test(err)) return "אין הרשאה לשאול על דוח זה.";
    return "אין הרשאה לשאול על דוח זה.";
  }
  if (status === 404) return "לא נמצא דוח לילד/ה שבחרתם.";
  if (status === 422) return CODE_MESSAGES_HE.SERVER_SNAPSHOT_UNAVAILABLE;
  if (status === 429) return "בוצעו יותר מדי שאלות. המתינו רגע ונסו שוב.";

  if (err && !/[A-Za-z]{6,}/.test(err)) return err;

  return "לא ניתן לענות על השאלה כרגע. נסו שוב בעוד רגע.";
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export async function postParentCopilotTurn(body) {
  const headers = { "Content-Type": "application/json" };
  const token = await resolveParentReportBearerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch("/api/parent/copilot-turn", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await r.json();
  } catch {
    data = {};
  }

  if (!r.ok || !data.ok) {
    throw new Error(mapParentCopilotTurnErrorHe(data, r.status));
  }

  return data.result;
}
