/**
 * Placeholder learning-book page markdown (7 sections, Hebrew-only).
 */

export const PLACEHOLDER_PAGE_ID = "book_placeholder";

/**
 * @param {{ subject: string, grade: string, subjectTitleHe?: string }} opts
 * @returns {string}
 */
export function buildPlaceholderPageMarkdown({ subject, grade, subjectTitleHe }) {
  const subjectHe =
    subjectTitleHe || (subject === "geometry" ? "גאומטריה" : "חשבון");
  const learningPageId = `${subject}:${grade}:${PLACEHOLDER_PAGE_ID}`;
  const skillId = `${subject}:kind:${PLACEHOLDER_PAGE_ID}`;

  return `# ספר בהכנה

## Metadata

| Field | Value |
|-------|-------|
| **learning_page_id** | \`${learningPageId}\` |
| **skill_id** | \`${skillId}\` |
| **subject** | ${subject} |
| **grade** | ${grade} |
| **page_type** | placeholder |
| **approval_status** | draft |
| **title_hebrew** | ספר בהכנה |

---

## 1. מה אנחנו לומדים?

תוכן יתווסף בהמשך.

## 2. הסבר פשוט

הדף הזה מוכן לתוכן הלימודי של **${subjectHe}**.

## 3. דוגמה ויזואלית / קונקרטית

בקרוב נוסיף הסבר, דוגמה ותרגול לנושא הזה.

## 4. בואו נפתור יחד

תוכן יתווסף בהמשך.

## 5. נסו בעצמכם

הדף הזה מוכן לתוכן הלימודי.

## 6. טעות נפוצה - שימו לב!

בקרוב נוסיף הסבר, דוגמה ותרגול לנושא הזה.

## 7. בואו נתרגל!

תוכן יתווסף בהמשך.
`;
}
