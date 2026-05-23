import { getArticle, getPathsForSection } from "../../../data/help-center";
import { buildArticlePage } from "../../../components/help/sectionPageBuilders";

const ArticlePage = buildArticlePage("subjects");

export async function getStaticPaths() {
  return { paths: getPathsForSection("subjects"), fallback: false };
}

export async function getStaticProps({ params }) {
  const article = getArticle("subjects", params.slug);
  if (!article) return { notFound: true };
  return { props: { article } };
}

export default ArticlePage;
