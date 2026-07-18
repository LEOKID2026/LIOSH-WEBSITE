import Link from "next/link";
import { PLAY_LIMIT_MS } from "../../lib/demo/demo-mode.client.js";

/** @param {{ onClose: () => void }} props */
export default function DemoTimeExpiredModal({ onClose }) {
  const limitMinutes = PLAY_LIMIT_MS / 60000;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-time-expired-title"
      dir="rtl"
      lang="he"
      data-testid="demo-time-expired-modal"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-right shadow-xl dark:bg-slate-900">
        <h2 id="demo-time-expired-title" className="text-lg font-bold text-slate-900 dark:text-white">
          זמן ההדגמה הסתיים
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          עברו {limitMinutes} דקות מרגע תחילת ההדגמה. ניתן להמשיך לסייר בעולם הילד, אך לא ניתן להתחיל משחק
          או פעילות חדשה.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          משחק או פעילות שכבר התחילו — ימשיכו עד סיום.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            הבנתי
          </button>
          <Link
            href="/demo/enter"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            התחלת הדגמה חדשה
          </Link>
        </div>
      </div>
    </div>
  );
}
