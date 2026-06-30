import Layout from "../../../../../components/Layout";
import MathG3BookShell from "../../../../../components/learning-book/MathG3BookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG3TocEntries } from "../../../../../lib/learning-book/load-math-g3-pages";
import { MATH_G3_BOOK_META } from "../../../../../lib/learning-book/math-g3-registry";

export default function MathG3BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG3BookShell batches={batches}>
        <LearningBookIndexContent
          batches={batches}
          routeBase={MATH_G3_BOOK_META.routeBase}
        />
      </MathG3BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG3TocEntries();
  return { props: { batches } };
}
