import Layout from "../../../../../components/Layout";
import MathG5BookShell from "../../../../../components/learning-book/MathG5BookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG5TocEntries } from "../../../../../lib/learning-book/load-math-g5-pages";
import { MATH_G5_BOOK_META } from "../../../../../lib/learning-book/math-g5-registry";

export default function MathG5BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG5BookShell batches={batches}>
        <LearningBookIndexContent
          batches={batches}
          routeBase={MATH_G5_BOOK_META.routeBase}
        />
      </MathG5BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG5TocEntries();
  return { props: { batches } };
}
