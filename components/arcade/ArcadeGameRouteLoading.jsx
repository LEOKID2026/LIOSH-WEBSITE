import Head from "next/head";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";

/**
 * Full-page loading shell for arcade game routes (router.isReady gate).
 * @param {{ title?: string, message?: string }} props
 */
export default function ArcadeGameRouteLoading({ title = "ארקייד", message = "טוען…" }) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <StudentLoadingPanel message={message} fullPage />
    </>
  );
}
