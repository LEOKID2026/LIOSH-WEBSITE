import Layout from "../../../components/Layout";
import Link from "next/link";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import StudentThemePicker from "../../../components/student/StudentThemePicker";
import { SOLO_GAME_LIST } from "../../../lib/solo-games/solo-game-registry.js";

export default function SoloGamesHubPage() {
  const { tokens: T } = useStudentTheme();

  return (
    <Layout studentShell="home">
      <div
        className={`${T.pageWrap || "min-h-dvh bg-gray-950"} overflow-x-hidden px-4 py-6`}
        dir="rtl"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/student/home"
              className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5"
            >
              ← חזרה לעולם הילד
            </Link>
            <StudentThemePicker variant="icon" iconSize="nav" />
          </div>

          <header className="space-y-2 text-center">
            <p className="text-sm text-yellow-300/90">🎮 משחקי ליאו</p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">משחקים לילד יחיד</h1>
            <p className="text-sm text-gray-400 sm:text-base">
              שחקו, צברו ניקוד וקבלו מטבעות אמיתיים לעולם הילד!
            </p>
          </header>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SOLO_GAME_LIST.map((game) => (
              <Link
                key={game.id}
                href={game.route}
                className="flex min-h-[9rem] flex-col rounded-2xl border border-white/10 bg-white/5 p-4 text-right transition hover:border-yellow-400/40 hover:bg-white/[0.08]"
              >
                <div className="text-3xl" aria-hidden>
                  {game.emoji}
                </div>
                <h2 className="mt-2 text-lg font-extrabold text-white">{game.titleHe}</h2>
                <p className="mt-1 flex-1 text-sm text-gray-400">{game.blurbHe}</p>
                <span className="mt-3 text-sm font-bold text-yellow-300">שחק עכשיו ←</span>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}
