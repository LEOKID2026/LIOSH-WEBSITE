/**
 * Shared builders for Help Center article modules.
 */

export function screenshotBlock(section, slug, region, alt, caption) {
  const base = `/help-center/screenshots/${section}/${slug}`;
  const cap = caption || alt;
  return {
    kind: "screenshot",
    path: `${base}/desktop/${region}.png`,
    alt,
    caption: cap,
    sources: {
      mobile: `${base}/mobile/${region}.png`,
      tablet: `${base}/tablet/${region}.png`,
    },
  };
}

export function paragraph(text) {
  return { kind: "paragraph", text };
}

export function heading(level, id, text) {
  return { kind: "heading", level, id, text };
}

export function list(items, ordered = false) {
  return { kind: "list", ordered, items };
}

export function callout(tone, text) {
  return { kind: "callout", tone, text };
}

export function relatedLinks(items) {
  return { kind: "relatedLinks", items };
}

export function disclaimerQuoteBlock() {
  return {
    kind: "disclaimerQuote",
    title: "הבהרה חשובה",
    paragraphs: [
      "הדוח, ההמלצות והתובנות במסמך זה נגזרות מתוך נתוני התרגול והשימוש במערכת.",
      "הם נועדו לשמש כלי עזר לימודי להורה ולתלמיד, ואינם מהווים אבחון חינוכי, דידקטי או מקצועי, ואינם מחליפים שיקול דעת של מורה, יועץ, איש חינוך או בעל מקצוע מוסמך.",
      "במקרה של קושי מתמשך, פער לימודי משמעותי או צורך בהכוונה אישית, מומלץ להיוועץ במורה או באיש מקצוע מתאים.",
    ],
  };
}

export function baseArticle({ slug, section, title, summary, keywords, audience, toc, blocks }) {
  return {
    slug,
    section,
    title,
    summary,
    keywords: keywords || [],
    audience: audience || "parent",
    updatedAt: "2026-05-23",
    toc: toc || [],
    blocks,
  };
}
