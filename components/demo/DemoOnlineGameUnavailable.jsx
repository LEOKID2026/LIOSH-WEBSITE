import Link from "next/link";
import Layout from "../Layout";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

export default function DemoOnlineGameUnavailable() {
  const { theme } = useStudentTheme();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <div
        className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center"
        dir="rtl"
        lang="he"
        data-testid="demo-online-game-unavailable"
      >
        <p className="text-4xl" aria-hidden="true">
          🎮
        </p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          משחק אונליין אינו זמין במצב הדגמה
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          במצב הדגמה ניתן לסייר בארקייד ולראות את המשחקים, אך משחקי אונליין אינם פעילים.
        </p>
        <Link
          href="/student/arcade"
          className="mt-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          חזרה לארקייד
        </Link>
      </div>
    </Layout>
  );
}
