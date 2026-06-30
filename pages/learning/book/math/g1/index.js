import Layout from "../../../../../components/Layout";
import MathG1BookShell from "../../../../../components/learning-book/MathG1BookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG1TocEntries } from "../../../../../lib/learning-book/load-math-g1-pages";
import { MATH_G1_BOOK_META } from "../../../../../lib/learning-book/math-g1-registry";

export default function MathG1BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG1BookShell batches={batches}>
        <LearningBookIndexContent
          batches={batches}
          routeBase={MATH_G1_BOOK_META.routeBase}
        />
      </MathG1BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG1TocEntries();
  return { props: { batches } };
}
