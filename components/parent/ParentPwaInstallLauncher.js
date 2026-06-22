import { useEffect, useState } from "react";
import {
  initParentPwaInstallPromptCapture,
  isParentPwaInstalledStandalone,
  useParentPwaInstallPromptAvailable,
  usePromptParentPwaInstall,
} from "../../lib/pwa/pwa-parent-install-prompt";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";

/**
 * Parent install page — explicit button only. No auto-prompt, no waiting screen, no manual instructions.
 */
export default function ParentPwaInstallLauncher() {
  const hasNativePrompt = useParentPwaInstallPromptAvailable();
  const promptInstall = usePromptParentPwaInstall();
  const [isInstalled, setIsInstalled] = useState(false);
  const [installUnavailable, setInstallUnavailable] = useState(false);

  useEffect(() => {
    initParentPwaInstallPromptCapture();
    setIsInstalled(isParentPwaInstalledStandalone());
  }, []);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setInstallUnavailable(false);

    if (!hasNativePrompt) {
      setInstallUnavailable(true);
      return;
    }

    try {
      const { outcome } = await promptInstall();
      if (outcome === "accepted") {
        setIsInstalled(isParentPwaInstalledStandalone());
      }
    } catch (error) {
      console.error("[PWA parent] install prompt failed:", error);
      setInstallUnavailable(true);
    }
  };

  if (isCapacitorNative()) {
    return (
      <p className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
        התקנת PWA זמינה בדפדפן, לא באפליקציה המותקנת.
      </p>
    );
  }

  if (isInstalled) {
    return (
      <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
        P-LEO K כבר מותקן במכשיר.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700 hover:shadow-lg"
      >
        התקן P-LEO K
      </button>

      {installUnavailable ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100">
          Chrome לא הציע חלון התקנה ל-P-LEO K. ייתכן שהאפליקציה כבר מותקנת, או שהדפדפן לא תומך
          בהתקנה נפרדת כרגע.
        </p>
      ) : null}
    </div>
  );
}
