import Layout from "../../../../../components/Layout";
import MathG2BookShell from "../../../../../components/learning-book/MathG2BookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG2TocEntries } from "../../../../../lib/learning-book/load-math-g2-pages";
import { MATH_G2_BOOK_META } from "../../../../../lib/learning-book/math-g2-registry";

export default function MathG2BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG2BookShell batches={batches}>
        <LearningBookIndexContent
          batches={batches}
          routeBase={MATH_G2_BOOK_META.routeBase}
        />
      </MathG2BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG2TocEntries();
  return { props: { batches } };
}
