/**
 * כתובת נגינה אל MP3 שנוצר בשרת — בלי קבצים סטטיים ב public בפרודקשן (Vercel וכו׳).
 * @param {string} hash16
 */
export function hebrewGenStreamUrl(hash16) {
  const h = String(hash16 || "").trim().toLowerCase();
  return `/api/hebrew-audio-stream?h=${encodeURIComponent(h)}`;
}
