import { useEffect, useState } from "react";
import { isCapacitorNative } from "../../lib/pwa/pwa-install-prompt";
import {
  PARENT_PWA_INSTALL_PATH,
  STUDENT_PWA_INSTALL_PATH,
  TEACHER_PWA_INSTALL_PATH,
} from "../../lib/pwa/pwa-install-mode";
import { isStudentPwaInstalledStandalone } from "../../lib/pwa/pwa-install-prompt";
import { isParentPwaInstalledStandalone } from "../../lib/pwa/pwa-parent-install-prompt";
import { isTeacherPwaInstalledStandalone } from "../../lib/pwa/pwa-teacher-install-prompt";

const INSTALLED_MSG = "האפליקציה כבר מותקנת במכשיר.";

const PORTAL_LABELS = {
  student: "התקנת אפליקציית הילדים",
  parent: "התקנת אפליקציית ההורים",
  teacher: "התקנת אפליקציית המורים",
};

const INSTALL_PATHS = {
  student: STUDENT_PWA_INSTALL_PATH,
  parent: PARENT_PWA_INSTALL_PATH,
  teacher: TEACHER_PWA_INSTALL_PATH,
};

const INSTALLED_CHECKS = {
  student: isStudentPwaInstalledStandalone,
  parent: isParentPwaInstalledStandalone,
  teacher: isTeacherPwaInstalledStandalone,
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

/**
 * Marketing landing pages — same install flow as home page, direct to portal install route.
 * @param {{ portal: 'student' | 'parent' | 'teacher', isBright?: boolean, accent: object, label?: string }} props
 */
export default function PortalPwaInstallButton({ portal, isBright = false, accent, label }) {
  const resolvedLabel = label || PORTAL_LABELS[portal];
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    setAlreadyInstalled(INSTALLED_CHECKS[portal]());
  }, [portal]);

  const handleInstallClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = INSTALL_PATHS[portal];
  };

  if (isCapacitorNative()) {
    return null;
  }

  const installBtnClass = isBright ? accent.installBtnBright : accent.installBtnClassic;
  const msgClass = isBright ? "text-slate-600" : "text-white/70";

  if (alreadyInstalled) {
    return <p className={`text-sm ${msgClass}`}>{INSTALLED_MSG}</p>;
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-center">
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold transition sm:w-auto ${installBtnClass}`}
      >
        <InstallPhoneIcon />
        <span>{resolvedLabel}</span>
      </button>
    </div>
  );
}

export { PORTAL_LABELS };
