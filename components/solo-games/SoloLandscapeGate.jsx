/**
 * @param {{ show: boolean }} props
 */
export default function SoloLandscapeGate({ show }) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-gray-950/95 px-6 text-center text-white"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="סובבו את המכשיר"
    >
      <div className="mb-6 text-6xl animate-pulse" aria-hidden>
        📱↻
      </div>
      <h2 className="mb-3 text-2xl font-extrabold text-yellow-300 sm:text-3xl">
        סובבו את המכשיר לרוחב כדי לשחק
      </h2>
      <p className="max-w-sm text-base text-gray-300 sm:text-lg">
        המשחק הזה עובד הכי טוב במצב רוחב. סובבו את הטלפון או הטאבלט ואז תוכלו להמשיך.
      </p>
    </div>
  );
}
