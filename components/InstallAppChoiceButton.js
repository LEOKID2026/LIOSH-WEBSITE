import { useEffect, useState } from "react";
import { isCapacitorNative, isPwaInstalledStandalone } from "../lib/pwa/pwa-install-prompt";
import {
  PARENT_PWA_INSTALL_PATH,
  STUDENT_PWA_INSTALL_PATH,
  TEACHER_PWA_INSTALL_PATH,
} from "../lib/pwa/pwa-install-mode";

/**
 * Home page — one button opens choice modal; each option goes to its dedicated install page.
 */
export default function InstallAppChoiceButton({ className = "", buttonClassName = "" }) {
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  useEffect(() => {
    if (!showChoiceModal) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showChoiceModal]);

  const handleKidsChoice = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowChoiceModal(false);
    window.location.href = STUDENT_PWA_INSTALL_PATH;
  };

  const handleParentsChoice = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowChoiceModal(false);
    window.location.href = PARENT_PWA_INSTALL_PATH;
  };

  const handleTeachersChoice = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowChoiceModal(false);
    window.location.href = TEACHER_PWA_INSTALL_PATH;
  };

  if (isCapacitorNative() || isPwaInstalledStandalone()) {
    return null;
  }

  const defaultButtonClass =
    "inline-flex h-10 w-48 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 text-sm font-bold text-blue-800 shadow-md transition-all hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 hover:shadow-lg";

  return (
    <div className={className || "mt-6"}>
      <button
        onClick={() => setShowChoiceModal(true)}
        type="button"
        className={buttonClassName || defaultButtonClass}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <span>התקנת אפליקציה</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showChoiceModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-app-choice-title"
          onClick={() => setShowChoiceModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-white/20 bg-black/85 p-5 text-right shadow-2xl animate-slide-up"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 id="install-app-choice-title" className="text-lg font-bold text-white">
                מה תרצה להתקין?
              </h3>
              <button
                type="button"
                onClick={() => setShowChoiceModal(false)}
                className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleKidsChoice}
                className="flex w-full flex-col items-start gap-1 rounded-xl border border-amber-400/30 bg-gradient-to-l from-amber-500/20 to-yellow-500/10 px-4 py-3 text-right transition hover:border-amber-400/50 hover:from-amber-500/30"
              >
                <span className="text-base font-bold text-amber-200">התקנת אפליקציה לילדים</span>
                <span className="text-sm text-white/75">LEO KIDS</span>
              </button>

              <button
                type="button"
                onClick={handleParentsChoice}
                className="flex w-full flex-col items-start gap-1 rounded-xl border border-teal-400/30 bg-gradient-to-l from-teal-500/20 to-cyan-500/10 px-4 py-3 text-right transition hover:border-teal-400/50 hover:from-teal-500/30"
              >
                <span className="text-base font-bold text-teal-200">התקנת אפליקציה להורים</span>
                <span className="text-sm text-white/75">P LEO KIDS</span>
              </button>

              <button
                type="button"
                onClick={handleTeachersChoice}
                className="flex w-full flex-col items-start gap-1 rounded-xl border border-indigo-400/30 bg-gradient-to-l from-indigo-500/20 to-orange-500/10 px-4 py-3 text-right transition hover:border-indigo-400/50 hover:from-indigo-500/30"
              >
                <span className="text-base font-bold text-indigo-200">התקנת אפליקציה למורים</span>
                <span className="text-sm text-white/75">T LEO KIDS</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
