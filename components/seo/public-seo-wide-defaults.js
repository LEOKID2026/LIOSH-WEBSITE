/** @typedef {{ title: string, body: string, primary: { href: string, label: string }, secondary?: { href: string, label: string } }} PublicSeoFooterCta */

/** @type {PublicSeoFooterCta} */
export const DEFAULT_PUBLIC_SEO_FOOTER_CTA = {
  title: "מוכנים להתחיל?",
  body: "פתחו חשבון הורה, הוסיפו את הילד, ותנו לו להתרגל בקצב שנוח לכם.",
  primary: { href: "/parent/login", label: "כניסה / הרשמה להורים" },
  secondary: { href: "/parents", label: "להכיר את פורטל ההורים" },
};

/** @type {PublicSeoFooterCta} */
export const WORKSHEETS_PUBLIC_SEO_FOOTER_CTA = {
  title: "רוצים ליצור עוד דפים ולפתוח את כל הנושאים?",
  body: "במערכת המלאה להורים אפשר ליצור דפי עבודה ללא הגבלה, לבחור נושאים נוספים ולשלב את הדפים עם התרגול הדיגיטלי ועם המידע על התקדמות הילד.",
  primary: { href: "/parents", label: "למערכת המלאה להורים" },
  secondary: { href: "/practice", label: "לתחומי התרגול" },
};
