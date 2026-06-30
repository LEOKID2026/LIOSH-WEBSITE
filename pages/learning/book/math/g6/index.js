import Layout from "../../../../../components/Layout";
import MathG6BookShell from "../../../../../components/learning-book/MathG6BookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG6TocEntries } from "../../../../../lib/learning-book/load-math-g6-pages";
import { MATH_G6_BOOK_META } from "../../../../../lib/learning-book/math-g6-registry";

export default function MathG6BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG6BookShell batches={batches}>
        <LearningBookIndexContent
          batches={batches}
          routeBase={MATH_G6_BOOK_META.routeBase}
        />
      </MathG6BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG6TocEntries();
  return { props: { batches } };
}
