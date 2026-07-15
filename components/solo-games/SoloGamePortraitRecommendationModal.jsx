/**
 * @param {{
 *   show: boolean,
 *   onDismissRotate: () => void,
 *   onContinueAnyway: () => void,
 *   subtitle?: string,
 * }} props
 */
export default function SoloGamePortraitRecommendationModal({
  show,
  onDismissRotate,
  onContinueAnyway,
  subtitle = "המשחק יוצג בצורה נוחה יותר.",
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/88 p-4">
      <div className="max-w-sm rounded-2xl border-2 border-yellow-400 bg-slate-900 p-5 text-center shadow-xl">
        <p className="text-3xl">📱↔️</p>
        <p className="mt-3 text-base font-bold leading-snug text-yellow-100">
          כדי לשחק בנוחות, מומלץ לסובב את המסך לרוחב.
        </p>
        <p className="mt-2 text-sm text-white/75">{subtitle}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDismissRotate}
            className="min-h-[44px] rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
            style={{ touchAction: "manipulation" }}
          >
            הבנתי - אסובב
          </button>
          <button
            type="button"
            onClick={onContinueAnyway}
            className="min-h-[44px] rounded-xl border-2 border-white/35 bg-black/40 px-4 py-2 text-sm font-bold text-white"
            style={{ touchAction: "manipulation" }}
          >
            המשך בכל זאת
          </button>
        </div>
      </div>
    </div>
  );
}
