import { useCallback, useEffect, useState } from "react";

function friendRequestFeedback(json) {
  if (json?.ok) return "בקשת חברות נשלחה";
  if (json?.code === "already_friends") return "אתם כבר חברים";
  if (json?.code === "pending_exists") return "כבר נשלחה בקשת חברות";
  if (json?.code === "self") return "לא ניתן להוסיף את עצמך";
  if (json?.code === "not_found") return "שחקן לא נמצא";
  return json?.message || json?.error || "שגיאה";
}

/** @param {{ gh: Record<string, string>, leoNumber?: string|null, leoNumberLoading?: boolean }} props */
export default function ArcadeClubFriendsPanel({ gh, leoNumber = null, leoNumberLoading = false }) {
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [copiedLeo, setCopiedLeo] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/arcade/friends");
    const json = await res.json().catch(() => ({}));
    if (json?.ok) {
      setFriends(json.friends || []);
      setPending(json.pendingIncoming || []);
      setLocked(json.featureLocked === true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendRequest = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/arcade/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", query }),
      });
      const json = await res.json().catch(() => ({}));
      setMessage(friendRequestFeedback(json));
      if (json.ok) {
        setQuery("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const respond = async (requestId, accept) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/arcade/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", requestId, accept }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.ok && accept) {
        setMessage("החבר נוסף לרשימה!");
      } else if (json?.ok && !accept) {
        setMessage("הבקשה נדחתה");
      } else {
        setMessage(json?.message || json?.error || "שגיאה");
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const inviteFriend = async (toStudentId) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/arcade/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", toStudentId, gameKey: "fourline" }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.ok && json.room?.id) {
        const gk = json.room.game_key || json.invite?.game_key || "fourline";
        const routes = {
          fourline: "/student/games/fourline",
          ludo: "/student/games/ludo",
          "snakes-and-ladders": "/student/games/snakes-and-ladders",
          checkers: "/student/games/checkers",
          chess: "/student/games/chess",
          dominoes: "/student/games/dominoes",
          bingo: "/student/games/bingo",
        };
        const base = routes[gk] || routes.fourline;
        window.location.href = `${base}?roomId=${encodeURIComponent(String(json.room.id))}`;
        return;
      }
      setMessage(json.ok ? "הזמנה נשלחה" : json.message || json.error || "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  const removeFriend = async (friendId) => {
    setBusy(true);
    try {
      await fetch(`/api/arcade/friends?friendId=${encodeURIComponent(friendId)}`, { method: "DELETE" });
      setConfirmRemoveId(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copyLeoNumber = async () => {
    const value = String(leoNumber || "").trim();
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedLeo(true);
      window.setTimeout(() => setCopiedLeo(false), 2000);
    } catch {
      setMessage("לא הצלחנו להעתיק - נסו לסמן ולהעתיק ידנית");
    }
  };

  const leoDisplay = leoNumber != null && String(leoNumber).trim() !== "" ? String(leoNumber).trim() : null;

  if (locked) {
    return (
      <div className={`${gh.arcadePanelFriends || gh.card} p-4 text-right`} dir="rtl">
        <p className={gh.arcadePanelBlurb || gh.cardBlurb}>חברים - נשלט דרך Admin. כרגע לא פתוח לאורחים.</p>
      </div>
    );
  }

  return (
    <div className={`${gh.arcadePanelFriends || gh.card} space-y-4`} dir="rtl">
      <h3 className={gh.arcadeSectionTitle || gh.sectionTitle}>חברים</h3>

      <div className={`space-y-2 p-3 text-right ${gh.arcadeRoomItem || gh.roomItem}`}>
        <p className={`text-sm font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>מספר ליאו שלי</p>
        <p className={`text-xs leading-relaxed ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
          זה המספר שאתה נותן לחבר - הוא יכול להקליד אותו למטה כדי לשלוח לך בקשת חברות.
        </p>
        {leoNumberLoading ? (
          <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>מכינים לך מספר ליאו...</p>
        ) : leoDisplay ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="font-mono text-lg font-bold tracking-wide text-indigo-800">{leoDisplay}</span>
            <button type="button" onClick={() => void copyLeoNumber()} className={gh.btnJoinCode}>
              {copiedLeo ? "הועתק!" : "העתק"}
            </button>
          </div>
        ) : (
          <p className={`text-xs ${gh.arcadeEmptyText || gh.emptyText}`}>
            לא הצלחנו להציג מספר ליאו - נסו לרענן את הדף.
          </p>
        )}
      </div>

      <div className={`space-y-2 p-3 text-right ${gh.arcadeRoomItem || gh.roomItem}`}>
        <p className={`text-sm font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>הוסף חבר</p>
        <p className={`text-xs leading-relaxed ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
          הקלד מספר ליאו או שם תצוגה - תישלח בקשת חברות, והחבר יצטרך לאשר.
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <input
            className={gh.input}
            placeholder="מספר ליאו (8 ספרות) או שם תצוגה"
            maxLength={32}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" disabled={busy} onClick={() => void sendRequest()} className={gh.btnJoinCode}>
            הוסף חבר
          </button>
        </div>
      </div>

      {message ? <p className={`text-sm ${gh.userMessage}`}>{message}</p> : null}

      <div className="space-y-3">
        <p className={`text-sm font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>בקשות וחברים</p>

        {pending.length ? (
          <div className="space-y-2">
            <p className={`text-sm font-semibold ${gh.arcadePanelTitle || gh.cardTitle}`}>בקשות חברות</p>
            <ul className="space-y-2">
              {pending.map((p) => (
                <li
                  key={p.requestId}
                  className={`flex flex-wrap items-center justify-between gap-2 ${gh.arcadeRoomItem || gh.roomItem}`}
                >
                  <span>
                    {p.displayName}
                    {p.leoNumber ? (
                      <span className={`ms-2 font-mono text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
                        ({p.leoNumber})
                      </span>
                    ) : null}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void respond(p.requestId, true)}
                      className={gh.btnJoinRoom}
                    >
                      אשר
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void respond(p.requestId, false)}
                      className={gh.btnSecondaryOutline}
                    >
                      דחה
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className={`text-sm font-semibold ${gh.arcadePanelTitle || gh.cardTitle}`}>החברים שלי</p>
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.studentId}
                className={`flex flex-wrap items-center justify-between gap-2 ${gh.arcadeRoomItem || gh.roomItem}`}
              >
                <span>
                  {f.displayName} {f.online ? "● מחובר" : "○ לא מחובר"}
                </span>
                {confirmRemoveId === f.studentId ? (
                  <div className="flex flex-col items-end gap-1">
                    <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>להסיר את החבר מהרשימה?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmRemoveId(null)}
                        className={gh.btnSecondaryOutline}
                      >
                        בטל
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeFriend(f.studentId)}
                        className={gh.btnSecondaryOutline}
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void inviteFriend(f.studentId)}
                      className={gh.btnJoinRoom}
                    >
                      הזמן
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmRemoveId(f.studentId)}
                      className={gh.btnSecondaryOutline}
                    >
                      מחק חבר
                    </button>
                  </div>
                )}
              </li>
            ))}
            {!friends.length ? <li className={gh.arcadeEmptyText || gh.emptyText}>אין חברים עדיין</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
