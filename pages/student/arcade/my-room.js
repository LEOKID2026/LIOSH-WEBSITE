import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { useGamesHubUi } from "../../../hooks/useGamesHubUi.js";
import GameAccessGuard from "../../../components/games/GameAccessGuard.jsx";
import { isDemoMode } from "../../../lib/demo/demo-mode.client.js";
import { DEMO_MY_ROOM_FIXTURE } from "../../../components/demo/demo-display-fixtures.js";

export default function ArcadeMyRoomPage() {
  const demoMode = isDemoMode();
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const [room, setRoom] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/arcade/my-room");
    const json = await res.json().catch(() => ({}));
    if (json?.featureLocked) {
      setLocked(true);
      return;
    }
    if (json?.ok && json.room) {
      setRoom(json.room);
      setRoomName(json.room.roomName || "");
    }
  }, []);

  useEffect(() => {
    if (demoMode) return undefined;
    void load();
  }, [load, demoMode]);

  const save = async () => {
    if (demoMode) {
      setMessage("שמירה אינה זמינה במצב הדגמה.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/arcade/my-room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      const json = await res.json().catch(() => ({}));
      setMessage(json.ok ? "נשמר!" : json.message || json.error || "שגיאה");
      if (json.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout studentTheme={theme} studentShell="home">
      <GameAccessGuard category="online">
        <Head>
          <title>החדר שלי - מועדון ליאו</title>
        </Head>
        <div className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} max-w-3xl space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <Link href="/student/arcade" className={GH.backBtn}>
                ← חזרה למועדון
              </Link>
            </div>

            {demoMode ? (
              <div className={`${GH.card} space-y-4 p-4 text-right`}>
                <h1 className={GH.sectionTitle}>החדר שלי</h1>
                <p className={`text-sm ${GH.cardBlurb}`}>{DEMO_MY_ROOM_FIXTURE.messageHe}</p>
              </div>
            ) : locked ? (
              <div className={`${GH.card} p-4 text-right`}>
                <p className={GH.cardBlurb}>חדר אישי - נשלט דרך Admin. כרגע לא פתוח לאורחים.</p>
              </div>
            ) : (
              <div className={`${GH.card} space-y-4 p-4 text-right`}>
                <h1 className={GH.sectionTitle}>החדר שלי</h1>
                <p className={`text-sm ${GH.cardBlurb}`}>קישוטים, גביעים והזמנת חברים - מרחב אישי בלבד</p>

                <label className="block space-y-1">
                  <span className={`text-sm ${GH.entryLabel}`}>שם החדר</span>
                  <input className={GH.input} maxLength={40} value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </label>

                <div className={`rounded-lg border border-white/10 p-4 ${GH.roomItem}`}>
                  <p className={`font-semibold ${GH.cardTitle}`}>מדף גביעים</p>
                  <p className={`mt-1 text-xs ${GH.cardBlurb}`}>
                    {(room?.decorationSlots || []).length
                      ? `${room.decorationSlots.length} פריטים מוצגים`
                      : "אין גביעים עדיין - השלם משימות וטורנירים"}
                  </p>
                </div>

                <button type="button" disabled={busy} onClick={() => void save()} className={GH.btnJoinCode}>
                  שמור
                </button>
                {message ? <p className={`text-sm ${GH.userMessage}`}>{message}</p> : null}
              </div>
            )}
          </div>
        </div>
      </GameAccessGuard>
    </Layout>
  );
}
