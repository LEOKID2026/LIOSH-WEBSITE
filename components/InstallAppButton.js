import { useEffect, useState } from "react";

export default function InstallAppButton({ className = "" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // בדיקה אם זה iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // בדיקה אם האפליקציה כבר מותקנת (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                         window.navigator.standalone ||
                         document.referrer.includes("android-app://");
    setIsInstalled(isStandalone);

    // טיפול ב-beforeinstallprompt (אנדרואיד/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (deferredPrompt) {
        // אנדרואיד/Chrome - התקנה אוטומטית
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          setShowIOSInstructions(false);
          // אפשר להוסיף הודעה של הצלחה
        }
      } else {
        // iOS או דפדפן אחר - הצג הוראות
        setShowIOSInstructions(true);
      }
    } catch (error) {
      console.error("Error installing app:", error);
      // במקרה של שגיאה, הצג הוראות
      setShowIOSInstructions(true);
    }
  };

  if (isInstalled) {
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

      {showIOSInstructions && (
        <div className="mt-4 max-w-md mx-auto bg-black/60 backdrop-blur-sm rounded-xl p-5 border border-white/20 shadow-2xl animate-slide-up">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowIOSInstructions(false);
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
              
              {/* כפתור הורדה בתוך החלון */}
              {deferredPrompt && (
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === "accepted") {
                        setDeferredPrompt(null);
                        setShowIOSInstructions(false);
                      }
                    } catch (error) {
                      console.error("Error installing app:", error);
                    }
                  }}
                  type="button"
                  className="w-full mb-4 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
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
                  הורד והתקן עכשיו
                </button>
              )}

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

