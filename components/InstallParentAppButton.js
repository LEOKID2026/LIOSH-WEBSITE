import { isCapacitorNative } from "../lib/pwa/pwa-install-prompt";
import { isParentPwaInstalledStandalone } from "../lib/pwa/pwa-parent-install-prompt";
import { PARENT_PWA_INSTALL_PATH } from "../lib/pwa/pwa-install-mode";

/**
 * Home page — one click navigates to the parent install route where Chrome loads
 * manifest-parent and fires beforeinstallprompt (Chrome allows one manifest per load).
 */
export default function ParentInstallAppButton({
  className = "",
  label = "התקנת אפליקציה להורים",
}) {
  if (isCapacitorNative() || isParentPwaInstalledStandalone()) {
    return null;
  }

  const handleInstallClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = PARENT_PWA_INSTALL_PATH;
  };

  return (
    <div className={className || "mt-6"}>
      <button
        onClick={handleInstallClick}
        type="button"
        className="inline-flex h-10 w-48 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-4 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700 hover:shadow-lg"
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
        <span>{label}</span>
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
    </div>
  );
}
