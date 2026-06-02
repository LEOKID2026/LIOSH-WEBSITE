import Layout from "../../../../../components/Layout";
import MathG6BookShell from "../../../../../components/learning-book/MathG6BookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import {
  loadMathG6Page,
  loadMathG6TocEntries,
  getMathG6StaticPaths,
} from "../../../../../lib/learning-book/load-math-g6-pages";
import {
  getMathG6PageNeighbors,
  isValidMathG6PageId,
} from "../../../../../lib/learning-book/math-g6-registry";

export default function MathG6BookPage({
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
      <MathG6BookShell
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
          bookGrade="g6"
        />
      </MathG6BookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: getMathG6StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidMathG6PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadMathG6Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadMathG6TocEntries();
  const { prev, next } = getMathG6PageNeighbors(pageId);

  const prevPage = prev ? loadMathG6Page(prev) : null;
  const nextPage = next ? loadMathG6Page(next) : null;

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
