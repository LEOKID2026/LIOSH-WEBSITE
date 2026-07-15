import Layout from "../Layout";
import HelpBreadcrumb from "./HelpBreadcrumb";
import Head from "next/head";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";

export default function HelpLayoutShell({
  title,
  summary,
  breadcrumbs,
  children,
  tocSlot,
  article = false,
}) {
  const pageTitle = title ? `${title} · מרכז עזרה` : "מרכז עזרה";
  const { theme } = useStudentTheme();
  const { SP } = useSharedShellUi();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={summary || "מרכז עזרה לליאו - מדריכים להורים, לילדים ולדוחות."} />
      </Head>
      <a
        href="#help-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-black focus:rounded-lg focus:font-bold"
      >
        דלג לתוכן
      </a>
      <div dir="rtl" className={SP.helpLayoutWrap}>
        <HelpBreadcrumb items={breadcrumbs} />
        <header className="text-center space-y-3 mb-8">
          <p className={SP.badge}>מרכז עזרה</p>
          <h1 className={SP.helpArticleH1}>{title}</h1>
          {summary ? (
            <p className={`${SP.helpSubtitle} text-right sm:text-center`}>{summary}</p>
          ) : null}
        </header>
        {article && tocSlot ? (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
            {tocSlot}
            <main id="help-main" tabIndex={-1} lang="he" className="min-w-0 outline-none">
              {children}
            </main>
          </div>
        ) : (
          <main id="help-main" tabIndex={-1} lang="he" className="outline-none">
            {children}
          </main>
        )}
      </div>
    </Layout>
  );
}
