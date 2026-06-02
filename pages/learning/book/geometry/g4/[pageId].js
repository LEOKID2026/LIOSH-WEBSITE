import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import {
  loadGeometryG4Page,
  loadGeometryG4TocEntries,
  getGeometryG4StaticPaths,
} from "../../../../../lib/learning-book/load-geometry-g4-pages";
import {
  getGeometryG4PageNeighbors,
  isValidGeometryG4PageId,
  GEOMETRY_G4_BOOK_META,
} from "../../../../../lib/learning-book/geometry-g4-registry";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g4";

export default function GeometryG4BookPage({
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
        bookMeta={GEOMETRY_G4_BOOK_META}
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
    paths: getGeometryG4StaticPaths(),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const pageId = params.pageId;
  if (!isValidGeometryG4PageId(pageId)) {
    return { notFound: true };
  }

  const page = loadGeometryG4Page(pageId);
  if (!page) {
    return { notFound: true };
  }

  const batches = loadGeometryG4TocEntries();
  const { prev, next } = getGeometryG4PageNeighbors(pageId);

  const prevPage = prev ? loadGeometryG4Page(prev) : null;
  const nextPage = next ? loadGeometryG4Page(next) : null;

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
