import {
  baseArticle,
  paragraph,
  heading,
  list,
  callout,
  screenshotBlock,
  videoBlock,
  relatedLinks,
} from "../articleHelpers";

const S = "subjects";

function subjectArticle(slug, title, emoji, topics, masterPath) {
  return baseArticle({
    slug,
    section: S,
    title: `מדריך ${title}`,
    summary: `תרגול ב${title} לכיתות א׳–ו׳ - מה לומדים ואיך מתרגלים.`,
    keywords: [title, "מקצוע", "תרגול"],
    toc: [
      { id: "who", title: "למי מתאים?" },
      { id: "topics", title: "מה מתרגלים?" },
      { id: "practice", title: "איך נראה תרגול?" },
      { id: "tips", title: "טיפים" },
    ],
    blocks: [
      heading(2, "who", "למי מתאים?"),
      paragraph("התרגול מיועד לילד/הי כיתות א׳ עד ו׳, עם התאמה לרמת הכיתה."),
      heading(2, "topics", "מה מתרגלים?"),
      list(topics),
      heading(2, "practice", "איך נראה תרגול?"),
      paragraph("בוחרים כיתה ורמה, עונים על שאלות ומקבלים הסבר אחרי כל תשובה."),
      videoBlock(S, slug),
      screenshotBlock(S, slug, "question", `מסך תרגול ב${title}`),
      screenshotBlock(S, slug, "explanation", `הסבר לשאלה ב${title}`),
      heading(2, "tips", "טיפים"),
      callout("tip", "תרגלו בקצב קבוע - קצת כל יום עדיף על הרבה ביום אחד."),
      relatedLinks([
        { href: masterPath, label: `מעבר לתרגול ${title}` },
        { href: "/learning", label: "אזור לימודים" },
      ]),
    ],
  });
}

export const math = subjectArticle(
  "math",
  "מתמטיקה",
  "🧮",
  ["חיבור, חיסור, כפל וחילוק", "שברים ועשרוניים (בכיתות הבכירות)", "בעיות מילוליות"],
  "/learning/math-master"
);

export const geometry = subjectArticle(
  "geometry",
  "גאומטריה",
  "📐",
  ["שטחים והיקפים", "זוויות וצורות", "פיתגורס (בכיתות מתקדמות)"],
  "/learning/geometry-master"
);

export const english = subjectArticle(
  "english",
  "אנגלית",
  "🇬🇧",
  ["אוצר מילים", "דקדוק ותרגום", "בניית משפטים"],
  "/learning/english-master"
);

export const science = subjectArticle(
  "science",
  "מדעים",
  "🔬",
  ["גוף האדם ובעלי חיים", "צמחים וחומר", "מזג אוויר וכוח"],
  "/learning/science-master"
);

export const hebrew = subjectArticle(
  "hebrew",
  "עברית",
  "📚",
  ["אוצר מילים ודקדוק", "הבנת הנקרא", "כתיב והיגוי"],
  "/learning/hebrew-master"
);

export const moledetGeography = subjectArticle(
  "moledet-geography",
  "מולדת וגאוגרפיה",
  "🗺️",
  ["מולדת ואזרחות", "גאוגרפיה של ישראל והעולם", "חברה וסביבה"],
  "/learning/moledet-geography-master"
);

export const SUBJECT_ARTICLES = [math, geometry, english, science, hebrew, moledetGeography];
