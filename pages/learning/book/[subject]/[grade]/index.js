import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import { getLearningBookMasterPath } from "../../../../../lib/learning-book/learning-book-catalog-meta";
import { useMemo } from "react";

export default function DynamicLearningBookIndex({
  batches,
  subject,
  grade,
  bookMeta,
}) {
  useIOSViewportFix();
  const bookNav = useMemo(
    () =>
      createLearningBookNav(
        subject,
        grade,
        getLearningBookMasterPath(subject)
      ),
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
      >
        <LearningBookIndexContent
          batches={batches}
          routeBase={bookMeta.routeBase}
        />
      </LearningBookShell>
    </Layout>
  );
}

export async function getStaticPaths() {
  const { getDynamicRouteBooks } = await import(
    "../../../../../lib/learning-book/learning-book-catalog.js"
  );
  const paths = getDynamicRouteBooks().map((book) => ({
    params: { subject: book.subject, grade: book.grade },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const subject = params.subject;
  const grade = params.grade;
  const { getLearningBookEntry } = await import(
    "../../../../../lib/learning-book/learning-book-catalog.js"
  );
  const { getLearningBookClientMeta } = await import(
    "../../../../../lib/learning-book/learning-book-catalog-meta.js"
  );
  const entry = getLearningBookEntry(subject, grade);
  const clientMeta = getLearningBookClientMeta(subject, grade);
  if (!entry || !clientMeta) {
    return { notFound: true };
  }
  const batches = entry.loader.loadTocEntries();
  return {
    props: {
      batches,
      subject,
      grade,
      bookMeta: clientMeta.meta,
    },
  };
}
