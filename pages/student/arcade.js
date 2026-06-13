import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import StudentThemePicker from "../../components/student/StudentThemePicker";

const ENTRY_OPTIONS = [
  { label: "10", value: 10 },
  { label: "100", value: 100 },
  { label: "1K", value: 1000 },
  { label: "10K", value: 10000 },
];

const SHOW_ARCADE_DEBUG =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ARCADE_DEBUG === "true";

const POLL_MS = 5000;

/** חדרים ציבוריים לריענון רשימה */
const OPEN_ROOM_POLL_KEYS = [
  "fourline",
  "ludo",
  "snakes-and-ladders",
  "checkers",
  "chess",
  "dominoes",
  "bingo",
];

const MORE_ARCADE_LOBBY_ROWS = [
  {
    gameKey: "snakes-and-ladders",
    title: "נחשים וסולמות",
    blurb: "לוח 1–100 · סולמות ונחשים",
    playersLine: "שחקנים: 2–4",
  },
  {
    gameKey: "checkers",
    title: "דמקה",
    blurb: "דמקה קלאסית · אכילות חובה כשקיימות",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "chess",
    title: "שחמט",
    blurb: "מצב חדר פעיל — משחק מלא יגיע בהמשך",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "dominoes",
    title: "דומינו",
    blurb: "דומינו חסימה · זוג 6 · סיום ביציאה או חסימה",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "bingo",
    title: "בינגו",
    blurb: "מצב חדר פעיל — משחק מלא יגיע בהמשך",
    playersLine: "שחקנים: עד 8",
  },
];

function playHrefForArcadeRoom(gameKey, roomId) {
  const q = encodeURIComponent(roomId);
  const routes = {
    fourline: `/student/games/fourline?roomId=${q}`,
    ludo: `/student/games/ludo?roomId=${q}`,
    "snakes-and-ladders": `/student/games/snakes-and-ladders?roomId=${q}`,
    checkers: `/student/games/checkers?roomId=${q}`,
    chess: `/student/games/chess?roomId=${q}`,
    dominoes: `/student/games/dominoes?roomId=${q}`,
    bingo: `/student/games/bingo?roomId=${q}`,
  };
  return routes[gameKey] || `/student/games/fourline?roomId=${q}`;
}

async function readJson(res) {
  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok, payload, status: res.status };
}

function apiMessage(result) {
  const { payload, status } = result;
  if (payload?.ok === true) {
    if (payload.alreadyQueued === true) return "כבר רשומים בתור (לא חויב מחדש)";
    return "בוצע בהצלחה";
  }
  const msg = typeof payload?.error === "string" ? payload.error : "";
  if (status === 402 || payload?.code === "insufficient_funds") {
    return msg || "אין מספיק מטבעות לפעולה זו";
  }
  return msg || "פעולה נכשלה";
}

function quickMatchMessage(payload) {
  if (!payload || payload.ok !== true) return apiMessage({ payload, status: 200 });
  const m = payload.mode;
  if (m === "already_in_room") return "כבר נמצא בחדר — אפשר ללחוץ על כניסה למשחק";
  if (m === "joined") return "הצטרפת לשחקן שמחכה בחדר";
  if (m === "created") return "נוצר חדר משחק מהיר — מחכה לשחקן נוסף";
  return "מוכן";
}

function roomTypeLabel(rt) {
  if (rt === "quick") return "משחק מהיר";
  if (rt === "public") return "ציבורי";
  return rt || "—";
}

