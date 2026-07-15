/** Public SEO routes — practice + guides (for footer, QA, sitemap checks). */

export const PRACTICE_PUBLIC_PATHS = [
  "/practice",
  "/practice/math",
  "/practice/hebrew",
  "/practice/reading",
  "/practice/english",
  "/practice/geometry",
  "/practice/science",
  "/practice/moledet",
  "/practice/geography",
  "/practice/history",
  "/practice/games",
  "/practice/no-print",
  "/practice/parent-reports",
  "/practice/worksheets",
];

export const GUIDE_PUBLIC_PATHS = [
  "/guides",
  "/guides/math-practice-at-home",
  "/guides/reading-practice-at-home",
  "/guides/no-print-worksheets",
  "/guides/learning-games-at-home",
  "/guides/parent-progress-tracking",
  "/guides/home-practice-routine",
  "/guides/math-games-for-kids",
  "/guides/reading-comprehension-at-home",
  "/guides/english-vocabulary-practice",
  "/guides/how-to-follow-child-progress",
];

export const SEO_PUBLIC_PATHS = [...PRACTICE_PUBLIC_PATHS, ...GUIDE_PUBLIC_PATHS];

export const FORBIDDEN_SEO_PHRASES = [
  "מותאם לתוכנית הלימודים",
  "משרד החינוך",
  "באישור משרד החינוך",
];
