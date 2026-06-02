import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import { GEOMETRY_G6_BOOK_META } from "../../../../../lib/learning-book/geometry-g6-registry";
import { loadGeometryG6TocEntries } from "../../../../../lib/learning-book/load-geometry-g6-pages";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g6";

export default function GeometryG6BookIndex({ batches }) {
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
      >
        <LearningBookIndexContent
          batches={batches}
          routeBase={GEOMETRY_G6_BOOK_META.routeBase}
        />
      </LearningBookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadGeometryG6TocEntries();
  return { props: { batches } };
}
