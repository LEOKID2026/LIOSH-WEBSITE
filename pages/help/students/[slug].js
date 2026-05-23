import { getArticle, getPathsForSection } from "../../../data/help-center";
import { buildArticlePage } from "../../../components/help/sectionPageBuilders";

const ArticlePage = buildArticlePage("students");

export async function getStaticPaths() {
  return { paths: getPathsForSection("students"), fallback: false };
}

export async function getStaticProps({ params }) {
  const article = getArticle("students", params.slug);
  if (!article) return { notFound: true };
  return { props: { article } };
}

export default ArticlePage;
