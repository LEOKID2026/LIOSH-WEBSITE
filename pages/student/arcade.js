import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import GameAccessGuard from "../../components/games/GameAccessGuard.jsx";
import GamesHubNavBar from "../../components/games/GamesHubNavBar.jsx";
import GamesHubLockFooter from "../../components/games/GamesHubLockFooter.jsx";
import ArcadeLobbyHeader from "../../components/arcade/club/ArcadeLobbyHeader.jsx";
import ArcadeTabNav from "../../components/arcade/club/ArcadeTabNav.jsx";
import ArcadeGuestUpgradeBanner from "../../components/arcade/club/ArcadeGuestUpgradeBanner.jsx";
import ArcadeInviteBanner from "../../components/arcade/club/ArcadeInviteBanner.jsx";
import ArcadeClubFriendsPanel from "../../components/arcade/club/ArcadeClubFriendsPanel.jsx";
import ArcadeClubProfilePanel from "../../components/arcade/club/ArcadeClubProfilePanel.jsx";
import ArcadeClubShopPanel from "../../components/arcade/club/ArcadeClubShopPanel.jsx";
import ArcadeClubMissionsPanel from "../../components/arcade/club/ArcadeClubMissionsPanel.jsx";
import ArcadeClubEventsPanel from "../../components/arcade/club/ArcadeClubEventsPanel.jsx";
import { useArcadeClubPresence, useArcadeClubInvites } from "../../hooks/arcade/useArcadeClubPresence.js";
import { GUEST_GAME_LOCK_LABEL_HE } from "../../lib/guest/constants.js";
import { mapEntryCostOptionsForUi } from "../../lib/learning-client/economyConfigClient.js";
import { studentAvatarFromHomeSummary } from "../../lib/learning-client/studentHomeAvatarFromSummary.js";
import { clearArcadeActiveRoom } from "../../lib/arcade/client/arcadeRoomLifecycle.client.js";
import {
  arcadeGameTileTheme,
  ARCADE_TILE_BADGE_ACTIVE,
  ARCADE_TILE_BADGE_INACTIVE,
} from "../../components/arcade/club/arcadeGameTileThemes.js";
import { displayArcadeGameTitle } from "../../components/arcade/club/arcadeGameTitles.he.js";

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

const LOBBY_GAME_ROWS = [
  {
    gameKey: "fourline",
    title: "ארבע בשורה",
    blurb: "ארבע בשורה · שניים נגד שניים",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "ludo",
    title: "לודו",
    blurb: "לודו · משחק משפחתי",
    playersLine: "שחקנים: 2–4",
  },
  {
    gameKey: "snakes-and-ladders",
    title: "נחשים וסולמות",
    blurb: "לוח 1–100 · סולמות ונחשים",
    playersLine: "שחקנים: 2–4",
  },
  {
    gameKey: "checkers",
    title: "דמקה",
    blurb: "דמקה קלאסית · אכילות חובה",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "chess",
    title: "שחמט",
    blurb: "שחמט קלאסי · מלך, מט, ושח-מט",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "dominoes",
    title: "דומינו",
    blurb: "דומינו חסימה · סיום ביציאה",
    playersLine: "שחקנים: 2",
  },
  {
    gameKey: "bingo",
    title: "בינגו",
    blurb: "בינגו · קו מלא מנצח",
    playersLine: "שחקנים: עד 8",
  },
];

const ARCADE_GAME_GRID_CLASS =
  "grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2.5 xl:grid-cols-5";

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
  if (m === "already_in_room") return "כבר נמצא בחדר - אפשר ללחוץ על כניסה למשחק";
  if (m === "joined") return "הצטרפת לשחקן שמחכה בחדר";
  if (m === "created") return "נוצר חדר משחק מהיר - מחכה לשחקן נוסף";
  return "מוכן";
}

function roomTypeLabel(rt) {
  if (rt === "quick") return "משחק מהיר";
  if (rt === "public") return "ציבורי";
  return rt || "-";
}

