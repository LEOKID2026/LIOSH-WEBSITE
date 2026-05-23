import { getArticle, getPathsForSection } from "../../../data/help-center";
import { buildArticlePage } from "../../../components/help/sectionPageBuilders";

const ArticlePage = buildArticlePage("parent-report");

export async function getStaticPaths() {
  return { paths: getPathsForSection("parent-report"), fallback: false };
}

export async function getStaticProps({ params }) {
  const article = getArticle("parent-report", params.slug);
  if (!article) return { notFound: true };
  return { props: { article } };
}

export default ArticlePage;
