import Layout from "../../../../../components/Layout";
import MathG3BookShell from "../../../../../components/learning-book/MathG3BookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import {
  loadMathG3Page,
  loadMathG3TocEntries,
  getMathG3StaticPaths,
} from "../../../../../lib/learning-book/load-math-g3-pages";
import {
  getMathG3PageNeighbors,
  isValidMathG3PageId,
} from "../../../../../lib/learning-book/math-g3-registry";

export default function MathG3BookPage({
  page,
  batches,
  prevPageId,
  nextPageId,
  prevTitle,
  nextTitle,
}) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG3BookShell
        batches={batches}
        activePageId={page.pageId}
        pageMeta={page}
      >
        <LearningPageBody
          page={page}
          prevPageId={prevPageId}
          nextPageId={nextPageId}
          prevTitle={prevTitle}
          nextTitle={nextTitle}
          bookGrade="g3"
        />
      </MathG3BookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: getMathG3StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidMathG3PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadMathG3Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadMathG3TocEntries();
  const { prev, next } = getMathG3PageNeighbors(pageId);

  const prevPage = prev ? loadMathG3Page(prev) : null;
  const nextPage = next ? loadMathG3Page(next) : null;

  return {
    props: {
      page,
      batches,
      prevPageId: prev,
      nextPageId: next,
      prevTitle: prevPage?.displayTitle || null,
      nextTitle: nextPage?.displayTitle || null,
    },
  };
}
