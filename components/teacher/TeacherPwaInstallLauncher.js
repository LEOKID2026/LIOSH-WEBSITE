import { useEffect, useMemo, useState } from "react";
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
import { getPwaInstallPageTheme } from "../../lib/pwa/pwa-install-page-theme.client.js";

/** Teacher install page — explicit button only. Success only on appinstalled or standalone teacher PWA. */
export default function TeacherPwaInstallLauncher({ isBright = false }) {
  const T = useMemo(() => getPwaInstallPageTheme("teacher", isBright).launcher, [isBright]);
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
    return <p className={T.nativeMsg}>התקנת PWA זמינה בדפדפן, לא באפליקציה המותקנת.</p>;
  }

  if (runningStandalone || installConfirmed) {
    return (
      <p className={T.successMsg}>T LEO KIDS מותקנת. פתחו את האייקון T LEO KIDS ממסך הבית.</p>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-4">
      <button type="button" onClick={handleInstallClick} className={T.installBtn}>
        התקן T LEO KIDS
      </button>

      {promptAccepted ? (
        <p className={T.infoMsg}>
          Chrome אישר את ההתקנה. אם האייקון T LEO KIDS לא הופיע במסך הבית תוך דקה, רענן את הדף ונסה
          שוב.
        </p>
      ) : null}

      {installUnavailable ? (
        <p className={T.warnMsg}>
          {unavailableReason === "consumed"
            ? "חלון ההתקנה כבר נוצל. רענן את הדף כדי לנסות שוב, אם Chrome עדיין מאפשר."
            : unavailableReason === "error"
              ? "חלון ההתקנה נכשל. רענן את הדף ונסה שוב."
              : "Chrome לא הציע חלון התקנה ל-T LEO KIDS כרגע. ודא/י שהאפליקציה לא מותקנת כבר, ונסה/י רענון."}
        </p>
      ) : null}
    </div>
  );
}
