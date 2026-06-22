import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";

/**
 * Shown when a parent declines Terms + Privacy acceptance.
 * Only safe actions: review again or return to login/logout.
 *
 * @param {{
 *   onReviewAgain: () => void;
 *   onReturnToLogin: () => void;
 *   returnLabel?: string;
 *   message?: string;
 *   bright?: boolean;
 * }} props
 */
export default function PolicyAcceptanceDeclinedBlock({
  onReviewAgain,
  onReturnToLogin,
  returnLabel = "יציאה והחזרה למסך הכניסה",
  message = "לא ניתן להמשיך לאזור ההורים ללא אישור תנאי השימוש ומדיניות הפרטיות.",
  bright = false,
}) {
  const T = getParentPortalTheme(bright);

  return (
    <div
      dir="rtl"
      lang="he"
      className={`${T.gateBox} max-w-3xl mx-auto`}
      role="alert"
    >
      <h2 className={`text-lg font-bold ${bright ? "text-amber-800" : "text-amber-200"}`}>
        לא ניתן להמשיך ללא אישור
      </h2>
      <p className={T.gateText}>{message}</p>
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
        <button
          type="button"
          onClick={onReviewAgain}
          className={`rounded px-4 py-2.5 text-sm font-bold ${
            bright ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-amber-500 text-black"
          }`}
        >
          קראו שוב את המדיניות
        </button>
        <button type="button" onClick={onReturnToLogin} className={T.gateSecondary}>
          {returnLabel}
        </button>
      </div>
    </div>
  );
}
