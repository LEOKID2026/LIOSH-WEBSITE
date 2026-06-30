import Layout from "../../../../../components/Layout";
import MathG4BookShell from "../../../../../components/learning-book/MathG4BookShell";
import LearningBookIndexContent from "../../../../../components/learning-book/LearningBookIndexContent";
import { useIOSViewportFix } from "../../../../../hooks/useIOSViewportFix";
import { loadMathG4TocEntries } from "../../../../../lib/learning-book/load-math-g4-pages";
import { MATH_G4_BOOK_META } from "../../../../../lib/learning-book/math-g4-registry";

export default function MathG4BookIndex({ batches }) {
  useIOSViewportFix();

  return (
    <Layout>
      <MathG4BookShell batches={batches}>
        <LearningBookIndexContent
          batches={batches}
          routeBase={MATH_G4_BOOK_META.routeBase}
        />
      </MathG4BookShell>
    </Layout>
  );
}

export async function getStaticProps() {
  const batches = loadMathG4TocEntries();
  return { props: { batches } };
}
