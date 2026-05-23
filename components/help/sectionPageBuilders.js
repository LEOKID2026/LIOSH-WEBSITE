import HelpLayoutShell from "./HelpLayoutShell";
import HelpTOC from "./HelpTOC";
import HelpArticleBody from "./HelpArticleBody";
import HelpSearchClient from "./HelpSearchClient";
import { listArticles, SECTIONS } from "../../data/help-center";

export function buildSectionHubPage(sectionKey) {
  const section = SECTIONS[sectionKey];
  const articles = listArticles(sectionKey);

  return function SectionHubPage() {
    return (
      <HelpLayoutShell
        title={section.title}
        summary={section.description}
        breadcrumbs={[
          { href: "/help", label: "מרכז עזרה" },
          { label: section.title },
        ]}
      >
        <HelpSearchClient articles={articles} sectionBase={section.href} />
      </HelpLayoutShell>
    );
  };
}

export function buildArticlePage(sectionKey) {
  const section = SECTIONS[sectionKey];

  return function HelpArticlePage({ article }) {
    return (
      <HelpLayoutShell
        title={article.title}
        summary={article.summary}
        article
        breadcrumbs={[
          { href: "/help", label: "מרכז עזרה" },
          { href: section.href, label: section.title },
          { label: article.title },
        ]}
        tocSlot={<HelpTOC toc={article.toc} />}
      >
        <article lang="he" dir="rtl">
          <HelpArticleBody blocks={article.blocks} audience={article.audience} />
          <p className="mt-8 text-xs text-white/40 text-right">
            עודכן: {article.updatedAt}
          </p>
        </article>
      </HelpLayoutShell>
    );
  };
}
