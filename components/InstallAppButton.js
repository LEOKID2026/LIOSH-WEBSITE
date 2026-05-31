import { useEffect, useState } from "react";
import {
  isCapacitorNative,
  isPwaInstalledStandalone,
  usePwaInstallPromptAvailable,
  usePromptPwaInstall,
} from "../lib/pwa/pwa-install-prompt";

export default function InstallAppButton({ className = "" }) {
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

  if (isCapacitorNative() || isInstalled) {
    return null;
  }

  return (
    <div className={className || "mt-6"}>
      <button
        onClick={handleInstallClick}
        type="button"
        className="inline-flex items-center justify-center gap-2 w-48 h-10 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-full hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
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
        <span>התקן אפליקציה</span>
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

      {showManualInstructions && (
        <div className="mt-4 max-w-md mx-auto bg-black/60 backdrop-blur-sm rounded-xl p-5 border border-white/20 shadow-2xl animate-slide-up">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowManualInstructions(false);
              }}
              type="button"
              className="text-white/60 hover:text-white text-xl leading-none transition hover:scale-110"
            >
              ✕
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-white font-bold text-lg">
                  {isIOS ? "הוראות התקנה ל-iOS:" : "הוראות התקנה:"}
                </h3>
              </div>

              {isIOS ? (
                <ol className="text-sm text-white/90 space-y-2 list-decimal list-inside">
                  <li>לחץ על כפתור השיתוף <span className="font-bold">📤</span> בתחתית Safari</li>
                  <li>גלול למטה ובחר "הוסף למסך הבית"</li>
                  <li>לחץ "הוסף" בפינה הימנית העליונה</li>
                  <li>האפליקציה תופיע במסך הבית שלך</li>
                </ol>
              ) : (
                <ol className="text-sm text-white/90 space-y-2 list-decimal list-inside">
                  <li>בדפדפן Chrome/Edge: לחץ על אייקון ההתקנה בשורת הכתובת</li>
                  <li>בדפדפן Firefox: לחץ על תפריט (☰) ובחר "התקן"</li>
                  <li>במובייל: לחץ על "הוסף למסך הבית" בתפריט הדפדפן</li>
                  <li>האפליקציה תופיע במסך הבית שלך</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
