/**
 * Opens the cookie/ads preferences panel from footer or other chrome.
 */
export function openConsentPreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("leokids:open-consent-preferences"));
}

/**
 * @param {{ className?: string; isStudentBright?: boolean }} props
 */
export default function ConsentPreferencesLink({ className = "", isStudentBright = false }) {
  const base =
    isStudentBright
      ? "text-slate-600 hover:text-slate-800 underline underline-offset-2"
      : "text-white/70 hover:text-white underline underline-offset-2";

  return (
    <button
      type="button"
      onClick={openConsentPreferences}
      className={`${base} ${className}`.trim()}
      aria-label="פתיחת העדפות עוגיות ופרסומות"
    >
      העדפות עוגיות
    </button>
  );
}
