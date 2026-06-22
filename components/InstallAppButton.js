import { useEffect, useState } from "react";
import {
  isCapacitorNative,
  isPwaInstalledStandalone,
  usePwaInstallPromptAvailable,
  usePromptPwaInstall,
} from "../lib/pwa/pwa-install-prompt";

export default function InstallAppButton({ className = "", label = "התקן אפליקציה" }) {
  const hasNativePrompt = usePwaInstallPromptAvailable();
  const promptInstall = usePromptPwaInstall();
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    setIsInstalled(isPwaInstalledStandalone());
  }, []);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasNativePrompt) {
      try {
        const { outcome } = await promptInstall();
        if (outcome === "accepted") {
          setShowManualInstructions(false);
        }
      } catch (error) {
        console.error("Error installing app:", error);
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
        className="inline-flex items-center justify-center gap-2 w-48 h-10 px-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-blue-800 text-sm font-bold rounded-full hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>{label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showManualInstructions ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-app-instructions-title"
          onClick={closeInstructions}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-white/20 bg-black/85 p-5 shadow-2xl text-right animate-slide-up"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 id="install-app-instructions-title" className="text-lg font-bold text-white">
                  {isIOS ? "הוראות התקנה ל-iOS" : "הוראות התקנה"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeInstructions}
                className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>

            {isIOS ? (
              <ol className="list-decimal list-inside space-y-2 text-sm text-white/90">
                <li>
                  לחץ על כפתור השיתוף <span className="font-bold">📤</span> בתחתית Safari
                </li>
                <li>גלול למטה ובחר &quot;הוסף למסך הבית&quot;</li>
                <li>לחץ &quot;הוסף&quot; בפינה הימנית העליונה</li>
                <li>האפליקציה תופיע במסך הבית שלך</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-sm text-white/90">
                <li>בדפדפן Chrome/Edge: לחץ על אייקון ההתקנה בשורת הכתובת</li>
                <li>בדפדפן Firefox: לחץ על תפריט (☰) ובחר &quot;התקן&quot;</li>
                <li>במובייל: לחץ על &quot;הוסף למסך הבית&quot; בתפריט הדפדפן</li>
                <li>האפליקציה תופיע במסך הבית שלך</li>
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
