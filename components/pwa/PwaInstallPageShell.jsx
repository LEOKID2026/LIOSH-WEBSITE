import Head from "next/head";
import Link from "next/link";
import Layout from "../Layout";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { getPwaInstallPageTheme } from "../../lib/pwa/pwa-install-page-theme.client.js";

/**
 * Shared install-page shell — bright/classic via site theme picker.
 * @param {{
 *   portal: 'student' | 'parent' | 'teacher',
 *   badge: string,
 *   title: string,
 *   pageTitle: string,
 *   appleTitle?: string,
 *   appleTouchIcon?: string,
 *   launcher: import('react').ComponentType<{ isBright?: boolean }>,
 * }} props
 */
export default function PwaInstallPageShell({
  portal,
  badge,
  title,
  pageTitle,
  appleTitle,
  appleTouchIcon,
  launcher: Launcher,
}) {
  const { theme, isBright } = useStudentTheme();
  const T = getPwaInstallPageTheme(portal, isBright);

  return (
    <>
      <Head>
        {appleTitle ? <meta name="apple-mobile-web-app-title" content={appleTitle} /> : null}
        {appleTouchIcon ? <link rel="apple-touch-icon" href={appleTouchIcon} /> : null}
        <title>{pageTitle}</title>
      </Head>
      <Layout studentTheme={theme} studentShell="home">
        <div className={T.pageWrap} dir="rtl" lang="he">
          <p className={T.badge}>{badge}</p>
          <h1 className={T.heading}>{title}</h1>
          <p className={T.body}>לחץ על הכפתור למטה כדי לפתוח את חלון ההתקנה של Chrome.</p>
          <Launcher isBright={isBright} />
          <Link href="/" className={T.backLink}>
            חזרה לעמוד הבית
          </Link>
        </div>
      </Layout>
    </>
  );
}
