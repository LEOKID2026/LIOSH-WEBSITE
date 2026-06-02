import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import {
  loadGeometryG5Page,
  loadGeometryG5TocEntries,
  getGeometryG5StaticPaths,
} from "../../../../../lib/learning-book/load-geometry-g5-pages";
import {
  getGeometryG5PageNeighbors,
  isValidGeometryG5PageId,
  GEOMETRY_G5_BOOK_META,
} from "../../../../../lib/learning-book/geometry-g5-registry";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g5";

export default function GeometryG5BookPage({
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
        bookMeta={GEOMETRY_G5_BOOK_META}
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
    paths: getGeometryG5StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidGeometryG5PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadGeometryG5Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadGeometryG5TocEntries();
  const { prev, next } = getGeometryG5PageNeighbors(pageId);

  const prevPage = prev ? loadGeometryG5Page(prev) : null;
  const nextPage = next ? loadGeometryG5Page(next) : null;

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
