import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Layout from "../Layout";
import IosInstallHelpModal from "./IosInstallHelpModal.jsx";
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
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const portalHomeHref =
    portal === "parent"
      ? "/parent/dashboard"
      : portal === "teacher"
        ? "/teacher/dashboard"
        : "/student/home";

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
          <p className={T.body}>לחצו "התקן" למטה כדי להוסיף את האפליקציה למסך הבית.</p>
          <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
            <Launcher isBright={isBright} />
            <button
              type="button"
              className={T.iosHelpTrigger}
              onClick={() => setIosHelpOpen(true)}
              data-testid="ios-install-help-trigger"
            >
              התקנה ב-iPhone או iPad
            </button>
          </div>
          <IosInstallHelpModal
            open={iosHelpOpen}
            onClose={() => setIosHelpOpen(false)}
            isBright={isBright}
            doneBtnClass={T.iosHelpDoneBtn}
          />
          <Link href={portalHomeHref} className={T.backLink}>
            חזרה לעמוד הבית
          </Link>
        </div>
      </Layout>
    </>
  );
}
