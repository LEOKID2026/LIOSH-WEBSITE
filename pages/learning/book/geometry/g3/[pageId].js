import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import {
  loadGeometryG3Page,
  loadGeometryG3TocEntries,
  getGeometryG3StaticPaths,
} from "../../../../../lib/learning-book/load-geometry-g3-pages";
import {
  getGeometryG3PageNeighbors,
  isValidGeometryG3PageId,
  GEOMETRY_G3_BOOK_META,
} from "../../../../../lib/learning-book/geometry-g3-registry";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g3";

export default function GeometryG3BookPage({
  page,
  batches,
  prevPageId,
  nextPageId,
  prevTitle,
  nextTitle,
}) {
  useIOSViewportFix();
  const bookNav = useMemo(
    () => createLearningBookNav(SUBJECT, GRADE, "/learning/geometry-master"),
    []
  );

  return (
    <Layout>
      <LearningBookShell
        subject={SUBJECT}
        grade={GRADE}
        bookMeta={GEOMETRY_G3_BOOK_META}
        nav={bookNav}
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
          bookSubject={SUBJECT}
          bookGrade={GRADE}
        />
      </LearningBookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: getGeometryG3StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidGeometryG3PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadGeometryG3Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadGeometryG3TocEntries();
  const { prev, next } = getGeometryG3PageNeighbors(pageId);

  const prevPage = prev ? loadGeometryG3Page(prev) : null;
  const nextPage = next ? loadGeometryG3Page(next) : null;

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
