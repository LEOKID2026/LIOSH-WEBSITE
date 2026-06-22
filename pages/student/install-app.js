import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import StudentPwaInstallLauncher from "../../components/student/StudentPwaInstallLauncher";

/** SSR so manifest.json is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function StudentPwaInstallPage() {
  return (
    <>
      <Head>
        <title>LEO K — התקנה</title>
      </Head>
      <Layout>
        <div
          className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center"
          dir="rtl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">LEO K</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">התקנת אפליקציה לילדים</h1>
          <p className="text-sm leading-relaxed text-white/75">
            לחץ על הכפתור למטה כדי לפתוח את חלון ההתקנה של Chrome.
          </p>
          <StudentPwaInstallLauncher />
          <Link
            href="/"
            className="text-sm font-semibold text-amber-300/80 underline-offset-2 hover:text-amber-200 hover:underline"
          >
            חזרה לעמוד הבית
          </Link>
        </div>
      </Layout>
    </>
  );
}
