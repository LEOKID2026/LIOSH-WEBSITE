import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import ParentInstallAppButton from "../../components/InstallParentAppButton";
import { isParentPwaInstalledStandalone } from "../../lib/pwa/pwa-parent-install-prompt";
import { isCapacitorNative, isPwaInstalledStandalone } from "../../lib/pwa/pwa-install-prompt";

export default function ParentPwaInstallPage() {
  const [installed, setInstalled] = useState(false);
  const [kidsInstalled, setKidsInstalled] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isCapacitorNative());
    setInstalled(isParentPwaInstalledStandalone());
    setKidsInstalled(isPwaInstalledStandalone() && !isParentPwaInstalledStandalone());
  }, []);

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest-parent.webmanifest" />
        <meta name="apple-mobile-web-app-title" content="P-LEO K" />
        <link rel="apple-touch-icon" href="/images/parent-icons/icon-192.png" />
        <title>P-LEO K — התקנת אפליקציה להורים</title>
      </Head>
      <Layout>
        <div
          className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-10 text-center"
          dir="rtl"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-300">P-LEO K</p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">התקנת אפליקציה להורים</h1>
            <p className="text-sm leading-relaxed text-white/75">
              התקנה נפרדת מעולם הילדים — אייקון משלו, שם P-LEO K, ופתיחה ישירה לפורטל ההורים.
            </p>
          </div>

          {isNative ? (
            <p className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
              התקנת PWA זמינה בדפדפן, לא באפליקציה המותקנת.
            </p>
          ) : installed ? (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
              P-LEO K כבר מותקן במכשיר.
            </p>
          ) : (
            <ParentInstallAppButton />
          )}

          <Link
            href="/"
            className="text-sm font-semibold text-teal-300 underline-offset-2 hover:text-teal-200 hover:underline"
          >
            חזרה לעמוד הבית
          </Link>

          {kidsInstalled ? (
            <p className="text-xs text-white/50">
              יש לך כבר את אפליקציית LEO K לילדים — ניתן להוסיף גם P-LEO K להורים.
            </p>
          ) : null}
        </div>
      </Layout>
    </>
  );
}
