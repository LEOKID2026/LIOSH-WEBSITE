/**
 * Shared builders for Help Center article modules.
 */
import videosManifest from "./videos-manifest.json";

function publicUrl(rel) {
  if (!rel) return null;
  return rel.startsWith("/") ? rel : `/${rel}`;
}

function entryAssetKind(entry) {
  return entry?.assetKind ?? videosManifest.assetKindDefault ?? "placeholder";
}

/** Tutorial video block — only exposes URLs when manifest marks a real capture. */
export function videoBlock(section, slug, id = "main") {
  const entryId = `${section}/${slug}/${id}`;
  const entry = videosManifest.videos.find((v) => v.id === entryId);
  if (!entry || entryAssetKind(entry) !== "captured") {
    return { kind: "video", src: null };
  }
  const mapVp = (vp) => ({
    webm: publicUrl(entry.assets[vp].webm),
    mp4: entry.assets[vp].mp4 ? publicUrl(entry.assets[vp].mp4) : null,
    poster: publicUrl(entry.assets[vp].poster),
    captionsHe: entry.assets[vp].captionsHe
      ? publicUrl(entry.assets[vp].captionsHe)
      : null,
  });
  return {
    kind: "video",
    sourcesByViewport: {
      desktop: mapVp("desktop"),
      mobile: mapVp("mobile"),
    },
    transcriptHe: entry.transcriptHe || null,
    durationSec: entry.durationSecTarget || null,
    audience: entry.audience,
  };
}

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
      "הדוח מבוסס על נתוני התרגול שנאספו באתר Leo Kids.",
      "הדוח נועד לשמש כלי עזר לימודי להורה, ולעזור להבין מה הילד תרגל, איפה נראו חוזקות ואיפה כדאי להמשיך לחזק.",
      "הדוח אינו אבחון רפואי, אינו אבחון פסיכולוגי, אינו אבחון דידקטי ואינו מחליף מורה, יועץ, מאבחן או איש מקצוע. אם עולה חשש לגבי קושי לימודי מתמשך, פער לימודי או צורך בבירור נוסף, מומלץ לפנות למורה או לאיש מקצוע מתאים.",
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
