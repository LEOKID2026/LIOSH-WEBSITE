import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import {
  loadGeometryG1Page,
  loadGeometryG1TocEntries,
  getGeometryG1StaticPaths,
} from "../../../../../lib/learning-book/load-geometry-g1-pages";
import {
  getGeometryG1PageNeighbors,
  isValidGeometryG1PageId,
  GEOMETRY_G1_BOOK_META,
} from "../../../../../lib/learning-book/geometry-g1-registry";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g1";

export default function GeometryG1BookPage({
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
        bookMeta={GEOMETRY_G1_BOOK_META}
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
    paths: getGeometryG1StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidGeometryG1PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadGeometryG1Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadGeometryG1TocEntries();
  const { prev, next } = getGeometryG1PageNeighbors(pageId);

  const prevPage = prev ? loadGeometryG1Page(prev) : null;
  const nextPage = next ? loadGeometryG1Page(next) : null;

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
