/** @returns {string} */
export function getPublicSiteOriginClient() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://liosh-website.vercel.app";
  return String(raw).replace(/\/$/, "");
}

export const PARENT_PORTAL_PATH = "/parent/login";

/** @returns {string} */
export function getParentPortalUrl() {
  return `${getPublicSiteOriginClient()}${PARENT_PORTAL_PATH}`;
}

/** @returns {string} */
export function buildParentInviteMessageHe() {
  const url = getParentPortalUrl();
  return `היי,
אפשר לפתוח לי חשבון ללמידה ב־LEO KIDS?

נכנסים לעמוד ההורים כאן:
${url}

אחרי פתיחת חשבון הורה אפשר להוסיף אותי ולקבל לי שם משתמש וקוד כניסה.`;
}

/** Parent dashboard — invite other parents to discover LEO K. */
export function buildParentReferralInviteMessageHe() {
  const url = getPublicSiteOriginClient();
  return `היי, רציתי לשתף אותך ב־LEO K — אתר לימודים לילדים עם תרגול, משחקים ודוחות להורים.
אפשר להיכנס מכאן:
${url}`;
}
