import { useRouter } from "next/router";
import { useParentDemoMode } from "./ParentDemoModeContext.jsx";

export default function ParentDemoModeBar() {
  const router = useRouter();
  const { session, exitDemo } = useParentDemoMode();

  if (!session) return null;

  const handleExit = () => {
    exitDemo();
    router.push("/");
  };

  return (
    <div
      className="sticky top-0 z-50 border-b border-teal-200 bg-teal-50/95 px-3 py-2 text-sm backdrop-blur dark:border-teal-800 dark:bg-teal-950/90"
      dir="rtl"
      lang="he"
      data-testid="parent-demo-mode-bar"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-teal-200 px-2.5 py-0.5 text-xs font-bold text-teal-950 dark:bg-teal-800 dark:text-teal-50">
            מצב הדגמה - פורטל הורים
          </span>
          <span className="text-teal-900 dark:text-teal-100">צפייה בלבד · 3 ילדים לדוגמה</span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
          data-testid="parent-demo-exit-button"
        >
          יציאה מהדגמה
        </button>
      </div>
    </div>
  );
}
