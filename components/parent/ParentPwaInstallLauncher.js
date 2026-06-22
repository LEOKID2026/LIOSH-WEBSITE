import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import {
  initParentPwaInstallPromptCapture,
  isParentPwaInstalledStandalone,
  useParentPwaInstallPromptAvailable,
  usePromptParentPwaInstall,
} from "../../lib/pwa/pwa-parent-install-prompt";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";

const PROMPT_WAIT_MS = 12000;

/**
 * Loaded only on /parent/install-app (parent manifest in initial HTML).
 * Waits for Chrome beforeinstallprompt and opens the native Install app dialog.
 * No manual instructions modal — if prompt never arrives, show an honest error.
 */
export default function ParentPwaInstallLauncher() {
  const router = useRouter();
  const hasNativePrompt = useParentPwaInstallPromptAvailable();
  const promptInstall = usePromptParentPwaInstall();
  const promptStarted = useRef(false);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    initParentPwaInstallPromptCapture();
  }, []);

  useEffect(() => {
    if (isCapacitorNative()) {
      setStatus("unavailable");
      return undefined;
    }
    if (isParentPwaInstalledStandalone()) {
      router.replace("/");
      return undefined;
    }
    return undefined;
  }, [router]);

  useEffect(() => {
    if (!hasNativePrompt || promptStarted.current) return undefined;

    promptStarted.current = true;
    setStatus("prompting");

    void promptInstall()
      .catch((error) => {
        console.error("[PWA parent] install prompt failed:", error);
        setStatus("unavailable");
      })
      .finally(() => {
        router.replace("/");
      });

    return undefined;
  }, [hasNativePrompt, promptInstall, router]);

  useEffect(() => {
    if (status !== "waiting" || hasNativePrompt) return undefined;

    const timer = window.setTimeout(() => {
      if (!promptStarted.current) {
        setStatus("unavailable");
      }
    }, PROMPT_WAIT_MS);

    return () => window.clearTimeout(timer);
  }, [status, hasNativePrompt]);

  if (status === "unavailable") {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Chrome לא הציע חלון התקנה ל-P-LEO K. ייתכן שהאפליקציה כבר מותקנת, או שהדפדפן לא
          תומך בהתקנה נפרדת כרגע.
        </p>
        <Link
          href="/"
          className="text-sm font-semibold text-teal-300 underline-offset-2 hover:text-teal-200 hover:underline"
        >
          חזרה לעמוד הבית
        </Link>
      </div>
    );
  }

  return (
    <p className="text-sm text-white/80" aria-live="polite">
      {status === "prompting" ? "פותח חלון התקנה של Chrome…" : "ממתין לחלון התקנה של Chrome…"}
    </p>
  );
}
