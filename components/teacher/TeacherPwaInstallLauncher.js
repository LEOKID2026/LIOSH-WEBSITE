import { useEffect, useState } from "react";
import {
  initTeacherPwaInstallPromptCapture,
  isTeacherPwaInstalledStandalone,
  subscribeTeacherAppInstalled,
  useTeacherPwaInstallPromptAvailable,
  usePromptTeacherPwaInstall,
  wasTeacherAppInstalledEventFired,
  wasTeacherInstallPromptConsumed,
} from "../../lib/pwa/pwa-teacher-install-prompt";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";
import { logPwaInstallDiagnostics, logPwaInstallEvent } from "../../lib/pwa/pwa-install-debug";

/** Teacher install page — explicit button only. Success only on appinstalled or standalone teacher PWA. */
export default function TeacherPwaInstallLauncher() {
  const hasNativePrompt = useTeacherPwaInstallPromptAvailable();
  const promptInstall = usePromptTeacherPwaInstall();
  const [runningStandalone, setRunningStandalone] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [promptAccepted, setPromptAccepted] = useState(false);
  const [installUnavailable, setInstallUnavailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");

  useEffect(() => {
    initTeacherPwaInstallPromptCapture();
    setRunningStandalone(isTeacherPwaInstalledStandalone());
    void logPwaInstallDiagnostics("teacher");
    logPwaInstallEvent("teacher:page-ready", {
      promptAvailable: Boolean(hasNativePrompt),
    });

    return subscribeTeacherAppInstalled(() => {
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

    logPwaInstallEvent("teacher:install-click", {
      promptAvailable: hasNativePrompt,
      promptConsumed: wasTeacherInstallPromptConsumed(),
    });

    if (!hasNativePrompt) {
      if (wasTeacherInstallPromptConsumed()) {
        setUnavailableReason("consumed");
      } else {
        setUnavailableReason("no-prompt");
      }
      setInstallUnavailable(true);
      void logPwaInstallDiagnostics("teacher");
      return;
    }

    try {
      const { outcome } = await promptInstall();
      logPwaInstallEvent("teacher:after-prompt", {
        outcome,
        appinstalledFired: wasTeacherAppInstalledEventFired(),
      });

      if (outcome === "accepted") {
        if (wasTeacherAppInstalledEventFired() || isTeacherPwaInstalledStandalone()) {
          setInstallConfirmed(true);
        } else {
          setPromptAccepted(true);
        }
        void logPwaInstallDiagnostics("teacher");
      }
    } catch (error) {
      console.error("[PWA teacher] install prompt failed:", error);
      setUnavailableReason("error");
      setInstallUnavailable(true);
      void logPwaInstallDiagnostics("teacher");
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
        T LEO K מותקנת. פתחו את האייקון T LEO K ממסך הבית.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-600 to-orange-500 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:via-violet-700 hover:to-orange-600 hover:shadow-lg"
      >
        התקן T LEO K
      </button>

      {promptAccepted ? (
        <p className="rounded-xl border border-sky-400/30 bg-sky-950/40 px-4 py-3 text-sm leading-relaxed text-sky-100">
          Chrome אישר את ההתקנה. אם האייקון T LEO K לא הופיע במסך הבית תוך דקה, רענן את הדף ונסה
          שוב.
        </p>
      ) : null}

      {installUnavailable ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100">
          {unavailableReason === "consumed"
            ? "חלון ההתקנה כבר נוצל. רענן את הדף כדי לנסות שוב, אם Chrome עדיין מאפשר."
            : unavailableReason === "error"
              ? "חלון ההתקנה נכשל. רענן את הדף ונסה שוב."
              : "Chrome לא הציע חלון התקנה ל-T LEO K כרגע. ודא/י שהאפליקציה לא מותקנת כבר, ונסה/י רענון."}
        </p>
      ) : null}
    </div>
  );
}
