import { getArticle, getPathsForSection } from "../../../data/help-center";
import { buildArticlePage } from "../../../components/help/sectionPageBuilders";

const ArticlePage = buildArticlePage("parents");

export async function getStaticPaths() {
  return { paths: getPathsForSection("parents"), fallback: false };
}

export async function getStaticProps({ params }) {
  const article = getArticle("parents", params.slug);
  if (!article) return { notFound: true };
  return { props: { article } };
}

export default ArticlePage;
