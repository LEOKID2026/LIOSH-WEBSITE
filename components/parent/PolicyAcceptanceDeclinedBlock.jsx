/**
 * Shown when a parent declines Terms + Privacy acceptance.
 * Only safe actions: review again or return to login/logout.
 *
 * @param {{
 *   onReviewAgain: () => void;
 *   onReturnToLogin: () => void;
 *   returnLabel?: string;
 *   message?: string;
 * }} props
 */
export default function PolicyAcceptanceDeclinedBlock({
  onReviewAgain,
  onReturnToLogin,
  returnLabel = "יציאה והחזרה למסך הכניסה",
  message = "לא ניתן להמשיך לאזור ההורים ללא אישור תנאי השימוש ומדיניות הפרטיות.",
}) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="rounded-xl border border-amber-400/35 bg-black/50 p-5 sm:p-6 space-y-4 text-right max-w-3xl mx-auto"
      role="alert"
    >
      <h2 className="text-lg font-bold text-amber-200">לא ניתן להמשיך ללא אישור</h2>
      <p className="text-sm sm:text-base text-white/85 leading-relaxed">{message}</p>
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
        <button
          type="button"
          onClick={onReviewAgain}
          className="rounded bg-amber-500 text-black px-4 py-2.5 text-sm font-bold"
        >
          קראו שוב את המדיניות
        </button>
        <button
          type="button"
          onClick={onReturnToLogin}
          className="rounded border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          {returnLabel}
        </button>
      </div>
    </div>
  );
}
