import Layout from "../../../../../components/Layout";
import MathG2BookShell from "../../../../../components/learning-book/MathG2BookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import {
  loadMathG2Page,
  loadMathG2TocEntries,
  getMathG2StaticPaths,
} from "../../../../../lib/learning-book/load-math-g2-pages";
import {
  getMathG2PageNeighbors,
  isValidMathG2PageId,
} from "../../../../../lib/learning-book/math-g2-registry";

export default function MathG2BookPage({
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
      <MathG2BookShell
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
          bookGrade="g2"
        />
      </MathG2BookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: getMathG2StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidMathG2PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadMathG2Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadMathG2TocEntries();
  const { prev, next } = getMathG2PageNeighbors(pageId);

  const prevPage = prev ? loadMathG2Page(prev) : null;
  const nextPage = next ? loadMathG2Page(next) : null;

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
