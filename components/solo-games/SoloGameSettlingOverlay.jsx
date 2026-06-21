/**
 * @param {{ open?: boolean }} props
 */
export default function SoloGameSettlingOverlay({ open = false }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black/75 px-6 text-center"
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      <p className="text-lg font-bold text-white">מחשבים תוצאה…</p>
      <p className="mt-2 text-sm text-gray-300">רגע קטן, שומרים את המטבעות שלך</p>
    </div>
  );
}
