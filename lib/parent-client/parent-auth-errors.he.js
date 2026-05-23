/**
 * Maps Supabase/auth provider errors to safe Hebrew messages for parent UI.
 * Never show raw English provider strings to parents.
 */

/** @type {Record<string, string>} */
const EXACT_MESSAGES = {
  "Invalid login credentials":
    "פרטי ההתחברות שגויים. בדקו את כתובת המייל והסיסמה ונסו שוב.",
  "Email not confirmed":
    "יש לאשר את כתובת האימייל לפני הכניסה. בדקו את תיבת הדואר.",
  "User already registered":
    "כתובת האימייל כבר רשומה במערכת. נסו להתחבר.",
  "Password should be at least 6 characters":
    "הסיסמה חייבת להכיל לפחות 6 תווים.",
  "Signup requires a valid password":
    "יש להזין סיסמה תקינה (לפחות 6 תווים).",
  "Unable to validate email address: invalid format":
    "כתובת האימייל אינה תקינה. בדקו ונסו שוב.",
  "Signups not allowed for this instance":
    "ההרשמה אינה זמינה כרגע. נסו שוב מאוחר יותר.",
  "Email rate limit exceeded":
    "בוצעו יותר מדי ניסיונות. המתינו מספר דקות ונסו שוב.",
  "For security purposes, you can only request this after":
    "בוצעו יותר מדי ניסיונות. המתינו מספר דקות ונסו שוב.",
};

/** @type {Array<[RegExp, string]>} */
const PARTIAL_PATTERNS = [
  [/invalid login credentials/i, EXACT_MESSAGES["Invalid login credentials"]],
  [/email not confirmed/i, EXACT_MESSAGES["Email not confirmed"]],
  [/user already registered/i, EXACT_MESSAGES["User already registered"]],
  [/password should be at least/i, EXACT_MESSAGES["Password should be at least 6 characters"]],
  [/invalid format/i, EXACT_MESSAGES["Unable to validate email address: invalid format"]],
  [/rate limit/i, EXACT_MESSAGES["Email rate limit exceeded"]],
  [/network/i, "בעיית תקשורת. בדקו את החיבור לאינטרנט ונסו שוב."],
  [/fetch failed/i, "בעיית תקשורת. בדקו את החיבור לאינטרנט ונסו שוב."],
];

function looksLikeEnglish(text) {
  return /[A-Za-z]/.test(text);
}

/**
 * @param {{ message?: string } | string | null | undefined} error
 * @param {'login' | 'signup'} [context]
 * @returns {string}
 */
export function mapParentAuthError(error, context = "login") {
  if (!error) {
    return context === "signup"
      ? "ההרשמה נכשלה. נסו שוב."
      : "הכניסה נכשלה. נסו שוב.";
  }

  const raw = String(typeof error === "string" ? error : error.message || "").trim();
  if (!raw) {
    return context === "signup"
      ? "ההרשמה נכשלה. נסו שוב."
      : "הכניסה נכשלה. נסו שוב.";
  }

  if (EXACT_MESSAGES[raw]) return EXACT_MESSAGES[raw];

  for (const [pattern, hebrew] of PARTIAL_PATTERNS) {
    if (pattern.test(raw)) return hebrew;
  }

  if (looksLikeEnglish(raw)) {
    return context === "signup"
      ? "ההרשמה נכשלה. נסו שוב או פנו לתמיכה."
      : "הכניסה נכשלה. נסו שוב או פנו לתמיכה.";
  }

  return raw;
}

export default mapParentAuthError;
