/**
 * Lightweight learning hub metadata - no master game engines.
 */

/** @typedef {{ slug: string, permissionKey: string, title: string, emoji: string, blurb: string, href: string }} LearningHubSubjectMeta */

/** @type {LearningHubSubjectMeta[]} */
export const LEARNING_HUB_SUBJECTS = [
  {
    slug: "math-master",
    permissionKey: "math",
    title: "מתמטיקה",
    emoji: "🧮",
    blurb: "תרגול חיבור, חיסור, כפל, חילוק ועוד.",
    href: "/student/learning/math-master",
  },
  {
    slug: "geometry-master",
    permissionKey: "geometry",
    title: "גאומטריה",
    emoji: "📐",
    blurb: "שטחים, היקפים, נפח, זוויות, פיתגורס וצורות ועוד.",
    href: "/student/learning/geometry-master",
  },
  {
    slug: "english-master",
    permissionKey: "english",
    title: "אנגלית",
    emoji: "🇬🇧",
    blurb: "אוצר מילים, דקדוק, תרגום ובניית משפטים ועוד.",
    href: "/student/learning/english-master",
  },
  {
    slug: "science-master",
    permissionKey: "science",
    title: "מדעים",
    emoji: "🔬",
    blurb: "גוף, בעלי חיים, צמחים, חלל, חומר, מזג אוויר, כוחות ועוד.",
    href: "/student/learning/science-master",
  },
  {
    slug: "hebrew-master",
    permissionKey: "hebrew",
    title: "עברית",
    emoji: "📚",
    blurb: "תרגול שפה, אוצר מילים, דקדוק, הבנת הנקרא ועוד.",
    href: "/student/learning/hebrew-master",
  },
  {
    slug: "moledet-master",
    permissionKey: "moledet",
    title: "מולדת",
    emoji: "🏠",
    blurb: "מולדת, חברה, אזרחות וערכים.",
    href: "/student/learning/moledet-master",
  },
  {
    slug: "geography-master",
    permissionKey: "geography",
    title: "גאוגרפיה",
    emoji: "🗺️",
    blurb: "גאוגרפיה, מפות, נוף ויישובים.",
    href: "/student/learning/geography-master",
  },
  {
    slug: "history-master",
    permissionKey: "history",
    title: "היסטוריה",
    emoji: "📜",
    blurb: "יוון, הלניזם, החשמונאים, רומא והיהודים.",
    href: "/student/learning/history-master",
  },
];

/** @param {string} slug */
export function loadLearningMasterPage(slug) {
  const key = String(slug || "").trim().toLowerCase();
  switch (key) {
    case "math-master":
      return import("../../pages/learning/math-master.js");
    case "geometry-master":
      return import("../../pages/learning/geometry-master.js");
    case "english-master":
      return import("../../pages/learning/english-master.js");
    case "science-master":
      return import("../../pages/learning/science-master.js");
    case "hebrew-master":
      return import("../../pages/learning/hebrew-master.js");
    case "moledet-master":
      return import("../../pages/learning/moledet-master.js");
    case "geography-master":
      return import("../../pages/learning/geography-master.js");
    case "history-master":
      return import("../../pages/learning/history-master.js");
    default:
      return Promise.reject(new Error(`unknown_learning_master:${key}`));
  }
}
