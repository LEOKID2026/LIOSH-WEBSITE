import { useEffect, useState } from "react";
import {
  initPwaInstallPromptCapture,
  isStudentPwaInstalledStandalone,
  subscribeStudentAppInstalled,
  usePwaInstallPromptAvailable,
  usePromptPwaInstall,
  wasStudentAppInstalledEventFired,
  wasStudentInstallPromptConsumed,
} from "../../lib/pwa/pwa-install-prompt";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";
import { logPwaInstallDiagnostics, logPwaInstallEvent } from "../../lib/pwa/pwa-install-debug";

/** Student install page — explicit button; success only on appinstalled or standalone student PWA. */
export default function StudentPwaInstallLauncher() {
  const hasNativePrompt = usePwaInstallPromptAvailable();
  const promptInstall = usePromptPwaInstall();
  const [runningStandalone, setRunningStandalone] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [promptAccepted, setPromptAccepted] = useState(false);
  const [installUnavailable, setInstallUnavailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");

  useEffect(() => {
    initPwaInstallPromptCapture();
    setRunningStandalone(isStudentPwaInstalledStandalone());
    void logPwaInstallDiagnostics("student");
    logPwaInstallEvent("student:page-ready", {
      promptAvailable: Boolean(hasNativePrompt),
    });

    return subscribeStudentAppInstalled(() => {
      setInstallConfirmed(true);
      setPromptAccepted(false);
      setInstallUnavailable(false);
      setUnavailableReason("");
    });
  }, [hasNativePrompt]);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setInstallUnavailable(false);
    setUnavailableReason("");
    setPromptAccepted(false);

    logPwaInstallEvent("student:install-click", {
      promptAvailable: hasNativePrompt,
      promptConsumed: wasStudentInstallPromptConsumed(),
    });

    if (!hasNativePrompt) {
      if (wasStudentInstallPromptConsumed()) {
        setUnavailableReason("consumed");
      } else {
        setUnavailableReason("no-prompt");
      }
      setInstallUnavailable(true);
      void logPwaInstallDiagnostics("student");
      return;
    }

    try {
      const { outcome } = await promptInstall();
      logPwaInstallEvent("student:after-prompt", {
        outcome,
        appinstalledFired: wasStudentAppInstalledEventFired(),
      });

      if (outcome === "accepted") {
        if (wasStudentAppInstalledEventFired() || isStudentPwaInstalledStandalone()) {
          setInstallConfirmed(true);
        } else {
          setPromptAccepted(true);
        }
        void logPwaInstallDiagnostics("student");
      }
    } catch (error) {
      console.error("[PWA student] install prompt failed:", error);
      setUnavailableReason("error");
      setInstallUnavailable(true);
      void logPwaInstallDiagnostics("student");
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
        LEO K מותקנת. פתחו את האייקון LEO K ממסך הבית.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 text-sm font-bold text-blue-800 shadow-md transition-all hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 hover:shadow-lg"
      >
        התקן LEO K
      </button>

      {promptAccepted ? (
        <p className="rounded-xl border border-sky-400/30 bg-sky-950/40 px-4 py-3 text-sm leading-relaxed text-sky-100">
          Chrome אישר את ההתקנה. אם האייקון LEO K לא הופיע במסך הבית תוך דקה, רענן את הדף ונסה שוב.
        </p>
      ) : null}

      {installUnavailable ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100">
          {unavailableReason === "consumed"
            ? "חלון ההתקנה כבר נוצל. רענן את הדף כדי לנסות שוב, אם Chrome עדיין מאפשר."
            : unavailableReason === "error"
              ? "חלון ההתקנה נכשל. רענן את הדף ונסה שוב."
              : "Chrome לא הציע חלון התקנה ל-LEO K כרגע. ודא/י שהאפליקציה לא מותקנת כבר, ונסה/י רענון."}
        </p>
      ) : null}
    </div>
  );
}
