import Layout from "../../../../../../components/Layout";
import LearningBookShell from "../../../../../../components/learning-book/LearningBookShell";
import LearningPageBody from "../../../../../../components/learning-book/LearningPageBody";
import { useIOSViewportFix } from "../../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../../lib/learning-book/learning-book-nav";
import { getLearningBookMasterPath } from "../../../../../../lib/learning-book/learning-book-catalog-meta";
import { useMemo } from "react";

export default function StudentBookPage({
  page,
  batches,
  prevPageId,
  nextPageId,
  prevTitle,
  nextTitle,
  subject,
  grade,
  bookMeta,
}) {
  useIOSViewportFix();
  const bookNav = useMemo(
    () => createLearningBookNav(subject, grade, getLearningBookMasterPath(subject, { studentScoped: true })),
    [subject, grade]
  );

  return (
    <Layout>
      <LearningBookShell
        subject={subject}
        grade={grade}
        bookMeta={bookMeta}
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
          bookSubject={subject}
          bookGrade={grade}
        />
      </LearningBookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  const { LEARNING_BOOK_CATALOG_LIST } = await import(
    "../../../../../../lib/learning-book/learning-book-catalog.js"
  );
  const paths = [];
  for (const book of LEARNING_BOOK_CATALOG_LIST.filter((b) => b.status === "authored")) {
    for (const pageId of book.registry.pageOrder) {
      paths.push({ params: { subject: book.subject, grade: book.grade, pageId } });
    }
  }
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const { subject, grade, pageId } = params;
  const { getLearningBookEntry } = await import(
    "../../../../../../lib/learning-book/learning-book-catalog.js"
  );
  const { getLearningBookClientMeta } = await import(
    "../../../../../../lib/learning-book/learning-book-catalog-meta.js"
  );
  const entry = getLearningBookEntry(subject, grade);
  const clientMeta = getLearningBookClientMeta(subject, grade);
  if (!entry || !clientMeta || !entry.registry.isValidPageId(pageId)) return { notFound: true };
  const page = entry.loader.loadPage(pageId);
  if (!page) return { notFound: true };
  const batches = entry.loader.loadTocEntries();
  const { prev, next } = entry.registry.getPageNeighbors(pageId);
  const prevPage = prev ? entry.loader.loadPage(prev) : null;
  const nextPage = next ? entry.loader.loadPage(next) : null;
  return {
    props: {
      page,
      batches,
      prevPageId: prev,
      nextPageId: next,
      prevTitle: prevPage?.displayTitle || null,
      nextTitle: nextPage?.displayTitle || null,
      subject,
      grade,
      bookMeta: clientMeta.meta,
    },
  };
}
