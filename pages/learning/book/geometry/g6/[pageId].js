import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import {
  loadGeometryG6Page,
  loadGeometryG6TocEntries,
  getGeometryG6StaticPaths,
} from "../../../../../lib/learning-book/load-geometry-g6-pages";
import {
  getGeometryG6PageNeighbors,
  isValidGeometryG6PageId,
  GEOMETRY_G6_BOOK_META,
} from "../../../../../lib/learning-book/geometry-g6-registry";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g6";

export default function GeometryG6BookPage({
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
        bookMeta={GEOMETRY_G6_BOOK_META}
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
    paths: getGeometryG6StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidGeometryG6PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadGeometryG6Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadGeometryG6TocEntries();
  const { prev, next } = getGeometryG6PageNeighbors(pageId);

  const prevPage = prev ? loadGeometryG6Page(prev) : null;
  const nextPage = next ? loadGeometryG6Page(next) : null;

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
