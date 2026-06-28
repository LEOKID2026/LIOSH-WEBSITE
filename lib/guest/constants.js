/** Browser key for guest resume token (opaque UUID). */
export const LIOSH_GUEST_RESUME_TOKEN_KEY = "liosh_guest_resume_token";

export const GUEST_ACCOUNT_KIND = "guest";
export const REGISTERED_ACCOUNT_KIND = "registered";

export const GUEST_STATUS_ACTIVE = "active";
export const GUEST_STATUS_LINKED = "linked";

export const GUEST_SESSION_KIND = "guest";

/** Silent default grade for guest learning masters (no grade picker in UI). */
export const GUEST_DEFAULT_GRADE_LEVEL = "g3";

export const GUEST_SYSTEM_PARENT_EMAIL =
  (typeof process !== "undefined" && process.env?.GUEST_SYSTEM_PARENT_EMAIL) ||
  "guest-system@liosh.invalid";

/** Home dashboard panel ids locked for guests. */
export const GUEST_LOCKED_HOME_PANELS = Object.freeze([
  "stats",
  "progress",
  "missions",
  "classroom",
  "worksheets",
  "recommendations",
]);

export const GUEST_LOCK_MESSAGE_HE = "לא זמין במצב אורח";
export const GUEST_GAME_LOCK_MESSAGE_HE = "לא זמין במצב אורח";
export const GUEST_TOPIC_LOCK_MESSAGE_HE = "נושא זה נעול במצב אורח";
export const GUEST_GAME_LOCK_LABEL_HE = "נעול";
export const GUEST_GAME_LOCK_HINT_HE = "פנה להורה כדי לפתוח";
