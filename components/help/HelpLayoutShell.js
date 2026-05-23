import Layout from "../Layout";
import HelpBreadcrumb from "./HelpBreadcrumb";
import Head from "next/head";

export default function HelpLayoutShell({
  title,
  summary,
  breadcrumbs,
  children,
  tocSlot,
  article = false,
}) {
  const pageTitle = title ? `${title} · מרכז עזרה` : "מרכז עזרה";

  return (
    <Layout>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={summary || "מרכז עזרה לליאו — מדריכים להורים, לתלמידים ולדוחות."} />
      </Head>
      <a
        href="#help-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-black focus:rounded-lg focus:font-bold"
      >
        דלג לתוכן
      </a>
      <div dir="rtl" className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <HelpBreadcrumb items={breadcrumbs} />
        <header className="text-center space-y-3 mb-8">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs tracking-wider text-amber-300 font-semibold">
            מרכז עזרה
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent">
            {title}
          </h1>
          {summary ? (
            <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto text-right sm:text-center">
              {summary}
            </p>
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
