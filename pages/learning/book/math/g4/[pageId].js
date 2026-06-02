import Layout from "../../../../../components/Layout";
import MathG4BookShell from "../../../../../components/learning-book/MathG4BookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import {
  loadMathG4Page,
  loadMathG4TocEntries,
  getMathG4StaticPaths,
} from "../../../../../lib/learning-book/load-math-g4-pages";
import {
  getMathG4PageNeighbors,
  isValidMathG4PageId,
} from "../../../../../lib/learning-book/math-g4-registry";

export default function MathG4BookPage({
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
      <MathG4BookShell
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
          bookGrade="g4"
        />
      </MathG4BookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: getMathG4StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidMathG4PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadMathG4Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadMathG4TocEntries();
  const { prev, next } = getMathG4PageNeighbors(pageId);

  const prevPage = prev ? loadMathG4Page(prev) : null;
  const nextPage = next ? loadMathG4Page(next) : null;

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
