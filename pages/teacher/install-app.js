import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import TeacherPwaInstallLauncher from "../../components/teacher/TeacherPwaInstallLauncher";

/** SSR so manifest-teacher is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function TeacherPwaInstallPage() {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-title" content="T LEO K" />
        <link rel="apple-touch-icon" href="/images/teacher-icons/icon-192.png" />
        <title>T LEO K — התקנה</title>
      </Head>
      <Layout>
        <div
          className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center"
          dir="rtl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">T LEO K</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">התקנת אפליקציה למורים</h1>
          <p className="text-sm leading-relaxed text-white/75">
            לחץ על הכפתור למטה כדי לפתוח את חלון ההתקנה של Chrome.
          </p>
          <TeacherPwaInstallLauncher />
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-300/80 underline-offset-2 hover:text-indigo-200 hover:underline"
          >
            חזרה לעמוד הבית
          </Link>
        </div>
      </Layout>
    </>
  );
}
