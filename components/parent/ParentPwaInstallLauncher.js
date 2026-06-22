import { useEffect, useState } from "react";
import {
  initParentPwaInstallPromptCapture,
  isParentPwaInstalledStandalone,
  subscribeParentAppInstalled,
  useParentPwaInstallPromptAvailable,
  usePromptParentPwaInstall,
  wasParentInstallPromptConsumed,
} from "../../lib/pwa/pwa-parent-install-prompt";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";

/**
 * Parent install page — explicit button only. Install state follows appinstalled / standalone, not userChoice alone.
 */
export default function ParentPwaInstallLauncher() {
  const hasNativePrompt = useParentPwaInstallPromptAvailable();
  const promptInstall = usePromptParentPwaInstall();
  const [runningStandalone, setRunningStandalone] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [promptAccepted, setPromptAccepted] = useState(false);
  const [installUnavailable, setInstallUnavailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");

  useEffect(() => {
    initParentPwaInstallPromptCapture();
    setRunningStandalone(isParentPwaInstalledStandalone());
    return subscribeParentAppInstalled(() => {
      setInstallConfirmed(true);
      setPromptAccepted(false);
      setInstallUnavailable(false);
      setUnavailableReason("");
    });
  }, []);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setInstallUnavailable(false);
    setUnavailableReason("");
    setPromptAccepted(false);

    if (!hasNativePrompt) {
      if (wasParentInstallPromptConsumed()) {
        setUnavailableReason("consumed");
      } else {
        setUnavailableReason("no-prompt");
      }
      setInstallUnavailable(true);
      return;
    }

    try {
      const { outcome } = await promptInstall();
      if (outcome === "accepted") {
        setPromptAccepted(true);
        return;
      }
    } catch (error) {
      console.error("[PWA parent] install prompt failed:", error);
      setUnavailableReason("error");
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

  if (runningStandalone || installConfirmed) {
    return (
      <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
        P-LEO K מותקנת. פתחי את האייקון P-LEO K ממסך הבית.
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

      {promptAccepted ? (
        <p className="rounded-xl border border-sky-400/30 bg-sky-950/40 px-4 py-3 text-sm leading-relaxed text-sky-100">
          Chrome אישר את ההתקנה. אם האייקון P-LEO K לא הופיע במסך הבית, רענן את הדף ונסה שוב, או הסר
          התקנות חלקיות של האתר מהגדרות Chrome/האפליקציות.
        </p>
      ) : null}

      {installUnavailable ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100">
          {unavailableReason === "consumed"
            ? "חלון ההתקנה כבר נוצל. רענן את הדף כדי לנסות שוב, אם Chrome עדיין מאפשר."
            : unavailableReason === "error"
              ? "חלון ההתקנה נכשל. רענן את הדף ונסה שוב."
              : "Chrome לא הציע חלון התקנה ל-P-LEO K כרגע. ודא/י שהאפליקציה לא מותקנת כבר, ונסה/י רענון."}
        </p>
      ) : null}
    </div>
  );
}