function EntryCostSelector({ entryCost, setEntryCost, costDisabledReason, busy, className = "mt-3" }) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[11px] font-semibold text-white/60">עלות כניסה</span>
      <div className="flex flex-wrap gap-1.5">
        {ENTRY_OPTIONS.map((opt) => {
          const needMsg = costDisabledReason(opt.value);
          const selected = entryCost === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={busy || Boolean(needMsg)}
              title={needMsg || undefined}
              onClick={() => setEntryCost(opt.value)}
              className={`min-w-[2.6rem] rounded-md border px-2 py-1.5 text-xs font-bold transition ${
                selected
                  ? "border-amber-400/80 bg-amber-500/25 text-amber-100 shadow-inner"
                  : needMsg
                    ? "cursor-not-allowed border-white/10 bg-black/20 text-white/30 line-through"
                    : "border-white/15 bg-black/25 text-white/90 hover:border-amber-400/50 hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.blurb
 * @param {string[]} props.bullets
 * @param {string} props.gameKey
 * @param {boolean} props.active
 * @param {string | null} props.idleReason
 * @param {number} props.entryCost
 * @param {(n: number) => void} props.setEntryCost
 * @param {(cost: number) => string | null} props.costDisabledReason
 * @param {boolean} props.busy
 * @param {() => void} props.onQuickGame
 * @param {(roomType: string, gk?: string) => void} props.onCreateRoom
 * @param {string} props.cardShell
 * @param {string} props.cardTitle
 * @param {string} props.cardBlurb
 * @param {string} props.cardCta
 * @param {string} props.badgeActive
 * @param {string} props.badgeInactive
 */
function ArcadeGameCard({
  title,
  blurb,
  bullets,
  gameKey,
  active,
  idleReason,
  entryCost,
  setEntryCost,
  costDisabledReason,
  busy,
  onQuickGame,
  onCreateRoom,
  cardShell,
  cardTitle,
  cardBlurb,
  cardCta,
  badgeActive,
  badgeInactive,
}) {
  const quickLabel =
    gameKey === "fourline" ? "משחק מהיר" : gameKey === "ludo" ? "משחק מהיר (לודו)" : `משחק מהיר (${title})`;

  return (
    <div className={cardShell}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2">
        <h2 className={cardTitle}>{title}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:text-xs ${
            active ? badgeActive : badgeInactive
          }`}
        >
          {active ? "פעיל" : "לא זמין"}
        </span>
      </div>
      <p className={`mt-2 text-xs leading-snug sm:text-sm ${cardBlurb}`}>{blurb}</p>
      <ul className="mt-2 space-y-0.5 text-[11px] text-white/65 sm:text-xs">
        {bullets.map((line) => (
          <li key={line} className="flex gap-1.5">
            <span className="text-amber-400/80">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {idleReason && !active ? (
        <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-1.5 text-[11px] text-amber-100/95">
          {idleReason}
        </p>
      ) : null}

      <EntryCostSelector
        entryCost={entryCost}
        setEntryCost={setEntryCost}
        costDisabledReason={costDisabledReason}
        busy={busy}
        className="mt-3"
      />

      <div className="mt-auto flex flex-col gap-2 pt-3">
        <button
          type="button"
          disabled={busy || !active || Boolean(costDisabledReason(entryCost))}
          title={costDisabledReason(entryCost) || (!active ? idleReason || undefined : undefined)}
          onClick={onQuickGame}
          className={`w-full ${cardCta} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {quickLabel}
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={busy || !active || Boolean(costDisabledReason(entryCost))}
            onClick={() => onCreateRoom("public", gameKey)}
            className="rounded-lg bg-white/10 px-2 py-2 text-center text-[11px] font-bold text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs"
          >
            צור חדר ציבורי
          </button>
          <button
            type="button"
            disabled={busy || !active || Boolean(costDisabledReason(entryCost))}
            onClick={() => onCreateRoom("private", gameKey)}
            className="rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-center text-[11px] font-bold text-white/95 transition hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs"
          >
            צור חדר פרטי
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentArcadePage() {
  const { GH, isBright } = useGamesHubUi();
  const [studentName, setStudentName] = useState("");
  const [balance, setBalance] = useState(null);
  const [games, setGames] = useState([]);
  const [entryCost, setEntryCost] = useState(10);
  const [userMessage, setUserMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [debugPayload, setDebugPayload] = useState("");
  const [joinRoomIdDebug, setJoinRoomIdDebug] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [openRooms, setOpenRooms] = useState([]);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  /** @type {{ kind: string; room: Record<string, unknown> } | null} */
  const [roomHighlight, setRoomHighlight] = useState(null);

  const refresh = useCallback(async () => {
    const [meRes, balRes, gamesRes] = await Promise.all([
      fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/arcade/balance"),
      fetch("/api/arcade/games"),
    ]);
    const meJson = await meRes.json().catch(() => ({}));
    const balJson = await balRes.json().catch(() => ({}));
    const gamesJson = await gamesRes.json().catch(() => ({}));
    if (meJson?.student?.full_name) {
      setStudentName(meJson.student.full_name);
    }
    if (balJson?.ok) setBalance(balJson.balance);
    if (gamesJson?.ok && Array.isArray(gamesJson.games)) {
      setGames(gamesJson.games);
    }
  }, []);

  const refreshOpenRooms = useCallback(async () => {
    const results = await Promise.all(
      OPEN_ROOM_POLL_KEYS.map((gk) => fetch(`/api/arcade/rooms/open?gameKey=${encodeURIComponent(gk)}`)),
    );
    const merged = [];
    for (const r of results) {
      const j = await r.json().catch(() => ({}));
      if (j?.ok && Array.isArray(j.rooms)) merged.push(...j.rooms);
    }
    setOpenRooms(merged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) setInitialSyncDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const fourlineMeta = useMemo(() => games.find((g) => g.gameKey === "fourline") || null, [games]);

  const fourlineActive = Boolean(fourlineMeta?.enabled === true && fourlineMeta?.foundationOnly === false);

  const idleReason = !fourlineMeta
    ? "טוען משחקים…"
    : !fourlineMeta.enabled
      ? "המשחק כבוי בשרת"
      : fourlineMeta.foundationOnly
        ? "עדיין לא פעיל (ממתין להפעלה)"
        : null;

  const ludoMeta = useMemo(() => games.find((g) => g.gameKey === "ludo") || null, [games]);

  const ludoActive = Boolean(ludoMeta?.enabled === true && ludoMeta?.foundationOnly === false);

  const idleReasonLudo = !ludoMeta
    ? "טוען משחקים…"
    : !ludoMeta.enabled
      ? "המשחק כבוי בשרת"
      : ludoMeta.foundationOnly
        ? "עדיין לא פעיל (ממתין להפעלה)"
        : null;

  const anyLobbyGameActive = useMemo(() => {
    return OPEN_ROOM_POLL_KEYS.some((k) => {
      const m = games.find((g) => g.gameKey === k);
      return Boolean(m?.enabled === true && m?.foundationOnly === false);
    });
  }, [games]);

  const moreArcadeLobbyVm = useMemo(() => {
    return MORE_ARCADE_LOBBY_ROWS.map((row) => {
      const meta = games.find((g) => g.gameKey === row.gameKey) || null;
      const active = Boolean(meta?.enabled === true && meta?.foundationOnly === false);
      const idleReasonRow = !meta
        ? "טוען משחקים…"
        : !meta.enabled
          ? "המשחק כבוי בשרת"
          : meta.foundationOnly
            ? "עדיין לא פעיל (ממתין להפעלה)"
            : null;
      return { ...row, active, idleReason: idleReasonRow };
    });
  }, [games]);

  const openRoomsPollActive = anyLobbyGameActive;

  useEffect(() => {
    if (!openRoomsPollActive) return undefined;
    refreshOpenRooms();
    const id = setInterval(() => {
      void refreshOpenRooms();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [openRoomsPollActive, refreshOpenRooms]);

  const run = async (promise) => {
    setBusy(true);
    setUserMessage("");
    setDebugPayload("");
    try {
      const result = await promise;
      setUserMessage(apiMessage(result));
      if (SHOW_ARCADE_DEBUG) {
        setDebugPayload(JSON.stringify(result.payload ?? {}, null, 2));
      }
      await refresh();
      await refreshOpenRooms();
      return result;
    } finally {
      setBusy(false);
    }
  };

  const runQuick = async (promise) => {
    setBusy(true);
    setUserMessage("");
    setDebugPayload("");
    try {
      const result = await promise;
      if (result.payload?.ok) {
        setUserMessage(quickMatchMessage(result.payload));
      } else {
        setUserMessage(apiMessage(result));
      }
      if (SHOW_ARCADE_DEBUG) {
        setDebugPayload(JSON.stringify(result.payload ?? {}, null, 2));
      }
      await refresh();
      await refreshOpenRooms();
      if (result.payload?.ok && result.payload?.room) {
        setRoomHighlight({ kind: "quick", room: result.payload.room });
      }
      return result;
    } finally {
      setBusy(false);
    }
  };

  const onQuickGame = (gameKey = "fourline") =>
    runQuick(
      (async () => {
        const res = await fetch("/api/arcade/quick-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameKey,
            entryCost,
          }),
        });
        return readJson(res);
      })(),
    );

  const onCreateRoom = (roomType, gameKey = "fourline") =>
    run(
      (async () => {
        const res = await fetch("/api/arcade/rooms/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameKey,
            roomType,
            entryCost,
          }),
        });
        const result = await readJson(res);
        if (result.payload?.ok && result.payload?.room) {
          setRoomHighlight({ kind: "created", room: result.payload.room });
        }
        return result;
      })(),
    );

  const onJoinPublicRoom = (roomId) =>
    run(
      (async () => {
        const res = await fetch("/api/arcade/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        const result = await readJson(res);
        if (result.payload?.ok && result.payload?.room) {
          setRoomHighlight({ kind: "joined", room: result.payload.room });
        }
        return result;
      })(),
    );

  const onJoinByCodeSubmit = () =>
    run(
      (async () => {
        const code = String(joinCode || "").trim();
        if (!code) {
          setUserMessage("הזן קוד חדר");
          return { ok: false, payload: {}, status: 400 };
        }
        const res = await fetch("/api/arcade/rooms/join-by-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ joinCode: code }),
        });
        const result = await readJson(res);
        if (result.payload?.ok && result.payload?.room) {
          setRoomHighlight({ kind: "joined", room: result.payload.room });
          setJoinCode("");
        }
        return result;
      })(),
    );

  const onJoinByRoomIdDebug = () =>
    run(
      (async () => {
        const rid = String(joinRoomIdDebug || "").trim();
        if (!rid) {
          setUserMessage("הזן מזהה חדר (מצב פיתוח)");
          return { ok: false, payload: {}, status: 400 };
        }
        const res = await fetch("/api/arcade/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: rid }),
        });
        const result = await readJson(res);
        if (result.payload?.ok && result.payload?.room) {
          setRoomHighlight({ kind: "joined", room: result.payload.room });
          setJoinRoomIdDebug("");
        }
        return result;
      })(),
    );

  const balanceNum = balance !== null && balance !== undefined ? Number(balance) : null;
  const costDisabledReason = (cost) => {
    if (balanceNum === null || Number.isNaN(balanceNum)) return null;
    if (balanceNum < cost) return "אין מספיק מטבעות";
    return null;
  };

  const balanceDisplay =
    balance === null || balance === undefined
      ? initialSyncDone
        ? "לא זמין"
        : "טוען…"
      : String(balance);

  const hlRoom = roomHighlight?.room;
  const hlRoomId = hlRoom?.id != null ? String(hlRoom.id) : "";
  const hlStatus = hlRoom?.status != null ? String(hlRoom.status) : "—";
  const hlEntry = hlRoom?.entry_cost != null ? String(hlRoom.entry_cost) : "—";
  const hlRoomType = hlRoom?.room_type != null ? String(hlRoom.room_type) : "";
  const hlJoinCode =
    hlRoom?.join_code != null && String(hlRoom.join_code).trim() !== ""
      ? String(hlRoom.join_code)
      : null;
  const hlPrivate = hlRoomType === "private";

  const hlGameKey = hlRoom?.game_key != null ? String(hlRoom.game_key) : "fourline";
  const hlPlayHref = playHrefForArcadeRoom(hlGameKey, hlRoomId);

  const waitingCopy =
    hlStatus === "waiting" ? "ממתין לשחקן נוסף" : hlStatus === "active" ? "המשחק פעיל" : hlStatus;

  const badgeActive = isBright
    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
    : "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/40";
  const badgeInactive = isBright
    ? "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
    : "bg-white/10 text-white/50";
  const arcadeCardProps = {
    cardShell: GH.card,
    cardTitle: GH.cardTitle,
    cardBlurb: GH.cardBlurb,
    cardCta: GH.cardCta,
    badgeActive,
    badgeInactive,
  };

  return (
    <Layout>
      <Head>
        <title>משחקים — LEO K</title>
      </Head>
      <div className={`min-h-[calc(100vh-56px)] ${GH.pageWrap}`} dir="rtl">
        <div className={`${GH.container} max-w-7xl`}>
          <header className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1.5 text-right">
              <h1 className={GH.hubTitle}>משחקים</h1>
              <p className={`text-xs sm:text-sm ${GH.hubSub}`}>בחר משחק, עלות כניסה והצטרף לחדר</p>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-sm">
                <span className={`font-medium ${isBright ? "text-slate-800" : "text-white/95"}`}>
                  {studentName || "—"}
                </span>
                <span className={isBright ? "text-slate-300" : "text-white/25"}>·</span>
                <span
                  className={
                    isBright
                      ? "rounded-md bg-amber-50 px-2 py-0.5 font-mono text-sm text-amber-800 ring-1 ring-amber-200"
                      : "rounded-md bg-black/30 px-2 py-0.5 font-mono text-sm text-amber-200 ring-1 ring-white/10"
                  }
                >
                  {balanceDisplay}
                  <span className={`mr-1.5 text-[11px] font-sans ${isBright ? "text-amber-700/70" : "text-white/45"}`}>
                    מטבעות
                  </span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <StudentThemePicker variant="icon" iconSize="nav" />
                <Link href="/student/home" className={GH.backBtn}>
                  חזרה ללמידה
                </Link>
              </div>
            </div>
          </header>

          {!initialSyncDone ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-xl border border-white/5 bg-white/[0.04] sm:h-52"
                  aria-hidden
                />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 xl:gap-4">
                <ArcadeGameCard
                  {...arcadeCardProps}
                  title="Fourline"
                  blurb="ארבע בשורה · שניים נגד שניים"
                  bullets={["שחקנים: 2", "בחר עלות כניסה לפני משחק מהיר או יצירת חדר"]}
                  gameKey="fourline"
                  active={fourlineActive}
                  idleReason={idleReason}
                  entryCost={entryCost}
                  setEntryCost={setEntryCost}
                  costDisabledReason={costDisabledReason}
                  busy={busy}
                  onQuickGame={() => void onQuickGame()}
                  onCreateRoom={(rt, gk) => void onCreateRoom(rt, gk)}
                />
                <ArcadeGameCard
                  {...arcadeCardProps}
                  title="Ludo"
                  blurb="לודו · 2–4 שחקנים"
                  bullets={["שחקנים: עד 4", "בחר עלות כניסה לפני משחק מהיר או יצירת חדר"]}
                  gameKey="ludo"
                  active={ludoActive}
                  idleReason={idleReasonLudo}
                  entryCost={entryCost}
                  setEntryCost={setEntryCost}
                  costDisabledReason={costDisabledReason}
                  busy={busy}
                  onQuickGame={() => void onQuickGame("ludo")}
                  onCreateRoom={(rt, gk) => void onCreateRoom(rt, gk)}
                />
                {moreArcadeLobbyVm.map((row) => (
                  <ArcadeGameCard
                    {...arcadeCardProps}
                    key={row.gameKey}
                    title={row.title}
                    blurb={row.blurb}
                    bullets={[row.playersLine, "בחר עלות כניסה לפני משחק מהיר או יצירת חדר"]}
                    gameKey={row.gameKey}
                    active={row.active}
                    idleReason={row.idleReason}
                    entryCost={entryCost}
                    setEntryCost={setEntryCost}
                    costDisabledReason={costDisabledReason}
                    busy={busy}
                    onQuickGame={() => void onQuickGame(row.gameKey)}
                    onCreateRoom={(rt, gk) => void onCreateRoom(rt, gk)}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-3 lg:mt-6 lg:grid-cols-3 lg:gap-4">
                <div className={`${GH.card} lg:col-span-2`}>
                  <h3 className={GH.sectionTitle}>חדרים פתוחים</h3>
                  <p className={`mt-1 text-[11px] sm:text-xs ${GH.cardBlurb}`}>חדרים ציבוריים ומשחק מהיר שמחכים לשחקן</p>
                  {!openRoomsPollActive ? (
                    <p className="mt-3 text-xs text-white/45">אין רשימה — המשחק לא פעיל</p>
                  ) : openRooms.length === 0 ? (
                    <p className="mt-3 text-xs text-white/55">אין חדרים פתוחים כרגע</p>
                  ) : (
                    <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-0.5 sm:max-h-72">
                      {openRooms.map((row) => {
                        const full = row.playerCount >= row.maxPlayers;
                        const costLabel =
                          ENTRY_OPTIONS.find((o) => o.value === row.entryCost)?.label ||
                          String(row.entryCost);
                        return (
                          <li
                            key={row.roomId}
                            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/25 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-2"
                          >
                            <div className="min-w-0 text-right text-[11px] text-white/80 sm:text-xs">
                              <p className="font-semibold text-white">{row.gameTitle || "Fourline"}</p>
                              <p className="text-white/55">
                                עלות {costLabel} · {row.playerCount}/{row.maxPlayers} שחקנים ·{" "}
                                {roomTypeLabel(row.roomType)} · ממתין
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={busy || full || Boolean(costDisabledReason(row.entryCost))}
                              title={full ? "החדר מלא" : costDisabledReason(row.entryCost) || undefined}
                              onClick={() => void onJoinPublicRoom(row.roomId)}
                              className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs"
                            >
                              הצטרף
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className={GH.card}>
                  <h3 className={GH.sectionTitle}>חדר פרטי — הצטרפות בקוד</h3>
                  <p className={`mt-1 text-[11px] sm:text-xs ${GH.cardBlurb}`}>הזן את הקוד שקיבלת מחבר</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="קוד החדר"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 text-sm text-white placeholder:text-white/35"
                    />
                    <button
                      type="button"
                      disabled={busy || !openRoomsPollActive}
                      onClick={() => void onJoinByCodeSubmit()}
                      className="rounded-lg bg-white/12 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/18 disabled:opacity-45"
                    >
                      הצטרף לפי קוד
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {roomHighlight && hlRoomId ? (
            <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-950/35 p-4 shadow-lg ring-1 ring-emerald-500/20 sm:p-5">
              <h3 className="text-lg font-bold text-emerald-100">חדר מוכן</h3>
              <p className="mt-1 text-xs font-medium text-emerald-200/90 sm:text-sm">{waitingCopy}</p>
              <dl className="mt-3 space-y-2 text-xs text-emerald-100/90 sm:text-sm">
                <div className="flex justify-between gap-2 border-b border-emerald-500/25 pb-2">
                  <dt className="font-semibold">עלות כניסה</dt>
                  <dd className="font-mono">{hlEntry}</dd>
                </div>
                {hlPrivate && hlJoinCode ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-black/30 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">קוד חדר</p>
                    <p className="mt-1 font-mono text-xl font-bold tracking-[0.15em] text-emerald-50 sm:text-2xl">
                      {hlJoinCode}
                    </p>
                    <p className="mt-1.5 text-[11px] text-emerald-200/85">שלח את הקוד לחבר כדי שיצטרף</p>
                  </div>
                ) : null}
              </dl>
              <Link
                href={hlPlayHref}
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2.5 text-center text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 sm:text-base"
              >
                כניסה למשחק
              </Link>
              {SHOW_ARCADE_DEBUG ? (
                <p className="mt-2 break-all font-mono text-[10px] text-emerald-300/70">{hlRoomId}</p>
              ) : null}
            </div>
          ) : null}

          {SHOW_ARCADE_DEBUG ? (
            <div className={`${GH.card} mt-4`}>
              <h3 className="text-xs font-semibold text-white/90">מצב פיתוח — הצטרפות לפי roomId</h3>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="UUID"
                  value={joinRoomIdDebug}
                  onChange={(e) => setJoinRoomIdDebug(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 font-mono text-xs text-white"
                />
                <button
                  type="button"
                  disabled={busy || !openRoomsPollActive}
                  onClick={() => void onJoinByRoomIdDebug()}
                  className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white"
                >
                  הצטרף (debug)
                </button>
              </div>
            </div>
          ) : null}

          {userMessage ? (
            <p className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-100 sm:text-sm">
              {userMessage}
            </p>
          ) : null}

          {SHOW_ARCADE_DEBUG && debugPayload ? (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/40 p-2.5 font-mono text-[10px] text-white/70">
              {debugPayload}
            </pre>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
