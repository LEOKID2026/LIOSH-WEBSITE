import { PARENT_ARTICLES } from "./content/parents";
import { STUDENT_ARTICLES } from "./content/students";
import { PARENT_REPORT_ARTICLES } from "./content/parent-report";
import { SUBJECT_ARTICLES } from "./content/subjects";

export const SECTIONS = {
  parents: {
    key: "parents",
    title: "מדריך להורים",
    description: "הרשמה, ניהול ילדים, דוחות וכלים להורים.",
    href: "/help/parents",
    emoji: "👨‍👩‍👧",
    hubGradientKey: "parents",
  },
  students: {
    key: "students",
    title: "מדריך לילדים",
    description: "כניסה, תרגול, משימות ומשחקים - בשפה פשוטה.",
    href: "/help/students",
    emoji: "🎒",
    hubGradientKey: "students",
  },
  "parent-report": {
    key: "parent-report",
    title: "הסבר דוח הורים",
    description: "איך לקרוא כל חלק בדוח - מילה במילה.",
    href: "/help/parent-report",
    emoji: "📊",
    hubGradientKey: "parent-report",
  },
  subjects: {
    key: "subjects",
    title: "מדריכי מקצועות",
    description: "מה מתרגלים בכל מקצוע ואיך.",
    href: "/help/subjects",
    emoji: "📚",
    hubGradientKey: "subjects",
  },
};

const BY_SECTION = {
  parents: PARENT_ARTICLES,
  students: STUDENT_ARTICLES,
  "parent-report": PARENT_REPORT_ARTICLES,
  subjects: SUBJECT_ARTICLES,
};

export const ALL_ARTICLES = [
  ...PARENT_ARTICLES,
  ...STUDENT_ARTICLES,
  ...PARENT_REPORT_ARTICLES,
  ...SUBJECT_ARTICLES,
];

export function listArticles(section) {
  return BY_SECTION[section] || [];
}

export function getArticle(section, slug) {
  const articles = listArticles(section);
  return articles.find((a) => a.slug === slug) || null;
}

export function getPathsForSection(section) {
  return listArticles(section).map((a) => ({
    params: { slug: a.slug },
  }));
}

export function validateArticle(article) {
  const errors = [];
  if (!article?.slug) errors.push("missing slug");
  if (!article?.title) errors.push("missing title");
  if (!article?.summary) errors.push("missing summary");
  if (!article?.section) errors.push("missing section");

  for (const block of article?.blocks || []) {
    if (block.kind === "screenshot") {
      if (!block.alt?.trim()) errors.push(`screenshot missing alt in ${article.slug}`);
      if (!block.path?.trim()) errors.push(`screenshot missing path in ${article.slug}`);
    }
  }
  return errors;
}

export function collectScreenshotPathsFromArticles(articles = ALL_ARTICLES) {
  const paths = new Set();
  for (const article of articles) {
    for (const block of article.blocks || []) {
      if (block.kind !== "screenshot") continue;
      paths.add(block.path);
      if (block.sources?.mobile) paths.add(block.sources.mobile);
      if (block.sources?.tablet) paths.add(block.sources.tablet);
    }
  }
  return [...paths].sort();
}

/** Build-time validation for articles */
export function assertAllArticlesValid() {
  const allErrors = [];
  for (const article of ALL_ARTICLES) {
    const errs = validateArticle(article);
    if (errs.length) allErrors.push({ slug: article.slug, section: article.section, errs });
  }
  if (allErrors.length) {
    throw new Error(
      `Help Center article validation failed: ${JSON.stringify(allErrors, null, 2)}`
    );
  }
}

assertAllArticlesValid();
