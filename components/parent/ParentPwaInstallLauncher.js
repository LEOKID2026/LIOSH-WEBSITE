import { useEffect, useMemo, useState } from "react";
import {
  initParentPwaInstallPromptCapture,
  isParentPwaInstalledStandalone,
  subscribeParentAppInstalled,
  useParentPwaInstallPromptAvailable,
  usePromptParentPwaInstall,
  wasParentAppInstalledEventFired,
  wasParentInstallPromptConsumed,
} from "../../lib/pwa/pwa-parent-install-prompt";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";
import { logPwaInstallDiagnostics, logPwaInstallEvent } from "../../lib/pwa/pwa-install-debug";
import { getPwaInstallPageTheme } from "../../lib/pwa/pwa-install-page-theme.client.js";

/** Parent install page — explicit button only. Success only on appinstalled or standalone parent PWA. */
export default function ParentPwaInstallLauncher({ isBright = false }) {
  const T = useMemo(() => getPwaInstallPageTheme("parent", isBright).launcher, [isBright]);
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
    void logPwaInstallDiagnostics("parent");
    logPwaInstallEvent("parent:page-ready", {
      promptAvailable: Boolean(hasNativePrompt),
    });

    return subscribeParentAppInstalled(() => {
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

    logPwaInstallEvent("parent:install-click", {
      promptAvailable: hasNativePrompt,
      promptConsumed: wasParentInstallPromptConsumed(),
    });

    if (!hasNativePrompt) {
      if (wasParentInstallPromptConsumed()) {
        setUnavailableReason("consumed");
      } else {
        setUnavailableReason("no-prompt");
      }
      setInstallUnavailable(true);
      void logPwaInstallDiagnostics("parent");
      return;
    }

    try {
      const { outcome } = await promptInstall();
      logPwaInstallEvent("parent:after-prompt", {
        outcome,
        appinstalledFired: wasParentAppInstalledEventFired(),
      });

      if (outcome === "accepted") {
        if (wasParentAppInstalledEventFired() || isParentPwaInstalledStandalone()) {
          setInstallConfirmed(true);
        } else {
          setPromptAccepted(true);
        }
        void logPwaInstallDiagnostics("parent");
        return;
      }
    } catch (error) {
      console.error("[PWA parent] install prompt failed:", error);
      setUnavailableReason("error");
      setInstallUnavailable(true);
      void logPwaInstallDiagnostics("parent");
    }
  };

  if (isCapacitorNative()) {
    return <p className={T.nativeMsg}>התקנת PWA זמינה בדפדפן, לא באפליקציה המותקנת.</p>;
  }

  if (runningStandalone || installConfirmed) {
    return (
      <p className={T.successMsg}>P LEO KIDS מותקנת. פתחי את האייקון P LEO KIDS ממסך הבית.</p>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-4">
      <button type="button" onClick={handleInstallClick} className={T.installBtn}>
        התקן P LEO KIDS
      </button>

      {promptAccepted ? (
        <p className={T.infoMsg}>
          Chrome אישר את ההתקנה. אם האייקון P LEO KIDS לא הופיע במסך הבית תוך דקה, רענן את הדף ונסה
          שוב. אם עדיין אין אייקון - הסר התקנות קודמות של האתר מהגדרות האפליקציות.
        </p>
      ) : null}

      {installUnavailable ? (
        <p className={T.warnMsg}>
          {unavailableReason === "consumed"
            ? "חלון ההתקנה כבר נוצל. רענן את הדף כדי לנסות שוב, אם Chrome עדיין מאפשר."
            : unavailableReason === "error"
              ? "חלון ההתקנה נכשל. רענן את הדף ונסה שוב."
              : "Chrome לא הציע חלון התקנה ל-P LEO KIDS כרגע. ודא/י ש-LEO KIDS מותקנת, ונסה/י רענון - שתי האפליקציות אמורות להיות נפרדות."}
        </p>
      ) : null}
    </div>
  );
}