function EntryCostSelector({
  entryOptions,
  entryCost,
  setEntryCost,
  costDisabledReason,
  busy,
  className = "mt-1.5",
  entryLabel,
  entryBtnSelected,
  entryBtnDefault,
  entryBtnDisabled,
  label = "עלות כניסה",
}) {
  return (
    <div className={className}>
      <span className={`mb-1.5 block ${entryLabel}`}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {(entryOptions || []).map((opt) => {
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
                selected ? entryBtnSelected : needMsg ? entryBtnDisabled : entryBtnDefault
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
 */
function ArcadeGameActionPanel({
  selectedTitle,
  entryCostLabel,
  canAct,
  costBlocked,
  costBlockedMessage,
  busy,
  onQuickGame,
  onCreatePublic,
  onCreatePrivate,
  cardCta,
  btnSecondary,
  btnSecondaryOutline,
  actionDivider,
  actionTitle,
  actionMeta,
}) {
  return (
    <div className={actionDivider}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="text-right">
          <p className={actionTitle}>
            משחק נבחר: <span className="font-bold">{selectedTitle || "-"}</span>
          </p>
          <p className={`mt-0.5 ${actionMeta}`}>סכום כניסה: {entryCostLabel} מטבעות</p>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy || !canAct || costBlocked}
          title={costBlocked ? costBlockedMessage : !canAct ? "בחרו משחק פעיל" : undefined}
          onClick={onQuickGame}
          className={`w-full sm:flex-1 ${cardCta} py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45`}
        >
          משחק מהיר
        </button>
        <button
          type="button"
          disabled={busy || !canAct || costBlocked}
          onClick={onCreatePublic}
          className={`w-full sm:w-auto sm:min-w-[7.5rem] ${btnSecondary} py-2 text-xs`}
        >
          צור חדר ציבורי
        </button>
        <button
          type="button"
          disabled={busy || !canAct || costBlocked}
          onClick={onCreatePrivate}
          className={`w-full sm:w-auto sm:min-w-[7.5rem] ${btnSecondaryOutline} py-2 text-xs`}
        >
          צור חדר פרטי
        </button>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 */
function ArcadeGameCard({
  title,
  blurb,
  playersLine,
  gameKey,
  active,
  idleReason,
  guestLocked = false,
  selected = false,
  openRoomCount = 0,
  onSelect,
  cardCta,
  idleBox,
}) {
  const selectable = active && !guestLocked;
  const tile = arcadeGameTileTheme(gameKey);

  const handleSelect = () => {
    if (selectable) onSelect(gameKey);
  };

  const statusLabel = guestLocked
    ? GUEST_GAME_LOCK_LABEL_HE
    : active
      ? "פעיל"
      : "לא זמין";

  const shellClasses = selected
    ? tile.selected
    : `${tile.bg} ${tile.border}`;

  return (
    <div
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? handleSelect : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect();
              }
            }
          : undefined
      }
      className={`relative flex h-[132px] min-w-0 flex-col overflow-hidden rounded-lg border p-2 shadow-sm ${shellClasses} ${
        selectable ? "cursor-pointer transition hover:shadow-md" : ""
      } text-right`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${tile.bar}`} aria-hidden="true" />

      <div className="min-w-0 shrink-0 overflow-hidden">
        <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden">
          <h2
            className={`min-w-0 flex-1 truncate whitespace-nowrap text-sm font-extrabold leading-tight sm:text-base ${tile.title}`}
            title={title}
          >
            {title}
          </h2>
          <span
            className={`shrink-0 rounded px-1.5 py-px text-[9px] font-bold leading-none ${
              guestLocked || !active ? ARCADE_TILE_BADGE_INACTIVE : ARCADE_TILE_BADGE_ACTIVE
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-1.5 min-h-0 flex-1 overflow-hidden">
        {blurb ? (
          <p className={`line-clamp-2 text-[11px] leading-snug ${tile.blurb}`} title={blurb}>
            {blurb}
          </p>
        ) : null}
        {playersLine ? (
          <p className={`mt-0.5 truncate text-xs leading-tight ${tile.meta}`} title={playersLine}>
            {playersLine}
          </p>
        ) : null}
        {openRoomCount > 0 ? (
          <p className={`truncate text-xs leading-tight ${tile.meta}`}>חדרים פתוחים: {openRoomCount}</p>
        ) : null}
        {idleReason && !active ? (
          <p
            className={`mt-0.5 line-clamp-1 rounded border px-1 py-px text-[9px] leading-tight ${idleBox}`}
            title={idleReason}
          >
            {idleReason}
          </p>
        ) : null}
      </div>

      {guestLocked ? (
        <div className="mt-auto shrink-0 overflow-hidden pt-0.5" onClick={(e) => e.stopPropagation()}>
          <GamesHubLockFooter ctaClass={cardCta} />
        </div>
      ) : selectable ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelect();
          }}
          className={`mt-auto w-full shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-bold leading-tight transition ${
            selected ? tile.btnSelected : tile.btn
          }`}
        >
          {selected ? "נבחר" : "בחר"}
        </button>
      ) : (
        <span className="mt-auto block h-[22px] shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

export default function StudentArcadePage() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const [balance, setBalance] = useState(null);
  const [diamondBalance, setDiamondBalance] = useState(null);
  const [games, setGames] = useState([]);
  const [entryOptions, setEntryOptions] = useState([]);
  const [entryCost, setEntryCost] = useState(10);
  const [selectedGameKey, setSelectedGameKey] = useState("fourline");
  const [userMessage, setUserMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [openRooms, setOpenRooms] = useState([]);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [activeTab, setActiveTab] = useState("games");
  const [clubProfile, setClubProfile] = useState(null);
  const [homeAvatarEmoji, setHomeAvatarEmoji] = useState("👤");
  const [homeAvatarCustomDataUrl, setHomeAvatarCustomDataUrl] = useState("");
  const [homeAvatarBackground, setHomeAvatarBackground] = useState("sky");
  const [pendingInvite, setPendingInvite] = useState(null);
  /** @type {{ kind: string; room: Record<string, unknown> } | null} */
  const [roomHighlight, setRoomHighlight] = useState(null);

  useArcadeClubPresence();

  const onInvite = useCallback((invite) => {
    setPendingInvite(invite);
  }, []);
  useArcadeClubInvites({ onInvite });

  const refreshProfile = useCallback(async () => {
    const [arcadeRes, homeRes] = await Promise.all([
      fetch("/api/arcade/profile/me"),
      fetch("/api/student/home-profile/summary"),
    ]);
    const arcadeJson = await arcadeRes.json().catch(() => ({}));
    const homeJson = await homeRes.json().catch(() => ({}));
    if (arcadeJson?.ok && arcadeJson.profile) {
      const leoRaw = arcadeJson.profile.leoNumber ?? null;
      const leoNumber =
        leoRaw != null && String(leoRaw).trim() !== "" ? String(leoRaw).trim() : null;
      setClubProfile({ ...arcadeJson.profile, leoNumber });
    }
    const avatar = studentAvatarFromHomeSummary(homeJson);
    setHomeAvatarEmoji(avatar.avatarEmoji);
    setHomeAvatarCustomDataUrl(avatar.avatarCustomDataUrl);
    setHomeAvatarBackground(avatar.avatarBackgroundKey);
  }, []);

  const refresh = useCallback(async () => {
    const [balRes, gamesRes, diamondRes] = await Promise.all([
      fetch("/api/arcade/balance"),
      fetch("/api/arcade/games"),
      fetch("/api/student/diamonds/balance"),
    ]);
    const balJson = await balRes.json().catch(() => ({}));
    const gamesJson = await gamesRes.json().catch(() => ({}));
    const diamondJson = await diamondRes.json().catch(() => ({}));
    if (balJson?.ok) setBalance(balJson.balance);
    if (diamondJson?.ok) setDiamondBalance(diamondJson.balance);
    if (gamesJson?.ok && Array.isArray(gamesJson.games)) {
      setGames(gamesJson.games);
    }
    if (gamesJson?.ok && Array.isArray(gamesJson.entryCostOptions)) {
      const opts = mapEntryCostOptionsForUi(gamesJson.entryCostOptions);
      setEntryOptions(opts);
      if (opts.length && !opts.some((o) => o.value === entryCost)) {
        setEntryCost(opts[0].value);
      }
    }
    await refreshProfile();
  }, [entryCost, refreshProfile]);

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

  const lobbyGameVm = useMemo(() => {
    return LOBBY_GAME_ROWS.map((row) => {
      const meta = games.find((g) => g.gameKey === row.gameKey) || null;
      const guestLocked = Boolean(meta?.guestLocked);
      const active = Boolean(meta?.enabled === true && meta?.foundationOnly === false);
      const idleReasonRow = !meta
        ? "טוען משחקים…"
        : guestLocked
          ? null
        : !meta.enabled
          ? "המשחק כבוי בשרת"
          : meta.foundationOnly
            ? "עדיין לא פעיל (ממתין להפעלה)"
            : null;
      return { ...row, active, guestLocked, idleReason: idleReasonRow };
    });
  }, [games]);

  const openRoomsCountByGame = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {};
    for (const row of openRooms) {
      const key = String(row.gameKey || "");
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [openRooms]);

  const selectedGame = useMemo(
    () => lobbyGameVm.find((g) => g.gameKey === selectedGameKey) || null,
    [lobbyGameVm, selectedGameKey],
  );

  const anyLobbyGameActive = useMemo(() => {
    return lobbyGameVm.some((g) => g.active && !g.guestLocked);
  }, [lobbyGameVm]);

  useEffect(() => {
    if (!initialSyncDone) return;
    setSelectedGameKey((prev) => {
      const current = lobbyGameVm.find((g) => g.gameKey === prev);
      if (current?.active && !current.guestLocked) return prev;
      const firstActive = lobbyGameVm.find((g) => g.active && !g.guestLocked);
      return firstActive?.gameKey || prev || lobbyGameVm[0]?.gameKey || "fourline";
    });
  }, [initialSyncDone, lobbyGameVm]);

  const openRoomsPollActive = anyLobbyGameActive;

  useEffect(() => {
    clearArcadeActiveRoom();
    setRoomHighlight(null);
  }, []);

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
    try {
      const result = await promise;
      setUserMessage(apiMessage(result));
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
    try {
      const result = await promise;
      if (result.payload?.ok) {
        setUserMessage(quickMatchMessage(result.payload));
      } else {
        setUserMessage(apiMessage(result));
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

  const onQuickGame = (gameKey = selectedGameKey) =>
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

  const onCreateRoom = (roomType, gameKey = selectedGameKey) =>
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

  const diamondDisplay =
    diamondBalance === null || diamondBalance === undefined
      ? initialSyncDone
        ? "לא זמין"
        : "טוען…"
      : String(diamondBalance);

  const hlRoom = roomHighlight?.room;
  const hlRoomId = hlRoom?.id != null ? String(hlRoom.id) : "";
  const hlStatus = hlRoom?.status != null ? String(hlRoom.status) : "-";
  const hlEntry = hlRoom?.entry_cost != null ? String(hlRoom.entry_cost) : "-";
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

  const entryCostLabel =
    entryOptions.find((o) => o.value === entryCost)?.label || String(entryCost);
  const canPlaySelected = Boolean(selectedGame?.active && !selectedGame?.guestLocked);
  const costBlockedForSelected = Boolean(costDisabledReason(entryCost));

  const arcadeCardProps = {
    cardCta: GH.cardCta,
    idleBox: GH.idleBox,
  };

  const openProfileTab = useCallback(() => {
    setActiveTab((tab) => (tab === "profile" ? tab : "profile"));
  }, []);

  return (
    <Layout studentTheme={theme} studentShell="home">
    <GameAccessGuard category="online">
      <Head>
        <title>מועדון המשחקים של ליאו - LEO K</title>
      </Head>
      <div className={GH.pageWrap} dir="rtl">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 pb-6 overflow-x-hidden space-y-4">
          <GamesHubNavBar
            backHref="/student/games"
            backLabel="משחקים"
            badge="מועדון המשחקים של ליאו"
            backBtnClass={GH.backBtn}
            badgeClass={GH.arcadeNavTitle || GH.arcadeNavBadge || GH.badge}
            showAudioSettings={false}
          />

          <ArcadeLobbyHeader
            displayName={clubProfile?.displayName || "שחקן"}
            coinBalance={balanceDisplay}
            diamondBalance={diamondDisplay}
            isGuest={Boolean(clubProfile?.isGuest)}
            leoNumber={clubProfile?.leoNumber || null}
            avatarEmoji={homeAvatarEmoji}
            avatarCustomDataUrl={homeAvatarCustomDataUrl}
            avatarBackgroundKey={homeAvatarBackground}
            gh={GH}
            onAvatarClick={openProfileTab}
          />

          {clubProfile?.isGuest ? <ArcadeGuestUpgradeBanner /> : null}

          <ArcadeInviteBanner invite={pendingInvite} onDismiss={() => setPendingInvite(null)} />

          <ArcadeClubEventsPanel gh={GH} />

          <ArcadeTabNav activeTab={activeTab} onChange={setActiveTab} gh={GH} className="lg:hidden" />

          {activeTab !== "games" ? (
            <div className={`hidden lg:block ${GH.arcadeEntryBar} py-2`}>
              <ArcadeTabNav activeTab={activeTab} onChange={setActiveTab} gh={GH} compact />
            </div>
          ) : null}

          {!initialSyncDone ? (
            <div className={ARCADE_GAME_GRID_CLASS}>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="flex h-[132px] min-w-0 animate-pulse rounded-lg border border-sky-200 bg-sky-100 opacity-60"
                  aria-hidden
                />
              ))}
            </div>
          ) : activeTab === "friends" ? (
            <ArcadeClubFriendsPanel
              gh={GH}
              leoNumber={clubProfile?.leoNumber ?? null}
              leoNumberLoading={clubProfile == null}
            />
          ) : activeTab === "shop" ? (
            <ArcadeClubShopPanel
              gh={GH}
              coinBalance={balanceNum}
              onCoinBalanceChange={(bal) => setBalance(bal)}
              studentFullName={clubProfile?.fullName || ""}
            />
          ) : activeTab === "profile" ? (
            <div className="space-y-4">
              <ArcadeClubProfilePanel gh={GH} />
              <ArcadeClubMissionsPanel gh={GH} />
              <div className={`${GH.arcadePanelMyRoom || GH.card} text-right`}>
                <h3 className={GH.arcadeSectionTitle || GH.sectionTitle}>חדר אישי</h3>
                <p className={`mt-1 text-sm ${GH.arcadePanelBlurb || GH.cardBlurb}`}>מרחב אישי עם גביעים וקישוטים</p>
                <Link href="/student/arcade/my-room" className={`mt-3 inline-block ${GH.btnJoinCode}`}>
                  לחדר שלי
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={GH.arcadeEntryBar}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
                  <EntryCostSelector
                    entryOptions={entryOptions}
                    entryCost={entryCost}
                    setEntryCost={setEntryCost}
                    costDisabledReason={costDisabledReason}
                    busy={busy}
                    className="mt-0 min-w-0"
                    label="בחר סכום כניסה"
                    entryLabel={GH.arcadeEntryLabel || GH.entryLabel}
                    entryBtnSelected={GH.entryBtnSelected}
                    entryBtnDefault={GH.entryBtnDefault}
                    entryBtnDisabled={GH.entryBtnDisabled}
                  />
                  <ArcadeTabNav
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    gh={GH}
                    compact
                    className="hidden shrink-0 lg:flex"
                  />
                </div>
                <ArcadeGameActionPanel
                  selectedTitle={selectedGame?.title || "-"}
                  entryCostLabel={entryCostLabel}
                  canAct={canPlaySelected}
                  costBlocked={costBlockedForSelected}
                  costBlockedMessage={costDisabledReason(entryCost) || undefined}
                  busy={busy}
                  onQuickGame={() => void onQuickGame(selectedGameKey)}
                  onCreatePublic={() => void onCreateRoom("public", selectedGameKey)}
                  onCreatePrivate={() => void onCreateRoom("private", selectedGameKey)}
                  cardCta={GH.cardCta}
                  btnSecondary={GH.btnSecondary}
                  btnSecondaryOutline={GH.btnSecondaryOutline}
                  actionDivider={GH.arcadeActionDivider}
                  actionTitle={GH.arcadeActionTitle}
                  actionMeta={GH.arcadeActionMeta}
                />
              </div>

              <div className={ARCADE_GAME_GRID_CLASS}>
                {lobbyGameVm.map((row) => (
                  <ArcadeGameCard
                    {...arcadeCardProps}
                    key={row.gameKey}
                    title={row.title}
                    blurb={row.blurb}
                    playersLine={row.playersLine}
                    gameKey={row.gameKey}
                    active={row.active}
                    guestLocked={row.guestLocked}
                    idleReason={row.idleReason}
                    selected={selectedGameKey === row.gameKey}
                    openRoomCount={openRoomsCountByGame[row.gameKey] || 0}
                    onSelect={setSelectedGameKey}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-3 lg:mt-6 lg:grid-cols-3 lg:gap-4">
                <div className={`${GH.arcadePanelOpenRooms || GH.card} lg:col-span-2`}>
                  <h3 className={GH.arcadeSectionTitle || GH.sectionTitle}>חדרים פתוחים</h3>
                  <p className={`mt-1 text-[11px] sm:text-xs ${GH.arcadePanelBlurb || GH.cardBlurb}`}>חדרים ציבוריים ומשחק מהיר שמחכים לשחקן</p>
                  {!openRoomsPollActive ? (
                    <p className={`mt-3 ${GH.arcadeEmptyText || GH.emptyText}`}>אין רשימה - המשחק לא פעיל</p>
                  ) : openRooms.length === 0 ? (
                    <p className={`mt-3 ${GH.arcadeEmptyText || GH.emptyText}`}>אין חדרים פתוחים כרגע</p>
                  ) : (
                    <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-0.5 sm:max-h-72">
                      {openRooms.map((row) => {
                        const full = row.playerCount >= row.maxPlayers;
                        const costLabel =
                          entryOptions.find((o) => o.value === row.entryCost)?.label ||
                          String(row.entryCost);
                        return (
                          <li
                            key={row.roomId}
                            className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${GH.arcadeRoomItem || GH.roomItem}`}
                          >
                            <div className={`min-w-0 text-right ${GH.arcadePanelMeta || GH.roomItemMeta}`}>
                              <p className={GH.arcadeRoomItemTitle || GH.arcadePanelTitle || GH.roomItemTitle}>
                                {displayArcadeGameTitle(row.gameKey, row.gameTitle)}
                              </p>
                              <p>
                                עלות {costLabel} · {row.playerCount}/{row.maxPlayers} שחקנים ·{" "}
                                {roomTypeLabel(row.roomType)} · ממתין
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={busy || full || Boolean(costDisabledReason(row.entryCost))}
                              title={full ? "החדר מלא" : costDisabledReason(row.entryCost) || undefined}
                              onClick={() => void onJoinPublicRoom(row.roomId)}
                              className={`shrink-0 ${GH.btnJoinRoom}`}
                            >
                              הצטרף
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className={GH.arcadePanelJoinCode || GH.card}>
                  <h3 className={GH.arcadeSectionTitle || GH.sectionTitle}>חדר פרטי - הצטרפות בקוד</h3>
                  <p className={`mt-1 text-[11px] sm:text-xs ${GH.arcadePanelBlurb || GH.cardBlurb}`}>הזן את הקוד שקיבלת מחבר</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="קוד החדר"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className={GH.input}
                    />
                    <button
                      type="button"
                      disabled={busy || !openRoomsPollActive}
                      onClick={() => void onJoinByCodeSubmit()}
                      className={GH.btnJoinCode}
                    >
                      הצטרף לפי קוד
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "games" && roomHighlight && hlRoomId ? (
            <div className={`mt-5 ${GH.roomReadyPanel}`}>
              <h3 className={GH.roomReadyTitle}>חדר מוכן</h3>
              <p className={`mt-1 ${GH.roomReadySub}`}>{waitingCopy}</p>
              <dl className={`mt-3 space-y-2 ${GH.roomReadyDl}`}>
                <div className={`flex justify-between gap-2 border-b pb-2 ${GH.roomReadyDlBorder}`}>
                  <dt className="font-semibold">עלות כניסה</dt>
                  <dd className="font-mono">{hlEntry}</dd>
                </div>
                {hlPrivate && hlJoinCode ? (
                  <div className={GH.roomReadyCodeBox}>
                    <p className={GH.roomReadyCodeLabel}>קוד חדר</p>
                    <p className={`mt-1 ${GH.roomReadyCodeValue}`}>{hlJoinCode}</p>
                    <p className={`mt-1.5 ${GH.roomReadyCodeHint}`}>שלח את הקוד לחבר כדי שיצטרף</p>
                  </div>
                ) : null}
              </dl>
              <Link
                href={hlPlayHref}
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2.5 text-center text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 sm:text-base"
              >
                כניסה למשחק
              </Link>
            </div>
          ) : null}

          {userMessage ? (
            <p className={`mt-4 rounded-lg border px-3 py-2 text-xs font-medium sm:text-sm ${GH.userMessage}`}>
              {userMessage}
            </p>
          ) : null}
        </div>
      </div>
    </GameAccessGuard>
    </Layout>
  );
}
