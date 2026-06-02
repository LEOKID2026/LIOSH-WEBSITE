import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import {
  loadGeometryG2Page,
  loadGeometryG2TocEntries,
  getGeometryG2StaticPaths,
} from "../../../../../lib/learning-book/load-geometry-g2-pages";
import {
  getGeometryG2PageNeighbors,
  isValidGeometryG2PageId,
  GEOMETRY_G2_BOOK_META,
} from "../../../../../lib/learning-book/geometry-g2-registry";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g2";

export default function GeometryG2BookPage({
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
        bookMeta={GEOMETRY_G2_BOOK_META}
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
    paths: getGeometryG2StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidGeometryG2PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadGeometryG2Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadGeometryG2TocEntries();
  const { prev, next } = getGeometryG2PageNeighbors(pageId);

  const prevPage = prev ? loadGeometryG2Page(prev) : null;
  const nextPage = next ? loadGeometryG2Page(next) : null;

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
