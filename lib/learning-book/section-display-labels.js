/**
 * Child-facing section titles for the Grade 1 book reader (UI only).
 * Source markdown titles are unchanged.
 */

/** @type {Record<string, string>} */
const SECTION_TITLE_MAP = {
  "מה אנחנו לומדים?": "מה לומדים?",
  "הסבר פשוט": "הסבר",
  "דוגמה ויזואלית / קונקרטית": "דוגמה",
  "בואו נפתור יחד": "בואו נפתור",
  "נסו בעצמכם": "נסו בעצמכם",
  "טעות נפוצה - שימו לב!": "שימו לב!",
  "בואו נתרגל!": "בואו נתרגל",
};

/**
 * @param {string} rawTitle
 * @returns {string}
 */
export function getSectionDisplayTitle(rawTitle) {
  const title = String(rawTitle || "").trim();
  if (SECTION_TITLE_MAP[title]) return SECTION_TITLE_MAP[title];
  if (/ויזואלית/i.test(title)) return "דוגמה";
  if (title.includes("שימו לב")) return "שימו לב!";
  return title;
}
