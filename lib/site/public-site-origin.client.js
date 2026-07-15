import { CANONICAL_PUBLIC_SITE_ORIGIN } from "./canonical-public-site-origin.js";

/** @returns {string} */
export function getPublicSiteOriginClient() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    CANONICAL_PUBLIC_SITE_ORIGIN;
  return String(raw).replace(/\/$/, "");
}

export const PARENT_PORTAL_PATH = "/parent/login";
export const TEACHER_PORTAL_PATH = "/teacher/login";

/** @returns {string} */
export function getTeacherPortalUrl() {
  return `${getPublicSiteOriginClient()}${TEACHER_PORTAL_PATH}`;
}

/** @returns {string} */
export function getParentPortalUrl() {
  return `${getPublicSiteOriginClient()}${PARENT_PORTAL_PATH}`;
}

/** @returns {string} */
export function buildParentInviteMessageHe() {
  const url = getParentPortalUrl();
  return `היי,
אפשר לפתוח לי חשבון ללמידה ב-LEO KIDS?

נכנסים לעמוד ההורים כאן:
${url}

אחרי פתיחת חשבון הורה אפשר להוסיף אותי ולקבל לי שם משתמש וקוד כניסה.`;
}

/** Parent dashboard — invite other parents to discover LEO K. */
export function buildParentReferralInviteMessageHe() {
  const url = getPublicSiteOriginClient();
  return `היי, רציתי לשתף אותך ב-LEO K - אתר לימודים לילדים עם תרגול, משחקים ודוחות להורים.
אפשר להיכנס מכאן:
${url}`;
}

/** Teacher dashboard — invite other parents and teachers to discover LEO K. */
export function buildTeacherReferralInviteMessageHe() {
  const siteUrl = getPublicSiteOriginClient();
  const parentUrl = getParentPortalUrl();
  const teacherUrl = getTeacherPortalUrl();
  return `היי, רציתי לשתף אותך ב-LEO K - אתר לימודים לילדים עם תרגול, משחקים, דוחות להורים וכלים למורים.

אפשר להיכנס לאתר:
${siteUrl}

הורים - פורטל ההורים:
${parentUrl}

מורים - פורטל המורים:
${teacherUrl}`;
}

/** Student home — share site with friends (peer invite). */
export function buildStudentShareFriendsMessageHe() {
  const siteUrl = getPublicSiteOriginClient();
  const parentUrl = getParentPortalUrl();
  return `היי!
רציתי לשתף איתך את LEO K - אתר למידה עם תרגול, משחקים ודוחות להורים.

אפשר להיכנס מכאן:
${siteUrl}

רוצים גם חשבון משלכם? בקשו מההורים שלכם לפתוח לכם - ההורים נכנסים לפורטל ההורים כאן:
${parentUrl}`;
}
