import {
  SC_AUDIENCE_ALL_PARENTS,
  SC_AUDIENCE_ALL_TEACHERS,
  SC_AUDIENCE_CLASS_PARENTS,
  SC_AUDIENCE_CLASS_TEACHERS,
  SC_AUDIENCE_GRADE_PARENTS,
  SC_AUDIENCE_GRADE_TEACHERS,
  SC_AUDIENCE_SPECIFIC_PARENT,
  SC_AUDIENCE_SPECIFIC_TEACHER,
  SC_AUDIENCE_SUBJECT_TEACHERS,
} from "./school-communication.he.js";

const AUDIENCE_LABEL_BY_TYPE = {
  all_parents: SC_AUDIENCE_ALL_PARENTS,
  all_teachers: SC_AUDIENCE_ALL_TEACHERS,
  grade_parents: SC_AUDIENCE_GRADE_PARENTS,
  class_parents: SC_AUDIENCE_CLASS_PARENTS,
  specific_parent: SC_AUDIENCE_SPECIFIC_PARENT,
  grade_teachers: SC_AUDIENCE_GRADE_TEACHERS,
  subject_teachers: SC_AUDIENCE_SUBJECT_TEACHERS,
  class_teachers: SC_AUDIENCE_CLASS_TEACHERS,
  specific_teacher: SC_AUDIENCE_SPECIFIC_TEACHER,
  homeroom_class_parents: "הורי כיתת המחנך",
  homeroom_student_parent: "הורי ילד/ה (מחנך)",
};

/**
 * @param {{ messageId?: string, id?: string }|null|undefined} message
 * @returns {string|null}
 */
export function getSchoolMessageId(message) {
  const raw = message?.messageId ?? message?.id;
  if (raw == null || raw === "") return null;
  const id = String(raw).trim();
  if (!id || id === "undefined" || id === "null") return null;
  return id;
}

/**
 * @param {string|null|undefined} audienceType
 * @param {Record<string, unknown>|null|undefined} [audienceScope]
 */
export function formatSchoolMessageAudienceLabel(audienceType, audienceScope = {}) {
  const base = AUDIENCE_LABEL_BY_TYPE[String(audienceType || "")] || "נמענים";
  const scope = audienceScope && typeof audienceScope === "object" ? audienceScope : {};
  const parts = [base];
  if (scope.gradeLevel) parts.push(`שכבה ${scope.gradeLevel}`);
  if (scope.physicalClassName) parts.push(`כיתה ${scope.physicalClassName}`);
  if (scope.subjectKey) parts.push(String(scope.subjectKey));
  return parts.length > 1 ? parts.join(" · ") : base;
}

/**
 * @param {{
 *   parentRecipientCount?: number,
 *   teacherRecipientCount?: number,
 *   parentReadCount?: number,
 *   teacherReadCount?: number,
 * }|null|undefined} message
 */
export function schoolMessageHasParentRecipients(message) {
  return (message?.parentRecipientCount ?? 0) > 0;
}

/**
 * @param {{
 *   parentRecipientCount?: number,
 *   teacherRecipientCount?: number,
 * }|null|undefined} message
 */
export function schoolMessageHasTeacherRecipients(message) {
  return (message?.teacherRecipientCount ?? 0) > 0;
}

/**
 * @param {{
 *   parentRecipientCount?: number,
 *   teacherRecipientCount?: number,
 *   parentReadCount?: number,
 *   teacherReadCount?: number,
 * }|null|undefined} message
 */
export function formatSchoolMessageListReadCount(message) {
  const parts = [];
  if (schoolMessageHasParentRecipients(message)) {
    parts.push(`${message?.parentReadCount ?? 0}/${message?.parentRecipientCount ?? 0} הורים`);
  }
  if (schoolMessageHasTeacherRecipients(message)) {
    parts.push(`${message?.teacherReadCount ?? 0}/${message?.teacherRecipientCount ?? 0} מורים`);
  }
  return parts.length ? parts.join(" · ") : "-";
}

/**
 * @param {'parent'|'teacher'} tab
 * @param {{
 *   parentReadCount?: number,
 *   parentRecipientCount?: number,
 *   teacherReadCount?: number,
 *   teacherRecipientCount?: number,
 * }|null|undefined} message
 */
/**
 * @param {{
 *   dateFilter?: '7'|'30'|'custom',
 *   customFrom?: string,
 *   customTo?: string,
 *   recipientType?: string,
 * }} opts
 */
export function buildSchoolMessagesListQuery(opts = {}) {
  const params = new URLSearchParams();
  const recipientType = opts.recipientType;
  if (recipientType && recipientType !== "all") {
    params.set("recipientType", recipientType);
  }

  const dateFilter = opts.dateFilter || "7";
  if (dateFilter === "30") {
    params.set("days", "30");
  } else if (dateFilter === "custom") {
    if (opts.customFrom) {
      const start = new Date(`${opts.customFrom}T00:00:00`);
      if (!Number.isNaN(start.getTime())) params.set("sentAfter", start.toISOString());
    }
    if (opts.customTo) {
      const end = new Date(`${opts.customTo}T23:59:59.999`);
      if (!Number.isNaN(end.getTime())) params.set("sentBefore", end.toISOString());
    }
    if (!opts.customFrom && !opts.customTo) params.set("days", "7");
  } else {
    params.set("days", "7");
  }

  const q = params.toString();
  return q ? `?${q}` : "";
}

export function schoolMessageReadCountForTab(tab, message) {
  if (tab === "parent") {
    return {
      read: message?.parentReadCount ?? 0,
      total: message?.parentRecipientCount ?? 0,
    };
  }
  return {
    read: message?.teacherReadCount ?? 0,
    total: message?.teacherRecipientCount ?? 0,
  };
}
