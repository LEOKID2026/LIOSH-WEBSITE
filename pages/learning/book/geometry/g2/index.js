import Layout from "../../../../../components/Layout";
import LearningBookShell from "../../../../../components/learning-book/LearningBookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { createLearningBookNav } from "../../../../../lib/learning-book/learning-book-nav";
import { GEOMETRY_G2_BOOK_META } from "../../../../../lib/learning-book/geometry-g2-registry";
import { loadGeometryG2TocEntries } from "../../../../../lib/learning-book/load-geometry-g2-pages";
import { useMemo } from "react";

const SUBJECT = "geometry";
const GRADE = "g2";

export default function GeometryG2BookIndex({ batches }) {
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
      >
        <LearningBookIndexContent
          batches={batches}
          routeBase={GEOMETRY_G2_BOOK_META.routeBase}
        />
      </LearningBookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadGeometryG2TocEntries();
  return { props: { batches } };
}
