import { useEffect, useState } from "react";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";
import {
  initPwaInstallPromptCapture,
  isStudentPwaInstalledStandalone,
  subscribeStudentAppInstalled,
  usePwaInstallPromptAvailable,
  usePromptPwaInstall,
  wasStudentAppInstalledEventFired,
} from "../../lib/pwa/pwa-install-prompt";
import {
  initParentPwaInstallPromptCapture,
  isParentPwaInstalledStandalone,
  subscribeParentAppInstalled,
  useParentPwaInstallPromptAvailable,
  usePromptParentPwaInstall,
  wasParentAppInstalledEventFired,
} from "../../lib/pwa/pwa-parent-install-prompt";
import {
  initTeacherPwaInstallPromptCapture,
  isTeacherPwaInstalledStandalone,
  subscribeTeacherAppInstalled,
  useTeacherPwaInstallPromptAvailable,
  usePromptTeacherPwaInstall,
  wasTeacherAppInstalledEventFired,
} from "../../lib/pwa/pwa-teacher-install-prompt";
import { logPwaInstallEvent } from "../../lib/pwa/pwa-install-debug";

const UNAVAILABLE_MSG =
  "במכשיר הזה ניתן להתקין את האפליקציה דרך תפריט הדפדפן או לאחר הכניסה.";
const INSTALLED_MSG = "האפליקציה כבר מותקנת במכשיר.";

const PORTAL_LABELS = {
  student: "התקנת אפליקציית הילדים",
  parent: "התקנת אפליקציית ההורים",
  teacher: "התקנת אפליקציית המורים",
};

function InstallPhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function PortalPwaInstallButtonInner({
  portal,
  label,
  isBright,
  accent,
  initCapture,
  hasNativePrompt,
  promptInstall,
  isInstalledStandalone,
  subscribeInstalled,
  wasAppInstalledFired,
}) {
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    initCapture();
    setAlreadyInstalled(isInstalledStandalone());

    return subscribeInstalled(() => {
      setAlreadyInstalled(true);
      setStatusMsg(INSTALLED_MSG);
    });
  }, [initCapture, isInstalledStandalone, subscribeInstalled]);

  const handleInstallClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatusMsg("");

    if (isInstalledStandalone()) {
      setAlreadyInstalled(true);
      setStatusMsg(INSTALLED_MSG);
      return;
    }

    logPwaInstallEvent(`${portal}:marketing-install-click`, {
      promptAvailable: hasNativePrompt,
    });

    if (!hasNativePrompt) {
      setStatusMsg(UNAVAILABLE_MSG);
      return;
    }

    try {
      const { outcome } = await promptInstall();
      if (outcome === "accepted") {
        if (wasAppInstalledFired() || isInstalledStandalone()) {
          setAlreadyInstalled(true);
          setStatusMsg(INSTALLED_MSG);
        }
        return;
      }
      if (outcome === "dismissed") {
        return;
      }
      setStatusMsg(UNAVAILABLE_MSG);
    } catch {
      setStatusMsg(UNAVAILABLE_MSG);
    }
  };

  if (isCapacitorNative()) {
    return null;
  }

  const installBtnClass = isBright ? accent.installBtnBright : accent.installBtnClassic;
  const msgClass = isBright ? "text-slate-600" : "text-white/70";

  if (alreadyInstalled && !statusMsg) {
    return <p className={`text-sm ${msgClass}`}>{INSTALLED_MSG}</p>;
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-center">
      {!alreadyInstalled ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold transition sm:w-auto ${installBtnClass}`}
        >
          <InstallPhoneIcon />
          <span>{label}</span>
        </button>
      ) : null}
      {statusMsg ? (
        <p className={`max-w-sm text-center text-sm leading-relaxed ${msgClass}`} role="status">
          {statusMsg}
        </p>
      ) : null}
    </div>
  );
}

function StudentPortalPwaInstallButton(props) {
  const hasNativePrompt = usePwaInstallPromptAvailable();
  const promptInstall = usePromptPwaInstall();
  return (
    <PortalPwaInstallButtonInner
      {...props}
      portal="student"
      initCapture={initPwaInstallPromptCapture}
      hasNativePrompt={hasNativePrompt}
      promptInstall={promptInstall}
      isInstalledStandalone={isStudentPwaInstalledStandalone}
      subscribeInstalled={subscribeStudentAppInstalled}
      wasAppInstalledFired={wasStudentAppInstalledEventFired}
    />
  );
}

function ParentPortalPwaInstallButton(props) {
  const hasNativePrompt = useParentPwaInstallPromptAvailable();
  const promptInstall = usePromptParentPwaInstall();
  return (
    <PortalPwaInstallButtonInner
      {...props}
      portal="parent"
      initCapture={initParentPwaInstallPromptCapture}
      hasNativePrompt={hasNativePrompt}
      promptInstall={promptInstall}
      isInstalledStandalone={isParentPwaInstalledStandalone}
      subscribeInstalled={subscribeParentAppInstalled}
      wasAppInstalledFired={wasParentAppInstalledEventFired}
    />
  );
}

function TeacherPortalPwaInstallButton(props) {
  const hasNativePrompt = useTeacherPwaInstallPromptAvailable();
  const promptInstall = usePromptTeacherPwaInstall();
  return (
    <PortalPwaInstallButtonInner
      {...props}
      portal="teacher"
      initCapture={initTeacherPwaInstallPromptCapture}
      hasNativePrompt={hasNativePrompt}
      promptInstall={promptInstall}
      isInstalledStandalone={isTeacherPwaInstalledStandalone}
      subscribeInstalled={subscribeTeacherAppInstalled}
      wasAppInstalledFired={wasTeacherAppInstalledEventFired}
    />
  );
}

/**
 * Focused PWA install button for a single portal (no multi-app choice modal).
 * @param {{ portal: 'student' | 'parent' | 'teacher', isBright?: boolean, accent: object, label?: string }} props
 */
export default function PortalPwaInstallButton({ portal, isBright = false, accent, label }) {
  const resolvedLabel = label || PORTAL_LABELS[portal];

  if (portal === "parent") {
    return (
      <ParentPortalPwaInstallButton label={resolvedLabel} isBright={isBright} accent={accent} />
    );
  }
  if (portal === "teacher") {
    return (
      <TeacherPortalPwaInstallButton label={resolvedLabel} isBright={isBright} accent={accent} />
    );
  }
  return (
    <StudentPortalPwaInstallButton label={resolvedLabel} isBright={isBright} accent={accent} />
  );
}

export { PORTAL_LABELS };
