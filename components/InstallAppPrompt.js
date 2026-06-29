import { useEffect, useState } from "react";
import {
  getDeferredInstallPrompt,
  isCapacitorNative,
  isPwaInstalledStandalone,
  subscribePwaInstallPrompt,
  usePwaInstallPromptAvailable,
  usePromptPwaInstall,
} from "../lib/pwa/pwa-install-prompt";

export default function InstallAppPrompt() {
  const hasNativePrompt = usePwaInstallPromptAvailable();
  const promptInstall = usePromptPwaInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isCapacitorNative()) return undefined;

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    setIsInstalled(isPwaInstalledStandalone());

    if (isPwaInstalledStandalone()) {
      return undefined;
    }

    const dismissed = localStorage.getItem("app-install-dismissed");

    const maybeShowPrompt = () => {
      if (localStorage.getItem("app-install-dismissed")) return;
      if (getDeferredInstallPrompt()) {
        setShowPrompt(true);
      }
    };

    maybeShowPrompt();

    const unsubscribe = subscribePwaInstallPrompt(maybeShowPrompt);

    let timer;
    if (!dismissed && iOS) {
      timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasNativePrompt) {
      try {
        const { outcome } = await promptInstall();
        if (outcome === "accepted") {
          setShowPrompt(false);
        }
      } catch (error) {
        console.error("Error installing app:", error);
      }
      return;
    }

    if (!isIOS) {
      console.info("[PWA] התקנה זמינה דרך תפריט הדפדפן");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("app-install-dismissed", "true");
    setTimeout(() => {
      localStorage.removeItem("app-install-dismissed");
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (isCapacitorNative() || isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-amber-500/90 to-orange-600/90 backdrop-blur-sm rounded-2xl p-5 shadow-2xl border border-white/20">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">התקן את LEO KIDS</h3>
            <p className="text-sm text-white/90 mb-3">
              {isIOS
                ? "הוסף את האפליקציה למסך הבית לחוויה טובה יותר"
                : "התקן את האפליקציה לגישה מהירה ונוחה יותר"}
            </p>

            <button
              onClick={handleInstallClick}
              type="button"
              className="w-full mb-3 px-5 py-3 bg-white text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {hasNativePrompt ? "הורד והתקן עכשיו" : isIOS ? "הצג הוראות הורדה" : "התקן אפליקציה"}
            </button>

            {isIOS && (
              <div className="bg-black/30 rounded-lg p-3 mb-3 text-xs text-white/90">
                <p className="font-semibold mb-2">הוראות התקנה:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>לחץ על כפתור השיתוף <span className="font-bold">📤</span> בתחתית Safari</li>
                  <li>בחר "הוסף למסך הבית"</li>
                  <li>לחץ "הוסף"</li>
                </ol>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                type="button"
                className="flex-1 px-4 py-2 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-all hover:scale-105 active:scale-95 text-sm"
              >
                ✕ סגור
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
