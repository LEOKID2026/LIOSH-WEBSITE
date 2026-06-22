import Link from "next/link";
import { useEffect, useState } from "react";
import {
  initParentPwaInstallPromptCapture,
  isParentPwaInstalledStandalone,
  useParentPwaInstallPromptAvailable,
  usePromptParentPwaInstall,
} from "../lib/pwa/pwa-parent-install-prompt";
import { isCapacitorNative } from "../lib/pwa/pwa-install-prompt";

/**
 * Home page entry — navigates to parent PWA install flow (must run under /parent/ scope).
 */
export function ParentHomeInstallLinkButton({ className = "" }) {
  if (isCapacitorNative()) return null;

  return (
    <Link
      href="/parent/install-app"
      className={
        className ||
        "inline-flex h-10 w-48 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-4 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700 hover:shadow-lg"
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <span>התקנת אפליקציה להורים</span>
    </Link>
  );
}

/**
 * Parent install page — triggers P-LEO K install prompt (separate manifest).
 */
export function InstallParentAppButton({ className = "" }) {
  const hasNativePrompt = useParentPwaInstallPromptAvailable();
  const promptInstall = usePromptParentPwaInstall();
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    initParentPwaInstallPromptCapture();
  }, []);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    setIsInstalled(isParentPwaInstalledStandalone());
  }, []);

  useEffect(() => {
    if (isInstalled || isCapacitorNative()) return undefined;
    if (!hasNativePrompt) return undefined;
    void promptInstall();
  }, [hasNativePrompt, isInstalled, promptInstall]);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasNativePrompt) {
      try {
        const { outcome } = await promptInstall();
        if (outcome === "accepted") {
          setShowManualInstructions(false);
          setIsInstalled(isParentPwaInstalledStandalone());
        }
      } catch (error) {
        console.error("Error installing parent app:", error);
        setShowManualInstructions(true);
      }
      return;
    }

    setShowManualInstructions(true);
  };

  useEffect(() => {
    if (!showManualInstructions) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showManualInstructions]);

  const closeInstructions = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowManualInstructions(false);
  };

  if (isCapacitorNative() || isInstalled) {
    return null;
  }

  return (
    <div className={className || "mt-6"}>
      <button
        onClick={handleInstallClick}
        type="button"
        className="inline-flex h-10 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-4 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700 hover:shadow-lg sm:w-56"
      >
        <span>התקנת אפליקציה להורים</span>
      </button>

      {showManualInstructions ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-parent-app-instructions-title"
          onClick={closeInstructions}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-white/20 bg-black/85 p-5 text-right shadow-2xl animate-slide-up"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 id="install-parent-app-instructions-title" className="text-lg font-bold text-white">
                  {isIOS ? "הוראות התקנה ל-iOS — P-LEO K" : "הוראות התקנה — P-LEO K"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeInstructions}
                className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>

            {isIOS ? (
              <ol className="list-decimal list-inside space-y-2 text-sm text-white/90">
                <li>לחץ על כפתור השיתוף 📤 בתחתית Safari</li>
                <li>גלול למטה ובחר &quot;הוסף למסך הבית&quot;</li>
                <li>ודא שהשם הוא P-LEO K ולחץ &quot;הוסף&quot;</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-sm text-white/90">
                <li>ב-Chrome/Edge: לחץ על אייקון ההתקנה בשורת הכתובת</li>
                <li>ודא שהשם המוצג הוא P-LEO K</li>
                <li>לאחר ההתקנה האייקון ייפתח את פורטל ההורים</li>
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
